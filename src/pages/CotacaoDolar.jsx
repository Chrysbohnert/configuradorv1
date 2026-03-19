import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/Dashboard.css';

const CotacaoDolar = () => {
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [cotacao, setCotacao] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const carregar = async () => {
    try {
      setIsLoading(true);
      const v = await db.getCotacaoUSD();
      setCotacao(String(v));

      const cfg = await db.getConfiguracaoGlobal('usd_brl');
      setUltimaAtualizacao(cfg?.updated_at || null);
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
    try {
      setIsLoading(true);
      await db.setCotacaoUSD(cotacao);
      await carregar();
      alert('Cotação salva com sucesso!');
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
        subtitle="Defina a cotação global usada pelo vendedor exterior"
      />

      <div className="dashboard-container">
        <div className="dashboard-content">
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', maxWidth: 720 }}>
            <h2 style={{ marginTop: 0 }}>USD → BRL</h2>
            <p style={{ color: '#6b7280', marginTop: 6 }}>
              Informe quanto vale <b>1 USD</b> em <b>R$</b>. Ex: <code>5.12</code>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Cotação (1 USD = R$)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={cotacao}
                  onChange={(e) => setCotacao(e.target.value)}
                  className="filter-select"
                  style={{ width: '100%', maxWidth: 320 }}
                  disabled={isLoading}
                />
              </div>

              <div style={{ color: '#6b7280', fontSize: 12 }}>
                Última atualização: {ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleString('pt-BR') : '-'}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="add-btn" onClick={salvar} disabled={isLoading || !cotacao}>
                  {isLoading ? 'Salvando...' : 'Salvar Cotação'}
                </button>
                <button className="add-btn" onClick={carregar} disabled={isLoading} style={{ background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)' }}>
                  Recarregar
                </button>
              </div>

              <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #eee', borderRadius: 10, padding: 12, color: '#374151' }}>
                <b>Como será usado:</b>
                <div style={{ marginTop: 6, fontSize: 13, color: '#4b5563' }}>
                  Vendedor Exterior vai ver os preços convertidos automaticamente em USD usando essa cotação.
                  A proposta salva a cotação utilizada para manter histórico correto.
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
