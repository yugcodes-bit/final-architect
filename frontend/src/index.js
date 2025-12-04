import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 1. IMPORT THIS
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. WRAP APP IN BROWSERROUTER */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);