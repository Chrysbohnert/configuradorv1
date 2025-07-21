import React, { useState } from 'react';
import { generateAndSendQuote, generateAndSendReport } from '../utils/pdfGenerator';
import '../styles/WhatsAppModal.css';

const WhatsAppModal = ({ isOpen, onClose, type, data }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      alert('Por favor, insira um número de telefone válido');
      return;
    }

    setIsLoading(true);
    setMessage('Gerando PDF...');

    try {
      let result;
      
      if (type === 'quote') {
        result = await generateAndSendQuote(data, phoneNumber);
      } else if (type === 'report') {
        result = await generateAndSendReport(data, phoneNumber);
      }

      if (result.success) {
        setMessage('PDF gerado e enviado com sucesso!');
        setTimeout(() => {
          onClose();
          setMessage('');
        }, 2000);
      } else {
        setMessage(`Erro: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Formatar número brasileiro
    if (value.length <= 11) {
      if (value.length === 0) {
        value = '';
      } else if (value.length <= 2) {
        value = `(${value}`;
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      } else if (value.length <= 10) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
      } else {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      }
    }
    
    setPhoneNumber(value);
  };

  if (!isOpen) return null;

  return (
    <div className="whatsapp-modal-overlay">
      <div className="whatsapp-modal">
        <div className="modal-header">
          <h2>Enviar via WhatsApp</h2>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="whatsapp-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
          </div>

          <p className="modal-description">
            {type === 'quote' 
              ? 'Envie o orçamento em PDF para o cliente via WhatsApp'
              : 'Envie o relatório em PDF via WhatsApp'
            }
          </p>

          <form onSubmit={handleSubmit} className="whatsapp-form">
            <div className="form-group">
              <label htmlFor="phone">Número do WhatsApp:</label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="phone-input"
                required
              />
              <small>Digite o número com DDD (apenas números)</small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="send-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    Enviar PDF
                  </>
                )}
              </button>
            </div>
          </form>

          {message && (
            <div className={`message ${message.includes('Erro') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="whatsapp-instructions">
            <h4>Como funciona:</h4>
            <ol>
              <li>O PDF será gerado automaticamente</li>
              <li>O WhatsApp Web será aberto em nova aba</li>
              <li>Selecione o contato desejado</li>
              <li>Anexe o arquivo PDF baixado</li>
              <li>Envie a mensagem</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal; 