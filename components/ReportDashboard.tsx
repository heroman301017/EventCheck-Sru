
import React, { useMemo } from 'react';
import { User, Event, Stats } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Printer, FileText, Calendar, MapPin, Users, UserCheck, UserX, Clock, Map as MapIcon, ExternalLink } from 'lucide-react';
import { formatThaiDate } from '../constants';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface ReportDashboardProps {
  users: User[];
  event: Event;
  stats: Stats;
}

const COLORS = ['#10B981', '#64748B', '#F59E0B']; // Emerald, Slate, Amber

// Custom Icons for Report Map
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const checkInIcon = createCustomIcon('#10B981'); // Emerald
const checkOutIcon = createCustomIcon('#64748B'); // Slate

// Helper to auto-zoom map
const SetBoundsRect = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ users, event, stats }) => {
  const pieData = [
    { name: 'เข้าร่วม', value: stats.present + stats.returned },
    { name: 'ยังไม่มา', value: stats.pending },
  ];

  const barData = [
    { name: 'อยู่ในงาน', value: stats.present },
    { name: 'กลับแล้ว', value: stats.returned },
    { name: 'ยังไม่มา', value: stats.pending },
  ];

  // Logic to process location data
  const usersWithLocation = useMemo(() => {
    return users.filter(u => u.location && (u.location.includes(',') || u.location.includes(' ')) && u.status !== 'pending').map(u => {
      try {
        // Robust parsing for "lat,lng" or "lat lng"
        const separator = u.location!.includes(',') ? ',' : ' ';
        const parts = u.location!.split(separator).filter(p => p.trim() !== '');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return { ...u, lat, lng };
      } catch (e) {
        return { ...u, lat: NaN, lng: NaN };
      }
    }).filter(u => !isNaN(u.lat) && !isNaN(u.lng));
  }, [users]);

  // Calculate Map Bounds
  const bounds = useMemo(() => {
    if (usersWithLocation.length === 0) return null;
    const lats = usersWithLocation.map(u => u.lat);
    const lngs = usersWithLocation.map(u => u.lng);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ] as L.LatLngBoundsExpression;
  }, [usersWithLocation]);

  const handlePrint = () => {
    window.print();
  };

  const currentDateTime = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden animate-fade-in relative print:shadow-none print:border-0 print:rounded-none">
      
      {/* Print Button (Hidden when printing) */}
      <div className="absolute top-6 right-6 print:hidden z-10">
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 shadow-lg active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" /> พิมพ์รายงาน
        </button>
      </div>

      {/* Report Content */}
      <div className="p-8 md:p-12 print:p-0 space-y-8">
        
        {/* Header */}
        <div className="text-center border-b-2 border-slate-100 pb-8 mb-8 print:pb-4 print:mb-4">
          <div className="flex justify-center mb-4 text-violet-600 print:text-black">
             <FileText className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2 print:text-2xl">รายงานสรุปผลการลงทะเบียน</h1>
          <h2 className="text-xl font-bold text-violet-600 mb-4 print:text-lg print:text-black">{event.name}</h2>
          
          <div className="flex flex-wrap justify-center gap-4 text-slate-500 text-sm font-medium print:text-black">
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <Calendar className="w-4 h-4" /> {formatThaiDate(event.date)}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <MapPin className="w-4 h-4" /> {event.location}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <Clock className="w-4 h-4" /> พิมพ์เมื่อ: {currentDateTime}
            </div>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 text-center print:border-black print:bg-white">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider print:text-black">ผู้ลงทะเบียนรวม</p>
            <p className="text-3xl font-black text-violet-600 mt-1 print:text-black">{stats.total}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center print:border-black print:bg-white">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider print:text-black">เข้าร่วมงาน</p>
            <p className="text-3xl font-black text-emerald-600 mt-1 print:text-black">{stats.checkedIn}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center print:border-black print:bg-white">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider print:text-black">ร้อยละการเข้าร่วม</p>
            <p className="text-3xl font-black text-slate-600 mt-1 print:text-black">{stats.percentage.toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center print:border-black print:bg-white">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider print:text-black">ขาด / ยังไม่มา</p>
            <p className="text-3xl font-black text-amber-600 mt-1 print:text-black">{stats.pending}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-8 mb-8 print:break-inside-avoid">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 print:border-none">
              <h3 className="font-bold text-slate-700 mb-4 text-center print:text-black">สัดส่วนการเข้าร่วม</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#CBD5E1" />
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white p-4 rounded-2xl border border-slate-100 print:border-none">
              <h3 className="font-bold text-slate-700 mb-4 text-center print:text-black">สถานะปัจจุบัน</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '12px' }} tickLine={false} axisLine={false} />
                      <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Location Map Section - Only show if data exists */}
        {usersWithLocation.length > 0 && (
          <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-100 print:border-none print:break-inside-avoid">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 print:text-black">
               <MapIcon className="w-5 h-5" /> แผนที่จุดลงทะเบียน (Distribution Map)
             </h3>
             <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 print:border-black">
                <MapContainer 
                  center={[13.7563, 100.5018]} 
                  zoom={10} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  dragging={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {usersWithLocation.map((user) => (
                    <Marker 
                      key={user.id} 
                      position={[user.lat, user.lng]} 
                      icon={user.status === 'checked-in' ? checkInIcon : checkOutIcon}
                    />
                  ))}
                  {bounds && <SetBoundsRect bounds={bounds} />}
                </MapContainer>
             </div>
             <div className="flex gap-4 mt-2 justify-center text-xs text-slate-500 print:text-black">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Check-In</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-500"></div> Check-Out</div>
             </div>
          </div>
        )}

        {/* Detailed Table */}
        <div className="print:break-before-auto">
           <h3 className="font-bold text-slate-800 text-xl mb-4 print:text-black border-l-4 border-violet-500 pl-3 print:border-black">รายชื่อผู้เข้าร่วม ({stats.checkedIn} คน)</h3>
           <table className="w-full text-left border-collapse text-sm">
             <thead>
                <tr className="bg-slate-100 text-slate-700 print:bg-gray-200 print:text-black">
                   <th className="p-3 border border-slate-200 rounded-tl-lg">ลำดับ</th>
                   <th className="p-3 border border-slate-200">รหัสนักศึกษา</th>
                   <th className="p-3 border border-slate-200">ชื่อ-นามสกุล</th>
                   <th className="p-3 border border-slate-200">เวลาเข้า</th>
                   <th className="p-3 border border-slate-200 text-center">พิกัด (Lat,Lng)</th>
                   <th className="p-3 border border-slate-200 rounded-tr-lg">สถานะ</th>
                </tr>
             </thead>
             <tbody>
                {users.filter(u => u.status !== 'pending').length > 0 ? (
                   users.filter(u => u.status !== 'pending').map((user, idx) => (
                    <tr key={user.id} className="border-b border-slate-100 print:border-slate-300">
                       <td className="p-3 border-x border-slate-200 text-center">{idx + 1}</td>
                       <td className="p-3 border-x border-slate-200 font-mono">{user.studentId}</td>
                       <td className="p-3 border-x border-slate-200">{user.name}</td>
                       <td className="p-3 border-x border-slate-200 text-center">{user.checkInTime}</td>
                       <td className="p-3 border-x border-slate-200 text-center font-mono text-xs">
                          {user.location ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${user.location}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-violet-600 hover:underline flex items-center justify-center gap-1 print:text-black print:no-underline"
                            >
                              {user.location} <ExternalLink className="w-3 h-3 print:hidden" />
                            </a>
                          ) : '-'}
                       </td>
                       <td className="p-3 border-x border-slate-200 text-center">
                          {user.status === 'checked-in' ? 'อยู่ในงาน' : 'กลับแล้ว'}
                       </td>
                    </tr>
                   ))
                ) : (
                   <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 border border-slate-200 italic">
                         ยังไม่มีผู้เข้าร่วมงาน
                      </td>
                   </tr>
                )}
             </tbody>
           </table>
        </div>

        {/* Footer */}
        <div className="pt-8 mt-8 border-t border-slate-100 text-center text-xs text-slate-400 print:text-black print:mt-auto">
           <p>เอกสารนี้สร้างโดยระบบ EventCheck Smart Registration</p>
           <p>ข้อมูล ณ วันที่ {currentDateTime}</p>
        </div>

      </div>
    </div>
  );
};
