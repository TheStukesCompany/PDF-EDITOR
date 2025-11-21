export enum ToolType {
  SELECT = 'select',
  TEXT = 'text',
  EDIT_TEXT = 'edit_text',
  HIGHLIGHT = 'highlight',
  PEN = 'pen',
  ERASER = 'eraser',
  SIGNATURE = 'signature',
  RECTANGLE = 'rectangle',
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  type: ToolType;
  pageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  content?: string; // For text
  points?: Position[]; // For pen/highlight paths
  image?: string; // For signatures
  fontSize?: number;
  fontFamily?: string;
}

export interface PDFPageInfo {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
}

export interface GeminiSummary {
  summary: string;
  keywords: string[];
  sentiment: string;
}

export interface ToolSettings {
  color: string;
  fontSize: number;
  fontFamily: string;
  strokeWidth: number;
}
