// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// 1. IMPORT YOUR PAGES HERE
import Home from './pages/Home';
import Create from './pages/Create';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DiscoverStyle from './pages/DiscoverStyle';

// 2. IMPORT THE NEW HISTORY & SETTINGS PAGES
// (Make sure the file names match exactly what is in your folder)
import History from './pages/History'; 
import Settings from './pages/Settings';

import Profile from './pages/Profile';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/discover-style" element={<DiscoverStyle />} />
        
        {/* 3. ADD THE ROUTES FOR THE NEW PAGES */}
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;