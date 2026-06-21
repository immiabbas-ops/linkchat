import type { Point } from './types';
import { createCanvas } from './image-io';

/** Default inset when auto-detection fails (still better than full frame). */
export function fallbackCorners(width: number, height: number): Point[] {
  const mx = width * 0.07;
  const my = height * 0.1;
  return [
    { x: mx, y: my },
    { x: width - mx, y: my },
    { x: width - mx, y: height - my },
    { x: mx, y: height - my },
  ];
}

/** Sort corners: top-left, top-right, bottom-right, bottom-left. */
export function sortCorners(points: Point[]): Point[] {
  if (points.length !== 4) return points;
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

/**
 * Detect document quadrilateral with multiple threshold retries.
 * Returns corners in source image coordinates or null.
 */
export function detectDocumentCorners(
  sourceCanvas: HTMLCanvasElement,
  maxAttempts = 4,
): Point[] | null {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const scale = Math.min(1, 480 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const [small, sctx] = createCanvas(sw, sh);
  sctx.drawImage(sourceCanvas, 0, 0, sw, sh);
  const gray = toGrayscale(sctx.getImageData(0, 0, sw, sh));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const threshold = 28 + attempt * 18;
    const edges = sobelEdges(gray, sw, sh, threshold);
    const corners = findQuadFromEdges(edges, sw, sh);
    if (corners) {
      const inv = 1 / scale;
      return sortCorners(corners.map((p) => ({ x: p.x * inv, y: p.y * inv })));
    }
  }
  return null;
}

function toGrayscale(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      gray[y * width + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return boxBlur(gray, width, height, 2);
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src[ny * w + nx];
            count++;
          }
        }
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

function sobelEdges(gray: Float32Array, w: number, h: number, threshold: number): Uint8Array {
  const edges = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] -
        2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] -
        2 * gray[(y - 1) * w + x] -
        gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * w + x] = mag > threshold ? 255 : 0;
    }
  }
  return edges;
}

function findQuadFromEdges(edges: Uint8Array, w: number, h: number): Point[] | null {
  const points: Point[] = [];
  const step = Math.max(2, Math.floor(Math.min(w, h) / 80));
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      if (edges[y * w + x] === 255) points.push({ x, y });
    }
  }
  if (points.length < 20) return null;

  const hull = convexHull(points);
  if (hull.length < 4) return null;

  return simplifyToQuad(hull);
}

function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function simplifyToQuad(hull: Point[]): Point[] | null {
  if (hull.length === 4) return sortCorners(hull);

  let best: Point[] | null = null;
  let bestArea = 0;
  const n = hull.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const quad = sortCorners([hull[i], hull[j], hull[k], hull[l]]);
          const area = quadArea(quad);
          if (area > bestArea) {
            bestArea = area;
            best = quad;
          }
        }
      }
    }
  }
  return best;
}

function quadArea(q: Point[]): number {
  return Math.abs(
    (q[0].x * q[1].y - q[1].x * q[0].y) +
      (q[1].x * q[2].y - q[2].x * q[1].y) +
      (q[2].x * q[3].y - q[3].x * q[2].y) +
      (q[3].x * q[0].y - q[0].x * q[3].y),
  ) / 2;
}

/** Draw detected quad on overlay canvas (for live preview). */
export function drawEdgeOverlay(
  ctx: CanvasRenderingContext2D,
  corners: Point[] | null,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  const pts = corners ?? fallbackCorners(width, height);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}
