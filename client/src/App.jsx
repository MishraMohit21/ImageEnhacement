import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EnhancePage from './pages/EnhancePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/enhance" element={<EnhancePage />} />
      </Routes>
    </Router>
  );
}

export default App;