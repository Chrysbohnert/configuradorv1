import React, { useState } from 'react';
import './SolicitarDescontoModal.css';

/**
 * Modal para vendedor/admin_concessionária solicitar desconto adicional ao gestor
 * Aparece quando vendedor clica no botão [+] após o desconto de 7%
 * Ou quando admin_concessionária solicita desconto no pedido de compra
 */
export default function SolicitarDescontoModal({ 
  isOpen, 
  onClose, 
  onSolicitar,
  onVerificarStatus,
  equipamentoDescricao,
  valorBase,
  descontoAtual = 7,
  isLoading = false,
  permitirValorFinal = false
}) {
  const [justificativa, setJustificativa] = useState('');
  const [descontoDesejado, setDescontoDesejado] = useState('');
  const [modoInput, setModoInput] = useState('percentual'); // 'percentual' | 'valorFinal'
  const [valorFinalDesejado, setValorFinalDesejado] = useState('');

  const valorComDescontoAtual = valorBase ? valorBase - (valorBase * descontoAtual / 100) : 0;
  
  // Calcular desconto equivalente a partir do valor final desejado
  const valorFinalNum = parseFloat(valorFinalDesejado) || 0;
  const percentualCalculadoDoValorFinal = valorBase && valorFinalNum > 0 && valorFinalNum < valorBase
    ? Math.round(((valorBase - valorFinalNum) / valorBase) * 10000) / 100
    : 0;

  // Se modo percentual, usa o valor digitado; se modo valorFinal, usa o percentual calculado
  const descontoDesejadoNum = modoInput === 'percentual' 
    ? (parseFloat(descontoDesejado) || 0)
    : percentualCalculadoDoValorFinal;
  const valorComDescontoDesejado = valorBase && descontoDesejadoNum > 0 
    ? valorBase - (valorBase * descontoDesejadoNum / 100) 
    : 0;
  const diferencaValor = valorComDescontoAtual - valorComDescontoDesejado;

  const handleSolicitar = () => {
    if (modoInput === 'valorFinal') {
      if (!valorFinalDesejado || valorFinalNum <= 0 || valorFinalNum >= valorBase) {
        alert('⚠️ Informe um valor final válido (menor que o valor base)');
        return;
      }
    } else {
      if (!descontoDesejado || descontoDesejadoNum <= descontoAtual) {
        alert(`⚠️ Informe um desconto maior que ${descontoAtual}%`);
        return;
      }
    }
    const valorFinalParaEnviar = modoInput === 'valorFinal' ? valorFinalNum : null;
    onSolicitar(justificativa, descontoDesejadoNum, valorFinalParaEnviar);
  };

  const handleClose = () => {
    if (!isLoading) {
      setJustificativa('');
      setDescontoDesejado('');
      setValorFinalDesejado('');
      setModoInput('percentual');
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
            {descontoAtual > 0 && (
              <p><strong>Desconto Atual:</strong> {descontoAtual}% (= R$ {valorComDescontoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</p>
            )}
          </div>

          {/* Toggle percentual / valor final (apenas se permitirValorFinal) */}
          {permitirValorFinal && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setModoInput('percentual')}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: modoInput === 'percentual' ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: modoInput === 'percentual' ? '#eff6ff' : '#fff',
                  color: modoInput === 'percentual' ? '#1d4ed8' : '#374151',
                  fontWeight: modoInput === 'percentual' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                % Percentual
              </button>
              <button
                type="button"
                onClick={() => setModoInput('valorFinal')}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: modoInput === 'valorFinal' ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: modoInput === 'valorFinal' ? '#eff6ff' : '#fff',
                  color: modoInput === 'valorFinal' ? '#1d4ed8' : '#374151',
                  fontWeight: modoInput === 'valorFinal' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                R$ Valor Final
              </button>
            </div>
          )}

          {/* Campo de desconto desejado (modo percentual) */}
          {modoInput === 'percentual' && (
            <div className="form-group">
              <label htmlFor="descontoDesejado">
                Desconto desejado (%) *
              </label>
              <input
                id="descontoDesejado"
                type="number"
                className="form-control"
                placeholder={permitirValorFinal ? 'Ex: 5' : `Ex: ${descontoAtual + 3}`}
                min={descontoAtual + 0.1}
                step="0.1"
                value={descontoDesejado}
                onChange={(e) => setDescontoDesejado(e.target.value)}
                disabled={isLoading}
              />
              <small className="form-help">
                💡 Informe o percentual que deseja aplicar{descontoAtual > 0 ? ` (acima de ${descontoAtual}%)` : ''}
              </small>
            </div>
          )}

          {/* Campo de valor final desejado */}
          {modoInput === 'valorFinal' && (
            <div className="form-group">
              <label htmlFor="valorFinalDesejado">
                Valor final desejado (R$) *
              </label>
              <input
                id="valorFinalDesejado"
                type="number"
                className="form-control"
                placeholder={`Ex: ${Math.round(valorBase * 0.95)}`}
                min="0"
                max={valorBase}
                step="100"
                value={valorFinalDesejado}
                onChange={(e) => setValorFinalDesejado(e.target.value)}
                disabled={isLoading}
              />
              <small className="form-help">
                💡 Informe o valor que deseja pagar pelo equipamento
              </small>
              {percentualCalculadoDoValorFinal > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0c4a6e'
                }}>
                  Equivale a <strong>{percentualCalculadoDoValorFinal}%</strong> de desconto
                  (economia de R$ {(valorBase - valorFinalNum).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </div>
              )}
            </div>
          )}

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
                {descontoAtual > 0 && (
                  <p>Valor atual ({descontoAtual}%): <strong>R$ {valorComDescontoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                )}
                <p>Valor com {descontoDesejadoNum}%: <strong style={{ color: '#16a34a' }}>R$ {valorComDescontoDesejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Desconto em valor: -R$ {(valorBase * descontoDesejadoNum / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
            disabled={isLoading || (modoInput === 'percentual' ? (!descontoDesejado || descontoDesejadoNum <= descontoAtual) : (!valorFinalDesejado || valorFinalNum <= 0 || valorFinalNum >= valorBase))}
          >
            {isLoading ? 'Aguardando...' : `Solicitar ${descontoDesejadoNum > 0 ? descontoDesejadoNum + '%' : ''} ao Gestor`}
          </button>
        </div>
      </div>
    </div>
  );
}
