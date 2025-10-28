import React from 'react';

/**
 * Modal para escolher entre gerar Orçamento ou Proposta Final
 */
const ModalTipoProposta = ({ isOpen, onClose, onSelect, caminhaoPreenchido }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '12px',
          color: '#111'
        }}>
          Escolha o tipo de documento
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '28px',
          lineHeight: '1.6'
        }}>
          Selecione se deseja gerar um orçamento preliminar ou uma proposta comercial completa.
        </p>

        <div style={{
          display: 'grid',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Orçamento Preliminar */}
          <button
            onClick={() => onSelect('orcamento')}
            style={{
              padding: '20px',
              border: '2px solid #e5e5e5',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              ':hover': {
                borderColor: '#fbbf24',
                background: '#fffbeb'
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fbbf24';
              e.currentTarget.style.background = '#fffbeb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e5e5';
              e.currentTarget.style.background = 'white';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                fontSize: '32px',
                lineHeight: '1'
              }}>📋</div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: '#111'
                }}>
                  Orçamento Preliminar
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.5',
                  marginBottom: '8px'
                }}>
                  Gera um documento rápido com os dados básicos do equipamento e cliente.
                  Ideal para envio inicial ao cliente.
                </p>
                <ul style={{
                  fontSize: '12px',
                  color: '#888',
                  paddingLeft: '18px',
                  margin: 0
                }}>
                  <li>Não exige dados do caminhão</li>
                  <li>Não exige estudo veicular</li>
                  <li>Status: PENDENTE (pode ser finalizado depois)</li>
                </ul>
              </div>
            </div>
          </button>

          {/* Proposta Final */}
          <button
            onClick={() => onSelect('proposta')}
            disabled={!caminhaoPreenchido}
            style={{
              padding: '20px',
              border: '2px solid #e5e5e5',
              borderRadius: '8px',
              background: caminhaoPreenchido ? 'white' : '#f9f9f9',
              cursor: caminhaoPreenchido ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              transition: 'all 0.2s',
              opacity: caminhaoPreenchido ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (caminhaoPreenchido) {
                e.currentTarget.style.borderColor = '#28a745';
                e.currentTarget.style.background = '#f0fdf4';
              }
            }}
            onMouseLeave={(e) => {
              if (caminhaoPreenchido) {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                fontSize: '32px',
                lineHeight: '1'
              }}>✅</div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: '#111'
                }}>
                  Proposta Comercial Completa
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.5',
                  marginBottom: '8px'
                }}>
                  Gera o documento final com todas as informações técnicas e comerciais.
                  Pronto para assinatura do cliente.
                </p>
                <ul style={{
                  fontSize: '12px',
                  color: '#888',
                  paddingLeft: '18px',
                  margin: 0
                }}>
                  <li>Inclui dados completos do caminhão</li>
                  <li>Inclui estudo veicular com medidas</li>
                  <li>Status: FINALIZADO</li>
                </ul>
                {!caminhaoPreenchido && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#856404'
                  }}>
                    ⚠️ Preencha os dados do caminhão para gerar proposta completa
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            background: 'white',
            color: '#666',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9f9f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ModalTipoProposta;
