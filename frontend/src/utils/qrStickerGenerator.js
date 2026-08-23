import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

/**
 * Exact layout constants according to specifications:
 * - A4 Sheet: 210 mm width x 297 mm height
 * - 13 rows x 5 columns = 65 stickers per sheet
 * - Left margin: 3 mm
 * - Top margin: 11 mm
 * - Sticker width: 39 mm
 * - Horizontal gap between adjacent stickers: 2 mm
 * - Sticker height: 21.0 mm
 * - Total column height (row 1 to 13): 273 mm -> row pitch = 273 / 13 = 21.0 mm
 */
export const STICKER_LAYOUT = {
  PAGE_WIDTH_MM: 210,
  PAGE_HEIGHT_MM: 297,
  ROWS: 13,
  COLS: 5,
  STICKERS_PER_SHEET: 65,
  LEFT_MARGIN_MM: 3,
  TOP_MARGIN_MM: 11,
  STICKER_WIDTH_MM: 39,
  STICKER_HEIGHT_MM: 21.0,
  ROW_PITCH_MM: 273 / 13, // exactly 21.0 mm
  COL_GAP_MM: 2,
  COL_PITCH_MM: 41, // 39 + 2
  QR_SIZE_MM: 17.5,
  LOGO_SIZE_MM: 5.2,
  DEFAULT_START_COUNTER: 100000001,
  DEFAULT_URL_PREFIX: 'https://bookshelfnet.com/?qr='
};

/**
 * Logo SVG matching the Royal Book Club homepage sparkle emblem
 */
