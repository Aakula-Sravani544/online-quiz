import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Timer, CheckCircle, ChevronRight, ChevronLeft, Flag, Play, LayoutGrid } from 'lucide-react';
import Editor from '@monaco-editor/react';

function Quiz() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [qLanguages, setQLanguages] = useState({});
  const [flags, setFlags] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  
  const autoSaveTimer = useRef();

  useEffect(() => {
    const initExam = async () => {
      console.log('Initializing exam for code:', code);
      try {
        const examRes = await api.get(`/exam/${code}`);
        console.log('Exam metadata loaded:', examRes.data.title);
        setExam(examRes.data);
        const startRes = await api.post('/quiz/start', { exam_id: examRes.data.id });
        console.log('Exam session started, attempt ID:', startRes.data.attemptId);
        setAttemptId(startRes.data.attemptId);
        if (startRes.data.answers) setAnswers(JSON.parse(startRes.data.answers));
      } catch (err) {
        console.error('Quiz Init Error:', err);
        alert(err.response?.data?.error || 'Could not join exam');
        navigate('/student/dashboard');
      }
    };
    initExam();
  }, [code]);

  useEffect(() => {
    if (!attemptId) return;
    const syncTime = async () => {
      try {
        const res = await api.get(`/quiz/time-left/${attemptId}`);
        setTimeLeft(res.data.timeLeft);
      } catch (err) { console.error('Time sync error'); }
    };
    syncTime();
    const interval = setInterval(syncTime, 10000);
    return () => clearInterval(interval);
  }, [attemptId]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { submitQuiz(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (!attemptId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await api.post('/quiz/autosave', { attempt_id: attemptId, answers });
      } catch (e) { console.error('Save failed'); }
      finally { setIsSyncing(false); }
    }, 3000);
  }, [answers, attemptId]);

  const submitQuiz = useCallback(async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    try {
      const res = await api.post('/quiz/submit', { attempt_id: attemptId, answers });
      navigate(`/result/${attemptId}`);
    } catch (err) {
      alert('Error submitting quiz');
      setSubmitting(false);
    }
  }, [attemptId, answers, navigate, submitting]);

  const runCode = async (codeValue, lang) => {
    try {
      setCodeOutput('Executing on cloud host...');
      const res = await api.post('/quiz/run-code', { code: codeValue, language: lang });
      setCodeOutput(res.data.output || res.data.error || 'Execution completed with no output.');
    } catch (e) { 
      console.error('Run code error:', e);
      setCodeOutput('Execution server unreachable or failed.'); 
    }
  };

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const toggleFlag = (idx) => {
    setFlags(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!exam) return <div className="h-screen flex flex-col items-center justify-center font-black animate-pulse text-indigo-600">
    <div className="text-2xl mb-2">PREPARING ENVIRONMENT...</div>
    <div className="text-[10px] uppercase tracking-[0.3em] opacity-50">Fetching Exam Metadata</div>
  </div>;

  if (timeLeft === null) return <div className="h-screen flex flex-col items-center justify-center font-black animate-pulse text-indigo-600">
    <div className="text-2xl mb-2">PREPARING ENVIRONMENT...</div>
    <div className="text-[10px] uppercase tracking-[0.3em] opacity-50">Synchronizing Cloud Timer (ID: {attemptId || 'WAITING'})</div>
  </div>;

  const currentQ = exam.questions[currentQIndex];
  const selectedLang = qLanguages[currentQIndex] || 'javascript';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      {/* 🚀 Sticky Header */}
      <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 flex items-center justify-between px-10">
        <div className="flex items-center space-x-6">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <LayoutGrid className="text-white w-6 h-6" />
           </div>
           <div>
              <h1 className="text-2xl font-black tracking-tight leading-none uppercase">{exam.title}</h1>
              <div className="flex items-center mt-2">
                 <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 italic">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isSyncing ? 'Auto-Saving...' : 'Synchronized'}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex items-center space-x-8">
           <div className={`flex items-center px-6 py-3 rounded-2xl border-2 transition-all duration-500 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <Timer className="w-5 h-5 mr-3 opacity-70" />
              <span className="text-xl font-black tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
           </div>
           <button 
             onClick={() => window.confirm('Final Submission?') && submitQuiz()}
             disabled={submitting}
             className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
           >
             {submitting ? 'PROCESSING...' : 'FINALIZE ASSESSMENT'}
           </button>
        </div>
      </header>

      {/* 📝 Main Stage */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* 🗺️ Sidebar Map */}
        <aside className="w-80 border-r border-slate-200/60 bg-white/50 p-10 hidden xl:block sticky top-24 h-[calc(100vh-6rem)] overflow-auto">
           <div className="mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Assessment Map</h3>
              <div className="grid grid-cols-4 gap-3">
                 {exam.questions.map((_, i) => {
                   const qId = exam.questions[i].id;
                   const isAnswered = !!answers[qId];
                   const isFlagged = !!flags[i];
                   const isCurrent = i === currentQIndex;

                   let style = 'bg-slate-100 text-slate-400 border-transparent';
                   if (isCurrent) style = 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30';
                   else if (isFlagged) style = 'bg-amber-100 text-amber-600 border-amber-200';
                   else if (isAnswered) style = 'bg-emerald-50 text-emerald-600 border-emerald-100';

                   return (
                     <button 
                       key={i} onClick={() => {setCurrentQIndex(i); setCodeOutput('')}} 
                       className={`h-12 rounded-2xl font-black text-sm border-2 transition-all duration-300 ${style}`}
                     >
                       {i + 1}
                     </button>
                   );
                 })}
              </div>
           </div>

           <div className="pt-8 border-t border-slate-100">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                 <span>Completion</span>
                 <span className="text-indigo-600">{Math.round((Object.keys(answers).length / exam.questions.length) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${(Object.keys(answers).length / exam.questions.length) * 100}%` }}></div>
              </div>
           </div>
        </aside>

        {/* 📖 Question Content */}
        <main className="flex-1 p-12 overflow-auto">
           <div className="max-w-4xl mx-auto space-y-12">
              <div className="flex justify-between items-start">
                 <div>
                    <div className="flex items-center space-x-3 mb-4">
                       <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">PART {Math.floor(currentQIndex/5)+1}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-200" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section {currentQ.type}</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
                       {currentQ.question_text}
                    </h2>
                 </div>
                 <button onClick={() => toggleFlag(currentQIndex)} className={`p-4 rounded-[20px] transition duration-300 ${flags[currentQIndex] ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:text-slate-400'}`}>
                    <Flag className="w-6 h-6" />
                 </button>
              </div>

              <div className="min-h-[400px]">
                 {currentQ?.type === 'mcq' && (
                   <div className="grid grid-cols-1 gap-4">
                      {currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '') ? (
                        currentQ.options.map((opt, i) => (
                          <button key={i} onClick={() => handleAnswer(currentQ.id, opt)} className={`group flex items-center p-6 rounded-3xl border-2 transition text-left ${answers[currentQ.id] === opt ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/5' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                             <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center mr-6 font-black text-sm transition ${answers[currentQ.id] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-100 text-slate-400'}`}>
                               {String.fromCharCode(65 + i)}
                             </div>
                             <span className="text-lg font-bold text-slate-700">{opt}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                           <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No options provided for this MCQ</p>
                        </div>
                      )}
                   </div>
                 )}

                 {currentQ?.type === 'coding' && (
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <select 
                           className="bg-white border-2 border-slate-100 rounded-xl px-5 py-2.5 text-sm font-black text-slate-600 outline-none focus:border-indigo-600 transition"
                           value={selectedLang}
                           onChange={(e) => setQLanguages({...qLanguages, [currentQIndex]: e.target.value})}
                         >
                           <option value="javascript">JavaScript</option>
                           <option value="python">Python 3</option>
                           <option value="java">Java Standard</option>
                         </select>
                         <button onClick={() => runCode(answers[currentQ.id], selectedLang)} className="flex items-center px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-105 transition active:scale-95">
                            <Play className="w-4 h-4 mr-2" /> EXECUTE CODE
                         </button>
                      </div>
                      <div className="h-[500px] rounded-[40px] overflow-hidden border-2 border-slate-100 shadow-sm bg-white p-2">
                        <Editor 
                          height="100%" 
                          language={selectedLang}
                          theme="vs-light"
                          value={answers[currentQ.id] || ''}
                          onChange={(v) => handleAnswer(currentQ.id, v)}
                          options={{ minimap: { enabled: false }, fontSize: 16, roundedSelection: true, padding: { top: 20 } }}
                        />
                      </div>
                      <div className={`mt-6 p-8 bg-slate-900 rounded-[35px] text-emerald-400 font-mono text-sm shadow-2xl relative transition-all duration-500 ${codeOutput ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4'}`}>
                         <div className="absolute top-4 right-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Console</div>
                         <pre className="whitespace-pre-wrap">{codeOutput || '// Terminal ready. Click Execute to run your script.'}</pre>
                      </div>
                   </div>
                 )}

                 {currentQ?.type === 'short_answer' && (
                   <div className="p-10 bg-white rounded-[40px] border-2 border-slate-100 shadow-sm focus-within:border-indigo-600 transition">
                      <input 
                         className="w-full text-2xl font-black p-4 bg-transparent outline-none placeholder:text-slate-200" 
                         placeholder="Enter your definitive response here..." 
                         value={answers[currentQ.id] || ''} 
                         onChange={(e) => handleAnswer(currentQ.id, e.target.value)} 
                      />
                   </div>
                 )}
              </div>

              <div className="flex justify-between items-center py-10 border-t border-slate-100">
                 <button 
                  disabled={currentQIndex === 0} 
                  onClick={() => {setCurrentQIndex(p => p - 1); setCodeOutput('')}} 
                  className="flex items-center px-10 py-4 bg-white border border-slate-200 rounded-[25px] font-black text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition"
                 >
                   <ChevronLeft className="w-5 h-5 mr-3" /> BACK
                 </button>
                 <div className="flex space-x-2">
                    {exam.questions.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentQIndex === i ? 'w-8 bg-indigo-600' : 'bg-slate-200'}`} />
                    ))}
                 </div>
                 <button 
                  disabled={currentQIndex === exam.questions.length - 1} 
                  onClick={() => {setCurrentQIndex(p => p + 1); setCodeOutput('')}} 
                  className="flex items-center px-10 py-4 bg-slate-900 text-white rounded-[25px] font-black text-sm hover:bg-black transition disabled:opacity-30 shadow-2xl shadow-slate-900/20"
                 >
                   NEXT <ChevronRight className="w-5 h-5 ml-3" />
                 </button>
              </div>
           </div>
        </main>
      </div>
    </div>
  );
}

export default Quiz;
