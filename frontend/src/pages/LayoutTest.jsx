// src/pages/LayoutTest.jsx

import React, { useState } from 'react';

export const LayoutTest = () => {
  const [isPanelOpen, setPanelOpen] = useState(false);

  // Main container style
  const layoutStyle = {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#111',
  };

  // Style for the panel that appears/disappears
  const panelStyle = {
    width: '280px',
    backgroundColor: '#333',
    color: 'white',
    padding: '20px',
    flexShrink: 0, // Prevents it from shrinking
  };

  // Style for the main content that should shrink
  const contentStyle = {
    flexGrow: 1, // Takes up the remaining space
    backgroundColor: '#004488', // Blue, so we can see it clearly
    color: 'white',
    padding: '20px',
  };

  return (
    <div style={layoutStyle}>
      {/* The panel only renders if isPanelOpen is true */}
      {isPanelOpen && (
        <div style={panelStyle}>
          <h2>Library Panel</h2>
        </div>
      )}

      {/* This content area should ALWAYS be visible */}
      <div style={contentStyle}>
        <h1>Main Content Area</h1>
        <button 
          onClick={() => setPanelOpen(!isPanelOpen)}
          style={{ padding: '10px 20px' }}
        >
          {isPanelOpen ? 'Close Panel' : 'Open Panel'}
        </button>
      </div>
    </div>
  );
};