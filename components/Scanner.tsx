import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { ScanLine, CheckCircle, XCircle, Search, Download, ArrowRight, LogOut, LogIn } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ScannerProps {
  users: User[];
  onScan: (id: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ users, onScan }) => {
  const [input, setInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{ status: 'success' | 'error' | 'idle'; message: string; subMessage?: string; user?: User; type?: 'in' | 'out' }>({ status: 'idle', message: '' });
  const [autoSave, setAutoSave] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  // Auto-focus input for handheld scanners
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && lastScanResult.status === 'idle') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [lastScanResult.status]);

  // Handle Auto Save Proof
  useEffect(() => {
    if (lastScanResult.status === 'success' && lastScanResult.user && autoSave && proofRef.current) {
      const timer = setTimeout(() => {
        handleSaveProof(lastScanResult.user!, lastScanResult.type);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lastScanResult, autoSave]);

  const handleSaveProof = async (user: User, type?: 'in' | 'out') => {
    if (!proofRef.current) return;
    try {
      const typeText = type === 'out' ? 'out' : 'in';
      const dataUrl = await toPng(proofRef.current, { cacheBust: true, quality: 0.95, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `proof-${typeText}-${user.id}-${user.name.replace(/\s+/g, '_')}.png`;
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

    // Find user by phone number (QR code value)
    const normalizedInput = input.trim();
    const user = users.find(u => u.phone === normalizedInput);

    if (user) {
      if (user.status === 'checked-out') {
        setLastScanResult({ 
          status: 'error', 
          message: 'ลงทะเบียนออกไปแล้ว',
          subMessage: 'Already Checked Out', 
          user 
        });
        setTimeout(() => setLastScanResult({ status: 'idle', message: '' }), 7000);
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
      setTimeout(() => setLastScanResult({ status: 'idle', message: '' }), 7000);
    }

    setInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in h-full md:h-auto">
      
      {/* Settings Toggle */}
      <div className="w-full flex justify-end px-2">
        <label className="flex items-center gap-2 text-xs md:text-sm text-slate-500 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all border border-slate-100 select-none">
          <input 
            type="checkbox" 
            checked={autoSave} 
            onChange={e => setAutoSave(e.target.checked)}
            className="rounded text-violet-500 focus:ring-violet-300 border-slate-300 w-3 h-3 md:w-4 md:h-4"
          />
          <span className="font-medium">Auto Save Proof</span>
        </label>
      </div>

      {/* Scanner Visual */}
      <div className="relative w-full max-w-md bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-xl shadow-violet-200 border-[6px] md:border-8 border-white ring-4 ring-violet-50 shrink-0">
        {lastScanResult.status === 'idle' && (
          <>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <ScanLine className="w-16 h-16 md:w-20 md:h-20 text-violet-300 animate-pulse" />
            <p className="mt-4 text-violet-200 font-medium text-sm md:text-base tracking-wide">Ready to Scan QR Code</p>
            <div className="absolute top-0 w-full h-1 bg-violet-400 shadow-[0_0_30px_rgba(167,139,250,0.8)] animate-[scan_2s_infinite]"></div>
          </>
        )}

        {lastScanResult.status === 'success' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-10 p-4 md:p-6 text-center ${lastScanResult.type === 'in' ? 'bg-emerald-400' : 'bg-slate-400'}`}>
            <div className="mb-3 md:mb-4 bg-white/20 p-3 md:p-4 rounded-full backdrop-blur-sm">
               {lastScanResult.type === 'in' ? <LogIn className="w-12 h-12 md:w-16 md:h-16" /> : <LogOut className="w-12 h-12 md:w-16 md:h-16" />}
            </div>
            <h2 className="text-xl md:text-2xl font-bold break-words w-full px-2 line-clamp-2">{lastScanResult.user?.name}</h2>
            <p className="opacity-90 mt-1 text-base md:text-lg font-mono tracking-wider bg-black/10 px-3 py-1 rounded-lg">
              {lastScanResult.user?.phone}
            </p>
            
            <div className="mt-4 md:mt-6 flex flex-col gap-3 w-full max-w-xs px-2">
               <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                 <p className="font-bold text-white text-lg md:text-xl">{lastScanResult.message}</p>
                 <p className="text-xs md:text-sm opacity-90 font-medium tracking-wide uppercase">{lastScanResult.subMessage}</p>
                 {autoSave && <p className="text-xs mt-2 opacity-80 flex items-center justify-center gap-1"><Download className="w-3 h-3" /> Saved</p>}
               </div>
               
               <button 
                 onClick={handleReset}
                 className="bg-white text-slate-700 hover:bg-slate-50 font-bold py-2 md:py-3 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm md:text-base"
               >
                 <span>สแกนคนถัดไป</span>
                 <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
               </button>
            </div>
          </div>
        )}

        {lastScanResult.status === 'error' && (
          <div className="absolute inset-0 bg-rose-400 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 p-4">
            <XCircle className="w-16 h-16 md:w-20 md:h-20 mb-4 opacity-90" />
            <h2 className="text-xl md:text-2xl font-bold text-center">{lastScanResult.message}</h2>
            {lastScanResult.subMessage && <p className="text-base md:text-lg opacity-90 mt-1">{lastScanResult.subMessage}</p>}
            {lastScanResult.user && <p className="mt-4 text-lg md:text-xl font-bold bg-white/20 px-4 py-2 rounded-xl">{lastScanResult.user.name}</p>}
            <div className="mt-6 md:mt-8 w-12 h-1 bg-white/30 rounded-full overflow-hidden">
               <div className="h-full bg-white animate-[progress_7s_linear]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      {lastScanResult.status !== 'success' && (
        <form onSubmit={handleSubmit} className="w-full max-w-md px-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 md:h-6 md:w-6 text-slate-300 group-focus-within:text-violet-400 transition-colors" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="block w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 border-2 border-slate-100 rounded-2xl text-base md:text-lg focus:ring-4 focus:ring-violet-100 focus:border-violet-300 shadow-sm transition-all outline-none text-slate-600 placeholder-slate-300"
              placeholder="สแกน QR Code..."
              autoComplete="off"
            />
            <button 
              type="submit"
              className="absolute inset-y-2 right-2 px-4 md:px-6 bg-violet-500 text-white rounded-xl hover:bg-violet-600 font-bold transition-all shadow-md shadow-violet-200 active:scale-95 text-sm md:text-base"
            >
              ตรวจสอบ
            </button>
          </div>
        </form>
      )}

      {/* Hidden Proof Card for Image Generation */}
      {lastScanResult.status === 'success' && lastScanResult.user && (
        <div className="absolute -left-[9999px] top-0">
          <div ref={proofRef} className={`w-[400px] bg-white p-8 border-[6px] rounded-3xl flex flex-col items-center text-center shadow-lg font-sans ${lastScanResult.type === 'in' ? 'border-emerald-300' : 'border-slate-300'}`}>
            <div className="w-full flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h1 className="text-xl font-bold text-slate-700">EventCheck</h1>
              <span className="text-sm text-slate-400 font-medium">{new Date().toLocaleDateString('th-TH')}</span>
            </div>
            
            <div className="mb-6">
              {lastScanResult.type === 'in' ? (
                <>
                  <div className="bg-emerald-50 p-4 rounded-full mb-3 inline-block">
                    <LogIn className="w-16 h-16 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-emerald-500 uppercase tracking-wider">Checked In</h2>
                </>
              ) : (
                <>
                  <div className="bg-slate-100 p-4 rounded-full mb-3 inline-block">
                    <LogOut className="w-16 h-16 text-slate-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-500 uppercase tracking-wider">Checked Out</h2>
                </>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-1">{lastScanResult.user.name}</h3>
            <p className="text-lg text-slate-500 mb-8 font-mono bg-slate-50 px-3 py-1 rounded-lg">{lastScanResult.user.phone}</p>
            
            <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-400 font-medium">Timestamp</span>
                 <span className="font-mono font-bold text-slate-600">{new Date().toLocaleTimeString('th-TH')}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400 font-medium">Action</span>
                 <span className={`font-bold ${lastScanResult.type === 'in' ? 'text-emerald-500' : 'text-slate-500'}`}>
                   {lastScanResult.type === 'in' ? 'Arrival' : 'Departure'}
                 </span>
               </div>
            </div>
            
            <p className="mt-8 text-xs text-slate-300 font-medium uppercase tracking-widest">Official Registration Proof</p>
          </div>
        </div>
      )}

    </div>
  );
};