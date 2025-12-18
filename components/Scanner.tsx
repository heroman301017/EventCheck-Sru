import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { ScanLine, Download, ArrowRight, LogOut, LogIn, XCircle } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ScannerProps {
  users: User[];
  onScan: (id: string) => void;
  pauseFocus?: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ users, onScan, pauseFocus = false }) => {
  const [input, setInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{ status: 'success' | 'error' | 'idle'; message: string; subMessage?: string; user?: User; type?: 'in' | 'out' }>({ status: 'idle', message: '' });
  const [autoSave, setAutoSave] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pauseFocus) return;

    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && lastScanResult.status === 'idle') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [lastScanResult.status, pauseFocus]);

  useEffect(() => {
    if (lastScanResult.status === 'success' && lastScanResult.user && autoSave && proofRef.current) {
      const timer = setTimeout(() => {
        handleSaveProof(lastScanResult.user!, lastScanResult.type);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [lastScanResult, autoSave]);

  const handleSaveProof = async (user: User, type?: 'in' | 'out') => {
    if (!proofRef.current) return;
    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      const typeText = type === 'out' ? 'out' : 'in';
      const dataUrl = await toPng(proofRef.current, { 
        cacheBust: true, 
        quality: 0.95, 
        backgroundColor: '#fff',
        style: {
          fontFamily: "'Sarabun', sans-serif"
        }
      });
      const link = document.createElement('a');
      link.download = `proof-${typeText}-${user.studentId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save proof image', err);
    }
  };

  const handleReset = () => {
    setLastScanResult({ status: 'idle', message: '' });
    setInput('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const normalizedInput = input.trim();
    const user = users.find(u => u.phone === normalizedInput || u.studentId === normalizedInput);

    if (user) {
      if (user.status === 'checked-out') {
        setLastScanResult({ status: 'error', message: 'ลงทะเบียนออกไปแล้ว', subMessage: 'Already Checked Out', user });
        setTimeout(() => setLastScanResult({ status: 'idle', message: '' }), 5000);
      } else if (user.status === 'checked-in') {
        onScan(normalizedInput);
        setLastScanResult({ 
          status: 'success', 
          message: 'ลงทะเบียนออกสำเร็จ', 
          subMessage: 'Check-out Success',
          type: 'out',
          user: { ...user, status: 'checked-out' }
        });
      } else {
        onScan(normalizedInput);
        setLastScanResult({ 
          status: 'success', 
          message: 'ลงทะเบียนเข้าสำเร็จ', 
          subMessage: 'Check-in Success',
          type: 'in',
          user: { ...user, status: 'checked-in' }
        });
      }
    } else {
      setLastScanResult({ status: 'error', message: 'ไม่พบข้อมูลในระบบ', subMessage: 'User Not Found' });
      setTimeout(() => setLastScanResult({ status: 'idle', message: '' }), 5000);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="w-full flex justify-end px-2">
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} className="rounded text-violet-500" />
          <span className="font-medium">Auto Save Proof</span>
        </label>
      </div>

      <div className="relative w-full max-w-md bg-slate-800 rounded-[2.5rem] aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-xl border-8 border-white ring-4 ring-violet-50">
        {lastScanResult.status === 'idle' && (
          <>
            <ScanLine className="w-20 h-20 text-violet-300 animate-pulse" />
            <p className="mt-4 text-violet-200 font-medium">พร้อมสแกนรหัสหรือเบอร์โทร</p>
            <div className="absolute top-0 w-full h-1 bg-violet-400 shadow-[0_0_30px_rgba(167,139,250,0.8)] animate-[scan_2s_infinite]"></div>
          </>
        )}

        {lastScanResult.status === 'success' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in ${lastScanResult.type === 'in' ? 'bg-emerald-400' : 'bg-slate-400'}`}>
            <div className="mb-4 bg-white/20 p-4 rounded-full backdrop-blur-sm">
               {lastScanResult.type === 'in' ? <LogIn className="w-16 h-16" /> : <LogOut className="w-16 h-16" />}
            </div>
            <h2 className="text-2xl font-bold">{lastScanResult.user?.name}</h2>
            <p className="opacity-90 mt-1 font-mono bg-black/10 px-3 py-1 rounded-lg">{lastScanResult.user?.studentId}</p>
            
            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
               <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                 <p className="font-bold text-xl">{lastScanResult.message}</p>
                 <p className="text-xs opacity-90 uppercase tracking-widest">{lastScanResult.subMessage}</p>
               </div>
               <button onClick={handleReset} className="bg-white text-slate-700 font-bold py-3 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95">
                 สแกนคนถัดไป <ArrowRight className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}

        {lastScanResult.status === 'error' && (
          <div className="absolute inset-0 bg-rose-400 flex flex-col items-center justify-center text-white p-6 animate-in zoom-in">
            <XCircle className="w-20 h-20 mb-4 opacity-90" />
            <h2 className="text-2xl font-bold">{lastScanResult.message}</h2>
            <p className="opacity-90">{lastScanResult.subMessage}</p>
            <button onClick={handleReset} className="mt-8 bg-white/20 hover:bg-white/30 px-8 py-3 rounded-2xl font-bold backdrop-blur-md">ลองใหม่</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="block w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-lg focus:ring-4 focus:ring-violet-100 outline-none shadow-sm"
            placeholder="พิมพ์รหัสนักศึกษา/เบอร์โทร..."
            autoComplete="off"
          />
          <button type="submit" className="absolute inset-y-2 right-2 px-6 bg-violet-500 text-white rounded-xl font-bold shadow-md active:scale-95">ตรวจสอบ</button>
        </div>
      </form>

      {lastScanResult.status === 'success' && lastScanResult.user && (
        <div className="absolute -left-[9999px] top-0">
          <div ref={proofRef} className="w-[400px] bg-white p-8 border-[6px] border-violet-100 rounded-3xl flex flex-col items-center text-center">
            <h1 className="text-xl font-bold text-slate-400 mb-4 uppercase tracking-widest">Registration Proof</h1>
            <div className={`p-4 rounded-full mb-4 ${lastScanResult.type === 'in' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-500'}`}>
              {lastScanResult.type === 'in' ? <LogIn className="w-12 h-12" /> : <LogOut className="w-12 h-12" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{lastScanResult.user.name}</h2>
            <p className="text-slate-500 font-mono mb-6">{lastScanResult.user.studentId}</p>
            <div className="w-full bg-slate-50 p-4 rounded-2xl text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">เวลา</span><span className="font-bold">{new Date().toLocaleTimeString('th-TH')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">สถานะ</span><span className="font-bold text-violet-600">{lastScanResult.message}</span></div>
            </div>
            <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">Codelex.PHR System</p>
          </div>
        </div>
      )}
    </div>
  );
};