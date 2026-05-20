import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import LazyRoute from './components/LazyRoute';
import ErrorBoundary from './components/ErrorBoundary';

import { AuthProvider } from './contexts/AuthContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';

import Login from './lib/pages/Login';

// Layouts
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const VendedorLayout = lazy(() => import('./components/VendedorLayout'));

// Páginas ativas
const DashboardAdmin = lazy(() => import('./lib/pages/DashboardAdmin'));
const GerenciarVendedores = lazy(() => import('./lib/pages/GerenciarVendedores'));
const RelatorioCompleto = lazy(() => import('./lib/pages/RelatorioCompleto'));

const Configuracoes = lazy(() => import('./lib/pages/Configuracoes'));
const DashboardVendedor = lazy(() => import('./lib/pages/DashboardVendedor'));
const NovoPedido = lazy(() => import('./lib/pages/NovoPedido'));

const Support = lazy(() => import('./lib/pages/Support'));
const GraficosCarga = lazy(() => import('./lib/pages/GraficosCarga'));
const DetalhesGuindaste = lazy(() => import('./lib/pages/DetalhesGuindaste'));
const HistoricoPropostas = lazy(() => import('./lib/pages/HistoricoPropostas'));
const VisualizarProposta = lazy(() => import('./lib/pages/VisualizarProposta'));
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CarrinhoProvider>

            <div className="App">

              <Routes>

                {/* LOGIN */}
                <Route path="/" element={<Login />} />

                {/* VENDEDOR */}
                <Route
                  element={
                    <ProtectedRoute requireVendedor={true}>
                      <LazyRoute loadingMessage="Carregando Painel Vendedor...">
                        <VendedorLayout />
                      </LazyRoute>
                    </ProtectedRoute>
                  }
                >

                  <Route
                    path="/dashboard"
                    element={
                      <LazyRoute loadingMessage="Carregando Dashboard...">
                        <DashboardVendedor />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/novo-pedido/:propostaId?"
                    element={
                      <LazyRoute loadingMessage="Carregando Pedido...">
                        <NovoPedido />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/propostas"
                    element={
                      <LazyRoute loadingMessage="Carregando Propostas...">
                        <HistoricoPropostas />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/graficos-carga"
                    element={
                      <LazyRoute loadingMessage="Carregando Gráficos...">
                        <GraficosCarga />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/vendedor/configuracoes"
                    element={
                      <LazyRoute loadingMessage="Carregando Configurações...">
                        <Configuracoes />
                      </LazyRoute>
                    }
                  />

                </Route>

                {/* ADMIN */}
                <Route
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <LazyRoute loadingMessage="Carregando Painel Admin...">
                        <AdminLayout />
                      </LazyRoute>
                    </ProtectedRoute>
                  }
                >

                  <Route
                    path="/dashboard-admin"
                    element={
                      <LazyRoute loadingMessage="Carregando Dashboard Admin...">
                        <DashboardAdmin />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/gerenciar-vendedores"
                    element={
                      <LazyRoute loadingMessage="Carregando Vendedores...">
                        <GerenciarVendedores />
                      </LazyRoute>
                    }
                  />

                  <Route
                    path="/relatorio-completo"
                    element={
                      <LazyRoute loadingMessage="Carregando Relatório...">
                        <RelatorioCompleto />
                      </LazyRoute>
                    }
                  />

                </Route>

                {/* SUPORTE */}
                <Route
                  path="/suporte"
                  element={
                    <LazyRoute loadingMessage="Carregando Suporte...">
                      <Support />
                    </LazyRoute>
                  }
                />

                {/* VISUALIZAR PROPOSTA */}
                <Route
                  path="/proposta/:id"
                  element={
                    <LazyRoute loadingMessage="Carregando Proposta...">
                      <VisualizarProposta />
                    </LazyRoute>
                  }
                />

                {/* DETALHES GUINDASTE */}
                <Route
                  path="/detalhes-guindaste/:id?"
                  element={
                    <ProtectedRoute>
                      <LazyRoute loadingMessage="Carregando Detalhes...">
                        <DetalhesGuindaste />
                      </LazyRoute>
                    </ProtectedRoute>
                  }
                />

                {/* FALLBACK */}
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