import type { EnhancementMode } from './types';
import { createCanvas, loadImage, canvasToBlob } from './image-io';

export async function applyEnhancement(source: Blob | HTMLCanvasElement, mode: EnhancementMode): Promise<Blob> {
  let canvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    const img = await loadImage(source);
    const [c, ctx] = createCanvas(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);
    canvas = c;
  }

  if (mode === 'original') {
    sharpenText(canvas);
    return canvasToBlob(canvas, 'image/jpeg', 0.94);
  }

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const brightness = estimateBrightness(data);
  const contrastBoost = mode === 'white' ? 1.55 : mode === 'bw' ? 1.7 : 1.25;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (mode !== 'color') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    } else {
      r = adjustChannel(r, brightness, 1.08);
      g = adjustChannel(g, brightness, 1.08);
      b = adjustChannel(b, brightness, 1.08);
    }

    if (mode === 'white' || mode === 'auto') {
      const gray = r;
      const adjusted = clamp((gray - 128) * contrastBoost + 128 + (220 - brightness) * 0.15);
      const paper = adjusted > 175 ? Math.min(255, adjusted + 22) : adjusted;
      if (mode === 'auto') {
        const shadowLift = paper < 90 ? paper + 18 : paper;
        data[i] = data[i + 1] = data[i + 2] = shadowLift;
      } else {
        data[i] = data[i + 1] = data[i + 2] = paper;
      }
    } else if (mode === 'bw') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const adjusted = clamp((gray - 128) * contrastBoost + 128);
      const v = adjusted > 140 ? 255 : adjusted < 95 ? 0 : adjusted > 200 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    } else if (mode === 'color') {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  removeShadowVignette(ctx, canvas.width, canvas.height, mode);
  sharpenText(canvas);

  return canvasToBlob(canvas, 'image/jpeg', 0.94);
}

function estimateBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n++;
  }
  return n ? sum / n : 128;
}

function adjustChannel(v: number, brightness: number, factor: number): number {
  const delta = (140 - brightness) * 0.35;
  return clamp((v - 128) * factor + 128 + delta);
}

function clamp(v: number): number {
  return Math.min(255, Math.max(0, v));
}

function removeShadowVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: EnhancementMode,
) {
  if (mode === 'original') return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function sharpenText(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[ki++];
          }
        }
        data[(y * w + x) * 4 + c] = clamp(sum);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
