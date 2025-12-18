import React, { useState, useMemo, useEffect } from 'react';
import { User, Stats, Event, SystemSettings } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, normalizePhone, formatThaiDate } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { 
  LayoutDashboard, ScanLine, QrCode, Lock, Unlock, RefreshCw, 
  Trash2, ShieldCheck, X, Clock, AlertTriangle, Calendar, 
  MapPin, Settings, Power, Info, RotateCcw, Loader2, ChevronRight,
  UserPlus, Scan, Home as HomeIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistrationForm } from './components/RegistrationForm';
import { EventPass } from './components/EventPass';
import { EventManager } from './components/EventManager';
import { EventShowcase } from './components/EventShowcase';
import { ConfirmationModal } from './components/ConfirmationModal';

// *** สำคัญ: ตรวจสอบ URL ของ Google Apps Script ให้ถูกต้อง ***
const API_URL = "https://script.google.com/macros/s/AKfycbzkyagLeBoBZbzEEe0lsd0G1JpYEJ4QDdc9FijWEps9zMZ6gw7pkkGbQQewgO8BjjA/exec";

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
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?t=${Date.now()}`);
      const data = await response.json();
      
      const fetchedEvents = data.events || [];
      const fetchedSettings = data.settings || {
        isRegistrationOpen: true,
        isScanningOpen: true,
        allowPublicDashboard: true
      };

      setUsers(data.users || []);
      setEvents(fetchedEvents);
      setSystemSettings(fetchedSettings);
      
      if (fetchedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(fetchedEvents[0].id);
      }

      if (!hasRouted) {
        if (fetchedSettings.isScanningOpen) {
          setActiveTab('scan');
        } else if (fetchedSettings.isRegistrationOpen) {
          setActiveTab('register');
        } else {
          setActiveTab('home');
        }
        setHasRouted(true);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const postAction = async (payload: any) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      setTimeout(() => fetchData(), 1000);
    } catch (error) {
      console.error("Post Action Error:", error);
    }
  };

  const handleSaveEvent = async (event: Event) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === event.id);
      if (exists) return prev.map(e => e.id === event.id ? event : e);
      return [...prev, event];
    });
    if (!selectedEventId) setSelectedEventId(event.id);
    await postAction({ action: "saveEvent", event });
  };

  const handleDeleteEvent = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'ลบกิจกรรม?',
      message: 'ยืนยันการลบกิจกรรมนี้? ข้อมูลผู้เข้าร่วมที่เกี่ยวข้องทั้งหมดจะไม่ปรากฏในมุมมองนี้อีก',
      variant: 'danger',
      onConfirm: async () => {
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEventId === id) setSelectedEventId('');
        await postAction({ action: "deleteEvent", id });
      }
    });
  };

  const handleCheckIn = async (scannedValue: string) => {
    if (!systemSettings.isScanningOpen && !isAdmin) return;
    const user = currentEventUsers.find(u => u.phone === scannedValue || u.studentId === scannedValue);
    if (!user) return;

    let newStatus: 'checked-in' | 'checked-out' = 'checked-in';
    if (user.status === 'checked-in') newStatus = 'checked-out';
    if (user.status === 'checked-out') return;

    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    setUsers(prev => prev.map(u => (u.studentId === user.studentId && u.eventId === selectedEventId) ? {
      ...u, 
      status: newStatus, 
      checkInTime: newStatus === 'checked-in' ? now : u.checkInTime,
      checkOutTime: newStatus === 'checked-out' ? now : u.checkOutTime
    } : u));

    await postAction({
      action: "checkIn",
      studentId: user.studentId,
      eventId: selectedEventId,
      status: newStatus,
      time: now
    });
  };

  const handleRegister = async (userData: Partial<User>) => {
    if (!systemSettings.isRegistrationOpen && !isAdmin) return;
    const targetEventId = eventForRegistration?.id || selectedEventId;
    if (!targetEventId) {
      alert('กรุณาเลือกกิจกรรมก่อนลงทะเบียน');
      return;
    }
    const newUser: User = {
      id: Date.now(),
      studentId: userData.studentId || '',
      name: userData.name || '',
      phone: normalizePhone(userData.phone || ''),
      faculty: userData.faculty || '-',
      major: userData.major || '-',
      eventId: targetEventId,
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

  const handleImportUsers = async (newUsers: any[]) => {
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
    
    setUsers(prev => [...prev, ...formatted]);
    await postAction({ action: "importUsers", users: formatted });
  };

  const handleToggleSetting = async (key: keyof SystemSettings) => {
    const newValue = !systemSettings[key];
    setSystemSettings({ ...systemSettings, [key]: newValue });
    await postAction({ action: "updateSettings", key, value: newValue });
  };

  const handleResetRound = () => {
    setConfirmState({
      isOpen: true,
      title: 'จบรอบกิจกรรม?',
      message: 'การจบรอบจะรีเซ็ตสถานะการเช็คอินทั้งหมดในกิจกรรมนี้ให้กลับเป็น "รอ" คุณต้องการดำเนินการต่อหรือไม่?',
      variant: 'warning',
      onConfirm: async () => {
        setUsers(prev => prev.map(u => u.eventId === selectedEventId ? {...u, status:'pending', checkInTime:undefined, checkOutTime:undefined} : u));
        await postAction({ action: "resetRound", eventId: selectedEventId });
      }
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
    link.download = `Report_${currentEvent.name}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const fontUrl = 'https://fonts.gstatic.com/s/sarabun/v13/dtm66pU_S8fS66tI_8B6T6Y.ttf';
      const response = await fetch(fontUrl);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const base64Font = btoa(binary);

      doc.addFileToVFS('Sarabun.ttf', base64Font);
      doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
      doc.setFont('Sarabun');
      
      doc.setFontSize(18);
      doc.text(`รายงาน: ${currentEvent.name}`, 105, 15, { align: 'center' });
      autoTable(doc, {
        head: [["รหัสนักศึกษา", "ชื่อ-นามสกุล", "คณะ", "สถานะ", "เวลาเข้า"]],
        body: currentEventUsers.map(u => [u.studentId, u.name, u.faculty, u.status, u.checkInTime || '-']),
        startY: 30,
        styles: { font: 'Sarabun', fontSize: 10 }
      });
      doc.save(`Report_${currentEvent.name}.pdf`);
    } catch (e) { alert('PDF Error'); }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
        <p className="font-bold text-slate-400 animate-pulse">กำลังเตรียมข้อมูลระบบ...</p>
      </div>
    );
  }

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
                <button 
                  onClick={() => setActiveTab('register')}
                  className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                  <div className="relative z-10">
                    <div className="bg-violet-500 text-white p-4 rounded-2xl w-fit mb-6 shadow-lg shadow-violet-100">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">ลงทะเบียน</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">สมัครเข้าร่วมกิจกรรมใหม่และรับบัตร QR Pass สำหรับเข้างานล่วงหน้า</p>
                    <div className="flex items-center text-violet-500 font-bold text-sm">
                      ไปที่หน้าลงทะเบียน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => setActiveTab('scan')}
                  className="group relative bg-slate-800 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                  <div className="relative z-10">
                    <div className="bg-white text-slate-800 p-4 rounded-2xl w-fit mb-6 shadow-lg">
                      <Scan className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">เช็คอินเข้างาน</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">สำหรับผู้ที่มีรหัสนักศึกษาหรือเบอร์โทรศัพท์ที่ลงทะเบียนแล้ว เพื่อบันทึกเวลา</p>
                    <div className="flex items-center text-white font-bold text-sm">
                      เปิดกล้องสแกน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
             </div>

             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50 pt-10">Event Management System &bull; Version 2.0</p>
          </div>
        )}

        {events.length === 0 && activeTab !== 'events' && activeTab !== 'home' ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Calendar className="w-16 h-16 opacity-20" />
            <p>ยังไม่มีกิจกรรมในระบบ โปรดแจ้งผู้ดูแลระบบ</p>
            {isAdmin && <button onClick={() => setActiveTab('events')} className="bg-violet-500 text-white px-6 py-2 rounded-xl font-bold mt-2">ไปยังเมนูจัดการกิจกรรม</button>}
          </div>
        ) : (
          <>
            {activeTab === 'register' && (
              <div className="w-full max-w-4xl mx-auto">
                {!eventForRegistration && !registeredUser && (
                  <div className="space-y-8">
                    <div className="flex justify-start mb-2">
                       <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all">
                        <ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก
                      </button>
                    </div>
                    <div className="text-center space-y-2">
                       <h2 className="text-3xl font-bold text-slate-800">เลือกกิจกรรมที่น่าสนใจ</h2>
                       <p className="text-slate-500">คลิกที่กิจกรรมเพื่อดูรายละเอียดและลงทะเบียนล่วงหน้า</p>
                    </div>
                    <EventShowcase events={events} onSelect={setEventForRegistration} />
                  </div>
                )}
                
                {eventForRegistration && !registeredUser && (
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="flex justify-start mb-6">
                      <button onClick={() => setEventForRegistration(null)} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all">
                        <ChevronRight className="w-5 h-5 rotate-180" /> ย้อนกลับไปเลือกกิจกรรม
                      </button>
                    </div>
                    <RegistrationForm eventName={eventForRegistration.name} onRegister={handleRegister} />
                  </div>
                )}

                {registeredUser && (
                  <div className="w-full max-w-2xl mx-auto">
                    <EventPass user={registeredUser} event={eventForRegistration || currentEvent} onBack={() => { setRegisteredUser(null); setEventForRegistration(null); }} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scan' && (
              <div className="space-y-6">
                <div className="flex justify-start max-w-2xl mx-auto w-full">
                  <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 text-slate-400 hover:text-violet-500 font-bold transition-all">
                    <ChevronRight className="w-5 h-5 rotate-180" /> กลับหน้าหลัก
                  </button>
                </div>
                <Scanner users={currentEventUsers} onScan={handleCheckIn} pauseFocus={showLogin || confirmState.isOpen} />
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-8 pb-10">
                <div className="flex justify-between items-start">
                   <div>
                    <h2 className="text-2xl font-bold text-slate-800">{currentEvent.name}</h2>
                    <p className="text-slate-500 text-sm">{currentEvent.location} &bull; {formatThaiDate(currentEvent.date)}</p>
                   </div>
                   {isAdmin && <button onClick={handleResetRound} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl" title="Reset Check-in Status"><RefreshCw className="w-5 h-5" /></button>}
                </div>
                <Dashboard stats={stats} />
                <UserList 
                  users={currentEventUsers} 
                  isEditable={isAdmin} 
                  onAddUser={(name, phone) => { handleRegister({ name, phone }); }} 
                  onUpdateUser={handleUpdateUser} 
                  onDeleteUser={handleDeleteUser} 
                  onImportUsers={handleImportUsers} 
                  onExportCSV={exportCSV} 
                  onExportPDF={exportPDF} 
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'events' && isAdmin && (
          <div className="space-y-10">
            <EventManager 
              events={events} 
              onSave={handleSaveEvent} 
              onDelete={handleDeleteEvent} 
            />

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-rose-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-violet-500" />
                System Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {['isRegistrationOpen', 'isScanningOpen', 'allowPublicDashboard'].map((key) => (
                   <div key={key} className="bg-slate-50 p-6 rounded-3xl flex flex-col gap-3">
                      <span className="font-bold text-slate-700 text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <button 
                        onClick={() => handleToggleSetting(key as keyof SystemSettings)}
                        className={`w-full h-12 rounded-2xl p-1 transition-colors flex items-center px-4 justify-between ${systemSettings[key as keyof SystemSettings] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                      >
                        <span className="font-bold">{systemSettings[key as keyof SystemSettings] ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${systemSettings[key as keyof SystemSettings] ? 'translate-x-0' : '-translate-x-0'}`}></div>
                      </button>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl">
             <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-violet-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-slate-800">Admin Login</h3>
                <p className="text-slate-400 text-sm">กรุณาระบุรหัสผ่านเพื่อเข้าถึงระบบจัดการ</p>
             </div>
             <form onSubmit={(e) => { e.preventDefault(); if(password==='1234'){ setIsAdmin(true); setShowLogin(false); setPassword(''); } else alert('PIN ไม่ถูกต้อง'); }} className="space-y-4">
               <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus className="w-full p-4 bg-slate-50 rounded-2xl text-center font-mono text-2xl outline-none focus:ring-4 focus:ring-violet-100" placeholder="****" />
               <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-700 active:scale-95 transition-all">Unlock Admin</button>
               <button type="button" onClick={()=>setShowLogin(false)} className="w-full text-slate-400 text-sm font-medium">ยกเลิก</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;