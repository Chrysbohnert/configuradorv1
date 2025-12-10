import React, { useState, useEffect } from 'react';
import './SeletorRegiaoCliente.css';

/**
 * Componente para seleção da região do cliente
 * Usado no Step 1 do NovoPedido para definir qual tabela de preços usar
 */
export default function SeletorRegiaoCliente({
  regiaoSelecionada,
  onRegiaoChange,
  regioesDisponiveis = []
}) {
  const [regioes, setRegioes] = useState([]);

  // ✅ NOVO: Usar APENAS regioes_operacao (definidas pelo admin)
  useEffect(() => {
    console.log('📍 [SeletorRegiaoCliente] Inicializando regiões:', {
      regioesDisponiveis,
      regiaoSelecionada
    });

    if (regioesDisponiveis && regioesDisponiveis.length > 0) {
      // Usar APENAS as regiões de operação definidas pelo admin
      console.log('✅ [SeletorRegiaoCliente] Usando regiões de operação:', regioesDisponiveis);
      setRegioes(regioesDisponiveis);
    } else {
      // Se não tem regiões de operação, mostrar mensagem de erro
      console.warn('⚠️ [SeletorRegiaoCliente] Nenhuma região de operação definida para este vendedor');
      setRegioes([]);
    }
  }, [regioesDisponiveis, regiaoSelecionada]);

  return (
    <div className="seletor-regiao-cliente">
      <div className="seletor-card">
        <div className="seletor-header">
          <div className="seletor-icon">📍</div>
          <div className="seletor-title">
            <h3>Região do Cliente</h3>
            <p>Selecione a região onde o cliente está localizado</p>
          </div>
        </div>

        <div className="seletor-content">
          {regioes.length === 0 ? (
            <div style={{
              background: '#fee',
              border: '2px solid #f88',
              borderRadius: '8px',
              padding: '16px',
              color: '#c33',
              textAlign: 'center'
            }}>
              <strong>⚠️ Nenhuma região de operação configurada</strong>
              <p>Contate o administrador para configurar as regiões de atuação.</p>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="regiao-select">
                Qual região o cliente está?
                <span className="required">*</span>
              </label>
              <select
                id="regiao-select"
                value={regiaoSelecionada || ''}
                onChange={(e) => {
                  console.log('🔄 [SeletorRegiaoCliente] Região selecionada:', e.target.value);
                  onRegiaoChange(e.target.value);
                }}
                className={`regiao-select ${regiaoSelecionada ? 'selected' : ''}`}
              >
                <option value="">-- Selecione uma região --</option>
                {regioes.map((regiao) => (
                  <option key={regiao} value={regiao}>
                    {regiao}
                  </option>
                ))}
              </select>
            </div>
          )}

          {regiaoSelecionada && (
            <div className="regiao-info">
              <div className="info-badge">
                <span className="badge-icon">✅</span>
                <span className="badge-text">
                  Região selecionada: <strong>{regiaoSelecionada}</strong>
                </span>
              </div>
              <p className="info-hint">
                ℹ️ Todos os preços de guindastes serão baseados nesta região
              </p>
            </div>
          )}

          <div className="regiao-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Importante:</strong> A região selecionada define a tabela de preços para toda a proposta. 
              Você pode alterar depois se necessário.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
