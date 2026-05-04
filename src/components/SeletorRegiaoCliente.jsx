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
  title = 'Região do Cliente',
  subtitle = 'Selecione a região onde o cliente está localizado',
  questionLabel = 'Qual região o cliente está?'
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
    <div className="seletor-regiao-inline">
      <div className="seletor-inline-row">
        <span className="seletor-inline-label">📍 {questionLabel}<span className="required"> *</span></span>
        {regioes.length === 0 ? (
          <span className="seletor-inline-error">⚠️ Nenhuma região configurada — contate o administrador.</span>
        ) : (
          <select
            id="regiao-select"
            value={regiaoSelecionada || ''}
            onChange={(e) => {
              console.log('🔄 [SeletorRegiaoCliente] Região selecionada:', e.target.value);
              onRegiaoChange(e.target.value);
            }}
            className={`seletor-inline-select ${regiaoSelecionada ? 'selected' : ''}`}
          >
            <option value="">-- Selecione --</option>
            {regioes.map((regiao) => (
              <option key={regiao} value={regiao}>{regiao}</option>
            ))}
          </select>
        )}
        {regiaoSelecionada && (
          <span className="seletor-inline-badge">✔ {regiaoSelecionada}</span>
        )}
      </div>
    </div>
  );
}
