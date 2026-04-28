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

const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const AprovacoesDescontos = lazy(() => import('./pages/AprovacoesDescontos'));
const Concessionarias = lazy(() => import('./pages/Concessionarias'));
const PlanosPagamento = lazy(() => import('./pages/PlanosPagamento'));
const DashboardVendedor = lazy(() => import('./pages/DashboardVendedor'));
const NovoPedido = lazy(() => import('./pages/NovoPedido'));
const Historico = lazy(() => import('./pages/Historico'));
const Support = lazy(() => import('./pages/Support'));
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'));
const GraficosCarga = lazy(() => import('./pages/GraficosCarga'));
const DetalhesGuindaste = lazy(() => import('./pages/DetalhesGuindaste'));
const ProntaEntrega = lazy(() => import('./pages/ProntaEntrega'));
const HistoricoPropostas = lazy(() => import('./pages/HistoricoPropostas'));
const VisualizarProposta = lazy(() => import('./pages/VisualizarProposta'));
const CotacaoDolar = lazy(() => import('./pages/CotacaoDolar'));
const EstoqueConcessionaria = lazy(() => import('./pages/EstoqueConcessionaria'));


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
            <Route path="/novo-pedido/:propostaId?" element={
              <LazyRoute loadingMessage="Carregando Nova Proposta...">
                <NovoPedido />
              </LazyRoute>
            } />
            <Route path="/propostas" element={
              <LazyRoute loadingMessage="Carregando Propostas...">
                <HistoricoPropostas />
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
            <Route path="/vendedor/configuracoes" element={
              <LazyRoute loadingMessage="Carregando Configurações...">
                <Configuracoes />
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
            <Route path="/admin/configuracoes" element={
              <LazyRoute loadingMessage="Carregando Configurações...">
                <Configuracoes />
              </LazyRoute>
            } />
            <Route path="/aprovacoes-descontos" element={
              <LazyRoute loadingMessage="Carregando Aprovações...">
                <AprovacoesDescontos />
              </LazyRoute>
            } />
            <Route path="/concessionarias" element={
              <LazyRoute loadingMessage="Carregando Concessionárias...">
                <Concessionarias />
              </LazyRoute>
            } />
            <Route path="/planos-pagamento" element={
              <LazyRoute loadingMessage="Carregando Planos de Pagamento...">
                <PlanosPagamento />
              </LazyRoute>
            } />
            <Route path="/estoque-concessionaria" element={
              <LazyRoute loadingMessage="Carregando Estoque...">
                <EstoqueConcessionaria />
              </LazyRoute>
            } />
            <Route path="/cotacao-dolar" element={
              <LazyRoute loadingMessage="Carregando Cotação do Dólar...">
                <CotacaoDolar />
              </LazyRoute>
            } />
            <Route path="/nova-proposta-concessionaria" element={
              <LazyRoute loadingMessage="Carregando Proposta da Concessionária...">
                <NovoPedido />
              </LazyRoute>
            } />
          </Route>
          
          {/* Rota de Suporte */}
          <Route path="/suporte" element={
            <LazyRoute loadingMessage="Carregando Suporte...">
              <Support />
            </LazyRoute>
          } />

          {/* Rota pública para visualização de proposta */}
          <Route path="/proposta/:id" element={
            <LazyRoute loadingMessage="Carregando Proposta...">
              <VisualizarProposta />
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
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="goo">
                  <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo" />
                  <feBlend in2="goo" in="SourceGraphic" result="mix" />
                </filter>
              </defs>
            </svg>
          </CarrinhoProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
