export interface Point {
  x: number;
  y: number;
}

export type EnhancementMode = 'auto' | 'white' | 'color' | 'original' | 'bw';

export interface SavedSignature {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

export interface SignaturePlacement {
  signatureId: string;
  dataUrl: string;
  /** 0–1 relative to page width */
  x: number;
  /** 0–1 relative to page height */
  y: number;
  scale: number;
  rotation: number;
}

export interface ScanPageData {
  id: string;
  blob: Blob;
  url: string;
  corners: Point[] | null;
  enhancement: EnhancementMode;
  signatures: SignaturePlacement[];
}

export interface ExportQualityReport {
  ok: boolean;
  issues: string[];
  a4RatioCorrect: boolean;
  signatureVisible: boolean;
  sharpEnough: boolean;
  contentComplete: boolean;
}

export type ExportFormat = 'pdf' | 'jpg' | 'png';
