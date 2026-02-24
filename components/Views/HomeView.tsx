
import React, { useState, useMemo } from 'react';
import { FileUp, FileDown, AlertTriangle, MapPin, Pencil, Trash2, Navigation2, PlusCircle, Bus, BusFront, Info, History, ChevronRight, Clock, Map as MapIcon } from 'lucide-react';
import { BusLine, LineType, CourseReport, ManualReport } from '../../types';

interface HomeViewProps {
  lines: BusLine[];
  reports: CourseReport[];
  manualReports: ManualReport[];
  onSelectLine: (line: BusLine) => void;
  onEditLine: (e: React.MouseEvent, line: BusLine) => void;
  onDeleteLine: (e: React.MouseEvent, id: string) => void;
  onImportXML: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportToXML: () => void;
  onGeoManuel: () => void;
  onCreateLine: () => void;
  onViewReport: (report: CourseReport) => void;
  onDeleteReport: (id: string) => void;
  onViewManualReport: (report: ManualReport) => void;
  onDeleteManualReport: (id: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  lines, 
  reports,
  manualReports,
  onSelectLine, 
  onEditLine, 
  onDeleteLine, 
  onImportXML, 
  onExportToXML, 
  onGeoManuel, 
  onCreateLine,
  onViewReport,
  onDeleteReport,
  onViewManualReport,
  onDeleteManualReport
}) => {
  const [activeTab, setActiveTab] = useState<'lines' | 'history'>('lines');

  const historyItems = useMemo(() => {
    const items = [
      ...reports.map(r => ({ ...r, type: 'course' as const })),
      ...manualReports.map(r => ({ ...r, type: 'manual' as const }))
    ];
    // Tri décroissant par date/heure (simplifié car on n'a que des strings locales, 
    // on se base sur l'ordre d'insertion car les hooks limitent déjà aux 10 derniers)
    return items; 
  }, [reports, manualReports]);

  const getTypeColorClass = (type?: LineType) => {
    switch (type) {
      case 'Scolaire': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Urbain': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Interurbain': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Grande ligne': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 print:hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-40">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-2">
          <div className="flex flex-col">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TABLEAU DE BORD</p>
            <div className="flex gap-4 mt-1">
              <button 
                onClick={() => setActiveTab('lines')}
                className={`text-sm font-black uppercase italic tracking-tighter transition-all ${activeTab === 'lines' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
              >
                Itinéraires ({lines.length})
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`text-sm font-black uppercase italic tracking-tighter transition-all ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
              >
                Historique ({historyItems.length})
              </button>
            </div>
          </div>
          {activeTab === 'lines' && (
            <div className="flex gap-2">
              <label className="flex-1 sm:flex-none p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-blue-600 active:scale-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <FileUp size={16} />
                <span className="text-[10px] font-black uppercase tracking-tight">Import</span>
                <input type="file" accept=".xml,.xmr" onChange={onImportXML} className="hidden" />
              </label>
              <button onClick={onExportToXML} className="flex-1 sm:flex-none p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-emerald-600 active:scale-90 transition-all flex items-center justify-center gap-1.5">
                <FileDown size={16} />
                <span className="text-[10px] font-black uppercase tracking-tight">Tout Export</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-orange-50 border-2 border-orange-100 rounded-[32px] p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-orange-500 text-white p-2.5 rounded-2xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <p className="text-[11px] font-bold text-orange-900 leading-tight italic">
            Cette application est une aide à la conduite ; elle ne doit pas être manipulée lorsque le véhicule roule.
          </p>
        </div>

        {activeTab === 'lines' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lines.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300 space-y-4 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <Bus size={48} strokeWidth={1} />
                <p className="font-bold uppercase tracking-widest text-[10px]">Aucun itinéraire</p>
              </div>
            ) : (
              lines.map(line => (
                <div key={line.id} onClick={() => onSelectLine(line)} className="bg-white p-4 rounded-3xl shadow-sm flex items-center space-x-4 active:scale-[0.98] transition-transform cursor-pointer border border-slate-100 hover:shadow-md group">
                  <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0">
                    <span className="text-[8px] opacity-70 leading-none">LIGNE</span>
                    <span className="text-xl leading-none">{line.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-base tracking-tight">{line.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase"><MapPin size={10} /> {line.stops.length} arrêts</span>
                      {line.type && (
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getTypeColorClass(line.type)}`}>
                          {line.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => onEditLine(e, line)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-blue-500"><Pencil size={18} /></button>
                    <button onClick={(e) => onDeleteLine(e, line.id)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {historyItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 space-y-4 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <History size={48} strokeWidth={1} />
                <p className="font-bold uppercase tracking-widest text-[10px]">Aucun historique de course</p>
              </div>
            ) : (
              historyItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => item.type === 'course' ? onViewReport(item as CourseReport) : onViewManualReport(item as ManualReport)} 
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {item.type === 'course' ? (
                      <div className="bg-slate-100 text-slate-500 w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0">
                        <span className="text-lg leading-none">{(item as CourseReport).lineNumber}</span>
                      </div>
                    ) : (
                      <div className="bg-blue-600/10 text-blue-600 w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-blue-500/20">
                        <MapIcon size={20} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {item.type === 'course' ? (item as CourseReport).lineName : "Tracé GeoManuel"}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Clock size={10} /> {item.date} à {item.startTime}</span>
                        <span className={`text-[9px] font-black uppercase italic ${item.type === 'course' ? 'text-emerald-500' : 'text-blue-500'}`}>
                          Durée: {item.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if(item.id) {
                          if (item.type === 'course') {
                            onDeleteReport(item.id)
                          } else {
                            onDeleteManualReport(item.id)
                          }
                        }
                      }} 
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            )}
            {historyItems.length > 0 && (
               <p className="text-[9px] text-center font-bold text-slate-300 uppercase tracking-widest pt-2">Affichage des 10 dernières courses de chaque type</p>
            )}
          </div>
        )}

        <div className="mt-12 mb-8 bg-white border-2 border-slate-100 rounded-[40px] p-10 flex flex-col items-center text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
            <BusFront size={40} className="text-white -rotate-3" />
          </div>
          <div className="space-y-4 max-w-lg">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">GEOligne</h3>
            <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full"></div>
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                Cette application est imaginée et développée par Mric73. Elle n'a aucun but commercial et l'ensemble des données est stocké sur votre téléphone.
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Info size={14} className="shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-tight italic">
                  Cette application nécessite une connexion internet et le GPS pour fonctionner.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-3 z-[100] pb-[calc(env(safe-area-inset-bottom,24px)+24px)] justify-center">
        <div className="w-full max-w-4xl flex gap-4">
          <button onClick={onGeoManuel} className="flex-1 bg-slate-800 text-white px-4 py-4 rounded-3xl shadow-lg font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform group">
            <Navigation2 size={20} className="text-blue-400" />
            <span className="text-sm tracking-tight italic uppercase font-black">GeoManuel</span>
          </button>
          <button onClick={onCreateLine} className="flex-[1.5] bg-blue-600 text-white px-4 py-4 rounded-3xl shadow-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform group">
            <PlusCircle size={22} />
            <span className="text-sm tracking-tight italic uppercase font-black">Nouvelle ligne</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
