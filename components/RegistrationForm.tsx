
import React, { useState, useEffect } from 'react';
import { UserPlus, BookOpen, GraduationCap, Phone, User, CreditCard } from 'lucide-react';

interface Props {
  eventName: string;
  onRegister: (data: any) => void;
  initialData?: { studentId?: string } | null;
}

export const RegistrationForm: React.FC<Props> = ({ eventName, onRegister, initialData }) => {
  const [form, setForm] = useState({
    studentId: '',
    name: '',
    phone: '',
    faculty: '',
    major: ''
  });

  useEffect(() => {
    if (initialData?.studentId) {
       setForm(prev => ({ ...prev, studentId: initialData.studentId! }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(form);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-violet-100 overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="bg-violet-50 p-8 text-center border-b border-violet-100">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-violet-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">สมัครเข้าร่วมกิจกรรม</h2>
        <p className="text-violet-500 font-medium mt-1">{eventName}</p>
        {initialData?.studentId && (
           <p className="text-xs bg-rose-100 text-rose-500 font-bold px-3 py-1 rounded-full inline-block mt-3">ไม่พบข้อมูลในระบบ กรุณาลงทะเบียน</p>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><CreditCard className="w-4 h-4" /> รหัสนักศึกษา</label>
            <input required type="text" value={form.studentId} onChange={e=>setForm({...form, studentId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-violet-100 transition-all outline-none" placeholder="เช่น 64XXXXXX" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><User className="w-4 h-4" /> ชื่อ-นามสกุล</label>
            <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-violet-100 transition-all outline-none" placeholder="นาย/นางสาว..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><Phone className="w-4 h-4" /> เบอร์โทรศัพท์</label>
            <input required type="tel" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-violet-100 transition-all outline-none" placeholder="0XXXXXXXXX" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><BookOpen className="w-4 h-4" /> คณะ</label>
            <input required type="text" value={form.faculty} onChange={e=>setForm({...form, faculty: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-violet-100 transition-all outline-none" placeholder="ระบุคณะ" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> สาขาวิชา</label>
            <input required type="text" value={form.major} onChange={e=>setForm({...form, major: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-4 focus:ring-violet-100 transition-all outline-none" placeholder="ระบุสาขาวิชา" />
          </div>
        </div>
        
        <button type="submit" className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all active:scale-[0.98] mt-4">
          ลงทะเบียนตอนนี้
        </button>
      </form>
    </div>
  );
};
