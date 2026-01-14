
import React, { useState, useMemo, useEffect } from 'react';
import { User, Stats, Event, SystemSettings } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, normalizePhone, formatThaiDate } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { 
  QrCode, Lock, Unlock, RefreshCw, 
  Calendar, MapPin, Settings, Loader2, ChevronRight,
  UserPlus, Scan, Home as HomeIcon, Users, LayoutDashboard
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
  // Removed 'overview' from activeTab type
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'register' | 'events'>('home');
  // New state for Manage sub-tabs
  const [manageSubTab, setManageSubTab] = useState<'events' | 'users'>('users');
  
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
  const [prefillRegistration, setPrefillRegistration] = useState<{studentId: string} | null>(null);

  // Store recent scans: key = studentId/phone, value = timestamp
  const [recentScans, setRecentScans] = useState<Record<string, number>>({});

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
      
      if (users.length === 0) {
         setUsers(data.users || []);
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
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error("Post Action Error:", error);
      return false; 
    }
  };

  const handleCheckIn = async (scannedValue: string) => {
    const value = String(scannedValue).trim();
    if (!value) throw new Error("Invalid input");

    const cleanValue = normalizePhone(value);
    
    // --- 5-Minute Duplicate Scan Prevention ---
    const lastScanTime = recentScans[value] || recentScans[cleanValue];
    if (lastScanTime) {
      const timeDiff = Date.now() - lastScanTime;
      const cooldown = 5 * 60 * 1000; // 5 minutes
      if (timeDiff < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - timeDiff) / 1000);
        throw new Error(`DUPLICATE_SCAN:${remainingSeconds}`);
      }
    }

    const user = currentEventUsers.find(u => {
       const uPhone = String(u.phone || '').trim();
       const uStudentId = String(u.studentId || '').trim();
       const isIdMatch = uStudentId !== '' && uStudentId === value;
       const isPhoneMatch = uPhone !== '' && (uPhone === value || normalizePhone(uPhone) === cleanValue);
       return isIdMatch || isPhoneMatch;
    });
    
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // *** New Logic: Prevent action if already checked-out ***
    if (user.status === 'checked-out') {
      throw new Error("ALREADY_CHECKED_OUT");
    }

    // Update local cooldown
    setRecentScans(prev => ({
      ...prev,
      [value]: Date.now(),
      [cleanValue]: Date.now()
    }));

    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    let newStatus: 'checked-in' | 'checked-out' = 'checked-in';
    if (user.status === 'checked-in') {
      newStatus = 'checked-out';
    }
    
    setUsers(prev => prev.map(u => {
      if (u.id === user.id) {
         let checkInTime = u.checkInTime;
         let checkOutTime = u.checkOutTime;

         if (newStatus === 'checked-in') {
            checkInTime = now;
            checkOutTime = undefined; 
         } else {
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

    await postAction({
      action: "checkIn",
      studentId: user.studentId ? String(user.studentId).trim() : `__NULL_ID_${Date.now()}__`,
      phone: user.phone ? String(user.phone).trim() : `__NULL_PHONE_${Date.now()}__`, 
      eventId: String(selectedEventId).trim(),
      status: newStatus,
      time: now
    });
  };

  const handleScanRedirect = (scannedValue: string) => {
    setPrefillRegistration({ studentId: scannedValue });
    setActiveTab('register');
    setEventForRegistration(events.find(e => e.id === selectedEventId) || null);
  };

  // --- Event CRUD Operations ---

  const handleCreateEvent = async (event: Event) => {
    setEvents(prev => [...prev, event]);
    setSelectedEventId(event.id);
    await postAction({ action: "createEvent", event });
  };

  const handleUpdateEvent = async (event: Event) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    await postAction({ action: "updateEvent", event });
  };

  const handleDeleteEvent = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'ลบกิจกรรม?',
      message: 'การลบกิจกรรมจะทำให้ข้อมูลสถิติหายไป แต่รายชื่อผู้ใช้ยังคงอยู่ ยืนยันที่จะลบหรือไม่?',
      variant: 'danger',
      onConfirm: async () => {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEventId === id && events.length > 0) {
          setSelectedEventId(events[0].id);
        }
        await postAction({ action: "deleteEvent", id });
      }
    });
  };

  // --- User Operations ---

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
    setPrefillRegistration(null); // Clear prefill
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
              {/* Removed Standalone Dashboard Button */}
              {isAdmin && <button onClick={() => setActiveTab('events')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>จัดการ</button>}
            </nav>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Show Event Selector only if NOT on Home */}
      {activeTab !== 'home' && activeTab !== 'register' && events.length > 0 && (
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
                <button onClick={() => { setActiveTab('register'); setPrefillRegistration(null); }} className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden">
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
           <div className="space-y-8 pb-10">
              <div className="flex justify-start max-w-2xl mx-auto w-full">
                <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all"><ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก</button>
              </div>
              
              {/* Scanner Section */}
              <Scanner 
                users={currentEventUsers} 
                onScan={handleCheckIn} 
                pauseFocus={showLogin || confirmState.isOpen}
                onRegisterRedirect={handleScanRedirect}
              />

              {/* Dashboard Section Moved Here */}
              {(systemSettings.allowPublicDashboard || isAdmin) && (
                <div className="w-full max-w-5xl mx-auto pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-violet-100 text-violet-500 rounded-xl">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-bold text-slate-700">ภาพรวมสถิติ</h2>
                       <p className="text-sm text-slate-400">ข้อมูลการเข้าร่วมงานแบบ Real-time</p>
                    </div>
                  </div>
                  <Dashboard stats={stats} />
                </div>
              )}
           </div>
        )}

        {activeTab === 'register' && (
          <div className="w-full max-w-4xl mx-auto">
            {!eventForRegistration && !registeredUser && <EventShowcase events={events} onSelect={setEventForRegistration} />}
            {eventForRegistration && !registeredUser && (
               <RegistrationForm 
                  eventName={eventForRegistration.name} 
                  onRegister={handleRegister} 
                  initialData={prefillRegistration}
               />
            )}
            {registeredUser && <EventPass user={registeredUser} event={eventForRegistration || currentEvent} onBack={() => { setRegisteredUser(null); setEventForRegistration(null); setPrefillRegistration(null); }} />}
          </div>
        )}

        {/* Manage Section (Events & User Table) */}
        {activeTab === 'events' && (
          <div className="w-full max-w-5xl mx-auto space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">ระบบจัดการ</h2>
                  <p className="text-slate-500 text-sm">Event Management & Participants</p>
               </div>
               
               {/* Sub-tab Toggle */}
               <div className="bg-slate-100 p-1 rounded-2xl flex">
                  <button 
                    onClick={() => setManageSubTab('users')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${manageSubTab === 'users' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Users className="w-4 h-4" /> รายชื่อผู้เข้าร่วม
                  </button>
                  <button 
                    onClick={() => setManageSubTab('events')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${manageSubTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Settings className="w-4 h-4" /> ตั้งค่ากิจกรรม
                  </button>
               </div>
             </div>

             {/* Content based on sub-tab */}
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {manageSubTab === 'users' ? (
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-violet-50 p-4 rounded-2xl border border-violet-100">
                       <span className="text-violet-700 font-bold text-sm">ข้อมูลสำหรับกิจกรรม: {currentEvent.name}</span>
                       <button onClick={fetchData} className="p-2 bg-white rounded-lg text-violet-500 hover:bg-violet-100 shadow-sm transition-colors">
                          <RefreshCw className="w-4 h-4" />
                       </button>
                    </div>
                    <UserList 
                      users={currentEventUsers} 
                      isEditable={isAdmin} 
                      onAddUser={(name, phone) => handleRegister({name, phone})} 
                      onUpdateUser={handleUpdateUser} 
                      onDeleteUser={handleDeleteUser} 
                      onImportUsers={()=>{}} onExportCSV={()=>{}} onExportPDF={()=>{}} 
                    />
                 </div>
               ) : (
                 <EventManager 
                    events={events} 
                    onCreate={handleCreateEvent}
                    onUpdate={handleUpdateEvent}
                    onDelete={handleDeleteEvent}
                 />
               )}
             </div>
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
