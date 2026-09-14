import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPropostas, deletePropostaPermanente, updateResultadoVendaProposta } from '../../api/propostas';
import { formatCurrency } from '../../utils/formatters';
import { getCurrentUser } from '../../utils/auth';
import { isAdminFull } from '../../utils/permissions';
import PageHeader from '../../components/PageHeader';
import PageToolbar from '../../components/PageToolbar';
import '../../styles/HistoricoPropostas.css';

const HistoricoPropostas = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdminFullUser = isAdminFull(currentUser);
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroResultado, setFiltroResultado] = useState('todos');
  const [busca, setBusca] = useState('');
  const [filtroRepresentante, setFiltroRepresentante] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [resultadoModalOpen, setResultadoModalOpen] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState(null);
  const [resultadoSelecionado, setResultadoSelecionado] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [salvandoResultado, setSalvandoResultado] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    carregarPropostas();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatNumeroProposta = (numero) => {
    const raw = String(numero || '').trim();
    if (!raw) return '';

    if (/^PED\d+$/i.test(raw)) {
      return raw.replace(/^PED/i, '');
    }

    return raw;
  };

  const openResultadoModal = (proposta) => {
    setPropostaSelecionada(proposta);
    setResultadoSelecionado(proposta?.resultado_venda || '');
    setMotivoPerda(proposta?.motivo_perda || '');
    setResultadoModalOpen(true);
  };

  const closeResultadoModal = () => {
    if (salvandoResultado) return;
    setResultadoModalOpen(false);
    setPropostaSelecionada(null);
    setResultadoSelecionado('');
    setMotivoPerda('');
  };

  const salvarResultado = async () => {
    if (!propostaSelecionada?.id) return;

    if (resultadoSelecionado === 'perdida' && !motivoPerda.trim()) {
      alert('Informe um motivo (curto) para a perda.');
      return;
    }

    setSalvandoResultado(true);
    try {
      await updateResultadoVendaProposta(propostaSelecionada.id, {
        resultado_venda: resultadoSelecionado || null,
        motivo_perda: motivoPerda || null,
      });

      await carregarPropostas();
      closeResultadoModal();
    } catch (error) {
      console.error('Erro ao salvar resultado da proposta:', error);
      alert('Erro ao salvar resultado da proposta.');
    } finally {
      setSalvandoResultado(false);
    }
  };

  const carregarPropostas = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();

      const filters = {};
      if (isAdminFull(user)) {
        filters.canal_venda = 'Representante';
      } else if (user?.id) {
        filters.vendedor_id = user.id;
      }

      const data = await getPropostas(filters);
      setPropostas(data);
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      alert('Erro ao carregar histórico de propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id, numeroProposta) => {
    if (!window.confirm(`Tem certeza que deseja excluir PERMANENTEMENTE a proposta ${numeroProposta}?\n\nEsta ação não pode ser desfeita e os dados serão removidos do banco.`)) {
      return;
    }

    try {
      await deletePropostaPermanente(id);
      alert('Proposta excluída com sucesso!');
      carregarPropostas();
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      alert('Erro ao excluir proposta');
    }
  };

  const handleReabrir = (proposta) => {
    navigate(`/novo-pedido/${proposta.id}`);
  };

  const representantes = Array.from(
    new Map(
      propostas
        .filter((p) => p.vendedor_id && p.vendedor_nome)
        .map((p) => [String(p.vendedor_id), { id: String(p.vendedor_id), nome: p.vendedor_nome }])
    ).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const ufs = [...new Set(propostas.map((p) => p.cliente_uf).filter(Boolean))].sort();

  const propostasFiltradas = propostas.filter((p) => {
    if (isAdminFullUser) {
      if (filtroRepresentante && String(p.vendedor_id) !== filtroRepresentante) return false;
      if (filtroStatus && String(p.status || '') !== filtroStatus) return false;
      if (filtroUf && String(p.cliente_uf || '').toUpperCase() !== filtroUf) return false;
      if (filtroCliente && !String(p.cliente_nome || '').toLowerCase().includes(filtroCliente.toLowerCase().trim())) return false;

      const dataProposta = p.data || p.created_at;
      if ((filtroDataInicio || filtroDataFim) && !dataProposta) return false;
      if (dataProposta) {
        const data = new Date(dataProposta);
        if (filtroDataInicio && data < new Date(`${filtroDataInicio}T00:00:00`)) return false;
        if (filtroDataFim && data > new Date(`${filtroDataFim}T23:59:59.999`)) return false;
      }
    }

    if (filtroResultado !== 'todos') {
      const r = p.resultado_venda || '';
      if (filtroResultado === 'sem_resultado' && r) return false;
      if (filtroResultado === 'efetivada' && r !== 'efetivada') return false;
      if (filtroResultado === 'perdida' && r !== 'perdida') return false;
    }

    if (busca) {
      const termo = busca.toLowerCase();
      return (
        (p.numero_proposta || '').toLowerCase().includes(termo) ||
        (p.cliente_nome || '').toLowerCase().includes(termo) ||
        (p.vendedor_nome || '').toLowerCase().includes(termo)
      );
    }

    return true;
  });

  const getResultadoBadge = (resultado, motivo) => {
    const r = (resultado || '').toLowerCase();

    if (!r) {
      return <span className="erp-badge" title={motivo}>Sem resultado</span>;
    }

    if (r === 'efetivada') {
      return <span className="erp-badge erp-badge-success">Efetivada</span>;
    }

    return <span className="erp-badge erp-badge-error" title={motivo ? `Motivo: ${motivo}` : ''}>Perdida</span>;
  };

  const filters = (
    <>
      {isAdminFullUser && (
        <>
          <select className="erp-select propostas-filter" value={filtroRepresentante} onChange={(e) => setFiltroRepresentante(e.target.value)} aria-label="Representante">
            <option value="">Todos os representantes</option>
            {representantes.map((representante) => (
              <option key={representante.id} value={representante.id}>{representante.nome}</option>
            ))}
          </select>
          <select className="erp-select propostas-filter" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Status">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="finalizado">Finalizado</option>
            <option value="excluido">Excluído</option>
          </select>
          <input className="erp-input propostas-filter propostas-filter-client" type="text" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Cliente" aria-label="Cliente" />
          <select className="erp-select propostas-filter propostas-filter-uf" value={filtroUf} onChange={(e) => setFiltroUf(e.target.value)} aria-label="UF">
            <option value="">Todas as UFs</option>
            {ufs.map((uf) => <option key={uf} value={String(uf).toUpperCase()}>{String(uf).toUpperCase()}</option>)}
          </select>
          <label className="propostas-filter-field">
            <span>De</span>
            <input className="erp-input propostas-filter propostas-filter-date" type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} aria-label="Data inicial" />
          </label>
          <label className="propostas-filter-field">
            <span>Até</span>
            <input className="erp-input propostas-filter propostas-filter-date" type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} aria-label="Data final" />
          </label>
        </>
      )}
      <select
        className="erp-select propostas-filter"
        value={filtroResultado}
        onChange={(e) => setFiltroResultado(e.target.value)}
      >
        <option value="todos">Todos os resultados</option>
        <option value="sem_resultado">Sem resultado</option>
        <option value="efetivada">Efetivada</option>
        <option value="perdida">Perdida</option>
      </select>
    </>
  );

  const tableContent = loading ? (
    <div className="erp-table-empty">Carregando histórico...</div>
  ) : propostasFiltradas.length === 0 ? (
    <div className="erp-table-empty">
      <p>Nenhuma proposta encontrada.</p>
      <p className="erp-table-empty-hint">
        {busca || filtroResultado !== 'todos'
          ? 'Tente ajustar os filtros de busca.'
          : 'Comece gerando sua primeira proposta.'}
      </p>
    </div>
  ) : (
    <table className="erp-table">
      <thead>
        <tr>
          <th>Nº Proposta</th>
          <th>Cliente</th>
          <th style={{ textAlign: 'right' }}>Valor Total</th>
          <th>Data</th>
          <th>Resultado</th>
          <th style={{ width: 1 }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {propostasFiltradas.map((proposta) => (
          <tr key={proposta.id}>
            <td>#{formatNumeroProposta(proposta.numero_proposta)}</td>
            <td>
              <div>{proposta.cliente_nome}</div>
              {proposta.cliente_documento && (
                <div className="proposta-documento">{proposta.cliente_documento}</div>
              )}
            </td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(proposta.valor_total)}</td>
            <td>{proposta.data ? new Date(proposta.data).toLocaleDateString('pt-BR') : '-'}</td>
            <td>{getResultadoBadge(proposta.resultado_venda, proposta.motivo_perda)}</td>
            <td>
              <div className="propostas-acoes">
                {(proposta.status === 'pendente' || proposta.status === 'finalizado') && (
                  <>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary"
                      onClick={() => handleReabrir(proposta)}
                      title={proposta.status === 'finalizado' ? 'Editar proposta finalizada' : 'Reabrir e continuar edição'}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary"
                      onClick={() => openResultadoModal(proposta)}
                      title="Marcar resultado da proposta"
                    >
                      Resultado
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="erp-btn erp-btn-danger"
                  onClick={() => handleExcluir(proposta.id, proposta.numero_proposta)}
                  title="Excluir proposta permanentemente"
                >
                  Excluir
                </button>
                {proposta.status === 'excluido' && (
                  <span className="proposta-status-texto">Excluída</span>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="erp-page">
      <div className="erp-container">
        <PageHeader
          breadcrumb={[{ label: 'Comercial' }, { label: isAdminFullUser ? 'Propostas e Vendas' : 'Propostas' }]}
          title={isAdminFullUser ? 'Propostas e Vendas' : 'Propostas'}
          subtitle={isAdminFullUser ? 'Propostas comerciais do canal de representantes.' : 'Gerencie seus orçamentos e propostas comerciais.'}
          actions={
            <button type="button" className="erp-btn erp-btn-primary" onClick={() => navigate('/novo-pedido')}>
              + Nova Proposta
            </button>
          }
        />

        <PageToolbar
          search={{ placeholder: 'Nº, cliente ou vendedor...', value: busca, onChange: setBusca }}
          filters={filters}
          count={`${propostasFiltradas.length} ${propostasFiltradas.length === 1 ? 'proposta' : 'propostas'}`}
          actions={
            <button type="button" className="erp-btn erp-btn-secondary" onClick={carregarPropostas} title="Atualizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          }
        />

        {isMobile ? (
          <div className="propostas-mobile-list">
            {loading ? (
              <div className="erp-table-empty">Carregando histórico...</div>
            ) : propostasFiltradas.length === 0 ? (
              <div className="erp-table-empty">
                <p>Nenhuma proposta encontrada.</p>
              </div>
            ) : (
              propostasFiltradas.map((proposta) => (
                <div key={proposta.id} className="proposta-mobile-card">
                  <div className="proposta-mobile-header">
                    <span className="proposta-mobile-numero">#{formatNumeroProposta(proposta.numero_proposta)}</span>
                    <span className="proposta-mobile-data">
                      {proposta.data ? new Date(proposta.data).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                  <div className="proposta-mobile-cliente">{proposta.cliente_nome}</div>
                  {proposta.cliente_documento && (
                    <div className="proposta-documento">{proposta.cliente_documento}</div>
                  )}
                  <div className="proposta-mobile-footer">
                    <span className="proposta-mobile-valor">{formatCurrency(proposta.valor_total)}</span>
                    <span>{getResultadoBadge(proposta.resultado_venda, proposta.motivo_perda)}</span>
                  </div>
                  <div className="proposta-mobile-acoes">
                    {(proposta.status === 'pendente' || proposta.status === 'finalizado') && (
                      <>
                        <button
                          type="button"
                          className="erp-btn erp-btn-secondary"
                          onClick={() => handleReabrir(proposta)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="erp-btn erp-btn-secondary"
                          onClick={() => openResultadoModal(proposta)}
                        >
                          Resultado
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="erp-btn erp-btn-danger"
                      onClick={() => handleExcluir(proposta.id, proposta.numero_proposta)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="erp-table-shell">{tableContent}</div>
        )}
      </div>

      {resultadoModalOpen && (
        <div className="erp-modal-overlay" onClick={closeResultadoModal}>
          <div className="erp-modal resultado-modal" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <div>
                <h2>Resultado da Proposta</h2>
                <p>
                  #{formatNumeroProposta(propostaSelecionada?.numero_proposta)} • {propostaSelecionada?.cliente_nome}
                </p>
              </div>
              <button
                type="button"
                className="erp-modal-close"
                onClick={closeResultadoModal}
                disabled={salvandoResultado}
                aria-label="Fechar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="resultado-opcoes">
              <label className="resultado-label">Selecione o resultado</label>
              <button
                type="button"
                className={`resultado-opcao ${resultadoSelecionado === '' ? 'selected' : ''}`}
                onClick={() => setResultadoSelecionado('')}
                disabled={salvandoResultado}
              >
                <strong>Sem resultado</strong>
                <span>Ainda em negociação / sem definição.</span>
              </button>
              <button
                type="button"
                className={`resultado-opcao success ${resultadoSelecionado === 'efetivada' ? 'selected' : ''}`}
                onClick={() => setResultadoSelecionado('efetivada')}
                disabled={salvandoResultado}
              >
                <strong>Efetivada</strong>
                <span>Virou venda. Entra no cálculo de conversão.</span>
              </button>
              <button
                type="button"
                className={`resultado-opcao danger ${resultadoSelecionado === 'perdida' ? 'selected' : ''}`}
                onClick={() => setResultadoSelecionado('perdida')}
                disabled={salvandoResultado}
              >
                <strong>Perdida</strong>
                <span>Não virou venda. Informe o motivo abaixo.</span>
              </button>
            </div>

            <div className="erp-form-group" style={{ marginTop: 'var(--erp-space-4)' }}>
              <label>Motivo (apenas se perdida)</label>
              <input
                type="text"
                className="erp-input"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                disabled={salvandoResultado || resultadoSelecionado !== 'perdida'}
                maxLength={140}
                placeholder={resultadoSelecionado === 'perdida' ? 'Ex: preço alto, prazo, concorrência, desistiu...' : '—'}
              />
              <div className="resultado-motivo-meta">
                <span>{resultadoSelecionado === 'perdida' ? 'Obrigatório' : 'Desabilitado'}</span>
                <span>{(motivoPerda || '').length}/140</span>
              </div>
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={closeResultadoModal}
                disabled={salvandoResultado}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={salvarResultado}
                disabled={salvandoResultado}
              >
                {salvandoResultado ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoPropostas;
