import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatCurrency } from './formatters';

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
const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 4.2) => {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
};

// Controle de quebra de página
const checkPageBreak = (doc, currentY, spaceNeeded = 20) => {
  if (currentY + spaceNeeded > 260) {
    doc.addPage();
    addHeader(doc);
    return 50;
  }
  return currentY;
};

// Cabeçalho
const addHeader = (doc, numeroProposta, data) => {
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('STARK', 20, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('INDUSTRIAL', 20, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PROPOSTA COMERCIAL', 105, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Proposta Nº: ${numeroProposta}`, 160, 15);
  doc.text(`Data: ${data}`, 160, 25);
  doc.setDrawColor(0, 0, 0);
  doc.line(20, 32, 190, 32);
};

// Rodapé
const addFooter = (doc, page, total) => {
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 270, 210, 25, 'F');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('STARK INDUSTRIAL', 20, 282);
  doc.setFont('helvetica', 'normal');
  doc.text('WWW.STARKINDUSTRIAL.IND.BR  |  (55) 2120-9961', 20, 287);
  doc.text(`Página ${page} de ${total}`, 190, 287, { align: 'right' });
};

/**
 * Geração do PDF da Proposta Comercial
 */
export const generatePropostaComercialPDF = async (dadosProposta) => {
  const doc = new jsPDF();
  const { numeroProposta, data, vendedor, cliente, caminhao, equipamento, pagamento, observacoes } = dadosProposta;
  let y = 40;

  // ======= Cabeçalho =======
  addHeader(doc, numeroProposta, data);

  // ======= BLOCO CLIENTE + EQUIPAMENTO =======
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DADOS DO CLIENTE', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(doc, `Razão Social: ${cliente.nome}`, 20, y, 180);
  y = addWrappedText(doc, `CNPJ/CPF: ${cliente.documento}  |  IE: ${cliente.inscricao_estadual || 'ISENTO'}`, 20, y, 180);
  y = addWrappedText(doc, `Endereço: ${cliente.endereco} – ${cliente.cidade}/${cliente.uf} – CEP: ${cliente.cep}`, 20, y, 180);
  y = addWrappedText(doc, `Telefone: ${cliente.telefone}  |  E-mail: ${cliente.email}`, 20, y, 180);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DADOS DO EQUIPAMENTO', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(doc, `Modelo: ${equipamento.modelo}`, 20, y, 180);
  y = addWrappedText(doc, `Capacidade: ${equipamento.subgrupo}`, 20, y, 180);
  y = addWrappedText(doc, `Código Referência: ${equipamento.codigo_referencia || 'N/A'}  |  Peso: ${equipamento.peso_kg}`, 20, y, 180);
  y = addWrappedText(doc, `Configuração: ${equipamento.configuracao || 'Padrão'}  |  CONTR: ${equipamento.tem_contr || 'Não'}`, 20, y, 180);
  y = addWrappedText(doc, `FINAME: ${equipamento.finame || 'Não informado'}`, 20, y, 180);
  y = addWrappedText(doc, `NCM: ${equipamento.ncm || 'Não informado'}`, 20, y, 180);
  y += 5;

  // ======= CONDIÇÕES COMERCIAIS =======
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CONDIÇÕES COMERCIAIS', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(doc, `Valor do Equipamento: ${formatCurrency(pagamento.valorBase || 0)}`, 20, y, 180);
  if (pagamento.desconto > 0) y = addWrappedText(doc, `Desconto Aplicado: ${pagamento.desconto.toFixed(2)}% (${formatCurrency(pagamento.valorDesconto || 0)})`, 20, y, 180);
  if (pagamento.valorFrete > 0) y = addWrappedText(doc, `Frete (${pagamento.tipoFrete?.toUpperCase()}): ${formatCurrency(pagamento.valorFrete)}`, 20, y, 180);
  if (pagamento.valorInstalacao > 0) y = addWrappedText(doc, `Instalação: ${formatCurrency(pagamento.valorInstalacao)}`, 20, y, 180);
  y = addWrappedText(doc, `Valor Total: ${formatCurrency(pagamento.valorFinal || 0)}`, 20, y, 180);
  y = addWrappedText(doc, `Forma de Pagamento: ${pagamento.prazoPagamento || 'À vista'}`, 20, y, 180);
  y += 10;

  // ======= CLÁUSULAS =======
  const clausulas = [
    { t: '1. VALIDADE', d: 'Proposta válida por 30 dias corridos a partir da emissão.' },
    { t: '2. ENTREGA', d: 'Entrega em até 15 dias úteis após confirmação e aprovação de crédito, conforme disponibilidade de estoque.' },
    { t: '3. GARANTIA', d: '12 meses contra defeitos de fabricação conforme manual.' },
    { t: '4. INSTALAÇÃO', d: 'Realizada por equipe técnica especializada, sob condições adequadas no local.' },
    { t: '5. FRETE', d: `Frete ${pagamento.tipoFrete === 'cif' ? 'CIF (por conta da fábrica)' : 'FOB (por conta do cliente)'}.` },
    { t: '6. PAGAMENTO', d: 'Conforme especificado nesta proposta. Atrasos superiores a 15 dias podem gerar juros de 2% ao mês.' },
    { t: '7. CANCELAMENTO', d: 'Cancelamentos após confirmação implicam multa de 20% sobre o valor total.' },
    { t: '8. RESPONSABILIDADES', d: 'Cabe ao cliente verificar condições do veículo e compatibilidade antes da instalação.' }
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULAS CONTRATUAIS', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  clausulas.forEach((c) => {
    y = checkPageBreak(doc, y, 18);
    doc.setFont('helvetica', 'bold');
    doc.text(c.t, 20, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, c.d, 25, y, 165, 4.2);
    y += 3;
  });

  if (observacoes) {
    y = checkPageBreak(doc, y, 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('OBSERVAÇÕES:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    y = addWrappedText(doc, observacoes, 25, y, 165, 4.2);
    doc.setTextColor(0, 0, 0);
  }

  // ======= ASSINATURAS (na mesma página) =======
  y += 10;
  doc.setFontSize(10);
  doc.text('_____________________________________', 25, y);
  doc.text('_____________________________________', 115, y);
  y += 5;
  doc.text('STARK Guindastes', 35, y);
  doc.text('Cliente', 125, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Representante Legal', 35, y);
  doc.text(cliente.nome, 125, y);

  // QR Code pequeno, centralizado
  const telefoneVendedor = vendedor.telefone?.replace(/\D/g, '') || '5555999999999';
  const mensagemWhatsApp = `Olá! Gostaria de mais informações sobre a proposta ${numeroProposta}`;
  const whatsappUrl = `https://wa.me/${telefoneVendedor}?text=${encodeURIComponent(mensagemWhatsApp)}`;

  try {
    const qrCodeDataURL = await QRCode.toDataURL(whatsappUrl, { width: 140, margin: 1 });
    doc.addImage(qrCodeDataURL, 'PNG', 85, 260, 40, 40);
  } catch (err) {
    console.error('Erro ao gerar QR:', err);
  }

  // Rodapé em todas as páginas
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  return doc;
};

// Função auxiliar para gerar e baixar
export const gerarEBaixarProposta = async (dadosProposta) => {
  try {
    const doc = await generatePropostaComercialPDF(dadosProposta);
    const fileName = `Proposta_${dadosProposta.numeroProposta}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    return { success: false, error: e.message };
  }
};
