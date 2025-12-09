import React, { useState, useEffect } from 'react';
import './SeletorRegiaoCliente.css';

/**
 * Componente para seleção da região do cliente
 * Usado no Step 1 do NovoPedido para definir qual tabela de preços usar
 */
export default function SeletorRegiaoCliente({
  regiaoSelecionada,
  onRegiaoChange,
  regioesDisponiveis = [],
  vendedorRegiao = ''
}) {
  const [regioes, setRegioes] = useState([]);

  // Definir regiões disponíveis (GRUPOS DE REGIÃO - igual aos preços dos guindastes)
  useEffect(() => {
    if (regioesDisponiveis && regioesDisponiveis.length > 0) {
      // Se vendedor tem múltiplas regiões, usar essas
      setRegioes(regioesDisponiveis);
    } else if (vendedorRegiao) {
      // Se vendedor tem apenas 1 região, usar essa
      setRegioes([vendedorRegiao]);
    } else {
      // Fallback: todos os grupos de região (igual à tabela de preços)
      setRegioes([
        'Norte-Nordeste',
        'Centro-Oeste',
        'Sul-Sudeste',
        'RS com Inscrição Estadual',
        'RS sem Inscrição Estadual'
      ]);
    }
  }, [regioesDisponiveis, vendedorRegiao]);

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
          <div className="form-group">
            <label htmlFor="regiao-select">
              Qual região o cliente está?
              <span className="required">*</span>
            </label>
            <select
              id="regiao-select"
              value={regiaoSelecionada || ''}
              onChange={(e) => onRegiaoChange(e.target.value)}
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
