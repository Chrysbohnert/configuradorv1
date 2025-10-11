import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LazyRoute from './components/LazyRoute';

// Componente público (não lazy)
import Login from './pages/Login';

// Componentes lazy (carregados sob demanda)
const DashboardVendedor = lazy(() => import('./pages/DashboardVendedor'));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));
const NovoPedido = lazy(() => import('./pages/NovoPedido'));
const Historico = lazy(() => import('./pages/Historico'));
const Support = lazy(() => import('./pages/Support'));
const GerenciarVendedores = lazy(() => import('./pages/GerenciarVendedores'));
const GerenciarGuindastes = lazy(() => import('./pages/GerenciarGuindastes'));
const RelatorioCompleto = lazy(() => import('./pages/RelatorioCompleto'));
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'));
const GraficosCarga = lazy(() => import('./pages/GraficosCarga'));
const GerenciarGraficosCarga = lazy(() => import('./pages/GerenciarGraficosCarga'));
const DetalhesGuindaste = lazy(() => import('./pages/DetalhesGuindaste'));
const Logistica = lazy(() => import('./pages/Logistica'));
const ProntaEntrega = lazy(() => import('./pages/ProntaEntrega'));

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
              <LazyRoute loadingMessage="Carregando Dashboard...">
                <DashboardVendedor />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/novo-pedido" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Novo Pedido...">
                <NovoPedido />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/historico" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Histórico...">
                <Historico />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/pronta-entrega" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Pronta Entrega...">
                <ProntaEntrega />
              </LazyRoute>
            </ProtectedRoute>
          } />
          
          {/* Rotas do Admin */}
          <Route path="/dashboard-admin" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Dashboard Admin...">
                <DashboardAdmin />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/logistica" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Logística...">
                <Logistica />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/gerenciar-vendedores" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Gerenciar Vendedores...">
                <GerenciarVendedores />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/gerenciar-guindastes" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Gerenciar Guindastes...">
                <GerenciarGuindastes />
              </LazyRoute>
            </ProtectedRoute>
          } />
          <Route path="/relatorio-completo" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Relatório...">
                <RelatorioCompleto />
              </LazyRoute>
            </ProtectedRoute>
          } />
          
          {/* Rota de Suporte */}
          <Route path="/suporte" element={
            <LazyRoute loadingMessage="Carregando Suporte...">
              <Support />
            </LazyRoute>
          } />
          
          {/* Rota de Alterar Senha */}
          <Route path="/alterar-senha" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Alterar Senha...">
                <AlterarSenha />
              </LazyRoute>
            </ProtectedRoute>
          } />
          
          {/* Rota de Gráficos de Carga */}
          <Route path="/graficos-carga" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Gráficos de Carga...">
                <GraficosCarga />
              </LazyRoute>
            </ProtectedRoute>
          } />
          
          {/* Rota de Gerenciar Gráficos de Carga */}
          <Route path="/gerenciar-graficos-carga" element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Gerenciar Gráficos...">
                <GerenciarGraficosCarga />
              </LazyRoute>
            </ProtectedRoute>
          } />
          
          {/* Rota de Detalhes do Guindaste */}
          <Route path="/detalhes-guindaste/:id" element={
            <ProtectedRoute>
              <LazyRoute loadingMessage="Carregando Detalhes do Guindaste...">
                <DetalhesGuindaste />
              </LazyRoute>
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
