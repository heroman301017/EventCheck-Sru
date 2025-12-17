import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Stats } from '../types';
import { Users, UserCheck, UserX, LogOut } from 'lucide-react';

interface DashboardProps {
  stats: Stats;
}

// Pastel Colors
const COLORS = ['#34D399', '#94A3B8', '#FBBF24']; // Emerald-400, Slate-400, Amber-400
// const COLORS = ['#A78BFA', '#F472B6', '#34D399', '#FBBF24']; // Violet, Pink, Emerald, Amber

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; sub?: string }> = ({ title, value, icon, colorClass, sub }) => (
  <div className={`bg-white rounded-2xl shadow-sm p-6 border-b-4 ${colorClass} flex items-center justify-between transition-transform hover:-translate-y-1 duration-300`}>
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-slate-700 mt-2">{value}</h3>
        {sub && <span className="text-sm text-slate-400 font-medium">{sub}</span>}
      </div>
    </div>
    <div className={`p-4 rounded-2xl ${colorClass.replace('border-', 'bg-').replace('-400', '-100').replace('-500', '-100')} ${colorClass.replace('border-', 'text-')}`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const pieData = [
    { name: 'อยู่ในงาน (Present)', value: stats.present },
    { name: 'กลับแล้ว (Returned)', value: stats.returned },
    { name: 'ยังไม่มา (Pending)', value: stats.pending },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="ยอดรวมทั้งหมด" 
          value={stats.total} 
          icon={<Users className="w-7 h-7" />} 
          colorClass="border-violet-400" 
        />
        <StatCard 
          title="อยู่ในงาน" 
          value={stats.present} 
          icon={<UserCheck className="w-7 h-7" />} 
          colorClass="border-emerald-400" 
        />
        <StatCard 
          title="กลับบ้านแล้ว" 
          value={stats.returned} 
          icon={<LogOut className="w-7 h-7" />} 
          colorClass="border-slate-400" 
        />
        <StatCard 
          title="ยังไม่ลงทะเบียน" 
          value={stats.pending} 
          icon={<UserX className="w-7 h-7" />} 
          colorClass="border-amber-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-violet-400 rounded-full"></div>
            สัดส่วนสถานะปัจจุบัน
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => [`${value} คน`, 'จำนวน']}
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'Sarabun' }}
                   itemStyle={{ color: '#64748b' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-rose-400 rounded-full"></div>
            ความคืบหน้าการเข้าร่วม
          </h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '12px', fontWeight: 500, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'Sarabun' }} />
                  <Bar dataKey="value" barSize={24} radius={[0, 12, 12, 0]}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};