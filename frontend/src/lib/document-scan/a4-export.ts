import type { SignaturePlacement } from './types';
import {
  A4_HEIGHT_PX,
  A4_MARGIN_PX,
  A4_RATIO,
  A4_WIDTH_PX,
} from './constants';
import { createCanvas, loadImage, canvasToBlob } from './image-io';

/** Fit document into true A4 canvas at 300 DPI without stretching. */
export async function exportPageToA4(
  source: Blob | HTMLCanvasElement,
  signatures: SignaturePlacement[] = [],
): Promise<Blob> {
  const canvas =
    source instanceof HTMLCanvasElement
      ? source
      : await (async () => {
          const img = await loadImage(source);
          const [c, ctx] = createCanvas(img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, 0, 0);
          return c;
        })();

  const [a4, ctx] = createCanvas(A4_WIDTH_PX, A4_HEIGHT_PX);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const innerW = A4_WIDTH_PX - A4_MARGIN_PX * 2;
  const innerH = A4_HEIGHT_PX - A4_MARGIN_PX * 2;
  const srcRatio = canvas.width / canvas.height;

  let drawW = innerW;
  let drawH = innerW / srcRatio;
  if (drawH > innerH) {
    drawH = innerH;
    drawW = innerH * srcRatio;
  }

  const dx = A4_MARGIN_PX + (innerW - drawW) / 2;
  const dy = A4_MARGIN_PX + (innerH - drawH) / 2;
  ctx.drawImage(canvas, dx, dy, drawW, drawH);

  for (const sig of signatures) {
    await drawSignature(ctx, sig, A4_WIDTH_PX, A4_HEIGHT_PX);
  }

  return canvasToBlob(a4, 'image/jpeg', 0.92);
}

async function drawSignature(
  ctx: CanvasRenderingContext2D,
  sig: SignaturePlacement,
  pageW: number,
  pageH: number,
) {
  const img = await loadImage(sig.dataUrl);
  const baseW = pageW * 0.22 * sig.scale;
  const baseH = (img.naturalHeight / img.naturalWidth) * baseW;
  const x = sig.x * pageW - baseW / 2;
  const y = sig.y * pageH - baseH / 2;

  ctx.save();
  ctx.translate(x + baseW / 2, y + baseH / 2);
  ctx.rotate(sig.rotation);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();
}

export async function exportPageToPng(
  source: Blob,
  signatures: SignaturePlacement[] = [],
): Promise<Blob> {
  const jpeg = await exportPageToA4(source, signatures);
  const img = await loadImage(jpeg);
  const [c, ctx] = createCanvas(A4_WIDTH_PX, A4_HEIGHT_PX);
  ctx.drawImage(img, 0, 0);
  return canvasToBlob(c, 'image/png');
}

export function isA4Ratio(width: number, height: number, tolerance = 0.02): boolean {
  const ratio = width / height;
  return Math.abs(ratio - A4_RATIO) <= tolerance;
}

export { A4_WIDTH_PX, A4_HEIGHT_PX, A4_RATIO };
