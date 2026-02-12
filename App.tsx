
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
  FileText,
  RotateCcw,
  Navigation,
  PlayCircle,
  Map as MapIcon,
  CircleDot,
  Pencil
} from 'lucide-react';
import { AppView, BusLine, Stop, CourseReport, StopReport, ManualStop, ManualReport } from './types';
import { INITIAL_LINES } from './constants';
import MapComponent from './components/MapComponent';

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

const STORAGE_KEY = 'geoligne_bus_lines';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  
  const [lines, setLines] = useState<BusLine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_LINES;
  });
  
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [newLine, setNewLine] = useState<Partial<BusLine>>({ number: '', name: '', stops: [] });
  const [lastReport, setLastReport] = useState<CourseReport | null>(null);
  const [lastManualReport, setLastManualReport] = useState<ManualReport | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);

  // Gestion du Wake Lock avec protection contre les politiques de sécurité
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try { 
          wakeLock = await (navigator as any).wakeLock.request('screen'); 
        } 
        catch (err: any) { 
          // Silencieusement ignorer les erreurs de permission policy
          console.warn("Wake Lock indisponible ou refusé:", err.message); 
        }
      }
    };
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') await requestWakeLock();
    };
    if (view === AppView.PREP || view === AppView.DRIVING || view === AppView.GEOMANUEL) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    return () => {
      if (wakeLock) {
        try { wakeLock.release(); } catch(e) {}
        wakeLock = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [view]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); }, [lines]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
      return () => { clearInterval(timer); navigator.geolocation.clearWatch(watchId); };
    }
    return () => clearInterval(timer);
  }, []);

  const handleSelectLine = (line: BusLine) => { setSelectedLine(line); setMapFocus(null); setView(AppView.DETAIL); };
  const handleCreateLine = () => { setNewLine({ number: '', name: '', stops: [] }); setView(AppView.CREATE); };
  const handleEditLine = (e: React.MouseEvent, line: BusLine) => {
    e.stopPropagation();
    setNewLine(line);
    setView(AppView.CREATE);
  };

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
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const startServiceLogic = () => {
    if (!selectedLine || !userLocation) { setView(AppView.DRIVING); return; }
    const distToFirst = getDistance(userLocation.lat, userLocation.lng, selectedLine.stops[0].lat, selectedLine.stops[0].lng);
    if (distToFirst > 50) setView(AppView.PREP);
    else setView(AppView.DRIVING);
  };

  const handleConvertManualToLine = () => {
    if (!lastManualReport) return;
    const stopsFromManual: Stop[] = lastManualReport.stops.map((ms, idx) => ({
      name: `Arrêt ${idx + 1}`,
      time: ms.time,
      lat: ms.lat,
      lng: ms.lng
    }));
    setNewLine({ number: '', name: '', stops: stopsFromManual });
    setView(AppView.CREATE);
  };

  const saveLine = () => {
    if (!newLine.number || !newLine.name || !newLine.stops?.length) return;
    if (newLine.id) {
      setLines(prev => prev.map(l => l.id === newLine.id ? (newLine as BusLine) : l));
    } else {
      const lineToAdd: BusLine = { 
        id: Math.random().toString(36).substr(2, 9), 
        number: newLine.number!, 
        name: newLine.name!, 
        stops: newLine.stops as Stop[] 
      };
      setLines(prev => [...prev, lineToAdd]);
    }
    setView(AppView.HOME);
  };

  const deleteLine = (e: React.MouseEvent, id: string) => { 
    e.stopPropagation(); 
    if (window.confirm("Voulez-vous vraiment supprimer cet itinéraire ?")) setLines(prev => prev.filter(l => l.id !== id)); 
  };

  const handleMapClickOnCreate = (lat: number, lng: number) => {
    const newStop: Stop = { name: `Arrêt ${ (newLine.stops?.length || 0) + 1}`, time: '12:00', lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    setNewLine(prev => ({ ...prev, stops: [...(prev.stops || []), newStop] }));
  };

  const addStopManually = () => {
    const defaultLat = userLocation?.lat || 48.8566;
    const defaultLng = userLocation?.lng || 2.3522;
    setNewLine(prev => ({ ...prev, stops: [...(prev.stops || []), { name: 'Nouvel arrêt', time: '12:00', lat: defaultLat, lng: defaultLng }] }));
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
  const handleManualCourseFinished = (report: ManualReport) => { setLastManualReport(report); setView(AppView.MANUAL_SUMMARY); };
  const handleExportPDF = () => { window.print(); };

  const renderHome = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="flex flex-col">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">LISTE DES LIGNES</p>
            <p className="text-sm font-bold text-blue-600">{lines.length} Itinéraires actifs</p>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 sm:flex-none p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-blue-600 active:scale-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <FileUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-tight">Import</span>
              <input type="file" accept=".xml,text/xml,application/xml" onChange={handleImportXML} className="hidden" />
            </label>
            <button onClick={exportToXML} className="flex-1 sm:flex-none p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-emerald-600 active:scale-90 transition-all flex items-center justify-center gap-1.5">
              <FileDown size={16} />
              <span className="text-[10px] font-black uppercase tracking-tight">Export</span>
            </button>
          </div>
        </div>

        {/* Tuile de sécurité orange */}
        <div className="bg-orange-50 border-2 border-orange-100 rounded-[32px] p-5 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-orange-500 text-white p-2.5 rounded-2xl shrink-0 shadow-lg shadow-orange-200">
            <AlertTriangle size={20} />
          </div>
          <p className="text-[11px] font-bold text-orange-900 leading-tight italic">
            Cette application est une aide à la conduite, elle ne doit pas être manipulée lorsque le véhicule roule.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lines.map(line => (
            <div key={line.id} onClick={() => handleSelectLine(line)} className="bg-white p-4 rounded-3xl shadow-sm flex items-center space-x-4 active:scale-[0.98] transition-transform cursor-pointer border border-slate-100 hover:shadow-md group">
              <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg shadow-blue-200"><span className="text-[8px] opacity-70 leading-none">LIGNE</span><span className="text-xl leading-none">{line.number}</span></div>
              <div className="flex-1 min-w-0"><h3 className="font-bold text-slate-800 truncate text-base tracking-tight">{line.name}</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} /> {line.stops.length} arrêts</span></div></div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => handleEditLine(e, line)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Pencil size={18} /></button>
                <button onClick={(e) => deleteLine(e, line.id)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-3 z-[100] pb-[calc(env(safe-area-inset-bottom,24px)+24px)] justify-center">
        <div className="w-full max-w-4xl flex gap-4">
          <button onClick={() => setView(AppView.GEOMANUEL)} className="flex-1 bg-slate-800 text-white px-4 py-4 rounded-3xl shadow-lg font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform group border border-white/10">
            <Navigation2 size={20} className="group-hover:rotate-12 transition-transform text-blue-400" />
            <span className="text-sm tracking-tight italic uppercase font-black">GeoManuel</span>
          </button>
          <button onClick={handleCreateLine} className="flex-[1.5] bg-blue-600 text-white px-4 py-4 rounded-3xl shadow-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform group">
            <PlusCircle size={22} className="group-hover:rotate-90 transition-transform" />
            <span className="text-sm tracking-tight italic uppercase font-black">Nouvelle ligne</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => selectedLine && (
    <div className="flex flex-col lg:flex-row h-full bg-white relative">
      <div className="h-[40vh] lg:h-full lg:w-1/2 relative shrink-0">
        <MapComponent stops={selectedLine.stops} focusLocation={mapFocus} height="100%" />
        <button onClick={() => setView(AppView.HOME)} className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-xl z-20 active:scale-90 transition-transform"><ChevronLeft size={24} className="text-slate-800" /></button>
      </div>
      <div className="flex-1 flex flex-col bg-white rounded-none lg:rounded-none lg:mt-0 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] lg:shadow-none min-h-0 overflow-visible">
        <div className="p-8 flex-1 overflow-y-auto pb-48 lg:pb-32 min-h-0">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10 lg:hidden"></div>
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-1">
              <div className="text-blue-600 font-black text-xs uppercase tracking-widest italic">Détails de l'itinéraire</div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight uppercase italic tracking-tighter">{selectedLine.name}</h2>
            </div>
            <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black italic">#{selectedLine.number}</div>
          </div>
          <div className="space-y-8 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-1 before:bg-slate-50">
            {selectedLine.stops.map((s, i) => (
              <div key={i} className="flex items-start space-x-6 relative">
                <div className={`w-6 h-6 rounded-full border-[5px] bg-white z-10 flex items-center justify-center shrink-0 ${i === 0 ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : i === selectedLine!.stops.length - 1 ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-slate-100'}`}></div>
                <div className="flex-1 flex justify-between items-center group cursor-pointer" onClick={() => setMapFocus({ lat: s.lat, lng: s.lng })}>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</span>
                    <div className="flex items-center gap-2 mt-1"><Clock size={12} className="text-slate-400" /><span className="text-xs text-slate-500 font-medium tracking-tight">Passage à {s.time}</span></div>
                  </div>
                  <div className={`${i === 0 ? 'bg-emerald-50 text-emerald-600' : i === selectedLine!.stops.length - 1 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'} text-[10px] font-black px-3 py-1.5 rounded-xl shrink-0 italic uppercase tracking-wider border border-current opacity-70`}>{i === 0 ? 'Départ' : i === selectedLine!.stops.length - 1 ? 'Terminus' : `Arrêt ${i+1}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute lg:sticky bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-50 pt-16 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
          <button onClick={startServiceLogic} className="w-full max-w-lg mx-auto bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-[32px] font-black flex items-center justify-center space-x-4 shadow-[0_25px_60px_-10px_rgba(37,99,235,0.6)] active:scale-[0.96] transition-all border-b-[10px] border-blue-900 uppercase italic tracking-tight group">
            <div className="bg-white/20 p-2 rounded-xl"><Play size={28} fill="currentColor" /></div>
            <div className="flex flex-col items-start leading-none"><span className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Prêt ?</span><span className="text-2xl">Démarrer le service</span></div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white px-6 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-[100] safe-top shrink-0">
        <button onClick={() => setView(AppView.HOME)} className="p-2 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-2 group"><ArrowLeft size={24} /><span className="text-xs font-bold uppercase tracking-tight text-slate-400 hidden sm:block">Retour</span></button>
        <h2 className="text-xl font-black tracking-tight uppercase italic text-slate-900">{newLine.id ? "Modification" : "Ajout"} d'itinéraire</h2>
        <div className="w-10"></div>
      </div>
      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-2 lg:gap-0">
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informations générales</p>
            <div className="grid grid-cols-4 gap-4">
              <input placeholder="NO." value={newLine.number ?? ''} onChange={e => setNewLine(prev => ({...prev, number: e.target.value}))} className="bg-white border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-500 outline-none shadow-sm" />
              <input placeholder="Nom de la destination..." value={newLine.name ?? ''} onChange={e => setNewLine(prev => ({...prev, name: e.target.value}))} className="col-span-3 bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-500 outline-none shadow-sm" />
            </div>
          </div>
          <div className="lg:hidden space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placement sur carte</p>
            <div className="relative h-72 rounded-[32px] overflow-hidden border-2 border-slate-100 shadow-sm"><MapComponent stops={(newLine.stops || []) as Stop[]} currentPos={newLine.stops?.length === 0 ? userLocation : null} height="100%" onMapClick={handleMapClickOnCreate} /></div>
          </div>
          <div className="space-y-4 pb-32 lg:pb-0">
            <div className="flex justify-between items-center px-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Séquence des stations</p><button onClick={addStopManually} className="text-xs text-blue-600 font-black uppercase flex items-center gap-1"><PlusCircle size={14} /> Ajouter</button></div>
            <div className="space-y-3">
              {newLine.stops?.map((stop, i) => (
                <div key={i} className="bg-white p-4 rounded-3xl border-2 border-slate-100 flex flex-col gap-4 shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{i + 1}</div>
                    <div className="flex-1"><input value={stop.name ?? ''} onChange={e => updateStop(i, 'name', e.target.value)} className="w-full font-bold text-slate-800 outline-none bg-transparent" placeholder="Nom de la station" /></div>
                    <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 gap-2 shrink-0"><Clock size={12} className="text-slate-400" /><input type="time" value={stop.time ?? ''} onChange={e => updateStop(i, 'time', e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-900 outline-none w-14" /></div>
                    <button onClick={() => removeStop(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <div className="flex-1 flex items-center bg-slate-50/50 rounded-xl px-3 py-2 gap-2"><Crosshair size={12} className="text-slate-400" /><input type="text" value={stop.lat ?? ''} onChange={e => updateStop(i, 'lat', e.target.value)} className="bg-transparent text-[10px] font-mono font-bold text-slate-900 outline-none w-full" placeholder="LAT" /></div>
                    <div className="flex-1 flex items-center bg-slate-50/50 rounded-xl px-3 py-2 gap-2"><Crosshair size={12} className="text-slate-400" /><input type="text" value={stop.lng ?? ''} onChange={e => updateStop(i, 'lng', e.target.value)} className="bg-transparent text-[10px] font-mono font-bold text-slate-900 outline-none w-full" placeholder="LNG" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:block relative h-full bg-white border-l border-slate-100">
           <MapComponent stops={(newLine.stops || []) as Stop[]} currentPos={newLine.stops?.length === 0 ? userLocation : null} height="100%" onMapClick={handleMapClickOnCreate} />
           <div className="absolute top-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Édition de carte active</div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-[200] pb-[env(safe-area-inset-bottom,24px)] flex justify-center">
        <div className="w-full max-w-2xl flex gap-3">
          <button onClick={() => setView(AppView.HOME)} className="flex-1 bg-slate-100 text-slate-600 p-5 rounded-3xl font-black uppercase tracking-tight active:scale-95 transition-all text-sm">Annuler</button>
          <button onClick={saveLine} disabled={!newLine.number || !newLine.name || !newLine.stops?.length} className="flex-[2] bg-slate-900 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all disabled:opacity-20 uppercase tracking-tight"><Save size={22} /><span className="text-sm">Enregistrer</span></button>
        </div>
      </div>
    </div>
  );

  const renderSummary = () => {
    if (!lastReport) return null;
    const totalBoarded = lastReport.stops.reduce((acc, s) => acc + (s.boardedCount || 0), 0);
    const totalDropped = lastReport.stops.reduce((acc, s) => acc + (s.droppedCount || 0), 0);
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto print:bg-white print:text-slate-900">
        <div className="p-8 space-y-8 pb-32 max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center print:hidden">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><CheckCircle2 size={32} className="text-emerald-500" /></div>
            <button onClick={() => setView(AppView.HOME)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"><Home size={16} /> Fermer</button>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Rapport de ligne</h2>
            <div className="flex items-center gap-2"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest print:text-slate-500">Résumé - Ligne {lastReport.lineNumber}</p><span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">BY MRICO73</span></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-1 print:border-slate-200">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Durée Totale</div>
              <div className="text-2xl font-black italic text-emerald-400 print:text-emerald-600">{lastReport.duration}</div>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[32px] p-6 space-y-1 print:border-blue-200">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Montées</div>
              <div className="text-3xl font-black italic text-blue-400 print:text-blue-600">{totalBoarded} <span className="text-sm not-italic opacity-60">pax</span></div>
            </div>
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-[32px] p-6 space-y-1 print:border-rose-200">
              <div className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Descentes</div>
              <div className="text-3xl font-black italic text-rose-400 print:text-rose-600">{totalDropped} <span className="text-sm not-italic opacity-60">pax</span></div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden print:border-slate-200">
            <div className="bg-white/5 p-6 border-b border-white/10 flex items-center gap-3 print:bg-slate-50 print:border-slate-200"><CalendarDays size={18} className="text-blue-500" /><span className="text-xs font-black uppercase tracking-widest italic">Chronologie détaillée</span></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {lastReport.stops.map((stop, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 print:border-slate-100">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-100 truncate print:text-slate-900">{stop.stopName}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Prévu: {stop.scheduledTime}</span>
                      <div className="flex items-center gap-2"><span className="text-blue-400 font-black text-[10px] flex items-center gap-1 uppercase tracking-tighter"><UserPlus size={10} /> {stop.boardedCount}</span><span className="text-rose-400 font-black text-[10px] flex items-center gap-1 uppercase tracking-tighter"><UserMinus size={10} /> {stop.droppedCount}</span></div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0">
                    <span className={`text-lg font-black italic leading-none ${stop.status === 'late' ? 'text-rose-500' : stop.status === 'early' ? 'text-blue-400' : 'text-emerald-400'}`}>{stop.actualTime}</span>
                    <div className={`text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-full border ${stop.status === 'late' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : stop.status === 'early' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>{stop.status === 'late' ? `+${stop.diffMinutes} min` : stop.status === 'early' ? `${stop.diffMinutes} min` : 'OK'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom,24px)] print:hidden flex justify-center"><button onClick={handleExportPDF} className="w-full max-w-md bg-emerald-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight"><FileText size={22} /><span className="text-sm">Exporter en PDF</span></button></div>
      </div>
    );
  }

  const renderManualSummary = () => {
    if (!lastManualReport) return null;
    const stopsAsStops: Stop[] = lastManualReport.stops.map((s, i) => ({ name: `Arrêt ${i + 1}`, time: s.time, lat: s.lat, lng: s.lng }));
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto print:bg-white print:text-slate-900">
        <div className="p-8 space-y-8 pb-32 max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center print:hidden">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><CheckCircle2 size={32} className="text-blue-500" /></div>
            <button onClick={() => setView(AppView.HOME)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"><Home size={16} /> Fermer</button>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Bilan GeoManuel</h2>
            <div className="flex items-center gap-2"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest print:text-slate-500">Traçage dynamique en direct</p><span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">BY MRICO73</span></div>
          </div>
          <div className="relative h-64 sm:h-96 rounded-[40px] overflow-hidden border border-white/10 bg-white/5 shadow-2xl print:hidden"><MapComponent stops={stopsAsStops} dark={true} height="100%" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-1 print:border-slate-200">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Durée Totale</div>
              <div className="text-2xl font-black italic text-emerald-400 print:text-emerald-600">{lastManualReport.duration}</div>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[32px] p-6 space-y-1 print:border-blue-200"><div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Montées</div><div className="text-3xl font-black italic text-blue-400 print:text-blue-600">{lastManualReport.totalBoarded} <span className="text-sm not-italic opacity-60">pax</span></div></div>
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-[32px] p-6 space-y-1 print:border-rose-200"><div className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Descentes</div><div className="text-3xl font-black italic text-rose-400 print:text-rose-600">{lastManualReport.totalDropped} <span className="text-sm not-italic opacity-60">pax</span></div></div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden print:border-slate-200">
            <div className="bg-white/5 p-6 border-b border-white/10 flex items-center gap-3 print:bg-slate-50 print:border-slate-200"><MapPinCheck size={18} className="text-blue-500" /><span className="text-xs font-black uppercase tracking-widest italic">Points d'immobilisation ({lastManualReport.stops.length})</span></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {lastManualReport.stops.map((stop, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 print:border-slate-100">
                  <div className="flex flex-col min-w-0"><span className="font-bold text-slate-100 truncate print:text-slate-900">Point {i + 1}</span><div className="flex items-center gap-2"><span className="text-emerald-400 font-black text-[10px] flex items-center gap-1 uppercase"><UserPlus size={10} /> {stop.boarded}</span><span className="text-rose-400 font-black text-[10px] flex items-center gap-1 uppercase"><UserMinus size={10} /> {stop.dropped}</span></div></div>
                  <div className="text-right flex flex-col items-end"><span className="text-lg font-black italic leading-none text-slate-100 print:text-slate-900">{stop.time}</span><div className="text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-slate-400">Enregistré</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom,24px)] print:hidden flex justify-center">
          <div className="w-full max-w-2xl flex gap-4">
            <button onClick={handleConvertManualToLine} className="flex-1 bg-blue-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight italic"><Save size={22} /><span className="text-sm">Sauvegarder</span></button>
            <button onClick={handleExportPDF} className="flex-1 bg-emerald-600 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all uppercase tracking-tight italic"><FileText size={22} /><span className="text-sm">PDF</span></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full max-w-screen-2xl mx-auto overflow-hidden shadow-2xl relative bg-slate-50 text-slate-900 flex flex-col">
      {view !== AppView.SUMMARY && view !== AppView.DRIVING && view !== AppView.PREP && view !== AppView.GEOMANUEL && view !== AppView.MANUAL_SUMMARY && (
        <div className="bg-blue-600 text-white px-6 py-5 flex items-center justify-between shadow-lg sticky top-0 z-[100] safe-top shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Bus size={22} /></div>
            <div className="flex flex-col"><h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">GEOligne</h1><span className="text-[8px] font-bold opacity-70 uppercase tracking-widest mt-0.5">BY MRICO73</span></div>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono font-black bg-white/10 px-4 py-2 rounded-2xl border border-white/10 tabular-nums shrink-0"><Clock size={16} className="text-blue-200" /> {currentTime}</div>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">
        {view === AppView.HOME && renderHome()}
        {view === AppView.DETAIL && renderDetail()}
        {view === AppView.CREATE && renderCreate()}
        {view === AppView.PREP && selectedLine && (<PrepView line={selectedLine} userLocation={userLocation} onCancel={() => setView(AppView.DETAIL)} onArrived={() => setView(AppView.DRIVING)} />)}
        {view === AppView.DRIVING && selectedLine && (<DrivingView line={selectedLine} onExit={() => setView(AppView.DETAIL)} onFinish={handleCourseFinished} onStop={() => { setSelectedLine(null); setView(AppView.HOME); }} />)}
        {view === AppView.SUMMARY && renderSummary()}
        {view === AppView.GEOMANUEL && <GeoManuelView onExit={() => setView(AppView.HOME)} onFinish={handleManualCourseFinished} />}
        {view === AppView.MANUAL_SUMMARY && renderManualSummary()}
      </div>
    </div>
  );
};

// --- Sub-component: GeoManuelView ---
interface GeoManuelViewProps { onExit: () => void; onFinish: (report: ManualReport) => void; }
const GeoManuelView: React.FC<GeoManuelViewProps> = ({ onExit, onFinish }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [boardedTotal, setBoardedTotal] = useState(0);
  const [droppedTotal, setDroppedTotal] = useState(0);
  const [stops, setStops] = useState<ManualStop[]>([]);
  const [trace, setTrace] = useState<{ lat: number, lng: number }[]>([]);
  const [currentStopBoarded, setCurrentStopBoarded] = useState(0);
  const [currentStopDropped, setCurrentStopDropped] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(newPos);
        if (isRunning) setTrace(prev => [...prev, newPos]);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isRunning]);

  const handleStart = () => { setIsRunning(true); setStartTime(new Date()); setStops([]); setTrace([]); setBoardedTotal(0); setDroppedTotal(0); };
  const handleValidateStop = () => {
    if (!currentPos) return;
    const newStop: ManualStop = { id: stops.length + 1, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), lat: currentPos.lat, lng: currentPos.lng, boarded: currentStopBoarded, dropped: currentStopDropped };
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
    const finalStops = currentStopBoarded > 0 || currentStopDropped > 0 
      ? [...stops, { id: stops.length + 1, time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), lat: currentPos?.lat || 0, lng: currentPos?.lng || 0, boarded: currentStopBoarded, dropped: currentStopDropped }]
      : stops;
    onFinish({ startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), duration: `${Math.floor(diff/60)}h ${diff%60}min`, totalBoarded: boardedTotal + currentStopBoarded, totalDropped: droppedTotal + currentStopDropped, stops: finalStops, trace });
  };

  return (
    <div className="fixed inset-0 bg-[#080b14] text-white flex flex-col z-[500] safe-top safe-bottom">
      <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-hidden relative max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-3xl p-4 shrink-0">
           <div className="flex items-center gap-3">
             <div className="bg-slate-800 p-2 rounded-xl text-blue-400"><MapIcon size={20} /></div>
             <div className="flex flex-col"><div className="flex items-center gap-1.5"><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none">Traçage Manuel</span><span className="text-[7px] font-bold opacity-30 uppercase border-l border-white/20 pl-1.5">BY MRICO73</span></div><span className="text-lg font-black italic uppercase leading-none mt-1">{isRunning ? "En cours..." : "En attente"}</span></div>
           </div>
           <button onClick={onExit} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight active:scale-95 transition-all">Quitter</button>
        </div>
        <div className="flex-1 relative rounded-[48px] overflow-hidden border border-white/10 bg-[#0a0d18]"><MapComponent stops={stops.map((s, i) => ({ name: `Pt ${i+1}`, time: s.time, lat: s.lat, lng: s.lng }))} currentPos={currentPos} dark isDriving height="100%" /></div>
        <div className="grid grid-cols-2 gap-3 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2"><div className="bg-emerald-600/20 p-1.5 rounded-lg text-emerald-400"><UserPlus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montées</span></div>
            <div className="flex items-center justify-between"><button disabled={!isRunning} onClick={() => setCurrentStopBoarded(Math.max(0, currentStopBoarded - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-20"><Minus size={18} /></button><div className="text-2xl font-black italic text-emerald-400 tabular-nums">{currentStopBoarded}</div><button disabled={!isRunning} onClick={() => setCurrentStopBoarded(currentStopBoarded + 1)} className="w-10 h-10 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center disabled:opacity-20"><Plus size={18} /></button></div>
          </div>
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2"><div className="bg-rose-600/20 p-1.5 rounded-lg text-rose-400"><UserMinus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descentes</span></div>
            <div className="flex items-center justify-between"><button disabled={!isRunning} onClick={() => setCurrentStopDropped(Math.max(0, currentStopDropped - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-20"><Minus size={18} /></button><div className="text-2xl font-black italic text-rose-400 tabular-nums">{currentStopDropped}</div><button disabled={!isRunning} onClick={() => setCurrentStopDropped(currentStopDropped + 1)} className="w-10 h-10 rounded-xl bg-rose-600 shadow-lg shadow-rose-500/20 flex items-center justify-center disabled:opacity-20"><Plus size={18} /></button></div>
          </div>
        </div>
        <div className="h-[12%] sm:h-20 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          {!isRunning ? (
            <button onClick={handleStart} className="w-full h-full bg-blue-600 border-b-[8px] border-blue-800 rounded-[32px] flex items-center justify-center gap-4 active:translate-y-1 shadow-2xl"><Play size={24} fill="currentColor" /><span className="text-xl font-black italic uppercase tracking-tight">Début de course</span></button>
          ) : (
            <div className="flex gap-4 h-full"><button onClick={handleValidateStop} className="flex-[2] bg-emerald-600 border-b-[8px] border-emerald-800 rounded-[32px] flex flex-col items-center justify-center shadow-2xl"><CircleDot size={20} className="mb-1" /><span className="text-sm font-black italic uppercase tracking-tight">Valider Arrêt</span></button><button onClick={handleFinish} className="flex-1 bg-rose-600 border-b-[8px] border-rose-800 rounded-[32px] flex flex-col items-center justify-center shadow-2xl"><LogOut size={20} className="mb-1" /><span className="text-sm font-black italic uppercase tracking-tight">Fin</span></button></div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: PrepView ---
interface PrepViewProps { line: BusLine; userLocation: { lat: number; lng: number } | null; onCancel: () => void; onArrived: () => void; }
const PrepView: React.FC<PrepViewProps> = ({ line, userLocation, onCancel, onArrived }) => {
  const [currentPos, setCurrentPos] = useState(userLocation);
  const firstStop = line.stops[0];
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentPos(newPos);
      if (getDistance(newPos.lat, newPos.lng, firstStop.lat, firstStop.lng) <= 50) onArrived();
    }, (err) => console.error(err), { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [firstStop, onArrived]);
  const stats = useMemo(() => {
    if (!currentPos) return null;
    const dist = getDistance(currentPos.lat, currentPos.lng, firstStop.lat, firstStop.lng);
    const [h, m] = firstStop.time.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
    const timeToStart = Math.floor((scheduled.getTime() - new Date().getTime()) / 60000);
    const travelTime = Math.ceil(dist / 500);
    return { dist, status: (timeToStart - travelTime) < 0 ? 'late' : 'early', diff: Math.abs(timeToStart - travelTime) };
  }, [currentPos, firstStop]);
  return (
    <div className="fixed inset-0 bg-[#080b14] text-white z-[500] flex flex-col safe-top safe-bottom">
      <div className="flex-1 p-4 sm:p-6 space-y-4 flex flex-col overflow-hidden max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-3xl p-4 shrink-0">
           <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-xl"><Navigation size={20} className="animate-pulse" /></div><div className="flex flex-col"><div className="flex items-center gap-1.5"><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none">Approche</span><span className="text-[7px] font-bold opacity-30 uppercase pl-1.5 border-l border-white/20">BY MRICO73</span></div><span className="text-lg font-black italic uppercase truncate w-32 leading-none mt-1">{firstStop.name}</span></div></div>
           <button onClick={onCancel} className="bg-rose-600/20 text-rose-500 px-4 py-2 rounded-xl text-xs font-black uppercase active:scale-95 transition-all">Annuler</button>
        </div>
        <div className="flex-1 rounded-[48px] overflow-hidden border border-white/10 relative"><MapComponent stops={[firstStop]} currentPos={currentPos} dark isDriving height="100%" /></div>
        <div className="grid grid-cols-2 gap-3 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-5 space-y-1"><span className="text-[8px] font-black uppercase text-slate-500">Distance</span><div className="text-2xl font-black italic">{stats ? (stats.dist < 1000 ? `${Math.round(stats.dist)}m` : `${(stats.dist/1000).toFixed(1)}km`) : '--'}</div></div>
          <div className={`border rounded-[32px] p-5 space-y-1 ${stats?.status === 'late' ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}><span className={`text-[8px] font-black uppercase ${stats?.status === 'late' ? 'text-rose-400' : 'text-emerald-400'}`}>{stats?.status === 'late' ? 'Retard' : 'Marge'}</span><div className={`text-2xl font-black italic ${stats?.status === 'late' ? 'text-rose-500' : 'text-emerald-500'}`}>{stats ? `${stats.diff} min` : '--'}</div></div>
        </div>
        <div className="bg-blue-600 border-b-8 border-blue-800 rounded-[32px] p-6 text-center shadow-2xl space-y-4 sm:max-w-md sm:mx-auto sm:w-full">
          <div className="space-y-1"><span className="text-[10px] font-black uppercase opacity-70">Départ prévu</span><div className="text-4xl font-black italic">{firstStop.time}</div></div>
          <button onClick={onArrived} className="w-full bg-white text-blue-700 py-3 rounded-2xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 active:scale-[0.98] shadow-xl"><PlayCircle size={20} />Démarrer</button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: Driving View ---
interface DrivingViewProps { line: BusLine; onExit: () => void; onStop: () => void; onFinish: (report: CourseReport) => void; }
const DrivingView: React.FC<DrivingViewProps> = ({ line, onExit, onStop, onFinish }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nextStopIdx, setNextStopIdx] = useState(0);
  const [now, setNow] = useState(new Date());
  const [actualArrivalTimes, setActualArrivalTimes] = useState<string[]>([]);
  const [boardedCounts, setBoardedCounts] = useState<number[]>([]);
  const [droppedCounts, setDroppedCounts] = useState<number[]>([]);
  const [currentBoarding, setCurrentBoarding] = useState(0);
  const [currentDropped, setCurrentDropped] = useState(0);
  const [capturedArrivalTime, setCapturedArrivalTime] = useState<string | null>(null);
  const wasAtStationRef = useRef(false);
  const startTime = useRef(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition((pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => console.error(err), { enableHighAccuracy: true });
      return () => { navigator.geolocation.clearWatch(watchId); clearInterval(interval); };
    }
    return () => clearInterval(interval);
  }, []);

  const currentStop = line.stops[nextStopIdx];
  const scheduleOffset = useMemo(() => {
    if (!currentStop) return 0;
    const [h, m] = currentStop.time.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
    return Math.floor((now.getTime() - scheduled.getTime()) / 60000);
  }, [currentStop, now]);

  const distanceRemaining = useMemo(() => (!currentPos || !currentStop) ? null : getDistance(currentPos.lat, currentPos.lng, currentStop.lat, currentStop.lng), [currentPos, currentStop]);
  const isAtStation = useMemo(() => distanceRemaining !== null && distanceRemaining <= 50, [distanceRemaining]);

  const handleNext = useCallback(() => {
    const time = capturedArrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const arrivals = [...actualArrivalTimes, time];
    const boarded = [...boardedCounts, currentBoarding];
    const dropped = [...droppedCounts, currentDropped];
    setActualArrivalTimes(arrivals); setBoardedCounts(boarded); setDroppedCounts(dropped);
    setCurrentBoarding(0); setCurrentDropped(0); setCapturedArrivalTime(null); wasAtStationRef.current = false;
    if (nextStopIdx < line.stops.length - 1) setNextStopIdx(prev => prev + 1);
    else {
      const diff = Math.floor((new Date().getTime() - startTime.current.getTime()) / 60000);
      onFinish({ lineName: line.name, lineNumber: line.number, startTime: startTime.current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), duration: `${Math.floor(diff/60)}h ${diff%60}min`, stops: line.stops.map((s, idx) => {
        const [schH, schM] = s.time.split(':').map(Number); const [actH, actM] = (arrivals[idx] || "00:00").split(':').map(Number);
        const d = (actH * 60 + actM) - (schH * 60 + schM);
        return { stopName: s.name, scheduledTime: s.time, actualTime: arrivals[idx] || "--:--", status: d > 2 ? 'late' : d < -2 ? 'early' : 'on-time', diffMinutes: Math.abs(d), boardedCount: boarded[idx] || 0, droppedCount: dropped[idx] || 0 };
      }) });
    }
  }, [nextStopIdx, line, actualArrivalTimes, boardedCounts, droppedCounts, currentBoarding, currentDropped, capturedArrivalTime, onFinish]);

  useEffect(() => {
    if (isAtStation) { wasAtStationRef.current = true; if (!capturedArrivalTime) setCapturedArrivalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); }
    else if (wasAtStationRef.current && distanceRemaining !== null && distanceRemaining > 50) handleNext();
  }, [isAtStation, distanceRemaining, capturedArrivalTime, handleNext]);

  return (
    <div className="fixed inset-0 bg-[#080b14] text-white flex flex-col font-sans overflow-hidden z-[500] safe-top safe-bottom">
      <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-hidden relative max-w-5xl mx-auto w-full">
        <div className="flex gap-3 h-[10%] sm:h-20 shrink-0">
          <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-center border transition-colors duration-500 ${scheduleOffset < -1 ? 'bg-amber-950/20 border-amber-500/30' : scheduleOffset > 2 ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
            <div className={`text-[8px] font-black uppercase flex items-center gap-1.5 ${scheduleOffset < -1 ? 'text-amber-400' : scheduleOffset > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>{scheduleOffset < -1 ? 'Avance' : scheduleOffset > 2 ? 'Retard' : 'Ponctuel'}<span className="text-[7px] font-bold opacity-30 lowercase ml-auto">by mrico73</span></div>
            <div className="flex items-baseline gap-1.5"><span className="text-2xl font-black italic">{scheduleOffset === 0 ? 'Ok' : scheduleOffset > 0 ? `+${scheduleOffset}` : scheduleOffset}</span><span className="text-[10px] opacity-50 font-bold uppercase">min</span></div>
          </div>
          <div className="flex-[0.6] rounded-3xl p-4 flex flex-col justify-center bg-[#10162a] border border-white/5"><div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Flag size={12} /> Distance</div><span className="text-xl font-black italic tracking-tighter leading-none">{distanceRemaining === null ? '--' : (distanceRemaining < 1000 ? `${Math.round(distanceRemaining)} m` : `${(distanceRemaining / 1000).toFixed(1)} km`)}</span></div>
          <button onClick={() => window.confirm("Annuler le service ?") && onExit()} className="flex-[0.4] rounded-3xl p-4 flex flex-col items-center justify-center bg-white/5 border border-white/10 shrink-0"><RotateCcw size={18} className="text-slate-400" /><span className="text-[7px] font-black uppercase mt-1 text-slate-500">Annuler</span></button>
        </div>
        <div className="flex-1 relative rounded-[48px] overflow-hidden border border-white/10 bg-[#0a0d18]"><MapComponent stops={line.stops} currentPos={currentPos} dark isDriving height="100%" /></div>
        <div className={`transition-all rounded-[40px] p-5 flex items-center justify-between shadow-2xl shrink-0 ${isAtStation ? 'bg-emerald-900/40 border-emerald-500 border' : 'bg-[#10162a] border-white/10 border'}`}>
          <div className="flex gap-4 items-center min-w-0"><div className="w-14 h-14 rounded-[20px] flex flex-col items-center justify-center font-black shrink-0 border-b-8 bg-blue-600 border-blue-800 text-white italic"><span className="text-2xl leading-none">{line.number}</span></div><div className="flex flex-col min-w-0"><div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isAtStation ? 'text-emerald-400' : 'text-blue-500'}`}>{isAtStation ? 'Arrêt en cours' : 'Prochain arrêt'}</div><h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none truncate">{currentStop?.name}</h2></div></div>
          <div className="text-3xl font-black italic text-slate-200 tabular-nums">{currentStop?.time}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0 sm:max-w-md sm:mx-auto sm:w-full">
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2"><div className="bg-emerald-600/20 p-1.5 rounded-lg text-emerald-400"><UserPlus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montées</span></div>
            <div className="flex items-center justify-between"><button onClick={() => setCurrentBoarding(Math.max(0, currentBoarding - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Minus size={18} /></button><div className="text-2xl font-black italic text-emerald-400 tabular-nums">{currentBoarding}</div><button onClick={() => setCurrentBoarding(currentBoarding + 1)} className="w-10 h-10 rounded-xl bg-emerald-600 shadow-lg flex items-center justify-center"><Plus size={18} /></button></div>
          </div>
          <div className="bg-[#10162a] border border-white/10 rounded-[32px] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2"><div className="bg-rose-600/20 p-1.5 rounded-lg text-rose-400"><UserMinus size={16} /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descentes</span></div>
            <div className="flex items-center justify-between"><button onClick={() => setCurrentDropped(Math.max(0, currentDropped - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Minus size={18} /></button><div className="text-2xl font-black italic text-rose-400 tabular-nums">{currentDropped}</div><button onClick={() => setCurrentDropped(currentDropped + 1)} className="w-10 h-10 rounded-xl bg-rose-600 shadow-lg flex items-center justify-center"><Plus size={18} /></button></div>
          </div>
        </div>
        <div className="flex gap-4 h-[12%] sm:h-20 shrink-0 pb-2 sm:max-w-md sm:mx-auto sm:w-full">
          <button onClick={() => setNextStopIdx(p => Math.max(0, p - 1))} className="flex-1 bg-white/5 rounded-[32px] flex items-center justify-center text-slate-600 border border-white/5"><ChevronLeft size={32} /></button>
          <button onClick={handleNext} className={`flex-[3] border-b-[8px] rounded-[32px] flex items-center justify-center transition-all shadow-2xl ${nextStopIdx === line.stops.length - 1 ? 'bg-rose-600 border-rose-800' : 'bg-blue-600 border-blue-800'}`}>
            <span className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">{nextStopIdx === line.stops.length - 1 ? 'Terminer' : (isAtStation ? 'Partir' : 'Valider Manuel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
