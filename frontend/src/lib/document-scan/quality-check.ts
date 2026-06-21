import type { ExportQualityReport } from './types';
import { A4_HEIGHT_PX, A4_WIDTH_PX, isA4Ratio } from './a4-export';
import { loadImage } from './image-io';

export async function validateExport(
  blob: Blob,
  hasSignatures: boolean,
): Promise<ExportQualityReport> {
  const issues: string[] = [];
  const img = await loadImage(blob);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const a4RatioCorrect =
    (w === A4_WIDTH_PX && h === A4_HEIGHT_PX) || isA4Ratio(w, h, 0.015);
  if (!a4RatioCorrect) issues.push('Document is not true A4 ratio');

  const sharpEnough = await estimateSharpness(blob);
  if (!sharpEnough) issues.push('Image may be blurry — try recapturing with better light');

  const contentComplete = await hasSufficientInk(blob);
  if (!contentComplete) issues.push('Document content may be cut off or empty');

  const signatureVisible = !hasSignatures || (await detectDarkInkInBottomThird(blob));
  if (hasSignatures && !signatureVisible) issues.push('Signature may not be visible');

  return {
    ok: issues.length === 0,
    issues,
    a4RatioCorrect,
    signatureVisible,
    sharpEnough,
    contentComplete,
  };
}

async function estimateSharpness(blob: Blob): Promise<boolean> {
  const img = await loadImage(blob);
  const scale = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let laplacian = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const c = data[i];
      const neighbors =
        data[((y - 1) * w + x) * 4] +
        data[((y + 1) * w + x) * 4] +
        data[(y * w + (x - 1)) * 4] +
        data[(y * w + (x + 1)) * 4];
      laplacian += Math.abs(4 * c - neighbors);
      n++;
    }
  }
  const variance = n ? laplacian / n : 0;
  return variance > 12;
}

async function hasSufficientInk(blob: Blob): Promise<boolean> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  const w = Math.min(200, img.naturalWidth);
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (gray < 200) dark++;
  }
  const ratio = dark / (w * h);
  return ratio > 0.02 && ratio < 0.85;
}

async function detectDarkInkInBottomThird(blob: Blob): Promise<boolean> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const y0 = Math.floor(img.naturalHeight * 0.65);
  const region = ctx.getImageData(0, y0, img.naturalWidth, img.naturalHeight - y0);
  let dark = 0;
  for (let i = 0; i < region.data.length; i += 4) {
    const gray = 0.299 * region.data[i] + 0.587 * region.data[i + 1] + 0.114 * region.data[i + 2];
    if (gray < 120) dark++;
  }
  return dark > region.data.length / 4 / 200;
}
