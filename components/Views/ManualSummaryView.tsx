
import React from 'react';
import { CheckCircle2, Home, MapPinCheck, UserPlus, UserMinus, Save, FileText, BusFront, Clock, Users } from 'lucide-react';
import { ManualReport, Stop } from '../../types';
import MapComponent from '../MapComponent';

interface ManualSummaryViewProps {
  report: ManualReport;
  onClose: () => void;
  onConvert: () => void;
  onExportPDF: () => void;
}

const ManualSummaryView: React.FC<ManualSummaryViewProps> = ({ report, onClose, onConvert, onExportPDF }) => {
    const stopsAsStops: Stop[] = report.stops.map((s, i) => ({ id: `manual-stop-${i}`, name: `Arrêt ${i + 1}`, time: s.time, lat: s.lat, lng: s.lng }));
  const printDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto print:bg-white print:text-slate-900 print:h-auto print:overflow-visible">
      <div className="p-8 space-y-8 pb-48 max-w-4xl mx-auto w-full print:p-0 print:pb-10">
        
        {/* PRINT HEADER */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-100 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-blue-600 flex items-center justify-center">
              <BusFront size={32} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-blue-600 leading-none">GEOLIGNE</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bilan de traçage GeoManuel</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-300 uppercase italic">Relevé GPS</div>
            <div className="text-xs font-bold text-slate-600">{report.stops.length} points</div>
          </div>
        </div>

        <div className="flex justify-between items-center print:hidden">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><CheckCircle2 size={32} className="text-blue-500" /></div>
          <button onClick={onClose} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"><Home size={16} /> Fermer</button>
        </div>
        
        <div className="space-y-2 print:text-center">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none print:not-italic print:text-2xl print:mb-2 print:uppercase">Bilan GeoManuel</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest print:text-slate-600">Traçage dynamique en direct</p>
        </div>

        <div className="relative h-64 sm:h-96 rounded-[40px] overflow-hidden border border-white/10 bg-white/5 shadow-2xl print:hidden">
          <MapComponent stops={stopsAsStops} dark={true} height="100%" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-1 print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-slate-500" />
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-400">Durée Totale</div>
            </div>
            <div className="text-2xl font-black italic text-white print:text-emerald-600 print:not-italic">{report.duration}</div>
          </div>
          
          <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[32px] p-6 space-y-1 print:bg-emerald-50 print:border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-emerald-400" />
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest print:text-emerald-500">Passagers total</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black italic text-emerald-400 print:text-emerald-700 print:not-italic">+{report.totalBoarded}</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden print:border-slate-200 print:rounded-2xl print:bg-transparent">
          <div className="bg-white/5 p-6 border-b border-white/10 flex items-center gap-3 print:bg-slate-100 print:border-slate-200">
            <MapPinCheck size={18} className="text-blue-500" />
            <span className="text-xs font-black uppercase tracking-widest italic print:not-italic print:text-slate-700">Flux de passagers ({report.stops.length} points)</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 print:grid-cols-1 print:p-4">
            {report.stops.map((stop, i) => {
              const isFirst = i === 0;
              const isLast = i === report.stops.length - 1;
              return (
                <div key={i} className="flex flex-col gap-3 border-b border-white/5 pb-6 last:border-0 print:border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 print:text-slate-900 italic uppercase tracking-tighter">Point {i + 1}</span>
                    <span className="text-base font-black italic leading-none text-slate-400 print:text-slate-600 tabular-nums">{stop.time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                      {!isLast && (
                        <div className="flex-1 flex items-center justify-between bg-emerald-500/10 text-emerald-400 p-2.5 rounded-2xl border border-emerald-500/20 print:bg-emerald-50 print:text-emerald-700 print:border-emerald-200">
                          <span className="text-xs font-black italic">+{stop.boarded}</span>
                          <UserPlus size={14} strokeWidth={3} className="opacity-50" />
                        </div>
                      )}
                      {!isFirst && (
                        <div className="flex-1 flex items-center justify-between bg-rose-500/10 text-rose-500 p-2.5 rounded-2xl border border-rose-500/20 print:bg-rose-50 print:text-rose-700 print:border-rose-200">
                          <span className="text-xs font-black italic">-{stop.dropped}</span>
                          <UserMinus size={14} strokeWidth={3} className="opacity-50" />
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PRINT FOOTER */}
        <div className="hidden print:block border-t border-slate-200 pt-6 mt-12 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Édité le {printDate} - Application GEOLIGNE  Votre réseau, bien orienté by Mrico73
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 pb-[calc(env(safe-area-inset-bottom,24px)+40px)] flex justify-center print:hidden">
        <div className="w-full max-w-2xl flex gap-4">
          <button onClick={onConvert} className="flex-1 bg-blue-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight italic">
            <Save size={22} /><span className="text-sm">Sauvegarder</span>
          </button>
          <button onClick={onExportPDF} className="flex-1 bg-emerald-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight italic">
            <FileText size={22} /><span className="text-sm">PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualSummaryView;
