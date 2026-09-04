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
let openCvPromise = null;

export const loadOpenCv = () => {
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      return resolve(window.cv);
    }
    
    // Check if script already exists to avoid duplicates
    if (document.querySelector('script[src="https://docs.opencv.org/4.8.0/opencv.js"]')) {
      const interval = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(interval);
          resolve(window.cv);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.onload = () => {
      if (window.cv && window.cv.Mat) {
        resolve(window.cv);
      } else if (window.cv) {
        window.cv['onRuntimeInitialized'] = () => {
          resolve(window.cv);
        };
      } else {
        const interval = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(interval);
            resolve(window.cv);
          }
        }, 100);
      }
    };
    script.onerror = () => {
      openCvPromise = null;
      reject(new Error('Failed to load OpenCV.js'));
    };
    document.body.appendChild(script);
  });
  
  return openCvPromise;
};

/**
 * Uses OpenCV to detect the document boundary and perform a perspective crop.
 */
export const smartCropImage = async (imageElement) => {
  await loadOpenCv();
  const cv = window.cv;

  const MAX_PROC_SIZE = 500;
  let scale = 1;
  let procWidth = imageElement.width;
  let procHeight = imageElement.height;
  
  if (procWidth > MAX_PROC_SIZE || procHeight > MAX_PROC_SIZE) {
    if (procWidth > procHeight) {
      scale = MAX_PROC_SIZE / procWidth;
      procWidth = MAX_PROC_SIZE;
      procHeight = Math.round(imageElement.height * scale);
    } else {
      scale = MAX_PROC_SIZE / procHeight;
      procHeight = MAX_PROC_SIZE;
      procWidth = Math.round(imageElement.width * scale);
    }
  }

  const procCanvas = document.createElement('canvas');
  procCanvas.width = procWidth;
  procCanvas.height = procHeight;
  const procCtx = procCanvas.getContext('2d');
  procCtx.drawImage(imageElement, 0, 0, procWidth, procHeight);

  let src = cv.imread(procCanvas);
  let dst = new cv.Mat();
  let gray = new cv.Mat();

  // Convert to grayscale and blur heavily to remove texture noise
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  let ksize = new cv.Size(9, 9);
  cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);

  // Edge detection
  cv.Canny(gray, dst, 75, 200, 3, false);

  // Dilate edges to merge disconnected fragments and drastically reduce total contour count
  let M_morph = cv.Mat.ones(5, 5, cv.CV_8U);
  cv.dilate(dst, dst, M_morph, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  M_morph.delete();

  // Find contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Find the largest contour
  let maxArea = 0;
  let maxContourIndex = -1;
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area > maxArea) {
      maxArea = area;
      maxContourIndex = i;
    }
    cnt.delete();
  }

  // Cap final output resolution to prevent warpPerspective from hanging on 12MP images
  const MAX_FINAL_SIZE = 1920;
  let origWidth = imageElement.width;
  let origHeight = imageElement.height;
  if (origWidth > MAX_FINAL_SIZE || origHeight > MAX_FINAL_SIZE) {
    const finalScale = origWidth > origHeight ? (MAX_FINAL_SIZE / origWidth) : (MAX_FINAL_SIZE / origHeight);
    origWidth = Math.round(origWidth * finalScale);
    origHeight = Math.round(origHeight * finalScale);
  }

  const origCanvas = document.createElement('canvas');
  origCanvas.width = origWidth;
  origCanvas.height = origHeight;
  const origCtx = origCanvas.getContext('2d');
  origCtx.drawImage(imageElement, 0, 0, origWidth, origHeight);
  let finalDataUrl = origCanvas.toDataURL('image/jpeg', 0.9);

  if (maxContourIndex !== -1 && maxArea > (procWidth * procHeight * 0.05)) {
    let maxContour = contours.get(maxContourIndex);
    // Approximate polygon
    let approx = new cv.Mat();
    let perimeter = cv.arcLength(maxContour, true);
    cv.approxPolyDP(maxContour, approx, 0.02 * perimeter, true);

    // If we have a quadrilateral
    if (approx.rows === 4) {
      let pts = [];
      const ratioX = origWidth / procWidth;
      const ratioY = origHeight / procHeight;
      for (let i = 0; i < 4; i++) {
        // scale points back to bounded high-res image coordinates
        pts.push({ 
          x: approx.data32S[i * 2] * ratioX, 
          y: approx.data32S[i * 2 + 1] * ratioY 
        });
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

      let highResSrc = cv.imread(origCanvas);
      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      let warped = new cv.Mat();
      let dsize = new cv.Size(maxWidth, maxHeight);
      
      cv.warpPerspective(highResSrc, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      let outCanvas = document.createElement('canvas');
      cv.imshow(outCanvas, warped);
      finalDataUrl = outCanvas.toDataURL('image/jpeg', 0.9);

      highResSrc.delete(); srcTri.delete(); dstTri.delete(); M.delete(); warped.delete();
    }
    approx.delete();
    maxContour.delete();
  }

  src.delete(); dst.delete(); gray.delete();
  contours.delete(); hierarchy.delete();

  return finalDataUrl;
};

