
export interface LogEntry {
  id: string;
  scNo: string;
  dtrCode: string;
  feederName: string;
  location: string;
  confidence?: 'high' | 'low';
  syncStatus?: 'synced' | 'pending' | 'draft';
  timestamp?: string;
}

export interface ExtractionResult {
  data: LogEntry[];
  rawResponse?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  SUCCESS = 'SUCCESS',
  VIEWING_DATA = 'VIEWING_DATA'
}
