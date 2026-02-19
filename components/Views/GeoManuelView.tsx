
import React, { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, Play, CircleDot, LogOut, Minus, Plus, UserPlus, UserMinus, Users } from 'lucide-react';
import MapComponent from '../MapComponent';
import { ManualStop, ManualReport } from '../../types';

interface GeoManuelViewProps {
  onExit: () => void;
  onFinish: (report: ManualReport) => void;
}

const GeoManuelView: React.FC<GeoManuelViewProps> = ({ onExit, onFinish }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [boardedTotal, setBoardedTotal] = useState(0);
  const [droppedTotal, setDroppedTotal] = useState(0);
  const [stops, setStops] = useState<ManualStop[]>([]);
  const [currentStopBoarded, setCurrentStopBoarded] = useState(0);
  const [currentStopDropped, setCurrentStopDropped] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.heading !== null) setCurrentHeading(pos.coords.heading);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const isFirstStop = stops.length === 0;

  // Calcul dynamique des passagers actuellement à bord
  const currentOnBoard = useMemo(() => {
    const total = (boardedTotal + currentStopBoarded) - (droppedTotal + currentStopDropped);
    return Math.max(0, total);
  }, [boardedTotal, currentStopBoarded, droppedTotal, currentStopDropped]);

  const handleStart = () => { 
    setIsRunning(true); 
    setStartTime(new Date()); 
    setStops([]); 
    setBoardedTotal(0); 
    setDroppedTotal(0); 
    setCurrentStopBoarded(0);
    setCurrentStopDropped(0);
  };
  
  const handleValidateStop = () => {
    if (!currentPos) return;
    const newStop: ManualStop = { 
      id: stops.length + 1, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      lat: currentPos.lat, 
      lng: currentPos.lng, 
      boarded: currentStopBoarded, 
      dropped: currentStopDropped 
    };
    setStops(prev => [...prev, newStop]);
    setBoardedTotal(prev => prev + currentStopBoarded);
    setDroppedTotal(prev => prev + currentStopDropped);
    setCurrentStopBoarded(0);
    setCurrentStopDropped(0);
  };

  const handleFinish = () => {
    if (!startTime) return;
    const endTime = new Date();
    const diff = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    
    let finalStops = [...stops];
    let finalTotalBoarded = boardedTotal;
    let finalTotalDropped = droppedTotal;

    // Logique d'auto-remplissage du terminus
    if (finalStops.length > 0) {
      const lastIdx = finalStops.length - 1;
      const lastStop = finalStops[lastIdx];
      
      // Calcul des passagers à bord AVANT la descente du dernier arrêt validé
      // (Total montées - total descentes des arrêts précédents)
      const totalDroppedBeforeLast = finalTotalDropped - lastStop.dropped;
      const onBoardAtLastArrival = finalTotalBoarded - totalDroppedBeforeLast;
      
      // Si aucune descente n'a été saisie au dernier point alors qu'il reste du monde
      if (lastStop.dropped === 0 && onBoardAtLastArrival > 0) {
        const autoDropped = onBoardAtLastArrival;
        finalTotalDropped = totalDroppedBeforeLast + autoDropped;
        finalStops[lastIdx] = { ...lastStop, dropped: autoDropped };
      }
    }

    // Fix error in file components/Views/GeoManuelView.tsx on line 98
    // Added required 'date' property to satisfy ManualReport interface
    onFinish({ 
      date: new Date().toLocaleDateString('fr-FR'),
      startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      duration: `${Math.floor(diff/60)}h ${diff%60}min`, 
      totalBoarded: finalTotalBoarded, 
      totalDropped: finalTotalDropped, 
      stops: finalStops, 
      trace: [] 
    });
  };

  return (
    <div className="fixed inset-0 bg-[#080b14] text-white flex flex-col z-[500] safe-top safe-bottom print:hidden">
      <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-hidden relative max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-3xl p-4 shrink-0">
           <div className="flex items-center gap-3">
             <div className="bg-slate-800 p-2 rounded-xl text-blue-400"><MapIcon size={20} /></div>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none">Traçage Manuel</span>
               <span className="text-lg font-black italic uppercase leading-none mt-1">{isRunning ? "En cours..." : "En attente"}</span>
             </div>
           </div>
           <button onClick={onExit} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase active:scale-95 transition-all">Quitter</button>
        </div>

        <div className="flex-1 relative rounded-[48px] overflow-hidden border border-white/10 bg-[#0a0d18]">
          <MapComponent stops={stops.map((s, i) => ({ id: s.id.toString(), name: `Pt ${i+1}`, time: s.time, lat: s.lat, lng: s.lng }))} currentPos={currentPos} heading={currentHeading} dark isDriving height="100%" />
        </div>

        <div className="flex flex-col gap-3 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          {/* Tuile PASSAGERS À BORD */}
          <div className="bg-[#10162a] border border-blue-500/20 rounded-[32px] p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400">
                <Users size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Passagers</span>
                <span className="text-[9px] font-bold uppercase text-blue-500/50 tracking-tighter">Actuellement à bord</span>
              </div>
            </div>
            <div className="text-3xl font-black italic text-white tabular-nums drop-shadow-md">
              {isRunning ? currentOnBoard : '--'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tuile MONTÉES */}
            <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600/20 p-1.5 rounded-lg text-emerald-400"><UserPlus size={16} /></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montées</span>
              </div>
              <div className="flex items-center justify-between">
                <button 
                  disabled={!isRunning} 
                  onClick={() => setCurrentStopBoarded(Math.max(0, currentStopBoarded - 1))} 
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
                >
                  <Minus size={18} />
                </button>
                <div className="text-2xl font-black italic text-emerald-400 tabular-nums">{currentStopBoarded}</div>
                <button 
                  disabled={!isRunning} 
                  onClick={() => setCurrentStopBoarded(currentStopBoarded + 1)} 
                  className="w-10 h-10 rounded-xl bg-emerald-600 shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Tuile DESCENTES */}
            <div className={`bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3 transition-opacity ${isFirstStop ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="bg-rose-600/20 p-1.5 rounded-lg text-rose-400"><UserMinus size={16} /></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descentes</span>
              </div>
              <div className="flex items-center justify-between">
                <button 
                  disabled={!isRunning || isFirstStop} 
                  onClick={() => setCurrentStopDropped(Math.max(0, currentStopDropped - 1))} 
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
                >
                  <Minus size={18} />
                </button>
                <div className="text-2xl font-black italic text-rose-400 tabular-nums">{currentStopDropped}</div>
                <button 
                  disabled={!isRunning || isFirstStop || currentOnBoard <= 0} 
                  onClick={() => setCurrentStopDropped(currentStopDropped + 1)} 
                  className="w-10 h-10 rounded-xl bg-rose-600 shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[12%] sm:h-20 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          {!isRunning ? (
            <button onClick={handleStart} className="w-full h-full bg-blue-600 border-b-[8px] border-blue-800 rounded-[32px] flex items-center justify-center gap-4 active:translate-y-1 shadow-2xl transition-all">
              <Play size={24} fill="currentColor" />
              <span className="text-xl font-black italic uppercase tracking-tight">Début de course</span>
            </button>
          ) : (
            <div className="flex gap-4 h-full">
              <button onClick={handleValidateStop} className="flex-[2] bg-emerald-600 border-b-[8px] border-emerald-800 rounded-[32px] flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all">
                <CircleDot size={20} className="mb-1" />
                <span className="text-sm font-black italic uppercase tracking-tight">Valider Arrêt</span>
              </button>
              <button onClick={handleFinish} className="flex-1 bg-rose-600 border-b-[8px] border-rose-800 rounded-[32px] flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all">
                <LogOut size={20} className="mb-1" />
                <span className="text-sm font-black italic uppercase tracking-tight">Fin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeoManuelView;
