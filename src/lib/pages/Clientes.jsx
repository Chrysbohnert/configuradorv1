import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { getClientes, createCliente, updateCliente, deleteCliente, getPropostasDoCliente } from '../../api/clientes';
import { normalizarArray } from '../../utils/normalizadores';
import { formatCurrency } from '../../utils/formatters';
import ClienteFormFields from '../../components/Clientes/ClienteFormFields';
import '../../styles/Clientes.css';

const CLIENTE_VAZIO = {
  nome: '', documento: '', documento_tipo: '', telefone: '', email: '',
  endereco: '', cidade: '', uf: '',
  inscricao_estadual: '', possui_ie: '', observacoes: '', regiao: '',
  tipo_venda: '', participacao_revenda: '', tipo_cliente: '',
};

export default function Clientes() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const isAdmin = ['admin_stark', 'admin', 'admin_concessionaria'].includes(user?.tipo);

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
    } catch (e) {
      setHistorico({ open: true, cliente, propostas: [], loading: false });
    }
  };

  return (
    <div className="clientes-container">
      <div className="clientes-content">
        <div className="clientes-header">
          <div>
            <h1>Clientes</h1>
            <p>{isAdmin ? 'Todos os clientes cadastrados, com o vendedor responsável' : 'Seus clientes cadastrados'}</p>
          </div>
          <button type="button" className="btn-primario" onClick={abrirNovo}>+ Novo Cliente</button>
        </div>

        <input
          type="text"
          className="clientes-busca"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="clientes-tabela-wrap">
          {loading ? (
            <div className="clientes-vazio">Carregando...</div>
          ) : clientes.length === 0 ? (
            <div className="clientes-vazio">Nenhum cliente encontrado.</div>
          ) : (
            <table className="clientes-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>Região</th>
                  <th>Tipo de Venda</th>
                  {isAdmin && <th>Vendedor</th>}
                  <th>Propostas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{c.documento}</td>
                    <td>{c.regiao || '-'}</td>
                    <td>{c.tipo_venda === 'revenda' ? 'Revenda' : c.tipo_venda === 'cliente' ? 'Cliente' : '-'}</td>
                    {isAdmin && <td>{c.vendedor_nome || '-'}</td>}
                    <td>
                      <button type="button" className="btn-link" onClick={() => abrirHistorico(c)}>
                        {c.total_propostas || 0} proposta(s)
                      </button>
                    </td>
                    <td>
                      <button type="button" className="btn-secundario" onClick={() => abrirEdicao(c)}>Editar</button>
                      <button
                        type="button"
                        className="btn-secundario"
                        onClick={() => iniciarNovaProposta(c)}
                        style={{ marginLeft: '8px' }}
                      >
                        Nova Proposta
                      </button>
                      {(isAdmin || String(c.vendedor_id) === String(user?.id)) && (
                        <button
                          type="button"
                          className="btn-secundario"
                          onClick={() => excluir(c)}
                          style={{ marginLeft: '8px', color: '#dc2626' }}
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="clientes-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="clientes-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <ClienteFormFields
              formData={formData}
              setFormData={setFormData}
              regioesDisponiveis={regioesDisponiveis}
            />
            {errorMsg && <div className="clientes-erro">{errorMsg}</div>}
            <div className="clientes-modal-actions">
              <button type="button" className="btn-secundario" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="button" className="btn-primario" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historico.open && (
        <div className="clientes-modal-overlay" onClick={() => setHistorico({ open: false, cliente: null, propostas: [], loading: false })}>
          <div className="clientes-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Histórico de Propostas — {historico.cliente?.nome}</h2>
            {historico.loading ? (
              <p>Carregando...</p>
            ) : historico.propostas.length === 0 ? (
              <p>Nenhuma proposta vinculada a este cliente.</p>
            ) : (
              <table className="clientes-tabela">
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
            )}
            <div className="clientes-modal-actions">
              <button type="button" className="btn-secundario" onClick={() => setHistorico({ open: false, cliente: null, propostas: [], loading: false })}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
