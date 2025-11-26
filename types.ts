export interface AudioStreamConfig {
  sampleRate: number;
}

export enum SessionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface VolumeLevel {
  input: number;
  output: number;
}
