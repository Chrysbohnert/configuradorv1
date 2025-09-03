import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils/formatters';
import { PDF_CONFIG } from '../config/constants';
import ClausulasContratuais from './ClausulasContratuais';

const PDFGenerator = ({ pedidoData, onGenerate }) => {
  
  // Função para carregar imagem como base64
  const loadImageAsBase64 = async (url) => {
    try {
      console.log('Tentando carregar imagem:', url);
      
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Blob carregado:', blob.size, 'bytes');
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('Imagem convertida para base64');
          resolve(reader.result);
        };
        reader.onerror = () => {
          console.error('Erro ao ler blob');
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return null;
    }
  };

  const generatePDF = async () => {
    try {
      // Criar elementos separados para cabeçalho e rodapé
      const headerElement = document.createElement('div');
      headerElement.style.position = 'absolute';
      headerElement.style.left = '-9999px';
      headerElement.style.width = '1000px';
      headerElement.style.backgroundColor = 'white';
      headerElement.innerHTML = `<img src="/cebecalho1.png" alt="Cabeçalho STARK" style="width: 100%; height: auto; display: block;">`;
      
      const footerElement = document.createElement('div');
      footerElement.style.position = 'absolute';
      footerElement.style.left = '-9999px';
      footerElement.style.width = '1000px';
      footerElement.style.backgroundColor = 'white';
      footerElement.innerHTML = `
        <img src="/rodapé.png" alt="Rodapé STARK" style="width: 100%; height: auto; display: block;">
        <div style="text-align: center; font-size: 10px; color: #6c757d; padding: 5px; background: white;">
          Proposta gerada automaticamente pelo sistema em ${new Date().toLocaleString('pt-BR')}
        </div>
      `;

      // Criar elemento para o conteúdo
      const contentElement = document.createElement('div');
      contentElement.style.position = 'absolute';
      contentElement.style.left = '-9999px';
      contentElement.style.width = '1000px';
      contentElement.style.backgroundColor = 'white';
      contentElement.style.padding = '10px';
      contentElement.style.fontFamily = 'Arial, sans-serif';
      contentElement.style.fontSize = '14px';
      contentElement.style.lineHeight = '1.5';
      
      contentElement.innerHTML = `
        <div style="border-bottom: 2px solid #374151; margin-bottom: 30px; padding-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #6c757d;">
            <div>
              <strong>Vendedor:</strong> ${pedidoData.vendedor || 'Não informado'}
            </div>
            <div>
              <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #495057; font-size: 22px; margin-bottom: 15px;">PROPOSTA COMERCIAL</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Proposta Nº:</strong> ${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
            </div>
          </div>
        </div>

        ${pedidoData.guindastes?.map(guindaste => {
          let guindasteInfo = `
            <div style="margin-bottom: 25px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
              <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px;">${guindaste.nome}</h3>
              <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                <div><strong>Modelo:</strong> ${guindaste.modelo}</div>
                <div><strong>Código:</strong> ${guindaste.codigo_produto}</div>
              </div>
          `;
          
          if (guindaste.descricao) {
            guindasteInfo += `
              <div style="margin-bottom: 15px;">
                <strong>Descrição:</strong> ${guindaste.descricao}
              </div>
            `;
          }
          
          if (guindaste.nao_incluido) {
            guindasteInfo += `
              <div style="margin-bottom: 15px; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <strong style="color: #92400e;">⚠️ Não está incluído:</strong> 
                <span style="color: #92400e;">${guindaste.nao_incluido}</span>
              </div>
            `;
          }
          
          guindasteInfo += `</div>`;
          return guindasteInfo;
        }).join('') || ''}

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 10px;">DADOS DO CLIENTE</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Nome:</strong> ${pedidoData.clienteData.nome || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Telefone:</strong> ${pedidoData.clienteData.telefone || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Email:</strong> ${pedidoData.clienteData.email || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Documento:</strong> ${pedidoData.clienteData.documento || 'Não informado'}
            </div>
            <div style="font-size: 14px;">
              <strong>Endereço:</strong> ${pedidoData.clienteData.endereco || 'Não informado'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 10px;">DADOS DO VEÍCULO</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Tipo:</strong> ${pedidoData.caminhaoData.tipo || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Marca:</strong> ${pedidoData.caminhaoData.marca || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Modelo:</strong> ${pedidoData.caminhaoData.modelo || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Voltagem:</strong> ${pedidoData.caminhaoData.voltagem || 'Não informado'}
            </div>
            ${pedidoData.caminhaoData.observacoes ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6; font-size: 14px;">
              <strong>Observações:</strong> ${pedidoData.caminhaoData.observacoes}
            </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 15px;">ITENS DA PROPOSTA</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #374151; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-size: 14px;">Item</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-size: 14px;">Tipo</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6; font-size: 14px;">Preço</th>
              </tr>
            </thead>
            <tbody>
              ${pedidoData.carrinho.map((item) => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-size: 14px;">${item.nome}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-transform: capitalize; font-size: 14px;">${item.tipo}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; font-size: 14px;">${formatCurrency(item.preco)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; font-size: 20px; font-weight: bold; color: #374151; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <strong>TOTAL: ${formatCurrency(pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}</strong>
          </div>
        </div>

        ${(() => {
          // Verificar se há guindastes com gráfico de carga
          const guindastesComGrafico = pedidoData.carrinho.filter(item => 
            item.tipo === 'guindaste' && item.grafico_carga_url
          );
          
          if (guindastesComGrafico.length > 0) {
            return `
              <div style="margin-bottom: 30px;">
                <h3 style="color: #495057; font-size: 18px; margin-bottom: 15px;">GRÁFICOS DE CARGA</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                  <p style="font-size: 14px; color: #6c757d; margin-bottom: 15px;">
                    Os gráficos de carga detalhados estão disponíveis na próxima página deste documento.
                  </p>
                  <div style="text-align: center; padding: 20px; background: #e3f2fd; border-radius: 4px; border: 1px solid #bbdefb;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2;">
                      📄 <strong>Ver próxima página para gráficos técnicos</strong>
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #1976d2;">
                      Capacidade de elevação em diferentes posições da lança
                    </p>
                  </div>
                </div>
              </div>
            `;
          }
          return '';
        })()}

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 10px;">CONDIÇÕES COMERCIAIS</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Forma de Pagamento:</strong> A combinar
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Prazo de Entrega:</strong> Conforme disponibilidade
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Validade da Proposta:</strong> 30 dias
            </div>
            <div style="font-size: 14px;">
              <strong>Observações:</strong> ${pedidoData.clienteData.observacoes || 'Nenhuma observação adicional.'}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(headerElement);
      document.body.appendChild(footerElement);
      document.body.appendChild(contentElement);

      // Gerar imagens separadas
      const headerCanvas = await html2canvas(headerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const footerCanvas = await html2canvas(footerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const contentCanvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(headerElement);
      document.body.removeChild(footerElement);
      document.body.removeChild(contentElement);

      // Criar PDF com controle de páginas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const contentWidth = pageWidth - (2 * margin);
      
      // Calcular dimensões
      const headerHeight = (headerCanvas.height * contentWidth) / headerCanvas.width;
      const footerHeight = (footerCanvas.height * contentWidth) / footerCanvas.width;
      const contentHeight = (contentCanvas.height * contentWidth) / contentCanvas.width;
      
      // Área disponível para conteúdo por página (mais conservador)
      const availableContentHeight = pageHeight - headerHeight - footerHeight - (2 * margin) - 20;
      
      // Debug: verificar dimensões
      console.log('Debug PDF:', {
        contentHeight,
        availableContentHeight,
        pageHeight,
        headerHeight,
        footerHeight,
        margin,
        fitsInOnePage: contentHeight <= availableContentHeight,
        // Adicionar informações sobre gráficos de carga
        graficosCarga: pedidoData.carrinho.filter(item => 
          item.tipo === 'guindaste' && item.grafico_carga_url
        ).length
      });
      
      // Para orçamentos simples, sempre usar uma página
      // Só usar múltiplas páginas se o conteúdo for realmente muito grande
      if (contentHeight <= availableContentHeight * 1.5) {
        // Conteúdo cabe em uma página - usar a página atual (não criar nova)
        
        // Adicionar cabeçalho
        const headerImgData = headerCanvas.toDataURL('image/png');
        pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
        
        // Adicionar conteúdo completo
        const contentImgData = contentCanvas.toDataURL('image/png');
        const contentStartY = margin + headerHeight + 5;
        pdf.addImage(contentImgData, 'PNG', margin, contentStartY, contentWidth, contentHeight);
        
        // Adicionar rodapé
        const footerImgData = footerCanvas.toDataURL('image/png');
        pdf.addImage(footerImgData, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);
        
      } else {
        // Conteúdo realmente muito grande - usar múltiplas páginas
        const totalPages = Math.ceil(contentHeight / availableContentHeight);
        
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
          if (pageNum > 0) {
            pdf.addPage();
          }
          
          // Adicionar cabeçalho em todas as páginas
          const headerImgData = headerCanvas.toDataURL('image/png');
          pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
          
          // Calcular posição e altura do conteúdo para esta página
          const contentStartY = margin + headerHeight + 5;
          const contentForThisPage = Math.min(availableContentHeight, contentHeight - (pageNum * availableContentHeight));
          
          // Adicionar parte do conteúdo
          const contentImgData = contentCanvas.toDataURL('image/png');
          pdf.addImage(contentImgData, 'PNG', margin, contentStartY, contentWidth, contentForThisPage);
          
          // Adicionar rodapé em todas as páginas
          const footerImgData = footerCanvas.toDataURL('image/png');
          pdf.addImage(footerImgData, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);
        }
      }

      // Adicionar gráficos de carga se houver
      const guindastesComGrafico = pedidoData.carrinho.filter(item => 
        item.tipo === 'guindaste' && item.grafico_carga_url
      );

      if (guindastesComGrafico.length > 0) {
        console.log('Adicionando página de gráficos de carga...');
        
        // Adicionar nova página para gráficos de carga
        pdf.addPage();
        
        // Título da página
        pdf.setFontSize(18);
        pdf.setTextColor(73, 80, 87);
        pdf.text('GRÁFICOS DE CARGA', 105, 30, { align: 'center' });
        
        // Descrição
        pdf.setFontSize(12);
        pdf.setTextColor(108, 117, 125);
        pdf.text('Capacidade de elevação em diferentes posições da lança', 105, 40, { align: 'center' });
        
        let yPosition = 60;
        
        for (let i = 0; i < guindastesComGrafico.length; i++) {
          const guindaste = guindastesComGrafico[i];
          console.log(`Processando gráfico para: ${guindaste.nome}`);
          
          // Título do guindaste
          pdf.setFontSize(14);
          pdf.setTextColor(73, 80, 87);
          pdf.text(`${guindaste.nome} - Gráfico de Carga`, 20, yPosition);
          
          // Tentar carregar e adicionar a imagem
          try {
            console.log(`Carregando imagem: ${guindaste.grafico_carga_url}`);
            const base64Image = await loadImageAsBase64(guindaste.grafico_carga_url);
            
            if (base64Image) {
              console.log('Imagem carregada com sucesso, adicionando ao PDF...');
              
              // Adicionar imagem (máximo 150mm de largura)
              const imgWidth = 150;
              const imgHeight = 80; // Altura fixa para manter proporção
              
              pdf.addImage(base64Image, 'JPEG', 20, yPosition + 10, imgWidth, imgHeight);
              console.log('Imagem adicionada ao PDF');
              yPosition += imgHeight + 30;
            } else {
              console.log('Falha ao carregar imagem, adicionando texto informativo');
              // Se não conseguir carregar, adicionar texto informativo
              pdf.setFontSize(10);
              pdf.setTextColor(108, 117, 125);
              pdf.text('Gráfico de carga disponível mas não foi possível carregar a imagem', 20, yPosition + 15);
              yPosition += 40;
            }
          } catch (error) {
            console.error('Erro ao carregar gráfico de carga:', error);
            pdf.setFontSize(10);
            pdf.setTextColor(108, 117, 125);
            pdf.text('Erro ao carregar gráfico de carga', 20, yPosition + 15);
            yPosition += 40;
          }
          
          // Verificar se precisa de nova página
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
        }
        
        console.log('Página de gráficos de carga concluída');
      }

      // Adicionar página com cláusulas contratuais
      pdf.addPage();
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('Arial');
      
      // Título das cláusulas
      pdf.setFontSize(12);
      pdf.setTextColor(73, 80, 87);
      pdf.text('CLÁUSULAS CONTRATUAIS', 20, 30);
      
      // Conteúdo das cláusulas
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      
      const clausulas = [
        '1. O prazo de entrega será de 30 (trinta) dias úteis, contados a partir da confirmação do pedido e aprovação do projeto técnico.',
        '2. O pagamento será realizado em 3 (três) parcelas: 40% na assinatura do contrato, 30% na liberação para fabricação e 30% na entrega.',
        '3. A garantia será de 12 (doze) meses para defeitos de fabricação, a partir da data de entrega.',
        '4. O cliente deverá fornecer todas as informações técnicas necessárias para a fabricação no prazo de 5 (cinco) dias úteis.',
        '5. Alterações no projeto após a aprovação técnica poderão gerar custos adicionais e alteração no prazo de entrega.',
        '6. O equipamento será entregue na fábrica, sendo de responsabilidade do cliente o transporte e instalação.',
        '7. A empresa não se responsabiliza por danos causados por uso inadequado ou manutenção incorreta.',
        '8. Em caso de cancelamento, será cobrada multa de 20% sobre o valor total do contrato.',
        '9. O equipamento será fabricado conforme especificações técnicas aprovadas pelo cliente.',
        '10. A empresa se reserva o direito de alterar preços em caso de variação significativa nos custos de matéria-prima.',
        '11. O cliente deverá realizar a vistoria técnica no prazo de 3 (três) dias úteis após a notificação de conclusão.',
        '12. A empresa fornecerá treinamento técnico para operação e manutenção do equipamento.',
        '13. Em caso de força maior, os prazos poderão ser prorrogados sem ônus para as partes.',
        '14. O contrato será regido pelas leis brasileiras e qualquer litígio será resolvido no foro da comarca da sede da empresa.',
        '15. O cliente deverá manter o equipamento em condições adequadas de uso e conservação.',
        '16. A empresa se compromete a manter sigilo sobre informações técnicas e comerciais do cliente.'
      ];
      
      let yPos = 50;
      clausulas.forEach((clausula, index) => {
        // Verificar se precisa de nova página
        if (yPos > 250) {
          pdf.addPage();
          yPos = 30;
        }
        
        // Adicionar cláusula
        const lines = pdf.splitTextToSize(clausula, 170);
        pdf.text(lines, 20, yPos);
        yPos += (lines.length * 5) + 10;
      });

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