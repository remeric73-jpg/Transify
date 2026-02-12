
import { BusLine } from './types';

export const INITIAL_LINES: BusLine[] = [
  {
    id: '1',
    number: '14',
    name: 'Gare Centrale - Technopôle',
    stops: [
      { name: 'Gare Centrale', time: '08:00', lat: 48.8566, lng: 2.3522 },
      { name: 'Hôtel de Ville', time: '08:05', lat: 48.8584, lng: 2.3488 },
      { name: 'Place de la Liberté', time: '08:12', lat: 48.8600, lng: 2.3400 },
      { name: 'Technopôle', time: '08:20', lat: 48.8650, lng: 2.3300 }
    ]
  },
  {
    id: '2',
    number: 'B2',
    name: 'Littoral Express',
    stops: [
      { name: 'Port Plaisance', time: '09:00', lat: 48.8400, lng: 2.3500 },
      { name: 'Marché couvert', time: '09:15', lat: 48.8450, lng: 2.3600 },
      { name: 'Plage du Nord', time: '09:30', lat: 48.8500, lng: 2.3700 }
    ]
  }
];

export const MAP_CENTER_DEFAULT: [number, number] = [48.8566, 2.3522];
