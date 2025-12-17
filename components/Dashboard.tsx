import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Stats } from '../types';
import { Users, UserCheck, UserX } from 'lucide-react';

interface DashboardProps {
  stats: Stats;
}

const COLORS = ['#10B981', '#F59E0B']; // Green, Amber

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; sub?: string }> = ({ title, value, icon, color, sub }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${color} flex items-center justify-between`}>
    <div>
      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-gray-800 mt-2">{value}</h3>
        {sub && <span className="text-sm text-gray-400 font-medium">{sub}</span>}
      </div>
    </div>
    <div className={`p-4 rounded-full bg-opacity-10 ${color.replace('border-', 'bg-')}`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const pieData = [
    { name: 'มาถึงแล้ว (Checked In)', value: stats.checkedIn },
    { name: 'ยังไม่มา (Pending)', value: stats.pending },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="ยอดรวมทั้งหมด" 
          value={stats.total} 
          icon={<Users className="w-8 h-8 text-blue-600" />} 
          color="border-blue-600" 
        />
        <StatCard 
          title="ลงทะเบียนแล้ว" 
          value={stats.checkedIn} 
          sub={`(${stats.percentage.toFixed(1)}%)`}
          icon={<UserCheck className="w-8 h-8 text-emerald-500" />} 
          color="border-emerald-500" 
        />
        <StatCard 
          title="ยังไม่ลงทะเบียน" 
          value={stats.pending} 
          icon={<UserX className="w-8 h-8 text-amber-500" />} 
          color="border-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">สัดส่วนการลงทะเบียน</h3>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => [`${value} คน`, 'จำนวน']}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart (Simulated Hourly check-in - visualized as simple distribution for now) */}
         <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">สถานะภาพรวม</h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} style={{ fontSize: '12px', fontWeight: 500 }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
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