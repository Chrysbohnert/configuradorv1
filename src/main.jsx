import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { disableConsoleInProduction } from './utils/productionLogger';

// ⚡ OTIMIZAÇÃO: Desabilita console.log em produção
disableConsoleInProduction();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
