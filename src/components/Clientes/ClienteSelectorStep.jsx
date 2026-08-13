import React, { useEffect, useMemo, useState } from 'react';
import { getClientes, createCliente, updateCliente } from '../../api/clientes';
import { normalizarArray } from '../../utils/normalizadores';
import ClienteFormFields from './ClienteFormFields';

const CLIENTE_VAZIO = {
  nome: '', documento: '', telefone: '', email: '', endereco: '',
  inscricao_estadual: '', observacoes: '', regiao: '', tipo_venda: '',
  participacao_revenda: '', tipo_cliente: '',
};

/**
 * Etapa "Cliente" da Nova Proposta.
 * Permite buscar/selecionar um cliente já cadastrado, ou cadastrar um novo
 * sem sair do fluxo. Ao selecionar/cadastrar, expõe o cliente completo
 * (com regiao/tipo_venda/participacao_revenda/tipo_cliente) via onClienteSelecionado.
 */
export default function ClienteSelectorStep({
  user,
  clienteSelecionado,
  onClienteSelecionado,
  onNext,
  errors = {},
}) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);
  const [formData, setFormData] = useState(CLIENTE_VAZIO);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const regioesDisponiveis = useMemo(() => {
    const ops = normalizarArray(user?.regioes_operacao);
    if (ops.length > 0) return ops;
    const principal = (user?.regiao || '').trim();
    return principal ? [principal] : [];
  }, [user?.regioes_operacao, user?.regiao]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes({ search: busca || undefined });
      setClientes(data);
    } catch (e) {
      console.error('[ClienteSelectorStep] erro ao carregar clientes:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(carregarClientes, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const iniciarEdicao = (cliente) => {
    setFormData({ ...CLIENTE_VAZIO, ...cliente });
    setModoCadastro(true);
  };

  const iniciarCadastro = () => {
    setFormData({
      ...CLIENTE_VAZIO,
      regiao: regioesDisponiveis.length === 1 ? regioesDisponiveis[0] : '',
    });
    setModoCadastro(true);
  };

  const validar = () => {
    if (!formData.nome?.trim()) return 'Informe o nome do cliente';
    if (!formData.telefone?.trim()) return 'Informe o telefone do cliente';
    return '';
  };

  const salvarCliente = async () => {
    const erro = validar();
    if (erro) { setSaveError(erro); return; }
    setSaveError('');
    setSaving(true);
    try {
      const salvo = formData.id
        ? await updateCliente(formData.id, formData)
        : await createCliente(formData);
      setModoCadastro(false);
      await carregarClientes();
      onClienteSelecionado(salvo);
      onNext?.();
    } catch (e) {
      setSaveError(e.message || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const selecionarCliente = (cliente) => {
    onClienteSelecionado(cliente);
  };

  if (modoCadastro) {
    return (
      <div className="step-content">
        <div className="step-header">
          <h2>{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <p>Preencha os dados do cliente para continuar a proposta</p>
        </div>

        <ClienteFormFields
          formData={formData}
          setFormData={setFormData}
          regioesDisponiveis={regioesDisponiveis}
        />

        {saveError && (
          <div style={{ marginTop: '10px', color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button
            type="button"
            onClick={() => setModoCadastro(false)}
            style={btnSecundario}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={salvarCliente}
            disabled={saving}
            style={btnPrimario}
          >
            {saving ? 'Salvando...' : 'Salvar e Continuar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Cliente</h2>
        <p>Busque um cliente já cadastrado ou cadastre um novo</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF/CNPJ..."
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
        />
        <button type="button" onClick={iniciarCadastro} style={btnPrimario}>
          + Novo Cliente
        </button>
      </div>

      {errors.cliente && (
        <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
          {errors.cliente}
        </div>
      )}

      <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
        ) : clientes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            Nenhum cliente encontrado.
          </div>
        ) : (
          clientes.map((c) => {
            const ativo = clienteSelecionado?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selecionarCliente(c)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: ativo ? '#eef2ff' : '#fff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{c.nome}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {c.documento} {c.regiao ? `• ${c.regiao}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ativo && <span style={{ color: '#4f46e5', fontWeight: 700, fontSize: '13px' }}>✔ Selecionado</span>}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); iniciarEdicao(c); }}
                    style={{ ...btnSecundario, padding: '6px 10px', fontSize: '12px' }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', marginTop: '18px' }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!clienteSelecionado}
          style={{ ...btnPrimario, width: '100%', opacity: clienteSelecionado ? 1 : 0.5 }}
        >
          Continuar para Guindaste
        </button>
      </div>
    </div>
  );
}

const btnPrimario = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};

const btnSecundario = {
  padding: '10px 20px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};
