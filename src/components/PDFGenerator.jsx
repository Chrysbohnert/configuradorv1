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
              <strong>CPF/CNPJ:</strong> ${pedidoData.clienteData.documento || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Inscrição Estadual:</strong> ${pedidoData.clienteData.inscricao_estadual || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Endereço:</strong> ${pedidoData.clienteData.endereco || 'Não informado'}
            </div>
            ${pedidoData.clienteData.observacoes ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6; font-size: 14px;">
              <strong>Observações:</strong> ${pedidoData.clienteData.observacoes}
            </div>
            ` : ''}
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
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 10px;">POLÍTICA DE PAGAMENTO</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Tipo de Pagamento:</strong> ${
                pedidoData.pagamentoData?.tipoPagamento === 'revenda_gsi' ? 'Revenda - Guindastes GSI' :
                pedidoData.pagamentoData?.tipoPagamento === 'cnpj_cpf_gse' ? 'CNPJ/CPF - Guindastes GSE' :
                pedidoData.pagamentoData?.tipoPagamento === 'parcelamento_interno' ? 'Parcelamento Interno - Revenda' :
                pedidoData.pagamentoData?.tipoPagamento === 'parcelamento_cnpj' ? 'Parcelamento - CNPJ/CPF' :
                'Não informado'
              }
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Prazo de Pagamento:</strong> ${
                pedidoData.pagamentoData?.prazoPagamento === 'a_vista' ? 'À Vista' :
                pedidoData.pagamentoData?.prazoPagamento === '30_dias' ? 'Até 30 dias (+3%)' :
                pedidoData.pagamentoData?.prazoPagamento === '60_dias' ? 'Até 60 dias (+1%)' :
                pedidoData.pagamentoData?.prazoPagamento === '120_dias_interno' ? 'Até 120 dias (sem acréscimo)' :
                pedidoData.pagamentoData?.prazoPagamento === '90_dias_cnpj' ? 'Até 90 dias (sem acréscimo)' :
                pedidoData.pagamentoData?.prazoPagamento === 'mais_120_dias' ? 'Após 120 dias (+2% ao mês)' :
                pedidoData.pagamentoData?.prazoPagamento === 'mais_90_dias' ? 'Após 90 dias (+2% ao mês)' :
                'Não informado'
              }
            </div>
            ${pedidoData.pagamentoData?.desconto > 0 ? `
            <div style="margin-bottom: 8px; font-size: 14px; color: #28a745;">
              <strong>Desconto:</strong> ${pedidoData.pagamentoData.desconto}%
            </div>
            ` : ''}
            ${pedidoData.pagamentoData?.acrescimo > 0 ? `
            <div style="margin-bottom: 8px; font-size: 14px; color: #dc3545;">
              <strong>Acréscimo:</strong> ${pedidoData.pagamentoData.acrescimo}%
            </div>
            ` : ''}
            <div style="margin-bottom: 8px; font-size: 16px; font-weight: bold; color: #007bff;">
              <strong>Valor Final:</strong> ${formatCurrency(pedidoData.pagamentoData?.valorFinal || pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}
            </div>
            <div style="margin-bottom: 8px; font-size: 14px;">
              <strong>Local de Instalação:</strong> ${pedidoData.pagamentoData?.localInstalacao || 'Não informado'}
            </div>
            <div style="font-size: 14px;">
              <strong>Tipo de Instalação:</strong> ${
                pedidoData.pagamentoData?.tipoInstalacao === 'cliente' ? 'Por conta do cliente' :
                pedidoData.pagamentoData?.tipoInstalacao === 'fabrica' ? 'Por conta da fábrica' :
                'Não informado'
              }
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; font-size: 18px; margin-bottom: 10px;">CONDIÇÕES COMERCIAIS</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
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
        // Conteúdo muito grande - usar múltiplas páginas
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
          
          // Adicionar parte do conteúdo (cortar verticalmente)
          const contentImgData = contentCanvas.toDataURL('image/png');
          const sourceY = pageNum * availableContentHeight;
          const sourceHeight = Math.min(availableContentHeight, contentHeight - sourceY);
          
          // Criar um canvas temporário para cortar a imagem
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = contentCanvas.width;
          tempCanvas.height = sourceHeight;
          
          tempCtx.drawImage(
            contentCanvas,
            0, sourceY, contentCanvas.width, sourceHeight,
            0, 0, contentCanvas.width, sourceHeight
          );
          
          const croppedImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(croppedImgData, 'PNG', margin, contentStartY, contentWidth, contentForThisPage);
          
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
        
        // Adicionar cabeçalho
        const headerImgData = headerCanvas.toDataURL('image/png');
        pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
        
        // Título da página
        pdf.setFontSize(18);
        pdf.setTextColor(73, 80, 87);
        pdf.text('GRÁFICOS DE CARGA', 105, margin + headerHeight + 20, { align: 'center' });
        
        // Descrição
        pdf.setFontSize(12);
        pdf.setTextColor(108, 117, 125);
        pdf.text('Capacidade de elevação em diferentes posições da lança', 105, margin + headerHeight + 30, { align: 'center' });
        
        let yPosition = margin + headerHeight + 50;
        
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
          if (yPosition > pageHeight - footerHeight - margin - 50) {
            pdf.addPage();
            
            // Adicionar cabeçalho na nova página
            const headerImgData = headerCanvas.toDataURL('image/png');
            pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
            
            yPosition = margin + headerHeight + 20;
          }
        }
        
        // Adicionar rodapé na última página de gráficos
        const footerImgData = footerCanvas.toDataURL('image/png');
        pdf.addImage(footerImgData, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);
        
        console.log('Página de gráficos de carga concluída');
      }

      // Adicionar página com cláusulas contratuais
      pdf.addPage();
      
      // Adicionar cabeçalho
      const headerImgData = headerCanvas.toDataURL('image/png');
      pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
      
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('Arial');
      
      // Título das cláusulas
      pdf.setFontSize(12);
      pdf.setTextColor(73, 80, 87);
      pdf.text('CLÁUSULAS CONTRATUAIS', 20, margin + headerHeight + 20);
      
      // Conteúdo das cláusulas (usando as cláusulas reais do componente)
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      
      const clausulas = [
        '• O prazo de validade deste pedido será de 10 dias contados após a assinatura do mesmo para pagamento via recurso próprio e 30 dias para financiamento bancário.',
        '• Caso haja a necessidade de inclusão e ou modificação de modelo da caixa de patola auxiliar no equipamento (mediante estudo de integração veicular), o custo não será de responsabilidade da STARK Guindastes.',
        '• Caminhões com Caixa de Câmbio Automática exigem parametrização em concessionária para a habilitação e funcionamento da Tomada de Força. O custo deste serviço não está incluso nesta proposta.',
        '• O prazo de entrega do equipamento terá início a partir do recebimento da autorização de faturamento quando via banco, do pagamento de 100% da entrada quando via parcelado fábrica e 100% do valor do equipamento quando à vista.',
        '• Vendas com parcelamento fábrica, é obrigatório o envio da documentação solicitada para análise de crédito em até 5 (cinco) dias úteis.',
        '• O embarque do equipamento está condicionado ao pagamento de 100% do valor acordado e contrato de reserva de domínio assinado e com firma reconhecida para os casos de financiamento fábrica.',
        '• As condições deste pedido são válidas somente para os produtos e quantidades constantes no mesmo.',
        '• O atendimento deste pedido está sujeito a análise cadastral e de crédito, quando a condição de pagamento for a prazo.',
        '• É obrigatório informar placa, chassi e modelo de caminhão onde será instalado o guindaste para confecção do Contrato de Reserva de Domínio, mediante cópia do documento ou NF do caminhão. Desde já fica autorizada a inclusão desta no documento do veículo.',
        '• Se houver diferença de alíquota de ICMS, a mesma será de responsabilidade do comprador, conforme legislação vigente em seu estado de origem.',
        '• Quando a retirada for por conta do cliente, o motorista transportador deverá estar devidamente autorizado e com carteira de motorista válida.',
        '• O atraso na definição da marca/modelo do veículo e do nº e modelo da caixa de câmbio, bem como, atraso no encaminhamento do veículo para montagem, prorrogam automaticamente o prazo de entrega, em números de dias úteis equivalentes.',
        '• No caso de vendas feitas a prazo, caso ocorra inadimplência de quaisquer das parcelas ficará suspensa a garantia contratual do equipamento no respectivo período, a qual perdurará até a data de regularização da situação. O inadimplemento de parcela(s) ensejará no pagamento de multa de 2% sobre seu respectivo valor e juros de 0,33% por dia de atraso.',
        '• É obrigatório o estudo de integração veicular para a montagem do equipamento, sendo de responsabilidade do cliente o envio à STARK Guindastes dos dados do caminhão em até 5 (cinco) dias úteis contados da assinatura do pedido. Caso a montagem seja feita sem o estudo, a STARK Guindastes não se responsabiliza pela mesma.',
        '• A STARK Guindastes não se responsabiliza por despesas extras com o caminhão, tais como: deslocamento de arla, aumento de entre eixo e balanço traseiro, inclusão de eixo extra, deslocamento de barra de direção, reforço de molas, retirada e modificações em carrocerias e parametrização do caminhão.',
        '• No momento do faturamento, o preço do equipamento será atualizado para o valor a ele correspondente na tabela vigente (Tabela de Preços STARK Guindastes), ficando condicionado o seu embarque ao pagamento da respectiva diferença resultante dessa correção a ser feito pelo Contratante à STARK Guindastes.',
        '• As assinaturas abaixo, formalizam o presente pedido, indicando a total concordância entre as partes com aos termos e condições do presente negócio.'
      ];
      
      let yPos = margin + headerHeight + 40;
      clausulas.forEach((clausula, index) => {
        // Verificar se precisa de nova página
        if (yPos > pageHeight - footerHeight - margin - 30) {
          pdf.addPage();
          
          // Adicionar cabeçalho na nova página
          const headerImgData = headerCanvas.toDataURL('image/png');
          pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
          
          yPos = margin + headerHeight + 20;
        }
        
        // Adicionar cláusula
        const lines = pdf.splitTextToSize(clausula, 170);
        pdf.text(lines, 20, yPos);
        yPos += (lines.length * 4) + 8;
      });
      
      // Adicionar rodapé na última página de cláusulas
      const footerImgData = footerCanvas.toDataURL('image/png');
      pdf.addImage(footerImgData, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);

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