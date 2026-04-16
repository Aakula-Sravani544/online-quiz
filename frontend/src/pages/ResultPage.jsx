import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { Award, CheckCircle2, XCircle, Info, ArrowLeft, Trophy } from 'lucide-react';

function ResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await api.get(`/result/details/${attemptId}`);
        setResult(res.data);
      } catch (err) { console.error(err); }
    };
    fetchResult();
  }, [attemptId]);

  if (!result) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600">CALCULATING FINAL SCORE...</div>;

  const isPass = result.score >= result.passing_score;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-10 font-sans text-[#1E293B]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
           <Link to="/student/dashboard" className="flex items-center text-slate-400 hover:text-indigo-600 font-bold transition">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
           </Link>
        </div>

        {/* Score Card */}
        <div className={`p-12 rounded-[40px] shadow-2xl shadow-indigo-600/10 mb-12 text-center relative overflow-hidden ${isPass ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'}`}>
           <div className="relative z-10">
              <h1 className="text-4xl font-black mb-4">{isPass ? 'CONGRATULATIONS!' : 'KEEP PUSHING!'}</h1>
              <p className="text-indigo-100 font-bold tracking-widest uppercase text-sm mb-10">Your performance report for {result.title}</p>
              
              <div className="flex justify-center items-end space-x-2 mb-10">
                 <span className="text-8xl font-black">{result.score}</span>
                 <span className="text-2xl font-black opacity-50 mb-4">/ {result.total_possible_marks}</span>
              </div>

              <div className="inline-flex items-center px-8 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 font-black tracking-widest uppercase">
                 Status: {isPass ? 'PASSED' : 'FAILED'}
              </div>
           </div>
           <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12">
              {isPass ? <Trophy size={400} /> : <Award size={400} />}
           </div>
        </div>

        {/* Review Section */}
        <h2 className="text-2xl font-black mb-8 flex items-center">
           <Info className="w-6 h-6 mr-3 text-indigo-600" /> Question-wise Review
        </h2>

        <div className="space-y-6">
           {result.answers.map((ans, i) => (
             <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center">
                      <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black mr-4 text-slate-500">{i+1}</span>
                      <h3 className="font-black text-lg text-slate-800">{ans.question_text}</h3>
                   </div>
                   {ans.is_correct ? 
                    <CheckCircle2 className="text-emerald-500 w-8 h-8 group-hover:scale-110 transition" /> : 
                    <XCircle className="text-red-500 w-8 h-8 group-hover:scale-110 transition" />
                   }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-14">
                   <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Your Answer</span>
                      <p className={`font-bold ${ans.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>{ans.user_answer || 'No Answer'}</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-1">Correct Answer</span>
                      <p className="font-bold text-indigo-600">{ans.correct_answer}</p>
                   </div>
                </div>

                {ans.explanation && (
                  <div className="mt-6 ml-14 p-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50 text-amber-800 text-sm font-medium italic">
                     <span className="font-black uppercase text-[10px] tracking-widest block mb-1">Expert Explanation</span>
                     "{ans.explanation}"
                  </div>
                )}
             </div>
           ))}
        </div>

        <div className="mt-20 text-center pb-20">
           <Link to="/leaderboard" className="inline-flex items-center px-12 py-5 bg-slate-900 text-white rounded-[30px] font-black text-lg shadow-2xl shadow-slate-900/40 hover:scale-105 transition">
              <Trophy className="w-6 h-6 mr-4 text-amber-400" /> VIEW GLOBAL LEADERBOARD
           </Link>
        </div>
      </div>
    </div>
  );
}

export default ResultPage;
