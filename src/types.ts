export interface DocxFile {
  id: string;
  name: string;
  path: string;
  arrayBuffer: ArrayBuffer;
  enabled: boolean;
  html: string | null;
  size: number;
}

export interface ProcessingState {
  loading: boolean;
  progress: number;
  message: string;
  error: string | null;
}
