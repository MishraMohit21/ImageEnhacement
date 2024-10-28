import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setError(null);
    setOriginalImage(URL.createObjectURL(file));
    setProcessedImage(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const startResponse = await fetch('http://localhost:3001/start-processing', {
        method: 'POST',
        body: formData,
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start processing');
      }

      const { jobId } = await startResponse.json();

      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`http://localhost:3001/progress/${jobId}`);
        const progressData = await progressResponse.json();

        setProgress(progressData.progress);

        if (progressData.status === 'completed') {
          clearInterval(pollInterval);
          setProgress(100);

          const imageResponse = await fetch(`http://localhost:3001/result/${jobId}`);
          const blob = await imageResponse.blob();
          setProcessedImage(URL.createObjectURL(blob));
          setLoading(false);
        } else if (progressData.status === 'failed') {
          clearInterval(pollInterval);
          setError(progressData.error || 'Processing failed');
          setLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <div className="progress-bar">
      <div
        className="progress"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <div className="container">
        <h1 className="title">Image Enhancer</h1>
        <br />
        <br />
        <div className="mb-6">
          <label className="drag-drop-box">
            <span className="text-lg">Click or drag an image to enhance</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
            />
          </label>
        </div>

        {loading && (
          <div className="text-center py-4">
            {renderProgressBar()}
            <p className="mt-2 text-lg text-blue-300">Enhancing image... {progress}%</p>
            <p className="text-sm text-gray-400 mt-1">This process may take up to 40 seconds.</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="image-wrapper">
          {originalImage && (
            <div className="image-container">
              <h2 className="font-semibold text-lg mb-2">Original Image</h2>
              <img
                src={originalImage}
                alt="Original"
                className="side-image"
              />
            </div>
          )}

          {processedImage && (
            <div className="image-container">
              <h2 className="font-semibold text-lg mb-2">Enhanced Image</h2>
              <img
                src={processedImage}
                alt="Processed"
                className="side-image"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
