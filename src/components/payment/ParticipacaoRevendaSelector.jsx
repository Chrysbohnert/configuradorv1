import React from 'react';

/**
 * Componente para seleção de participação de revenda
 */
const ParticipacaoRevendaSelector = ({ 
  participacaoRevenda, 
  onChange, 
  disabled = false 
}) => {
  return (
    <div className="form-group" style={{ marginTop: '15px' }}>
      <label 
        htmlFor="participacaoRevenda" 
        style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}
      >
        Há Participação de Revenda? <span style={{ color: '#dc3545' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {/* Botão Sim */}
        <label
          onClick={() => !disabled && onChange('sim')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px', 
            cursor: disabled ? 'not-allowed' : 'pointer', 
            padding: '10px 20px', 
            background: participacaoRevenda === 'sim' ? '#28a745' : '#ffffff', 
            color: participacaoRevenda === 'sim' ? '#ffffff' : '#495057', 
            borderRadius: '6px', 
            border: participacaoRevenda === 'sim' ? '2px solid #28a745' : '2px solid #ced4da', 
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: participacaoRevenda === 'sim' ? '600' : '500',
            flex: '1',
            boxShadow: participacaoRevenda === 'sim' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (participacaoRevenda !== 'sim' && !disabled) {
              e.currentTarget.style.borderColor = '#28a745';
              e.currentTarget.style.background = '#f1f9f3';
            }
          }}
          onMouseLeave={(e) => {
            if (participacaoRevenda !== 'sim' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input 
            type="radio" 
            name="participacaoRevenda" 
            checked={participacaoRevenda === 'sim'} 
            onChange={() => {}}
            disabled={disabled}
            style={{ 
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#28a745',
              width: '16px',
              height: '16px'
            }}
          />
          <span style={{ fontWeight: '600' }}>Sim</span>
        </label>

        {/* Botão Não */}
        <label
          onClick={() => !disabled && onChange('nao')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px', 
            cursor: disabled ? 'not-allowed' : 'pointer', 
            padding: '10px 20px', 
            background: participacaoRevenda === 'nao' ? '#dc3545' : '#ffffff', 
            color: participacaoRevenda === 'nao' ? '#ffffff' : '#495057', 
            borderRadius: '6px', 
            border: participacaoRevenda === 'nao' ? '2px solid #dc3545' : '2px solid #ced4da', 
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: participacaoRevenda === 'nao' ? '600' : '500',
            flex: '1',
            boxShadow: participacaoRevenda === 'nao' ? '0 2px 8px rgba(220, 53, 69, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (participacaoRevenda !== 'nao' && !disabled) {
              e.currentTarget.style.borderColor = '#dc3545';
              e.currentTarget.style.background = '#fef2f2';
            }
          }}
          onMouseLeave={(e) => {
            if (participacaoRevenda !== 'nao' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input 
            type="radio" 
            name="participacaoRevenda" 
            checked={participacaoRevenda === 'nao'} 
            onChange={() => {}}
            disabled={disabled}
            style={{ 
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#dc3545',
              width: '16px',
              height: '16px'
            }}
          />
          <span style={{ fontWeight: '600' }}>Não</span>
        </label>
      </div>
    </div>
  );
};

export default ParticipacaoRevendaSelector;
