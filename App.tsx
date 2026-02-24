
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, BusLine, Stop, CourseReport, ManualReport, LineType } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useBusLines } from './hooks/useBusLines';
import { useWakeLock } from './hooks/useWakeLock';
import { useReports } from './hooks/useReports';
import { useManualReports } from './hooks/useManualReports';
import { getDistance } from './utils/geoUtils';

// Components
import Header from './components/Layout/Header';
import HomeView from './components/Views/HomeView';
import DetailView from './components/Views/DetailView';
import CreateView from './components/Views/CreateView';
import PrepView from './components/Views/PrepView';
import DrivingView from './components/Views/DrivingView';
import SummaryView from './components/Views/SummaryView';
import GeoManuelView from './components/Views/GeoManuelView';
import ManualSummaryView from './components/Views/ManualSummaryView';
import TimeCalculator from './components/Tools/TimeCalculator';
import PassengerCounter from './components/Tools/PassengerCounter';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [isTimeCalcOpen, setIsTimeCalcOpen] = useState(false);
  const [isPassengerCounterOpen, setIsPassengerCounterOpen] = useState(false);
  const { lines, addLine, deleteLine, updateLine, setLines } = useBusLines();
  const { reports, addReport, deleteReport } = useReports();
  const { manualReports, addManualReport, deleteManualReport } = useManualReports();
  const { location: userLocation, heading: userHeading } = useGeolocation();
  
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<BusLine>>({});
  const [lastReport, setLastReport] = useState<CourseReport | null>(null);
  const [lastManualReport, setLastManualReport] = useState<ManualReport | null>(null);
  const [screenType, setScreenType] = useState<'Mobile' | 'Tablette' | 'Ordinateur'>('Mobile');
  
  // Persistance du temps de début pour le service en cours
  const [courseStartTimestamp, setCourseStartTimestamp] = useState<number | null>(null);

  useWakeLock([AppView.PREP, AppView.DRIVING, AppView.GEOMANUEL].includes(view));

  useEffect(() => {
    const detectScreen = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenType('Mobile');
      else if (width < 1024) setScreenType('Tablette');
      else setScreenType('Ordinateur');
    };
    detectScreen();
    window.addEventListener('resize', detectScreen);
    return () => window.removeEventListener('resize', detectScreen);
  }, []);

  const handleSelectLine = (line: BusLine) => { 
    setSelectedLine(line); 
    setView(AppView.DETAIL); 
  };

  const handleEditLine = (e: React.MouseEvent, line: BusLine) => {
    e.stopPropagation();
    setEditingLine({ ...line });
    setView(AppView.CREATE);
  };

  const handleCreateLine = () => {
    setEditingLine({ number: '', name: '', stops: [], type: 'Urbain', info: '' });
    setView(AppView.CREATE);
  };

  const handleSaveLine = (line: BusLine) => {
    if (line.id) updateLine(line.id, line);
    else addLine({ ...line, id: Math.random().toString(36).substr(2, 9) });
    setView(AppView.HOME);
  };

  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlText = event.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const imported: BusLine[] = [];
      const lineElements = xmlDoc.getElementsByTagName("line");
      for (let i = 0; i < lineElements.length; i++) {
        const lineEl = lineElements[i];
        const stops: Stop[] = [];
        const stopElements = lineEl.getElementsByTagName("stop");
        for (let j = 0; j < stopElements.length; j++) {
          const stopEl = stopElements[j];
          stops.push({
            id: Math.random().toString(36).substr(2, 9),
            name: stopEl.getElementsByTagName("name")[0]?.textContent || "Station",
            time: stopEl.getElementsByTagName("time")[0]?.textContent || "00:00",
            lat: parseFloat(stopEl.getElementsByTagName("lat")[0]?.textContent || "0"),
            lng: parseFloat(stopEl.getElementsByTagName("lng")[0]?.textContent || "0"),
            annotation: stopEl.getElementsByTagName("annotation")[0]?.textContent || "",
          });
        }
        
        const trace: { lat: number, lng: number }[] = [];
        const traceElements = lineEl.getElementsByTagName("trace_point");
        for (let j = 0; j < traceElements.length; j++) {
          const tpEl = traceElements[j];
          trace.push({
            lat: parseFloat(tpEl.getElementsByTagName("lat")[0]?.textContent || "0"),
            lng: parseFloat(tpEl.getElementsByTagName("lng")[0]?.textContent || "0"),
          });
        }

        imported.push({
          id: lineEl.getAttribute("id") || Math.random().toString(36).substr(2, 9),
          number: lineEl.getElementsByTagName("number")[0]?.textContent || "??",
          name: lineEl.getElementsByTagName("name")[0]?.textContent || "Import",
          info: lineEl.getElementsByTagName("info")[0]?.textContent || "",
          stops,
          trace: trace.length > 0 ? trace : undefined,
          type: (lineEl.getElementsByTagName("type")[0]?.textContent as LineType) || 'Urbain'
        });
      }
      if (imported.length > 0 && window.confirm(`Importer ${imported.length} itinéraires ?`)) setLines(prev => [...prev, ...imported]);
    };
    reader.readAsText(file);
  };

  const handleExportToXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?><geoligne>';
    lines.forEach(l => {
      xml += `<line id="${l.id}"><number>${l.number}</number><name>${l.name}</name><info>${l.info || ''}</info><type>${l.type || 'Urbain'}</type><stops>`;
      l.stops.forEach(s => {
        xml += `<stop><name>${s.name}</name><time>${s.time}</time><lat>${s.lat}</lat><lng>${s.lng}</lng><annotation>${s.annotation || ''}</annotation></stop>`;
      });
      xml += `</stops>`;
      if (l.trace) {
        xml += `<trace>`;
        l.trace.forEach(p => {
          xml += `<trace_point><lat>${p.lat}</lat><lng>${p.lng}</lng></trace_point>`;
        });
        xml += `</trace>`;
      }
      xml += `</line>`;
    });
    xml += '</geoligne>';
    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `geoligne_export_${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
  };

  const startServiceLogic = () => {
    if (!selectedLine || !userLocation) { 
      setCourseStartTimestamp(Date.now());
      setView(AppView.DRIVING); 
      return; 
    }
    const distToFirst = getDistance(userLocation.lat, userLocation.lng, selectedLine.stops[0].lat, selectedLine.stops[0].lng);
    if (distToFirst > 20) setView(AppView.PREP);
    else {
      setCourseStartTimestamp(Date.now());
      setView(AppView.DRIVING);
    }
  };

  const handleCourseFinished = useCallback((report: CourseReport) => { 
    const reportWithDate = { ...report, date: new Date().toLocaleDateString('fr-FR') };
    setLastReport(reportWithDate); 
    addReport(reportWithDate);
    setCourseStartTimestamp(null);
    setView(AppView.SUMMARY); 
  }, [addReport]);

  const handleViewPastReport = (report: CourseReport) => {
    setLastReport(report);
    setView(AppView.SUMMARY);
  };

  const handleManualFinished = (report: ManualReport) => { 
    const reportWithDate = { ...report, date: new Date().toLocaleDateString('fr-FR') };
    setLastManualReport(reportWithDate);
    addManualReport(reportWithDate);
    setView(AppView.MANUAL_SUMMARY); 
  };

  const handleViewPastManualReport = (report: ManualReport) => {
    setLastManualReport(report);
    setView(AppView.MANUAL_SUMMARY);
  };

  const handleConvertManualToLine = () => {
    if (!lastManualReport) return;
    setEditingLine({
      number: 'M1',
      name: `Itinéraire Manuel ${new Date().toLocaleDateString()}`,
      stops: lastManualReport.stops.map((ms, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: `Arrêt ${idx + 1}`,
        time: ms.time,
        lat: ms.lat,
        lng: ms.lng
      })),
      trace: lastManualReport.trace,
      type: 'Urbain',
      info: 'Traçage issu d\'un relevé manuel GeoManuel.'
    });
    setView(AppView.CREATE);
  };

  return (
    <div className="h-[100dvh] w-full max-w-screen-2xl mx-auto overflow-hidden shadow-2xl relative bg-slate-50 text-slate-900 flex flex-col app-container print:h-auto print:overflow-visible print:block">
      {![AppView.SUMMARY, AppView.DRIVING, AppView.PREP, AppView.GEOMANUEL, AppView.MANUAL_SUMMARY].includes(view) && (
        <Header 
          screenType={screenType} 
          onOpenCalculator={() => setIsTimeCalcOpen(true)}
          onOpenPassengerCounter={() => setIsPassengerCounterOpen(true)}
        />
      )}
      
      <div className="flex-1 overflow-hidden relative main-content-wrapper print:overflow-visible print:h-auto print:block">
        {view === AppView.HOME && (
          <HomeView 
            lines={lines} 
            reports={reports}
            manualReports={manualReports}
            onSelectLine={handleSelectLine}
            onEditLine={handleEditLine}
            onDeleteLine={(e, id) => { e.stopPropagation(); if (window.confirm("Supprimer ?")) deleteLine(id); }}
            onImportXML={handleImportXML}
            onExportToXML={handleExportToXML}
            onGeoManuel={() => setView(AppView.GEOMANUEL)}
            onCreateLine={handleCreateLine}
            onViewReport={handleViewPastReport}
            onDeleteReport={deleteReport}
            onViewManualReport={handleViewPastManualReport}
            onDeleteManualReport={deleteManualReport}
          />
        )}

        {view === AppView.DETAIL && selectedLine && (
          <DetailView 
            line={selectedLine} 
            screenType={screenType}
            onBack={() => setView(AppView.HOME)}
            onStart={startServiceLogic}
            onExportXMR={(l) => {
              let xml = `<?xml version="1.0" encoding="UTF-8"?><geoligne><line id="${l.id}"><number>${l.number}</number><name>${l.name}</name><info>${l.info || ''}</info><type>${l.type || 'Urbain'}</type><stops>`;
              l.stops.forEach(s => xml += `<stop><name>${s.name}</name><time>${s.time}</time><lat>${s.lat}</lat><lng>${s.lng}</lng></stop>`);
              xml += '</stops></line></geoligne>';
              const blob = new Blob([xml], { type: 'application/xml' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${l.number}_line.xmr`;
              link.click();
            }}
            onExportPDF={() => window.print()}
          />
        )}

        {view === AppView.CREATE && (
          <CreateView 
            initialLine={editingLine}
            userLocation={userLocation}
            onCancel={() => setView(AppView.HOME)}
            onSave={handleSaveLine}
          />
        )}

        {view === AppView.PREP && selectedLine && (
          <PrepView 
            line={selectedLine} 
            userLocation={userLocation}
            heading={userHeading}
            onCancel={() => setView(AppView.DETAIL)}
            onArrived={() => {
              setCourseStartTimestamp(Date.now());
              setView(AppView.DRIVING);
            }}
          />
        )}

        {view === AppView.DRIVING && selectedLine && courseStartTimestamp && (
          <DrivingView 
            line={selectedLine} 
            initialHeading={userHeading}
            startTimestamp={courseStartTimestamp}
            onExit={() => {
              setCourseStartTimestamp(null);
              setView(AppView.DETAIL);
            }}
            onFinish={handleCourseFinished}
          />
        )}

        {view === AppView.SUMMARY && lastReport && (
          <SummaryView 
            report={lastReport}
            onClose={() => setView(AppView.HOME)}
            onExportPDF={() => window.print()}
          />
        )}

        {view === AppView.GEOMANUEL && (
          <GeoManuelView 
            onExit={() => setView(AppView.HOME)}
            onFinish={handleManualFinished}
          />
        )}

        {view === AppView.MANUAL_SUMMARY && lastManualReport && (
          <ManualSummaryView 
            report={lastManualReport}
            onClose={() => setView(AppView.HOME)}
            onConvert={handleConvertManualToLine}
            onExportPDF={() => window.print()}
          />
        )}
      </div>

      {/* Modal du Calculateur Temporel */}
      <TimeCalculator 
        isOpen={isTimeCalcOpen} 
        onClose={() => setIsTimeCalcOpen(false)} 
      />

      {/* Modal du Compteur Passagers */}
      <PassengerCounter
        isOpen={isPassengerCounterOpen}
        onClose={() => setIsPassengerCounterOpen(false)}
      />
    </div>
  );
};

export default App;
