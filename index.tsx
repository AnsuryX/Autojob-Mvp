import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

/**
 * Standard React 19 mounting pattern.
 * Using 'createRoot' from 'react-dom/client' ensures we use the Concurrent Renderer.
 */
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical: Root container not found in index.html");
}