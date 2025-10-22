import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatCurrency } from './formatters';

/**
 * Gerador de PDF Profissional para Proposta Comercial
 * Inclui todas as informações: cliente, caminhão, equipamento, pagamento, cláusulas
 */

// Função auxiliar para carregar imagem
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

// Função para adicionar texto com quebra de linha automática
const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
  if (!text) return y;
  
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, index) => {
    doc.text(line, x, y + (index * lineHeight));
  });
  return y + (lines.length * lineHeight);
};

// Função para verificar se precisa adicionar nova página
const checkPageBreak = (doc, currentY, spaceNeeded = 30) => {
  if (currentY + spaceNeeded > 270) {
    doc.addPage();
    return 20; // Retorna posição Y inicial da nova página
  }
  return currentY;
};

// Função para adicionar cabeçalho em cada página
const addHeader = (doc, numeroProposta, data) => {
  // Logo/Título
  doc.setFontSize(18);
  doc.setTextColor(41, 98, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('STARK GUINDASTES', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Proposta Comercial', 105, 22, { align: 'center' });
  
  // Linha separadora
  doc.setDrawColor(41, 98, 255);
  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);
  
  // Número da proposta e data
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Proposta Nº: ${numeroProposta}`, 20, 32);
  doc.text(`Data: ${data}`, 160, 32);
};

// Função para adicionar rodapé
const addFooter = (doc, pageNumber, totalPages) => {
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('STARK Guindastes - Soluções em Equipamentos de Elevação', 105, 285, { align: 'center' });
  doc.text(`Página ${pageNumber} de ${totalPages}`, 105, 290, { align: 'center' });
};

/**
 * Gera PDF completo da proposta comercial
 */
export const generatePropostaComercialPDF = async (dadosProposta) => {
  const doc = new jsPDF();
  let currentY = 40;
  let pageNumber = 1;
  
  const {
    numeroProposta,
    data,
    vendedor,
    cliente,
    caminhao,
    equipamento,
    pagamento,
    observacoes
  } = dadosProposta;

  // ==================== PÁGINA 1: DADOS GERAIS ====================
  addHeader(doc, numeroProposta, data);
  
  // DADOS DO VENDEDOR
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('DADOS DO VENDEDOR', 20, currentY);
  currentY += 8;
  
  // Caixa de fundo para dados do vendedor
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 25, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 25, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Nome: ${vendedor.nome}`, 20, currentY);
  currentY += 5;
  doc.text(`Email: ${vendedor.email || 'Não informado'}`, 20, currentY);
  currentY += 5;
  doc.text(`Telefone: ${vendedor.telefone || 'Não informado'}`, 20, currentY);
  currentY += 5;
  doc.text(`Região: ${vendedor.regiao || 'Não informado'}`, 20, currentY);
  currentY += 15;

  // DADOS DO CLIENTE
  currentY = checkPageBreak(doc, currentY, 60);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('DADOS DO CLIENTE', 20, currentY);
  currentY += 8;
  
  // Caixa de fundo para dados do cliente
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 40, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 40, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Razão Social: ${cliente.nome}`, 20, currentY);
  currentY += 5;
  doc.text(`CNPJ/CPF: ${cliente.documento}`, 20, currentY);
  currentY += 5;
  doc.text(`Inscrição Estadual: ${cliente.inscricao_estadual || 'ISENTO'}`, 20, currentY);
  currentY += 5;
  doc.text(`Email: ${cliente.email}`, 20, currentY);
  currentY += 5;
  doc.text(`Telefone: ${cliente.telefone}`, 20, currentY);
  currentY += 5;
  doc.text(`Endereço: ${cliente.endereco}`, 20, currentY);
  currentY += 5;
  doc.text(`Cidade/UF: ${cliente.cidade}/${cliente.uf}`, 20, currentY);
  currentY += 5;
  doc.text(`CEP: ${cliente.cep}`, 20, currentY);
  currentY += 20;

  // DADOS DO VEÍCULO (ESTUDO VEICULAR)
  currentY = checkPageBreak(doc, currentY, 50);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('ESTUDO VEICULAR', 20, currentY);
  currentY += 8;
  
  // Caixa de fundo para dados do veículo
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 35, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 35, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Tipo de Veículo: ${caminhao.tipo}`, 20, currentY);
  currentY += 5;
  doc.text(`Marca: ${caminhao.marca}`, 20, currentY);
  currentY += 5;
  doc.text(`Modelo: ${caminhao.modelo}`, 20, currentY);
  currentY += 5;
  doc.text(`Ano: ${caminhao.ano || 'Não informado'}`, 20, currentY);
  currentY += 5;
  doc.text(`Voltagem: ${caminhao.voltagem}`, 20, currentY);
  currentY += 5;
  if (caminhao.placa) {
    doc.text(`Placa: ${caminhao.placa}`, 20, currentY);
    currentY += 5;
  }
  if (caminhao.observacoes) {
    doc.text('Observações:', 20, currentY);
    currentY += 5;
    currentY = addWrappedText(doc, caminhao.observacoes, 20, currentY, 170);
  }
  currentY += 15;

  // ==================== PÁGINA 2: EQUIPAMENTO ====================
  doc.addPage();
  pageNumber++;
  currentY = 40;
  addHeader(doc, numeroProposta, data);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('ESPECIFICAÇÃO DO EQUIPAMENTO', 20, currentY);
  currentY += 12;
  
  // Caixa principal para informações do equipamento
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 45, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 45, 'S');
  
  // Informações principais do equipamento
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(`Modelo: ${equipamento.modelo}`, 20, currentY);
  currentY += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Capacidade: ${equipamento.subgrupo}`, 20, currentY);
  currentY += 5;
  doc.text(`Código de Referência: ${equipamento.codigo_referencia || 'N/A'}`, 20, currentY);
  currentY += 5;
  doc.text(`Peso: ${equipamento.peso_kg}`, 20, currentY);
  currentY += 5;
  doc.text(`Configuração: ${equipamento.configuracao || 'Padrão'}`, 20, currentY);
  currentY += 5;
  doc.text(`Possui CONTR: ${equipamento.tem_contr || 'Não'}`, 20, currentY);
  currentY += 5;
  
  if (equipamento.finame) {
    doc.text(`FINAME: ${equipamento.finame}`, 20, currentY);
    currentY += 5;
  }
  
  if (equipamento.ncm) {
    doc.text(`NCM: ${equipamento.ncm}`, 20, currentY);
    currentY += 5;
  }
  
  currentY += 10;

  // DESCRIÇÃO TÉCNICA
  if (equipamento.descricao) {
    currentY = checkPageBreak(doc, currentY, 40);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 98, 255);
    doc.text('DESCRIÇÃO TÉCNICA:', 20, currentY);
    currentY += 8;
    
    // Caixa para descrição técnica
    doc.setFillColor(248, 249, 250);
    doc.rect(15, currentY - 5, 180, 30, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, 180, 30, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    currentY = addWrappedText(doc, equipamento.descricao, 20, currentY, 170, 4);
    currentY += 10;
  }

  // NÃO INCLUÍDO
  if (equipamento.nao_incluido) {
    currentY = checkPageBreak(doc, currentY, 40);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('NÃO INCLUÍDO:', 20, currentY);
    currentY += 8;
    
    // Caixa para não incluído
    doc.setFillColor(255, 248, 248);
    doc.rect(15, currentY - 5, 180, 30, 'F');
    doc.setDrawColor(220, 53, 69);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, 180, 30, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    currentY = addWrappedText(doc, equipamento.nao_incluido, 20, currentY, 170, 4);
    currentY += 10;
  }

  // ==================== GRÁFICO DE CARGA ====================
  if (equipamento.grafico_carga_url) {
    doc.addPage();
    pageNumber++;
    currentY = 40;
    addHeader(doc, numeroProposta, data);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 98, 255);
    doc.text('GRÁFICO DE CARGA', 105, currentY, { align: 'center' });
    currentY += 10;
    
    try {
      const img = await loadImage(equipamento.grafico_carga_url);
      
      // Calcular dimensões mantendo proporção
      const maxWidth = 170;
      const maxHeight = 200;
      let imgWidth = img.width;
      let imgHeight = img.height;
      
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      imgWidth = imgWidth * ratio;
      imgHeight = imgHeight * ratio;
      
      // Centralizar
      const xPosition = (210 - imgWidth) / 2;
      
      doc.addImage(img, 'PNG', xPosition, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Erro ao carregar gráfico de carga:', error);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Gráfico de carga não disponível', 105, currentY, { align: 'center' });
      currentY += 10;
    }
  }

  // ==================== PÁGINA: CONDIÇÕES DE PAGAMENTO ====================
  doc.addPage();
  pageNumber++;
  currentY = 40;
  addHeader(doc, numeroProposta, data);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('CONDIÇÕES DE PAGAMENTO', 20, currentY);
  currentY += 12;
  
  // Caixa para tipo de negociação
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 15, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 15, 'S');
  
  // Tipo de Cliente
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(`Tipo de Negociação: ${pagamento.tipoPagamento === 'revenda' ? 'REVENDA' : 'CLIENTE FINAL'}`, 20, currentY);
  currentY += 12;
  
  // Caixa para valores
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 50, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 50, 'S');
  
  // Valores
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Valor Base do Equipamento: ${formatCurrency(pagamento.valorBase || 0)}`, 20, currentY);
  currentY += 5;
  
  if (pagamento.desconto > 0) {
    doc.setTextColor(40, 167, 69);
    doc.text(`Desconto Aplicado: ${pagamento.desconto.toFixed(2)}% (${formatCurrency(pagamento.valorDesconto || 0)})`, 20, currentY);
    doc.setTextColor(60, 60, 60);
    currentY += 5;
  }
  
  if (pagamento.acrescimo > 0) {
    doc.setTextColor(220, 53, 69);
    doc.text(`Acréscimo: ${pagamento.acrescimo.toFixed(2)}%`, 20, currentY);
    doc.setTextColor(60, 60, 60);
    currentY += 5;
  }
  
  if (pagamento.valorFrete > 0) {
    doc.text(`Frete (${pagamento.tipoFrete?.toUpperCase()}): ${formatCurrency(pagamento.valorFrete)}`, 20, currentY);
    currentY += 5;
  }
  
  if (pagamento.valorInstalacao > 0) {
    doc.text(`Instalação: ${formatCurrency(pagamento.valorInstalacao)}`, 20, currentY);
    currentY += 5;
  }
  
  currentY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(41, 98, 255);
  doc.text(`VALOR TOTAL: ${formatCurrency(pagamento.valorFinal || 0)}`, 20, currentY);
  currentY += 15;
  
  // Forma de Pagamento
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('FORMA DE PAGAMENTO:', 20, currentY);
  currentY += 8;
  
  // Caixa para forma de pagamento
  doc.setFillColor(248, 249, 250);
  doc.rect(15, currentY - 5, 180, 40, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(15, currentY - 5, 180, 40, 'S');
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Prazo: ${pagamento.prazoPagamento || 'À vista'}`, 20, currentY);
  currentY += 5;
  
  if (pagamento.financiamentoBancario === 'sim') {
    doc.text('Financiamento Bancário: SIM', 20, currentY);
    currentY += 5;
  }
  
  if (pagamento.entradaTotal > 0) {
    doc.text(`Entrada: ${formatCurrency(pagamento.entradaTotal)} (${pagamento.percentualEntrada}%)`, 20, currentY);
    currentY += 5;
    
    if (pagamento.valorSinal > 0) {
      doc.text(`  - Sinal: ${formatCurrency(pagamento.valorSinal)}`, 25, currentY);
      currentY += 5;
      doc.text(`  - Restante da entrada: ${formatCurrency(pagamento.faltaEntrada || 0)}`, 25, currentY);
      currentY += 5;
    }
  }
  
  if (pagamento.saldoAPagar > 0) {
    doc.text(`Saldo a Pagar: ${formatCurrency(pagamento.saldoAPagar)}`, 20, currentY);
    currentY += 5;
  }
  
  // Parcelas
  if (pagamento.parcelas && pagamento.parcelas.length > 0) {
    currentY += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('PARCELAMENTO:', 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    pagamento.parcelas.slice(0, 10).forEach((parcela, index) => {
      currentY = checkPageBreak(doc, currentY, 5);
      doc.text(`${index + 1}ª parcela: ${formatCurrency(parcela.valor)} - Vencimento: ${parcela.vencimento || 'A definir'}`, 25, currentY);
      currentY += 4;
    });
    
    if (pagamento.parcelas.length > 10) {
      doc.text(`... e mais ${pagamento.parcelas.length - 10} parcelas`, 25, currentY);
      currentY += 4;
    }
  }
  
  currentY += 5;
  
  // Local de Instalação
  if (pagamento.localInstalacao) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOCAL DE INSTALAÇÃO:', 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(pagamento.localInstalacao, 20, currentY);
    currentY += 5;
    doc.text(`Tipo de Instalação: ${pagamento.tipoInstalacao === 'fabrica' ? 'Por conta da fábrica' : 'Por conta do cliente'}`, 20, currentY);
    currentY += 8;
  }

  // ==================== PÁGINA: CLÁUSULAS CONTRATUAIS ====================
  doc.addPage();
  pageNumber++;
  currentY = 40;
  addHeader(doc, numeroProposta, data);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 255);
  doc.text('CLÁUSULAS CONTRATUAIS', 20, currentY);
  currentY += 12;
  
  const clausulas = [
    {
      titulo: '1. VALIDADE DA PROPOSTA',
      texto: 'Esta proposta tem validade de 30 (trinta) dias corridos a partir da data de emissão.'
    },
    {
      titulo: '2. PRAZO DE ENTREGA',
      texto: 'O prazo de entrega é de 15 (quinze) dias úteis após a confirmação do pedido e aprovação do crédito, podendo variar conforme disponibilidade de estoque.'
    },
    {
      titulo: '3. GARANTIA',
      texto: 'O equipamento possui garantia de 12 (doze) meses contra defeitos de fabricação, conforme manual do fabricante.'
    },
    {
      titulo: '4. INSTALAÇÃO',
      texto: 'A instalação, quando incluída, será realizada por equipe técnica especializada. O cliente deverá fornecer as condições necessárias para a instalação.'
    },
    {
      titulo: '5. FRETE',
      texto: `Frete ${pagamento.tipoFrete === 'cif' ? 'CIF (por conta da fábrica)' : 'FOB (por conta do cliente)'}.`
    },
    {
      titulo: '6. CONDIÇÕES DE PAGAMENTO',
      texto: 'As condições de pagamento são as especificadas nesta proposta. Atrasos superiores a 15 dias poderão acarretar em juros de 2% ao mês.'
    },
    {
      titulo: '7. CANCELAMENTO',
      texto: 'Em caso de cancelamento após a confirmação do pedido, será cobrada multa de 20% sobre o valor total.'
    },
    {
      titulo: '8. RESPONSABILIDADES',
      texto: 'O cliente é responsável por verificar as condições do veículo e a compatibilidade do equipamento antes da instalação.'
    }
  ];
  
  doc.setFontSize(9);
  clausulas.forEach((clausula, index) => {
    currentY = checkPageBreak(doc, currentY, 25);
    
    // Caixa para cada cláusula
    doc.setFillColor(248, 249, 250);
    doc.rect(15, currentY - 5, 180, 20, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, 180, 20, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 98, 255);
    doc.text(clausula.titulo, 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    currentY = addWrappedText(doc, clausula.texto, 20, currentY, 170, 4);
    currentY += 8;
  });

  // Observações adicionais
  if (observacoes) {
    currentY = checkPageBreak(doc, currentY, 30);
    currentY += 5;
    
    // Caixa para observações
    doc.setFillColor(255, 248, 248);
    doc.rect(15, currentY - 5, 180, 25, 'F');
    doc.setDrawColor(220, 53, 69);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, 180, 25, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('OBSERVAÇÕES:', 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    currentY = addWrappedText(doc, observacoes, 20, currentY, 170, 4);
  }

  // ==================== PÁGINA FINAL: ASSINATURAS E QR CODE ====================
  doc.addPage();
  pageNumber++;
  currentY = 40;
  addHeader(doc, numeroProposta, data);
  
  currentY += 20;
  
  // Assinaturas
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  doc.text('_________________________________________', 30, currentY);
  doc.text('_________________________________________', 120, currentY);
  currentY += 5;
  doc.text('STARK Guindastes', 30, currentY);
  doc.text('Cliente', 120, currentY);
  currentY += 3;
  doc.setFontSize(8);
  doc.text('Representante Legal', 30, currentY);
  doc.text(cliente.nome, 120, currentY);
  
  currentY += 20;
  
  // QR Code para WhatsApp
  const telefoneVendedor = vendedor.telefone?.replace(/\D/g, '') || '5555999999999';
  const mensagemWhatsApp = `Olá! Gostaria de mais informações sobre a proposta ${numeroProposta}`;
  const whatsappUrl = `https://wa.me/${telefoneVendedor}?text=${encodeURIComponent(mensagemWhatsApp)}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(whatsappUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#2962ff',
        light: '#ffffff'
      }
    });
    
    doc.addImage(qrCodeDataURL, 'PNG', 75, currentY, 60, 60);
    currentY += 65;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Escaneie o QR Code para entrar em contato via WhatsApp', 105, currentY, { align: 'center' });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }

  // Adicionar rodapés em todas as páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
};

/**
 * Função auxiliar para gerar e baixar o PDF
 */
export const gerarEBaixarProposta = async (dadosProposta) => {
  try {
    const doc = await generatePropostaComercialPDF(dadosProposta);
    const fileName = `Proposta_${dadosProposta.numeroProposta}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return { success: false, error: error.message };
  }
};
