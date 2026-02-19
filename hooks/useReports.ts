
import { useState, useEffect } from 'react';
import { CourseReport } from '../types';

const STORAGE_KEY = 'geoligne_reports_history';

export const useReports = () => {
  const [reports, setReports] = useState<CourseReport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const addReport = (report: CourseReport) => {
    setReports(prev => {
      const newReport = { ...report, id: report.id || Math.random().toString(36).substr(2, 9) };
      const newHistory = [newReport, ...prev];
      return newHistory.slice(0, 10); // Garder seulement les 10 derniers
    });
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const clearHistory = () => setReports([]);

  return { reports, addReport, deleteReport, clearHistory };
};
