import React, { useState, useEffect } from 'react';
import { 
  BarChart as BarChartIcon, 
  Users, 
  FileText, 
  Activity, 
  TrendingUp, 
  History,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartsRes, recentRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/dashboard/recent')
        ]);
        setStats(statsRes.data);
        setCharts(chartsRes.data);
        setRecent(recentRes.data);
      } catch (err) {
        console.error('Analytics Fetch Error:', err);
        setError(`Failed to load analytics: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-indigo-50/50 rounded-3xl border border-indigo-100"></div>
      ))}
    </div>
  );

  if (error) return (
    <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center text-red-600">
      <AlertCircle className="w-5 h-5 mr-3" />
      <span className="font-bold">{error}</span>
    </div>
  );

  const scoreData = {
    labels: charts?.scoreDistribution?.map(d => d.range) || [],
    datasets: [
      {
        label: 'Students',
        data: charts?.scoreDistribution?.map(d => d.count) || [],
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        borderRadius: 12,
      }
    ]
  };

  const submissionData = {
    labels: charts?.submissionsOverTime?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Submissions',
        data: charts?.submissionsOverTime?.map(d => d.count) || [],
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true, 
        position: 'top',
        labels: { font: { weight: 'bold', size: 10 }, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 12,
        displayColors: false
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        title: { display: true, text: 'COUNT', font: { weight: 'black', size: 10 } },
        grid: { color: '#F1F5F9' }, 
        ticks: { font: { weight: 'bold', size: 10 } } 
      },
      x: { 
        title: { display: true, text: 'METRIC RANGE', font: { weight: 'black', size: 10 } },
        grid: { display: false }, 
        ticks: { font: { weight: 'bold', size: 10 } } 
      }
    }
  };

  const lineOptions = {
    ...chartOptions,
    scales: {
      y: { ...chartOptions.scales.y, title: { display: true, text: 'VOLUME', font: { weight: 'black', size: 10 } } },
      x: { ...chartOptions.scales.x, title: { display: true, text: 'DATE', font: { weight: 'black', size: 10 } } }
    }
  };

  return (
    <div className="space-y-10 mb-12">
      {/* 🚀 Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<FileText className="text-indigo-600" />} label="Digital Assets" value={stats?.totalExams} color="bg-indigo-50" />
        <StatCard icon={<Users className="text-emerald-600" />} label="Verified Students" value={stats?.totalStudents} color="bg-emerald-50" />
        <StatCard icon={<CheckCircle className="text-purple-600" />} label="Successful Log" value={stats?.totalSubmissions} color="bg-purple-50" />
        <StatCard icon={<Activity className="text-rose-600" />} label="Live Sessions" value={stats?.activeExams} color="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 📈 Charts */}
        <div className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Grade Distribution" icon={<BarChartIcon className="w-5 h-5 text-indigo-600" />}>
              <Bar data={scoreData} options={chartOptions} />
            </ChartCard>
            <ChartCard title="Activity Timeline" icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}>
              <Line data={submissionData} options={lineOptions} />
            </ChartCard>
          </div>
          
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Performance Insight</h3>
                <p className="text-indigo-100 font-medium">
                  {stats?.totalSubmissions > 0 ? 
                    `The platform has processed ${stats.totalSubmissions} attempts across ${stats.totalExams} exams. Average student engagement is currently stable.` :
                    "Waiting for student engagement data to generate advanced insights."}
                </p>
             </div>
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <TrendingUp size={120} />
             </div>
          </div>
        </div>

        {/* 🕒 Recent Activity */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 h-full">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center">
              <History className="w-6 h-6 mr-3 text-indigo-600" /> Recent Submissions
            </h3>
            <div className="space-y-6">
              {recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs mr-4">
                      {item.student_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-800">{item.student_name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.exam_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-indigo-600 block">{item.score}</span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {new Date(item.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {recent.length === 0 && (
                <p className="text-center py-10 text-slate-300 font-bold uppercase tracking-widest text-xs">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className={`p-6 rounded-[35px] ${color} border border-white flex items-center space-x-6 shadow-sm transition hover:scale-105 duration-300`}>
    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 tabular-nums leading-none">{value ?? 0}</h4>
    </div>
  </div>
);

const ChartCard = ({ title, icon, children }) => (
  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-lg font-black text-slate-900 flex items-center">
        {icon} <span className="ml-3 uppercase tracking-tighter">{title}</span>
      </h3>
    </div>
    <div className="h-[250px] relative">
      {children}
    </div>
  </div>
);

export default DashboardAnalytics;
