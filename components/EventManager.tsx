
import React, { useState } from 'react';
import { Event } from '../types';
import { Plus, Edit3, Trash2, Save, X, Calendar, MapPin, AlignLeft } from 'lucide-react';

interface Props {
  events: Event[];
  onSave: (event: Event) => void;
  onDelete: (id: string) => void;
}

export const EventManager: React.FC<Props> = ({ events, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Event | null>(null);

  const handleNew = () => {
    setEditing({
      id: 'e' + Date.now(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      description: ''
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการกิจกรรม</h2>
          <p className="text-slate-500 text-sm">สร้างและแก้ไขรายการกิจกรรมทั้งหมดในระบบ</p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 shadow-lg shadow-violet-100">
          <Plus className="w-5 h-5" /> สร้างกิจกรรมใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(event => (
          <div key={event.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-start hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg">{event.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {event.date}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mt-2">{event.description}</p>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <button onClick={() => setEditing(event)} className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"><Edit3 className="w-5 h-5" /></button>
              <button onClick={() => onDelete(event.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">{editing.name ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</h3>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSave(editing); setEditing(null); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">ชื่อกิจกรรม</label>
                <input required type="text" value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-0 focus:ring-4 focus:ring-violet-100 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">วันที่</label>
                  <input required type="date" value={editing.date} onChange={e=>setEditing({...editing, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-0 focus:ring-4 focus:ring-violet-100 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">สถานที่</label>
                  <input required type="text" value={editing.location} onChange={e=>setEditing({...editing, location: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-0 focus:ring-4 focus:ring-violet-100 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">รายละเอียด</label>
                <textarea rows={3} value={editing.description} onChange={e=>setEditing({...editing, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-0 focus:ring-4 focus:ring-violet-100 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-violet-500 text-white rounded-2xl font-bold hover:bg-violet-600 shadow-lg shadow-violet-100 transition-colors">บันทึกกิจกรรม</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
