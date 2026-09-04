import React, { useEffect, useRef, useState } from 'react';
import { loadOpenCv } from '../../utils/documentProcessor';

/**
 * Renders a video stream and draws a bounding box around detected document edges
 * using OpenCV.js.
 */
const DocumentDetector = ({ videoStream, onCapture, width = 640, height = 480 }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const processingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    loadOpenCv().then(() => {
      setCvLoaded(true);
    }).catch(err => console.error("OpenCV load failed:", err));
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [videoStream]);

  useEffect(() => {
    if (cvLoaded && videoRef.current && canvasRef.current) {
      const processVideo = () => {
        if (!processingRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          processingRef.current = true;
          try {
            const cv = window.cv;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Draw video to main canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Downscale for fast processing
            const procWidth = 320;
            const scale = procWidth / canvas.width;
            const procHeight = Math.round(canvas.height * scale);
            
            const offCanvas = document.createElement('canvas');
            offCanvas.width = procWidth;
            offCanvas.height = procHeight;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(canvas, 0, 0, procWidth, procHeight);
            
            // Read downscaled image to Mat
            let src = cv.imread(offCanvas);
            let dst = new cv.Mat();
            let gray = new cv.Mat();
            
            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            
            // Blur heavily to remove texture noise
            let ksize = new cv.Size(9, 9);
            cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);
            
            // Edge detection
            cv.Canny(gray, dst, 75, 200, 3, false);
            
            // Dilate edges to merge disconnected fragments and reduce total contour count drastically
            let M_morph = cv.Mat.ones(5, 5, cv.CV_8U);
            cv.dilate(dst, dst, M_morph);
            M_morph.delete();
            
            // Find contours
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            // Find largest contour (likely the document)
            let maxArea = 0;
            let maxContourIndex = -1;
            for (let i = 0; i < contours.size(); ++i) {
              let cnt = contours.get(i);
              let area = cv.contourArea(cnt);
              if (area > maxArea && area > (procWidth * procHeight * 0.1)) {
                maxArea = area;
                maxContourIndex = i;
              }
              cnt.delete(); // Prevent memory leak!
            }
            
            if (maxContourIndex !== -1) {
              let maxContour = contours.get(maxContourIndex);
              // Approximate to a polygon
              let approx = new cv.Mat();
              let perimeter = cv.arcLength(maxContour, true);
              cv.approxPolyDP(maxContour, approx, 0.02 * perimeter, true);
              
              if (approx.rows === 4) {
                // Draw manually using native Canvas 2D for speed and overlay mapping
                ctx.strokeStyle = 'rgba(212, 165, 116, 0.9)'; // Royal accent
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                  let px = (approx.data32S[i * 2]) / scale;
                  let py = (approx.data32S[i * 2 + 1]) / scale;
                  if (i === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
              }
              approx.delete();
              maxContour.delete(); // Prevent memory leak!
            }
            
            // Cleanup
            src.delete();
            dst.delete();
            gray.delete();
            contours.delete();
            hierarchy.delete();
            
          } catch (e) {
            console.error("OpenCV processing error:", e);
          }
          processingRef.current = false;
        }
        // Throttle processing to ~5 FPS to prevent UI unresponsiveness
        timeoutRef.current = setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(processVideo);
        }, 200);
      };
      
      animationFrameRef.current = requestAnimationFrame(processVideo);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cvLoaded, videoStream]);

  const handleManualCapture = () => {
    console.log("Capture Document button clicked!");
    if (!canvasRef.current) {
      console.error("No canvasRef available for capture.");
      return;
    }
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      console.log("dataUrl generated successfully, length:", dataUrl.length);
      if (onCapture) {
        onCapture(dataUrl);
      } else {
        console.error("onCapture callback is missing!");
      }
    } catch (err) {
      console.error("Failed to generate dataUrl from canvas. Canvas might be tainted:", err);
      // Fallback: notify parent with an error or empty string so it doesn't just hang
      if (onCapture) onCapture(null);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width, margin: '0 auto' }}>
      <video 
        ref={videoRef} 
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, zIndex: -1, pointerEvents: 'none' }} 
        width={width} 
        height={height} 
        playsInline 
        muted 
      />
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ 
          width: '100%', 
          height: 'auto', 
          borderRadius: '8px',
          border: '1px solid var(--glass-border)',
          backgroundColor: '#000'
        }} 
      />
      {!cvLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.85)',
          padding: '20px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          textAlign: 'center',
          border: '1px solid #d4a574',
          zIndex: 20
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Loading AI Computer Vision...</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Please wait. Your browser is compiling the models. The page may become unresponsive for 5-15 seconds.</div>
        </div>
      )}
      <button 
        className="capture-action-btn"
        onClick={handleManualCapture}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        Capture Document
      </button>
    </div>
  );
};

export default DocumentDetector;
