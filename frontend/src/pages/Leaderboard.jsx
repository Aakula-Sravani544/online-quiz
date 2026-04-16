import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Trophy, ArrowLeft, Medal, Clock, Target } from 'lucide-react';

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const endpoint = examId ? `/result/leaderboard/${examId}` : '/result/leaderboard/all';
        const res = await api.get(endpoint);
        setLeaders(res.data);
      } catch (err) { console.error(err); }
    };
    fetchLeaderboard();
  }, [examId]);

  const role = localStorage.getItem('role');
  const dashboardLink = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Link to={dashboardLink} className="inline-flex items-center text-slate-400 hover:text-indigo-600 font-black transition group">
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition" /> BACK TO DASHBOARD
          </Link>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-600/5 border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 py-16 px-10 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex p-4 bg-white/10 backdrop-blur-xl rounded-[30px] border border-white/10 mb-6">
                <Trophy className="w-12 h-12 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">Global Rankings</h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Excellence recognition board</p>
            </div>
            {/* Abstract Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 opacity-20 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 opacity-20 blur-[100px]" />
          </div>
          
          <div className="p-10">
            {leaders.length > 0 ? (
              <div className="space-y-4">
                {leaders.map((student, index) => (
                  <div key={index} className={`flex items-center p-6 rounded-[30px] border transition ${index === 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                    <div className="w-16 flex-shrink-0 flex justify-center items-center">
                       {index === 0 ? <Medal size={40} className="text-yellow-500" /> : 
                        index === 1 ? <Medal size={32} className="text-slate-400" /> : 
                        index === 2 ? <Medal size={32} className="text-amber-600" /> : 
                        <span className="font-black text-2xl text-slate-200">#{index + 1}</span>}
                    </div>
                    
                    <div className="flex-1 ml-6">
                       <h3 className="font-black text-xl text-slate-800">{student.name}</h3>
                       <div className="flex space-x-4 mt-1">
                          <span className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                             <Clock className="w-3 h-3 mr-1" /> {student.time_taken || 0}s
                          </span>
                       </div>
                    </div>

                    <div className="text-right">
                       <div className="text-4xl font-black text-indigo-600 tabular-nums">{student.score}</div>
                       <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Total Score</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                <Target className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="font-black text-slate-300 uppercase tracking-widest">No scores archived yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
