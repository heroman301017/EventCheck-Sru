
import React, { useRef } from 'react';
import { User, Event } from '../types';
import { formatThaiDate } from '../constants';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, ChevronLeft, Award, GraduationCap, MapPin, Calendar } from 'lucide-react';

interface Props {
  user: User;
  event: Event;
  onBack: () => void;
}

export const EventPass: React.FC<Props> = ({ user, event, onBack }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadImage = async () => {
    if (!cardRef.current) return;
    try {
      // Ensure fonts are ready before capturing
      if (document.fonts) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(cardRef.current, { 
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          fontFamily: "'Sarabun', sans-serif"
        }
      });
      const link = document.createElement('a');
      link.download = `event-pass-${user.studentId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture pass image', err);
    }
  };

  return (
    <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
      <div className="w-full flex justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-violet-600 transition-all font-bold">
          <ChevronLeft className="w-5 h-5" /> กลับหน้าสมัคร
        </button>
        <button onClick={downloadImage} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-md shadow-emerald-100 hover:bg-emerald-600">
          <Download className="w-4 h-4" /> บันทึกภาพบัตร
        </button>
      </div>

      <div ref={cardRef} className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-violet-50 relative">
        {/* Pass Header */}
        <div className="bg-violet-500 p-8 text-white relative">
          <Award className="w-12 h-12 text-white/30 absolute top-4 right-4" />
          <h2 className="text-xl font-bold uppercase tracking-widest opacity-80 mb-1">EVENT PASS</h2>
          <h3 className="text-2xl font-bold leading-tight">{event.name}</h3>
        </div>

        {/* Pass Content */}
        <div className="p-8 space-y-6">
          <div className="text-center">
             <div className="inline-block p-4 bg-white border-2 border-dashed border-violet-100 rounded-3xl mb-4">
                <QRCodeSVG value={user.studentId} size={150} level="H" />
             </div>
             <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Student ID: {user.studentId}</p>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Applicant Name</p>
               <p className="text-lg font-bold text-slate-800">{user.name}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faculty</p>
                  <p className="text-sm font-bold text-slate-700">{user.faculty}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Major</p>
                  <p className="text-sm font-bold text-slate-700">{user.major}</p>
                </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatThaiDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{event.location}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-50 py-4 text-center border-t border-slate-100">
           <p className="text-[10px] text-slate-300 font-bold tracking-[0.3em] uppercase">Developed by Codelex.PHR</p>
        </div>
      </div>
      
      <p className="mt-6 text-slate-400 text-sm text-center">ใช้รหัสนักศึกษาด้านบนในการสแกนจุดลงทะเบียน</p>
    </div>
  );
};
