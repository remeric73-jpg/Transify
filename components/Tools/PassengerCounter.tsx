
import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserPlus, UserMinus, RotateCcw, Settings2 } from 'lucide-react';

interface PassengerCounterProps {
  isOpen: boolean;
  onClose: () => void;
}

const PassengerCounter: React.FC<PassengerCounterProps> = ({ isOpen, onClose }) => {
  const [capacity, setCapacity] = useState<number>(50);
  const [count, setCount] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Logique de couleur dynamique
  const getStatusColor = () => {
    const remaining = capacity - count;
    if (count >= capacity) return 'text-emerald-500'; // Complet
    if (remaining <= 5) return 'text-rose-500';      // Alerte critique
    if (remaining <= 10) return 'text-orange-500';    // Alerte proche
    return 'text-blue-400';                          // Standard
  };

  const getStatusLabel = () => {
    const remaining = capacity - count;
    if (count >= capacity) return 'Véhicule Complet';
    if (count === 0) return 'Véhicule Vide';
    return `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
  };

  // Correction : Limitation à la capacité maximale
  const increment = () => setCount(prev => Math.min(prev + 1, capacity));
  const decrement = () => setCount(prev => Math.max(0, prev - 1));
  const reset = () => { if(window.confirm("Réinitialiser le compteur ?")) setCount(0); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Modale */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-2xl text-blue-500">
              <Users size={22} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xs font-black uppercase italic tracking-widest text-white leading-none">Compteur Passagers</h2>
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gestion de flux et capacité</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
              className={`p-2 rounded-full transition-colors active:scale-90 ${isSettingsOpen ? 'bg-blue-600/20 text-blue-500' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <Settings2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors active:scale-90">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corps de la Modale */}
        <div className="p-8 space-y-8">
          
          {/* Section Réglages Capacité */}
          {isSettingsOpen && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacité du véhicule</span>
                <span className="text-sm font-black text-blue-500 tabular-nums">{capacity}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="120" 
                value={capacity} 
                onChange={(e) => {
                  const newCap = parseInt(e.target.value);
                  setCapacity(newCap);
                  // Ajuster le compte si la nouvelle capacité est inférieure au compte actuel
                  if (count > newCap) setCount(newCap);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-2 text-[8px] font-bold text-slate-600 uppercase">
                <span>1 place</span>
                <span>120 places</span>
              </div>
            </div>
          )}

          {/* Affichage Central */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0f172a] border border-white/5 rounded-[40px] p-10 flex flex-col items-center justify-center space-y-4 min-h-[220px] relative overflow-hidden shadow-inner">
             <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none"></div>
             
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">Passagers à bord</span>
             
             <div className={`text-8xl font-black italic tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-500 ${getStatusColor()}`}>
               {count}
             </div>

             <div className="flex flex-col items-center gap-2 relative z-10 pt-2">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${count >= capacity ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                 {getStatusLabel()}
               </span>
             </div>

             <button 
               onClick={reset}
               className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-rose-500 transition-colors"
               title="Réinitialiser"
             >
               <RotateCcw size={16} />
             </button>
          </div>

          {/* Boutons d'Action Rapide */}
          <div className="flex gap-4 items-stretch">
            <button 
              onClick={decrement}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 p-6 rounded-[32px] flex items-center justify-center active:scale-95 transition-all"
            >
              <UserMinus size={32} />
            </button>
            <button 
              onClick={increment}
              disabled={count >= capacity}
              className={`flex-[2.5] p-6 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 group ${count >= capacity ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
            >
              <UserPlus size={36} strokeWidth={2.5} />
              <span className="text-2xl font-black italic uppercase tracking-tighter">Entrée</span>
            </button>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-white/5 border-t border-white/5 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] italic">Outil de comptage GEOligne • Sécurité & Capacité</p>
        </div>
      </div>
    </div>
  );
};

export default PassengerCounter;
