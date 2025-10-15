import React from 'react';

/**
 * Componente para seleção de tipo de frete (CIF ou FOB)
 */
const TipoFreteSelector = ({ tipoFrete, onChange, disabled = false }) => {
  return (
    <div className="form-group" style={{ marginTop: '15px' }}>
      <label style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
        Tipo de Frete <span style={{ color: '#dc3545' }}>*</span>
      </label>
      <small style={{ display: 'block', marginBottom: '10px', color: '#6c757d', fontSize: '0.875em' }}>
        Selecione quem será responsável pelo frete
      </small>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {/* Botão CIF */}
        <label
          onClick={() => !disabled && onChange('cif')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 20px',
            background: tipoFrete === 'cif' ? '#17a2b8' : '#ffffff',
            color: tipoFrete === 'cif' ? '#ffffff' : '#495057',
            borderRadius: '6px',
            border: tipoFrete === 'cif' ? '2px solid #17a2b8' : '2px solid #ced4da',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: tipoFrete === 'cif' ? '600' : '500',
            flex: '1',
            boxShadow: tipoFrete === 'cif' ? '0 2px 8px rgba(23, 162, 184, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (tipoFrete !== 'cif' && !disabled) {
              e.currentTarget.style.borderColor = '#17a2b8';
              e.currentTarget.style.background = '#e7f7f9';
            }
          }}
          onMouseLeave={(e) => {
            if (tipoFrete !== 'cif' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input
            type="radio"
            name="tipoFrete"
            checked={tipoFrete === 'cif'}
            onChange={() => {}}
            disabled={disabled}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#17a2b8',
              width: '16px',
              height: '16px'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>CIF</span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Fábrica entrega</span>
          </div>
        </label>

        {/* Botão FOB */}
        <label
          onClick={() => !disabled && onChange('fob')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 20px',
            background: tipoFrete === 'fob' ? '#6c757d' : '#ffffff',
            color: tipoFrete === 'fob' ? '#ffffff' : '#495057',
            borderRadius: '6px',
            border: tipoFrete === 'fob' ? '2px solid #6c757d' : '2px solid #ced4da',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: tipoFrete === 'fob' ? '600' : '500',
            flex: '1',
            boxShadow: tipoFrete === 'fob' ? '0 2px 8px rgba(108, 117, 125, 0.3)' : 'none',
            userSelect: 'none',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (tipoFrete !== 'fob' && !disabled) {
              e.currentTarget.style.borderColor = '#6c757d';
              e.currentTarget.style.background = '#f8f9fa';
            }
          }}
          onMouseLeave={(e) => {
            if (tipoFrete !== 'fob' && !disabled) {
              e.currentTarget.style.borderColor = '#ced4da';
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          <input
            type="radio"
            name="tipoFrete"
            checked={tipoFrete === 'fob'}
            onChange={() => {}}
            disabled={disabled}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              accentColor: '#6c757d',
              width: '16px',
              height: '16px'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>FOB</span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Por conta do cliente</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default TipoFreteSelector;
