import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import './globals.css';
import './index.css';
import { initializeMcpServer } from './services/MCP.ts';

initializeMcpServer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);
