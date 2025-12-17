import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Search, Download, Check, Clock, QrCode, Edit2, Plus, Upload, X, Save, LogOut, FileText, FileSpreadsheet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UserListProps {
  users: User[];
  isEditable: boolean;
  onAddUser: (name: string, phone: string) => void;
  onUpdateUser: (user: User) => void;
  onImportUsers: (users: { name: string; phone: string }[]) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const UserList: React.FC<UserListProps> = ({ users, isEditable, onAddUser, onUpdateUser, onImportUsers, onExportCSV, onExportPDF }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked-in' | 'checked-out' | 'pending'>('all');
  const [selectedQr, setSelectedQr] = useState<User | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState({ name: '', phone: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.phone.includes(searchTerm);
    const matchesFilter = filter === 'all' ? true : user.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      const parsedUsers: { name: string; phone: string }[] = [];
      const startIdx = rows[0].includes('name') || rows[0].includes('ชื่อ') ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length >= 2) {
          parsedUsers.push({
            name: cols[0].trim().replace(/^"|"$/g, ''),
            phone: cols[1].trim().replace(/^"|"$/g, '').replace(/'/g, '')
          });
        }
      }
      
      if (parsedUsers.length > 0) {
        onImportUsers(parsedUsers);
        alert(`Imported ${parsedUsers.length} users successfully.`);
      } else {
        alert('No valid data found in CSV.');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser(editingUser);
      setIsEditModalOpen(false);
      setEditingUser(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserForm.name && newUserForm.phone) {
      onAddUser(newUserForm.name, newUserForm.phone);
      setIsAddModalOpen(false);
      setNewUserForm({ name: '', phone: '' });
    }
  };

  const handlePDFClick = async () => {
    setIsExportingPDF(true);
    await onExportPDF();
    setIsExportingPDF(false);
  };

  // Helper to mask phone number
  const formatPhoneNumber = (phone: string) => {
    if (isEditable) return phone; // Show full number in Admin Mode
    if (phone.length < 4) return phone;
    return phone.slice(0, -4) + 'XXXX';
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
      {/* Header / Toolbar */}
      <div className="p-6 border-b border-slate-100 bg-white flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400 bg-slate-50 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <select 
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400 bg-slate-50 text-slate-600 text-sm font-medium"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ทั้งหมด ({users.length})</option>
            <option value="checked-in">อยู่ในงาน ({users.filter(u => u.status === 'checked-in').length})</option>
            <option value="checked-out">กลับแล้ว ({users.filter(u => u.status === 'checked-out').length})</option>
            <option value="pending">ยังไม่มา ({users.filter(u => u.status === 'pending').length})</option>
          </select>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden xl:block"></div>
          
          {isEditable && (
            <>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 text-sm font-medium transition-colors shadow-sm shadow-violet-200"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายชื่อ</span>
              </button>

              <input 
                type="file" 
                accept=".csv,.txt" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button 
                  onClick={onExportCSV}
                  className="flex items-center gap-2 px-3 py-2 text-teal-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all"
                  title="Download CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <div className="w-px bg-slate-300 my-1"></div>
                <button 
                  onClick={handlePDFClick}
                  disabled={isExportingPDF}
                  className="flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  title="Download PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isExportingPDF ? '...' : 'PDF'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-violet-50/50 text-violet-900 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold w-16 first:rounded-tl-lg">ลำดับ</th>
              <th className="p-4 font-semibold">ชื่อ-สกุล</th>
              <th className="p-4 font-semibold">เบอร์โทร</th>
              <th className="p-4 font-semibold text-center w-20">QR</th>
              <th className="p-4 font-semibold text-center">สถานะ</th>
              <th className="p-4 font-semibold text-center">เวลาเข้า</th>
              <th className="p-4 font-semibold text-center last:rounded-tr-lg">เวลาออก</th>
              {isEditable && <th className="p-4 font-semibold text-center">แก้ไข</th>}
            </tr>
          </thead>
          <tbody className="text-slate-600 text-sm">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isCheckedIn = user.status === 'checked-in';
                const isCheckedOut = user.status === 'checked-out';
                
                let rowClass = 'hover:bg-slate-50 border-b border-slate-50 text-slate-600';
                if (isCheckedIn) rowClass = 'bg-emerald-50/60 hover:bg-emerald-100/50 border-b border-emerald-100 text-emerald-900'; // Pastel Green
                if (isCheckedOut) rowClass = 'bg-slate-100/50 hover:bg-slate-200/50 border-b border-slate-200 text-slate-500'; // Pastel Gray

                return (
                  <tr 
                    key={user.id} 
                    className={`transition-colors duration-150 ${rowClass}`}
                  >
                    <td className="p-4 font-medium opacity-70">{user.id}</td>
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 font-mono opacity-80 tracking-wide">
                      {formatPhoneNumber(user.phone)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedQr(user)}
                        className={`${isCheckedIn ? 'text-emerald-500' : isCheckedOut ? 'text-slate-400' : 'text-slate-300 hover:text-violet-500'} transition-colors`}
                        title="Show QR"
                      >
                        <QrCode className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {isCheckedIn && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/80 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                          <Check className="w-3 h-3" /> มาแล้ว
                        </span>
                      )}
                      {isCheckedOut && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200">
                          <LogOut className="w-3 h-3" /> กลับแล้ว
                        </span>
                      )}
                      {user.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-500 ring-1 ring-amber-100">
                          <Clock className="w-3 h-3" /> รอ
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium opacity-80">
                      {user.checkInTime || '-'}
                    </td>
                    <td className="p-4 text-center font-medium opacity-80">
                      {user.checkOutTime || '-'}
                    </td>
                    {isEditable && (
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }}
                          className="text-slate-400 hover:text-amber-500 transition-colors bg-white p-1.5 rounded-lg shadow-sm border border-slate-100"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isEditable ? 8 : 7} className="p-10 text-center text-slate-400 italic">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QR Code Modal */}
      {selectedQr && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedQr(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-1 text-slate-800">{selectedQr.name}</h3>
            <p className="text-slate-500 mb-6 font-mono text-lg bg-slate-50 inline-block px-3 py-1 rounded-lg">
               {formatPhoneNumber(selectedQr.phone)}
            </p>
            <div className="flex justify-center mb-8 p-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
               <QRCodeSVG value={selectedQr.phone} size={180} level="H" className="drop-shadow-sm" />
            </div>
            <button 
              onClick={() => setSelectedQr(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">แก้ไขข้อมูล</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">เบอร์โทรศัพท์ (QR Value)</label>
                <input 
                  type="text" 
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-400 outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">สถานะ</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-400 outline-none transition-all bg-white"
                >
                  <option value="pending">รอ (Pending)</option>
                  <option value="checked-in">อยู่ในงาน (Checked In)</option>
                  <option value="checked-out">กลับแล้ว (Checked Out)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold">ยกเลิก</button>
                 <button type="submit" className="flex-1 py-3 text-white bg-violet-500 hover:bg-violet-600 rounded-xl flex justify-center items-center gap-2 font-bold shadow-lg shadow-violet-200">
                   <Save className="w-4 h-4" /> บันทึก
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">เพิ่มรายชื่อใหม่</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-400 outline-none transition-all"
                  placeholder="ระบุชื่อ-สกุล"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  required
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-violet-100 focus:border-violet-400 outline-none transition-all font-mono"
                  placeholder="08xxxxxxxx"
                />
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold">ยกเลิก</button>
                 <button type="submit" className="flex-1 py-3 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl flex justify-center items-center gap-2 font-bold shadow-lg shadow-emerald-200">
                   <Plus className="w-4 h-4" /> เพิ่มรายชื่อ
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};