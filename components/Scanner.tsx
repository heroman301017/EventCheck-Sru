
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { ScanLine, ArrowRight, LogOut, LogIn, XCircle, Loader2, CheckCircle2, CloudSync, Camera, CameraOff } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  users: User[];
  onScan: (id: string) => Promise<void>;
  pauseFocus?: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ users, onScan, pauseFocus = false }) => {
  const [input, setInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastScanResult, setLastScanResult] = useState<{ status: 'success' | 'error' | 'idle'; message: string; subMessage?: string; user?: User; type?: 'in' | 'out' }>({ status: 'idle', message: '' });
  const [autoSave, setAutoSave] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Focus Management (Only when camera is NOT active)
  useEffect(() => {
    if (pauseFocus || syncStatus !== 'idle' || lastScanResult.status !== 'idle' || isCameraActive) return;

    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [lastScanResult.status, pauseFocus, syncStatus, isCameraActive]);

  // Camera Logic
  useEffect(() => {
    if (isCameraActive && syncStatus === 'idle' && lastScanResult.status === 'idle') {
      const startScanner = async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("reader");
          }
          await scannerRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // On Success
              handleScanProcess(decodedText);
            },
            (errorMessage) => {
              // On Frame Error (ignore)
            }
          );
        } catch (err) {
          console.error("Error starting scanner", err);
          setIsCameraActive(false);
          alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
        }
      };
      startScanner();
    } else {
      // Cleanup
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isCameraActive, syncStatus, lastScanResult.status]);

  const handleScanProcess = async (value: string) => {
    if (syncStatus !== 'idle' || lastScanResult.status !== 'idle') return;

    // Stop camera temporarily
    setIsCameraActive(false); 
    setInput(value);

    const normalizedInput = value.trim();
    const user = users.find(u => u.phone === normalizedInput || u.studentId === normalizedInput);

    if (user) {
      if (user.status === 'checked-out') {
        setLastScanResult({ status: 'error', message: 'ลงทะเบียนออกไปแล้ว', subMessage: 'Already Checked Out' });
        setTimeout(handleReset, 3000);
        return;
      }

      setSyncStatus('syncing');
      const isCheckOut = user.status === 'checked-in';
      
      try {
        await onScan(normalizedInput);
        
        setSyncStatus('success');
        setLastScanResult({ 
          status: 'success', 
          message: isCheckOut ? 'ลงทะเบียนออกสำเร็จ' : 'ลงทะเบียนเข้าสำเร็จ', 
          subMessage: isCheckOut ? 'Check-out Success' : 'Check-in Success',
          type: isCheckOut ? 'out' : 'in',
          user: { ...user, status: isCheckOut ? 'checked-out' : 'checked-in' }
        });

        if (autoSave) setTimeout(() => handleSaveProof(user, isCheckOut ? 'out' : 'in'), 1200);
        setTimeout(handleReset, 4000);
      } catch (error) {
        setSyncStatus('error');
        setLastScanResult({ status: 'error', message: 'บันทึกข้อมูลล้มเหลว', subMessage: 'Please check internet connection' });
        setTimeout(handleReset, 4000);
      }
    } else {
      setLastScanResult({ status: 'error', message: 'ไม่พบรายชื่อนี้', subMessage: 'User Not Found' });
      setTimeout(handleReset, 3000);
    }
  };

  const handleSaveProof = async (user: User, type?: 'in' | 'out') => {
    if (!proofRef.current) return;
    try {
      const dataUrl = await toPng(proofRef.current, { cacheBust: true, quality: 0.9, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `proof-${type || 'scan'}-${user.studentId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save proof', err);
    }
  };

  const handleReset = () => {
    setLastScanResult({ status: 'idle', message: '' });
    setSyncStatus('idle');
    setInput('');
    // Note: User has to manually start camera again to prevent accidental loops, 
    // or uncomment below to auto-restart:
    // setIsCameraActive(true); 
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(input.trim()) handleScanProcess(input);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
           {syncStatus === 'syncing' && (
             <span className="flex items-center gap-1.5 text-xs font-bold text-violet-500 animate-pulse bg-violet-50 px-3 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังส่งข้อมูลไปยัง Google Sheets...
             </span>
           )}
           {syncStatus === 'success' && (
             <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">
                <CloudSync className="w-3 h-3" /> เชื่อมต่อคลาวด์สำเร็จ
             </span>
           )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} className="rounded text-violet-500" />
          <span className="font-medium">Auto Save Proof</span>
        </label>
      </div>

      <div className="relative w-full max-w-md bg-slate-800 rounded-[2.5rem] aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-xl border-8 border-white ring-4 ring-violet-50">
        
        {/* Camera View Container */}
        <div id="reader" className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} />

        {/* Placeholder / Status View */}
        {!isCameraActive && lastScanResult.status === 'idle' && (
          <>
            {syncStatus === 'syncing' ? (
               <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-20 h-20 text-violet-400 animate-spin" />
                    <CloudSync className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-violet-200 font-bold text-lg animate-pulse tracking-wide">กำลังบันทึกข้อมูล...</p>
               </div>
            ) : (
               <div className="flex flex-col items-center">
                <ScanLine className="w-20 h-20 text-violet-300 animate-pulse" />
                <p className="mt-4 text-violet-200 font-medium">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                <div className="absolute top-0 w-full h-1 bg-violet-400 shadow-[0_0_30px_rgba(167,139,250,0.8)] animate-[scan_2s_infinite]"></div>
               </div>
            )}
          </>
        )}

        {/* Success Overlay */}
        {lastScanResult.status === 'success' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in duration-300 ${lastScanResult.type === 'in' ? 'bg-emerald-500' : 'bg-slate-500'} z-20`}>
            <div className="mb-4 bg-white/20 p-4 rounded-full backdrop-blur-sm animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-bold">{lastScanResult.user?.name}</h2>
            <p className="opacity-90 mt-1 font-mono bg-black/10 px-3 py-1 rounded-lg">{lastScanResult.user?.studentId}</p>
            
            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
               <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                 <p className="font-bold text-xl">{lastScanResult.message}</p>
                 <p className="text-xs opacity-90 uppercase tracking-widest">{lastScanResult.subMessage}</p>
               </div>
               <div className="mt-4">
                  <button onClick={handleReset} className="w-full bg-white text-slate-700 font-bold py-3 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95">
                    สแกนคนถัดไป <ArrowRight className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {lastScanResult.status === 'error' && (
          <div className="absolute inset-0 bg-rose-500 flex flex-col items-center justify-center text-white p-6 animate-in zoom-in z-20">
            <XCircle className="w-20 h-20 mb-4 opacity-90" />
            <h2 className="text-2xl font-bold">{lastScanResult.message}</h2>
            <p className="opacity-90">{lastScanResult.subMessage}</p>
            <button onClick={handleReset} className="mt-8 bg-white/20 hover:bg-white/30 px-8 py-3 rounded-2xl font-bold backdrop-blur-md">ลองใหม่</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md space-y-3">
         {/* Camera Toggle Button */}
         {lastScanResult.status === 'idle' && syncStatus === 'idle' && (
           <button 
             onClick={() => setIsCameraActive(!isCameraActive)}
             className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${isCameraActive ? 'bg-rose-100 text-rose-500 hover:bg-rose-200' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
           >
             {isCameraActive ? <><CameraOff className="w-5 h-5" /> ปิดกล้อง</> : <><Camera className="w-5 h-5" /> เปิดกล้องสแกน</>}
           </button>
         )}

         {/* Manual Input Form */}
         <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={syncStatus === 'syncing' || lastScanResult.status !== 'idle' || isCameraActive}
            onChange={(e) => setInput(e.target.value)}
            className="block w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-lg focus:ring-4 focus:ring-violet-100 outline-none shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
            placeholder={isCameraActive ? "กำลังใช้กล้อง..." : "พิมพ์รหัสนักศึกษา/เบอร์โทร..."}
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={syncStatus === 'syncing' || lastScanResult.status !== 'idle' || isCameraActive}
            className="absolute inset-y-2 right-2 px-6 bg-violet-500 text-white rounded-xl font-bold shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {syncStatus === 'syncing' ? '...' : 'ตรวจสอบ'}
          </button>
        </form>
      </div>

      {/* Hidden Proof Container (Same as before) */}
      <div className="absolute -left-[9999px] top-0">
        <div ref={proofRef} className="w-[400px] bg-white p-8 border-[6px] border-violet-100 rounded-3xl flex flex-col items-center text-center">
          <h1 className="text-xl font-bold text-slate-300 mb-4 tracking-widest uppercase">System Proof</h1>
          <div className={`p-4 rounded-full mb-4 ${lastScanResult.type === 'in' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-500'}`}>
            {lastScanResult.type === 'in' ? <LogIn className="w-12 h-12" /> : <LogOut className="w-12 h-12" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{lastScanResult.user?.name}</h2>
          <p className="text-slate-500 font-mono mb-6">{lastScanResult.user?.studentId}</p>
          <div className="w-full bg-slate-50 p-4 rounded-2xl text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">เวลา</span><span className="font-bold">{new Date().toLocaleTimeString('th-TH')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">สถานะ</span><span className="font-bold text-violet-600">{lastScanResult.message}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
