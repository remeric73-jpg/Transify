
import React, { useMemo } from 'react';
import { CheckCircle2, Home, UserPlus, UserMinus, FileText, Clock, TrendingUp, TrendingDown, ShieldCheck, CircleX, MapPin, Hand, Users, Timer, FastForward } from 'lucide-react';
import { CourseReport } from '../../types';

interface SummaryViewProps {
  report: CourseReport;
  onClose: () => void;
  onExportPDF: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ report, onClose, onExportPDF }) => {
  const totalBoarded = report.stops.reduce((acc, s) => acc + (s.boardedCount || 0), 0);
  const printDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const avgDelay = useMemo(() => {
    const servedStops = report.stops.filter(s => s.status !== 'not-served');
    if (servedStops.length === 0) return 0;
    const totalDiff = servedStops.reduce((acc, s) => acc + s.diffMinutes, 0);
    return Math.round(totalDiff / servedStops.length);
  }, [report.stops]);

  const displayDuration = useMemo(() => {
    let diffInSeconds = 0;
    
    try {
      const parseToSeconds = (t: string) => {
        const parts = t.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return parts[0] * 3600 + parts[1] * 60;
      };

      if (report.startTime && report.endTime) {
          diffInSeconds = parseToSeconds(report.endTime) - parseToSeconds(report.startTime);
          if (diffInSeconds < 0) diffInSeconds += 86400; 
      } else if (report.duration) {
          const hMatch = report.duration.match(/(\d+)h/);
          const mMatch = report.duration.match(/(\d+)min/);
          const sMatch = report.duration.match(/(\d+)s/);
          
          diffInSeconds = (hMatch ? parseInt(hMatch[1]) * 3600 : 0) + 
                          (mMatch ? parseInt(mMatch[1]) * 60 : 0) + 
                          (sMatch ? parseInt(sMatch[1]) : 0);
      }

      const h = Math.floor(diffInSeconds / 3600);
      const m = Math.floor((diffInSeconds % 3600) / 60);
      const s = diffInSeconds % 60;
      
      const parts = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}min`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      
      return parts.join(' ');
    } catch (e) {
      return report.duration || "0s";
    }
  }, [report.duration, report.startTime, report.endTime]);

  const pdfColumns = useMemo(() => {
    const count = report.stops.length;
    if (count <= 8) return 1;
    if (count <= 18) return 2;
    return 3;
  }, [report.stops.length]);

  const getDwellTimeFull = (arrival: string, departure: string) => {
    if (arrival.includes('--') || departure.includes('--')) return null;
    const aParts = arrival.split(':').map(Number);
    const dParts = departure.split(':').map(Number);
    
    const aSec = aParts[0] * 3600 + aParts[1] * 60 + (aParts[2] || 0);
    const dSec = dParts[0] * 3600 + dParts[1] * 60 + (dParts[2] || 0);
    
    const diff = dSec - aSec;
    if (diff < 0) return null;
    
    if (diff < 60) return `${diff}s`;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-[#05070a] text-white overflow-hidden print:bg-white print:text-slate-900 print:h-auto print:overflow-visible">
      <style>{`
        @media print {
          html, body, #root, .app-container, .main-content-wrapper {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }
          .summary-print-container { padding: 8mm 12mm !important; }
          .dynamic-report-columns {
            display: block !important;
            columns: ${pdfColumns} !important;
            column-gap: 20px !important;
          }
          .report-item-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 10px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 8px !important;
          }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] print:overflow-visible print:h-auto">
        <div className="p-6 sm:p-10 space-y-8 pb-10 max-w-5xl mx-auto w-full print:max-w-none print:p-0 print:pb-10 summary-print-container">
          
          <div className="flex justify-between items-center print:hidden">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><ShieldCheck size={32} className="text-emerald-500" /></div>
            <button onClick={onClose} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all">
              <Home size={16} /> Retour Accueil
            </button>
          </div>
          
          <div className="space-y-2 print:text-center print:mb-10">
            <div className="flex items-baseline gap-3 print:justify-center">
              <span className="text-blue-500 font-black text-6xl italic tabular-nums leading-none tracking-tighter print:text-4xl">{report.lineNumber}</span>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none print:text-2xl print:not-italic">{report.lineName}</h2>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] print:text-slate-400">Rapport de service • {report.date} • {report.startTime} - {report.endTime}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-5 space-y-1 print:bg-slate-50 print:border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-slate-500" />
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Temps total</div>
              </div>
              <div className="text-2xl font-black italic text-white print:text-slate-900">{displayDuration}</div>
            </div>
            
            <div className={`bg-white/5 border border-white/10 rounded-[32px] p-5 space-y-1 print:bg-slate-50 print:border-slate-200`}>
               <div className="flex items-center gap-2 mb-1">
                 <Timer size={14} className="text-slate-500" />
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ponctualité moy.</div>
               </div>
               <div className={`text-2xl font-black italic flex items-center gap-2 ${avgDelay > 2 ? 'text-rose-500' : avgDelay < -2 ? 'text-blue-400' : 'text-emerald-400'} print:text-slate-900`}>
                  {avgDelay === 0 ? 'Ok' : avgDelay > 0 ? `+${avgDelay}m` : `${avgDelay}m`}
               </div>
            </div>

            <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[32px] p-5 space-y-1 col-span-2 lg:col-span-1 print:bg-emerald-50 print:border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-emerald-400" />
                <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Passagers total</div>
              </div>
              <div className="text-2xl font-black italic text-emerald-400 print:text-emerald-700">{totalBoarded}</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden print:border-none print:bg-transparent">
            <div className="bg-white/5 p-6 border-b border-white/10 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-blue-500" />
                <span className="text-xs font-black uppercase tracking-widest italic text-slate-300">Détails par station</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tabular-nums">{report.stops.length} POINTS</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 print:block dynamic-report-columns print:p-0">
              {report.stops.map((stop, i) => {
                const dwell = getDwellTimeFull(stop.actualArrivalTime, stop.actualDepartureTime || "--:--:--");
                const isNotServed = stop.status === 'not-served';
                const isFirst = i === 0;
                const isLast = i === report.stops.length - 1;
                
                return (
                  <div key={i} className={`flex flex-col border-b border-white/5 pb-6 last:border-0 report-item-print ${isNotServed ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col mb-3 gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-black text-blue-600 text-[10px] tabular-nums shrink-0">[{i + 1}]</span>
                        <span className={`font-black uppercase italic tracking-tight text-base truncate ${isNotServed ? 'text-slate-500 line-through' : 'text-white print:text-slate-900'}`}>
                          {stop.stopName}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 ml-6">
                        {isNotServed ? (
                          <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                            <CircleX size={10} className="text-rose-500" />
                            <span className="text-[8px] font-black text-rose-500 uppercase">Non Desservi</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              <MapPin size={10} className="text-emerald-500" />
                              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Desservi</span>
                            </div>
                            {stop.isManual && (
                              <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                                <Hand size={10} className="text-amber-500" />
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Saisie Manuelle</span>
                              </div>
                            )}
                            {stop.skippedStop && (
                              <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/40 px-2 py-0.5 rounded-lg">
                                <FastForward size={10} className="text-indigo-400" />
                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Passage sans arrêt</span>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${stop.status === 'late' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : stop.status === 'early' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                              {stop.status === 'late' ? <TrendingUp size={10} /> : stop.status === 'early' ? <TrendingDown size={10} /> : <CheckCircle2 size={10} />}
                              <span className="text-[8px] font-black uppercase tracking-tighter">
                                ARR: {stop.status === 'on-time' ? "H" : stop.status === 'late' ? `+${stop.diffMinutes}m` : `${stop.diffMinutes}m`}
                              </span>
                            </div>
                            {stop.departureStatus && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${stop.departureStatus === 'late' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : stop.departureStatus === 'early' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                                {stop.departureStatus === 'late' ? <TrendingUp size={10} /> : stop.departureStatus === 'early' ? <TrendingDown size={10} /> : <CheckCircle2 size={10} />}
                                <span className="text-[8px] font-black uppercase tracking-tighter">
                                  DEP: {stop.departureStatus === 'on-time' ? "H" : stop.departureStatus === 'late' ? `+${stop.diffDepartureMinutes}m` : `${stop.diffDepartureMinutes}m`}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className={`grid grid-cols-12 gap-0 p-4 rounded-3xl transition-colors ${isNotServed ? 'bg-white/5 grayscale' : 'bg-white/[0.04] border border-white/5'} print:bg-slate-50 print:border-slate-100`}>
                      <div className="col-span-5 flex flex-col justify-center space-y-2 pr-3">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Passage</span>
                          <span className={`text-base font-black italic tabular-nums leading-none ${isNotServed ? 'text-slate-600' : 'text-slate-100 print:text-slate-900'}`}>{stop.actualArrivalTime}</span>
                          <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Prévu: {stop.scheduledTime}</span>
                        </div>
                        <div className="flex flex-col pt-1 border-t border-white/5">
                           <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Départ</span>
                           <span className="text-[11px] font-black italic tabular-nums text-slate-300 print:text-slate-600">{stop.actualDepartureTime || '--:--:--'}</span>
                        </div>
                      </div>

                      <div className="col-span-7 flex flex-col gap-2 border-l border-white/10 pl-4 print:border-slate-200">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Flux Passagers</span>
                        
                        <div className="flex items-center gap-2">
                           {!isLast && (
                             <div className="flex-1 flex items-center justify-between bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20 shadow-sm print:bg-emerald-50 print:text-emerald-700 print:border-emerald-200">
                                <div className="flex flex-col">
                                  <span className="text-[6px] font-black uppercase opacity-60">Montées</span>
                                  <span className="text-xl font-black italic tabular-nums leading-none">+{stop.boardedCount}</span>
                                </div>
                                <UserPlus size={16} strokeWidth={3} className="opacity-40" />
                             </div>
                           )}
                           
                           {!isFirst && (
                             <div className="flex-1 flex items-center justify-between bg-rose-500/10 text-rose-500 p-2 rounded-xl border border-rose-500/20 shadow-sm print:bg-rose-50 print:text-rose-700 print:border-rose-200">
                                <div className="flex flex-col">
                                  <span className="text-[6px] font-black uppercase opacity-60">Descentes</span>
                                  <span className="text-xl font-black italic tabular-nums leading-none">-{stop.droppedCount}</span>
                                </div>
                                <UserMinus size={16} strokeWidth={3} className="opacity-40" />
                             </div>
                           )}
                        </div>

                        {dwell && (
                          <div className="flex items-center gap-1.5 self-end">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Immobilisation :</span>
                            <span className="text-[10px] font-black italic text-blue-400 print:text-blue-700">{dwell}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden print:block border-t border-slate-200 pt-8 mt-12">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document généré par GEOLIGNE</p>
                <p className="text-[7px] font-bold text-slate-300">© Mrico73 - Systèmes de navigation intelligents</p>
              </div>
              <p className="text-[10px] font-black italic text-slate-400">Édité le {printDate}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-[#05070a] border-t border-white/5 z-50 pb-[calc(env(safe-area-inset-bottom,24px)+20px)] flex justify-center print:hidden">
        <button onClick={onExportPDF} className="w-full max-w-md bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-[32px] font-black flex items-center justify-center space-x-3 shadow-2xl shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-tight italic">
          <FileText size={22} /><span className="text-base">Exporter le rapport PDF</span>
        </button>
      </div>
    </div>
  );
};

export default SummaryView;
