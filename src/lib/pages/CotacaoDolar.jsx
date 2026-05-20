import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { getCotacaoUSD, setCotacaoUSD, getConfiguracaoGlobal } from '../../api/configuracoes';
import '../../styles/Dashboard.css';

const CotacaoDolar = () => {
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [cotacao, setCotacao] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const carregar = async () => {
    try {
      setIsLoading(true);
      const v = await getCotacaoUSD();
      setCotacao(String(v));

      const cfg = await getConfiguracaoGlobal('usd_brl');
      setUltimaAtualizacao(cfg?.updated_at || null);
    } catch (error) {
      console.error('Erro ao carregar cotaÃ§Ã£o USD:', error);
      alert('Erro ao carregar cotaÃ§Ã£o USD.');
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
      await setCotacaoUSD(cotacao);
      await carregar();
      alert('CotaÃ§Ã£o salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar cotaÃ§Ã£o USD:', error);
      alert(error?.message || 'Erro ao salvar cotaÃ§Ã£o USD.');
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
        title="CotaÃ§Ã£o do DÃ³lar"
        subtitle="Defina a cotaÃ§Ã£o global usada pelo vendedor exterior"
      />

      <div className="dashboard-container">
        <div className="dashboard-content">
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', maxWidth: 720 }}>
            <h2 style={{ marginTop: 0 }}>USD â†’ BRL</h2>
            <p style={{ color: '#6b7280', marginTop: 6 }}>
              Informe quanto vale <b>1 USD</b> em <b>R$</b>. Ex: <code>5.12</code>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>CotaÃ§Ã£o (1 USD = R$)</label>
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
                Ãšltima atualizaÃ§Ã£o: {ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleString('pt-BR') : '-'}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="add-btn" onClick={salvar} disabled={isLoading || !cotacao}>
                  {isLoading ? 'Salvando...' : 'Salvar CotaÃ§Ã£o'}
                </button>
                <button className="add-btn" onClick={carregar} disabled={isLoading} style={{ background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)' }}>
                  Recarregar
                </button>
              </div>

              <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #eee', borderRadius: 10, padding: 12, color: '#374151' }}>
                <b>Como serÃ¡ usado:</b>
                <div style={{ marginTop: 6, fontSize: 13, color: '#4b5563' }}>
                  Vendedor Exterior vai ver os preÃ§os convertidos automaticamente em USD usando essa cotaÃ§Ã£o.
                  A proposta salva a cotaÃ§Ã£o utilizada para manter histÃ³rico correto.
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




