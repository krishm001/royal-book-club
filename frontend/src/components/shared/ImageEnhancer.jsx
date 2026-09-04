import React, { useState, useEffect, useRef } from 'react';
import { enhanceImage, smartCropImage } from '../../utils/documentProcessor';
import { RefreshCw, Check, X, Sliders } from 'lucide-react';
import './ImageEnhancer.css';
import { useLanguage } from '../../i18n/LanguageContext';

const ImageEnhancer = ({ initialImageSrc, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    sharpen: false
  });

  const originalImgRef = useRef(null);

  useEffect(() => {
    if (initialImageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        originalImgRef.current = img;
        applyEnhancements();
      };
      img.src = initialImageSrc;
    }
  }, [initialImageSrc]);

  useEffect(() => {
    applyEnhancements();
  }, [options]);

  const applyEnhancements = async () => {
    if (!originalImgRef.current) return;
    try {
      const enhancedSrc = await enhanceImage(originalImgRef.current, options);
      setImageSrc(enhancedSrc);
    } catch (err) {
      console.error("Failed to enhance image", err);
    }
  };

  const handleSmartCrop = async () => {
    if (!originalImgRef.current) return;
    setLoading(true);
    try {
      const croppedDataUrl = await smartCropImage(originalImgRef.current);
      // Update the original reference so further enhancements apply to the cropped version
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      newImg.onload = () => {
        originalImgRef.current = newImg;
        applyEnhancements();
        setLoading(false);
      };
      newImg.src = croppedDataUrl;
    } catch (err) {
      console.error("Failed to auto-crop image", err);
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="image-enhancer-container royal-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '8px' }}>
        <Sliders size={18} />
        <h4 style={{ margin: 0 }}>Image Enhancement</h4>
      </div>

      <img src={imageSrc} alt="Preview" className="enhancer-preview" />

      <div className="enhancer-controls">
        <div className="enhancer-slider-group">
          <label>
            <span>Brightness</span>
            <span>{Math.round(options.brightness * 100)}%</span>
          </label>
          <input 
            type="range" 
            className="enhancer-slider" 
            min="0.5" max="2.0" step="0.1" 
            value={options.brightness} 
            onChange={e => handleChange('brightness', parseFloat(e.target.value))} 
          />
        </div>
        
        <div className="enhancer-slider-group">
          <label>
            <span>Contrast</span>
            <span>{Math.round(options.contrast * 100)}%</span>
          </label>
          <input 
            type="range" 
            className="enhancer-slider" 
            min="0.5" max="2.0" step="0.1" 
            value={options.contrast} 
            onChange={e => handleChange('contrast', parseFloat(e.target.value))} 
          />
        </div>

        <div className="enhancer-slider-group">
          <label>
            <span>Saturation</span>
            <span>{Math.round(options.saturation * 100)}%</span>
          </label>
          <input 
            type="range" 
            className="enhancer-slider" 
            min="0.0" max="2.0" step="0.1" 
            value={options.saturation} 
            onChange={e => handleChange('saturation', parseFloat(e.target.value))} 
          />
        </div>

        <label className="enhancer-checkbox-group">
          <input 
            type="checkbox" 
            checked={options.sharpen} 
            onChange={e => handleChange('sharpen', e.target.checked)} 
          />
          Apply Sharpening Filter
        </label>

        <button 
          className="royal-btn-secondary" 
          onClick={handleSmartCrop} 
          disabled={loading}
          style={{ width: '100%', marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <Sliders size={16} /> Auto-Crop Book Cover
        </button>
      </div>

      <div className="enhancer-actions">
        <button className="royal-btn-secondary enhancer-btn" onClick={onCancel} disabled={loading}>
          <X size={16} /> Cancel
        </button>
        <button className="royal-btn enhancer-btn" onClick={() => onSave(imageSrc)} disabled={loading}>
          {loading ? <RefreshCw className="spin-icon" size={16} /> : <Check size={16} />} 
          Save Image
        </button>
      </div>
    </div>
  );
};

export default ImageEnhancer;
