import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

// Função para gerar PDF de orçamento
export const generateQuotePDF = async (quoteData) => {
  const doc = new jsPDF();
  
  // Configurações iniciais
  doc.setFont('helvetica');
  doc.setFontSize(20);
  
  // Cabeçalho
  doc.setTextColor(102, 126, 234);
  doc.text('GuindastesPro', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);
  doc.text('Sistema de Orçamentos', 105, 30, { align: 'center' });
  
  // Linha separadora
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Informações do orçamento
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  
  // Número do orçamento
  doc.setFontSize(16);
  doc.text(`Orçamento #${quoteData.id}`, 20, 50);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 60);
  doc.text(`Vendedor: ${quoteData.vendedor}`, 20, 70);
  
  // Informações do cliente
  doc.setFontSize(12);
  doc.text('Dados do Cliente:', 20, 85);
  doc.setFontSize(10);
  doc.text(`Nome: ${quoteData.cliente.nome}`, 20, 95);
  doc.text(`Email: ${quoteData.cliente.email}`, 20, 105);
  doc.text(`Telefone: ${quoteData.cliente.telefone}`, 20, 115);
  doc.text(`CNPJ/CPF: ${quoteData.cliente.documento}`, 20, 125);
  
  // Informações do caminhão
  doc.setFontSize(12);
  doc.text('Dados do Caminhão:', 20, 145);
  doc.setFontSize(10);
  doc.text(`Placa: ${quoteData.caminhao.placa}`, 20, 155);
  doc.text(`Modelo: ${quoteData.caminhao.modelo}`, 20, 165);
  doc.text(`Ano: ${quoteData.caminhao.ano}`, 20, 175);
  
  // Produtos selecionados
  doc.setFontSize(12);
  doc.text('Produtos Selecionados:', 20, 195);
  
  let yPosition = 205;
  let totalValue = 0;
  
  // Guindastes
  quoteData.guindastes.forEach((guindaste, index) => {
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${guindaste.modelo}`, 20, yPosition);
    doc.text(`Capacidade: ${guindaste.capacidade} | Alcance: ${guindaste.alcance}`, 25, yPosition + 5);
    doc.text(`R$ ${guindaste.preco.toLocaleString('pt-BR')}`, 160, yPosition + 2, { align: 'right' });
    totalValue += guindaste.preco;
    yPosition += 15;
  });
  
  // Opcionais
  if (quoteData.opcionais && quoteData.opcionais.length > 0) {
    doc.setFontSize(10);
    doc.text('Opcionais:', 20, yPosition);
    yPosition += 10;
    
    quoteData.opcionais.forEach((opcional, index) => {
      doc.text(`${index + 1}. ${opcional.nome}`, 25, yPosition);
      doc.text(`R$ ${opcional.preco.toLocaleString('pt-BR')}`, 160, yPosition, { align: 'right' });
      totalValue += opcional.preco;
      yPosition += 8;
    });
  }
  
  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total do Orçamento:', 120, yPosition + 10);
  doc.text(`R$ ${totalValue.toLocaleString('pt-BR')}`, 160, yPosition + 10, { align: 'right' });
  
  // Gráficos de Carga (se houver)
  let hasGraficoCarga = false;
  quoteData.guindastes.forEach(guindaste => {
    if (guindaste.grafico_carga_url) {
      hasGraficoCarga = true;
    }
  });
  
  if (hasGraficoCarga) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráficos de Carga:', 20, yPosition + 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
          doc.text('Abaixo estão os gráficos de carga dos guindastes selecionados:', 20, yPosition + 40);
    
    let graficoYPosition = yPosition + 50;
    
    quoteData.guindastes.forEach(async (guindaste, index) => {
      if (guindaste.grafico_carga_url) {
        try {
          // Adicionar título do guindaste
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${guindaste.modelo} - Gráfico de Carga:`, 20, graficoYPosition);
          
          // Adicionar imagem do gráfico de carga
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            // Calcular proporções para caber na página
            const maxWidth = 170;
            const maxHeight = 80;
            let imgWidth = img.width;
            let imgHeight = img.height;
            
            // Redimensionar mantendo proporção
            if (imgWidth > maxWidth) {
              imgHeight = (imgHeight * maxWidth) / imgWidth;
              imgWidth = maxWidth;
            }
            if (imgHeight > maxHeight) {
              imgWidth = (imgWidth * maxHeight) / imgHeight;
              imgHeight = maxHeight;
            }
            
            // Centralizar na página
            const xPosition = (210 - imgWidth) / 2;
            
            doc.addImage(img, 'JPEG', xPosition, graficoYPosition + 5, imgWidth, imgHeight);
          };
          
          img.src = guindaste.grafico_carga_url;
          
          graficoYPosition += 100; // Espaço para próxima imagem
        } catch (error) {
          console.error('Erro ao carregar gráfico de carga:', error);
        }
      }
    });
    
    // Ajustar posição para condições de pagamento
    yPosition = graficoYPosition + 20;
  }
  
  // Condições de pagamento
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Condições de Pagamento:', 20, yPosition + 30);
  doc.text('• Entrada de 30% na assinatura do contrato', 20, yPosition + 40);
  doc.text('• Saldo em até 12x no cartão ou boleto', 20, yPosition + 50);
  doc.text('• Prazo de entrega: 15 dias úteis', 20, yPosition + 60);
  
  // Validade do orçamento
  doc.text('Validade do orçamento: 30 dias', 20, yPosition + 75);
  
  // QR Code para WhatsApp
  const whatsappText = `Olá! Gostaria de mais informações sobre o orçamento #${quoteData.id}`;
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(whatsappText)}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(whatsappUrl, {
      width: 50,
      margin: 1,
      color: {
        dark: '#667eea',
        light: '#ffffff'
      }
    });
    
    // Ajustar posição do QR Code baseado no conteúdo
    const qrCodeY = hasGraficoCarga ? yPosition + 30 : yPosition + 30;
    doc.addImage(qrCodeDataURL, 'PNG', 150, qrCodeY, 30, 30);
    doc.setFontSize(8);
    doc.text('Escaneie para WhatsApp', 150, qrCodeY + 35, { align: 'center' });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }
  
  // Rodapé - ajustar posição baseado no conteúdo
  const footerY = hasGraficoCarga ? yPosition + 80 : 280;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('GuindastesPro - Sistema Profissional de Orçamentos', 105, footerY, { align: 'center' });
  doc.text('www.guindastespro.com.br | contato@guindastespro.com.br', 105, footerY + 5, { align: 'center' });
  
  return doc;
};

