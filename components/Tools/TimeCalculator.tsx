
import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, CornerDownLeft, History, Trash2 } from 'lucide-react';

interface TimeCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const TimeCalculator: React.FC<TimeCalculatorProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ time: string; days: number } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // RÔLE : Calculateur Temporel 24h
  // LOGIQUE : Strict Conversion + Cycle 24h + Détection Jours
  const parseToSeconds = (timeStr: string): number => {
    const cleaned = timeStr.toLowerCase()
      .replace(/h/g, ':')
      .replace(/m|min/g, ':')
      .replace(/s/g, '')
      .replace(/\s+/g, '');
    
    const parts = cleaned.split(':').filter(p => p !== '').map(Number);
    let totalSeconds = 0;
    
    if (parts.length === 3) { // HH:mm:ss
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // HH:mm
      totalSeconds = parts[0] * 3600 + parts[1] * 60;
    } else if (parts.length === 1) { // Minutes par défaut si seul
      totalSeconds = parts[0] * 60;
    }
    
    return totalSeconds;
  };

  const formatToTimeWithDays = (totalSeconds: number): { time: string; days: number } => {
    // Calcul de l'écart de jours (86400 secondes = 24h)
    const days = Math.floor(totalSeconds / 86400);
    
    // Calcul du temps restant dans la journée (modulo positif)
    let s = totalSeconds % 86400;
    if (s < 0) s += 86400;

    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      time: `[${pad(h)}:${pad(m)}:${pad(sec)}]`,
      days: days
    };
  };

  const handleCalculate = () => {
    if (!input.trim()) return;

    try {
      let finalSeconds = 0;
      const isAddition = input.includes('+');
      const isSubtraction = input.includes('-');
      
      if (isAddition || isSubtraction) {
        const parts = input.split(isAddition ? '+' : '-');
        const base = parseToSeconds(parts[0]);
        const delta = parseToSeconds(parts[1]);
        finalSeconds = isAddition ? base + delta : base - delta;
      } else {
        finalSeconds = parseToSeconds(input);
      }

      const resObj = formatToTimeWithDays(finalSeconds);
      setResult(resObj);
      
      const dayLabel = resObj.days > 0 ? ` (+${resObj.days}j)` : resObj.days < 0 ? ` (${resObj.days}j)` : '';
      setHistory(prev => [input + ' = ' + resObj.time + dayLabel, ...prev].slice(0, 5));
    } catch (_e) {
      setResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCalculate();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Modale */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-2xl text-blue-500">
              <Calculator size={22} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xs font-black uppercase italic tracking-widest text-white leading-none">Calculateur Temporel</h2>
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Logiciel de calcul cyclique</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors active:scale-90">
            <X size={20} />
          </button>
        </div>

        {/* Corps de la Modale */}
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="relative group">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 23:00 + 2h"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-bold text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 tabular-nums"
              />
              <button 
                onClick={handleCalculate}
                className="absolute right-3 top-3 bottom-3 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center group"
              >
                <CornerDownLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-2 italic">Entrée flexible : HH:mm ou HHh MMmin</p>
          </div>

          {/* Résultat - Format Spécifique [HH:mm:ss] */}
          <div className="bg-gradient-to-br from-blue-600/10 to-blue-900/5 border border-blue-500/20 rounded-[32px] p-10 flex flex-col items-center justify-center space-y-3 min-h-[180px] relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>
             <span className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest relative z-10">Résultat Final</span>
             
             <div className="flex flex-col items-center gap-1 relative z-10">
               <div className="text-5xl font-black italic tracking-tighter text-blue-400 tabular-nums drop-shadow-2xl">
                 {result ? <strong>{result.time}</strong> : <span className="opacity-20">--:--:--</span>}
               </div>
               
               {/* Indicateur de changement de jour */}
               {result && result.days !== 0 && (
                 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 animate-in slide-in-from-top-2 duration-300 ${result.days > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                   {result.days > 0 ? `+${result.days} jour${result.days > 1 ? 's' : ''}` : `${result.days} jour${Math.abs(result.days) > 1 ? 's' : ''}`}
                 </div>
               )}
             </div>
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <History size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Calculs récents</span>
                </div>
                <button onClick={() => setHistory([])} className="hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
              </div>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-white/[0.03] p-4 rounded-2xl border border-white/5 animate-in slide-in-from-top-1">
                    <span className="truncate opacity-50 italic font-medium">{h.split('=')[0]}</span>
                    <span className="text-blue-500 font-black tabular-nums">{h.split('=')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-white/5 border-t border-white/5 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] italic">Calculateur de Service de Nuit • Modulo 24h</p>
        </div>
      </div>
    </div>
  );
};

export default TimeCalculator;
