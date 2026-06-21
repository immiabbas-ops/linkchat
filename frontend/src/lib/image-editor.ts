export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawStroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface TextOverlay {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface ImageEditState {
  rotation: number;
  crop: CropRect | null;
  strokes: DrawStroke[];
  texts: TextOverlay[];
}

export const DRAW_COLORS = ['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];
export const CROP_RATIOS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
] as const;

export function defaultEditState(): ImageEditState {
  return { rotation: 0, crop: null, strokes: [], texts: [] };
}

export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function getRotatedDimensions(width: number, height: number, rotation: number) {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) return { width: height, height: width };
  return { width, height };
}

export function drawImageToCanvas(
  img: HTMLImageElement,
  rotation = 0,
  crop: CropRect | null = null,
): HTMLCanvasElement {
  const srcW = crop ? crop.width : img.naturalWidth;
  const srcH = crop ? crop.height : img.naturalHeight;
  const srcX = crop?.x ?? 0;
  const srcY = crop?.y ?? 0;

  const { width, height } = getRotatedDimensions(srcW, srcH, rotation);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
  return canvas;
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  scaleX: number,
  scaleY: number,
) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * Math.max(scaleX, scaleY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
    }
    ctx.stroke();
  }
}

export function renderTexts(
  ctx: CanvasRenderingContext2D,
  texts: TextOverlay[],
  scaleX: number,
  scaleY: number,
) {
  for (const item of texts) {
    const size = item.fontSize * Math.max(scaleX, scaleY);
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = size * 0.04;
    const x = item.x * scaleX;
    const y = item.y * scaleY;
    ctx.strokeText(item.text, x, y);
    ctx.fillText(item.text, x, y);
  }
}

export async function exportEditedImage(
  file: File,
  edit: ImageEditState,
  hd = true,
): Promise<File> {
  const img = await loadImageElement(file);
  const base = drawImageToCanvas(img, edit.rotation, edit.crop);
  const ctx = base.getContext('2d')!;
  const scaleX = base.width / (edit.crop ? edit.crop.width : img.naturalWidth);
  const scaleY = base.height / (edit.crop ? edit.crop.height : img.naturalHeight);

  renderStrokes(ctx, edit.strokes, scaleX, scaleY);
  renderTexts(ctx, edit.texts, scaleX, scaleY);

  const maxWidth = hd ? 2560 : 1280;
  const quality = hd ? 0.92 : 0.78;
  let { width, height } = base;
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  out.getContext('2d')!.drawImage(base, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', quality));
  URL.revokeObjectURL(img.src);
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export function clampCrop(rect: CropRect, imgW: number, imgH: number, ratio: number | null): CropRect {
  let { x, y, width, height } = rect;
  width = Math.max(40, Math.min(width, imgW));
  height = Math.max(40, Math.min(height, imgH));

  if (ratio) {
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
  }

  x = Math.max(0, Math.min(x, imgW - width));
  y = Math.max(0, Math.min(y, imgH - height));
  width = Math.min(width, imgW - x);
  height = Math.min(height, imgH - y);

  return { x, y, width, height };
}

export function defaultCropRect(imgW: number, imgH: number, ratio: number | null): CropRect {
  if (!ratio) return { x: imgW * 0.05, y: imgH * 0.05, width: imgW * 0.9, height: imgH * 0.9 };
  const imgRatio = imgW / imgH;
  let width: number;
  let height: number;
  if (imgRatio > ratio) {
    height = imgH * 0.9;
    width = height * ratio;
  } else {
    width = imgW * 0.9;
    height = width / ratio;
  }
  return {
    x: (imgW - width) / 2,
    y: (imgH - height) / 2,
    width,
    height,
  };
}
