import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { LogOut, Play, Users, BookOpen, Award, Bell, Clock, Calendar } from 'lucide-react';

function StudentDashboard() {
  const [examCode, setExamCode] = useState('');
  const [results, setResults] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
    fetchUpcoming();
  }, []);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const res = await api.get(`/result/${payload.id}`);
      setResults(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/exam/list');
      // Filter exams that haven't ended yet
      const now = new Date();
      setUpcomingExams(res.data.filter(e => new Date(e.end_time) > now));
    } catch (err) { console.error(err); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    console.log('Launch initiated for code:', examCode);
    const cleanCode = examCode.trim();
    if (!cleanCode) return;
    try {
      await api.get(`/exam/${cleanCode}`);
      navigate(`/quiz/${cleanCode}`);
    } catch (err) {
      console.error('Launch Error:', err);
      alert('Invalid Exam Code or Exam not active');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar - Enhanced */}
      <div className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-8 text-2xl font-black tracking-tighter border-b border-indigo-800">
          QUIZ<span className="text-indigo-400">FLOW</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="flex items-center w-full px-4 py-3 bg-indigo-600 rounded-xl shadow-lg">
            <BookOpen className="w-5 h-5 mr-3" /> Dashboard
          </button>
          <Link to="/leaderboard" className="flex items-center w-full px-4 py-3 hover:bg-indigo-800 rounded-xl transition">
            <Users className="w-5 h-5 mr-3" /> Rankings
          </Link>
        </nav>
        <div className="p-4 border-t border-indigo-800">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-red-300 hover:text-red-100 transition">
            <LogOut className="w-5 h-5 mr-3" /> Exit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900">Student Dashboard</h1>
            <p className="text-gray-500 mt-2 font-medium">Choose an exam or review your performance.</p>
          </div>
          <button className="p-3 bg-white rounded-full border border-gray-100 shadow-sm relative hover:bg-gray-50 transition">
             <Bell className="w-6 h-6 text-gray-400" />
             <span className="absolute top-2 right-2 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full"></span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Actions & Results */}
          <div className="lg:col-span-8 space-y-10">
            {/* Join Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 relative overflow-hidden group">
               <div className="relative z-10">
                <h2 className="text-2xl font-black text-indigo-900 mb-6 flex items-center">
                  <Play className="w-6 h-6 mr-3 text-indigo-600" /> Take Assessment
                </h2>
                <form onSubmit={handleJoin} className="flex gap-4">
                  <input 
                    type="text" required value={examCode} onChange={(e) => setExamCode(e.target.value)}
                    placeholder="Enter Exam Code (e.g. FS101)"
                    className="flex-1 px-6 py-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition outline-none font-bold placeholder:font-normal"
                  />
                  <button type="submit" className="px-10 py-4 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/30 active:scale-95">
                    Launch
                  </button>
                </form>
               </div>
               <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition duration-700">
                  <Award size={200} />
               </div>
            </div>

            {/* Results Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
               <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center">
                 <Award className="w-6 h-6 mr-3 text-indigo-600" /> Attempt History
               </h2>
               <div className="space-y-4">
                  {results.map((res) => (
                    <div key={res.attempt_id} className="flex items-center justify-between p-5 border border-gray-50 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/20 transition cursor-pointer">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mr-5">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-800">{res.title}</h3>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {new Date(res.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-2xl font-black text-indigo-600">{res.score}</span>
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total Pts</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Right Column: Upcoming & Meta */}
          <div className="lg:col-span-4 space-y-10">
            <div className="bg-indigo-900 p-8 rounded-3xl shadow-xl text-white">
               <h2 className="text-xl font-black mb-6 flex items-center">
                 <Clock className="w-5 h-5 mr-3 text-indigo-400" /> Upcoming
               </h2>
               <div className="space-y-6">
                  {upcomingExams.slice(0, 3).map(exam => (
                    <div key={exam.id} className="border-l-4 border-indigo-400 pl-4 py-2">
                        <h4 className="font-black text-lg leading-tight">{exam.title}</h4>
                        <div className="flex items-center text-xs font-black text-indigo-400 uppercase mt-1">Code: {exam.exam_code}</div>
                        <div className="flex items-center text-indigo-300 text-sm mt-3 font-bold">
                           <Calendar className="w-4 h-4 mr-2" />
                           {new Date(exam.start_time).toLocaleDateString()}
                        </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-900 mb-4">Study Tip</h3>
               <p className="text-gray-500 text-sm leading-relaxed">
                 Coding questions require precise syntax. Use the "Run" button to verify your logic before submitting!
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
