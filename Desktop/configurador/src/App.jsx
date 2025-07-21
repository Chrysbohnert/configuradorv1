import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardVendedor from './pages/DashboardVendedor';
import DashboardAdmin from './pages/DashboardAdmin';
import NovoPedido from './pages/NovoPedido';
import Historico from './pages/Historico';
import Support from './pages/Support';
import GerenciarVendedores from './pages/GerenciarVendedores';
import GerenciarGuindastes from './pages/GerenciarGuindastes';
import AlterarSenha from './pages/AlterarSenha';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Rota pública */}
          <Route path="/" element={<Login />} />
          
          {/* Rotas do Vendedor */}
          <Route path="/dashboard" element={<DashboardVendedor />} />
          <Route path="/novo-pedido" element={<NovoPedido />} />
          <Route path="/historico" element={<Historico />} />
          
          {/* Rotas do Admin */}
          <Route path="/dashboard-admin" element={<DashboardAdmin />} />
          <Route path="/admin" element={<DashboardAdmin />} />
          <Route path="/gerenciar-vendedores" element={<GerenciarVendedores />} />
          <Route path="/gerenciar-guindastes" element={<GerenciarGuindastes />} />
          <Route path="/relatorios" element={<div>Relatórios - Em desenvolvimento</div>} />
          
          {/* Rota de Suporte */}
          <Route path="/suporte" element={<Support />} />
          
          {/* Rota de Alterar Senha */}
          <Route path="/alterar-senha" element={<AlterarSenha />} />
          
          {/* Redirecionar rotas não encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