// Função para gerar PDF de relatório
export const generateReportPDF = async (reportData) => {
  const doc = new jsPDF();
  
  // Configurações iniciais
  doc.setFont('helvetica');
  doc.setFontSize(20);
  
  // Cabeçalho
  doc.setTextColor(102, 126, 234);
  doc.text('GuindastesPro', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);
  doc.text('Relatório de Vendas', 105, 30, { align: 'center' });
  
  // Linha separadora
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Informações do relatório
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(`Período: ${reportData.periodo}`, 20, 50);
  doc.text(`Vendedor: ${reportData.vendedor}`, 20, 60);
  doc.text(`Data do relatório: ${new Date().toLocaleDateString('pt-BR')}`, 20, 70);
  
  // Estatísticas
  doc.setFontSize(14);
  doc.text('Estatísticas:', 20, 85);
  
  doc.setFontSize(10);
  doc.text(`Total de vendas: ${reportData.totalVendas}`, 20, 95);
  doc.text(`Valor total: R$ ${reportData.valorTotal.toLocaleString('pt-BR')}`, 20, 105);
  doc.text(`Ticket médio: R$ ${(reportData.valorTotal / reportData.totalVendas).toLocaleString('pt-BR')}`, 20, 115);
  
  // Lista de vendas
  doc.setFontSize(12);
  doc.text('Detalhamento de Vendas:', 20, 135);
  
  let yPosition = 145;
  
  reportData.vendas.forEach((venda, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${venda.cliente} - ${venda.modelo}`, 20, yPosition);
    doc.text(`R$ ${venda.valor.toLocaleString('pt-BR')} - ${venda.status}`, 160, yPosition, { align: 'right' });
    yPosition += 10;
  });
  
  // Gráfico simples (barras)
  if (yPosition < 200) {
    doc.setFontSize(12);
    doc.text('Performance Mensal:', 20, yPosition + 10);
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const valores = [60, 75, 85, 70, 90, 95];
    const maxValor = Math.max(...valores);
    
    let xPos = 30;
    meses.forEach((mes, index) => {
      const altura = (valores[index] / maxValor) * 40;
      doc.setFillColor(102, 126, 234);
      doc.rect(xPos, 220 - altura, 15, altura, 'F');
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(8);
      doc.text(mes, xPos + 2, 235);
      xPos += 25;
    });
  }
  
  // QR Code para WhatsApp
  const whatsappText = `Olá! Gostaria de mais informações sobre o relatório de vendas de ${reportData.periodo}`;
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(whatsappText)}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(whatsappUrl, {
      width: 50,
      margin: 1,
      color: {
        dark: '#667eea',
        light: '#ffffff'
      }
    });
    
    doc.addImage(qrCodeDataURL, 'PNG', 150, 200, 30, 30);
    doc.setFontSize(8);
    doc.text('Escaneie para WhatsApp', 150, 235, { align: 'center' });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }
  
  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('GuindastesPro - Sistema Profissional de Orçamentos', 105, 280, { align: 'center' });
  doc.text('www.guindastespro.com.br | contato@guindastespro.com.br', 105, 285, { align: 'center' });
  
  return doc;
};

// Função para enviar PDF via WhatsApp
export const sendPDFToWhatsApp = (pdfBlob, fileName, phoneNumber = '5511999999999') => {
  // Criar URL do arquivo
  const fileUrl = URL.createObjectURL(pdfBlob);
  
  // Criar link para WhatsApp com arquivo
  const whatsappUrl = `https://wa.me/${phoneNumber}`;
  
  // Abrir WhatsApp em nova aba
  window.open(whatsappUrl, '_blank');
  
  // Mostrar instruções para o usuário
  alert(`PDF gerado com sucesso!\n\nPara enviar via WhatsApp:\n1. Abra o WhatsApp Web\n2. Selecione o contato\n3. Clique em anexar arquivo\n4. Selecione o arquivo "${fileName}"\n5. Envie a mensagem`);
  
  // Fazer download automático do PDF
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Limpar URL
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

// Função para gerar e enviar orçamento
export const generateAndSendQuote = async (quoteData, phoneNumber) => {
  try {
    const doc = await generateQuotePDF(quoteData);
    const pdfBlob = doc.output('blob');
    const fileName = `Orcamento_${quoteData.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    sendPDFToWhatsApp(pdfBlob, fileName, phoneNumber);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return { success: false, error: error.message };
  }
};

// Função para gerar e enviar relatório
export const generateAndSendReport = async (reportData, phoneNumber) => {
  try {
    const doc = await generateReportPDF(reportData);
    const pdfBlob = doc.output('blob');
    const fileName = `Relatorio_${reportData.periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    sendPDFToWhatsApp(pdfBlob, fileName, phoneNumber);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return { success: false, error: error.message };
  }
}; 