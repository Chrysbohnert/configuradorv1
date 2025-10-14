import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LazyRoute from './components/LazyRoute';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';

// Componentes públicos e admin (não lazy - carregam instantaneamente)
import Login from './pages/Login';
import DashboardAdmin from './pages/DashboardAdmin';
import GerenciarVendedores from './pages/GerenciarVendedores';
import GerenciarGuindastes from './pages/GerenciarGuindastes';
import RelatorioCompleto from './pages/RelatorioCompleto';
import GerenciarGraficosCarga from './pages/GerenciarGraficosCarga';
import Logistica from './pages/Logistica';
import Configuracoes from './pages/Configuracoes';

// Componentes vendedor lazy (carregados sob demanda)
const DashboardVendedor = lazy(() => import('./pages/DashboardVendedor'));
const NovoPedido = lazy(() => import('./pages/NovoPedido'));
const Historico = lazy(() => import('./pages/Historico'));
const Support = lazy(() => import('./pages/Support'));
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'));
const GraficosCarga = lazy(() => import('./pages/GraficosCarga'));
const DetalhesGuindaste = lazy(() => import('./pages/DetalhesGuindaste'));
const ProntaEntrega = lazy(() => import('./pages/ProntaEntrega'));

// Carregar scripts de migração em desenvolvimento
if (import.meta.env.DEV) {
  import('./utils/runMigration');
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CarrinhoProvider>
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
          
          {/* Rotas do Admin - Com Layout Compartilhado */}
          <Route element={
            <ProtectedRoute requireAdmin={true}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/gerenciar-vendedores" element={<GerenciarVendedores />} />
            <Route path="/gerenciar-guindastes" element={<GerenciarGuindastes />} />
            <Route path="/relatorio-completo" element={<RelatorioCompleto />} />
            <Route path="/gerenciar-graficos-carga" element={<GerenciarGraficosCarga />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          
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
          
          {/* Rota de Detalhes do Guindaste */}
          <Route path="/detalhes-guindaste/:id?" element={
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
          </CarrinhoProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
