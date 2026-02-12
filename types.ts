
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
}

export interface CourseReport {
  lineName: string;
  lineNumber: string;
  startTime: string;
  endTime: string;
  duration: string;
  stops: StopReport[];
}

export enum AppView {
  HOME = 'home',
  DETAIL = 'detail',
  DRIVING = 'driving',
  CREATE = 'create',
  SUMMARY = 'summary'
}
