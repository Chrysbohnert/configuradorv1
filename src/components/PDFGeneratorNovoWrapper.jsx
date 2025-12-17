/**
 * Wrapper React para PDFGeneratorNovo
 * Implementa a interface esperada pelo LazyPDFGenerator
 * Renderiza um botão para gerar PDF com o novo design
 */

import React, { useState } from 'react';
import { generatePDFNovo } from './PDFGeneratorNovo';

const PDFGeneratorNovoWrapper = ({ pedidoData, onGenerate }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      console.log('🎨 Iniciando geração de PDF com novo design...');
      
      // Passar pedidoData completo para o novo PDF
      // Isso garante que todas as funções tenham acesso aos dados corretos
      await generatePDFNovo(pedidoData);
      
      const clienteNome = pedidoData.clienteData?.nome || pedidoData.cliente_nome || 'Cliente';
      const fileName = `Proposta Stark ${clienteNome} ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      console.log('✅ PDF gerado com sucesso:', fileName);
      
      onGenerate && onGenerate(fileName);
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      alert(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="pdf-generator-btn"
      style={{
        background: isGenerating
          ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
          : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: isGenerating ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isGenerating ? 0.7 : 1
      }}
    >
      {isGenerating ? (
        <>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Gerando PDF...
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          GERAR PROPOSTA (NOVO DESIGN)
        </>
      )}
    </button>
  );
};

export default PDFGeneratorNovoWrapper;
