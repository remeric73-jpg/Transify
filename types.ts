
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

export enum AppView {
  HOME = 'home',
  DETAIL = 'detail',
  DRIVING = 'driving',
  CREATE = 'create'
}
