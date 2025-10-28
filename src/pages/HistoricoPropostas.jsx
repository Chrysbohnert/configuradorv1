import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';

/**
 * Página de Histórico de Propostas e Orçamentos
 */
const HistoricoPropostas = () => {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarPropostas();
  }, []);

  const carregarPropostas = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const filters = {};
      if (user.id) {
        filters.vendedor_id = user.id;
      }

      const data = await db.getPropostas(filters);
      setPropostas(data);
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      alert('Erro ao carregar histórico de propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id, numeroProposta) => {
    if (!window.confirm(`Tem certeza que deseja excluir a proposta ${numeroProposta}?`)) {
      return;
    }

    try {
      await db.deleteProposta(id);
      alert('Proposta excluída com sucesso!');
      carregarPropostas();
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      alert('Erro ao excluir proposta');
    }
  };

  const handleReabrir = (proposta) => {
    // Carregar dados serializados e navegar para novo pedido
    const dadosSerializados = proposta.dados_serializados;
    
    // Salvar no localStorage temporariamente
    localStorage.setItem('proposta_em_edicao', JSON.stringify({
      id: proposta.id,
      numero_proposta: proposta.numero_proposta,
      dados: dadosSerializados
    }));

    navigate('/novo-pedido');
  };

  // Filtrar propostas
  const propostasFiltradas = propostas.filter(p => {
    // Filtro de status
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
    
    // Filtro de tipo
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
    
    // Busca por texto
    if (busca) {
      const termo = busca.toLowerCase();
      return (
        p.numero_proposta.toLowerCase().includes(termo) ||
        p.cliente_nome.toLowerCase().includes(termo) ||
        p.vendedor_nome.toLowerCase().includes(termo)
      );
    }
    
    return true;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pendente: { bg: '#fff3cd', color: '#856404', label: 'Pendente' },
      finalizado: { bg: '#d4edda', color: '#155724', label: 'Finalizado' },
      excluido: { bg: '#f8d7da', color: '#721c24', label: 'Excluído' }
    };
    
    const style = styles[status] || styles.pendente;
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      orcamento: { bg: '#e3f2fd', color: '#0d47a1', label: '📋 Orçamento', icon: '📋' },
      proposta: { bg: '#f3e5f5', color: '#4a148c', label: '✅ Proposta', icon: '✅' }
    };
    
    const style = styles[tipo] || styles.orcamento;
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {style.icon} {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#666' }}>Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
          Propostas
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Gerencie seus orçamentos e propostas comerciais. Edite orçamentos pendentes ou consulte propostas finalizadas.
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
            Buscar
          </label>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nº, cliente ou vendedor..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
            Status
          </label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="finalizado">Finalizado</option>
            <option value="excluido">Excluído</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
            Tipo
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos</option>
            <option value="orcamento">Orçamento</option>
            <option value="proposta">Proposta</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={carregarPropostas}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#111',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Tabela */}
      {propostasFiltradas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
            Nenhuma proposta encontrada
          </h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {busca || filtroStatus !== 'todos' || filtroTipo !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece gerando sua primeira proposta'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e5e5' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Nº Proposta
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Cliente
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Tipo
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Valor Total
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Data
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {propostasFiltradas.map((proposta) => (
                <tr key={proposta.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111' }}>
                    #{proposta.numero_proposta}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                    <div>{proposta.cliente_nome}</div>
                    {proposta.cliente_documento && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                        {proposta.cliente_documento}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getTipoBadge(proposta.tipo)}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111' }}>
                    {formatCurrency(proposta.valor_total)}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                    {new Date(proposta.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getStatusBadge(proposta.status)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {proposta.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleReabrir(proposta)}
                            style={{
                              padding: '6px 12px',
                              background: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Reabrir e continuar edição"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleExcluir(proposta.id, proposta.numero_proposta)}
                            style={{
                              padding: '6px 12px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Excluir proposta"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {proposta.status === 'finalizado' && (
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          Finalizada
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumo */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '14px', color: '#666' }}>
          Total: <strong>{propostasFiltradas.length}</strong> {propostasFiltradas.length === 1 ? 'proposta' : 'propostas'}
        </span>
        <button
          onClick={() => navigate('/novo-pedido')}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ➕ Nova Proposta
        </button>
      </div>
    </div>
  );
};

export default HistoricoPropostas;
