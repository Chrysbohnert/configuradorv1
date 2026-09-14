import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getClientes, createCliente, updateCliente, deleteCliente, getPropostasDoCliente } from '../../api/clientes';
import { normalizarArray } from '../../utils/normalizadores';
import { formatCurrency } from '../../utils/formatters';
import { isAdmin } from '../../utils/permissions';
import ClienteFormFields from '../../components/Clientes/ClienteFormFields';
import PageHeader from '../../components/PageHeader';
import PageToolbar from '../../components/PageToolbar';
import '../../styles/Clientes.css';

const CLIENTE_VAZIO = {
  nome: '', documento: '', documento_tipo: '', telefone: '', email: '',
  endereco: '', cidade: '', uf: '',
  inscricao_estadual: '', possui_ie: '', observacoes: '', regiao: '',
  tipo_venda: '', participacao_revenda: '', tipo_cliente: '',
};

export default function Clientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(user);

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(CLIENTE_VAZIO);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [historico, setHistorico] = useState({ open: false, cliente: null, propostas: [], loading: false });

  const regioesDisponiveis = useMemo(() => {
    const ops = normalizarArray(user?.regioes_operacao);
    if (ops.length > 0) return ops;
    const principal = (user?.regiao || '').trim();
    return principal ? [principal] : ['Norte-Nordeste', 'Sul-Sudeste', 'Centro-Oeste', 'Rio Grande do Sul', 'Comércio Exterior'];
  }, [user?.regioes_operacao, user?.regiao]);

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await getClientes({ search: busca || undefined });
      setClientes(data);
    } catch (e) {
      console.error('[Clientes] erro ao carregar:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const abrirNovo = () => {
    setFormData(CLIENTE_VAZIO);
    setErrorMsg('');
    setShowModal(true);
  };

  const abrirEdicao = (cliente) => {
    setFormData({ ...CLIENTE_VAZIO, ...cliente });
    setErrorMsg('');
    setShowModal(true);
  };

  const excluir = async (cliente) => {
    if (!window.confirm(`Confirma a exclusão do cliente "${cliente.nome}"?`)) return;
    try {
      await deleteCliente(cliente.id);
      carregar();
    } catch (e) {
      setErrorMsg(e.message || 'Erro ao excluir cliente');
    }
  };

  const iniciarNovaProposta = (cliente) => {
    navigate('/novo-pedido', { state: { clienteSelecionado: cliente } });
  };

  const salvar = async () => {
    if (!formData.nome?.trim() || !formData.telefone?.trim()) {
      setErrorMsg('Nome e telefone são obrigatórios');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      if (formData.id) {
        await updateCliente(formData.id, formData);
      } else {
        await createCliente(formData);
      }
      setShowModal(false);
      carregar();
    } catch (e) {
      setErrorMsg(e.message || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const abrirHistorico = async (cliente) => {
    setHistorico({ open: true, cliente, propostas: [], loading: true });
    try {
      const data = await getPropostasDoCliente(cliente.id);
      setHistorico({ open: true, cliente, propostas: data, loading: false });
    } catch {
      setHistorico({ open: true, cliente, propostas: [], loading: false });
    }
  };

  const breadcrumb = userIsAdmin
    ? [{ label: 'Cadastros', path: '/cadastros' }, { label: 'Clientes' }]
    : [{ label: 'Clientes' }];

  const subtitle = userIsAdmin
    ? 'Gerencie os clientes cadastrados, com o vendedor responsável.'
    : 'Seus clientes cadastrados.';

  return (
    <div className="erp-page">
      <div className="erp-container">
        <PageHeader
          breadcrumb={breadcrumb}
          title="Clientes"
          subtitle={subtitle}
          actions={
            <button type="button" className="erp-btn erp-btn-primary" onClick={abrirNovo}>
              + Novo Cliente
            </button>
          }
        />

        <PageToolbar
          search={{ placeholder: 'Buscar cliente por nome ou CPF/CNPJ...', value: busca, onChange: setBusca }}
          count={`${clientes.length} cliente(s) cadastrado(s)`}
        />

        <div className="erp-table-shell">
          {loading ? (
            <div className="erp-table-empty">Carregando...</div>
          ) : clientes.length === 0 ? (
            <div className="erp-table-empty">Nenhum cliente encontrado.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>UF</th>
                  <th>Região</th>
                  <th>Tipo de venda</th>
                  {userIsAdmin && <th>Vendedor</th>}
                  <th>Propostas</th>
                  <th style={{ width: 1 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{c.documento}</td>
                    <td>{c.uf || '-'}</td>
                    <td>{c.regiao || '-'}</td>
                    <td>
                      <span className="erp-badge">
                        {c.tipo_venda === 'revenda' ? 'Revenda' : c.tipo_venda === 'cliente' ? 'Cliente' : '-'}
                      </span>
                    </td>
                    {userIsAdmin && <td>{c.vendedor_nome || '-'}</td>}
                    <td>
                      <button type="button" className="erp-btn-link" onClick={() => abrirHistorico(c)}>
                        {c.total_propostas || 0} proposta(s)
                      </button>
                    </td>
                    <td>
                      <div className="clientes-acoes">
                        <button type="button" className="erp-btn erp-btn-secondary" onClick={() => abrirEdicao(c)}>
                          Editar
                        </button>
                        <button type="button" className="erp-btn erp-btn-secondary" onClick={() => iniciarNovaProposta(c)}>
                          Nova Proposta
                        </button>
                        {(userIsAdmin || String(c.vendedor_id) === String(user?.id)) && (
                          <button type="button" className="erp-btn erp-btn-danger" onClick={() => excluir(c)}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="erp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="erp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h2>{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button type="button" className="erp-modal-close" onClick={() => setShowModal(false)} aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <ClienteFormFields
              formData={formData}
              setFormData={setFormData}
              regioesDisponiveis={regioesDisponiveis}
            />
            {errorMsg && <div className="erp-form-error">{errorMsg}</div>}
            <div className="erp-modal-footer">
              <button type="button" className="erp-btn erp-btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="button" className="erp-btn erp-btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historico.open && (
        <div className="erp-modal-overlay" onClick={() => setHistorico({ open: false, cliente: null, propostas: [], loading: false })}>
          <div className="erp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h2>Histórico de Propostas — {historico.cliente?.nome}</h2>
              <button type="button" className="erp-modal-close" onClick={() => setHistorico({ open: false, cliente: null, propostas: [], loading: false })} aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {historico.loading ? (
              <p>Carregando...</p>
            ) : historico.propostas.length === 0 ? (
              <p>Nenhuma proposta vinculada a este cliente.</p>
            ) : (
              <div className="erp-table-shell" style={{ minHeight: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Nº Proposta</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.propostas.map((p) => (
                      <tr key={p.id}>
                        <td>{p.numero_proposta}</td>
                        <td>{p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>{p.status}</td>
                        <td>{formatCurrency(p.valor_total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setHistorico({ open: false, cliente: null, propostas: [], loading: false })}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
