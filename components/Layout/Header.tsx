
import React, { useState, useEffect } from 'react';
import { Clock, Smartphone, Tablet, Monitor, BusFront, Calculator, Users } from 'lucide-react';

interface HeaderProps {
  screenType: string;
  onOpenCalculator?: () => void;
  onOpenPassengerCounter?: () => void;
}

const LogoEmblem: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <div className="relative flex items-center justify-center bg-white rounded-full border-2 border-blue-400 p-1.5 shadow-inner">
    <BusFront size={size} className="text-blue-600" />
    <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white flex items-center justify-center">
      <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
    </div>
  </div>
);

const Header: React.FC<HeaderProps> = ({ screenType, onOpenCalculator, onOpenPassengerCounter }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-[100] safe-top shrink-0 print:hidden">
      <div className="flex items-center gap-3">
        <LogoEmblem size={20} />
        <div className="flex flex-col">
          <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">GEOligne</h1>
          <span className="text-[7px] font-bold opacity-80 uppercase tracking-widest mt-0.5">Votre réseau, bien orienté by Mrico73</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onOpenPassengerCounter}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all active:scale-90 flex items-center justify-center shadow-inner"
          title="Compteur Passagers"
        >
          <Users size={18} />
        </button>
        <button 
          onClick={onOpenCalculator}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all active:scale-90 flex items-center justify-center shadow-inner"
          title="Calculateur Temporel"
        >
          <Calculator size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-black bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 uppercase italic tracking-widest">
          {screenType === 'Mobile' ? <Smartphone size={12} /> : screenType === 'Tablette' ? <Tablet size={12} /> : <Monitor size={12} />}
          {screenType}
        </div>
        <div className="flex items-center gap-2 text-sm font-mono font-black bg-white/10 px-4 py-2 rounded-2xl border border-white/10 tabular-nums shrink-0">
          <Clock size={16} className="text-blue-200" /> {currentTime}
        </div>
      </div>
    </div>
  );
};

export default Header;