export const getLogoSvgString = (theme = 'maroon') => {
  const isGolden = theme === 'golden';
  const fillColor = isGolden ? '#d4af37' : '#f5e1e4';
  const strokeColor = isGolden ? '#d4af37' : '#78101e';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <path d="M 50 12 C 50 33 33 50 12 50 C 33 50 50 67 50 88 C 50 67 67 50 88 50 C 67 50 50 33 50 12 Z" 
        fill="${fillColor}" 
        fill-opacity="0.4"
        stroke="${strokeColor}" 
        stroke-width="7.5" 
        stroke-linejoin="round" 
        stroke-linecap="round" />
  <path d="M 78 18 L 78 32 M 71 25 L 85 25" 
        stroke="${strokeColor}" 
        stroke-width="5.5" 
        stroke-linecap="round" />
  <polygon points="26,72 30,76 26,80 22,76" 
        fill="${strokeColor}" />
</svg>`;
};

/**
 * Convert SVG string to PNG data URL for jsPDF embedding
 */
export const getLogoPngDataUrl = (theme = 'maroon') => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const img = new Image();
    const svgBlob = new Blob([getLogoSvgString(theme)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Failed to rasterize logo SVG:', err);
        URL.revokeObjectURL(url);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
};

/**
 * Generate preview grid data for rendering on the UI
 */
export const generateStickerPreviewData = async ({
  startCount = STICKER_LAYOUT.DEFAULT_START_COUNTER,
  sheetCount = 1,
  urlPrefix = STICKER_LAYOUT.DEFAULT_URL_PREFIX
} = {}) => {
  const parsedStart = parseInt(startCount, 10) || STICKER_LAYOUT.DEFAULT_START_COUNTER;
  const totalStickers = sheetCount * STICKER_LAYOUT.STICKERS_PER_SHEET;
  const stickers = [];

  for (let i = 0; i < totalStickers; i++) {
    const count = parsedStart + i;
    const sheetIndex = Math.floor(i / STICKER_LAYOUT.STICKERS_PER_SHEET);
    const indexInSheet = i % STICKER_LAYOUT.STICKERS_PER_SHEET;
    const row = Math.floor(indexInSheet / STICKER_LAYOUT.COLS);
    const col = indexInSheet % STICKER_LAYOUT.COLS;
    const url = `${urlPrefix}${count}`;

    // Generate data url for quick UI preview
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        width: 140,
        errorCorrectionLevel: 'M'
      });
    } catch (e) {
      console.warn('Failed to generate preview QR for', url, e);
    }

    stickers.push({
      count,
      url,
      sheetIndex,
      row,
      col,
      qrDataUrl
    });
  }

  return stickers;
};

/**
 * Generate a printable A4 PDF with 65 stickers per sheet
 */
export const generateStickerPdf = async ({
  startCount = STICKER_LAYOUT.DEFAULT_START_COUNTER,
  sheetCount = 1,
  urlPrefix = STICKER_LAYOUT.DEFAULT_URL_PREFIX,
  showCutLines = false,
  theme = 'maroon'
} = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const parsedStart = parseInt(startCount, 10) || STICKER_LAYOUT.DEFAULT_START_COUNTER;
  const logoDataUrl = await getLogoPngDataUrl(theme);

  for (let sheet = 0; sheet < sheetCount; sheet++) {
    if (sheet > 0) {
      doc.addPage('a4', 'portrait');
    }

    const sheetStart = parsedStart + sheet * STICKER_LAYOUT.STICKERS_PER_SHEET;

    for (let r = 0; r < STICKER_LAYOUT.ROWS; r++) {
      for (let c = 0; c < STICKER_LAYOUT.COLS; c++) {
        const stickerIndexInSheet = r * STICKER_LAYOUT.COLS + c;
        const currentCounter = sheetStart + stickerIndexInSheet;
        const targetUrl = `${urlPrefix}${currentCounter}`;

        // Top-left coordinate of this sticker cell
        const x = STICKER_LAYOUT.LEFT_MARGIN_MM + c * STICKER_LAYOUT.COL_PITCH_MM;
        const y = STICKER_LAYOUT.TOP_MARGIN_MM + r * STICKER_LAYOUT.ROW_PITCH_MM;
        const w = STICKER_LAYOUT.STICKER_WIDTH_MM;
        const h = STICKER_LAYOUT.STICKER_HEIGHT_MM;

        // Optional cutting / alignment border guide
        if (showCutLines) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.rect(x, y, w, h);
        }

        // Optional: If golden theme, draw a dark rectangle for the right side or the whole sticker
        if (theme === 'golden') {
          doc.setFillColor(12, 15, 29); // Dark blue/black
          // Fill the area starting after the QR code to the right edge
          doc.rect(x + 18.0, y, w - 18.0, h, 'F');
        }

        // 1. Generate High-Resolution QR Data URL
        const qrDataUrl = await QRCode.toDataURL(targetUrl, {
          margin: 1,
          width: 400,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // 2. Render QR Code (Left Section: 17.5 x 17.5 mm, vertically centered)
        const qrSize = STICKER_LAYOUT.QR_SIZE_MM;
        const qrX = x + 0.8 + 3.0; // shifted 3mm right
        const qrY = y + (h - qrSize) / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // 3. Render Logo Image in between QR and Royal Book Club text (vertically centered)
        const logoSize = STICKER_LAYOUT.LOGO_SIZE_MM;
        const logoX = x + 18.8 + 3.0; // shifted 3mm right
        const logoY = y + (h - logoSize) / 2;
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
        }

        // 4. Render Royal Book Club text
        if (theme === 'golden') {
          doc.setTextColor(212, 175, 55); // Golden
        } else {
          doc.setTextColor(120, 16, 30); // Deep burgundy
        }
        
        doc.setFont('times', 'bold');
        
        const textX = x + 24.6 + 3.0; // shifted 3mm right

        // Line 1: Royal
        doc.setFontSize(10.5);
        doc.text('Royal', textX, y + 7.0);

        // Line 2: Book
        doc.text('Book', textX, y + 11.2);

        // Line 3: Club
        doc.text('Club', textX, y + 15.4);

        // Counter ID tag underneath
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.6);
        if (theme === 'golden') {
          doc.setTextColor(180, 160, 100);
        } else {
          doc.setTextColor(115, 115, 125);
        }
        doc.text(`#${currentCounter}`, textX, y + 19.0);
      }
    }
  }

  return doc;
};
