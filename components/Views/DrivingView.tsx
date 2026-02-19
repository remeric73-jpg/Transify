
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, MessageSquareText, Plus, Minus, UserPlus, UserMinus, RotateCcw, Flag, Timer, BellRing, Users } from 'lucide-react';
import MapComponent from '../MapComponent';
import { BusLine, CourseReport } from '../../types';
import { getDistance } from '../../utils/geoUtils';

interface DrivingViewProps {
  line: BusLine;
  initialHeading: number | null;
  startTimestamp: number;
  onExit: () => void;
  onFinish: (report: CourseReport) => void;
}

interface StopTiming {
  arrival: string;
  departure: string;
  isManual: boolean;
}

const DrivingView: React.FC<DrivingViewProps> = ({ line, initialHeading, startTimestamp, onExit, onFinish }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(initialHeading);
  const [nextStopIdx, setNextStopIdx] = useState(0);
  const [stopTimings, setStopTimings] = useState<StopTiming[]>([]);
  const [boardedCounts, setBoardedCounts] = useState<number[]>([]);
  const [droppedCounts, setDroppedCounts] = useState<number[]>([]);
  const [currentBoarding, setCurrentBoarding] = useState(0);
  const [currentDropped, setCurrentDropped] = useState(0);
  const [capturedArrivalTime, setCapturedArrivalTime] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  
  const wasAtStationRef = useRef(false);
  const alertsPlayedRef = useRef<{ [key: string]: boolean }>({});

  // Fonction pour générer un BIP sonore
  const playBip = useCallback((count = 1) => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      let current = 0;
      const interval = setInterval(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = 880; // La5
        
        const nowTime = audioCtx.currentTime;
        gain.gain.setValueAtTime(0, nowTime);
        gain.gain.linearRampToValueAtTime(0.2, nowTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, nowTime + 0.2);
        
        osc.start(nowTime);
        osc.stop(nowTime + 0.2);
        
        current++;
        if (current >= count) {
          clearInterval(interval);
          setTimeout(() => audioCtx.close(), 500);
        }
      }, 300);
    } catch (e) {
      console.warn("Audio non supporté ou bloqué par le navigateur", e);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    if (!navigator.geolocation) return () => clearInterval(interval);
    const watchId = navigator.geolocation.watchPosition((pos) => {
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (pos.coords.heading !== null) setCurrentHeading(pos.coords.heading);
    }, (err) => console.error(err), { enableHighAccuracy: true });
    return () => { navigator.geolocation.clearWatch(watchId); clearInterval(interval); };
  }, []);

  const currentStop = line.stops[nextStopIdx];
  const isFirstStop = nextStopIdx === 0;
  const isLastStop = nextStopIdx === line.stops.length - 1;

  const distanceRemaining = useMemo(() => (!currentPos || !currentStop) ? null : getDistance(currentPos.lat, currentPos.lng, currentStop.lat, currentStop.lng), [currentPos, currentStop]);
  
  const isAtStation = useMemo(() => distanceRemaining !== null && distanceRemaining <= 20, [distanceRemaining]);

  // Calcul des passagers à bord
  const onBoardAtArrival = useMemo(() => {
    const totalB = boardedCounts.reduce((a, b) => a + b, 0);
    const totalD = droppedCounts.reduce((a, b) => a + b, 0);
    return totalB - totalD;
  }, [boardedCounts, droppedCounts]);

  const currentOnBoard = useMemo(() => {
    return onBoardAtArrival + currentBoarding - currentDropped;
  }, [onBoardAtArrival, currentBoarding, currentDropped]);

  // Automatisme Terminus : Pré-remplissage des descentes
  useEffect(() => {
    if (isLastStop) {
      setCurrentDropped(onBoardAtArrival);
      setCurrentBoarding(0);
    } else {
      setCurrentDropped(0);
      setCurrentBoarding(0);
    }
  }, [isLastStop, onBoardAtArrival]);

  // Logique spécifique pour le compte à rebours du premier arrêt
  const departureInfo = useMemo(() => {
    if (nextStopIdx !== 0 || !currentStop) return null;
    const [h, m] = currentStop.time.split(':').map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(h, m, 0, 0);
    
    const diffInSeconds = Math.floor((scheduled.getTime() - now.getTime()) / 1000);
    
    // Alertes sonores
    if (diffInSeconds === 20 && !alertsPlayedRef.current['20s']) {
      playBip(1);
      alertsPlayedRef.current['20s'] = true;
    } else if (diffInSeconds === 0 && !alertsPlayedRef.current['0s']) {
      playBip(3);
      alertsPlayedRef.current['0s'] = true;
    }

    if (diffInSeconds < -60) return null;

    const absSec = Math.abs(diffInSeconds);
    const mm = Math.floor(absSec / 60).toString().padStart(2, '0');
    const ss = (absSec % 60).toString().padStart(2, '0');
    const countdownStr = `${diffInSeconds < 0 ? '-' : ''}${mm}:${ss}`;

    return {
      secondsRemaining: diffInSeconds,
      countdownStr,
      isImminent: diffInSeconds <= 20 && diffInSeconds > 0,
      isDeparture: diffInSeconds <= 0
    };
  }, [nextStopIdx, currentStop, now, playBip]);

  const scheduleOffset = useMemo(() => {
    if (!currentStop) return 0;
    const [h, m] = currentStop.time.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
    return Math.floor((now.getTime() - scheduled.getTime()) / 60000);
  }, [currentStop, now]);

  const handleNext = useCallback(() => {
    const isManual = capturedArrivalTime === null;
    const arrivalTime = capturedArrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const departureTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const timings = [...stopTimings, { arrival: arrivalTime, departure: departureTime, isManual }];
    const boarded = [...boardedCounts, currentBoarding];
    const dropped = [...droppedCounts, currentDropped];

    setStopTimings(timings);
    setBoardedCounts(boarded);
    setDroppedCounts(dropped);
    setCurrentBoarding(0);
    setCurrentDropped(0);
    setCapturedArrivalTime(null);
    wasAtStationRef.current = false;

    if (nextStopIdx < line.stops.length - 1) {
      setNextStopIdx(prev => prev + 1);
    } else {
      const finalNow = Date.now();
      const totalSeconds = Math.floor((finalNow - startTimestamp) / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      const durationParts = [];
      if (h > 0) durationParts.push(`${h}h`);
      if (m > 0) durationParts.push(`${m}min`);
      if (s > 0 || durationParts.length === 0) durationParts.push(`${s}s`);
      const finalDuration = durationParts.join(' ');
      
      onFinish({ 
        date: new Date().toLocaleDateString('fr-FR'),
        lineName: line.name, 
        lineNumber: line.number, 
        startTime: new Date(startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        endTime: new Date(finalNow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        duration: finalDuration, 
        stops: line.stops.map((s, idx) => {
          const [schH, schM] = s.time.split(':').map(Number); 
          const currentTiming = timings[idx];
          const [actH, actM] = (currentTiming?.arrival || "00:00").split(':').map(Number);
          const d = (actH * 60 + actM) - (schH * 60 + schM);
          
          return { 
            stopName: s.name, 
            scheduledTime: s.time, 
            actualArrivalTime: currentTiming?.arrival || "--:--:--", 
            actualDepartureTime: currentTiming?.departure || "--:--:--",
            isManual: currentTiming?.isManual || false,
            status: d > 2 ? 'late' : d < 0 ? 'early' : 'on-time', 
            diffMinutes: d,
            boardedCount: boarded[idx] || 0, 
            droppedCount: dropped[idx] || 0 
          };
        }) 
      });
    }
  }, [nextStopIdx, line, stopTimings, boardedCounts, droppedCounts, currentBoarding, currentDropped, capturedArrivalTime, onFinish, startTimestamp]);

  useEffect(() => {
    if (isAtStation) { 
      wasAtStationRef.current = true; 
      if (!capturedArrivalTime) setCapturedArrivalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); 
    }
    else if (wasAtStationRef.current && distanceRemaining !== null && distanceRemaining > 20) handleNext();
  }, [isAtStation, distanceRemaining, capturedArrivalTime, handleNext]);

  return (
    <div className="fixed inset-0 bg-[#080b14] text-white flex flex-col z-[500] safe-top safe-bottom print:hidden">
      <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-hidden relative max-w-5xl mx-auto w-full">
        {/* Bandeau supérieur rééquilibré */}
        <div className="flex gap-3 h-[10%] sm:h-20 shrink-0">
          <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-center border transition-colors ${scheduleOffset < 0 ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' : scheduleOffset > 2 ? 'bg-rose-950/20 border-rose-500/30 text-rose-400' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'}`}>
            <span className="text-[8px] font-black uppercase tracking-widest">{scheduleOffset < 0 ? 'Avance' : scheduleOffset > 2 ? 'Retard' : 'Ponctuel'}</span>
            <div className="flex items-baseline gap-1"><span className="text-2xl font-black italic">{scheduleOffset === 0 ? 'Ok' : scheduleOffset > 0 ? `+${scheduleOffset}` : scheduleOffset}</span><span className="text-[10px] opacity-50 font-bold">min</span></div>
          </div>
          
          <div className="flex-1 rounded-3xl p-4 flex flex-col justify-center bg-[#10162a] border border-white/5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Flag size={12} /> Distance</span>
            <span className="text-xl font-black italic text-slate-200">{distanceRemaining === null ? '--' : (distanceRemaining < 1000 ? `${Math.round(distanceRemaining)} m` : `${(distanceRemaining / 1000).toFixed(1)} km`)}</span>
          </div>

          <button onClick={() => window.confirm("Annuler le service ?") && onExit()} className="flex-[0.4] rounded-3xl p-4 flex flex-col items-center justify-center bg-white/5 border border-white/10 shrink-0"><RotateCcw size={18} className="text-slate-400" /></button>
        </div>
        
        <div className="flex-1 relative rounded-[48px] overflow-hidden border border-white/10 bg-[#0a0d18]">
          <MapComponent stops={line.stops} currentPos={currentPos} heading={currentHeading} dark isDriving height="100%" showStaticRouteOnly={true} />
          
          {departureInfo && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none">
              <div className={`flex flex-col items-center gap-1 p-4 rounded-[24px] border-2 shadow-2xl backdrop-blur-md transition-all duration-300 ${departureInfo.secondsRemaining <= 0 ? 'bg-emerald-600/90 border-emerald-400' : departureInfo.isImminent ? 'bg-amber-600/90 border-amber-400 scale-110' : 'bg-blue-600/80 border-blue-400'}`}>
                <div className="flex items-center gap-2">
                  {departureInfo.secondsRemaining <= 0 ? <BellRing size={16} className="animate-bounce" /> : <Timer size={16} className={departureInfo.isImminent ? 'animate-pulse' : ''} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {departureInfo.isDeparture ? 'DÉPART' : departureInfo.isImminent ? 'DÉPART IMMINENT' : 'DÉPART DANS'}
                  </span>
                </div>
                <span className="text-4xl font-black italic tabular-nums leading-none tracking-tighter">
                  {departureInfo.countdownStr}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={`transition-all rounded-[40px] p-5 flex items-center justify-between shadow-2xl shrink-0 ${
          isAtStation 
            ? scheduleOffset < 0 
              ? 'bg-orange-900/40 border-orange-500 border' 
              : scheduleOffset > 2 
                ? 'bg-rose-900/40 border-rose-500 border' 
                : 'bg-emerald-900/40 border-emerald-500 border' 
            : 'bg-[#10162a] border-white/10 border'
        }`}>
          <div className="flex gap-4 items-center min-w-0">
            <div className="w-14 h-14 rounded-[20px] bg-blue-600 flex items-center justify-center font-black italic shrink-0"><span className="text-2xl">{line.number}</span></div>
            <div className="flex flex-col min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                isAtStation 
                  ? scheduleOffset < 0 
                    ? 'text-orange-400' 
                    : scheduleOffset > 2 
                      ? 'text-rose-400' 
                      : 'text-emerald-400' 
                  : 'text-blue-500'
              }`}>{isAtStation ? (isLastStop ? 'Terminus' : 'Arrêt en cours') : 'Prochain arrêt'}</span>
              <h2 className="text-2xl font-black uppercase italic truncate leading-none">{currentStop?.name}</h2>
              {currentStop?.annotation && <div className="flex items-center gap-1 mt-1 opacity-80"><MessageSquareText size={10} className="text-blue-400 shrink-0" /><span className="text-[10px] font-bold text-slate-400 truncate leading-none uppercase">{currentStop.annotation}</span></div>}
            </div>
          </div>
          <div className="text-3xl font-black italic text-slate-200 tabular-nums">{currentStop?.time}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          {/* Tuile MONTÉES */}
          <div className={`bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3 transition-opacity ${isLastStop ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2"><div className="bg-emerald-600/20 p-1.5 rounded-lg text-emerald-400"><UserPlus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montées</span></div>
            <div className="flex items-center justify-between">
              <button 
                disabled={isLastStop}
                onClick={() => setCurrentBoarding(Math.max(0, currentBoarding - 1))} 
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                <Minus size={18} />
              </button>
              <div className="text-2xl font-black italic text-emerald-400 tabular-nums">{currentBoarding}</div>
              <button 
                disabled={isLastStop}
                onClick={() => setCurrentBoarding(currentBoarding + 1)} 
                className="w-10 h-10 rounded-xl bg-emerald-600 shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Tuile DESCENTES */}
          <div className={`bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3 transition-opacity ${isFirstStop ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2"><div className="bg-rose-600/20 p-1.5 rounded-lg text-rose-400"><UserMinus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descentes</span></div>
            <div className="flex items-center justify-between">
              <button 
                disabled={isFirstStop}
                onClick={() => setCurrentDropped(Math.max(0, currentDropped - 1))} 
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                <Minus size={18} />
              </button>
              <div className="text-2xl font-black italic text-rose-400 tabular-nums">{currentDropped}</div>
              <button 
                disabled={isFirstStop || currentOnBoard <= 0}
                onClick={() => setCurrentDropped(currentDropped + 1)} 
                className="w-10 h-10 rounded-xl bg-rose-600 shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Barre inférieure avec tuile "À bord" déplacée à droite du bouton Valider */}
        <div className="flex gap-3 h-[12%] sm:h-20 shrink-0 pb-2 sm:max-w-md sm:mx-auto sm:w-full items-stretch">
          <button onClick={() => setNextStopIdx(p => Math.max(0, p - 1))} className="flex-[0.5] bg-white/5 rounded-[32px] border border-white/5 flex items-center justify-center text-slate-600 active:scale-90 transition-all">
            <ChevronLeft size={28} />
          </button>
          
          <button onClick={handleNext} className={`flex-[2] border-b-[8px] rounded-[32px] font-black uppercase italic text-lg shadow-2xl active:scale-95 transition-all ${nextStopIdx === line.stops.length - 1 ? 'bg-rose-600 border-rose-800' : 'bg-blue-600 border-blue-800'}`}>
            {nextStopIdx === line.stops.length - 1 ? 'Terminer' : 'Valider'}
          </button>

          <div className="flex-1 bg-[#10162a] border border-blue-500/20 rounded-[32px] flex flex-col items-center justify-center px-4">
             <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 mb-0.5"><Users size={10} /> À bord</span>
             <span className="text-2xl font-black italic text-white leading-none tabular-nums">{currentOnBoard}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrivingView;
