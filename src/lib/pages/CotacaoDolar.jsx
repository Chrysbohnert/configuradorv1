import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { setCotacaoUSD, atualizarCotacaoPTAX } from '../../api/configuracoes';
import { isAdminFull } from '../../utils/permissions';
import '../../styles/Dashboard.css';

const CotacaoDolar = () => {
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [cotacao, setCotacao] = useState('');
  const [modo, setModo] = useState('auto');
  const [dataReferencia, setDataReferencia] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const podeEditar = isAdminFull(user);

  const carregar = async (reativar = false) => {
    try {
      setIsLoading(true);
      const cfg = await atualizarCotacaoPTAX(reativar);
      const v = Number(cfg?.valor_numero);
      setCotacao(Number.isFinite(v) && v > 0 ? String(v) : '5.12');
      setUltimaAtualizacao(cfg?.updated_at || null);

      let meta = {};
      try {
        meta = JSON.parse(cfg?.valor_texto || '{}');
      } catch {
        meta = {};
      }
      setModo(meta.modo || 'auto');
      setDataReferencia(meta.data_referencia || null);
    } catch (error) {
      console.error('Erro ao carregar cotação USD:', error);
      alert('Erro ao carregar cotação USD.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    carregar();
  }, [user]);

  const salvar = async () => {
    if (!podeEditar) return;
    try {
      setIsLoading(true);
      await setCotacaoUSD(cotacao);
      await carregar();
      alert('Cotação salva manualmente.');
    } catch (error) {
      console.error('Erro ao salvar cotação USD:', error);
      alert(error?.message || 'Erro ao salvar cotação USD.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Cotação do Dólar"
        subtitle="Cotação PTAX usada pelo vendedor exterior"
      />

      <div className="dashboard-container">
        <div className="dashboard-content">
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', maxWidth: 720 }}>
            <h2 style={{ marginTop: 0 }}>USD → BRL</h2>
            <p style={{ color: '#6b7280', marginTop: 6 }}>
              O valor é atualizado automaticamente com a cotação de venda PTAX do Banco Central.
              Admin pode definir manualmente e reativar o modo automático quando desejar.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  Cotação (1 USD = R$)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={cotacao}
                  onChange={(e) => setCotacao(e.target.value)}
                  className="filter-select"
                  style={{ width: '100%', maxWidth: 320 }}
                  disabled={!podeEditar || isLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: modo === 'manual' ? '#fff7ed' : '#ecfdf5',
                    color: modo === 'manual' ? '#9a3412' : '#047857',
                    border: `1px solid ${modo === 'manual' ? '#fed7aa' : '#a7f3d0'}`,
                  }}
                >
                  {modo === 'manual' ? 'Modo manual' : 'Modo automático (PTAX)'}
                </span>
                {modo === 'manual' && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    A cotação foi definida manualmente e não será sobrescrita pela PTAX.
                  </span>
                )}
              </div>

              <div style={{ color: '#6b7280', fontSize: 12, display: 'grid', gap: 4 }}>
                <div>Data de referência PTAX: {dataReferencia ? new Date(dataReferencia + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                <div>Última atualização: {ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleString('pt-BR') : '-'}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="add-btn"
                  onClick={salvar}
                  disabled={!podeEditar || isLoading || !cotacao}
                >
                  {isLoading ? 'Salvando...' : 'Salvar cotação manual'}
                </button>
                {modo === 'manual' && podeEditar && (
                  <button
                    className="add-btn"
                    onClick={() => carregar(true)}
                    disabled={isLoading}
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                  >
                    Reativar automático
                  </button>
                )}
                {modo !== 'manual' && podeEditar && (
                  <button
                    className="add-btn"
                    onClick={() => carregar(false)}
                    disabled={isLoading}
                    style={{ background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)' }}
                  >
                    Atualizar com PTAX
                  </button>
                )}
              </div>

              <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #eee', borderRadius: 10, padding: 12, color: '#374151' }}>
                <b>Como será usado:</b>
                <div style={{ marginTop: 6, fontSize: 13, color: '#4b5563' }}>
                  Vendedor Exterior verá os preços convertidos com essa cotação.
                  Cada proposta salva registra a cotação utilizada para manter o histórico correto,
                  sem recalcular valores já fechados.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CotacaoDolar;
