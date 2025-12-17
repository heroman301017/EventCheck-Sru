import React, { useState, useMemo } from 'react';
import { User, Stats } from './types';
import { INITIAL_USERS, normalizePhone } from './constants';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { Scanner } from './components/Scanner';
import { LayoutDashboard, ScanLine, QrCode } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scan'>('overview');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

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
          
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'จัดการข้อมูล (Overview)' },
              { id: 'scan', icon: ScanLine, label: 'จุดสแกน (Scan)' },
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Dashboard Section */}
            <section>
               <Dashboard stats={stats} />
            </section>
            
            {/* List Section */}
            <section>
               <UserList 
                 users={users} 
                 onAddUser={handleAddUser}
                 onUpdateUser={handleUpdateUser}
                 onImportUsers={handleImportUsers}
               />
            </section>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="space-y-6">
            <header className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">จุดลงทะเบียน</h2>
              <p className="text-gray-500 mt-2">กรุณาสแกน QR Code เพื่อบันทึกเวลา</p>
            </header>
            <Scanner users={users} onScan={handleCheckIn} />
          </div>
        )}
      </main>

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