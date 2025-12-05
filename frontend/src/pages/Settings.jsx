// src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import QRCode from "react-qr-code"; // Ensure you have installed this: npm install react-qr-code
import "./settings.css";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // --- STATE ---
  const [displayName, setDisplayName] = useState("");
  const [serverIP, setServerIP] = useState(() => localStorage.getItem('serverIP') || "http://localhost:3002");
  const [showQR, setShowQR] = useState(false); // <--- New State for QR Visibility
  
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');
  const [auraEnabled, setAuraEnabled] = useState(() => localStorage.getItem('auraEnabled') === 'true');
  const [lowPowerMode, setLowPowerMode] = useState(() => localStorage.getItem('lowPowerMode') === 'true');

  // Calculate Frontend URL for QR (Swap backend port 3002 -> frontend port 3000)
  // Ensure we don't have double http if user typed it
  const cleanIP = serverIP.replace('http://', '').replace('https://', '');
  const frontendUrl = `http://${cleanIP.split(':')[0]}:3000`;

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (data && data.full_name) setDisplayName(data.full_name);
      }
    };
    fetchProfile();
  }, []);

  // --- HANDLERS ---
  const handleThemeChange = (e) => {
    const isLight = e.target.checked;
    setIsLightMode(isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (isLight) document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
  };

  const handleAuraChange = (e) => {
    setAuraEnabled(e.target.checked);
    localStorage.setItem('auraEnabled', e.target.checked);
  };

  const handlePowerChange = (e) => {
    setLowPowerMode(e.target.checked);
    localStorage.setItem('lowPowerMode', e.target.checked);
  };

  const handleIpSave = () => {
    let inputIP = serverIP.trim();
    if (!inputIP.startsWith('http')) inputIP = `http://${inputIP}`;
    if (!inputIP.includes(':3002')) inputIP = `${inputIP}:3002`;
    
    setServerIP(inputIP);
    localStorage.setItem('serverIP', inputIP);
    alert(`✅ Network Configured! \nBackend: ${inputIP}`);
    setShowQR(false); // Reset QR when IP changes
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: displayName })
      .eq('id', user.id);
    
    if (error) alert("Error updating profile.");
    else alert("Name updated!");
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <Link to="/" className="back-button">← Back Home</Link>
        </header>

        {/* --- SECTION: MOBILE ACCESS (QR) --- */}
        <div className="settings-section highlight-section">
          <h2>📱 Mobile Access</h2>
          <div className="qr-section-content">
            <p className="setting-desc">
              Run this project on your phone by scanning the code below.
              Make sure your phone is on the same Wi-Fi.
            </p>
            
            <button 
              className="save-btn" 
              style={{
                width: 'auto',        /* Makes it fit the text size */
                minWidth: '200px',    /* Ensures it's not too small */
                display: 'block',     /* Allows centering */
                margin: '15px auto'   /* Centers the button */
              }}
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? "Hide QR Code" : "Generate QR Code"}
            </button>

            {showQR && (
              <div className="qr-wrapper fade-in">
                <div className="qr-box">
                  <QRCode 
                    value={frontendUrl} 
                    size={150} 
                    bgColor="#ffffff" 
                    fgColor="#000000" 
                  />
                </div>
                <div className="qr-info">
                  <h3>Scan to Connect</h3>
                  <code className="ip-display">{frontendUrl}</code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- SECTION: CONNECTION --- */}
        <div className="settings-section">
          <h2>📡 Network Config</h2>
          <div className="input-group">
            <label>Host IP (Computer's Local IP)</label>
            <div className="input-row">
              <input 
                type="text" 
                value={serverIP} 
                onChange={(e) => setServerIP(e.target.value)}
                className="settings-input"
                placeholder="e.g. 192.168.1.5"
              />
              <button className="save-btn small" onClick={handleIpSave}>Update</button>
            </div>
          </div>
        </div>

        {/* --- SECTION: ACCOUNT --- */}
        <div className="settings-section">
          <h2>👤 Profile</h2>
          <div className="input-group">
            <label>Display Name</label>
            <div className="input-row">
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="settings-input"
              />
              <button className="save-btn small" onClick={handleProfileUpdate} disabled={loading}>
                {loading ? "..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* --- SECTION: PREFERENCES --- */}
        <div className="settings-section">
          <h2>🎨 Experience</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Light Mode</h3>
              <p>Switch to a brighter interface.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={isLightMode} onChange={handleThemeChange} />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Low Power Mode</h3>
              <p>Disable shadows (Recommended for Mobile).</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={lowPowerMode} onChange={handlePowerChange} />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <h3>Auto-Enable Aura</h3>
              <p>Turn on lighting analysis on load.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={auraEnabled} onChange={handleAuraChange} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <button className="sign-out-btn" onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );
};

export default Settings;