import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Search, Download, Check, Clock, QrCode, Edit2, Plus, Upload, X, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UserListProps {
  users: User[];
  isEditable: boolean;
  onAddUser: (name: string, phone: string) => void;
  onUpdateUser: (user: User) => void;
  onImportUsers: (users: { name: string; phone: string }[]) => void;
  onExportUsers: () => void;
}

export const UserList: React.FC<UserListProps> = ({ users, isEditable, onAddUser, onUpdateUser, onImportUsers, onExportUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked-in' | 'pending'>('all');
  const [selectedQr, setSelectedQr] = useState<User | null>(null);
  
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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-fade-in relative">
      {/* Header / Toolbar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ทั้งหมด ({users.length})</option>
            <option value="checked-in">มาแล้ว ({users.filter(u => u.status === 'checked-in').length})</option>
            <option value="pending">ยังไม่มา ({users.filter(u => u.status === 'pending').length})</option>
          </select>

          <div className="h-8 w-px bg-gray-300 mx-2 hidden xl:block"></div>
          
          {isEditable && (
            <>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
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
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              
              <button 
                onClick={onExportUsers}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold border-b">ลำดับ</th>
              <th className="p-4 font-semibold border-b">ชื่อ-สกุล</th>
              <th className="p-4 font-semibold border-b">เบอร์โทร</th>
              <th className="p-4 font-semibold border-b text-center">QR</th>
              <th className="p-4 font-semibold border-b text-center">สถานะ</th>
              <th className="p-4 font-semibold border-b text-right">เวลา</th>
              {isEditable && <th className="p-4 font-semibold border-b text-center">แก้ไข</th>}
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-500">{user.id}</td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 font-mono text-gray-600">{user.phone}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedQr(user)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Show QR"
                    >
                      <QrCode className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    {user.status === 'checked-in' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" /> มาแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        <Clock className="w-3 h-3" /> รอ
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right text-gray-500">
                    {user.checkInTime || '-'}
                  </td>
                  {isEditable && (
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }}
                        className="text-gray-400 hover:text-amber-500 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isEditable ? 7 : 6} className="p-8 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QR Code Modal */}
      {selectedQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedQr(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">{selectedQr.name}</h3>
            <p className="text-gray-500 mb-6 font-mono">{selectedQr.phone}</p>
            <div className="flex justify-center mb-6 p-4 bg-white border-2 border-gray-100 rounded-xl">
               <QRCodeSVG value={selectedQr.phone} size={200} level="H" />
            </div>
            <button 
              onClick={() => setSelectedQr(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">แก้ไขข้อมูล</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ (QR Value)</label>
                <input 
                  type="text" 
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">รอ (Pending)</option>
                  <option value="checked-in">มาแล้ว (Checked In)</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                 <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                 <button type="submit" className="flex-1 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex justify-center items-center gap-2">
                   <Save className="w-4 h-4" /> บันทึก
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">เพิ่มรายชื่อใหม่</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ระบุชื่อ-สกุล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  required
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="08xxxxxxxx"
                />
              </div>
              <div className="pt-2 flex gap-3">
                 <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                 <button type="submit" className="flex-1 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg flex justify-center items-center gap-2">
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