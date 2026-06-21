import { jsPDF } from 'jspdf';
import { A4_HEIGHT_MM, A4_WIDTH_MM } from './constants';
import { blobToDataUrl } from './image-io';

/** Create multi-page A4 PDF from JPEG blobs (each page already A4-sized). */
export async function createPdfFromPages(pages: Blob[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage('a4', 'portrait');
    const dataUrl = await blobToDataUrl(pages[i]);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  }

  return pdf.output('blob');
}
