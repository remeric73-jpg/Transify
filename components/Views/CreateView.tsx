
import React, { useState } from 'react';
import { ArrowLeft, PlusCircle, Clock, ChevronUp, ChevronDown, MessageSquareText, Trash2, Crosshair, Save, Info, Map as MapIcon } from 'lucide-react';
import MapComponent from '../MapComponent';
import { BusLine, Stop, LineType } from '../../types';

interface CreateViewProps {
  initialLine: Partial<BusLine>;
  userLocation: { lat: number; lng: number } | null;
  onCancel: () => void;
  onSave: (line: BusLine) => void;
}

const LINE_TYPES: LineType[] = ['Scolaire', 'Urbain', 'Interurbain', 'Grande ligne'];

const CreateView: React.FC<CreateViewProps> = ({ initialLine, userLocation, onCancel, onSave }) => {
  const [formData, setFormData] = useState<Partial<BusLine>>(initialLine);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const updateStop = (idx: number, field: keyof Stop, value: any) => {
    setFormData(prev => {
      const stops = [...(prev.stops || [])];
      stops[idx] = { ...stops[idx], [field]: value };
      return { ...prev, stops };
    });
  };

  const moveStop = (idx: number, direction: 'up' | 'down') => {
    setFormData(prev => {
      const stops = [...(prev.stops || [])];
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= stops.length) return prev;
      [stops[idx], stops[newIdx]] = [stops[newIdx], stops[idx]];
      return { ...prev, stops };
    });
  };

  const addStopManually = () => {
    const lat = userLocation?.lat || 48.8566;
    const lng = userLocation?.lng || 2.3522;
    setFormData(prev => ({ ...prev, stops: [...(prev.stops || []), { id: generateId(), name: 'Nouvel arrêt', time: '12:00', lat, lng }] }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    const newStop: Stop = { 
      id: generateId(), 
      name: `Arrêt ${(formData.stops?.length || 0) + 1}`, 
      time: '12:00', 
      lat: parseFloat(lat.toFixed(6)), 
      lng: parseFloat(lng.toFixed(6)) 
    };
    setFormData(prev => ({ ...prev, stops: [...(prev.stops || []), newStop] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 print:hidden">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-[100] safe-top shrink-0">
        <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-2 group">
          <ArrowLeft size={24} />
          <span className="text-xs font-bold uppercase tracking-tight text-slate-400 hidden sm:block">Retour</span>
        </button>
        <h2 className="text-xl font-black tracking-tight uppercase italic text-slate-900">{formData.id ? "Modification" : "Ajout"} d'itinéraire</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-2 lg:gap-0">
        {/* Panneau de gauche : Formulaire */}
        <div className="p-4 sm:p-6 space-y-8 pb-48 lg:order-1 order-2">
          
          {/* Carte sur mobile uniquement (en haut du flux) */}
          <div className="lg:hidden h-64 rounded-[32px] overflow-hidden border-2 border-slate-100 shadow-inner mb-6 relative">
            <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-slate-200">
               <MapIcon size={14} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Sélection sur carte active</span>
            </div>
            <MapComponent 
              stops={(formData.stops || []) as Stop[]} 
              currentPos={userLocation} 
              height="100%" 
              onMapClick={handleMapClick} 
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Informations générales</p>
              <div className="grid grid-cols-4 gap-4">
                <input 
                  placeholder="NO." 
                  value={formData.number || ''} 
                  onChange={e => setFormData(p => ({...p, number: e.target.value}))} 
                  className="bg-white border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-500 outline-none shadow-sm" 
                />
                <input 
                  placeholder="Nom de la destination..." 
                  value={formData.name || ''} 
                  onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                  className="col-span-3 bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-500 outline-none shadow-sm" 
                />
              </div>
              
              <div className="relative group">
                <div className="absolute left-4 top-4 text-slate-400"><Info size={18} /></div>
                <textarea 
                  placeholder="Informations générales sur la ligne (notes, itinéraire global, consignes...)" 
                  value={formData.info || ''} 
                  onChange={e => setFormData(p => ({...p, info: e.target.value}))} 
                  className="w-full bg-white border-2 border-slate-100 p-4 pl-12 rounded-2xl font-medium focus:border-blue-500 outline-none shadow-sm min-h-[100px] resize-none text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {LINE_TYPES.map(type => (
                  <button 
                    key={type} 
                    onClick={() => setFormData(p => ({ ...p, type }))} 
                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.type === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liste des stations ({formData.stops?.length || 0})</p>
                <button onClick={addStopManually} className="text-xs text-blue-600 font-black uppercase flex items-center gap-1">
                  <PlusCircle size={14} /> Ajouter
                </button>
              </div>

              {formData.stops?.map((stop, i) => (
                <div key={stop.id || i} className="bg-white p-4 rounded-3xl border-2 border-slate-100 flex flex-col gap-4 shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-2 shrink-0">
                      <button type="button" onClick={() => moveStop(i, 'up')} disabled={i === 0} className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 disabled:opacity-10 active:scale-90 transition-all">
                        <ChevronUp size={20} />
                      </button>
                      <button type="button" onClick={() => moveStop(i, 'down')} disabled={i === (formData.stops?.length || 0) - 1} className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 disabled:opacity-10 active:scale-90 transition-all">
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-3 min-w-0">
                      <input 
                        value={stop.name || ''} 
                        onChange={e => updateStop(i, 'name', e.target.value)} 
                        className="w-full font-black text-slate-800 outline-none bg-slate-50/50 p-2 rounded-lg border border-transparent focus:border-blue-200" 
                        placeholder="Nom station" 
                      />
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-3 py-2 gap-2 border border-slate-100">
                          <Clock size={14} className="text-slate-400" />
                          <input type="time" value={stop.time || ''} onChange={e => updateStop(i, 'time', e.target.value)} className="bg-transparent text-sm font-black text-slate-900 outline-none w-full" />
                        </div>
                      </div>

                      {/* Coordonnées GPS */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50/30 rounded-xl px-3 py-2 border border-blue-100/50">
                          <label className="text-[7px] font-black text-blue-400 uppercase block mb-1">Latitude</label>
                          <input 
                            type="number" 
                            step="0.000001"
                            value={stop.lat} 
                            onChange={e => updateStop(i, 'lat', parseFloat(e.target.value))} 
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none w-full tabular-nums" 
                          />
                        </div>
                        <div className="bg-blue-50/30 rounded-xl px-3 py-2 border border-blue-100/50">
                          <label className="text-[7px] font-black text-blue-400 uppercase block mb-1">Longitude</label>
                          <input 
                            type="number" 
                            step="0.000001"
                            value={stop.lng} 
                            onChange={e => updateStop(i, 'lng', parseFloat(e.target.value))} 
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none w-full tabular-nums" 
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <MessageSquareText size={14} className="text-slate-300 mt-1 shrink-0" />
                        <textarea 
                          value={stop.annotation || ''} 
                          onChange={e => updateStop(i, 'annotation', e.target.value)} 
                          className="w-full bg-transparent text-[11px] font-medium text-slate-600 outline-none resize-none h-10" 
                          placeholder="Annotation conducteur..." 
                        />
                      </div>
                    </div>
                    <button type="button" onClick={() => setFormData(p => ({...p, stops: p.stops?.filter((_, idx) => idx !== i)}))} className="p-3 text-slate-300 hover:text-rose-500 active:scale-90 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau de droite : Carte (Visible en LG) */}
        <div className="hidden lg:block relative h-full bg-white border-l border-slate-100 lg:order-2 order-1">
           <MapComponent 
            stops={(formData.stops || []) as Stop[]} 
            currentPos={userLocation} 
            height="100%" 
            onMapClick={handleMapClick} 
           />
        </div>
      </div>

      {/* Barre d'action fixe */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-[200] pb-[calc(env(safe-area-inset-bottom,24px)+24px)] flex justify-center">
        <div className="w-full max-w-2xl flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-100 text-slate-600 p-5 rounded-3xl font-black uppercase active:scale-95 transition-all text-sm">
            Annuler
          </button>
          <button 
            onClick={() => onSave(formData as BusLine)} 
            disabled={!formData.number || !formData.name || !formData.stops?.length} 
            className="flex-[2] bg-slate-900 text-white p-5 rounded-3xl font-black flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all disabled:opacity-20 uppercase tracking-tight"
          >
            <Save size={22} />
            <span className="text-sm">Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateView;
