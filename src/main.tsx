import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startServiceWorker } from './app/serviceWorker';
import { installGlobalDiagnostics } from './diagnostics';
import './styles/tokens.css';
import './styles/global.css';

installGlobalDiagnostics();

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startServiceWorker();
