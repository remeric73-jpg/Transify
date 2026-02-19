
export interface Stop {
  id?: string; // Ajouté pour la gestion stable des listes en React
  name: string;
  time: string;
  lat: number;
  lng: number;
  annotation?: string;
}

export type LineType = 'Scolaire' | 'Urbain' | 'Interurbain' | 'Grande ligne';

export interface BusLine {
  id: string;
  number: string;
  name: string;
  stops: Stop[];
  type?: LineType;
  info?: string;
}

export interface StopReport {
  stopName: string;
  scheduledTime: string;
  actualArrivalTime: string;
  actualDepartureTime?: string;
  status: 'early' | 'on-time' | 'late' | 'not-served';
  isManual?: boolean; // Indique si l'arrêt a été forcé manuellement
  diffMinutes: number; // Différence par rapport à l'arrivée prévue
  boardedCount: number;
  droppedCount: number;
}

export interface CourseReport {
  id?: string;
  date: string;
  lineName: string;
  lineNumber: string;
  startTime: string;
  endTime: string;
  duration: string;
  stops: StopReport[];
}

export interface ManualStop {
  id: number;
  time: string;
  lat: number;
  lng: number;
  boarded: number;
  dropped: number;
}

export interface ManualReport {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  totalBoarded: number;
  totalDropped: number;
  stops: ManualStop[];
  trace: { lat: number, lng: number }[];
}

export enum AppView {
  HOME = 'home',
  DETAIL = 'detail',
  PREP = 'prep',
  DRIVING = 'driving',
  CREATE = 'create',
  SUMMARY = 'summary',
  GEOMANUEL = 'geomanuel',
  MANUAL_SUMMARY = 'manual_summary'
}
