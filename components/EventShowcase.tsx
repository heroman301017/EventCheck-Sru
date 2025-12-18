
import React, { useState } from 'react';
import { Event } from '../types';
import { formatThaiDate } from '../constants';
import { Calendar, MapPin, ChevronRight, Info, UserCheck, X } from 'lucide-react';

interface Props {
  events: Event[];
  onSelect: (event: Event) => void;
}

export const EventShowcase: React.FC<Props> = ({ events, onSelect }) => {
  const [selectedForDetail, setSelectedForDetail] = useState<Event | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {events.map((event) => (
        <div 
          key={event.id} 
          className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
        >
          {/* Header/Banner Placeholder */}
          <div className="h-32 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
              <Calendar className="w-24 h-24 text-white rotate-12" />
            </div>
            <div className="absolute bottom-4 left-6 right-6">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/30">
                Coming Soon
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-1">
            <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-violet-600 transition-colors line-clamp-1">{event.name}</h3>
            
            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>{formatThaiDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>{event.location}</span>
              </div>
              <p className="text-slate-500 text-sm line-clamp-2 mt-4 leading-relaxed italic">
                {event.description || 'ไม่มีคำอธิบายสำหรับกิจกรรมนี้'}
              </p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedForDetail(event)}
                className="flex-1 py-3 px-4 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <Info className="w-4 h-4" /> รายละเอียด
              </button>
              <button 
                onClick={() => onSelect(event)}
                className="flex-1 py-3 px-4 bg-violet-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-600 shadow-lg shadow-violet-100 transition-all active:scale-95"
              >
                ลงทะเบียน <UserCheck className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      {selectedForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
             <div className="relative h-48 bg-violet-600 flex items-center justify-center">
                <button 
                  onClick={() => setSelectedForDetail(null)}
                  className="absolute top-6 right-6 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <Calendar className="w-20 h-20 text-white opacity-20" />
                <div className="absolute bottom-6 left-8 right-8">
                  <h3 className="text-2xl font-bold text-white">{selectedForDetail.name}</h3>
                </div>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                      <p className="font-bold text-slate-700">{formatThaiDate(selectedForDetail.date)}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="font-bold text-slate-700">{selectedForDetail.location}</p>
                   </div>
                </div>

                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                   <p className="text-slate-600 leading-relaxed bg-violet-50/50 p-6 rounded-3xl border border-violet-100">
                      {selectedForDetail.description || 'กิจกรรมนี้ยังไม่ได้ระบุรายละเอียดเพิ่มเติม'}
                   </p>
                </div>

                <button 
                  onClick={() => { onSelect(selectedForDetail); setSelectedForDetail(null); }}
                  className="w-full py-4 bg-violet-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-100 flex items-center justify-center gap-2 hover:bg-violet-600 active:scale-95 transition-all"
                >
                  สมัครเข้าร่วมกิจกรรมนี้ทันที <ChevronRight className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
