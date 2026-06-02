import React, { useState } from 'react';
import './SolicitarDescontoModal.css';

/**
 * Modal para vendedor/admin_concessionária solicitar desconto adicional ao gestor
 * Campo principal: VALOR FINAL DESEJADO (R$)
 * Percentual é calculado automaticamente como informação secundária
 */
export default function SolicitarDescontoModal({
  isOpen,
  onClose,
  onSolicitar,
  onVerificarStatus,
  equipamentoDescricao,
  valorBase,               // mantido para fallback de compatibilidade
  valorTotalAtual,         // valor total atual da proposta (inclui frete, instalação, etc.)
  descontoAtual = 7,
  isLoading = false
}) {
  const [justificativa, setJustificativa] = useState('');
  const [valorFinalDesejado, setValorFinalDesejado] = useState('');

  // Usar valorTotalAtual quando disponível, senão valorBase (compatibilidade)
  const totalReferencia = Number(valorTotalAtual || valorBase) || 0;

  const valorFinalNum = parseFloat(valorFinalDesejado) || 0;

  // Calcular percentual equivalente a partir do valor final desejado (sobre o total da proposta)
  const percentualCalculado = totalReferencia > 0 && valorFinalNum > 0 && valorFinalNum < totalReferencia
    ? Math.round(((totalReferencia - valorFinalNum) / totalReferencia) * 10000) / 100
    : 0;

  const descontoEmReais = totalReferencia - valorFinalNum;

  const handleSolicitar = () => {
    if (!valorFinalDesejado || valorFinalNum <= 0 || valorFinalNum >= totalReferencia) {
      alert('⚠️ Informe um valor final válido (menor que o valor total atual da proposta)');
      return;
    }
    onSolicitar(justificativa, percentualCalculado, valorFinalNum);
  };

  const handleClose = () => {
    if (!isLoading) {
      setJustificativa('');
      setValorFinalDesejado('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container solicitar-desconto-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Solicitar Desconto Adicional</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Informação da proposta */}
          <div className="info-box">
            <p><strong>Equipamento:</strong> {equipamentoDescricao}</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Valor total atual da proposta: R$ {totalReferencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            {descontoAtual > 0 && (
              <p style={{ fontSize: '13px', color: '#475569' }}>
                Desconto atual aplicado: {descontoAtual}%
              </p>
            )}
          </div>

          {/* Campo principal: Valor final desejado */}
          <div className="form-group">
            <label htmlFor="valorFinalDesejado" style={{ fontWeight: 700, color: '#0f172a' }}>
              Valor final desejado (R$) *
            </label>
            <input
              id="valorFinalDesejado"
              type="number"
              className="form-control"
              placeholder={`Ex: ${Math.round(totalReferencia * 0.97)}`}
              min="0"
              max={totalReferencia}
              step="100"
              value={valorFinalDesejado}
              onChange={(e) => setValorFinalDesejado(e.target.value)}
              disabled={isLoading}
              style={{ fontSize: '16px', fontWeight: 600 }}
            />
            <small className="form-help">
              💡 Informe o valor final da proposta que deseja negociar
            </small>

            {/* Percentual calculado (informação secundária) */}
            {percentualCalculado > 0 && (
              <div style={{
                marginTop: '10px',
                padding: '10px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#475569'
              }}>
                Percentual equivalente: <strong style={{ color: '#0369a1' }}>{percentualCalculado}%</strong>
                {'  •  '}
                Desconto em valor: <strong style={{ color: '#0369a1' }}>R$ {descontoEmReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            )}
          </div>

          {/* Simulação de valor */}
          {valorFinalNum > 0 && valorFinalNum < totalReferencia && (
            <div className="simulacao-box" style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <p style={{ fontWeight: 700, marginBottom: '8px', color: '#0c4a6e', fontSize: '14px' }}>
                📊 Resumo da solicitação:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                <p>Valor total atual: <strong>R$ {totalReferencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p>Valor final desejado: <strong style={{ color: '#16a34a' }}>R$ {valorFinalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p style={{ fontSize: '13px', color: '#475569' }}>
                  Diferença: <strong style={{ color: '#dc2626' }}>- R$ {descontoEmReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  {'  ('}{percentualCalculado}% de desconto)
                </p>
              </div>
            </div>
          )}

          {/* Explicação */}
          <div className="explicacao-box">
            <p>
              O gestor será notificado e poderá aprovar o valor solicitado ou ajustar para outro valor final.
            </p>
          </div>

          {/* Campo de justificativa */}
          <div className="form-group">
            <label htmlFor="justificativa">
              Justificativa <span className="opcional">(opcional)</span>
            </label>
            <textarea
              id="justificativa"
              className="form-control"
              rows="3"
              placeholder="Ex: Cliente recorrente, concorrência, volume de compra, etc."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              disabled={isLoading}
              maxLength={500}
            />
            <small className="form-help">
              {justificativa.length}/500 caracteres
            </small>
          </div>

          {/* Status de aguardando */}
          {isLoading && (
            <div className="aguardando-box">
              <div className="spinner"></div>
              <p>⏳ Aguardando aprovação do gestor...</p>
              <small>Aguarde, você será notificado assim que o gestor responder.</small>
              <button
                className="btn-verificar"
                onClick={onVerificarStatus}
                type="button"
              >
                🔄 Atualizar proposta
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSolicitar}
            disabled={isLoading || !valorFinalDesejado || valorFinalNum <= 0 || valorFinalNum >= totalReferencia}
          >
            {isLoading ? 'Aguardando...' : `Solicitar ao Gestor`}
          </button>
        </div>
      </div>
    </div>
  );
}
