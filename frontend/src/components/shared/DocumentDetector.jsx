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
            
            // Draw video to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Read from canvas to Mat
            let src = cv.imread(canvas);
            let dst = new cv.Mat();
            let gray = new cv.Mat();
            
            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            
            // Blur to reduce noise
            let ksize = new cv.Size(5, 5);
            cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);
            
            // Edge detection
            cv.Canny(gray, dst, 75, 200, 3, false);
            
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
              if (area > maxArea && area > (canvas.width * canvas.height * 0.1)) { // at least 10% of screen
                maxArea = area;
                maxContourIndex = i;
              }
            }
            
            if (maxContourIndex !== -1) {
              let color = new cv.Scalar(212, 165, 116, 255); // Royal accent color
              cv.drawContours(src, contours, maxContourIndex, color, 3, cv.LINE_8, hierarchy, 0);
            }
            
            cv.imshow(canvas, src);
            
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
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(processVideo);
        }, 200);
      };
      
      animationFrameRef.current = requestAnimationFrame(processVideo);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cvLoaded, videoStream]);

  const handleManualCapture = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    onCapture(dataUrl);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width, margin: '0 auto' }}>
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
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
          background: 'rgba(0,0,0,0.5)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.85rem'
        }}>
          Loading Computer Vision...
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
