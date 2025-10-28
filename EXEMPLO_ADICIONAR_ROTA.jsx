/**
 * EXEMPLO: Como adicionar a rota de Histórico de Propostas
 * 
 * Copie este código e adicione no seu arquivo de rotas principal
 * (geralmente App.jsx ou Routes.jsx)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HistoricoPropostas from './pages/HistoricoPropostas';

// ... outros imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas existentes */}
        <Route path="/" element={<Home />} />
        <Route path="/novo-pedido" element={<NovoPedido />} />
        <Route path="/guindastes" element={<Guindastes />} />
        
        {/* ✅ NOVA ROTA - Adicionar aqui */}
        <Route path="/historico-propostas" element={<HistoricoPropostas />} />
        
        {/* ... outras rotas */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

/**
 * EXEMPLO: Como adicionar link no menu de navegação
 */

// No seu componente de Menu/Navbar:
function Menu() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/novo-pedido">Novo Pedido</Link>
      <Link to="/guindastes">Guindastes</Link>
      
      {/* ✅ NOVO LINK - Adicionar aqui */}
      <Link to="/historico-propostas">
        📋 Histórico de Propostas
      </Link>
    </nav>
  );
}
