import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function createDeviceId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* randomUUID needs HTTPS in browsers */
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('linkchat_device_id');
  if (!id) {
    id = createDeviceId();
    localStorage.setItem('linkchat_device_id', id);
  }
  return id;
}

export function formatMessageTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase();
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality,
      );
    };

    img.src = URL.createObjectURL(file);
  });
}
