import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getClientes, createCliente } from '../../api/clientes';
import ClienteFormFields from './ClienteFormFields';

const CLIENTE_VAZIO = {
  nome: '', documento: '', telefone: '', email: '', endereco: '',
  inscricao_estadual: '', observacoes: '', regiao: '', tipo_venda: '',
  participacao_revenda: '', tipo_cliente: '',
};

export default function SeletorCliente({
  user,
  clienteSelecionado,
  onClienteSelecionado,
  regioesDisponiveis = [],
}) {
  const wrapperRef = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [formData, setFormData] = useState(CLIENTE_VAZIO);
  const [saveError, setSaveError] = useState('');

  const carregarClientes = async (termo = '') => {
    setCarregando(true);
    try {
      const data = await getClientes({ search: termo || undefined });
      setClientes(data || []);
    } catch (e) {
      console.error('[SeletorCliente] erro ao carregar:', e.message);
      setClientes([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => carregarClientes(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clientesFiltrados = useMemo(() => {
    return clientes.slice(0, 20);
  }, [clientes]);

  const selecionar = (cliente) => {
    onClienteSelecionado(cliente);
    setAberto(false);
    setBusca('');
  };

  const iniciarCadastro = () => {
    setFormData({
      ...CLIENTE_VAZIO,
      regiao: regioesDisponiveis.length === 1 ? regioesDisponiveis[0] : '',
    });
    setSaveError('');
    setMostrarCadastro(true);
  };

  const validar = () => {
    if (!formData.nome?.trim()) return 'Informe o nome do cliente';
    if (!formData.telefone?.trim()) return 'Informe o telefone do cliente';
    return '';
  };

  const salvar = async () => {
    const erro = validar();
    if (erro) {
      setSaveError(erro);
      return;
    }
    try {
      const salvo = await createCliente(formData);
      onClienteSelecionado(salvo);
      setMostrarCadastro(false);
      setFormData(CLIENTE_VAZIO);
      await carregarClientes();
    } catch (e) {
      setSaveError(e.message || 'Erro ao salvar cliente');
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#000' }}>
          Cliente:
        </span>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
            color: clienteSelecionado ? '#0f172a' : '#6b7280',
            fontSize: '0.875rem',
            cursor: 'pointer',
            minWidth: '220px',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {clienteSelecionado ? clienteSelecionado.nome : 'Selecione um cliente...'}
          <span style={{ fontSize: '0.7rem' }}>▼</span>
        </button>
        <button
          type="button"
          onClick={iniciarCadastro}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: '#f3f4f6',
            color: '#111827',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          + Novo Cliente
        </button>
      </div>

      {aberto && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 50,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          width: '340px',
          maxWidth: '100%',
          padding: '10px',
        }}>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar pelo nome..."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '8px',
              fontSize: '0.875rem',
            }}
          />
          {carregando ? (
            <div style={{ padding: '8px', fontSize: '0.75rem', color: '#6b7280' }}>Carregando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div style={{ padding: '8px', fontSize: '0.75rem', color: '#6b7280' }}>Nenhum cliente encontrado.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '180px', overflowY: 'auto' }}>
              {clientesFiltrados.map(c => (
                <li
                  key={c.id}
                  onClick={() => selecionar(c)}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '0.875rem',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                >
                  {c.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mostrarCadastro && (
        <div
          onClick={() => setMostrarCadastro(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 16px' }}>Novo Cliente</h3>
            <ClienteFormFields
              formData={formData}
              setFormData={setFormData}
              regioesDisponiveis={regioesDisponiveis}
            />
            {saveError && <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '8px' }}>{saveError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setMostrarCadastro(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
