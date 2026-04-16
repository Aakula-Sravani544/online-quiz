import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { LogOut, Plus, Users, LayoutDashboard, Copy, BookOpen, Timer, FileSpreadsheet, Download, Search, RefreshCw, BarChart3, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import DashboardAnalytics from '../components/DashboardAnalytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

function AdminDashboard() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'exams', 'submissions', 'students', 'upload'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentLogs, setSelectedStudentLogs] = useState(null); // { id, name, logs: [] }
  
  // Upload State
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadTargetExam, setUploadTargetExam] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Exam Creation State
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [passingScore, setPassingScore] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [examCode, setExamCode] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
    fetchSubmissions();
    fetchStudents();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exam/list');
      setExams(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/result/admin/all');
      setSubmissions(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/exam/admin/students?search=${searchStudent}`);
      setStudents(res.data);
    } catch (err) { console.error(err); }
  };

  const handleExcelParse = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    try {
      const res = await api.post('/exam/upload-questions', formData);
      setUploadPreview(res.data);
    } catch (err) { alert('Failed to parse Excel'); }
    finally { setIsUploading(false); }
  };

  const handleBulkSave = async () => {
    if (!uploadTargetExam) return alert('Select a target exam');
    if (!uploadPreview || uploadPreview.summary.valid === 0) return alert('No valid questions to save');
    
    setIsSaving(true);
    try {
      const validQs = uploadPreview.rows.filter(r => r.isValid);
      await api.post('/exam/save-questions-bulk', { 
        examId: uploadTargetExam, 
        questions: validQs 
      });
      alert(`Successfully saved ${validQs.length} questions`);
      setUploadPreview(null);
      setActiveTab('exams');
      fetchExams();
    } catch (err) { alert('Failed to save questions'); }
    finally { setIsSaving(false); }
  };

  const fetchStats = async (examId) => {
    try {
      const res = await api.get(`/result/stats/${examId}`);
      setStats({
        labels: res.data.map(q => q.question_text.substring(0, 15) + '...'),
        datasets: [{
          label: 'Correct Answers',
          data: res.data.map(q => q.corrects),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
        }]
      });
    } catch (err) { console.error(err); }
  };

  const handleGrantRetake = async (studentId, examId) => {
    if (!window.confirm('Allow retake?')) return;
    try {
      await api.post('/exam/admin/grant-retake', { user_id: studentId, exam_id: examId });
      fetchSubmissions();
      if (selectedStudentLogs) fetchStudentLogs(selectedStudentLogs.id, selectedStudentLogs.name);
    } catch (err) { alert('Error granting retake'); }
  };

  const fetchStudentLogs = async (studentId, studentName) => {
    try {
      const res = await api.get(`/dashboard/student-logs/${studentId}`);
      setSelectedStudentLogs({ id: studentId, name: studentName, logs: res.data });
    } catch (err) { alert('Failed to fetch activity logs'); }
  };

  const handleExport = (examId, type) => {
    const token = localStorage.getItem('token');
    window.open(`http://localhost:5005/api/result/export/${type}/${examId}?token=${token}`, '_blank');
  };

  const addQuestionBox = (type) => {
    setQuestions([...questions, { 
      type, question_text: '', options: type === 'mcq' ? ['', '', '', ''] : null, 
      correct_answer: '', marks: 1, explanation: ''
    }]);
  };

  const updateQuestion = (index, field, value, optionIndex = null) => {
    const updated = JSON.parse(JSON.stringify(questions));
    if (optionIndex !== null) updated[index].options[optionIndex] = value;
    else updated[index][field] = value;
    setQuestions(updated);
  };

  const handleSubmitExam = async (e) => {
    e.preventDefault();
    if (questions.length === 0) return alert('Add at least one question');
    setIsSaving(true);
    try {
      await api.post('/exam/create', { 
        title, duration, passing_score: passingScore, 
        start_time: startTime, end_time: endTime, 
        exam_code: examCode, questions 
      });
      setShowCreateForm(false);
      setTitle(''); setDuration(''); setExamCode(''); setQuestions([]);
      fetchExams();
    } catch (err) { 
      const msg = err.response?.data?.error || 'Error creating exam';
      alert(msg); 
    } 
    finally { setIsSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-8 text-2xl font-black border-b border-indigo-800 tracking-tighter">
          QUIZ<span className="text-indigo-400">FLOW</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 text-sm font-bold">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center w-full px-4 py-3 rounded-xl transition ${activeTab === 'overview' ? 'bg-indigo-600 shadow-xl' : 'hover:bg-indigo-800'}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
          </button>
          <button onClick={() => setActiveTab('exams')} className={`flex items-center w-full px-4 py-3 rounded-xl transition ${activeTab === 'exams' ? 'bg-indigo-600 shadow-xl' : 'hover:bg-indigo-800'}`}>
            <BookOpen className="w-5 h-5 mr-3" /> Exams
          </button>
          <button onClick={() => setActiveTab('upload')} className={`flex items-center w-full px-4 py-3 rounded-xl transition ${activeTab === 'upload' ? 'bg-indigo-600 shadow-xl' : 'hover:bg-indigo-800'}`}>
            <FileUp className="w-5 h-5 mr-3" /> Upload Questions
          </button>
          <button onClick={() => setActiveTab('submissions')} className={`flex items-center w-full px-4 py-3 rounded-xl transition ${activeTab === 'submissions' ? 'bg-indigo-600 shadow-xl' : 'hover:bg-indigo-800'}`}>
            <BookOpen className="w-5 h-5 mr-3" /> Submissions
          </button>
          <button onClick={() => setActiveTab('students')} className={`flex items-center w-full px-4 py-3 rounded-xl transition ${activeTab === 'students' ? 'bg-indigo-600 shadow-xl' : 'hover:bg-indigo-800'}`}>
            <Users className="w-5 h-5 mr-3" /> Students
          </button>
          <Link to="/leaderboard" className="flex items-center w-full px-4 py-3 rounded-xl hover:bg-indigo-800 transition">
            <BarChart3 className="w-5 h-5 mr-3" /> Rankings
          </Link>
        </nav>
        <div className="p-4 border-t border-indigo-800">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-red-300 hover:text-red-100 transition">
            <LogOut className="w-5 h-5 mr-3" /> Exit Portal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tight">
            {activeTab} <span className="text-indigo-600">Hub</span>
          </h1>
          {activeTab === 'exams' && (
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center px-8 py-3 bg-indigo-600 text-white rounded-[20px] shadow-2xl shadow-indigo-600/30 font-black hover:bg-indigo-700 transition active:scale-95"
            >
              <Plus className="w-6 h-6 mr-2" /> {showCreateForm ? 'Discard Changes' : 'Build Assessment'}
            </button>
          )}
        </div>

        {activeTab === 'overview' && (
           <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
              <DashboardAnalytics onNavigate={setActiveTab} />
           </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
               <div>
                  <h3 className="text-xl font-black mb-4">1. Select Target Exam</h3>
                  <select 
                    value={uploadTargetExam} onChange={e => setUploadTargetExam(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 transition"
                  >
                    <option value="">-- Choose Exam --</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
               </div>
               <div>
                  <h3 className="text-xl font-black mb-4">2. Choose Excel File</h3>
                  <div className="flex flex-col space-y-3">
                    <label className="flex items-center justify-center px-8 py-4 bg-indigo-50 text-indigo-700 border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer hover:bg-indigo-100 transition group">
                       <FileUp className="w-6 h-6 mr-3 group-hover:scale-110 transition" />
                       <span className="font-black uppercase tracking-widest text-sm">{isUploading ? 'Parsing...' : 'Browse .xlsx'}</span>
                       <input type="file" hidden accept=".xlsx" onChange={handleExcelParse} />
                    </label>
                    <a 
                      href="http://localhost:5005/api/exam/template/questions" 
                      className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center hover:text-indigo-600 transition"
                    >
                      Download Sample Template (.xlsx)
                    </a>
                  </div>
               </div>
            </div>

            {uploadPreview && (
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                 <div className="flex justify-between items-end mb-8">
                    <div>
                       <h2 className="text-2xl font-black mb-2">Import Preview</h2>
                       <div className="flex space-x-4">
                          <span className="text-xs font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">{uploadPreview.summary.valid} Valid Rows</span>
                          <span className="text-xs font-black text-red-600 uppercase bg-red-50 px-3 py-1 rounded-full">{uploadPreview.summary.invalid} Errors Found</span>
                       </div>
                    </div>
                    <button 
                      onClick={handleBulkSave} disabled={isSaving || uploadPreview.summary.valid === 0}
                      className="px-10 py-4 bg-slate-900 text-white rounded-[30px] font-black shadow-2xl hover:bg-black transition disabled:opacity-30"
                    >
                       {isSaving ? 'PERSISTING...' : 'COMMIT CHANGES'}
                    </button>
                 </div>

                 <div className="overflow-hidden rounded-[30px] border border-slate-50">
                    <table className="min-w-full divide-y divide-slate-100">
                       <thead className="bg-slate-50/50">
                          <tr>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Row</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Question</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                             <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Correction</th>
                             <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {uploadPreview.rows.map((row, i) => (
                            <tr key={i} className={`hover:bg-slate-50/50 transition ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                               <td className="px-6 py-4 font-black text-slate-400">{row.row}</td>
                               <td className="px-6 py-4 font-bold text-slate-700 max-w-xs truncate">{row.question_text}</td>
                               <td className="px-6 py-4 uppercase text-[10px] font-black text-indigo-500">{row.type}</td>
                               <td className="px-6 py-4 font-medium text-slate-500 truncate">{row.correct_answer}</td>
                               <td className="px-6 py-4 text-right">
                                  {row.isValid ? 
                                   <CheckCircle2 className="inline w-5 h-5 text-emerald-500" /> : 
                                   <div className="relative group inline-block">
                                      <AlertCircle className="w-5 h-5 text-red-500 cursor-help" />
                                      <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded whitespace-nowrap z-50">
                                         {row.errors.join(', ')}
                                      </div>
                                   </div>
                                  }
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Tab Content Logic (Exams, Students, Submissions) - Remainder of Dashboard UI */}
        {activeTab === 'exams' && (
           <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
             {showCreateForm ? (
               <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                  <form onSubmit={handleSubmitExam} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Title</label>
                         <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-bold transition" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Min)</label>
                         <input required type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-bold transition" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Code</label>
                         <input required value={examCode} onChange={e => setExamCode(e.target.value.toUpperCase())} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-black text-indigo-600 uppercase transition" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Time</label>
                         <input required type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-bold transition" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Time</label>
                         <input required type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-bold transition" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pass Mark (%)</label>
                         <input required type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-600 focus:bg-white outline-none font-bold transition" />
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                       <div className="flex justify-between items-center mb-10">
                          <h3 className="text-2xl font-black">Question Stack ({questions.length})</h3>
                          <div className="flex space-x-3">
                             {['mcq', 'short_answer', 'coding'].map(t => (
                               <button key={t} type="button" onClick={() => addQuestionBox(t)} className="px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition">+{t.replace('_',' ')}</button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-8">
                          {questions.map((q, i) => (
                            <div key={i} className="p-10 rounded-[30px] border border-slate-100 bg-slate-50/30">
                               <div className="flex justify-between mb-6">
                                  <span className="text-[10px] font-black uppercase tracking-widest p-2 bg-indigo-600 text-white rounded-lg leading-none">Q.{i+1} {q.type}</span>
                                  <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                     Weight: <input type="number" className="w-12 ml-3 bg-white border-2 border-slate-100 rounded-lg p-2 text-center text-indigo-600" value={q.marks} onChange={e => updateQuestion(i, 'marks', e.target.value)} />
                                  </div>
                               </div>
                               <textarea required className="w-full p-6 rounded-2xl bg-white border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold mb-6" placeholder="Construct your question here..." value={q.question_text} onChange={e => updateQuestion(i, 'question_text', e.target.value)} />
                               
                               {q.type === 'mcq' && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {q.options.map((opt, optIdx) => (
                                      <div key={optIdx} className="flex gap-3">
                                         <div className="flex items-center justify-center w-12 bg-indigo-100 text-indigo-600 rounded-xl font-black text-xs">{String.fromCharCode(65 + optIdx)}</div>
                                         <input 
                                           required className="flex-1 px-6 py-3 rounded-xl bg-white border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold" 
                                           placeholder={`Option ${optIdx + 1}`} 
                                           value={opt} 
                                           onChange={e => updateQuestion(i, 'options', e.target.value, optIdx)} 
                                         />
                                      </div>
                                    ))}
                                 </div>
                               )}

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <input required className="px-6 py-4 rounded-2xl bg-white border-2 border-emerald-50 focus:border-emerald-500 outline-none font-bold text-emerald-600" placeholder="Target Correct Answer" value={q.correct_answer} onChange={e => updateQuestion(i, 'correct_answer', e.target.value)} />
                                  <input className="px-6 py-4 rounded-2xl bg-white border-2 border-slate-50 focus:border-indigo-600 outline-none font-bold" placeholder="Context/Explanation" value={q.explanation} onChange={e => updateQuestion(i, 'explanation', e.target.value)} />
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black text-xl shadow-2xl hover:bg-black transition">SAVE EXAMINATION SYSTEM</button>
                  </form>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {exams.map(exam => (
                   <div key={exam.id} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-600/10 transition group overflow-hidden relative">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                           <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition tracking-tight leading-none">{exam.title}</h3>
                           <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{exam.exam_code}</span>
                        </div>
                        <div className="space-y-4 mb-8">
                           <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest"><Timer className="w-4 h-4 mr-3 text-indigo-400" /> {exam.duration} Minutes</div>
                           <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest"><RefreshCw className="w-4 h-4 mr-3 text-indigo-400" /> Min. Pass: {exam.passing_score}%</div>
                        </div>
                        <div className="flex space-x-3 pt-6 border-t border-slate-50">
                           <button onClick={() => {setActiveTab('submissions'); fetchStats(exam.id)}} className="flex-1 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition">ANALYTICS</button>
                           <button onClick={() => handleExport(exam.id, 'pdf')} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition"><Download className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition duration-700"><BookOpen size={160}/></div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

        {activeTab === 'students' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="relative max-w-xl group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-600 transition" />
                 <input 
                   value={searchStudent} onChange={e => setSearchStudent(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && fetchStudents()}
                   placeholder="Search by full name or email identity..." 
                   className="w-full pl-16 pr-8 py-5 rounded-[30px] bg-white border-2 border-slate-100 focus:border-indigo-600 shadow-sm outline-none font-bold transition" 
                 />
              </div>
              <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                 <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                       <tr>
                          <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Student Profile</th>
                          <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</th>
                          <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Audit</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {students.map(s => (
                         <tr key={s.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-10 py-6 font-black text-slate-800">{s.name}</td>
                            <td className="px-10 py-6 font-bold text-slate-400">{s.email}</td>
                            <td className="px-10 py-6 text-right">
                               <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 underline underline-offset-8" onClick={() => fetchStudentLogs(s.id, s.name)}>Activity Logs</button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'submissions' && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
              {stats && (
                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[400px]">
                   <h3 className="text-xl font-black mb-6">Aggregate Class Performance</h3>
                   <div className="h-[300px]"><Bar data={stats} options={{ responsive: true, maintainAspectRatio: false, cornerRadius: 10 }} /></div>
                </div>
              )}
              <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                 <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                       <tr>
                          <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                          <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Assessment</th>
                          <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Final Mark</th>
                          <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {submissions.map((sub) => (
                         <tr key={sub.attempt_id} className="hover:bg-slate-50/50 transition">
                            <td className="px-10 py-6 font-black text-slate-800">{sub.student_name}</td>
                            <td className="px-10 py-6 font-bold text-slate-400">{sub.title}</td>
                            <td className="px-10 py-6">
                               <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${sub.score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  {sub.score} Pts
                               </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                               <button onClick={() => handleGrantRetake(sub.user_id, sub.exam_id)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-amber-50 hover:text-amber-600 transition group relative">
                                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition duration-700" />
                               </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>

      {/* 🧾 Activity Modal */}
      {selectedStudentLogs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10">
           <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-md" onClick={() => setSelectedStudentLogs(null)}></div>
           <div className="bg-white w-full max-w-4xl rounded-[50px] shadow-2xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 leading-none mb-2">{selectedStudentLogs.name}</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Activity Audit</p>
                 </div>
                 <button onClick={() => setSelectedStudentLogs(null)} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition flex items-center justify-center font-black">✕</button>
              </div>
              <div className="flex-1 overflow-auto p-10">
                 <div className="space-y-4">
                    {selectedStudentLogs.logs.map((log) => (
                      <div key={log.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-indigo-100 transition">
                         <div className="flex items-center space-x-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-xl ${log.status === 'submitted' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                               {log.exam_name.charAt(0)}
                            </div>
                            <div>
                               <h4 className="font-black text-slate-900">{log.exam_name}</h4>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {log.status === 'submitted' ? `Finished: ${new Date(log.submitted_at).toLocaleString()}` : 'Session In-Progress'}
                               </p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className={`text-xl font-black block ${log.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {log.score ?? '--'}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-tighter italic">Final Score</span>
                         </div>
                      </div>
                    ))}
                    {selectedStudentLogs.logs.length === 0 && (
                      <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest">No activity recorded for this student</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
