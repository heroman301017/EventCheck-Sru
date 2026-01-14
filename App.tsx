
import React, { useState, useMemo, useEffect } from 'react';
import { User, Stats, Event, SystemSettings } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, normalizePhone, formatThaiDate } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { 
  QrCode, Lock, Unlock, RefreshCw, 
  Calendar, MapPin, Settings, Loader2, ChevronRight,
  UserPlus, Scan, Home as HomeIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistrationForm } from './components/RegistrationForm';
import { EventPass } from './components/EventPass';
import { EventManager } from './components/EventManager';
import { EventShowcase } from './components/EventShowcase';
import { ConfirmationModal } from './components/ConfirmationModal';

// *** ตรวจสอบ URL ของคุณให้ถูกต้อง ***
const API_URL = "https://script.google.com/macros/s/AKfycbwF9XyGTppkSk_kcJ3PmbZlIjIUgxa6lMuMxvo3R97nB1hvPwQKjFj0R6GYeA6LxA/exec";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'scan' | 'register' | 'events'>('home');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    isRegistrationOpen: true,
    isScanningOpen: true,
    allowPublicDashboard: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasRouted, setHasRouted] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventForRegistration, setEventForRegistration] = useState<Event | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      
      // Merge logic could be implemented here to prevent overwriting local unsaved changes
      // For now, we trust the initial load
      if (users.length === 0) {
         setUsers(data.users || []);
      } else {
         // Optional: Update only if needed, or provide a manual refresh button
         // setUsers(data.users || []); 
      }
      
      if (events.length === 0) setEvents(data.events || []);
      setSystemSettings(data.settings || systemSettings);
      
      if (data.events?.length > 0 && !selectedEventId) {
        setSelectedEventId(data.events[0].id);
      }

      if (!hasRouted) {
        if (data.settings?.isScanningOpen) setActiveTab('scan');
        else if (data.settings?.isRegistrationOpen) setActiveTab('register');
        setHasRouted(true);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      // Fallback: If fetch fails, ensure app can still open with initial/cached data
      if (users.length === 0) setUsers(INITIAL_USERS);
      if (events.length === 0) setEvents(INITIAL_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentEventUsers = useMemo(() => users.filter(u => String(u.eventId) === String(selectedEventId)), [users, selectedEventId]);

  const postAction = async (payload: any) => {
    try {
      // Fire and forget strategy to prevent stale data from overwriting optimistic UI updates
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error("Post Action Error:", error);
      // Don't re-throw, as this often fails due to CORS but the request might have succeeded or is pending
      return false; 
    }
  };

  const handleCheckIn = async (scannedValue: string) => {
    const value = String(scannedValue).trim();
    if (!value) throw new Error("Invalid input");

    const cleanValue = normalizePhone(value);

    // Robust matching logic: Match Student ID OR Phone, but ignore empty DB records
    const user = currentEventUsers.find(u => {
       const uPhone = String(u.phone || '').trim();
       const uStudentId = String(u.studentId || '').trim();

       // 1. Check Student ID (Exact match, ignore if DB has empty ID)
       const isIdMatch = uStudentId !== '' && uStudentId === value;

       // 2. Check Phone (Exact or Normalized, ignore if DB has empty Phone)
       const isPhoneMatch = uPhone !== '' && (uPhone === value || normalizePhone(uPhone) === cleanValue);

       return isIdMatch || isPhoneMatch;
    });
    
    if (!user) {
      console.warn("User not found for scanned value:", scannedValue);
      throw new Error("User not found");
    }

    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Determine new status based on CURRENT state
    let newStatus: 'checked-in' | 'checked-out' = 'checked-in';
    if (user.status === 'checked-in') {
      newStatus = 'checked-out';
    }
    
    // Optimistic UI Update
    setUsers(prev => prev.map(u => {
      // Use ID for precise matching if available
      if (u.id === user.id) {
         let checkInTime = u.checkInTime;
         let checkOutTime = u.checkOutTime;

         if (newStatus === 'checked-in') {
            // Case: Check-In (or Re-Check-In)
            checkInTime = now;
            // Clear check-out time if re-entering
            checkOutTime = undefined; 
         } else {
            // Case: Check-Out
            // Preserve existing checkInTime, only update checkOutTime
            checkOutTime = now;
         }

         return {
           ...u,
           status: newStatus,
           checkInTime,
           checkOutTime
         };
      }
      return u;
    }));

    // Send to Google Sheets
    // IMPORTANT: Send both studentId AND phone to ensure accurate matching on the server
    // If fields are empty, send unique placeholder to prevent "empty matches empty" logic on backend
    await postAction({
      action: "checkIn",
      studentId: user.studentId ? String(user.studentId).trim() : `__NULL_ID_${Date.now()}__`,
      phone: user.phone ? String(user.phone).trim() : `__NULL_PHONE_${Date.now()}__`, 
      eventId: String(selectedEventId).trim(),
      status: newStatus,
      time: now
    });
  };

  const handleRegister = async (userData: Partial<User>) => {
    const targetEventId = eventForRegistration?.id || selectedEventId;
    if (!targetEventId) return;

    const newUser: User = {
      id: Date.now(),
      studentId: String(userData.studentId || '').trim(),
      name: userData.name || '',
      phone: normalizePhone(userData.phone || ''),
      faculty: userData.faculty || '-',
      major: userData.major || '-',
      eventId: String(targetEventId),
      status: 'pending'
    };
    
    setUsers(prev => [...prev, newUser]);
    setRegisteredUser(newUser);
    await postAction({ action: "register", user: newUser });
  };

  const handleUpdateUser = async (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    await postAction({ action: "updateUser", user });
  };

  const handleDeleteUser = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'ลบรายชื่อ?',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อผู้เข้าร่วมคนนี้ออกจากระบบ?',
      variant: 'danger',
      onConfirm: async () => {
        setUsers(prev => prev.filter(u => u.id !== id));
        await postAction({ action: "deleteUser", id });
      }
    });
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
        <p className="font-bold text-slate-400 animate-pulse text-lg">กำลังซิงค์ข้อมูลกับคลาวด์...</p>
      </div>
    );
  }

  const currentEvent = events.find(e => String(e.id) === String(selectedEventId)) || events[0] || INITIAL_EVENTS[0];
  const stats: Stats = {
    total: currentEventUsers.length,
    present: currentEventUsers.filter(u => u.status === 'checked-in').length,
    returned: currentEventUsers.filter(u => u.status === 'checked-out').length,
    checkedIn: currentEventUsers.filter(u => u.status !== 'pending').length,
    pending: currentEventUsers.filter(u => u.status === 'pending').length,
    percentage: currentEventUsers.length > 0 ? (currentEventUsers.filter(u => u.status !== 'pending').length / currentEventUsers.length) * 100 : 0
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-hidden">
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-violet-100 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-md"><QrCode className="w-6 h-6 text-white" /></div>
            <h1 className="text-xl font-bold text-slate-700 hidden sm:block">Event<span className="text-violet-500">Check</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('home')} className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>
                <HomeIcon className="w-5 h-5" />
              </button>
              {(systemSettings.isRegistrationOpen || isAdmin) && (
                <button onClick={() => { setActiveTab('register'); setEventForRegistration(null); setRegisteredUser(null); }} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'register' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สมัคร</button>
              )}
              {(systemSettings.isScanningOpen || isAdmin) && (
                <button onClick={() => setActiveTab('scan')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'scan' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สแกน</button>
              )}
              {(systemSettings.allowPublicDashboard || isAdmin) && (
                <button onClick={() => setActiveTab('overview')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              )}
              {isAdmin && <button onClick={() => setActiveTab('events')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>จัดการ</button>}
            </nav>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {activeTab !== 'events' && activeTab !== 'register' && activeTab !== 'home' && events.length > 0 && (
        <div className="bg-violet-600 text-white py-2 shadow-inner">
           <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Event:</span>
              {events.map(e => (
                <button key={e.id} onClick={() => setSelectedEventId(e.id)} className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${selectedEventId === e.id ? 'bg-white text-violet-600' : 'bg-violet-400/50 text-violet-100'}`}>{e.name}</button>
              ))}
           </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-y-auto">
        {activeTab === 'home' && (
          <div className="h-full flex flex-col items-center justify-center space-y-12 py-10 animate-in fade-in zoom-in duration-500">
             <div className="text-center space-y-4 max-w-md">
                <div className="inline-block p-4 bg-violet-100 text-violet-600 rounded-[2rem] mb-2">
                   <QrCode className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">ยินดีต้อนรับ</h2>
                <p className="text-slate-500 font-medium">ระบบลงทะเบียนและเช็คอินอัจฉริยะ เลือกรายการที่คุณต้องการดำเนินการ</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                <button onClick={() => setActiveTab('register')} className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                  <div className="relative z-10">
                    <div className="bg-violet-500 text-white p-4 rounded-2xl w-fit mb-6 shadow-lg shadow-violet-100"><UserPlus className="w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">ลงทะเบียน</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">สมัครเข้าร่วมกิจกรรมใหม่และรับบัตร QR Pass สำหรับเข้างานล่วงหน้า</p>
                    <div className="flex items-center text-violet-500 font-bold text-sm">ไปที่หน้าลงทะเบียน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                  </div>
                </button>

                <button onClick={() => setActiveTab('scan')} className="group relative bg-slate-800 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                  <div className="relative z-10">
                    <div className="bg-white text-slate-800 p-4 rounded-2xl w-fit mb-6 shadow-lg"><Scan className="w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-white mb-2">เช็คอินเข้างาน</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">สำหรับผู้ที่มีรหัสนักศึกษาหรือเบอร์โทรศัพท์ที่ลงทะเบียนแล้ว เพื่อบันทึกเวลา</p>
                    <div className="flex items-center text-white font-bold text-sm">เปิดกล้องสแกน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                  </div>
                </button>
             </div>
          </div>
        )}

        {activeTab === 'scan' && (
           <div className="space-y-6">
              <div className="flex justify-start max-w-2xl mx-auto w-full">
                <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all"><ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก</button>
              </div>
              <Scanner users={currentEventUsers} onScan={handleCheckIn} pauseFocus={showLogin || confirmState.isOpen} />
           </div>
        )}

        {activeTab === 'register' && (
          <div className="w-full max-w-4xl mx-auto">
            {!eventForRegistration && !registeredUser && <EventShowcase events={events} onSelect={setEventForRegistration} />}
            {eventForRegistration && !registeredUser && <RegistrationForm eventName={eventForRegistration.name} onRegister={handleRegister} />}
            {registeredUser && <EventPass user={registeredUser} event={eventForRegistration || currentEvent} onBack={() => { setRegisteredUser(null); setEventForRegistration(null); }} />}
          </div>
        )}

        {activeTab === 'overview' && (
           <div className="space-y-8 pb-10">
              <div className="flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{currentEvent.name}</h2>
                    <p className="text-slate-500 text-sm">{currentEvent.location} &bull; {formatThaiDate(currentEvent.date)}</p>
                 </div>
                 {isAdmin && (
                   <button onClick={fetchData} className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-violet-500 transition-colors">
                      <RefreshCw className="w-5 h-5" />
                   </button>
                 )}
              </div>
              <Dashboard stats={stats} />
              <UserList 
                 users={currentEventUsers} 
                 isEditable={isAdmin} 
                 onAddUser={(name, phone) => handleRegister({name, phone})} 
                 onUpdateUser={handleUpdateUser} 
                 onDeleteUser={handleDeleteUser} 
                 onImportUsers={()=>{}} onExportCSV={()=>{}} onExportPDF={()=>{}} 
              />
           </div>
        )}
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl">
             <div className="text-center mb-6"><Lock className="w-12 h-12 text-violet-500 mx-auto mb-2" /><h3 className="text-xl font-bold text-slate-800">Admin Login</h3></div>
             <form onSubmit={(e) => { e.preventDefault(); if(password==='1234'){ setIsAdmin(true); setShowLogin(false); setPassword(''); } else alert('PIN ไม่ถูกต้อง'); }} className="space-y-4">
               <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus className="w-full p-4 bg-slate-50 rounded-2xl text-center font-mono text-2xl outline-none focus:ring-4 focus:ring-violet-100" placeholder="****" />
               <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold">Unlock Admin</button>
               <button type="button" onClick={()=>setShowLogin(false)} className="w-full text-slate-400 text-sm font-medium">ยกเลิก</button>
             </form>
          </div>
        </div>
      )}

      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({...p, isOpen: false}))} />
    </div>
  );
};

export default App;
