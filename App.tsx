
import React, { useState, useMemo, useEffect } from 'react';
import { User, Stats, Event, SystemSettings } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, normalizePhone, formatThaiDate } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { MapDashboard } from './components/MapDashboard';
import { ReportDashboard } from './components/ReportDashboard';
import { 
  QrCode, Lock, Unlock, RefreshCw, 
  Calendar, MapPin, Settings, Loader2, ChevronRight,
  UserPlus, Scan, Home as HomeIcon, Users, LayoutDashboard, Save, Type, Map as MapIcon,
  FileText, Power, EyeOff, Menu
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistrationForm } from './components/RegistrationForm';
import { EventPass } from './components/EventPass';
import { EventManager } from './components/EventManager';
import { EventShowcase } from './components/EventShowcase';
import { ConfirmationModal } from './components/ConfirmationModal';

// *** ตรวจสอบ URL ของคุณให้ถูกต้อง ***
const API_URL = "https://script.google.com/macros/s/AKfycbySVo23szeqz9l9tOV4ZAy1uiTv9M_HDNh8crsrjV07paiMcwU7BXlULcJQ3PH5JA/exec";
const TARGET_SPREADSHEET_ID = "1nZlbcEAsehvi_fIehXASjgiLiplqB9nOxAWTD2KbmG8";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'register' | 'events' | 'report'>('home');
  const [manageSubTab, setManageSubTab] = useState<'events' | 'users' | 'map'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    isRegistrationOpen: true,
    isScanningOpen: true,
    allowPublicDashboard: true,
    ownerCredit: 'Developed by EventCheck System'
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
      const response = await fetch(`${API_URL}?action=getUsers&t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      
      const normalizedUsers = (data.users || []).map((u: any) => {
        const rawLocation = u['Location'] || u['location'] || u['Users.Location'] || u['gps'] || u['GPS'];
        return {
          ...u,
          id: u.id || Date.now() + Math.random(),
          studentId: u.studentId ? String(u.studentId) : '',
          name: u.name ? String(u.name) : '-',
          phone: u.phone ? String(u.phone) : '',
          location: rawLocation ? String(rawLocation) : undefined,
          device: u.device || undefined
        };
      });
      setUsers(normalizedUsers);
      
      if (events.length === 0 || data.events?.length > 0) {
         const loadedEvents = (data.events || []).map((e: any) => ({
             ...e,
             isActive: e.isActive === false || e.isActive === 'FALSE' || e.isActive === 'false' ? false : true
         }));
         setEvents(loadedEvents);
         
         if (!selectedEventId && loadedEvents.length > 0) {
             const firstActive = loadedEvents.find((e: Event) => e.isActive);
             setSelectedEventId(firstActive ? firstActive.id : loadedEvents[0].id);
         }
      }

      setSystemSettings(prev => ({ ...prev, ...data.settings }));

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

  useEffect(() => {
    if (!isAdmin && events.length > 0 && selectedEventId) {
        const current = events.find(e => e.id === selectedEventId);
        if (current && !current.isActive) {
            const firstActive = events.find(e => e.isActive);
            if (firstActive) {
                setSelectedEventId(firstActive.id);
            }
        }
    }
  }, [isAdmin, events, selectedEventId]);

  const currentEventUsers = useMemo(() => users.filter(u => String(u.eventId) === String(selectedEventId)), [users, selectedEventId]);

  const postAction = async (payload: any) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error("Post Action Error:", error);
      return false; 
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    await postAction({ action: "updateSettings", settings: newSettings });
  };

  const handleCheckIn = async (scannedValue: string, meta?: { location: string; device: string }) => {
    const value = String(scannedValue).trim();
    if (!value) throw new Error("Invalid input");

    const cleanValue = normalizePhone(value);
    
    const lastScanTime = recentScans[value] || recentScans[cleanValue];
    if (lastScanTime) {
      const timeDiff = Date.now() - lastScanTime;
      const cooldown = 5 * 60 * 1000; 
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

    if (user.status === 'checked-out') {
      throw new Error("ALREADY_CHECKED_OUT");
    }

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
           checkOutTime,
           location: meta?.location || u.location,
           device: meta?.device || u.device
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
      time: now,
      location: meta?.location || '-',
      device: meta?.device || '-'
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
    const rowData = [event.id, event.name, event.date, event.location, event.description || '-', event.isActive];
    await postAction({ 
      action: "createEvent", 
      spreadsheetId: TARGET_SPREADSHEET_ID, sheetName: "Events", sheet: "Events",
      id: event.id, name: event.name, date: event.date, location: event.location, description: event.description || '-', isActive: event.isActive,
      event: event, data: rowData, values: rowData, row: rowData
    });
  };

  const handleUpdateEvent = async (event: Event) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    const rowData = [event.id, event.name, event.date, event.location, event.description || '-', event.isActive];
    await postAction({ 
      action: "updateEvent", 
      spreadsheetId: TARGET_SPREADSHEET_ID, sheetName: "Events", sheet: "Events",
      id: event.id, name: event.name, date: event.date, location: event.location, description: event.description || '-', isActive: event.isActive,
      event: event, data: rowData, values: rowData, row: rowData
    });
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
           const remaining = events.filter(e => e.id !== id);
           const nextActive = remaining.find(e => e.isActive) || remaining[0];
           if (nextActive) setSelectedEventId(nextActive.id);
        }
        await postAction({ action: "deleteEvent", id: id, spreadsheetId: TARGET_SPREADSHEET_ID, sheetName: "Events", sheet: "Events" });
      }
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
    setPrefillRegistration(null);
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

  const visibleEvents = isAdmin ? events : events.filter(e => e.isActive);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-hidden">
      {/* Header - Responsive */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-violet-100 shrink-0 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
            <div className="bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-md">
                <QrCode className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            {/* Hide text on small mobile to save space for nav */}
            <h1 className="text-lg md:text-xl font-bold text-slate-700 hidden xs:block">Event<span className="text-violet-500">Check</span></h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar ml-2">
            <nav className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
              <button onClick={() => setActiveTab('home')} className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>
                <HomeIcon className="w-5 h-5" />
              </button>
              {(systemSettings.isRegistrationOpen || isAdmin) && (
                <button onClick={() => { setActiveTab('register'); setEventForRegistration(null); setRegisteredUser(null); }} className={`px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'register' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สมัคร</button>
              )}
              {(systemSettings.isScanningOpen || isAdmin) && (
                <button onClick={() => setActiveTab('scan')} className={`px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'scan' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>สแกน</button>
              )}
              {(systemSettings.allowPublicDashboard || isAdmin) && (
                <button onClick={() => setActiveTab('report')} className={`px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'report' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>รายงาน</button>
              )}
              {isAdmin && <button onClick={() => setActiveTab('events')} className={`px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>จัดการ</button>}
            </nav>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`p-2 rounded-full transition-all shrink-0 ${isAdmin ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Event Selector - Responsive Scroll */}
      {activeTab !== 'home' && activeTab !== 'register' && events.length > 0 && (
        <div className="bg-violet-600 text-white py-2 shadow-inner print:hidden">
           <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 shrink-0">Event:</span>
              {visibleEvents.map(e => (
                <button 
                    key={e.id} 
                    onClick={() => setSelectedEventId(e.id)} 
                    className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        selectedEventId === e.id 
                            ? 'bg-white text-violet-600 shadow-sm' 
                            : !e.isActive
                                ? 'bg-slate-900/40 text-slate-300 border border-slate-500/30 hover:bg-slate-900/60' 
                                : 'bg-violet-400/50 text-violet-100 hover:bg-violet-400'
                    }`}
                >
                  {!e.isActive && <EyeOff className="w-3 h-3" />}
                  {e.name}
                </button>
              ))}
              {visibleEvents.length === 0 && <span className="text-xs opacity-50 italic">ไม่มีกิจกรรมที่เปิดใช้งาน</span>}
           </div>
        </div>
      )}

      {/* Main Content - Responsive Padding */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 overflow-y-auto pb-24 print:overflow-visible print:p-0 print:h-auto print:w-full print:max-w-none">
        {activeTab === 'home' && (
          <div className="h-full flex flex-col items-center justify-center space-y-8 md:space-y-12 py-6 animate-in fade-in zoom-in duration-500">
             <div className="text-center space-y-4 max-w-md px-4">
                <div className="inline-block p-4 bg-violet-100 text-violet-600 rounded-[2rem] mb-2 shadow-sm">
                   <QrCode className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">ยินดีต้อนรับ</h2>
                <p className="text-slate-500 font-medium text-sm md:text-base">ระบบลงทะเบียนและเช็คอินอัจฉริยะ เลือกรายการที่คุณต้องการดำเนินการ</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl px-2 md:px-4">
                {systemSettings.isRegistrationOpen && (
                  <button onClick={() => { setActiveTab('register'); setPrefillRegistration(null); }} className="group relative bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                    <div className="relative z-10">
                      <div className="bg-violet-500 text-white p-3 md:p-4 rounded-2xl w-fit mb-4 md:mb-6 shadow-lg shadow-violet-100"><UserPlus className="w-6 h-6 md:w-8 md:h-8" /></div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">ลงทะเบียน</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-4">สมัครเข้าร่วมกิจกรรมใหม่และรับบัตร QR Pass สำหรับเข้างานล่วงหน้า</p>
                      <div className="flex items-center text-violet-500 font-bold text-sm">ไปที่หน้าลงทะเบียน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                    </div>
                  </button>
                )}

                {systemSettings.isScanningOpen && (
                  <button onClick={() => setActiveTab('scan')} className="group relative bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                    <div className="relative z-10">
                      <div className="bg-white text-slate-800 p-3 md:p-4 rounded-2xl w-fit mb-4 md:mb-6 shadow-lg"><Scan className="w-6 h-6 md:w-8 md:h-8" /></div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">เช็คอินเข้างาน</h3>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">สำหรับผู้ที่มีรหัสนักศึกษาหรือเบอร์โทรศัพท์ที่ลงทะเบียนแล้ว เพื่อบันทึกเวลา</p>
                      <div className="flex items-center text-white font-bold text-sm">เปิดกล้องสแกน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                    </div>
                  </button>
                )}
             </div>
             
             {!systemSettings.isRegistrationOpen && !systemSettings.isScanningOpen && (
               <div className="text-center p-8 bg-slate-100 rounded-3xl max-w-md mx-auto">
                 <Power className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-slate-600">ระบบปิดให้บริการชั่วคราว</h3>
                 <p className="text-slate-400 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
               </div>
             )}
          </div>
        )}

        {activeTab === 'scan' && (
           <div className="space-y-6 md:space-y-8 pb-10">
              <div className="flex justify-start max-w-2xl mx-auto w-full px-2">
                <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all"><ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก</button>
              </div>
              
              <Scanner 
                users={currentEventUsers} 
                onScan={handleCheckIn} 
                pauseFocus={showLogin || confirmState.isOpen}
                onRegisterRedirect={handleScanRedirect}
              />

              {(systemSettings.allowPublicDashboard || isAdmin) && (
                <div className="w-full max-w-5xl mx-auto pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-3 mb-6 px-2">
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
            {!eventForRegistration && !registeredUser && (
                <EventShowcase 
                    events={events.filter(e => e.isActive)} 
                    onSelect={setEventForRegistration} 
                />
            )}
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

        {activeTab === 'report' && (
          <div className="w-full max-w-5xl mx-auto">
             <div className="mb-6 print:hidden">
                <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all"><ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก</button>
             </div>
             {/* Updated to pass all data */}
             <ReportDashboard users={users} events={events} />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="w-full max-w-5xl mx-auto space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">ระบบจัดการ</h2>
                  <p className="text-slate-500 text-sm">Event Management & Participants</p>
               </div>
               
               <div className="bg-slate-100 p-1 rounded-2xl flex w-full md:w-auto overflow-x-auto">
                  <button onClick={() => setManageSubTab('users')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${manageSubTab === 'users' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Users className="w-4 h-4" /> รายชื่อ
                  </button>
                  <button onClick={() => setManageSubTab('map')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${manageSubTab === 'map' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <MapIcon className="w-4 h-4" /> แผนที่
                  </button>
                  <button onClick={() => setManageSubTab('events')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${manageSubTab === 'events' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Settings className="w-4 h-4" /> ตั้งค่า
                  </button>
               </div>
             </div>

             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {manageSubTab === 'users' && (
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
               )}

               {manageSubTab === 'map' && (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center bg-violet-50 p-4 rounded-2xl border border-violet-100">
                         <span className="text-violet-700 font-bold text-sm">แผนที่การลงทะเบียน: {currentEvent.name}</span>
                         <button onClick={fetchData} className="p-2 bg-white rounded-lg text-violet-500 hover:bg-violet-100 shadow-sm transition-colors">
                            <RefreshCw className="w-4 h-4" />
                         </button>
                      </div>
                      <MapDashboard users={currentEventUsers} />
                  </div>
               )}

               {manageSubTab === 'events' && (
                 <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div onClick={() => handleUpdateSettings({...systemSettings, isRegistrationOpen: !systemSettings.isRegistrationOpen})} className={`p-6 rounded-3xl border cursor-pointer transition-all active:scale-95 ${systemSettings.isRegistrationOpen ? 'bg-violet-500 border-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className={`p-3 rounded-2xl ${systemSettings.isRegistrationOpen ? 'bg-white/20' : 'bg-slate-100'}`}><UserPlus className="w-6 h-6" /></div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${systemSettings.isRegistrationOpen ? 'bg-white/30' : 'bg-slate-200'}`}><div className={`bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${systemSettings.isRegistrationOpen ? 'translate-x-5' : ''}`}></div></div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">ระบบลงทะเบียน</h3>
                            <p className={`text-xs ${systemSettings.isRegistrationOpen ? 'text-violet-100' : 'text-slate-400'}`}>{systemSettings.isRegistrationOpen ? 'เปิดรับลงทะเบียน (Active)' : 'ปิดรับชั่วคราว (Closed)'}</p>
                        </div>
                        <div onClick={() => handleUpdateSettings({...systemSettings, isScanningOpen: !systemSettings.isScanningOpen})} className={`p-6 rounded-3xl border cursor-pointer transition-all active:scale-95 ${systemSettings.isScanningOpen ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className={`p-3 rounded-2xl ${systemSettings.isScanningOpen ? 'bg-white/20' : 'bg-slate-100'}`}><Scan className="w-6 h-6" /></div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${systemSettings.isScanningOpen ? 'bg-white/30' : 'bg-slate-200'}`}><div className={`bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${systemSettings.isScanningOpen ? 'translate-x-5' : ''}`}></div></div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">ระบบสแกนเข้างาน</h3>
                            <p className={`text-xs ${systemSettings.isScanningOpen ? 'text-emerald-100' : 'text-slate-400'}`}>{systemSettings.isScanningOpen ? 'เปิดรับสแกน (Active)' : 'ปิดการสแกน (Closed)'}</p>
                        </div>
                        <div onClick={() => handleUpdateSettings({...systemSettings, allowPublicDashboard: !systemSettings.allowPublicDashboard})} className={`p-6 rounded-3xl border cursor-pointer transition-all active:scale-95 ${systemSettings.allowPublicDashboard ? 'bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className={`p-3 rounded-2xl ${systemSettings.allowPublicDashboard ? 'bg-white/20' : 'bg-slate-100'}`}><LayoutDashboard className="w-6 h-6" /></div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${systemSettings.allowPublicDashboard ? 'bg-white/30' : 'bg-slate-200'}`}><div className={`bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${systemSettings.allowPublicDashboard ? 'translate-x-5' : ''}`}></div></div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">แดชบอร์ดสาธารณะ</h3>
                            <p className={`text-xs ${systemSettings.allowPublicDashboard ? 'text-blue-100' : 'text-slate-400'}`}>{systemSettings.allowPublicDashboard ? 'แสดงผล (Visible)' : 'ซ่อน (Hidden)'}</p>
                        </div>
                   </div>

                   <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-400" /> ตั้งค่าระบบทั่วไป
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full">
                          <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> ข้อความเจ้าของระบบ (Footer Credit)</label>
                          <input type="text" value={systemSettings.ownerCredit || ''} onChange={(e) => setSystemSettings(prev => ({...prev, ownerCredit: e.target.value}))} placeholder="เช่น Developed by IT Team" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-0 focus:ring-4 focus:ring-violet-100 outline-none" />
                        </div>
                        <button onClick={() => handleUpdateSettings(systemSettings)} className="w-full md:w-auto px-6 py-3 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors whitespace-nowrap"><Save className="w-4 h-4" /> บันทึก</button>
                      </div>
                   </div>

                   <EventManager events={events} onCreate={handleCreateEvent} onUpdate={handleUpdateEvent} onDelete={handleDeleteEvent} />
                 </div>
               )}
             </div>
          </div>
        )}
      </main>

      <footer className="bg-white py-4 border-t border-slate-100 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-xs text-slate-400 font-medium">{systemSettings.ownerCredit || 'Developed by EventCheck System'}</p>
        </div>
      </footer>

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in-95">
             <div className="text-center mb-6"><Lock className="w-12 h-12 text-violet-500 mx-auto mb-2" /><h3 className="text-xl font-bold text-slate-800">Admin Login</h3></div>
             <form onSubmit={(e) => { e.preventDefault(); if(password==='9999'){ setIsAdmin(true); setShowLogin(false); setPassword(''); } else alert('PIN ไม่ถูกต้อง'); }} className="space-y-4">
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
