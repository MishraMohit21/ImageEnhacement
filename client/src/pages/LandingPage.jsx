import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/enhance');
  };

  return (
    <div className="landing-page">
      <h1>Welcome to Image Enhancer</h1>
      <p>Click below to get started with enhancing your images.</p>
      <button className="button" onClick={handleStart}>Get Started</button>
    </div>
  );
}

export default LandingPage;