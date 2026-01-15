
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { ScanLine, ArrowRight, LogOut, LogIn, XCircle, Loader2, CheckCircle2, Cloud, Camera, CameraOff, Clock, AlertTriangle, MapPin, Search, Zap } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  users: User[];
  onScan: (id: string, meta?: { location: string; device: string }) => Promise<void>;
  onRegisterRedirect?: (id: string) => void;
  pauseFocus?: boolean;
  backgroundImage?: string; // New prop for custom background
}

export const Scanner: React.FC<ScannerProps> = ({ users, onScan, onRegisterRedirect, pauseFocus = false, backgroundImage }) => {
  const [input, setInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastScanResult, setLastScanResult] = useState<{ status: 'success' | 'error' | 'idle'; message: string; subMessage?: string; user?: User; type?: 'in' | 'out' }>({ status: 'idle', message: '' });
  const [autoSave, setAutoSave] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerMountingRef = useRef<boolean>(false);

  // Focus Management
  useEffect(() => {
    if (pauseFocus || syncStatus !== 'idle' || lastScanResult.status !== 'idle' || isCameraActive) return;

    const focusInterval = setInterval(() => {
      // Only focus if viewport is wide enough (desktop) to prevent keyboard popping up on mobile
      if (window.innerWidth > 768 && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [lastScanResult.status, pauseFocus, syncStatus, isCameraActive]);

  // Cooldown Countdown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (cooldown === 0 && lastScanResult.status === 'error' && lastScanResult.message === 'ห้ามสแกนซ้ำ') {
       handleReset();
    }
  }, [cooldown, lastScanResult]);

  // Camera Logic
  useEffect(() => {
    let ignore = false;

    const manageScanner = async () => {
      if (!isCameraActive) {
         if (scannerRef.current && (scannerRef.current.isScanning || scannerMountingRef.current)) {
            try {
               await scannerRef.current.stop();
               scannerRef.current.clear();
            } catch (err) {
               console.debug("Stop scanner error:", err);
            }
            scannerMountingRef.current = false;
         }
         return;
      }

      if (isCameraActive && !scannerMountingRef.current) {
         try {
            scannerMountingRef.current = true;
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
                  if (!ignore) handleScanProcess(decodedText);
               },
               (errorMessage) => { 
                  // Frame errors are common, ignore them
               }
            );
         } catch (err) {
            console.error("Error starting scanner", err);
            if (!ignore) {
               setIsCameraActive(false);
               alert("ไม่สามารถเปิดกล้องได้ หรือกล้องกำลังถูกใช้งานอยู่");
            }
            scannerMountingRef.current = false;
         }
      }
    };

    manageScanner();

    return () => {
      ignore = true;
      if (scannerRef.current && scannerRef.current.isScanning) {
         scannerRef.current.stop().catch(err => console.debug("Cleanup stop error:", err));
         scannerMountingRef.current = false;
      }
    };
  }, [isCameraActive]);

  const getUserLocation = (): Promise<string> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            return resolve('Not Supported');
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
            (err) => {
                console.warn("Location access denied or error:", err);
                resolve('Permission Denied/Error');
            },
            { timeout: 5000, enableHighAccuracy: true } 
        );
    });
  };

  const handleScanProcess = async (value: string) => {
    if (syncStatus !== 'idle' || lastScanResult.status !== 'idle') return;

    setIsCameraActive(false); 
    setInput(value);

    const normalizedInput = value.trim();
    
    const user = users.find(u => u.phone === normalizedInput || u.studentId === normalizedInput);
    const isCheckOut = user?.status === 'checked-in';

    setSyncStatus('syncing');
      
    try {
      const location = await getUserLocation();
      const device = navigator.userAgent;

      await onScan(normalizedInput, { location, device });
      
      setSyncStatus('success');
      setLastScanResult({ 
        status: 'success', 
        message: isCheckOut ? 'ลงทะเบียนออกสำเร็จ' : 'ลงทะเบียนเข้าสำเร็จ', 
        subMessage: isCheckOut ? 'Check-out Success' : 'Check-in Success',
        type: isCheckOut ? 'out' : 'in',
        user: user ? { ...user, status: isCheckOut ? 'checked-out' : 'checked-in' } : undefined
      });

      if (user && autoSave) setTimeout(() => handleSaveProof(user, isCheckOut ? 'out' : 'in'), 1200);
      
      setTimeout(handleReset, 4000);

    } catch (error: any) {
      setSyncStatus('error');
      const errStr = String(error.message);

      if (errStr === 'USER_NOT_FOUND') {
        setLastScanResult({ 
            status: 'error', 
            message: 'ไม่พบข้อมูล', 
            subMessage: 'กำลังนำทางไปหน้าลงทะเบียน...' 
        });
        
        setTimeout(() => {
            if (onRegisterRedirect) {
                handleReset();
                onRegisterRedirect(normalizedInput);
            } else {
                handleReset();
            }
        }, 2000);

      } else if (errStr.startsWith('DUPLICATE_SCAN')) {
        const remaining = parseInt(errStr.split(':')[1]) || 300;
        setCooldown(remaining);
        setLastScanResult({ 
            status: 'error', 
            message: 'ห้ามสแกนซ้ำ', 
            subMessage: 'กรุณารอสักครู่ก่อนสแกนใหม่' 
        });
      } else if (errStr === 'ALREADY_CHECKED_OUT') {
        setLastScanResult({ 
            status: 'error', 
            message: 'สแกนออกเรียบร้อยแล้ว', 
            subMessage: 'กรุณาติดต่อผู้ดูแลระบบ' 
        });
      } else {
        setLastScanResult({ 
            status: 'error', 
            message: 'บันทึกข้อมูลล้มเหลว', 
            subMessage: 'Please check internet connection' 
        });
        setTimeout(handleReset, 3000);
      }
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
    setCooldown(0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if(input.trim()) handleScanProcess(input);
  };

  // --- UI Components for Scanner ---

  const ScanOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Corner Brackets */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl opacity-80"></div>
      <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-violet-500 rounded-tr-xl opacity-80"></div>
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-violet-500 rounded-bl-xl opacity-80"></div>
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-xl opacity-80"></div>
      
      {/* Central Grid */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
         <div className="w-64 h-64 border border-white/30 rounded-lg relative">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400/50"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400/50"></div>
         </div>
      </div>

      {/* Scanning Animation */}
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-[scan_2s_infinite]"></div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto space-y-6 animate-fade-in px-4 md:px-0">
      
      {/* Status Bar */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
           {syncStatus === 'syncing' ? (
             <span className="flex items-center gap-2 text-sm font-bold text-violet-600 bg-violet-100 px-4 py-1.5 rounded-full animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังประมวลผล...
             </span>
           ) : (
             <span className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                <Zap className="w-4 h-4 text-amber-500" /> System Ready
             </span>
           )}
           {syncStatus === 'success' && (
             <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                <Cloud className="w-3 h-3" /> Saved
             </span>
           )}
        </div>
        
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-white/80 p-2 rounded-xl transition-all">
          <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} className="rounded text-violet-500 w-4 h-4 focus:ring-violet-500" />
          <span className="font-medium">Auto Save Slip</span>
        </label>
      </div>

      {/* Main Scanner Container - Digital Look */}
      {/* UPDATE: Support Background Image */}
      <div 
        className="relative w-full aspect-[4/5] md:aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-violet-200 border-4 border-slate-800 ring-4 ring-slate-100 bg-cover bg-center"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
      >
        {/* Overlay to darken background image if present */}
        {backgroundImage && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>}
        
        {/* Camera View */}
        <div id="reader" className={`w-full h-full object-cover relative z-10 ${!isCameraActive ? 'hidden' : ''}`} />

        {/* Overlay HUD (Always visible when camera active) */}
        {isCameraActive && <ScanOverlay />}

        {/* Idle / Placeholder State */}
        {!isCameraActive && lastScanResult.status === 'idle' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center relative z-10 ${!backgroundImage ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : ''}`}>
             {syncStatus === 'syncing' ? (
               <div className="flex flex-col items-center gap-6 z-10">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl bg-violet-500/30 animate-pulse"></div>
                    <Loader2 className="w-24 h-24 text-violet-400 animate-spin relative z-10" />
                  </div>
                  <p className="text-violet-200 font-bold text-xl tracking-widest uppercase animate-pulse">Processing</p>
               </div>
             ) : (
               <div className="flex flex-col items-center z-10 p-8 text-center">
                <div className="w-24 h-24 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-slate-700">
                    <ScanLine className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 text-shadow">พร้อมสแกน</h3>
                <p className="text-slate-200 text-sm max-w-xs leading-relaxed text-shadow-sm">กดปุ่มเปิดกล้องด้านล่าง หรือพิมพ์รหัสเพื่อทำการเช็คอิน</p>
                
                {/* Decorative Lines */}
                <div className="mt-8 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce delay-200"></div>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-300"></div>
                </div>
               </div>
             )}
             
             {/* Background Tech Patterns (Only if no custom image) */}
             {!backgroundImage && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>}
          </div>
        )}

        {/* Success Overlay - Digital Card Style */}
        {lastScanResult.status === 'success' && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 bg-slate-900/90 backdrop-blur-md`}>
            <div className="w-full max-w-sm bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${lastScanResult.type === 'in' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`}></div>
                
                <div className="mb-6 inline-flex p-4 rounded-full bg-white/10 shadow-inner">
                    <CheckCircle2 className={`w-16 h-16 ${lastScanResult.type === 'in' ? 'text-emerald-400' : 'text-slate-300'}`} />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">{lastScanResult.user?.name}</h2>
                <p className="text-cyan-300 font-mono text-lg mb-6">{lastScanResult.user?.studentId || input}</p>
                
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <p className={`text-xl font-bold ${lastScanResult.type === 'in' ? 'text-emerald-400' : 'text-slate-300'}`}>{lastScanResult.message}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">{lastScanResult.subMessage}</p>
                </div>

                <div className="mt-6">
                    <button onClick={handleReset} className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                        สแกนคนถัดไป <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {lastScanResult.status === 'error' && (
          <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-in zoom-in">
             <div className="w-full max-w-xs text-center">
                {cooldown > 0 ? (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8">
                         <Clock className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
                         <h2 className="text-4xl font-black mb-2 text-white">{Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}</h2>
                         <p className="text-rose-300 font-bold text-lg">{lastScanResult.message}</p>
                         <p className="text-sm text-slate-400 mt-4">กรุณารอสักครู่ก่อนสแกนซ้ำ</p>
                         <button onClick={handleReset} className="mt-6 text-xs text-slate-500 hover:text-white underline">Force Scan</button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 inline-flex p-4 rounded-full bg-rose-500/20 text-rose-500">
                             <XCircle className="w-20 h-20" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{lastScanResult.message}</h2>
                        <p className="text-slate-400 mb-8">{lastScanResult.subMessage}</p>
                        
                        {lastScanResult.message !== 'ไม่พบข้อมูล' && (
                            <button onClick={handleReset} className="w-full bg-white/10 border border-white/20 hover:bg-white/20 text-white py-3.5 rounded-2xl font-bold backdrop-blur-md transition-all">
                                ลองใหม่อีกครั้ง
                            </button>
                        )}
                    </>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Control Section */}
      <div className="w-full max-w-md space-y-4">
         
         {/* Camera Toggle - Modern Button */}
         {lastScanResult.status === 'idle' && syncStatus === 'idle' && (
           <button 
             onClick={() => setIsCameraActive(!isCameraActive)}
             className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] text-lg ${
                isCameraActive 
                ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-200'
             }`}
           >
             {isCameraActive ? <><CameraOff className="w-5 h-5" /> ปิดกล้อง</> : <><Camera className="w-5 h-5" /> เปิดกล้องสแกน</>}
           </button>
         )}

         {/* Manual Input - Modern Floating Look */}
         <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-cyan-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-1">
                <div className="pl-4 text-slate-400">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    disabled={syncStatus === 'syncing' || lastScanResult.status !== 'idle' || isCameraActive}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-transparent text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-normal outline-none disabled:bg-transparent"
                    placeholder="รหัสนักศึกษา / เบอร์โทร"
                    autoComplete="off"
                />
                <button 
                    type="submit" 
                    disabled={syncStatus === 'syncing' || lastScanResult.status !== 'idle' || isCameraActive || !input.trim()}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {syncStatus === 'syncing' ? '...' : 'GO'}
                </button>
            </div>
         </form>

         {/* Location Warning */}
         <div className="flex items-start gap-2 justify-center text-[10px] text-slate-400 text-center px-4">
            <MapPin className="w-3 h-3 mt-0.5" />
            <p>ระบบจะบันทึกตำแหน่ง (GPS) เพื่อตรวจสอบสิทธิ์การเข้าร่วมงาน</p>
         </div>
      </div>

      {/* Hidden Proof Container */}
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
