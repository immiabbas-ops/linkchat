export * from './constants';
export * from './types';
export * from './image-io';
export * from './edge-detection';
export * from './perspective';
export * from './enhancement';
export * from './a4-export';
export * from './pdf-export';
export * from './quality-check';
export * from './signatures';

import type { Point, EnhancementMode, SignaturePlacement, ScanPageData } from './types';
import { detectDocumentCorners, fallbackCorners } from './edge-detection';
import { perspectiveCorrect, autoRotateCanvas } from './perspective';
import { applyEnhancement } from './enhancement';
import { exportPageToA4 } from './a4-export';
import { createCanvas } from './image-io';

/** Full scan pipeline: detect → perspective → rotate → enhance. */
export async function processScanFrame(
  sourceCanvas: HTMLCanvasElement,
  enhancement: EnhancementMode = 'auto',
  manualCorners?: Point[] | null,
): Promise<Blob> {
  const corners = manualCorners ?? detectDocumentCorners(sourceCanvas) ?? fallbackCorners(
    sourceCanvas.width,
    sourceCanvas.height,
  );

  let warped = perspectiveCorrect(sourceCanvas, corners);
  warped = autoRotateCanvas(warped);
  return applyEnhancement(warped, enhancement);
}

export async function finalizePageForExport(
  page: Pick<ScanPageData, 'blob' | 'signatures' | 'enhancement'>,
): Promise<Blob> {
  const enhanced = await applyEnhancement(page.blob, page.enhancement);
  return exportPageToA4(enhanced, page.signatures);
}

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(video.videoWidth, video.videoHeight);
  ctx.drawImage(video, 0, 0);
  return canvas;
}
