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
import RelatorioCompleto from './pages/RelatorioCompleto';
import AlterarSenha from './pages/AlterarSenha';
import GraficosCarga from './pages/GraficosCarga';
import GerenciarGraficosCarga from './pages/GerenciarGraficosCarga';
import DetalhesGuindaste from './pages/DetalhesGuindaste';
import ProtectedRoute from './components/ProtectedRoute';

// Carregar scripts de migração em desenvolvimento
if (import.meta.env.DEV) {
  import('./utils/runMigration');
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Rota pública */}
          <Route path="/" element={<Login />} />
          
          {/* Rotas do Vendedor */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardVendedor />
            </ProtectedRoute>
          } />
          <Route path="/novo-pedido" element={
            <ProtectedRoute>
              <NovoPedido />
            </ProtectedRoute>
          } />
          <Route path="/historico" element={
            <ProtectedRoute>
              <Historico />
            </ProtectedRoute>
          } />
          
          {/* Rotas do Admin */}
          <Route path="/dashboard-admin" element={
            <ProtectedRoute requireAdmin={true}>
              <DashboardAdmin />
            </ProtectedRoute>
          } />
          <Route path="/gerenciar-vendedores" element={
            <ProtectedRoute requireAdmin={true}>
              <GerenciarVendedores />
            </ProtectedRoute>
          } />
          <Route path="/gerenciar-guindastes" element={
            <ProtectedRoute requireAdmin={true}>
              <GerenciarGuindastes />
            </ProtectedRoute>
          } />
          <Route path="/relatorio-completo" element={
            <ProtectedRoute requireAdmin={true}>
              <RelatorioCompleto />
            </ProtectedRoute>
          } />
          
          {/* Rota de Suporte */}
          <Route path="/suporte" element={<Support />} />
          
          {/* Rota de Alterar Senha */}
          <Route path="/alterar-senha" element={
            <ProtectedRoute>
              <AlterarSenha />
            </ProtectedRoute>
          } />
          
          {/* Rota de Gráficos de Carga */}
          <Route path="/graficos-carga" element={
            <ProtectedRoute>
              <GraficosCarga />
            </ProtectedRoute>
          } />
          
          {/* Rota de Gerenciar Gráficos de Carga */}
          <Route path="/gerenciar-graficos-carga" element={
            <ProtectedRoute requireAdmin={true}>
              <GerenciarGraficosCarga />
            </ProtectedRoute>
          } />
          
          {/* Rota de Detalhes do Guindaste */}
          <Route path="/detalhes-guindaste" element={
            <ProtectedRoute>
              <DetalhesGuindaste />
            </ProtectedRoute>
          } />
          
          {/* Redirecionar rotas não encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
