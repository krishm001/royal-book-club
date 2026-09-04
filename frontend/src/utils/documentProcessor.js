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

/**
 * Uses OpenCV to detect the document boundary and perform a perspective crop.
 */
export const smartCropImage = async (imageElement) => {
  await loadOpenCv();
  const cv = window.cv;

  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0);

  let src = cv.imread(canvas);
  let dst = new cv.Mat();
  let gray = new cv.Mat();

  // Convert to grayscale and blur
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);

  // Edge detection
  cv.Canny(gray, dst, 75, 200, 3, false);

  // Find contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Find the largest contour
  let maxArea = 0;
  let maxContour = null;
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area > maxArea) {
      maxArea = area;
      maxContour = cnt;
    }
  }

  let finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);

  if (maxContour && maxArea > (canvas.width * canvas.height * 0.05)) {
    // Approximate polygon
    let approx = new cv.Mat();
    let perimeter = cv.arcLength(maxContour, true);
    cv.approxPolyDP(maxContour, approx, 0.02 * perimeter, true);

    // If we have a quadrilateral
    if (approx.rows === 4) {
      let pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
      }

      // Sort points to top-left, top-right, bottom-right, bottom-left
      pts.sort((a, b) => a.y - b.y);
      let top = [pts[0], pts[1]].sort((a, b) => a.x - b.x);
      let bottom = [pts[2], pts[3]].sort((a, b) => a.x - b.x);
      let tl = top[0], tr = top[1], bl = bottom[0], br = bottom[1];

      // Compute new width and height
      let widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
      let widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      let maxWidth = Math.max(Math.round(widthA), Math.round(widthB));

      let heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
      let heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
      let maxHeight = Math.max(Math.round(heightA), Math.round(heightB));

      let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y
      ]);
      let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight
      ]);

      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      let warped = new cv.Mat();
      let dsize = new cv.Size(maxWidth, maxHeight);
      cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      let outCanvas = document.createElement('canvas');
      cv.imshow(outCanvas, warped);
      finalDataUrl = outCanvas.toDataURL('image/jpeg', 0.9);

      srcTri.delete(); dstTri.delete(); M.delete(); warped.delete();
    }
    approx.delete();
  }

  src.delete(); dst.delete(); gray.delete();
  contours.delete(); hierarchy.delete();

  return finalDataUrl;
};

