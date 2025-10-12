import React, { memo, useState, useCallback } from 'react';
import { generateAndSendQuote, generateAndSendReport } from '../utils/pdfGenerator';
import '../styles/WhatsAppModal.css';

/**
 * WhatsAppModal memoizado para evitar re-renders desnecessários
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar o modal
 * @param {string} props.type - Tipo do modal (quote/report)
 * @param {Object} props.data - Dados para gerar o PDF
 */
const MemoizedWhatsAppModal = memo(({ isOpen, onClose, type, data }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Memoizar callbacks para evitar re-renders desnecessários
  const handlePhoneChange = useCallback((e) => {
    setPhoneNumber(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      alert('Por favor, insira um número de telefone válido');
      return;
    }

    setIsLoading(true);
    setMessage('Gerando PDF...');

    try {
      if (type === 'quote') {
        await generateAndSendQuote(data, phoneNumber);
        setMessage('Orçamento enviado com sucesso!');
      } else if (type === 'report') {
        await generateAndSendReport(data, phoneNumber);
        setMessage('Relatório enviado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      setMessage('Erro ao enviar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, type, data]);

  const handleClose = useCallback(() => {
    setPhoneNumber('');
    setMessage('');
    setIsLoading(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Enviar via WhatsApp</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="phone">Número do WhatsApp:</label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
              required
            />
          </div>

          {message && (
            <div className={`message ${message.includes('sucesso') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={handleClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isLoading || !phoneNumber.trim()}
              className="btn-primary"
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Definir displayName para debugging
MemoizedWhatsAppModal.displayName = 'MemoizedWhatsAppModal';

export default MemoizedWhatsAppModal;
