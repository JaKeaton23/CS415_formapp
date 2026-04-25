import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Application entry point: mount the root React tree into #root.
// StrictMode is enabled to surface unsafe lifecycles and side-effects in development.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
