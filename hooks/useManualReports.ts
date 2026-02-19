
import { useState, useEffect } from 'react';
import { ManualReport } from '../types';

const STORAGE_KEY = 'geoligne_manual_reports_history';

export const useManualReports = () => {
  const [manualReports, setManualReports] = useState<ManualReport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualReports));
  }, [manualReports]);

  const addManualReport = (report: ManualReport) => {
    setManualReports(prev => {
      const newReport = { ...report, id: report.id || Math.random().toString(36).substr(2, 9) };
      const newHistory = [newReport, ...prev];
      return newHistory.slice(0, 10); // Garder seulement les 10 derniers
    });
  };

  const deleteManualReport = (id: string) => {
    setManualReports(prev => prev.filter(r => r.id !== id));
  };

  return { manualReports, addManualReport, deleteManualReport };
};
