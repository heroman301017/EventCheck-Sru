import React, { useState, useMemo } from 'react';
import { User, Stats } from './types';
import { INITIAL_USERS, normalizePhone } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { LayoutDashboard, ScanLine, QrCode, Lock, Unlock, RefreshCw, Trash2, ShieldCheck, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scan'>('scan');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  
  // Admin & Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');

  // Calculate Statistics
  const stats: Stats = useMemo(() => {
    const total = users.length;
    const checkedIn = users.filter(u => u.status === 'checked-in').length;
    const pending = total - checkedIn;
    const percentage = total > 0 ? (checkedIn / total) * 100 : 0;
    return { total, checkedIn, pending, percentage };
  }, [users]);

  // Handle Scan Logic
  const handleCheckIn = (scannedValue: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.phone === scannedValue && user.status === 'pending') {
          return {
            ...user,
            status: 'checked-in',
            checkInTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        }
        return user;
      })
    );
  };

  // Helper: Export CSV
  const exportCSV = () => {
    const bom = "\uFEFF"; 
    const headers = "ลำดับ,ชื่อ-สกุล,เบอร์โทรศัพท์,สถานะ,เวลาที่ลงทะเบียน\n";
    const rows = users.map(u => 
      `${u.id},"${u.name}",'${u.phone},${u.status === 'checked-in' ? 'มาแล้ว' : 'ยังไม่มา'},${u.checkInTime || '-'}`
    ).join("\n");
    
    const blob = new Blob([bom + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EventCheck_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Session Management
  const handleResetSession = () => {
    if (confirm("คุณต้องการจบการลงทะเบียนรอบนี้ใช่หรือไม่?\nระบบจะดาวน์โหลดรายงานอัตโนมัติ และรีเซ็ตสถานะทุกคนเป็น 'ยังไม่มา'")) {
      exportCSV(); // Auto export
      setUsers(prev => prev.map(u => ({ ...u, status: 'pending', checkInTime: undefined })));
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
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Event<span className="text-blue-600">Check</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
              {[
                { id: 'scan', icon: ScanLine, label: 'จุดสแกน' },
                { id: 'overview', icon: LayoutDashboard, label: 'ข้อมูล' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeTab === tab.id 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button 
              onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
              className={`p-2 rounded-full transition-colors ${isAdmin ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              title={isAdmin ? "Exit Developer Mode" : "Enter Developer Mode"}
            >
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Session & Admin Controls - HIDDEN UNLESS ADMIN */}
            {isAdmin && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-amber-200 bg-amber-50 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4">
                 <div>
                   <h2 className="font-bold text-amber-800 flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5" />
                     Developer Control Panel
                   </h2>
                   <p className="text-sm text-amber-700 mt-1">จัดการรอบการลงทะเบียน ล้างข้อมูล และแก้ไขรายชื่อ</p>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                   <button
                     onClick={handleResetSession}
                     className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm"
                   >
                     <RefreshCw className="w-4 h-4" />
                     จบรอบ & เริ่มใหม่
                   </button>
                   
                   <button
                     onClick={handleClearAll}
                     className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm"
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
                 onExportUsers={exportCSV}
               />
            </section>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="space-y-6 animate-fade-in">
            <header className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">จุดลงทะเบียน</h2>
              <p className="text-gray-500 mt-2">กรุณาสแกน QR Code เพื่อบันทึกเวลา</p>
            </header>
            <Scanner users={users} onScan={handleCheckIn} />
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Developer Access</h3>
                <button onClick={() => setShowLogin(false)}><X className="w-5 h-5 text-gray-400" /></button>
             </div>
             <form onSubmit={handleLogin} className="space-y-4">
               <div>
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full px-4 py-2 border rounded-lg text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   placeholder="Enter PIN"
                   autoFocus
                 />
               </div>
               <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                 Unlock
               </button>
             </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} EventCheck Registration System. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;