
export interface Stop {
  name: string;
  time: string;
  lat: number;
  lng: number;
}

export interface BusLine {
  id: string;
  number: string;
  name: string;
  stops: Stop[];
}

export interface StopReport {
  stopName: string;
  scheduledTime: string;
  actualTime: string;
  status: 'early' | 'on-time' | 'late';
  diffMinutes: number;
  boardedCount: number;
  droppedCount: number;
}

export interface CourseReport {
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
