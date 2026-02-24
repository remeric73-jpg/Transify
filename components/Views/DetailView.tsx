
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Globe, Layers, Timer, Clock, MessageSquareText, Download, FileText, Play, MapPin, BusFront, Info } from 'lucide-react';
import MapComponent from '../MapComponent';
import { BusLine, LineType } from '../../types';
import { getDistance } from '../../utils/geoUtils';

interface DetailViewProps {
  line: BusLine;
  screenType: string;
  onBack: () => void;
  onStart: () => void;
  onExportXMR: (line: BusLine) => void;
  onExportPDF: () => void;
}

const DetailView: React.FC<DetailViewProps> = ({ line, screenType, onBack, onStart, onExportXMR, onExportPDF }) => {
  const [panelHeight, setPanelHeight] = useState(60);
  const [isSatellite, setIsSatellite] = useState(false);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const isDraggingRef = useRef(false);
  const printDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const startDrag = (_e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  };

  const handleGlobalDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current) return;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const heightPercent = ((window.innerHeight - clientY) / window.innerHeight) * 100;
    setPanelHeight(Math.max(15, Math.min(90, heightPercent)));
  }, []);

  const stopGlobalDrag = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (screenType !== 'Ordinateur') {
      window.addEventListener('mousemove', handleGlobalDrag);
      window.addEventListener('mouseup', stopGlobalDrag);
      window.addEventListener('touchmove', handleGlobalDrag);
      window.addEventListener('touchend', stopGlobalDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalDrag);
      window.removeEventListener('mouseup', stopGlobalDrag);
      window.removeEventListener('touchmove', handleGlobalDrag);
      window.removeEventListener('touchend', stopGlobalDrag);
    };
  }, [screenType, handleGlobalDrag, stopGlobalDrag]);

  const lineStats = useMemo(() => {
    if (line.stops.length < 2) return null;
    
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const diffMin = parseTime(line.stops[line.stops.length - 1].time) - parseTime(line.stops[0].time);
    
    let totalDist = 0;
    for (let i = 0; i < line.stops.length - 1; i++) {
      totalDist += getDistance(
        line.stops[i].lat, 
        line.stops[i].lng, 
        line.stops[i+1].lat, 
        line.stops[i+1].lng
      );
    }

    return { 
      duration: diffMin >= 60 ? `${Math.floor(diffMin / 60)}h${(diffMin % 60).toString().padStart(2, '0')}` : `${diffMin} min`,
      distance: (totalDist / 1000).toFixed(1)
    };
  }, [line]);

  const pdfColumns = useMemo(() => {
    const count = line.stops.length;
    if (count <= 10) return 1;
    if (count <= 22) return 2;
    return 3;
  }, [line.stops.length]);

  const getTypeColorClass = (type?: LineType) => {
    switch (type) {
      case 'Scolaire': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Urbain': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Interurbain': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Grande ligne': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      onExportPDF();
    }, 150);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-white relative detail-view-container print:block print:bg-white print:h-auto overflow-hidden print:overflow-visible">
      <style>{`
        @media print {
          html, body, #root, .app-container, .main-content-wrapper, .detail-view-container {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }

          .pdf-page-1-map {
            height: 260mm !important;
            width: 100% !important;
            display: block !important;
            page-break-after: always !important;
            position: relative !important;
            margin: 0 !important;
          }
          
          .pdf-page-2-info {
            height: auto !important;
            width: 100% !important;
            display: block !important;
            position: relative !important;
            padding: 10mm 15mm !important;
            margin: 0 !important;
          }

          .dynamic-pdf-columns {
            display: block !important;
            columns: ${pdfColumns} !important;
            column-gap: 25px !important;
            widows: 2;
            orphans: 2;
          }

          .stop-item-pdf {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 12px !important;
            padding-bottom: 8px !important;
          }

          .leaflet-control-container { display: none !important; }
        }
      `}</style>

      {/* PAGE 1 PDF - CARTE */}
      <div 
        className="relative flex-1 overflow-hidden pdf-page-1-map print:block" 
        style={{ height: screenType !== 'Ordinateur' ? `${100 - panelHeight}vh` : '100%' }}
      >
        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-4 mx-8 mt-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-blue-600 flex items-center justify-center">
              <BusFront size={28} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter text-blue-600 leading-none">GEOLIGNE</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fiche itinéraire détaillée</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black italic text-slate-900 leading-none">LIGNE {line.number}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">{line.name}</div>
          </div>
        </div>

        <MapComponent stops={line.stops} focusLocation={mapFocus} satellite={isSatellite} height="100%" />
        
        <div className="absolute top-4 left-4 z-20 print:hidden">
          <button onClick={onBack} className="bg-white p-3 rounded-full shadow-xl active:scale-90"><ChevronLeft size={24} /></button>
        </div>
        <div className="absolute top-4 right-4 z-20 print:hidden">
          <button onClick={() => setIsSatellite(!isSatellite)} className={`p-3 rounded-full shadow-xl flex items-center gap-2 ${isSatellite ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'}`}>
            {isSatellite ? <Globe size={24} /> : <Layers size={24} />}
          </button>
        </div>
      </div>

      {/* PAGE 2 PDF - INFOS ET ARRÊTS */}
      <div 
        className="flex flex-col bg-white lg:w-[450px] relative z-10 shadow-2xl pdf-page-2-info print:block print:w-full print:shadow-none"
        style={{ height: screenType !== 'Ordinateur' ? `${panelHeight}vh` : '100%' }}
      >
        {screenType !== 'Ordinateur' && (
          <div onMouseDown={startDrag} onTouchStart={startDrag} className="w-full h-8 bg-white cursor-row-resize flex items-center justify-center shrink-0 border-b border-slate-50 print:hidden">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
          </div>
        )}

        <div className="px-8 pt-4 pb-48 flex-1 overflow-y-auto lg:pb-32 min-h-0 print:overflow-visible print:px-0 print:pb-0">
          <div className="flex items-start justify-between mb-4 print:mb-4">
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest italic ${getTypeColorClass(line.type)} print:bg-slate-50 print:text-slate-600`}>
                {line.type || 'Service'}
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight print:text-2xl print:not-italic">{line.name}</h2>
            </div>
            <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black italic shadow-lg print:bg-white print:text-slate-900 print:border-2 print:border-slate-900 print:shadow-none">#{line.number}</div>
          </div>

          {line.info && (
            <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 print:bg-white print:border-slate-200 print:mb-6">
              <div className="text-blue-600 shrink-0 mt-0.5 print:text-slate-400">
                <Info size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest print:text-slate-400">Note de service</p>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic print:text-[10px] print:not-italic print:text-slate-600">
                  {line.info}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-10 print:mb-8">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-3 print:rounded-2xl print:bg-white">
              <div className="bg-blue-600/10 text-blue-600 p-2.5 rounded-2xl shrink-0"><Timer size={20} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Durée estimée</p>
                <p className="text-lg font-black text-slate-800 italic leading-none print:not-italic">{lineStats?.duration || '--'}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-3 print:rounded-2xl print:bg-white">
              <div className="bg-emerald-600/10 text-emerald-600 p-2.5 rounded-2xl shrink-0"><MapPin size={20} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Distance totale</p>
                <p className="text-lg font-black text-slate-800 italic leading-none print:not-italic">{lineStats?.distance || '--'} km</p>
              </div>
            </div>
          </div>

          {/* LISTE DES ARRÊTS */}
          <div className="space-y-6 mb-12 print:block dynamic-pdf-columns">
            {line.stops.map((s, i) => {
              const isFirst = i === 0;
              const isLast = i === line.stops.length - 1;
              return (
                <div key={s.id || i} className="flex items-stretch gap-5 relative stop-item-pdf">
                  {/* TUILE DU NUMÉRO */}
                  <div className="flex flex-col items-center shrink-0 print:hidden">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-sm ${isFirst ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : isLast ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <span className="text-xl font-black italic tabular-nums leading-none">{(i + 1).toString().padStart(2, '0')}</span>
                      {(isFirst || isLast) && (
                        <span className="text-[7px] font-black uppercase tracking-tighter mt-1 leading-none">
                          {isFirst ? 'Départ' : 'Terminus'}
                        </span>
                      )}
                    </div>
                    {/* Connecteur vertical */}
                    {!isLast && (
                      <div className="flex-1 w-0.5 bg-slate-100 my-1"></div>
                    )}
                  </div>

                  {/* INDICATEUR SPECIFIQUE PDF */}
                  <div className="hidden print:flex flex-col items-center shrink-0 mr-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isFirst ? 'border-emerald-500 text-emerald-600' : isLast ? 'border-rose-500 text-rose-600' : 'border-slate-300 text-slate-500'}`}>
                      <span className="text-xs font-black italic">{(i + 1)}</span>
                    </div>
                  </div>

                  {/* INFOS STATION */}
                  <div className="flex-1 flex flex-col min-w-0 py-1 cursor-pointer" onClick={() => setMapFocus({ lat: s.lat, lng: s.lng })}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-lg text-slate-800 uppercase print:text-[11px] print:leading-tight">
                        {s.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 print:mt-0.5">
                      <Clock size={12} className="text-slate-400 print:w-2.5" />
                      <span className="text-xs text-slate-500 font-bold tabular-nums print:text-[9px]">{s.time}</span>
                    </div>
                    
                    {s.annotation && (
                      <div className="mt-2 flex items-start gap-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100/50 max-w-full print:bg-transparent print:border-none print:p-0 print:mt-1">
                        <MessageSquareText size={14} className="text-blue-500 shrink-0 mt-0.5 print:w-2.5 print:text-slate-400" />
                        <span className="text-[11px] text-slate-600 italic leading-tight print:text-[8px] print:text-slate-500">{s.annotation}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 py-8 border-t border-slate-100 print:hidden">
            <button onClick={() => onExportXMR(line)} className="flex-1 p-4 bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-1">
              <Download size={20} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase">Export .XMR</span>
            </button>
            <button onClick={handlePrint} className="flex-1 p-4 bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-1">
              <FileText size={20} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase">Export PDF</span>
            </button>
          </div>
        </div>

        <div className="hidden print:block border-t border-slate-200 pt-6 mt-8 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Édité le {printDate} - Application GEOLIGNE  Votre réseau, bien orienté by Mrico73
          </p>
        </div>

        <div className="absolute lg:sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] print:hidden">
          <button onClick={onStart} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-[32px] font-black flex items-center justify-center space-x-4 shadow-xl active:scale-[0.96] transition-all uppercase italic">
            <Play size={24} fill="currentColor" />
            <span className="text-2xl">Démarrer le service</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailView;
