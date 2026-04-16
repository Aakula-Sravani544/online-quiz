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
      const res = await api.post('/quiz/run-code', { code: codeValue, language: lang });
      setCodeOutput(res.data.output || res.data.error);
    } catch (e) { setCodeOutput('Execution failed'); }
  };

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const toggleFlag = (idx) => {
    setFlags(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!exam || timeLeft === null) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600">PREPARING ENVIRONMENT...</div>;

  const currentQ = exam.questions[currentQIndex];
  const selectedLang = qLanguages[currentQIndex] || 'javascript';

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#1E293B]">
      <header className="h-20 bg-white shadow-sm border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
            <LayoutGrid className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none">{exam.title}</h1>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
              {isSyncing ? '● Saving...' : '● Synchronized'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-8">
           <div className={`flex items-center px-6 py-2.5 rounded-2xl font-black tabular-nums transition ${timeLeft < 300 ? 'bg-red-50 text-red-600 border border-red-100 scale-105 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
              <Timer className="w-5 h-5 mr-3" />
              {formatTime(timeLeft)}
           </div>
           <button 
             onClick={() => window.confirm('Final Submission?') && submitQuiz()}
             disabled={submitting}
             className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:scale-105 transition active:scale-95"
           >
             SUBMIT EXAM
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-slate-200 p-8 overflow-auto hidden lg:block">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Question Map</h3>
           <div className="grid grid-cols-4 gap-3">
              {exam.questions.map((_, i) => {
                const qId = exam.questions[i].id;
                const isAnswered = !!answers[qId];
                const isFlagged = !!flags[i];
                const isCurrent = i === currentQIndex;

                let colorClass = 'bg-slate-100 text-slate-400';
                if (isCurrent) colorClass = 'ring-4 ring-indigo-600/20 bg-indigo-600 text-white';
                else if (isFlagged) colorClass = 'bg-amber-400 text-white';
                else if (isAnswered) colorClass = 'bg-green-500 text-white';

                return (
                  <button key={i} onClick={() => {setCurrentQIndex(i); setCodeOutput('')}} className={`h-12 rounded-xl font-black text-sm transition transform hover:scale-110 ${colorClass}`}>
                    {i + 1}
                  </button>
                );
              })}
           </div>
        </div>

        <div className="flex-1 overflow-auto p-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-10">
               <div>
                 <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 block">Part {Math.floor(currentQIndex/5)+1}</span>
                 <h2 className="text-3xl font-black leading-tight text-slate-900">{currentQ?.question_text}</h2>
               </div>
               <button onClick={() => toggleFlag(currentQIndex)} className={`p-3 rounded-2xl transition shadow-sm ${flags[currentQIndex] ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-300'}`}>
                 <Flag className="w-6 h-6" />
               </button>
            </div>

            <div className="min-h-[400px]">
               {currentQ?.type === 'mcq' && (
                 <div className="grid grid-cols-1 gap-4">
                    {currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '') ? (
                      currentQ.options.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(currentQ.id, opt)} className={`group flex items-center p-6 rounded-3xl border-2 transition text-left ${answers[currentQ.id] === opt ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/5' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                           <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-6 font-black text-sm transition ${answers[currentQ.id] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-400'}`}>
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
                 <div className="space-y-4">
                    <select 
                      className="bg-white border rounded-lg px-4 py-2 text-sm font-bold"
                      value={selectedLang}
                      onChange={(e) => setQLanguages({...qLanguages, [currentQIndex]: e.target.value})}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                    </select>
                    <div className="h-[400px] rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
                      <Editor 
                        height="100%" 
                        language={selectedLang}
                        theme="vs-light"
                        value={answers[currentQ.id] || ''}
                        onChange={(v) => handleAnswer(currentQ.id, v)}
                        options={{ minimap: { enabled: false }, fontSize: 16 }}
                      />
                    </div>
                    <button onClick={() => runCode(answers[currentQ.id], selectedLang)} className="flex items-center px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition">
                       <Play className="w-4 h-4 mr-2" /> RUN CODE
                    </button>
                    {codeOutput && (
                       <div className="p-6 bg-slate-900 rounded-3xl text-emerald-400 font-mono text-sm">
                          <pre className="whitespace-pre-wrap">{codeOutput}</pre>
                       </div>
                    )}
                 </div>
               )}

               {currentQ?.type === 'short_answer' && (
                 <div className="p-8 bg-white rounded-[40px] border border-slate-200 shadow-sm">
                    <input className="w-full text-2xl font-bold p-4 bg-transparent outline-none placeholder:text-slate-200" placeholder="Type your response here..." value={answers[currentQ.id] || ''} onChange={(e) => handleAnswer(currentQ.id, e.target.value)} />
                 </div>
               )}
            </div>

            <div className="mt-16 flex justify-between">
               <button disabled={currentQIndex === 0} onClick={() => {setCurrentQIndex(p => p - 1); setCodeOutput('')}} className="flex items-center px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition">
                 <ChevronLeft className="w-5 h-5 mr-3" /> PREVIOUS
               </button>
               <button disabled={currentQIndex === exam.questions.length - 1} onClick={() => {setCurrentQIndex(p => p + 1); setCodeOutput('')}} className="flex items-center px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition disabled:opacity-30 shadow-2xl shadow-slate-900/20">
                 NEXT <ChevronRight className="w-5 h-5 ml-3" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Quiz;
