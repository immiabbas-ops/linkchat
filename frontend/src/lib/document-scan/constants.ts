/** A4 at 300 DPI (ISO 216: 210 × 297 mm). */
export const A4_DPI = 300;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * A4_DPI);
export const A4_HEIGHT_PX = Math.round((A4_HEIGHT_MM / 25.4) * A4_DPI);
export const A4_RATIO = A4_WIDTH_MM / A4_HEIGHT_MM;

/** Printable margin (~12 mm each side at 300 DPI). */
export const A4_MARGIN_PX = Math.round((12 / 25.4) * A4_DPI);

export const SIGNATURES_STORAGE_KEY = 'linkchat_saved_signatures';
