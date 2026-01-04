import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Note: StrictMode causes double-mounting in development, which affects WebSocket connections.
// Temporarily disabled to debug WebSocket issues.
// TODO: Re-enable StrictMode and fix WebSocket handling to be StrictMode-compatible
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
