import type { Point } from './types';
import { sortCorners } from './edge-detection';
import { createCanvas } from './image-io';

/** Perspective-correct document quad to axis-aligned rectangle. */
export function perspectiveCorrect(
  source: HTMLCanvasElement | HTMLImageElement,
  corners: Point[],
  outputWidth?: number,
  outputHeight?: number,
): HTMLCanvasElement {
  const srcW = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const srcH = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
  const sorted = sortCorners(corners);

  const topW = dist(sorted[0], sorted[1]);
  const bottomW = dist(sorted[3], sorted[2]);
  const leftH = dist(sorted[0], sorted[3]);
  const rightH = dist(sorted[1], sorted[2]);

  const dw = outputWidth ?? Math.round(Math.max(topW, bottomW));
  const dh = outputHeight ?? Math.round(Math.max(leftH, rightH));

  const [dest, dctx] = createCanvas(dw, dh);
  dctx.fillStyle = '#ffffff';
  dctx.fillRect(0, 0, dw, dh);

  const srcCanvas =
    source instanceof HTMLCanvasElement
      ? source
      : (() => {
          const [c, cx] = createCanvas(srcW, srcH);
          cx.drawImage(source, 0, 0);
          return c;
        })();

  const srcData = srcCanvas.getContext('2d')!.getImageData(0, 0, srcW, srcH);
  const destData = dctx.createImageData(dw, dh);

  for (let y = 0; y < dh; y++) {
    const v = dh <= 1 ? 0 : y / (dh - 1);
    for (let x = 0; x < dw; x++) {
      const u = dw <= 1 ? 0 : x / (dw - 1);
      const sx = bilinearU(sorted[0].x, sorted[1].x, sorted[2].x, sorted[3].x, u, v);
      const sy = bilinearU(sorted[0].y, sorted[1].y, sorted[2].y, sorted[3].y, u, v);
      const [r, g, b, a] = sampleBilinear(srcData, sx, sy);
      const di = (y * dw + x) * 4;
      destData.data[di] = r;
      destData.data[di + 1] = g;
      destData.data[di + 2] = b;
      destData.data[di + 3] = a;
    }
  }

  dctx.putImageData(destData, 0, 0);
  return dest;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bilinearU(tl: number, tr: number, br: number, bl: number, u: number, v: number): number {
  const top = tl + (tr - tl) * u;
  const bottom = bl + (br - bl) * u;
  return top + (bottom - top) * v;
}

function sampleBilinear(img: ImageData, x: number, y: number): [number, number, number, number] {
  const { width, height, data } = img;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return [255, 255, 255, 255];

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const v00 = data[i00 + c];
    const v10 = data[i10 + c];
    const v01 = data[i01 + c];
    const v11 = data[i11 + c];
    out[c] = Math.round(
      v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy,
    );
  }
  return out;
}

/** Auto-rotate so the longer edge is vertical (portrait document). */
export function autoRotateCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.height >= canvas.width) return canvas;
  const [rotated, ctx] = createCanvas(canvas.height, canvas.width);
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
}
