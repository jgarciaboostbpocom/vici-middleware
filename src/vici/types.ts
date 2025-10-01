export interface LiveCall {
  did: string;
  callSeconds: number;
  isVoicemail: boolean;
  disposition?: string;
  state?: string;       // e.g., 'TX' when known
  areaCode?: string;
}
export interface DidStats {
  did: string;
  callsToday: number;
  rollingAht: number;
}
