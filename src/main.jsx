import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initProductionOptimizations } from './utils/productionLogger';

// ⚡ OTIMIZAÇÃO: Desabilita console.log em produção
initProductionOptimizations();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
