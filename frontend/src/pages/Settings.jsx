// src/pages/Settings.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./settings.css"; // Imports the CSS file below

const Settings = () => {
  const [auraEnabled, setAuraEnabled] = useState(true);
  const [highQuality, setHighQuality] = useState(true);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <Link to="/create" className="back-button">← Back to Designer</Link>
        </header>

        <div className="settings-section">
          <h2>🤖 AI & Graphics</h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Enable Aura Analysis</h3>
              <p>Show real-time lighting heatmaps in 3D scene.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={auraEnabled} 
                onChange={(e) => setAuraEnabled(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>High Quality Rendering</h3>
              <p>Enable shadows and anti-aliasing (Uses more GPU).</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={highQuality} 
                onChange={(e) => setHighQuality(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>👤 Account</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Email Notifications</h3>
              <p>Get updates on new furniture models.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={(e) => setNotifications(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          <button className="sign-out-btn">Sign Out</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;