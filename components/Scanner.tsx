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
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">
      
      {/* Settings Toggle */}
      <div className="w-full flex justify-end">
        <label className="flex items-center gap-2 text-xs md:text-sm text-gray-600 cursor-pointer bg-white px-3 py-1 rounded-full shadow-sm">
          <input 
            type="checkbox" 
            checked={autoSave} 
            onChange={e => setAutoSave(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>บันทึกรูปยืนยันอัตโนมัติ (Auto Save Proof)</span>
        </label>
      </div>

      {/* Scanner Visual */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl aspect-[4/3] flex flex-col items-center justify-center overflow-hidden shadow-2xl border-4 border-gray-800">
        {lastScanResult.status === 'idle' && (
          <>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <ScanLine className="w-16 h-16 md:w-24 md:h-24 text-blue-400 animate-pulse" />
            <p className="mt-4 text-blue-200 font-medium text-sm md:text-base">Ready to Scan QR Code</p>
            <div className="absolute top-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite]"></div>
          </>
        )}

        {lastScanResult.status === 'success' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-10 p-4 md:p-6 text-center ${lastScanResult.type === 'in' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="mb-3 md:mb-4">
               {lastScanResult.type === 'in' ? <LogIn className="w-16 h-16 md:w-20 md:h-20" /> : <LogOut className="w-16 h-16 md:w-20 md:h-20" />}
            </div>
            <h2 className="text-xl md:text-2xl font-bold break-words w-full px-2">{lastScanResult.user?.name}</h2>
            <p className="opacity-90 mt-2 text-base md:text-lg">เบอร์โทร: {lastScanResult.user?.phone}</p>
            
            <div className="mt-4 md:mt-6 flex flex-col gap-3 w-full max-w-xs px-2">
               <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                 <p className="font-bold text-white text-lg md:text-xl">{lastScanResult.message}</p>
                 <p className="text-sm opacity-90">{lastScanResult.subMessage}</p>
                 {autoSave && <p className="text-xs mt-2 opacity-75 flex items-center justify-center gap-1"><Download className="w-3 h-3" /> Saved to device</p>}
               </div>
               
               <button 
                 onClick={handleReset}
                 className="bg-white text-gray-800 hover:bg-gray-100 font-bold py-2 md:py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm md:text-base"
               >
                 <span>สแกนคนถัดไป</span>
                 <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
               </button>
            </div>
          </div>
        )}

        {lastScanResult.status === 'error' && (
          <div className="absolute inset-0 bg-red-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 p-4">
            <XCircle className="w-16 h-16 md:w-24 md:h-24 mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-center">{lastScanResult.message}</h2>
            {lastScanResult.subMessage && <p className="text-lg opacity-90 mt-1">{lastScanResult.subMessage}</p>}
            {lastScanResult.user && <p className="mt-2 text-lg font-bold bg-black/20 px-3 py-1 rounded-lg">{lastScanResult.user.name}</p>}
            <p className="mt-4 text-sm opacity-75">Auto-resetting in 7s...</p>
          </div>
        )}
      </div>

      {/* Input Form */}
      {lastScanResult.status !== 'success' && (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl text-base md:text-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors"
              placeholder="สแกน QR Code หรือกรอกเบอร์โทร..."
              autoComplete="off"
            />
            <button 
              type="submit"
              className="absolute inset-y-2 right-2 px-4 md:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm md:text-base"
            >
              ตรวจสอบ
            </button>
          </div>
        </form>
      )}

      {/* Hidden Proof Card for Image Generation */}
      {lastScanResult.status === 'success' && lastScanResult.user && (
        <div className="absolute -left-[9999px] top-0">
          <div ref={proofRef} className={`w-[400px] bg-white p-8 border-4 rounded-xl flex flex-col items-center text-center shadow-lg ${lastScanResult.type === 'in' ? 'border-emerald-500' : 'border-blue-500'}`}>
            <div className="w-full flex justify-between items-center mb-6 border-b pb-4">
              <h1 className="text-xl font-bold text-gray-800">EventCheck</h1>
              <span className="text-sm text-gray-500">{new Date().toLocaleDateString('th-TH')}</span>
            </div>
            
            <div className="mb-6">
              {lastScanResult.type === 'in' ? (
                <>
                  <LogIn className="w-20 h-20 text-emerald-500 mx-auto mb-2" />
                  <h2 className="text-3xl font-bold text-emerald-600 uppercase tracking-wider">Checked In</h2>
                </>
              ) : (
                <>
                  <LogOut className="w-20 h-20 text-blue-500 mx-auto mb-2" />
                  <h2 className="text-3xl font-bold text-blue-600 uppercase tracking-wider">Checked Out</h2>
                </>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{lastScanResult.user.name}</h3>
            <p className="text-lg text-gray-600 mb-6">{lastScanResult.user.phone}</p>
            
            <div className="w-full bg-gray-100 rounded-lg p-4">
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-gray-500">Timestamp</span>
                 <span className="font-mono font-bold">{new Date().toLocaleTimeString('th-TH')}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Action</span>
                 <span className={`font-bold ${lastScanResult.type === 'in' ? 'text-emerald-600' : 'text-blue-600'}`}>
                   {lastScanResult.type === 'in' ? 'Arrival' : 'Departure'}
                 </span>
               </div>
            </div>
            
            <p className="mt-8 text-xs text-gray-400">Official Registration Proof</p>
          </div>
        </div>
      )}

    </div>
  );
};