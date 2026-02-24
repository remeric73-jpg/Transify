
import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Clock, PlayCircle, Info, Hourglass, Diamond } from 'lucide-react';
import MapComponent from '../MapComponent';
import { BusLine } from '../../types';
import { getDistance } from '../../utils/geoUtils';

interface PrepViewProps {
  line: BusLine;
  userLocation: { lat: number; lng: number } | null;
  heading: number | null;
  onCancel: () => void;
  onArrived: () => void;
}

const PrepView: React.FC<PrepViewProps> = ({ line, userLocation, heading, onCancel, onArrived }) => {
  const [routeMeta, setRouteMeta] = useState<{ distance: number; duration: number } | null>(null);
  const firstStop = line.stops[0];
  
  const prepStops = useMemo(() => [firstStop], [firstStop]);

  useEffect(() => {
    // Détection à 20m
    if (userLocation && getDistance(userLocation.lat, userLocation.lng, firstStop.lat, firstStop.lng) <= 20) {
      onArrived();
    }
  }, [userLocation, firstStop, onArrived]);

  const stats = useMemo(() => {
    if (!userLocation) return null;
    const durationSeconds = routeMeta?.duration || (getDistance(userLocation.lat, userLocation.lng, firstStop.lat, firstStop.lng) / 11);
    const etaDate = new Date(new Date().getTime() + durationSeconds * 1000);
    const [h, m] = firstStop.time.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
    const marginMin = Math.round((scheduled.getTime() - etaDate.getTime()) / 60000);
    return { 
      eta: etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      margin: marginMin, 
      hlp: Math.round(durationSeconds / 60),
      distance: (getDistance(userLocation.lat, userLocation.lng, firstStop.lat, firstStop.lng) / 1000).toFixed(1)
    };
  }, [userLocation, firstStop, routeMeta]);

  return (
    <div className="fixed inset-0 bg-[#0b0e1a] text-white z-[500] flex flex-col safe-top safe-bottom p-4 space-y-4 overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#161b2e]/50 border border-white/5 rounded-[24px] p-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563eb] p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Activity size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-[#3b82f6] tracking-[0.1em] leading-none">Navigation vers départ</span>
            <span className="text-xl font-black italic uppercase leading-none mt-1 tracking-tighter">{firstStop.name}</span>
          </div>
        </div>
        <button 
          onClick={onCancel} 
          className="bg-[#252a3d] text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
        >
          Quitter
        </button>
      </div>
      
      {/* MAP */}
      <div className="flex-1 rounded-[40px] overflow-hidden border border-white/5 relative shadow-2xl">
        <MapComponent 
          stops={prepStops} 
          currentPos={userLocation} 
          heading={heading}
          onRouteInfo={setRouteMeta} 
          dark 
          isDriving 
          height="100%" 
          hideRoute={true} 
        />
      </div>

      {/* DÉPART PRÉVU */}
      <div className="bg-[#062c24]/80 border border-[#10b981]/20 p-5 rounded-[32px] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-[#10b981]/20 p-3 rounded-2xl">
            <Clock size={24} className="text-[#10b981]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-[#10b981] uppercase tracking-[0.15em] mb-0.5">Départ prévu</span>
            <span className="text-[9px] font-bold text-[#10b981]/60 uppercase tracking-widest">Heure de départ de la ligne</span>
          </div>
        </div>
        <span className="text-4xl font-black italic text-[#10b981] tabular-nums tracking-tighter">{firstStop.time}</span>
      </div>

      {/* ESTIMATION CARD */}
      <div className="bg-[#161b2e] border border-white/5 rounded-[40px] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.2em] block mb-2 w-full text-left">Heure d'arrivée estimée</span>
          <div className="flex items-center gap-4 w-full">
            <span className="text-7xl font-black italic tracking-tighter tabular-nums block leading-none">{stats?.eta || '--:--'}</span>
            
            {/* BADGES CONDITIONNELS */}
            {stats && (
              <>
                {stats.margin < 0 && (
                  <div className="bg-[#4c1d24] border border-[#f43f5e] px-3 py-1 rounded-xl">
                    <span className="text-[10px] font-black text-[#f43f5e] uppercase italic tracking-widest">Retard</span>
                  </div>
                )}
                {stats.margin === 0 && (
                  <div className="bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-xl">
                    <span className="text-[10px] font-black text-blue-400 uppercase italic tracking-widest">À l'heure</span>
                  </div>
                )}
                {stats.margin > 0 && (
                  <div className="bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">En avance</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="mt-6 bg-blue-600/10 border border-blue-500/20 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-inner">
            <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.1em] italic">Trajet HLP estimé :</span>
            <span className="text-sm font-black italic text-white tabular-nums">{stats?.hlp || '--'} min</span>
          </div>
        </div>

        <div className="h-px bg-white/5 w-full"></div>

        <div className="flex justify-between items-center">
          <div className="flex gap-8">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Diamond size={10} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Distance</span>
              </div>
              <div className="text-xl font-black italic tracking-tighter tabular-nums">
                {stats?.distance || '--'} <span className="text-[10px] not-italic font-bold ml-0.5 opacity-60">km</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Hourglass size={10} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Marge</span>
              </div>
              <div className={`text-xl font-black italic tracking-tighter tabular-nums ${stats?.margin && stats.margin < 0 ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>
                {stats?.margin !== undefined ? (stats.margin > 0 ? `+${stats.margin}` : stats.margin) : '--'} <span className="text-[10px] not-italic font-bold ml-0.5 opacity-60">min</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onArrived} 
            className="bg-[#2563eb] hover:bg-[#3b82f6] text-white px-5 py-3 rounded-[20px] font-black uppercase italic flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <PlayCircle size={22} />
            <span className="text-sm tracking-tighter">Arrivé</span>
          </button>
        </div>
      </div>

      {/* INFO FOOTER */}
      <div className="bg-[#1c1614] border border-[#f59e0b]/20 p-4 rounded-[24px] flex items-center gap-4 shrink-0">
        <div className="bg-[#f59e0b]/10 p-2 rounded-xl">
          <Info size={18} className="text-[#f59e0b]" />
        </div>
        <p className="text-[11px] font-bold text-[#f59e0b]/80 leading-tight italic">
          Les temps de trajet sont donnés à titre indicatif ; il est conseillé d'anticiper votre HLP.
        </p>
      </div>
    </div>
  );
};

export default PrepView;
