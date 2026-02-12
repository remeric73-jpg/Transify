
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PlusCircle, 
  ChevronLeft, 
  Play, 
  Clock, 
  Bus, 
  Save,
  Navigation2,
  Trash2,
  MapPin,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Flag,
  MapPinCheck,
  LogOut,
  CheckSquare,
  Crosshair,
  ArrowLeft,
  FileUp,
  FileDown,
  Timer,
  CalendarDays,
  Award,
  Share2,
  Home,
  Hourglass,
  Zap,
  AlertTriangle,
  Users,
  Plus,
  Minus,
  AlertCircle,
  UserMinus,
  UserPlus,
  FileText
} from 'lucide-react';
import { AppView, BusLine, Stop, CourseReport, StopReport } from './types';
import { INITIAL_LINES } from './constants';
import MapComponent from './components/MapComponent';

const STORAGE_KEY = 'geoligne_bus_lines';

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [lines, setLines] = useState<BusLine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_LINES;
  });
  
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [newLine, setNewLine] = useState<Partial<BusLine>>({ number: '', name: '', stops: [] });
  const [lastReport, setLastReport] = useState<CourseReport | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error:", err)
      );
    }
    return () => clearInterval(timer);
  }, []);

  const exportToXML = () => {
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<geoligne>\n';
    lines.forEach(line => {
      xmlString += `  <line id="${line.id}">\n    <number>${line.number}</number>\n    <name>${line.name}</name>\n    <stops>\n`;
      line.stops.forEach(stop => {
        xmlString += `      <stop>\n        <name>${stop.name}</name>\n        <time>${stop.time}</time>\n        <lat>${stop.lat}</lat>\n        <lng>${stop.lng}</lng>\n      </stop>\n`;
      });
      xmlString += `    </stops>\n  </line>\n`;
    });
    xmlString += '</geoligne>';
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geoligne_export_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlText = event.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const importedLines: BusLine[] = [];
      const lineElements = xmlDoc.getElementsByTagName("line");
      for (let i = 0; i < lineElements.length; i++) {
        const lineEl = lineElements[i];
        const id = lineEl.getAttribute("id") || Math.random().toString(36).substr(2, 9);
        const number = lineEl.getElementsByTagName("number")[0]?.textContent || "??";
        const name = lineEl.getElementsByTagName("name")[0]?.textContent || "Inconnu";
        const stops: Stop[] = [];
        const stopElements = lineEl.getElementsByTagName("stop");
        for (let j = 0; j < stopElements.length; j++) {
          const stopEl = stopElements[j];
          stops.push({
            name: stopEl.getElementsByTagName("name")[0]?.textContent || "Station",
            time: stopEl.getElementsByTagName("time")[0]?.textContent || "00:00",
            lat: parseFloat(stopEl.getElementsByTagName("lat")[0]?.textContent || "0"),
            lng: parseFloat(stopEl.getElementsByTagName("lng")[0]?.textContent || "0"),
          });
        }
        importedLines.push({ id, number, name, stops });
      }
      if (importedLines.length > 0) {
        if (window.confirm(`Importer ${importedLines.length} lignes ?`)) setLines(importedLines);
      }
      // Reset input value to allow re-importing the same file
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleSelectLine = (line: BusLine) => { setSelectedLine(line); setView(AppView.DETAIL); };
  const handleCreateLine = () => { setNewLine({ number: '', name: '', stops: [] }); setView(AppView.CREATE); };
  const saveLine = () => {
    if (!newLine.number || !newLine.name || !newLine.stops?.length) return;
    const lineToAdd: BusLine = { id: Math.random().toString(36).substr(2, 9), number: newLine.number!, name: newLine.name!, stops: newLine.stops as Stop[] };
    setLines(prev => [...prev, lineToAdd]);
    setView(AppView.HOME);
  };
  const deleteLine = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (window.confirm("Voulez-vous vraiment supprimer cet itinéraire ?")) setLines(prev => prev.filter(l => l.id !== id)); };

  const handleMapClickOnCreate = (lat: number, lng: number) => {
    const newStop: Stop = { name: `Arrêt ${ (newLine.stops?.length || 0) + 1}`, time: '12:00', lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    setNewLine(prev => ({ ...prev, stops: [...(prev.stops || []), newStop] }));
  };

  const addStopManually = () => {
    const defaultLat = userLocation?.lat || 48.8566;
    const defaultLng = userLocation?.lng || 2.3522;
    const newStop: Stop = { name: 'Nouvel arrêt', time: '12:00', lat: defaultLat, lng: defaultLng };
    setNewLine(prev => ({ ...prev, stops: [...(prev.stops || []), newStop] }));
  };

  const updateStop = (idx: number, field: keyof Stop, value: string) => {
    setNewLine(prev => {
      const stops = [...(prev.stops || [])];
      let val: string | number = value;
      if (field === 'lat' || field === 'lng') val = parseFloat(value) || 0;
      stops[idx] = { ...stops[idx], [field]: val };
      return { ...prev, stops };
    });
  };

  const removeStop = (idx: number) => { setNewLine(prev => ({ ...prev, stops: prev.stops?.filter((_, i) => i !== idx) })); };

  const handleCourseFinished = (report: CourseReport) => { setLastReport(report); setView(AppView.SUMMARY); };

  const handleExportPDF = () => {
    window.print();
  };

  const renderHome = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        <div className="flex justify-between items-end px-1">
          <div className="space-y-0.5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LISTE DES LIGNES</p><span className="text-[10px] text-blue-500 font-bold">{lines.length} Itinéraires actifs</span></div>
          <div className="flex gap-2">
            <label className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-blue-600 active:scale-90 transition-all flex items-center gap-1.5 cursor-pointer">
              <FileUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-tight">Import</span>
              <input 
                type="file" 
                accept=".xml,text/xml,application/xml" 
                onChange={handleImportXML} 
                className="hidden" 
              />
            </label>
            <button onClick={exportToXML} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-emerald-600 active:scale-90 transition-all flex items-center gap-1.5"><FileDown size={16} /><span className="text-[10px] font-black uppercase tracking-tight">Export</span></button>
          </div>
        </div>
        {lines.map(line => (
          <div key={line.id} onClick={() => handleSelectLine(line)} className="bg-white p-4 rounded-3xl shadow-sm flex items-center space-x-4 active:scale-[0.98] transition-transform cursor-pointer border border-slate-100 hover:shadow-md group">
            <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg shadow-blue-200"><span className="text-[8px] opacity-70 leading-none">LIGNE</span><span className="text-xl leading-none">{line.number}</span></div>
            <div className="flex-1 min-w-0"><h3 className="font-bold text-slate-800 truncate text-base tracking-tight">{line.name}</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} /> {line.stops.length} arrêts</span></div></div>
            <button onClick={(e) => deleteLine(e, line.id)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-center z-[100] pb-[env(safe-area-inset-bottom,24px)]"><button onClick={handleCreateLine} className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl font-bold flex items-center space-x-3 active:scale-95 transition-transform w-full max-w-md justify-center group"><PlusCircle size={22} className="group-hover:rotate-90 transition-transform" /><span className="text-base tracking-tight">Nouvelle ligne</span></button></div>
    </div>
  );

  const renderDetail = () => selectedLine && (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="relative"><MapComponent stops={selectedLine.stops} height="320px" /><button onClick={() => setView(AppView.HOME)} className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-xl z-20 active:scale-90 transition-transform"><ChevronLeft size={24} className="text-slate-800" /></button></div>
        <div className="p-8 -mt-12 bg-white rounded-t-[48px] relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] min-h-[60%]"><div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10"></div><div className="flex items-start justify-between mb-8"><div className="space-y-1"><div className="text-blue-600 font-black text-xs uppercase tracking-widest italic">Détails de la ligne</div><h2 className="text-3xl font-black text-slate-900 leading-tight uppercase italic tracking-tighter">{selectedLine.name}</h2></div><div className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black italic">#{selectedLine.number}</div></div><div className="space-y-8 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-1 before:bg-slate-50">{selectedLine.stops.map((s, i) => (<div key={i} className="flex items-start space-x-6 relative"><div className={`w-6 h-6 rounded-full border-[5px] bg-white z-10 flex items-center justify-center shrink-0 ${i === 0 ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : i === selectedLine!.stops.length - 1 ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-slate-100'}`}></div><div className="flex-1 flex justify-between items-center group"><div className="flex flex-col overflow-hidden"><span className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</span><div className="flex items-center gap-2 mt-1"><Clock size={12} className="text-slate-400" /><span className="text-xs text-slate-500 font-medium tracking-tight">Passage à {s.time}</span></div></div><div className={`${i === 0 ? 'bg-emerald-50 text-emerald-600' : i === selectedLine!.stops.length - 1 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'} text-[10px] font-black px-3 py-1.5 rounded-xl shrink-0 italic uppercase tracking-wider border border-current opacity-70`}>{i === 0 ? 'Départ' : i === selectedLine!.stops.length - 1 ? 'Terminus' : `Arrêt ${i+1}`}</div></div></div>))}</div></div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-50 pt-16 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"><button onClick={() => setView(AppView.DRIVING)} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-[32px] font-black flex items-center justify-center space-x-4 shadow-[0_25px_60px_-10px_rgba(37,99,235,0.6)] active:scale-[0.96] transition-all border-b-[10px] border-blue-900 uppercase italic tracking-tight group"><div className="bg-white/20 p-2 rounded-xl group-active-scale-90 transition-transform"><Play size={28} fill="currentColor" className="text-white" /></div><div className="flex flex-col items-start leading-none"><span className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Prêt pour le départ ?</span><span className="text-2xl">Démarrer le service</span></div></button></div>
    </div>
  );

  const renderSummary = () => {
    if (!lastReport) return null;
    const totalBoarded = lastReport.stops.reduce((acc, s) => acc + (s.boardedCount || 0), 0);
    const totalDropped = lastReport.stops.reduce((acc, s) => acc + (s.droppedCount || 0), 0);
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto print:bg-white print:text-slate-900">
        <div className="p-8 space-y-8 pb-32">
          <div className="flex justify-between items-center print:hidden">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <button onClick={() => setView(AppView.HOME)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all">
              <Home size={16} /> Fermer
            </button>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Rapport de ligne</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest print:text-slate-500">Résumé de l'activité - Ligne {lastReport.lineNumber}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-1 print:border-slate-200">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Durée Totale de Service</div>
              <div className="text-2xl font-black italic text-emerald-400 print:text-emerald-600">{lastReport.duration}</div>
            </div>
            
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[32px] p-6 space-y-1 print:border-blue-200">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Total Montées</div>
              <div className="text-3xl font-black italic text-blue-400 print:text-blue-600">{totalBoarded} <span className="text-sm not-italic opacity-60">pax</span></div>
            </div>
            
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-[32px] p-6 space-y-1 print:border-rose-200">
              <div className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Total Descentes</div>
              <div className="text-3xl font-black italic text-rose-400 print:text-rose-600">{totalDropped} <span className="text-sm not-italic opacity-60">pax</span></div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden print:border-slate-200">
            <div className="bg-white/5 p-6 border-b border-white/10 flex items-center gap-3 print:bg-slate-50 print:border-slate-200">
              <CalendarDays size={18} className="text-blue-500" />
              <span className="text-xs font-black uppercase tracking-widest italic">Chronologie détaillée</span>
            </div>
            <div className="p-6 space-y-6">
              {lastReport.stops.map((stop, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0 print:border-slate-100">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-100 truncate print:text-slate-900">{stop.stopName}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Prévu: {stop.scheduledTime}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-black text-[10px] flex items-center gap-1 uppercase tracking-tighter"><UserPlus size={10} /> {stop.boardedCount}</span>
                        <span className="text-rose-400 font-black text-[10px] flex items-center gap-1 uppercase tracking-tighter"><UserMinus size={10} /> {stop.droppedCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0">
                    <span className={`text-lg font-black italic leading-none ${stop.status === 'late' ? 'text-rose-500' : stop.status === 'early' ? 'text-blue-400' : 'text-emerald-400'}`}>{stop.actualTime}</span>
                    <div className={`text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-full border ${stop.status === 'late' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : stop.status === 'early' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                      {stop.status === 'late' ? `+${stop.diffMinutes} min` : stop.status === 'early' ? `${stop.diffMinutes} min` : 'Ponctuel'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom,24px)] print:hidden">
          <div className="flex gap-4 max-w-md mx-auto">
            <button onClick={handleExportPDF} className="flex-1 bg-emerald-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight">
              <FileText size={22} />
              <span className="text-sm">Exporter en PDF</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderCreate = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white px-6 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-50"><button onClick={() => setView(AppView.HOME)} className="p-2 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-2 group"><ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" /><span className="text-xs font-bold uppercase tracking-tight text-slate-400 hidden sm:block">Retour</span></button><h2 className="text-xl font-black tracking-tight uppercase italic text-slate-900">Ajout d'itinéraire</h2><div className="w-10"></div></div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        <div className="space-y-4"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informations générales</p><div className="grid grid-cols-4 gap-4"><input placeholder="NO." value={newLine.number ?? ''} onChange={e => setNewLine(prev => ({...prev, number: e.target.value}))} className="bg-white border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-500 outline-none shadow-sm" /><input placeholder="Nom de la destination..." value={newLine.name ?? ''} onChange={e => setNewLine(prev => ({...prev, name: e.target.value}))} className="col-span-3 bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-500 outline-none shadow-sm" /></div></div>
        <div className="space-y-4"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placement sur carte</p><div className="relative h-72 rounded-[32px] overflow-hidden border-2 border-slate-100 shadow-sm group"><MapComponent stops={(newLine.stops || []) as Stop[]} currentPos={newLine.stops?.length === 0 ? userLocation : null} height="100%" onMapClick={handleMapClickOnCreate} /><div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-lg border border-slate-100 text-center pointer-events-none group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">Cliquez sur la carte pour ajouter un arrêt</div></div></div>
        <div className="space-y-4"><div className="flex justify-between items-center px-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Séquence des stations</p><button onClick={addStopManually} className="text-xs text-blue-600 font-black uppercase flex items-center gap-1"><PlusCircle size={14} /> Ajouter manuellement</button></div><div className="space-y-3">{newLine.stops?.map((stop, i) => (<div key={i} className="bg-white p-4 rounded-3xl border-2 border-slate-100 flex flex-col gap-4 shadow-sm hover:border-blue-100 transition-colors"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{i + 1}</div><div className="flex-1"><input value={stop.name ?? ''} onChange={e => updateStop(i, 'name', e.target.value)} className="w-full font-bold text-slate-800 outline-none bg-transparent" placeholder="Nom de la station" /></div><div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 gap-2 shrink-0"><Clock size={12} className="text-slate-400" /><input type="time" value={stop.time ?? ''} onChange={e => updateStop(i, 'time', e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-900 outline-none w-14" /></div><button onClick={() => removeStop(i)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"><Trash2 size={16} /></button></div><div className="flex gap-2 pt-2 border-t border-slate-50"><div className="flex-1 flex items-center bg-slate-50/50 rounded-xl px-3 py-2 gap-2"><Crosshair size={12} className="text-slate-400" /><span className="text-[8px] font-black text-slate-400 uppercase">LAT</span><input type="text" value={stop.lat ?? ''} onChange={e => updateStop(i, 'lat', e.target.value)} className="bg-transparent text-[10px] font-mono font-bold text-slate-900 outline-none flex-1" placeholder="48.85..." /></div><div className="flex-1 flex items-center bg-slate-50/50 rounded-xl px-3 py-2 gap-2"><Crosshair size={12} className="text-slate-400" /><span className="text-[8px] font-black text-slate-400 uppercase">LNG</span><input type="text" value={stop.lng ?? ''} onChange={e => updateStop(i, 'lng', e.target.value)} className="bg-transparent text-[10px] font-mono font-bold text-slate-900 outline-none flex-1" placeholder="2.35..." /></div></div></div>))}</div></div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-[env(safe-area-inset-bottom,24px)]"><div className="flex gap-3 max-w-md mx-auto"><button onClick={() => setView(AppView.HOME)} className="flex-1 bg-slate-100 text-slate-600 p-5 rounded-3xl font-black uppercase tracking-tight active:scale-95 transition-all text-sm">Annuler</button><button onClick={saveLine} disabled={!newLine.number || !newLine.name || !newLine.stops?.length} className="flex-[2] bg-slate-900 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all disabled:opacity-20 uppercase tracking-tight"><Save size={22} /><span className="text-sm">Enregistrer l'itinéraire</span></button></div></div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full max-w-lg mx-auto overflow-hidden shadow-2xl relative bg-slate-50 text-slate-900 flex flex-col">
      {view !== AppView.SUMMARY && view !== AppView.DRIVING && (
        <div className="bg-blue-600 text-white px-6 py-5 flex items-center justify-between shadow-lg sticky top-0 z-[100] safe-top shrink-0 print:hidden">
          <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><Bus size={22} /></div><h1 className="text-xl font-black uppercase italic tracking-tighter">GEOligne</h1></div>
          <div className="flex items-center gap-2 text-sm font-mono font-black bg-white/10 px-4 py-2 rounded-2xl border border-white/10 shrink-0 tabular-nums"><Clock size={16} className="text-blue-200" /> {currentTime}</div>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">
        {view === AppView.HOME && renderHome()}
        {view === AppView.DETAIL && renderDetail()}
        {view === AppView.CREATE && renderCreate()}
        {view === AppView.DRIVING && selectedLine && (<DrivingView line={selectedLine} onExit={() => setView(AppView.DETAIL)} onFinish={handleCourseFinished} onStop={() => { setSelectedLine(null); setView(AppView.HOME); }} />)}
        {view === AppView.SUMMARY && renderSummary()}
      </div>
    </div>
  );
};

// --- Sub-component: Driving View ---
interface DrivingViewProps {
  line: BusLine;
  onExit: () => void;
  onStop: () => void;
  onFinish: (report: CourseReport) => void;
}

const DrivingView: React.FC<DrivingViewProps> = ({ line, onExit, onStop, onFinish }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nextStopIdx, setNextStopIdx] = useState(0);
  const [now, setNow] = useState(new Date());
  const [startTime] = useState(new Date());
  const [actualArrivalTimes, setActualArrivalTimes] = useState<string[]>([]);
  const [boardedCounts, setBoardedCounts] = useState<number[]>([]);
  const [droppedCounts, setDroppedCounts] = useState<number[]>([]);
  const [currentBoarding, setCurrentBoarding] = useState(0);
  const [currentDropped, setCurrentDropped] = useState(0);
  
  // États pour l'automatisme
  const [capturedArrivalTime, setCapturedArrivalTime] = useState<string | null>(null);
  const wasAtStationRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    setCurrentPos({ lat: line.stops[0].lat, lng: line.stops[0].lng });
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => { navigator.geolocation.clearWatch(watchId); clearInterval(interval); };
  }, [line]);

  const currentStop = line.stops[nextStopIdx];
  const isLastStop = useMemo(() => nextStopIdx === line.stops.length - 1, [nextStopIdx, line.stops]);

  const scheduleOffset = useMemo(() => {
    if (!currentStop) return 0;
    const [h, m] = currentStop.time.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(h, m, 0, 0);
    const diff = now.getTime() - scheduledDate.getTime();
    return Math.floor(diff / 60000);
  }, [currentStop, now]);

  const isEarly = scheduleOffset < -1;
  const isLate = scheduleOffset > 2;
  const isOnTime = !isEarly && !isLate;

  const distanceRemaining = useMemo(() => {
    if (!currentPos || !currentStop) return null;
    return getDistance(currentPos.lat, currentPos.lng, currentStop.lat, currentStop.lng);
  }, [currentPos, currentStop]);

  const isAtStation = useMemo(() => distanceRemaining !== null && distanceRemaining <= 50, [distanceRemaining]);
  const formattedDistance = useMemo(() => {
    if (distanceRemaining === null) return '--';
    if (distanceRemaining < 1000) return `${Math.round(distanceRemaining)} m`;
    return `${(distanceRemaining / 1000).toFixed(1)} km`;
  }, [distanceRemaining]);

  // Logique de validation (manuelle ou auto)
  const handleNext = useCallback(() => {
    const timeToRecord = capturedArrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newArrivals = [...actualArrivalTimes, timeToRecord];
    const newBoarded = [...boardedCounts, currentBoarding];
    const newDropped = [...droppedCounts, currentDropped];
    
    setActualArrivalTimes(newArrivals);
    setBoardedCounts(newBoarded);
    setDroppedCounts(newDropped);
    setCurrentBoarding(0);
    setCurrentDropped(0);
    setCapturedArrivalTime(null);
    wasAtStationRef.current = false;

    if (nextStopIdx < line.stops.length - 1) {
      setNextStopIdx(prev => prev + 1);
    } else {
      const endTime = new Date();
      const diffMins = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      const stopsReport: StopReport[] = line.stops.map((stop, idx) => {
        const actual = newArrivals[idx] || "--:--";
        const [schH, schM] = stop.time.split(':').map(Number);
        const [actH, actM] = actual.split(':').map(Number);
        const diff = (actH * 60 + actM) - (schH * 60 + schM);
        return {
          stopName: stop.name,
          scheduledTime: stop.time,
          actualTime: actual,
          status: diff > 2 ? 'late' : diff < -2 ? 'early' : 'on-time',
          diffMinutes: Math.abs(diff),
          boardedCount: newBoarded[idx] || 0,
          droppedCount: newDropped[idx] || 0
        };
      });

      onFinish({
        lineName: line.name,
        lineNumber: line.number,
        startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: `${Math.floor(diffMins/60)}h ${diffMins%60}min`,
        stops: stopsReport
      });
    }
  }, [nextStopIdx, line.stops, actualArrivalTimes, boardedCounts, droppedCounts, currentBoarding, currentDropped, capturedArrivalTime, startTime, onFinish]);

  // AUTOMATISME : Détection Entrée / Sortie
  useEffect(() => {
    if (isAtStation) {
      wasAtStationRef.current = true;
      if (!capturedArrivalTime) {
        setCapturedArrivalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } else if (wasAtStationRef.current && distanceRemaining !== null && distanceRemaining > 100) {
      // Sortie de zone après avoir été à l'arrêt -> Validation Automatique
      handleNext();
    }
  }, [isAtStation, distanceRemaining, capturedArrivalTime, handleNext]);

  return (
    <div className="fixed inset-0 bg-[#080b14] text-white flex flex-col font-sans overflow-hidden z-[500] safe-top safe-bottom">
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden relative">
        <div className="flex gap-3 h-[12%] shrink-0">
          <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-center border transition-colors duration-500 ${isEarly ? 'bg-amber-950/20 border-amber-500/30' : isLate ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
            <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5 ${isEarly ? 'text-amber-400' : isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isEarly ? <Hourglass size={12} /> : isLate ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              {isEarly ? 'Avance' : isLate ? 'Retard' : 'Ponctuel'}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black italic ${isEarly ? 'text-amber-500' : isLate ? 'text-rose-500' : 'text-emerald-500'}`}>
                {scheduleOffset === 0 ? 'Ok' : scheduleOffset > 0 ? `+${scheduleOffset}` : scheduleOffset}
              </span>
              <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest">min</span>
            </div>
          </div>
          <div className="flex-1 rounded-3xl p-4 flex flex-col justify-center bg-[#10162a] border border-white/5">
            <div className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5"><Flag size={12} /> Distance</div>
            <span className="text-xl font-black italic text-slate-100 tracking-tighter leading-none">{formattedDistance}</span>
          </div>
        </div>

        <div className="flex-1 relative rounded-[48px] overflow-hidden border border-white/10 bg-[#0a0d18]"><MapComponent stops={line.stops} currentPos={currentPos} dark={true} isDriving={true} height="100%" /></div>

        <div className={`transition-all duration-500 rounded-[40px] p-5 flex items-center justify-between shadow-2xl shrink-0 ${isAtStation ? (isEarly ? 'bg-amber-900/40 border-amber-500' : isLate ? 'bg-rose-900/40 border-rose-500' : 'bg-emerald-900/40 border-emerald-500') : 'bg-[#10162a] border-white/10 border'}`}>
          <div className="flex gap-4 items-center min-w-0">
             <div className="w-14 h-14 rounded-[20px] flex flex-col items-center justify-center font-black shrink-0 border-b-8 bg-blue-600 border-blue-800 text-white italic"><span className="text-2xl leading-none">{line.number}</span></div>
             <div className="flex flex-col min-w-0">
               <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isAtStation ? 'text-emerald-400' : 'text-blue-500'}`}>{isAtStation ? 'Arrêt en cours' : 'Prochaine station'}</div>
               <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none truncate">{currentStop?.name}</h2>
             </div>
          </div>
          <div className="text-3xl font-black italic text-slate-200 tabular-nums">{currentStop?.time}</div>
        </div>

        {/* Passenger Flux Module */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600/20 p-1.5 rounded-lg text-emerald-400"><UserPlus size={16} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montées</span>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentBoarding(Math.max(0, currentBoarding - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all"><Minus size={18} /></button>
              <div className="text-2xl font-black italic text-emerald-400 tabular-nums">{currentBoarding}</div>
              <button onClick={() => setCurrentBoarding(currentBoarding + 1)} className="w-10 h-10 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center active:scale-90 transition-all"><Plus size={18} /></button>
            </div>
          </div>
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-rose-600/20 p-1.5 rounded-lg text-rose-400"><UserMinus size={16} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descentes</span>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentDropped(Math.max(0, currentDropped - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all"><Minus size={18} /></button>
              <div className="text-2xl font-black italic text-rose-400 tabular-nums">{currentDropped}</div>
              <button onClick={() => setCurrentDropped(currentDropped + 1)} className="w-10 h-10 rounded-xl bg-rose-600 shadow-lg shadow-rose-500/20 flex items-center justify-center active:scale-90 transition-all"><Plus size={18} /></button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 h-[12%] shrink-0 pb-2">
          <button onClick={() => setNextStopIdx(p => Math.max(0, p - 1))} className="flex-1 bg-white/5 rounded-[32px] flex items-center justify-center text-slate-600 border border-white/5 active:bg-white/10 transition-colors"><ChevronLeft size={32} /></button>
          <button onClick={handleNext} className={`flex-[3] border-b-[8px] rounded-[32px] flex items-center justify-center transition-all shadow-2xl ${isLastStop ? 'bg-rose-600 border-rose-800 shadow-rose-900/40' : isAtStation ? (isEarly ? 'bg-amber-600 border-amber-800' : isLate ? 'bg-rose-600 border-rose-800' : 'bg-emerald-600 border-emerald-800') : 'bg-blue-600 border-blue-800'} active:translate-y-1 active:border-b-2`}>
            <span className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
              {isLastStop ? 'Terminer la mission' : isAtStation ? 'Valider et Partir' : (
                <>
                  <CheckSquare size={20} />
                  VALIDER ARRET MANUELLEMENT
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
