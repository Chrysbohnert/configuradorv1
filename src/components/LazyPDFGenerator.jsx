/**
 * Wrapper Lazy para PDFGenerator
 * Carrega o componente pesado (60KB) apenas quando necessário
 * Suporta novo design (PDFGeneratorNovoWrapper) e design antigo (PDFGenerator)
 */

import React, { lazy, Suspense, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

// ⚡ Lazy load dos geradores de PDF - só carregam quando usados
const PDFGenerator = lazy(() => import('./PDFGenerator'));
const PDFGeneratorNovoWrapper = lazy(() => import('./PDFGeneratorNovoWrapper'));

const LazyPDFGenerator = (props) => {
  const [usarNovoDesign, setUsarNovoDesign] = useState(true);

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Suspense 
        fallback={
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600">Carregando gerador de PDF...</span>
          </div>
        }
      >
        {usarNovoDesign ? (
          <PDFGeneratorNovoWrapper {...props} />
        ) : (
          <PDFGenerator {...props} />
        )}
      </Suspense>

      <button
        onClick={() => setUsarNovoDesign(!usarNovoDesign)}
        style={{
          background: usarNovoDesign 
            ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
            : 'linear-gradient(135deg, #2196F3 0%, #0b7dda 100%)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          whiteSpace: 'nowrap'
        }}
        title={usarNovoDesign ? 'Clique para usar design antigo' : 'Clique para usar novo design'}
      >
        {usarNovoDesign ? '✨ Novo Design' : '📄 Design Antigo'}
      </button>
    </div>
  );
};

export default LazyPDFGenerator;
