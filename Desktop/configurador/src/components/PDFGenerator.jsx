import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils/formatters';

const PDFGenerator = ({ pedidoData, onGenerate }) => {
  const generatePDF = async () => {
    try {
      // Criar elemento temporário para o PDF
      const pdfElement = document.createElement('div');
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.top = '0';
      pdfElement.style.width = '800px';
      pdfElement.style.backgroundColor = 'white';
      pdfElement.style.padding = '40px';
      pdfElement.style.fontFamily = 'Arial, sans-serif';
      pdfElement.style.fontSize = '12px';
      pdfElement.style.lineHeight = '1.4';
      
      // Conteúdo do PDF baseado no modelo
      pdfElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 24px; font-weight: bold; color: #374151; margin-bottom: 10px;">
            STARK ORÇAMENTO
          </div>
          <div style="font-size: 14px; color: #6c757d;">
            Sistema Profissional de Orçamentos
          </div>
          <div style="font-size: 12px; color: #6c757d; margin-top: 5px;">
            Telefone: (55) 98172-1286 | Email: chrystianbohnert10@gmail.com
          </div>
        </div>

        <div style="border-bottom: 2px solid #374151; margin-bottom: 30px;"></div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #495057; font-size: 18px; margin-bottom: 15px;">PROPOSTA COMERCIAL</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Proposta Nº:</strong> ${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 16px; margin-bottom: 10px;">DADOS DO CLIENTE</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px;">
              <strong>Nome:</strong> ${pedidoData.clienteData.nome || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Telefone:</strong> ${pedidoData.clienteData.telefone || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Email:</strong> ${pedidoData.clienteData.email || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Documento:</strong> ${pedidoData.clienteData.documento || 'Não informado'}
            </div>
            <div>
              <strong>Endereço:</strong> ${pedidoData.clienteData.endereco || 'Não informado'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 16px; margin-bottom: 10px;">DADOS DO VEÍCULO</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px;">
              <strong>Placa:</strong> ${pedidoData.caminhaoData.placa || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Modelo:</strong> ${pedidoData.caminhaoData.modelo || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Ano:</strong> ${pedidoData.caminhaoData.ano || 'Não informado'}
            </div>
            <div>
              <strong>Cor:</strong> ${pedidoData.caminhaoData.cor || 'Não informado'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 16px; margin-bottom: 15px;">ITENS DA PROPOSTA</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #374151; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Tipo</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Preço</th>
              </tr>
            </thead>
            <tbody>
              ${pedidoData.carrinho.map((item, index) => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${item.nome}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-transform: capitalize;">${item.tipo}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">${formatCurrency(item.preco)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; font-size: 18px; font-weight: bold; color: #374151; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <strong>TOTAL: ${formatCurrency(pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}</strong>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 16px; margin-bottom: 10px;">CONDIÇÕES COMERCIAIS</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px;">
              <strong>Forma de Pagamento:</strong> A combinar
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Prazo de Entrega:</strong> Conforme disponibilidade
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Validade da Proposta:</strong> 30 dias
            </div>
            <div>
              <strong>Observações:</strong> ${pedidoData.clienteData.observacoes || 'Nenhuma observação adicional.'}
            </div>
          </div>
        </div>

        <div style="border-top: 2px solid #374151; margin-top: 40px; padding-top: 20px;">
          <div style="text-align: center; color: #6c757d; font-size: 12px;">
            <div style="margin-bottom: 5px;">
              <strong>STARK ORÇAMENTO</strong> - Sistema Profissional de Orçamentos
            </div>
            <div style="margin-bottom: 5px;">
              Telefone: (55) 98172-1286 | Email: chrystianbohnert10@gmail.com
            </div>
            <div>
              Proposta gerada automaticamente pelo sistema em ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(pdfElement);

      // Gerar PDF
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(pdfElement);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `proposta_stark_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      if (onGenerate) {
        onGenerate(fileName);
      }

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <button 
      onClick={generatePDF}
      className="pdf-generator-btn"
      style={{
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      Gerar PDF
    </button>
  );
};

export default PDFGenerator; 