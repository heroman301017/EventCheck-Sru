import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Stats } from './types';
import { INITIAL_USERS, normalizePhone } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { LayoutDashboard, ScanLine, QrCode, Lock, Unlock, RefreshCw, Trash2, ShieldCheck, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scan'>('scan');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  
  // Admin & Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const loginInputRef = useRef<HTMLInputElement>(null);

  // Auto focus on login input when modal opens
  useEffect(() => {
    if (showLogin) {
      setTimeout(() => {
        loginInputRef.current?.focus();
      }, 50);
    }
  }, [showLogin]);

  // Calculate Statistics
  const stats: Stats = useMemo(() => {
    const total = users.length;
    const present = users.filter(u => u.status === 'checked-in').length;
    const returned = users.filter(u => u.status === 'checked-out').length;
    const checkedIn = present + returned; // Total who have arrived at some point
    const pending = total - checkedIn;
    const percentage = total > 0 ? (checkedIn / total) * 100 : 0;
    return { total, checkedIn, present, returned, pending, percentage };
  }, [users]);

  // Handle Scan Logic (Toggle Check-in / Check-out)
  const handleCheckIn = (scannedValue: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.phone === scannedValue) {
          const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          if (user.status === 'pending') {
            return {
              ...user,
              status: 'checked-in',
              checkInTime: now
            };
          } else if (user.status === 'checked-in') {
            return {
              ...user,
              status: 'checked-out',
              checkOutTime: now
            };
          }
        }
        return user;
      })
    );
  };

  // Helper: Export CSV
  const exportCSV = () => {
    const bom = "\uFEFF"; 
    const headers = "ลำดับ,ชื่อ-สกุล,เบอร์โทรศัพท์,สถานะ,เวลาเข้า,เวลาออก\n";
    const rows = users.map(u => {
      let statusText = 'ยังไม่มา';
      if (u.status === 'checked-in') statusText = 'อยู่ในงาน';
      if (u.status === 'checked-out') statusText = 'กลับแล้ว';
      
      return `${u.id},"${u.name}",'${u.phone},${statusText},${u.checkInTime || '-'},${u.checkOutTime || '-'}`;
    }).join("\n");
    
    const blob = new Blob([bom + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EventCheck_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Export PDF
  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Load Thai Font (THSarabunNew)
      const fontUrl = 'https://cdn.jsdelivr.net/gh/nokstatic/public-fonts@master/THSarabunNew/THSarabunNew.ttf';
      const fontName = 'THSarabunNew';
      
      const response = await fetch(fontUrl);
      const buffer = await response.arrayBuffer();
      
      // Convert to base64 string for jsPDF
      const binary = String.fromCharCode(...new Uint8Array(buffer));
      const base64Font = btoa(binary);

      doc.addFileToVFS('THSarabunNew.ttf', base64Font);
      doc.addFont('THSarabunNew.ttf', fontName, 'normal');
      doc.setFont(fontName);

      // Header
      doc.setFontSize(20);
      doc.setTextColor(100, 100, 100);
      doc.text("รายงานการลงทะเบียน (Registration Report)", 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`, 105, 22, { align: 'center' });
      
      // Stats Summary
      doc.setFontSize(12);
      const summary = `ทั้งหมด: ${stats.total} | มาแล้ว: ${stats.checkedIn} (อยู่ในงาน: ${stats.present}, กลับแล้ว: ${stats.returned}) | ยังไม่มา: ${stats.pending}`;
      doc.text(summary, 105, 30, { align: 'center' });

      // Table
      const tableColumn = ["ลำดับ", "ชื่อ-นามสกุล", "เบอร์โทร", "สถานะ", "เวลาเข้า", "เวลาออก"];
      const tableRows = users.map(user => {
        let statusText = 'ยังไม่มา';
        if (user.status === 'checked-in') statusText = 'อยู่ในงาน';
        if (user.status === 'checked-out') statusText = 'กลับแล้ว';
        
        return [
          user.id,
          user.name,
          user.phone,
          statusText,
          user.checkInTime || '-',
          user.checkOutTime || '-'
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { font: fontName, fontSize: 12, cellPadding: 2 },
        headStyles: { fillColor: [139, 92, 246] }, // Violet-500 Header
        alternateRowStyles: { fillColor: [245, 243, 255] }, // Very light violet for alternate rows
        theme: 'grid'
      });

      doc.save(`EventCheck_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("ไม่สามารถสร้างไฟล์ PDF ได้ในขณะนี้ (Error loading fonts)");
    }
  };

  // Session Management
  const handleResetSession = () => {
    if (confirm("คุณต้องการจบการลงทะเบียนรอบนี้ใช่หรือไม่?\nระบบจะดาวน์โหลดรายงานอัตโนมัติ และรีเซ็ตสถานะทุกคนเป็น 'ยังไม่มา'")) {
      exportCSV(); // Auto export CSV
      exportPDF(); // Auto export PDF
      setUsers(prev => prev.map(u => ({ ...u, status: 'pending', checkInTime: undefined, checkOutTime: undefined })));
    }
  };

  const handleClearAll = () => {
    if (confirm("คำเตือน: คุณต้องการลบรายชื่อทั้งหมดออกจากระบบใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้")) {
      setUsers([]);
    }
  };

  // Handle Adding New User
  const handleAddUser = (name: string, phone: string) => {
    const newUser: User = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      phone: normalizePhone(phone),
      status: 'pending'
    };
    setUsers(prev => [...prev, newUser]);
  };

  // Handle Updating Existing User
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  // Handle Bulk Import
  const handleImportUsers = (newUsersData: { name: string; phone: string }[]) => {
    const nextIdStart = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUsers: User[] = newUsersData.map((u, index) => ({
      id: nextIdStart + index,
      name: u.name,
      phone: normalizePhone(u.phone),
      status: 'pending'
    }));
    setUsers(prev => [...prev, ...newUsers]);
  };

  // Handle Admin Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') { // Simple pass for demo
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-violet-100 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-md shadow-violet-200">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-700 tracking-tight hidden sm:block">
              Event<span className="text-violet-500">Check</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <nav className="flex space-x-1 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'scan', icon: ScanLine, label: 'จุดสแกน' },
                { id: 'overview', icon: LayoutDashboard, label: 'ข้อมูล' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${activeTab === tab.id 
                      ? 'bg-white text-violet-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <button 
              onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
              className={`p-2 rounded-full transition-all duration-300 ${isAdmin ? 'bg-amber-100 text-amber-500 ring-2 ring-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-violet-100 hover:text-violet-500'}`}
              title={isAdmin ? "Exit Developer Mode" : "Enter Developer Mode"}
            >
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 overflow-y-auto ${activeTab === 'scan' ? 'flex flex-col justify-center' : ''}`}>
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in pb-20">
            
            {/* Session & Admin Controls - HIDDEN UNLESS ADMIN */}
            {isAdmin && (
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-rose-100 bg-rose-50/50 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4">
                 <div>
                   <h2 className="font-bold text-rose-800 flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5" />
                     Developer Control Panel
                   </h2>
                   <p className="text-sm text-rose-600 mt-1">จัดการรอบการลงทะเบียน ล้างข้อมูล และแก้ไขรายชื่อ</p>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                   <button
                     onClick={handleResetSession}
                     className="flex items-center gap-2 px-4 py-2 bg-white text-violet-600 border border-violet-200 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors shadow-sm"
                   >
                     <RefreshCw className="w-4 h-4" />
                     จบรอบ & เริ่มใหม่
                   </button>
                   
                   <button
                     onClick={handleClearAll}
                     className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors shadow-sm"
                   >
                     <Trash2 className="w-4 h-4" />
                     ล้างข้อมูลทั้งหมด
                   </button>
                 </div>
              </div>
            )}

            {/* Dashboard Section */}
            <section>
               <Dashboard stats={stats} />
            </section>
            
            {/* List Section - Edit/Export Locked via Prop */}
            <section>
               <UserList 
                 users={users} 
                 isEditable={isAdmin}
                 onAddUser={handleAddUser}
                 onUpdateUser={handleUpdateUser}
                 onImportUsers={handleImportUsers}
                 onExportCSV={exportCSV}
                 onExportPDF={exportPDF}
               />
            </section>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in h-full">
            <header className="text-center mb-6 shrink-0">
              <div className="inline-block px-4 py-1 bg-violet-100 text-violet-600 rounded-full text-xs font-semibold mb-2 tracking-wide uppercase">Real-time Check-in</div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">จุดลงทะเบียน</h2>
              <p className="text-slate-500 text-sm md:text-base">
                สแกนครั้งแรก <span className="text-emerald-500 font-bold">เข้างาน</span> / สแกนซ้ำ <span className="text-slate-500 font-bold">กลับบ้าน</span>
              </p>
            </header>
            <div className="w-full flex-1 flex items-center justify-center min-h-0">
               <Scanner users={users} onScan={handleCheckIn} />
            </div>
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full shadow-2xl shadow-violet-200 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Developer Access</h3>
                <button onClick={() => setShowLogin(false)} className="bg-slate-100 p-1 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-500" /></button>
             </div>
             <form onSubmit={handleLogin} className="space-y-4">
               <div>
                 <input 
                   ref={loginInputRef}
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-4 focus:ring-violet-100 focus:border-violet-500 outline-none transition-all"
                   placeholder="Enter PIN"
                   autoComplete="off"
                 />
               </div>
               <button type="submit" className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all active:scale-95">
                 Unlock
               </button>
             </form>
          </div>
        </div>
      )}

      {/* Footer - Minimal on Scan tab */}
      <footer className={`bg-white border-t border-slate-100 py-4 shrink-0 ${activeTab === 'scan' ? 'hidden md:block' : 'mt-auto'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">
          Made with 💜 for Students &middot; &copy; {new Date().getFullYear()} EventCheck
        </div>
      </footer>
    </div>
  );
};

export default App;