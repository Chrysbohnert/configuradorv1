import React, { useState } from 'react';
import { generatePropostaComercialPDF, gerarEBaixarProposta } from '../utils/pdfGeneratorProfessional';
import { formatCurrency } from '../utils/formatters';

/**
 * Componente para gerar PDF profissional da proposta comercial
 */
const PDFGeneratorProfessional = ({ 
  dadosCompletos,
  onSuccess,
  onError 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGerarPDF = async () => {
    setIsGenerating(true);
    
    try {
      // Preparar dados no formato esperado pelo gerador
      const dadosProposta = {
        numeroProposta: dadosCompletos.numeroPedido || `PROP-${Date.now()}`,
        data: new Date().toLocaleDateString('pt-BR'),
        
        vendedor: {
          nome: dadosCompletos.vendedor?.nome || 'Vendedor',
          email: dadosCompletos.vendedor?.email || '',
          telefone: dadosCompletos.vendedor?.telefone || '',
          regiao: dadosCompletos.vendedor?.regiao || ''
        },
        
        cliente: {
          nome: dadosCompletos.cliente?.nome || '',
          documento: dadosCompletos.cliente?.documento || '',
          inscricao_estadual: dadosCompletos.cliente?.inscricao_estadual || 'ISENTO',
          email: dadosCompletos.cliente?.email || '',
          telefone: dadosCompletos.cliente?.telefone || '',
          endereco: dadosCompletos.cliente?.endereco || '',
          cidade: dadosCompletos.cliente?.cidade || '',
          uf: dadosCompletos.cliente?.uf || '',
          cep: dadosCompletos.cliente?.cep || ''
        },
        
        caminhao: {
          tipo: dadosCompletos.caminhao?.tipo || '',
          marca: dadosCompletos.caminhao?.marca || '',
          modelo: dadosCompletos.caminhao?.modelo || '',
          ano: dadosCompletos.caminhao?.ano || '',
          voltagem: dadosCompletos.caminhao?.voltagem || '',
          placa: dadosCompletos.caminhao?.placa || '',
          observacoes: dadosCompletos.caminhao?.observacoes || ''
        },
        
        equipamento: {
          modelo: dadosCompletos.equipamento?.modelo || '',
          subgrupo: dadosCompletos.equipamento?.subgrupo || dadosCompletos.equipamento?.nome || '',
          codigo_referencia: dadosCompletos.equipamento?.codigo_referencia || dadosCompletos.equipamento?.codigo_produto || '',
          peso_kg: dadosCompletos.equipamento?.peso_kg || dadosCompletos.equipamento?.configuracao_lancas || '',
          configuracao: dadosCompletos.equipamento?.configuracao || '',
          tem_contr: dadosCompletos.equipamento?.tem_contr || 'Não',
          finame: dadosCompletos.equipamento?.finame || '',
          ncm: dadosCompletos.equipamento?.ncm || '',
          descricao: dadosCompletos.equipamento?.descricao || '',
          nao_incluido: dadosCompletos.equipamento?.nao_incluido || '',
          grafico_carga_url: dadosCompletos.equipamento?.grafico_carga_url || ''
        },
        
        pagamento: {
          tipoPagamento: dadosCompletos.pagamento?.tipoPagamento || '',
          valorBase: dadosCompletos.pagamento?.valorBase || 0,
          desconto: dadosCompletos.pagamento?.desconto || 0,
          valorDesconto: dadosCompletos.pagamento?.descontoAdicionalValor || 0,
          acrescimo: dadosCompletos.pagamento?.acrescimo || 0,
          valorFrete: dadosCompletos.pagamento?.valorFrete || 0,
          valorInstalacao: dadosCompletos.pagamento?.valorInstalacao || 0,
          valorFinal: dadosCompletos.pagamento?.valorFinal || 0,
          prazoPagamento: dadosCompletos.pagamento?.prazoPagamento || '',
          financiamentoBancario: dadosCompletos.pagamento?.financiamentoBancario || 'nao',
          entradaTotal: dadosCompletos.pagamento?.entradaTotal || 0,
          valorSinal: dadosCompletos.pagamento?.valorSinal || 0,
          faltaEntrada: dadosCompletos.pagamento?.faltaEntrada || 0,
          percentualEntrada: dadosCompletos.pagamento?.percentualEntrada || 0,
          saldoAPagar: dadosCompletos.pagamento?.saldoAPagar || 0,
          parcelas: dadosCompletos.pagamento?.parcelas || [],
          localInstalacao: dadosCompletos.pagamento?.localInstalacao || '',
          tipoInstalacao: dadosCompletos.pagamento?.tipoInstalacao || '',
          tipoFrete: dadosCompletos.pagamento?.tipoFrete || ''
        },
        
        observacoes: dadosCompletos.observacoes || ''
      };

      const result = await gerarEBaixarProposta(dadosProposta);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result.fileName);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (onError) {
        onError(error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        onClick={handleGerarPDF}
        disabled={isGenerating}
        style={{
          padding: '12px 24px',
          backgroundColor: isGenerating ? '#ccc' : '#2962ff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (!isGenerating) {
            e.target.style.backgroundColor = '#1e4db7';
          }
        }}
        onMouseLeave={(e) => {
          if (!isGenerating) {
            e.target.style.backgroundColor = '#2962ff';
          }
        }}
      >
        {isGenerating ? (
          <>
            <span>⏳</span>
            <span>Gerando PDF...</span>
          </>
        ) : (
          <>
            <span>📄</span>
            <span>Gerar Proposta Comercial (PDF)</span>
          </>
        )}
      </button>
      
      <p style={{ 
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#666',
        fontStyle: 'italic'
      }}>
        O PDF incluirá: dados do cliente, veículo, especificação completa do equipamento,
        gráfico de carga, condições de pagamento e cláusulas contratuais.
      </p>
    </div>
  );
};

export default PDFGeneratorProfessional;
