import React, { useState, useMemo, useEffect } from 'react';
import { User, Stats, Event } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, normalizePhone } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { 
  LayoutDashboard, ScanLine, QrCode, Lock, Unlock, RefreshCw, 
  Trash2, ShieldCheck, X, Clock, AlertTriangle, Calendar, 
  MapPin
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistrationForm } from './components/RegistrationForm';
import { EventPass } from './components/EventPass';
import { EventManager } from './components/EventManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'register' | 'events'>('register');
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('eventcheck_users_v3');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('eventcheck_events_v3');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  const [selectedEventId, setSelectedEventId] = useState<string>(() => events[0]?.id || 'e1');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [demoStatus, setDemoStatus] = useState({ daysLeft: 30, isExpired: false });

  useEffect(() => {
    localStorage.setItem('eventcheck_users_v3', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('eventcheck_events_v3', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    const DEMO_DAYS = 30;
    const STORAGE_KEY = 'eventcheck_demo_start_v1';
    let startTime = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(STORAGE_KEY, startTime.toString());
    }
    const remaining = (DEMO_DAYS * 24 * 60 * 60 * 1000) - (Date.now() - startTime);
    setDemoStatus({
      daysLeft: Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000))),
      isExpired: remaining <= 0
    });
  }, []);

  const currentEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0] || INITIAL_EVENTS[0];
  }, [events, selectedEventId]);

  const currentEventUsers = useMemo(() => users.filter(u => u.eventId === selectedEventId), [users, selectedEventId]);

  const stats: Stats = useMemo(() => {
    const total = currentEventUsers.length;
    const present = currentEventUsers.filter(u => u.status === 'checked-in').length;
    const returned = currentEventUsers.filter(u => u.status === 'checked-out').length;
    const checkedIn = present + returned;
    return { total, checkedIn, present, returned, pending: total - checkedIn, percentage: total > 0 ? (checkedIn / total) * 100 : 0 };
  }, [currentEventUsers]);

  const handleCheckIn = (scannedValue: string) => {
    setUsers(prev => prev.map(u => {
      if ((u.phone === scannedValue || u.studentId === scannedValue) && u.eventId === selectedEventId) {
        const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        if (u.status === 'pending') return { ...u, status: 'checked-in', checkInTime: now };
        if (u.status === 'checked-in') return { ...u, status: 'checked-out', checkOutTime: now };
      }
      return u;
    }));
  };

  const handleRegister = (userData: Partial<User>) => {
    const newUser: User = {
      id: Date.now(),
      studentId: userData.studentId || '',
      name: userData.name || '',
      phone: normalizePhone(userData.phone || ''),
      faculty: userData.faculty || '-',
      major: userData.major || '-',
      eventId: selectedEventId,
      status: 'pending'
    };
    setUsers(prev => [...prev, newUser]);
    setRegisteredUser(newUser);
  };

  const handleImportUsers = (newUsers: any[]) => {
    const formatted = newUsers.map((u, i) => ({
      id: Date.now() + i,
      studentId: u.studentId || '',
      name: u.name || '',
      phone: normalizePhone(u.phone || ''),
      faculty: u.faculty || '-',
      major: u.major || '-',
      eventId: selectedEventId,
      status: 'pending' as const
    }));
    
    // Replace logic: Filter out existing users of THIS event, then add the new ones
    setUsers(prev => {
      const otherEventUsers = prev.filter(u => u.eventId !== selectedEventId);
      return [...otherEventUsers, ...formatted];
    });
  };

  const exportCSV = () => {
    const bom = "\uFEFF"; 
    const headers = "รหัสนักศึกษา,ชื่อ-สกุล,เบอร์โทร,คณะ,สาขาวิชา,สถานะ,เวลาเข้า,เวลาออก\n";
    const rows = currentEventUsers.map(u => {
      const statusText = u.status === 'checked-in' ? 'อยู่ในงาน' : u.status === 'checked-out' ? 'กลับแล้ว' : 'ยังไม่มา';
      return `'${u.studentId},"${u.name}",'${u.phone},"${u.faculty}","${u.major}",${statusText},${u.checkInTime || '-'},${u.checkOutTime || '-'}`;
    }).join("\n");
    const blob = new Blob([bom + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${currentEvent.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const fontUrl = 'https://cdn.jsdelivr.net/gh/nokstatic/public-fonts@master/THSarabunNew/THSarabunNew.ttf';
    const response = await fetch(fontUrl);
    const buffer = await response.arrayBuffer();
    const base64Font = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    doc.addFileToVFS('THSarabunNew.ttf', base64Font);
    doc.addFont('THSarabunNew.ttf', 'THSarabunNew', 'normal');
    doc.setFont('THSarabunNew');
    
    doc.setFontSize(18);
    doc.text(`รายงาน: ${currentEvent.name}`, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`โดย Codelex.PHR | ทั้งหมด ${stats.total} | ในงาน ${stats.present} | กลับแล้ว ${stats.returned}`, 105, 22, { align: 'center' });

    autoTable(doc, {
      head: [["รหัสนักศึกษา", "ชื่อ-นามสกุล", "คณะ", "สถานะ", "เวลาเข้า"]],
      body: currentEventUsers.map(u => [u.studentId || '-', u.name || '-', u.faculty || '-', u.status === 'checked-in' ? 'มาแล้ว' : u.status === 'checked-out' ? 'กลับแล้ว' : 'รอ', u.checkInTime || '-']),
      startY: 30,
      styles: { font: 'THSarabunNew', fontSize: 10 },
      headStyles: { fillColor: [124, 58, 237] }
    });
    doc.save(`Report_${currentEvent.name}.pdf`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-hidden">
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-violet-100 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-md"><QrCode className="w-6 h-6 text-white" /></div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-700 leading-none">Event<span className="text-violet-500">Check</span></h1>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">by Codelex.PHR</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
              <Clock className="w-3 h-3" /> DEMO: {demoStatus.daysLeft} วัน
            </div>
            <nav className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('register')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'register' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สมัคร</button>
              <button onClick={() => setActiveTab('scan')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'scan' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สแกน</button>
              <button onClick={() => setActiveTab('overview')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              {isAdmin && <button onClick={() => setActiveTab('events')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>จัดการ</button>}
            </nav>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {activeTab !== 'events' && (
        <div className="bg-violet-600 text-white py-2 shadow-inner overflow-hidden">
           <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <Calendar className="w-4 h-4 shrink-0 opacity-70" />
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0">Event Selection:</span>
              {events.map(e => (
                <button key={e.id} onClick={() => setSelectedEventId(e.id)} className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${selectedEventId === e.id ? 'bg-white text-violet-600' : 'bg-violet-400/50 text-violet-100'}`}>{e.name}</button>
              ))}
           </div>
        </div>
      )}

      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-y-auto ${activeTab === 'scan' || activeTab === 'register' ? 'flex flex-col items-center' : ''}`}>
        {activeTab === 'register' && (
          <div className="w-full max-w-2xl">
            {!registeredUser ? <RegistrationForm eventName={currentEvent.name} onRegister={handleRegister} /> : <EventPass user={registeredUser} event={currentEvent} onBack={() => setRegisteredUser(null)} />}
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="w-full h-full flex flex-col items-center justify-center py-4">
             <div className="text-center mb-8"><h2 className="text-3xl font-bold text-slate-800">{currentEvent.name}</h2><p className="text-slate-500 mt-1">จุดตรวจสอบและลงทะเบียนเข้าร่วมโครงการ</p></div>
             <Scanner users={currentEventUsers} onScan={handleCheckIn} />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8 pb-10">
            <div className="flex justify-between items-start">
               <div><h2 className="text-2xl font-bold text-slate-800">{currentEvent.name}</h2><p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5" /> {currentEvent.location} &bull; {currentEvent.date}</p></div>
               {isAdmin && <button onClick={() => { if(confirm('รีเซ็ตสถานะการลงทะเบียนทั้งหมดใน Event นี้?')) setUsers(prev => prev.map(u => u.eventId === selectedEventId ? {...u, status:'pending', checkInTime:undefined, checkOutTime:undefined} : u)); }} className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"><RefreshCw className="w-5 h-5" /></button>}
            </div>
            <Dashboard stats={stats} />
            <UserList 
              users={currentEventUsers} 
              isEditable={isAdmin}
              onAddUser={(name, phone) => handleRegister({ name, phone })}
              onUpdateUser={(u) => setUsers(prev => prev.map(p => p.id === u.id ? u : p))}
              onDeleteUser={(id) => { if(confirm('ยืนยันการลบรายชื่อ?')) setUsers(prev => prev.filter(u => u.id !== id)); }}
              onImportUsers={handleImportUsers} 
              onExportCSV={exportCSV}
              onExportPDF={exportPDF}
            />
          </div>
        )}

        {activeTab === 'events' && isAdmin && (
          <EventManager 
            events={events} 
            onSave={(e) => {
               setEvents(prev => {
                 const exists = prev.some(p => p.id === e.id);
                 return exists ? prev.map(p => p.id === e.id ? e : p) : [...prev, e];
               });
            }}
            onDelete={(id) => { 
              if(events.length <= 1) return alert('ต้องมีอย่างน้อย 1 กิจกรรมเสมอ');
              if(confirm('การลบกิจกรรมจะลบข้อมูลนักศึกษาที่สมัครในกิจกรรมนี้ทั้งหมด ยืนยันหรือไม่?')) { 
                const newEvents = events.filter(e => e.id !== id);
                setEvents(newEvents); 
                setUsers(prev => prev.filter(u => u.eventId !== id));
                if(selectedEventId === id) setSelectedEventId(newEvents[0].id);
              } 
            }}
          />
        )}
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in">
             <div className="flex justify-between items-center mb-8"><h3 className="font-bold text-2xl text-slate-800">Admin PIN</h3><button onClick={() => setShowLogin(false)} className="p-1 hover:bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-300" /></button></div>
             <form onSubmit={(e) => { e.preventDefault(); if(password==='1234'){ setIsAdmin(true); setShowLogin(false); setPassword(''); } else alert('PIN ไม่ถูกต้อง'); }} className="space-y-6">
               <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus className="w-full p-4 bg-slate-50 rounded-2xl text-center font-mono text-2xl outline-none ring-4 ring-slate-100 focus:ring-violet-100" placeholder="****" />
               <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-violet-100">Unlock System</button>
             </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">
        Developed by Codelex.PHR &middot; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;