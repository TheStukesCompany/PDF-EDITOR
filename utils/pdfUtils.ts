import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Annotation, ToolType } from '../types';

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? rgb(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      )
    : rgb(0, 0, 0);
};

export const savePDF = async (originalPdfBytes: ArrayBuffer, annotations: Annotation[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  
  // Embed Standard Fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  // Helper to map CSS font family string to PDF Standard Font
  const getFont = (fontFamily?: string) => {
      if (!fontFamily) return helveticaFont;
      const family = fontFamily.toLowerCase();
      
      if (family.includes('times') || family.includes('georgia') || family.includes('garamond')) {
          return timesFont;
      }
      if (family.includes('courier') || family.includes('mono')) {
          return courierFont;
      }
      // Default to Helvetica for Arial, Verdana, Tahoma, Impact, Comic Sans, etc.
      // (Since we can't easily embed custom fonts without the file bytes in this setup)
      return helveticaFont;
  };

  for (const ann of annotations) {
    const page = pages[ann.pageIndex];
    const { height } = page.getSize();
    
    switch (ann.type) {
      case ToolType.TEXT:
        if (ann.content) {
          const fontToUse = getFont(ann.fontFamily);
          page.drawText(ann.content, {
            x: ann.x,
            y: height - ann.y - (ann.fontSize || 12), // Adjust for font baseline roughly
            size: ann.fontSize || 12,
            font: fontToUse,
            color: hexToRgb(ann.color || '#000000'),
          });
        }
        break;

      case ToolType.HIGHLIGHT:
      case ToolType.PEN:
        if (ann.points && ann.points.length > 1) {
           const pathPoints = ann.points;
           for (let i = 0; i < pathPoints.length - 1; i++) {
             const p1 = pathPoints[i];
             const p2 = pathPoints[i+1];
             
             page.drawLine({
               start: { x: p1.x, y: height - p1.y },
               end: { x: p2.x, y: height - p2.y },
               thickness: ann.type === ToolType.HIGHLIGHT ? 10 : 2,
               color: hexToRgb(ann.color || '#FFFF00'),
               opacity: ann.type === ToolType.HIGHLIGHT ? 0.4 : 1,
             });
           }
        }
        break;

      case ToolType.RECTANGLE:
        if (ann.width && ann.height) {
            page.drawRectangle({
                x: ann.x,
                y: height - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
                color: hexToRgb(ann.color || '#ffffff'),
                borderColor: undefined,
                borderWidth: 0,
            });
        }
        break;
        
      case ToolType.SIGNATURE:
          if (ann.image && ann.width && ann.height) {
              const pngImage = await pdfDoc.embedPng(ann.image);
              page.drawImage(pngImage, {
                  x: ann.x,
                  y: height - ann.y - ann.height,
                  width: ann.width,
                  height: ann.height
              })
          }
          break;
    }
  }

  return pdfDoc.save();
};