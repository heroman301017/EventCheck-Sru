
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Search, Download, Check, Clock, QrCode, Edit2, LogOut, FileText, FileSpreadsheet, X, Save, Upload, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';

interface UserListProps {
  users: User[];
  isEditable: boolean;
  onAddUser: (name: string, phone: string) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: number) => void;
  onImportUsers: (users: any[]) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const UserList: React.FC<UserListProps> = ({ users, isEditable, onUpdateUser, onDeleteUser, onImportUsers, onExportCSV, onExportPDF }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked-in' | 'checked-out' | 'pending'>('all');
  const [selectedQr, setSelectedQr] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const name = user.name ? String(user.name).toLowerCase() : '';
    const phone = user.phone ? String(user.phone) : '';
    const studentId = user.studentId ? String(user.studentId) : '';
    
    const matchesSearch = name.includes(term) || phone.includes(term) || studentId.includes(term);
    const matchesFilter = filter === 'all' ? true : user.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array (header: 1 returns array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Remove header row and map data
        // Assumes columns: [Student ID, Name, Phone, Faculty, Major]
        const importedUsers = jsonData.slice(1)
            .filter(row => row.length > 0 && (row[0] || row[1])) // Ensure at least ID or Name exists
            .map(row => ({
                studentId: row[0] ? String(row[0]).trim() : '',
                name: row[1] ? String(row[1]).trim() : '',
                phone: row[2] ? String(row[2]).trim() : '',
                faculty: row[3] ? String(row[3]).trim() : '',
                major: row[4] ? String(row[4]).trim() : ''
            }));

        if (importedUsers.length > 0) {
            onImportUsers(importedUsers);
            alert(`นำเข้าข้อมูลสำเร็จ ${importedUsers.length} รายการจากไฟล์ Excel`);
        } else {
            alert('ไม่พบข้อมูลในไฟล์ หรือรูปแบบข้อมูลไม่ถูกต้อง');
        }
      } catch (error) {
        console.error("Excel Import Error:", error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบไฟล์');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
      <div className="p-6 border-b border-slate-100 bg-white flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="relative w-full xl:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ รหัส หรือเบอร์โทร..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 bg-slate-50 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
          <select 
            className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 text-sm font-medium"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ทั้งหมด ({users.length})</option>
            <option value="checked-in">ในงาน ({users.filter(u => u.status === 'checked-in').length})</option>
            <option value="checked-out">กลับแล้ว ({users.filter(u => u.status === 'checked-out').length})</option>
            <option value="pending">ยังไม่มา ({users.filter(u => u.status === 'pending').length})</option>
          </select>

          {isEditable && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl text-sm font-bold hover:bg-violet-100 transition-all">
                <Upload className="w-4 h-4" /> Import Excel
              </button>
            </>
          )}

          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={onExportCSV} title="Export CSV" className="flex items-center gap-2 px-3 py-2 text-teal-600 hover:bg-white rounded-lg text-sm font-bold transition-all">
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button onClick={onExportPDF} title="Export PDF" className="flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-white rounded-lg text-sm font-bold transition-all">
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-violet-50/50 text-violet-900 text-[10px] uppercase tracking-widest border-b border-violet-100">
              <th className="p-4 font-bold">รหัส นศ.</th>
              <th className="p-4 font-bold">ชื่อ-สกุล</th>
              <th className="p-4 font-bold">เบอร์โทร</th>
              <th className="p-4 font-bold">คณะ/สาขา</th>
              <th className="p-4 font-bold text-center">QR</th>
              <th className="p-4 font-bold text-center">สถานะ</th>
              <th className="p-4 font-bold text-center">เวลา</th>
              {isEditable && <th className="p-4 font-bold text-center">จัดการ</th>}
            </tr>
          </thead>
          <tbody className="text-slate-600 text-sm">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`border-b border-slate-50 transition-colors ${user.status === 'checked-in' ? 'bg-emerald-50/30' : user.status === 'checked-out' ? 'bg-slate-50/50' : ''}`}>
                  <td className="p-4 font-mono font-bold text-slate-400">{user.studentId || '-'}</td>
                  <td className="p-4 font-bold text-slate-700">{user.name || '-'}</td>
                  <td className="p-4 font-mono">{isEditable ? (user.phone || '-') : (user.phone && user.phone.length > 4 ? user.phone.slice(0, -4) + 'XXXX' : user.phone || '-')}</td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-slate-500">{user.faculty || '-'}</div>
                    <div className="text-[10px] text-slate-400">{user.major || '-'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => setSelectedQr(user)} className="text-slate-300 hover:text-violet-500">
                      <QrCode className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    {user.status === 'checked-in' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600">มาแล้ว</span>
                    ) : user.status === 'checked-out' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">กลับแล้ว</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-500">รอ</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-[10px] font-mono">
                    <div className="text-emerald-600 font-bold">{user.checkInTime || '-'}</div>
                    <div className="text-slate-400">{user.checkOutTime || '-'}</div>
                  </td>
                  {isEditable && (
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-violet-50 rounded-lg text-violet-400 transition-colors" title="แก้ไข">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteUser(user.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-400 transition-colors" title="ลบ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="p-10 text-center text-slate-300 italic">ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedQr && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setSelectedQr(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{selectedQr.name}</h3>
            <p className="text-slate-400 font-mono mb-6">{selectedQr.studentId}</p>
            <div className="flex justify-center mb-8 p-6 bg-white border-2 border-dashed border-slate-100 rounded-3xl">
               <QRCodeSVG value={selectedQr.studentId || selectedQr.phone || ''} size={180} level="H" />
            </div>
            <button onClick={() => setSelectedQr(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold">ปิด</button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">แก้ไขข้อมูล</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="space-y-4">
               <div><label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อ-สกุล</label><input type="text" value={editingUser.name || ''} onChange={e=>setEditingUser({...editingUser, name:e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none" /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">รหัส นศ.</label><input type="text" value={editingUser.studentId || ''} onChange={e=>setEditingUser({...editingUser, studentId:e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">เบอร์โทร</label><input type="text" value={editingUser.phone || ''} onChange={e=>setEditingUser({...editingUser, phone:e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none" /></div>
               </div>
               <div><label className="text-[10px] font-bold text-slate-400 uppercase">คณะ</label><input type="text" value={editingUser.faculty || ''} onChange={e=>setEditingUser({...editingUser, faculty:e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none" /></div>
               <div><label className="text-[10px] font-bold text-slate-400 uppercase">สถานะ</label><select value={editingUser.status} onChange={e=>setEditingUser({...editingUser, status: e.target.value as any})} className="w-full p-3 bg-slate-50 rounded-xl outline-none"><option value="pending">รอ</option><option value="checked-in">มาแล้ว</option><option value="checked-out">กลับแล้ว</option></select></div>
               <button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); }} className="w-full py-4 bg-violet-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><Save className="w-5 h-5" /> บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
