import React, { useState } from 'react';
import './SolicitarDescontoModal.css';

/**
 * Modal para vendedor solicitar desconto adicional ao gestor
 * Aparece quando vendedor clica no botão [+] após o desconto de 7%
 */
export default function SolicitarDescontoModal({ 
  isOpen, 
  onClose, 
  onSolicitar,
  onVerificarStatus,
  equipamentoDescricao,
  valorBase,
  descontoAtual = 7,
  isLoading = false
}) {
  const [justificativa, setJustificativa] = useState('');
  const [descontoDesejado, setDescontoDesejado] = useState('');

  const valorComDescontoAtual = valorBase ? valorBase - (valorBase * descontoAtual / 100) : 0;
  const descontoDesejadoNum = parseFloat(descontoDesejado) || 0;
  const valorComDescontoDesejado = valorBase && descontoDesejadoNum > 0 
    ? valorBase - (valorBase * descontoDesejadoNum / 100) 
    : 0;
  const diferencaValor = valorComDescontoAtual - valorComDescontoDesejado;

  const handleSolicitar = () => {
    if (!descontoDesejado || descontoDesejadoNum <= descontoAtual) {
      alert(`⚠️ Informe um desconto maior que ${descontoAtual}%`);
      return;
    }
    onSolicitar(justificativa, descontoDesejadoNum);
  };

  const handleClose = () => {
    if (!isLoading) {
      setJustificativa('');
      setDescontoDesejado('');
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
            <p><strong>Valor Base:</strong> R$ {valorBase?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p><strong>Desconto Atual:</strong> {descontoAtual}% (= R$ {valorComDescontoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</p>
          </div>

          {/* Campo de desconto desejado */}
          <div className="form-group">
            <label htmlFor="descontoDesejado">
              Desconto desejado (%) *
            </label>
            <input
              id="descontoDesejado"
              type="number"
              className="form-control"
              placeholder={`Ex: ${descontoAtual + 3}`}
              min={descontoAtual + 0.1}
              step="0.1"
              value={descontoDesejado}
              onChange={(e) => setDescontoDesejado(e.target.value)}
              disabled={isLoading}
            />
            <small className="form-help">
              💡 Informe o percentual que deseja aplicar (acima de {descontoAtual}%)
            </small>
          </div>

          {/* Simulação de valor */}
          {descontoDesejadoNum > 0 && descontoDesejadoNum > descontoAtual && (
            <div className="simulacao-box" style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <p style={{ fontWeight: 600, marginBottom: '8px', color: '#166534' }}>📊 Simulação do desconto:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                <p>Valor atual ({descontoAtual}%): <strong>R$ {valorComDescontoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p>Valor com {descontoDesejadoNum}%: <strong style={{ color: '#16a34a' }}>R$ {valorComDescontoDesejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Diferença: -R$ {diferencaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          {/* Explicação */}
          <div className="explicacao-box">
            <p>
              O gestor será notificado e poderá aprovar o desconto solicitado ou ajustar o percentual.
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
            disabled={isLoading || !descontoDesejado || descontoDesejadoNum <= descontoAtual}
          >
            {isLoading ? 'Aguardando...' : `Solicitar ${descontoDesejadoNum > 0 ? descontoDesejadoNum + '%' : ''} ao Gestor`}
          </button>
        </div>
      </div>
    </div>
  );
}
