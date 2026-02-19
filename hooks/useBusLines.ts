
import { useState, useEffect } from 'react';
import { BusLine } from '../types';
import { INITIAL_LINES } from '../constants';

const STORAGE_KEY = 'geoligne_bus_lines';

export const useBusLines = () => {
  const [lines, setLines] = useState<BusLine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_LINES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addLine = (line: BusLine) => setLines(prev => [...prev, line]);
  const deleteLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: string, newLine: BusLine) => 
    setLines(prev => prev.map(l => l.id === id ? newLine : l));

  return { lines, addLine, deleteLine, updateLine, setLines };
};
