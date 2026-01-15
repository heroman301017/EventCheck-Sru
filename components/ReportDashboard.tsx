
import React, { useState, useMemo, useEffect } from 'react';
import { User, Event, Stats } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Printer, FileText, Calendar, MapPin, Users, UserCheck, UserX, Clock, Map as MapIcon, ExternalLink, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { formatThaiDate } from '../constants';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";

interface ReportDashboardProps {
  users: User[];
  events: Event[];
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

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ users: allUsers, events }) => {
  // State for Event Selection
  const [selectedEventId, setSelectedEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  
  // State for AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Derive Current Event and Users
  const currentEvent = useMemo(() => events.find(e => e.id === selectedEventId) || events[0], [events, selectedEventId]);
  
  const currentEventUsers = useMemo(() => {
    if (!currentEvent) return [];
    return allUsers.filter(u => String(u.eventId) === String(currentEvent.id));
  }, [allUsers, currentEvent]);

  // Calculate Stats on the fly
  const stats: Stats = useMemo(() => ({
    total: currentEventUsers.length,
    present: currentEventUsers.filter(u => u.status === 'checked-in').length,
    returned: currentEventUsers.filter(u => u.status === 'checked-out').length,
    checkedIn: currentEventUsers.filter(u => u.status !== 'pending').length,
    pending: currentEventUsers.filter(u => u.status === 'pending').length,
    percentage: currentEventUsers.length > 0 ? (currentEventUsers.filter(u => u.status !== 'pending').length / currentEventUsers.length) * 100 : 0
  }), [currentEventUsers]);

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
    return currentEventUsers.filter(u => u.location && (u.location.includes(',') || u.location.includes(' ')) && u.status !== 'pending').map(u => {
      try {
        const separator = u.location!.includes(',') ? ',' : ' ';
        const parts = u.location!.split(separator).filter(p => p.trim() !== '');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return { ...u, lat, lng };
      } catch (e) {
        return { ...u, lat: NaN, lng: NaN };
      }
    }).filter(u => !isNaN(u.lat) && !isNaN(u.lng));
  }, [currentEventUsers]);

  const bounds = useMemo(() => {
    if (usersWithLocation.length === 0) return null;
    const lats = usersWithLocation.map(u => u.lat);
    const lngs = usersWithLocation.map(u => u.lng);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ] as L.LatLngBoundsExpression;
  }, [usersWithLocation]);

  // Reset AI analysis when event changes
  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
  }, [selectedEventId]);

  const handlePrint = () => {
    window.print();
  };

  const generateAIReport = async () => {
    if (!currentEvent) return;
    
    setIsAiLoading(true);
    setAiError(null);

    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        ทำหน้าที่เป็นผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูล (Data Analyst) สำหรับระบบ Event Management
        กรุณาวิเคราะห์และสรุปผลการเข้าร่วมกิจกรรม โดยใช้ข้อมูลดังนี้:

        ชื่อกิจกรรม: ${currentEvent.name}
        วันที่: ${currentEvent.date}
        สถานที่: ${currentEvent.location}
        
        สถิติ:
        - ผู้ลงทะเบียนทั้งหมด: ${stats.total} คน
        - เข้าร่วมงานจริง: ${stats.checkedIn} คน
        - คิดเป็นร้อยละ: ${stats.percentage.toFixed(2)}%
        - ผู้ที่ยังไม่มา: ${stats.pending} คน
        - จำนวนผู้ที่มีข้อมูลพิกัด GPS: ${usersWithLocation.length} คน

        คำสั่ง:
        1. เขียนบทสรุปผู้บริหาร (Executive Summary) สั้นๆ
        2. วิเคราะห์แนวโน้มการเข้าร่วม (Participation Analysis)
        3. ข้อเสนอแนะ 3 ข้อสำหรับการจัดกิจกรรมครั้งถัดไป (Recommendations)

        รูปแบบคำตอบ: ภาษาไทย, เป็นทางการ, กระชับ, ใช้ Markdown
        `;

        const response = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        if (response.text) {
            setAiAnalysis(response.text);
        } else {
            throw new Error("No response text");
        }

    } catch (err) {
        console.error("AI Error:", err);
        setAiError("ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาตรวจสอบ API Key หรือลองใหม่อีกครั้ง");
    } finally {
        setIsAiLoading(false);
    }
  };

  const currentDateTime = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  if (!currentEvent) return <div className="p-10 text-center text-slate-400">ไม่พบข้อมูลกิจกรรม</div>;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden animate-fade-in relative print:shadow-none print:border-0 print:rounded-none">
      
      {/* Top Control Bar (Hidden on Print) */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
         
         {/* Event Selector */}
         <div className="relative group w-full md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
               <Calendar className="w-4 h-4" />
            </div>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="appearance-none w-full md:w-80 pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-violet-100 outline-none cursor-pointer hover:border-violet-300 transition-all"
            >
               {events.map(e => (
                 <option key={e.id} value={e.id}>{e.name}</option>
               ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
               <ChevronDown className="w-4 h-4" />
            </div>
         </div>

         <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 shadow-lg active:scale-95 transition-all whitespace-nowrap"
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
          <h2 className="text-xl font-bold text-violet-600 mb-4 print:text-lg print:text-black">{currentEvent.name}</h2>
          
          <div className="flex flex-wrap justify-center gap-4 text-slate-500 text-sm font-medium print:text-black">
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <Calendar className="w-4 h-4" /> {formatThaiDate(currentEvent.date)}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <MapPin className="w-4 h-4" /> {currentEvent.location}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full print:bg-transparent print:p-0">
               <Clock className="w-4 h-4" /> พิมพ์เมื่อ: {currentDateTime}
            </div>
          </div>
        </div>

        {/* AI Insight Section (Interactive & Printable if generated) */}
        <div className="print:break-inside-avoid">
           {!aiAnalysis && !isAiLoading && (
             <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-lg print:hidden flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI Smart Analysis</h3>
                    <p className="text-violet-100 text-sm opacity-90">ให้ AI ช่วยวิเคราะห์ข้อมูลและสรุปผลเชิงลึก</p>
                  </div>
               </div>
               <button 
                 onClick={generateAIReport}
                 className="px-6 py-3 bg-white text-violet-600 rounded-xl font-bold hover:bg-violet-50 shadow-md transition-all active:scale-95 whitespace-nowrap"
               >
                 วิเคราะห์ข้อมูลเดี๋ยวนี้
               </button>
             </div>
           )}

           {isAiLoading && (
              <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100 flex flex-col items-center justify-center gap-3">
                 <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                 <p className="text-slate-500 font-medium animate-pulse">กำลังวิเคราะห์ข้อมูลด้วย AI...</p>
              </div>
           )}

           {aiError && (
              <div className="bg-rose-50 text-rose-600 rounded-2xl p-4 text-center border border-rose-100 text-sm font-medium print:hidden">
                 {aiError}
              </div>
           )}

           {aiAnalysis && (
              <div className="bg-violet-50/50 rounded-3xl p-6 md:p-8 border border-violet-100 relative print:border-black print:bg-white print:p-0 print:rounded-none">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 opacity-50 print:hidden"></div>
                 <h3 className="flex items-center gap-2 font-bold text-violet-700 text-lg mb-4 print:text-black">
                    <Sparkles className="w-5 h-5" /> บทวิเคราะห์โดย AI
                 </h3>
                 <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed print:text-black">
                    {/* Render Markdown-like text simply by splitting lines for now */}
                    {aiAnalysis.split('\n').map((line, i) => (
                        <p key={i} className={`mb-2 ${line.startsWith('#') || line.startsWith('**') ? 'font-bold text-slate-900 print:text-black' : ''}`}>
                            {line.replace(/[*#]/g, '')}
                        </p>
                    ))}
                 </div>
                 <button onClick={() => setAiAnalysis(null)} className="mt-4 text-xs text-slate-400 hover:text-violet-500 underline print:hidden">ล้างผลการวิเคราะห์</button>
              </div>
           )}
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
                {currentEventUsers.filter(u => u.status !== 'pending').length > 0 ? (
                   currentEventUsers.filter(u => u.status !== 'pending').map((user, idx) => (
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
