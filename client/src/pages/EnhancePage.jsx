import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import './EnhancePage.css';

const EnhancePage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [processedImageUrl, setProcessedImageUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProcessedImageUrl(null);
      setError(null);
      setProgress(0);
      setJobId(null);
    }
  };

  const processImage = async () => {
    if (!selectedFile) {
      setError("Please upload an image first.");
      return;
    }

    setProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('http://localhost:3001/start-processing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
      setProcessing(false);
    }
  };

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError('Failed to download image: ' + err.message);
    }
  };

  useEffect(() => {
    let pollInterval;

    const checkProgress = async () => {
      if (!jobId) return;

      try {
        const response = await fetch(`http://localhost:3001/progress/${jobId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setProcessing(false);
          clearInterval(pollInterval);
          return;
        }

        setProgress(data.progress);

        if (data.status === 'completed') {
          setProcessing(false);
          clearInterval(pollInterval);
          setProcessedImageUrl(`http://localhost:3001/result/${jobId}`);
        } else if (data.status === 'failed') {
          setError(data.error || 'Processing failed');
          setProcessing(false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        setError('Failed to check progress: ' + err.message);
        setProcessing(false);
        clearInterval(pollInterval);
      }
    };

    if (jobId && processing) {
      checkProgress();
      pollInterval = setInterval(checkProgress, 1000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, processing]);

  return (
    <div className="enhance-page">
      <h2>Enhance Your Image</h2>
      
      <div className="upload-section">
        <input 
          type="file" 
          onChange={handleImageUpload} 
          accept="image/*"
          disabled={processing}
        />
        <button 
          className="button" 
          onClick={processImage}
          disabled={!selectedFile || processing}
        >
          Process Image
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {processing && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      <div className="images-container">
        {previewUrl && (
          <div className="image-preview">
            <h3>Original Image</h3>
            <div className="image-holder">
              <img src={previewUrl} alt="Original" />
            </div>
            <button 
              className="download-button"
              onClick={() => downloadImage(previewUrl, 'original.jpg')}
            >
              <Download size={16} /> Download Original
            </button>
          </div>
        )}
        
        {processedImageUrl && (
          <div className="image-preview">
            <h3>Processed Image</h3>
            <div className="image-holder">
              <img src={processedImageUrl} alt="Processed" />
            </div>
            <button 
              className="download-button"
              onClick={() => downloadImage(processedImageUrl, 'processed.jpg')}
            >
              <Download size={16} /> Download Processed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancePage;