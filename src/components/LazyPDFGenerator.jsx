/**
 * Wrapper Lazy para PDFGenerator
 * Carrega o componente pesado apenas quando necessário
 */

import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

// ⚡ Lazy load do gerador de PDF - só carrega quando usado
const PDFGenerator = lazy(() => import('./PDFGenerator'));

const LazyPDFGenerator = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
          <span className="ml-3 text-gray-600">Carregando gerador de PDF...</span>
        </div>
      }
    >
      <PDFGenerator {...props} />
    </Suspense>
  );
};

export default LazyPDFGenerator;
