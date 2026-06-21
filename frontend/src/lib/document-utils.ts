import { applyEnhancement } from '@/lib/document-scan/enhancement';
import { createCanvas, loadImage, canvasToBlob } from '@/lib/document-scan/image-io';

/** Enhance a photo to look like a scanned document. */
export async function enhanceDocumentImage(source: Blob | HTMLImageElement): Promise<Blob> {
  if (source instanceof HTMLImageElement) {
    const [c, ctx] = createCanvas(source.naturalWidth, source.naturalHeight);
    ctx.drawImage(source, 0, 0);
    return applyEnhancement(c, 'auto');
  }
  return applyEnhancement(source, 'auto');
}

/** Overlay a professional "SIGNED" stamp on a document image. */
export async function applySignedStamp(
  source: Blob,
  signerName: string,
  signedAt = new Date(),
): Promise<Blob> {
  const img = await loadImage(source);
  const [canvas, ctx] = createCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);

  const stampW = Math.min(canvas.width * 0.38, 280);
  const stampH = stampW * 0.42;
  const x = canvas.width - stampW - canvas.width * 0.06;
  const y = canvas.height - stampH - canvas.height * 0.08;

  ctx.save();
  ctx.translate(x + stampW / 2, y + stampH / 2);
  ctx.rotate(-0.12);

  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = Math.max(2, stampW * 0.018);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  roundRect(ctx, -stampW / 2, -stampH / 2, stampW, stampH, stampW * 0.04);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = `bold ${Math.round(stampH * 0.32)}px system-ui, sans-serif`;
  ctx.fillText('SIGNED', 0, -stampH * 0.06);

  ctx.font = `600 ${Math.round(stampH * 0.14)}px system-ui, sans-serif`;
  ctx.fillText(
    signedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    0,
    stampH * 0.18,
  );

  ctx.font = `500 ${Math.round(stampH * 0.12)}px system-ui, sans-serif`;
  const name = signerName.trim() || 'Authorized';
  ctx.fillText(name.length > 22 ? `${name.slice(0, 20)}…` : name, 0, stampH * 0.34);

  ctx.restore();

  return canvasToBlob(canvas, 'image/jpeg', 0.92);
}

export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

/** Stack scanned pages into one tall document image. */
export async function combineDocumentPages(sources: Blob[]): Promise<Blob> {
  if (sources.length === 0) throw new Error('No pages');
  if (sources.length === 1) return sources[0];

  const images = await Promise.all(sources.map((s) => loadImage(s)));
  const width = Math.max(...images.map((img) => img.naturalWidth));
  const gap = 12;
  const height = images.reduce((sum, img) => sum + img.naturalHeight, 0) + gap * (images.length - 1);

  const [canvas, ctx] = createCanvas(width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  for (const img of images) {
    const x = (width - img.naturalWidth) / 2;
    ctx.drawImage(img, x, y);
    y += img.naturalHeight + gap;
  }

  return canvasToBlob(canvas, 'image/jpeg', 0.92);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export { buildDocumentFilename } from '@/lib/document-scan/signatures';
