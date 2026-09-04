/**
 * documentProcessor.js
 * 
 * Provides utility functions for detecting document boundaries and enhancing
 * images (brightness, contrast, sharpening, etc.) purely on the client-side
 * using the Canvas API.
 */

/**
 * Basic image enhancement using Canvas 2D API.
 * Applies brightness, contrast, saturation, and optional sharpen filter.
 * 
 * @param {HTMLImageElement} image - Source image.
 * @param {Object} options - Enhancement options: brightness, contrast, saturation, sharpen.
 * @returns {Promise<string>} Base64 data URL of the enhanced image.
 */
export const enhanceImage = async (image, options = {}) => {
  const {
    brightness = 1.0,
    contrast = 1.0,
    saturation = 1.0,
    sharpen = false,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = image.width;
  canvas.height = image.height;

  // Apply CSS filters for basic adjustments
  ctx.filter = `brightness(${brightness * 100}%) contrast(${contrast * 100}%) saturate(${saturation * 100}%)`;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // Reset filter for pixel manipulation
  ctx.filter = 'none';

  if (sharpen) {
    applySharpenFilter(ctx, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Applies a basic convolution matrix for sharpening.
 */
function applySharpenFilter(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const side = Math.round(Math.sqrt(9));
  const halfSide = Math.floor(side / 2);
  const src = new Uint8ClampedArray(data);
  const w = width;
  const h = height;

  const weights = [
    0, -1,  0,
   -1,  5, -1,
    0, -1,  0
  ];
  const opaque = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dstOff = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, a = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          
          if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
            a += src[srcOff + 3] * wt;
          }
        }
      }
      
      data[dstOff] = r;
      data[dstOff + 1] = g;
      data[dstOff + 2] = b;
      data[dstOff + 3] = a + opaque * (255 - a);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Loads OpenCV.js dynamically from CDN.
 */
export const loadOpenCv = () => {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      if (window.cv.Mat) return resolve(window.cv);
      // It's still loading (defined but not initialized)
      window.cv['onRuntimeInitialized'] = () => resolve(window.cv);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.onload = () => {
      window.cv['onRuntimeInitialized'] = () => {
        resolve(window.cv);
      };
    };
    script.onerror = () => {
      reject(new Error('Failed to load OpenCV.js'));
    };
    document.body.appendChild(script);
  });
};
