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
  onAtualizarProposta,
  equipamentoDescricao,
  valorBase,
  descontoAtual = 7,
  isLoading = false
}) {
  const [justificativa, setJustificativa] = useState('');

  const handleSolicitar = () => {
    onSolicitar(justificativa);
  };

  const handleClose = () => {
    if (!isLoading) {
      setJustificativa('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content solicitar-desconto-modal" onClick={(e) => e.stopPropagation()}>
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
            <p><strong>Desconto Atual:</strong> {descontoAtual}%</p>
          </div>

          {/* Explicação */}
          <div className="explicacao-box">
            <p>
              Você está solicitando um desconto acima de {descontoAtual}% para esta proposta.
            </p>
            <p>
              O gestor será notificado e decidirá o percentual que pode ser aplicado.
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
              rows="4"
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
                onClick={onAtualizarProposta}
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
            disabled={isLoading}
          >
            {isLoading ? 'Aguardando...' : 'Solicitar ao Gestor'}
          </button>
        </div>
      </div>
    </div>
  );
}
