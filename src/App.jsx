import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LazyRoute from './components/LazyRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';

// ⚡ OTIMIZAÇÃO: Apenas Login carrega imediatamente (rota pública inicial)
import Login from './pages/Login';

// ⚡ OTIMIZAÇÃO: Todos os componentes admin e vendedor são lazy
// Isso reduz o bundle inicial de ~800KB para ~200KB
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const VendedorLayout = lazy(() => import('./components/VendedorLayout'));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));
const GerenciarVendedores = lazy(() => import('./pages/GerenciarVendedores'));
const GerenciarGuindastes = lazy(() => import('./pages/GerenciarGuindastes'));
const RelatorioCompleto = lazy(() => import('./pages/RelatorioCompleto'));
const GerenciarGraficosCarga = lazy(() => import('./pages/GerenciarGraficosCarga'));
const Logistica = lazy(() => import('./pages/Logistica'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const DashboardVendedor = lazy(() => import('./pages/DashboardVendedor'));
const NovoPedido = lazy(() => import('./pages/NovoPedido'));
const Historico = lazy(() => import('./pages/Historico'));
const Support = lazy(() => import('./pages/Support'));
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'));
const GraficosCarga = lazy(() => import('./pages/GraficosCarga'));
const DetalhesGuindaste = lazy(() => import('./pages/DetalhesGuindaste'));
const ProntaEntrega = lazy(() => import('./pages/ProntaEntrega'));


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
          
          {/* Rotas do Vendedor - Com Layout Compartilhado e Lazy Loading */}
          <Route element={
            <ProtectedRoute requireVendedor={true}>
              <LazyRoute loadingMessage="Carregando Painel Vendedor...">
                <VendedorLayout />
              </LazyRoute>
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={
              <LazyRoute loadingMessage="Carregando Dashboard...">
                <DashboardVendedor />
              </LazyRoute>
            } />
            <Route path="/novo-pedido" element={
              <LazyRoute loadingMessage="Carregando Novo Pedido...">
                <NovoPedido />
              </LazyRoute>
            } />
            <Route path="/historico" element={
              <LazyRoute loadingMessage="Carregando Histórico...">
                <Historico />
              </LazyRoute>
            } />
            <Route path="/pronta-entrega" element={
              <LazyRoute loadingMessage="Carregando Pronta Entrega...">
                <ProntaEntrega />
              </LazyRoute>
            } />
            <Route path="/graficos-carga" element={
              <LazyRoute loadingMessage="Carregando Gráficos de Carga...">
                <GraficosCarga />
              </LazyRoute>
            } />
            <Route path="/alterar-senha" element={
              <LazyRoute loadingMessage="Carregando Alterar Senha...">
                <AlterarSenha />
              </LazyRoute>
            } />
          </Route>
          
          {/* Rotas do Admin - Com Layout Compartilhado e Lazy Loading */}
          <Route element={
            <ProtectedRoute requireAdmin={true}>
              <LazyRoute loadingMessage="Carregando Painel Admin...">
                <AdminLayout />
              </LazyRoute>
            </ProtectedRoute>
          }>
            <Route path="/dashboard-admin" element={
              <LazyRoute loadingMessage="Carregando Dashboard...">
                <DashboardAdmin />
              </LazyRoute>
            } />
            <Route path="/logistica" element={
              <LazyRoute loadingMessage="Carregando Logística...">
                <Logistica />
              </LazyRoute>
            } />
            <Route path="/gerenciar-vendedores" element={
              <LazyRoute loadingMessage="Carregando Vendedores...">
                <GerenciarVendedores />
              </LazyRoute>
            } />
            <Route path="/gerenciar-guindastes" element={
              <LazyRoute loadingMessage="Carregando Guindastes...">
                <GerenciarGuindastes />
              </LazyRoute>
            } />
            <Route path="/relatorio-completo" element={
              <LazyRoute loadingMessage="Carregando Relatório...">
                <RelatorioCompleto />
              </LazyRoute>
            } />
            <Route path="/gerenciar-graficos-carga" element={
              <LazyRoute loadingMessage="Carregando Gráficos...">
                <GerenciarGraficosCarga />
              </LazyRoute>
            } />
            <Route path="/configuracoes" element={
              <LazyRoute loadingMessage="Carregando Configurações...">
                <Configuracoes />
              </LazyRoute>
            } />
          </Route>
          
          {/* Rota de Suporte */}
          <Route path="/suporte" element={
            <LazyRoute loadingMessage="Carregando Suporte...">
              <Support />
            </LazyRoute>
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
