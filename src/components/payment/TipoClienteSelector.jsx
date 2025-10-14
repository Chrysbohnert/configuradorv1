import React from 'react';

/**
 * Componente para seleção de tipo de cliente (Revenda ou Cliente)
 */
const TipoClienteSelector = ({ tipoCliente, onChange, disabled = false }) => {
  return (
    <div className="form-group">
      <label style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
        Tipo de Pagamento <span style={{ color: '#dc3545' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {/* Botão Revenda */}
        <label
          onClick={() => !disabled && onChange('revenda')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 20px',
            background: tipoCliente === 'revenda' ? '#667eea' : '#ffffff',
            color: tipoCliente === 'revenda' ? '#ffffff' : '#495057',
            borderRadius: '6px',
            border: tipoCliente === 'revenda' ? '2px solid #667eea' : '2px solid #ced4da',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: tipoCliente === 'revenda' ? '600' : '500',
            flex: '1',
            boxShadow: tipoCliente === 'revenda' ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (tipoCliente !== 'revenda' && !disabled) {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.background = '#f8f9ff';
            }
          }}
          onMouseLeave={(e) => {
            if (tipoCliente !== 'revenda' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input
            type="radio"
            name="tipoCliente"
            checked={tipoCliente === 'revenda'}
            onChange={() => {}}
            disabled={disabled}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#667eea',
              width: '16px',
              height: '16px'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>Revenda</span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Venda para revenda</span>
          </div>
        </label>

        {/* Botão Cliente */}
        <label
          onClick={() => !disabled && onChange('cliente')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 20px',
            background: tipoCliente === 'cliente' ? '#28a745' : '#ffffff',
            color: tipoCliente === 'cliente' ? '#ffffff' : '#495057',
            borderRadius: '6px',
            border: tipoCliente === 'cliente' ? '2px solid #28a745' : '2px solid #ced4da',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: tipoCliente === 'cliente' ? '600' : '500',
            flex: '1',
            boxShadow: tipoCliente === 'cliente' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (tipoCliente !== 'cliente' && !disabled) {
              e.currentTarget.style.borderColor = '#28a745';
              e.currentTarget.style.background = '#f1f9f3';
            }
          }}
          onMouseLeave={(e) => {
            if (tipoCliente !== 'cliente' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input
            type="radio"
            name="tipoCliente"
            checked={tipoCliente === 'cliente'}
            onChange={() => {}}
            disabled={disabled}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#28a745',
              width: '16px',
              height: '16px'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>Cliente</span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Venda direta</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default TipoClienteSelector;
