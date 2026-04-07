import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { buildGraficoKey, resolveGraficoUrl } from '../utils/modelNormalization';
import { db } from '../config/supabase';

/**
 * ==========================
 *  CONFIGURAÇÕES GERAIS
 * ==========================
 */
const PAGE = { width: 210, height: 297 }; // A4 em mm
const MARGIN = 12;                        // margem lateral para o conteúdo HTML renderizado
const HEADER_H = 28;                      // cabeçalho visual alto
const FOOTER_H = 24;                      // rodapé visual alto
const CONTENT_W = PAGE.width - 2 * MARGIN;
const CONTENT_H = PAGE.height - HEADER_H - FOOTER_H - 8; // -8 para respiro adicional

// Tipografia / estilo base
const STYLE = {
  TITLE_SIZE: 30,
  SUBTITLE_SIZE: 18,
  BODY_SIZE: 15,
  CLAUSE_SIZE: 11,
  LINE: 5,
  FONT: 'helvetica',
};

const sanitizeFilePart = (value) => {
  const raw = (value || '').toString() || 'Documento';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
};

// Cabeçalho/rodapé (imagens)
const HEADER_IMG = '/cebecalho1.png';
const FOOTER_IMG = '/rodapé.png';

const formatCurrencyUSD = (value) => {
  const v = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
};

const getLang = (pedidoData) => {
  const lang = (pedidoData?.pdfLang || pedidoData?.pagamentoData?.idioma_pdf || '').toString().toLowerCase();
  return (lang === 'es' || lang === 'pt') ? lang : 'pt';
};

const t = (lang, key) => {
  const dict = {
    pt: {
      proposalTitleCommercial: 'PROPOSTA COMERCIAL STARK',
      proposalTitlePurchase: 'PROPOSTA DE COMPRA STARK',
      clienteTitle: 'CLIENTE STARK',
      equipamentoTitle: 'EQUIPAMENTO',
      proposalNumber: 'Nº PROPOSTA',
      issueDate: 'DATA DE EMISSÃO',
      conditionsTitle: 'CONDIÇÕES COMERCIAIS E FINANCEIRAS',
      exchangeRateApplied: 'CÂMBIO APLICADO',
      totalProposal: 'VALOR TOTAL DA PROPOSTA',
      bankData: 'DADOS BANCÁRIOS – STARK GUINDASTES LTDA',
      notProvided: 'NÃO INFORMADO',
      modelNotProvided: 'MODELO NÃO INFORMADO',
      validity: 'VALIDADE',
      validityDays10: '10 DIAS',
      prototypeProposal: 'PROPOSTA DE EQUIPAMENTO PROTÓTIPO',
      modalityFinancing: 'MODALIDADE: FINANCIAMENTO BANCÁRIO',
      starkRepresentative: 'REPRESENTANTE STARK',
      corporateName: 'RAZÃO SOCIAL',
      contact: 'CONTATO',
      company: 'EMPRESA',
      nameLabel: 'NOME',
      clientName: 'NOME CLIENTE',
      stateRegistration: 'INSCRIÇÃO ESTADUAL',
      address: 'ENDEREÇO',
      phone: 'TELEFONE',
      email: 'E-MAIL',
      clientDataTitle: 'DADOS DO CLIENTE',
      name: 'NOME',
      observations: 'OBSERVAÇÕES',
      equipmentTechDescription: 'DESCRIÇÃO TÉCNICA DO EQUIPAMENTO',
      noMainEquipment: 'NENHUM EQUIPAMENTO PRINCIPAL INFORMADO.',
      notIncluded: 'NÃO INCLUÍDO',
      warrantyProgramTitle: 'PROGRAMA DE REVISÃO E GARANTIA EQUIPAMENTO STARK',
      warrantyBullet1: 'Para solicitação da garantia, deverão ser apresentados os seguintes documentos:',
      warrantyBullet2: 'Nota Fiscal de aquisição do equipamento.',
      warrantyBullet3: 'Certificado de Garantia preenchido e assinado pelo proprietário na hora da entrega.',
      warrantyBullet4: 'Comprovante de revisão efetuada pelo ponto de instalação ou fábrica de Santa Rosa Rs.',
      warrantyBullet5: 'Comprovante do relatório de entrega técnica assinado pelo responsável pelo recebimento do equipamento.',
      warrantyBullet6: 'A garantia contratual concedida pela STARK Guindastes tem validade de:',
      warrantyBullet7: '6 (seis) meses para o sistema hidráulico, ou, 500 (quinhentas) horas de operação, o que ocorrer primeiro.',
      warrantyBullet8: '12 (doze) meses para a estrutura do equipamento, ou, 1000 (mil) horas de operação, o que ocorrer primeiro.',
      warrantyBullet9: 'O prazo é contado a partir da data de entrega ao cliente, conforme nota fiscal, e mediante o envio do Certificado de Garantia devidamente preenchido e assinado á fábrica.',
      warrantyBullet10: 'A validade de garantia está condicionada ao fato de que o faturamento da STARK Guindastes para a revenda não exceda 12 (doze) meses anteriores á entrega ao cliente final.',
      selectedOptionals: 'OPCIONAIS SELECIONADOS',
      optional: 'OPCIONAL',
      description: 'DESCRIÇÃO',
      price: 'PREÇO',
      vehicleDataTitle: 'DADOS DO VEÍCULO',
      type: 'TIPO',
      brand: 'MARCA',
      year: 'ANO',
      voltage: 'VOLTAGEM',
      vehicleStudyTitle: 'ESTUDO VEICULAR',
      measure: 'MEDIDA',
      value: 'VALOR',
      measuresNotProvided: 'MEDIDAS NÃO INFORMADAS.',
      patolamento: 'PATOLAMENTO',
      negotiationNotes: 'OBSERVAÇÕES DA NEGOCIAÇÃO',
      financingModeShort: 'MODALIDADE: FINANCIAMENTO BANCÁRIO',
      baseEquipmentValue: '① VALOR BASE DO EQUIPAMENTO',
      discountsAndAdjustments: '③ DESCONTOS E AJUSTES',
      sellerDiscount: 'Desconto Vendedor',
      termDiscount: 'Desconto Prazo',
      surcharge: 'Acréscimo',
      freightAndInstallation: '② FRETE E INSTALAÇÃO',
      freight: 'Frete',
      included: 'Incluso',
      customerPaysDirectly: 'Cliente paga direto',
      installation: 'Instalação',
      installationLocation: 'Local de Instalação',
      extra: 'EXTRA',
      commercialAdjustment: 'AJUSTE COMERCIAL',
      entry: 'ENTRADA',
      entryValue: 'Valor da entrada',
      paymentMethod: 'Forma de Pagamento',
      downPaymentPaid: 'Sinal já pago',
      remainingToPay: 'Falta pagar',
      balanceToPay: 'SALDO A PAGAR (APÓS FATURAMENTO)',
      thisAmountWillBeInstallments: 'Este valor será parcelado',
      term: 'PRAZO',
      balanceOf: 'Saldo de',
      dividedInto: 'dividido em',
      installments: 'parcelas',
      installment: 'Parcela',
      clausesTitle: 'CLÁUSULAS CONTRATUAIS',
      signaturesTitle: 'ASSINATURAS',
      signatureClient: 'CLIENTE',
      signatureSeller: 'VENDEDOR',
      autoGeneratedProposalAt: 'PROPOSTA GERADA AUTOMATICAMENTE EM',
      impactPhrase: '"Com sólida experiência em guindastes articulados hidráulicos, desenvolvemos esta proposta exclusiva para <strong>{{cliente}}</strong>, apresentando o <strong>{{equip}}</strong> como a solução ideal para otimizar suas operações, garantindo máxima eficiência, segurança e retorno sobre o investimento."',
    },
    es: {
      proposalTitleCommercial: 'PROPUESTA COMERCIAL STARK',
      proposalTitlePurchase: 'PROPUESTA DE COMPRA STARK GUINDASTES',
      clienteTitle: 'CLIENTE STARK',
      equipamentoTitle: 'EQUIPO',
      proposalNumber: 'Nº PROPUESTA',
      issueDate: 'FECHA DE EMISIÓN',
      conditionsTitle: 'CONDICIONES COMERCIALES Y FINANCIERAS',
      exchangeRateApplied: 'TIPO DE CAMBIO APLICADO',
      totalProposal: 'VALOR TOTAL DE LA PROPUESTA',
      bankData: 'DATOS BANCARIOS – STARK GUINDASTES LTDA',
      notProvided: 'NO INFORMADO',
      modelNotProvided: 'MODELO NO INFORMADO',
      validity: 'VALIDEZ',
      validityDays10: '10 DÍAS',
      prototypeProposal: 'PROPUESTA DE EQUIPO PROTOTIPO',
      modalityFinancing: 'MODALIDAD: FINANCIACIÓN BANCARIA',
      starkRepresentative: 'REPRESENTANTE STARK',
      corporateName: 'RAZÓN SOCIAL',
      contact: 'CONTACTO',
      company: 'EMPRESA',
      nameLabel: 'NOMBRE',
      clientName: 'NOMBRE DEL CLIENTE',
      stateRegistration: 'INSCRIPCIÓN ESTATAL',
      address: 'DIRECCIÓN',
      phone: 'TELÉFONO',
      email: 'E-MAIL',
      clientDataTitle: 'DATOS DEL CLIENTE',
      name: 'NOMBRE',
      observations: 'OBSERVACIONES',
      equipmentTechDescription: 'DESCRIPCIÓN TÉCNICA DEL EQUIPO',
      noMainEquipment: 'NO SE INFORMÓ NINGÚN EQUIPO PRINCIPAL.',
      notIncluded: 'NO INCLUIDO',
      warrantyProgramTitle: 'PROGRAMA DE REVISIÓN Y GARANTÍA DEL EQUIPO STARK',
      warrantyBullet1: 'Para solicitar la garantía, deberán presentarse los siguientes documentos:',
      warrantyBullet2: 'Factura de compra del equipo.',
      warrantyBullet3: 'Certificado de garantía completado y firmado por el propietario en el momento de la entrega.',
      warrantyBullet4: 'Comprobante de revisión realizada por el punto de instalación o fábrica de Santa Rosa/RS.',
      warrantyBullet5: 'Comprobante del informe de entrega técnica firmado por el responsable de la recepción del equipo.',
      warrantyBullet6: 'La garantía contractual otorgada por STARK Guindastes tiene una validez de:',
      warrantyBullet7: '6 (seis) meses para el sistema hidráulico, o 500 (quinientas) horas de operación, lo que ocurra primero.',
      warrantyBullet8: '12 (doce) meses para la estructura del equipo, o 1000 (mil) horas de operación, lo que ocurra primero.',
      warrantyBullet9: 'El plazo se cuenta a partir de la fecha de entrega al cliente, según factura, y mediante el envío del Certificado de Garantía debidamente completado y firmado a fábrica.',
      warrantyBullet10: 'La validez de la garantía está condicionada a que la facturación de STARK Guindastes a la reventa no exceda 12 (doce) meses anteriores a la entrega al cliente final.',
      selectedOptionals: 'OPCIONALES SELECCIONADOS',
      optional: 'OPCIONAL',
      description: 'DESCRIPCIÓN',
      price: 'PRECIO',
      vehicleDataTitle: 'DATOS DEL VEHÍCULO',
      type: 'TIPO',
      brand: 'MARCA',
      year: 'AÑO',
      voltage: 'VOLTAJE',
      vehicleStudyTitle: 'ESTUDIO VEHICULAR',
      measure: 'MEDIDA',
      value: 'VALOR',
      measuresNotProvided: 'MEDIDAS NO INFORMADAS.',
      patolamento: 'PATOLAMIENTO',
      negotiationNotes: 'OBSERVACIONES DE LA NEGOCIACIÓN',
      financingModeShort: 'MODALIDAD: FINANCIACIÓN BANCARIA',
      baseEquipmentValue: '① VALOR BASE DEL EQUIPO',
      discountsAndAdjustments: '③ DESCUENTOS Y AJUSTES',
      sellerDiscount: 'Descuento Vendedor',
      termDiscount: 'Descuento Plazo',
      surcharge: 'Recargo',
      freightAndInstallation: '② FLETE E INSTALACIÓN',
      freight: 'Flete',
      included: 'Incluido',
      customerPaysDirectly: 'El cliente paga directamente',
      installation: 'Instalación',
      installationLocation: 'Lugar de instalación',
      extra: 'EXTRA',
      commercialAdjustment: 'AJUSTE COMERCIAL',
      entry: 'ENTRADA',
      entryValue: 'Valor de la entrada',
      paymentMethod: 'Forma de pago',
      downPaymentPaid: 'Señal ya pagada',
      remainingToPay: 'Resta pagar',
      balanceToPay: 'SALDO A PAGAR (DESPUÉS DE LA FACTURACIÓN)',
      thisAmountWillBeInstallments: 'Este valor será dividido en cuotas',
      term: 'PLAZO',
      balanceOf: 'Saldo de',
      dividedInto: 'dividido en',
      installments: 'cuotas',
      installment: 'Cuota',
      clausesTitle: 'CLÁUSULAS CONTRACTUALES',
      signaturesTitle: 'FIRMAS',
      signatureClient: 'CLIENTE',
      signatureSeller: 'VENDEDOR',
      autoGeneratedProposalAt: 'PROPUESTA GENERADA AUTOMÁTICAMENTE EN',
      impactPhrase: '"Con sólida experiencia en grúas articuladas hidráulicas, desarrollamos esta propuesta exclusiva para <strong>{{cliente}}</strong>, presentando el <strong>{{equip}}</strong> como la solución ideal para optimizar sus operaciones, garantizando máxima eficiencia, seguridad y retorno sobre la inversión."',
    }
  };
  return dict[lang]?.[key] || dict.pt[key] || key;
};

const tr = (lang, key, vars = {}) => {
  let s = t(lang, key);
  Object.entries(vars).forEach(([k, v]) => {
    s = s.replaceAll(`{{${k}}}`, String(v ?? ''));
  });
  return s;
};

const translatePtToEsHeuristic = (text) => {
  if (!text) return text;

  let s = String(text);

  const rules = [
    [/\bN[ÃA]O\s+INCLU[IÍ]DO\b/gi, 'NO INCLUIDO'],
    [/\bN[ÃA]O\s+INCLU[IÍ]DA\b/gi, 'NO INCLUIDA'],
    [/\bN[ÃA]O\s+INCLUI\b/gi, 'NO INCLUYE'],
    [/\bINCLU[IÍ]DO\b/gi, 'INCLUIDO'],
    [/\bINCLU[IÍ]DA\b/gi, 'INCLUIDA'],
    [/\bGARANTIA\b/gi, 'GARANTÍA'],
    [/\bREVISA(?:O|ÃO)\b/gi, 'REVISIÓN'],
    [/\bREVIS(?:O|Õ)ES\b/gi, 'REVISIONES'],
    [/\bMANUTEN(?:C|Ç)(?:A|Ã)O\b/gi, 'MANTENIMIENTO'],
    [/\bSISTEMA\b/gi, 'SISTEMA'],
    [/\bHIDR[ÁA]ULIC(?:O|A)\b/gi, 'HIDRÁULICO'],
    [/\bESTRUTURA\b/gi, 'ESTRUCTURA'],
    [/\bEQUIPAMENTO\b/gi, 'EQUIPO'],
    [/\bGUINDASTE\b/gi, 'GRÚA'],
    [/\bGUINDASTES\b/gi, 'GRÚAS'],
    [/\bCAMINH(?:A|Ã)O\b/gi, 'CAMIÓN'],
    [/\bCAMINH(?:O|Õ)ES\b/gi, 'CAMIONES'],
    [/\bCHASSI\b/gi, 'CHASIS'],
    [/\bPLACA\b/gi, 'MATRÍCULA'],
    [/\bCLIENTE\b/gi, 'CLIENTE'],
    [/\bCOMPRADOR\b/gi, 'COMPRADOR'],
    [/\bVENDEDOR\b/gi, 'VENDEDOR'],
    [/\bCONCESSION(?:A|Á)RIA\b/gi, 'CONCESIONARIO'],
    [/\bF[ÁA]BRICA\b/gi, 'FÁBRICA'],
    [/\bPRAZO\b/gi, 'PLAZO'],
    [/\bENTREGA\b/gi, 'ENTREGA'],
    [/\bPAGAMENTO\b/gi, 'PAGO'],
    [/\bPARCELAMENTO\b/gi, 'CUOTAS'],
    [/\bPARCELADO\b/gi, 'EN CUOTAS'],
    [/\bPARCELAS\b/gi, 'CUOTAS'],
    [/\bPARCELA\b/gi, 'CUOTA'],
    [/\bVALOR\b/gi, 'VALOR'],
    [/\bTOTAL\b/gi, 'TOTAL'],
    [/\bDESCONTO\b/gi, 'DESCUENTO'],
    [/\bACR[ÉE]SCIMO\b/gi, 'RECARGO'],
    [/\bFRETE\b/gi, 'FLETE'],
    [/\bINSTALA(?:C|Ç)(?:A|Ã)O\b/gi, 'INSTALACIÓN'],
    [/\bLOCAL\b/gi, 'LUGAR'],
    [/\bOBSERVA(?:C|Ç)(?:A|Ã)O\b/gi, 'OBSERVACIÓN'],
    [/\bOBSERVA(?:C|Ç)(?:O|Õ)ES\b/gi, 'OBSERVACIONES'],
    [/\bCONDI(?:C|Ç)(?:A|Ã)O\b/gi, 'CONDICIÓN'],
    [/\bCONDI(?:C|Ç)(?:O|Õ)ES\b/gi, 'CONDICIONES'],
    [/\bTOMADA\s+DE\s+FOR(?:C|Ç)A\b/gi, 'TOMA DE FUERZA'],
    [/\bCAIXA\s+DE\s+C[ÂA]MBIO\b/gi, 'CAJA DE CAMBIOS'],
    [/\bAUTOM[ÁA]TIC(?:O|A)\b/gi, 'AUTOMÁTICO'],
    [/\bOBRIGAT[ÓO]RIO\b/gi, 'OBLIGATORIO'],
    [/\bOBRIGAT[ÓO]RIA\b/gi, 'OBLIGATORIA'],
    [/\bOBRIGAT[ÓO]RIAS\b/gi, 'OBLIGATORIAS'],
    [/\bRESPONSABILIDADE\b/gi, 'RESPONSABILIDAD'],
    [/\bRESPONS[ÁA]VEL\b/gi, 'RESPONSABLE'],
    [/\bCUSTO\b/gi, 'COSTO'],
    [/\bSERVI(?:C|Ç)O\b/gi, 'SERVICIO'],
    [/\bSERVI(?:C|Ç)OS\b/gi, 'SERVICIOS'],
    [/\bDOCUMENTA(?:C|Ç)(?:A|Ã)O\b/gi, 'DOCUMENTACIÓN'],
    [/\bDOCUMENTOS\b/gi, 'DOCUMENTOS'],
    [/\bNOTA\s+FISCAL\b/gi, 'FACTURA'],
    [/\bCONTRATO\b/gi, 'CONTRATO'],
    [/\bASSINATURA\b/gi, 'FIRMA'],
    [/\bASSINADO\b/gi, 'FIRMADO'],
    [/\bASSINADAS\b/gi, 'FIRMADAS'],
    [/\bFIRMA\s+RECONHECIDA\b/gi, 'FIRMA CERTIFICADA'],
    [/\bDIA\s+ÚTIL\b/gi, 'DÍA HÁBIL'],
    [/\bDIAS\s+ÚTEIS\b/gi, 'DÍAS HÁBILES'],
    [/\bMONTAGEM\b/gi, 'MONTAJE'],
    [/\bINTEGRA(?:C|Ç)(?:A|Ã)O\s+VEICULAR\b/gi, 'INTEGRACIÓN VEHICULAR'],
  ];

  rules.forEach(([re, rep]) => {
    s = s.replace(re, rep);
  });

  return s;
};

/**
 * ==========================
 *  HELPERS
 * ==========================
 */

// Sequência local de número de proposta
const getNextProposalNumber = () => {
  try {
    const k = 'proposta_seq_number';
    let current = parseInt(localStorage.getItem(k) || '0', 10);
    if (Number.isNaN(current) || current < 0) current = 0;
    const formatted = String(current).padStart(4, '0');
    localStorage.setItem(k, String(current + 1));
    return formatted;
  } catch {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }
};

// Cria contêiner com CSS padrão (preto/branco + caixa alta) e permite modo inline
const createContainer = (id = 'pdf-section', { inline = false } = {}) => {
  const el = document.createElement('div');
  el.id = id;

  if (!inline) {
    el.style.position = 'absolute';
    el.style.left = '-99999px';
    el.style.top = '0';
  } else {
    el.style.position = 'relative';
    el.style.left = '0';
  }

  el.style.width = '1000px'; // base para html2canvas
  el.style.background = '#fff';

  el.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      body, div, p, table, td, th, h1, h2, h3 { margin: 0; padding: 0; }
      .wrap { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 20px; }
      .title {
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.6px;
        font-size: ${STYLE.TITLE_SIZE}px;
        text-align: center;
        margin-bottom: 12px;
      }
      .subtitle {
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.4px;
        font-size: ${STYLE.SUBTITLE_SIZE}px;
        margin: 12px 0 6px 0;
      }
      .kvs {
        text-transform: uppercase;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 10px;                  /* menos espaço entre linhas e colunas */
        font-size: 17px;                /* fonte maior */
        line-height: 1.3;               /* linhas mais compactas */
      }
            .kvs .row { 
        display: grid; 
        grid-template-columns: 150px 1fr; /* menos distância entre label e valor */
        gap: 4px;
        align-items: center;
      }
      .k {font-weight: 700; letter-spacing: 0.4px;}
      .v { font-weight: 500; font-size: 16px; letter-spacing: 0.2px; color: #111; }
      .rule { height: 1px; background: #000; opacity: .25; margin: 10px 0; }
      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: 15px;
        text-transform: uppercase;
      }
      .table th, .table td { border: 1px solid #000; padding: 8px; vertical-align: top; }
      .table th { font-weight: 700; text-align: left; }
      .muted { color: #111; opacity: 0.88; }
      .block { margin-bottom: 16px; }
      .center { text-align: center; }
      .right { text-align: right; }
      .small-gap { margin-top: 10px; }
      .caps { text-transform: uppercase; }
      .lower { text-transform: none; } /* exceção para cláusulas */
      .p { font-size: ${STYLE.BODY_SIZE}px; line-height: 1.45; }
      .p-justify { text-align: justify; }
    </style>
  `;
  return el;
};

// Renderiza cabeçalho/rodapé como canvas e retorna dataURL (reuso)
const renderImageToDataURL = async (src) => {
  const cont = document.createElement('div');
  cont.style.position = 'absolute';
  cont.style.left = '-99999px';
  cont.style.top = '0';
  cont.style.background = '#fff';
  cont.style.width = '1200px';
  cont.innerHTML = `<img src="${src}" style="width:100%;height:auto;display:block;" alt="">`;
  document.body.appendChild(cont);
  const canvas = await html2canvas(cont, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
  document.body.removeChild(cont);
  return canvas.toDataURL('image/jpeg', 0.92);
};

// Desenha uma página no PDF com header/footer + um conteúdo (canvas) centralizado e paginado
const addSectionCanvasPaginated = (pdf, sectionCanvas, headerDataURL, footerDataURL, timestampText) => {
  if (!sectionCanvas || sectionCanvas.width === 0 || sectionCanvas.height === 0) {
    console.warn('⚠️ Pulando seção: canvas vazio');
    return;
  }

  const sectionWpx = sectionCanvas.width;
  const sectionHpx = sectionCanvas.height;

  const mmPerPx = CONTENT_W / sectionWpx;
  const sectionHmm = sectionHpx * mmPerPx;

  const pages = Math.max(1, Math.ceil(sectionHmm / CONTENT_H));

  for (let p = 0; p < pages; p++) {
    if (!(pdf.__firstPageAdded)) {
      pdf.__firstPageAdded = true;
    } else {
      pdf.addPage();
    }

    // Header grande (preenche a largura da página)
    pdf.addImage(headerDataURL, 'PNG', 0, 0, PAGE.width, HEADER_H);

    // Recorte do canvas da seção
    const sliceStartMm = p * CONTENT_H;
    const sliceHeightMm = Math.min(CONTENT_H, sectionHmm - sliceStartMm);
    const sliceStartPx = Math.floor(sliceStartMm / mmPerPx);
    const sliceHeightPx = Math.ceil(sliceHeightMm / mmPerPx);

    const temp = document.createElement('canvas');
    temp.width = sectionWpx;
    temp.height = sliceHeightPx;
    const tctx = temp.getContext('2d');
    tctx.drawImage(
      sectionCanvas,
      0, sliceStartPx, sectionWpx, sliceHeightPx,
      0, 0, sectionWpx, sliceHeightPx
    );
    const imgData = temp.toDataURL('image/jpeg', 0.92);

    // Conteúdo logo após o header, respeitando margem lateral
    const y = HEADER_H + 6; // respiro
    pdf.addImage(imgData, 'JPEG', MARGIN, y, CONTENT_W, sliceHeightMm);

    // Timestamp
    pdf.setFont(STYLE.FONT, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(timestampText, MARGIN, PAGE.height - FOOTER_H - 2);

    // Footer grande
    pdf.addImage(footerDataURL, 'PNG', 0, PAGE.height - FOOTER_H, PAGE.width, FOOTER_H);
  }
};

// Converte um bloco HTML (contêiner) para canvas
const htmlToCanvas = async (container) => {
  document.body.appendChild(container);
  const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
  document.body.removeChild(container);
  return canvas;
};

/**
 * ==========================
 *  FUNÇÕES AUXILIARES
 * ==========================
 */

// Converte marcadores de formatação em HTML
// Uso: **texto** vira <strong>texto</strong>
const formatarTexto = (texto) => {
  if (!texto) return '';
  
  // Converte **texto** em <strong>texto</strong> (negrito)
  let textoFormatado = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  return textoFormatado;
};

/**
 * ==========================
 *  RENDERERS DE SEÇÕES
 * ==========================
 */

// CAPA PADRÃO TKA — texto totalmente alinhado à esquerda e margens otimizadas
const renderCapa = async (pedidoData, numeroProposta, { inline = false } = {}) => {
  const el = createContainer('pdf-capa', { inline });
  
  const lang = getLang(pedidoData);
  const vendedor = pedidoData.vendedor || t(lang, 'notProvided');
  const vendedorTelefone = pedidoData.vendedorTelefone || '';
  const data = new Date().toLocaleDateString('pt-BR');
  const c = pedidoData.clienteData || {};
  const pagamento = pedidoData.pagamentoData || {};
  const tituloProposta = pedidoData.isConcessionariaCompra
    ? t(lang, 'proposalTitlePurchase')
    : t(lang, 'proposalTitleCommercial');
  
  // DEBUG: Ver TODOS os dados que chegam
  console.log('🔍🔍🔍 [renderCapa] pedidoData COMPLETO:', pedidoData);
  console.log('🔍🔍🔍 [renderCapa] pedidoData.carrinho:', pedidoData.carrinho);
  console.log('🔍🔍🔍 [renderCapa] pedidoData.guindastes:', pedidoData.guindastes);
  
  // Pegar dados do equipamento para exibir na capa (mesma lógica do renderEquipamento)
  const guindastesCarrinho = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const itemCarrinho = guindastesCarrinho[0] || {};
  
  console.log('🔍 [renderCapa] itemCarrinho extraído:', itemCarrinho);
  console.log('🔍 [renderCapa] Lista completa de guindastes no banco:', pedidoData.guindastes);
  
  // Log detalhado de cada guindaste no banco
  if (pedidoData.guindastes && pedidoData.guindastes.length > 0) {
    pedidoData.guindastes.forEach((g, idx) => {
      console.log(`🔍 [renderCapa] Guindaste ${idx} no banco:`, {
        id: g.id,
        nome: g.nome,
        modelo: g.modelo,
        finame: g.finame,
        ncm: g.ncm
      });
    });
  } else {
    console.log('⚠️ [renderCapa] pedidoData.guindastes está vazio ou undefined!');
  }
  
  // Buscar dados completos do guindaste no banco
  const banco = (pedidoData.guindastes || []).find(g => {
    console.log('🔍 [renderCapa] Comparando:', {
      'g.id': g?.id,
      'itemCarrinho.id': itemCarrinho?.id,
      'match id': g?.id && itemCarrinho?.id && g.id === itemCarrinho.id,
      'g.nome': g?.nome,
      'itemCarrinho.nome': itemCarrinho?.nome,
      'match nome': g?.nome && itemCarrinho?.nome && g.nome === itemCarrinho.nome,
      'g.modelo': g?.modelo,
      'itemCarrinho.modelo': itemCarrinho?.modelo,
      'match modelo': g?.modelo && itemCarrinho?.modelo && g.modelo === itemCarrinho.modelo
    });
    
    return (g?.id && itemCarrinho?.id && g.id === itemCarrinho.id) ||
           (g?.nome && itemCarrinho?.nome && g.nome === itemCarrinho.nome) ||
           (g?.modelo && itemCarrinho?.modelo && g.modelo === itemCarrinho.modelo);
  });
  
  console.log('🔍 [renderCapa] Banco encontrado?', banco ? '✅ SIM' : '❌ NÃO');
  if (banco) {
    console.log('🔍 [renderCapa] Dados do banco:', {
      id: banco.id,
      nome: banco.nome,
      modelo: banco.modelo,
      finame: banco.finame,
      ncm: banco.ncm
    });
  }
  
  // Criar objeto enriquecido com fallbacks
  const g = {
    ...itemCarrinho,
    ...(banco || {}),
    finame: banco?.finame || itemCarrinho?.finame || t(lang, 'notProvided'),
    ncm: banco?.ncm || itemCarrinho?.ncm || t(lang, 'notProvided')
  };

  const isPrototipo = !!(g?.is_prototipo);
  const prototipoLabel = (g?.prototipo_label || '').trim();
  const prototipoObs = (g?.prototipo_observacoes_pdf || '').trim();
  
  console.log('🔍 [renderCapa] Dados FINAIS do equipamento:', {
    nome: g.nome,
    modelo: g.modelo,
    finame: g.finame,
    ncm: g.ncm,
    codigo_produto: g.codigo_produto
  });
  
  const opcionaisSelecionados = (pedidoData.carrinho || [])
    .filter(i => i.tipo === 'opcional')
    .map(i => i.nome);
  const codigo = generateCodigoProduto(g.modelo || g.nome, opcionaisSelecionados) || g.codigo_produto || '-';
  
  console.log('🔍 [renderCapa] Código gerado:', codigo);

  const enderecoCliente = (() => {
    const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
    const bairro = c.bairro ? ` - ${c.bairro}` : '';
    const cidadeUf = (c.cidade || c.uf)
      ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}`
      : '';
    const cep = c.cep ? ` - CEP: ${c.cep}` : '';
    return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || t(lang, 'notProvided');
  })();

  el.innerHTML += `
    <div class="wrap" style="padding:14px 5mm 14px 12mm; width:250mm; margin:0;">

      <!-- Título -->
      <div style="text-align:center; margin-top:6mm; line-height:1.1;">
        <div style="font-size:7mm; font-weight:700; letter-spacing:0.4mm;">${tituloProposta}</div>
        <div style="font-size:4.7mm; font-weight:600; margin-top:1mm;">
           ${pedidoData.carrinho?.[0]?.modelo?.toUpperCase() || t(lang, 'modelNotProvided')} 
        </div>
        ${isPrototipo ? `
          <div style="margin-top:2.5mm; padding:2.5mm 4mm; border:0.6mm solid #111; display:inline-block; font-weight:800; font-size:3.8mm; letter-spacing:0.2mm;">
            ${t(lang, 'prototypeProposal')}${prototipoLabel ? ` — ${prototipoLabel.toUpperCase()}` : ''}
          </div>
        ` : ''}
        ${pagamento.financiamentoBancario === 'sim' ? `
          <div style="font-size:3.6mm; font-weight:700; margin-top:2mm; letter-spacing:0.2mm; color:#111;">
            ${t(lang, 'modalityFinancing')}
          </div>
        ` : ''}
      </div>

      <!-- BLOCO 1: DADOS STARK -->
      <div style="margin-top:10mm; font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">STARK GUINDASTES LTDA</div>
        <div><b>${t(lang, 'corporateName')}:</b> STARK GUINDASTES LTDA</div>
        <div><b>CNPJ:</b> 33.228.312/0001-06</div>
        <div><b>${t(lang, 'address')}:</b> Rodovia RS-344, S/N – Santa Rosa/RS</div>
        <div><b>${t(lang, 'contact')}:</b> (55) 2120-9961 / comercial@starkindustrial.com</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0;"></div>

      <!-- BLOCO 2: REPRESENTANTE -->
      <div style="font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">${t(lang, 'starkRepresentative')}</div>
        <div><b>${t(lang, 'nameLabel')}:</b> ${vendedor}</div>
        ${vendedorTelefone ? `<div><b>${t(lang, 'phone')}:</b> ${vendedorTelefone}</div>` : ''}
        <div><b>${t(lang, 'company')}:</b> STARK GUINDASTES LTDA</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0;"></div>

      <!-- BLOCO 3: CLIENTE -->
      <div style="font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">${t(lang, 'clienteTitle')}</div>
        <div><b>${t(lang, 'clientName')}:</b> ${c.nome || t(lang, 'notProvided')}</div>
        <div><b>CNPJ/CPF:</b> ${c.documento || t(lang, 'notProvided')}</div>
        <div><b>${t(lang, 'stateRegistration')}:</b> ${c.inscricao_estadual || c.inscricaoEstadual || t(lang, 'notProvided')}</div>
        <div><b>${t(lang, 'address')}:</b> ${enderecoCliente}</div>
        <div><b>${t(lang, 'phone')}:</b> ${c.telefone || t(lang, 'notProvided')}</div>
        <div><b>${t(lang, 'email')}:</b> ${c.email || t(lang, 'notProvided')}</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0;"></div>

      <!-- BLOCO 4: DADOS DO EQUIPAMENTO -->
      <div style="font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:2mm;">${t(lang, 'equipamentoTitle')}</div>

        ${isPrototipo && prototipoObs ? `
          <div style="margin:1mm 0 3mm 0; padding:2.5mm 3mm; border:0.4mm solid #111; font-size:3.6mm; line-height:1.35; font-weight:600;">
            ${prototipoObs}
          </div>
        ` : ''}
        
        <!-- TABELA EM 2 COLUNAS LADO A LADO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:2mm;">
          <!-- COLUNA 1 -->
          <table style="width:100%;border-collapse:collapse;font-size:3.8mm;">
            <tbody>
              <tr style="border-bottom:0.5px solid #ddd;">
                <td style="font-weight:600;width:40%;padding:2mm 1mm;">NOME / MODELO</td>
                <td style="font-weight:700;padding:2mm 1mm;">${(g.nome || g.modelo || 'EQUIPAMENTO')}</td>
              </tr>
              <tr style="border-bottom:0.5px solid #ddd;">
                <td style="font-weight:600;padding:2mm 1mm;">CÓDIGO</td>
                <td style="font-weight:700;padding:2mm 1mm;">${codigo}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- COLUNA 2 -->
          <table style="width:100%;border-collapse:collapse;font-size:3.8mm;">
            <tbody>
              <tr style="border-bottom:0.5px solid #ddd;">
                <td style="font-weight:600;width:40%;padding:2mm 1mm;">FINAME</td>
                <td style="font-weight:700;padding:2mm 1mm;">${g.finame || t(lang, 'notProvided')}</td>
              </tr>
              <tr style="border-bottom:0.5px solid #ddd;">
                <td style="font-weight:600;padding:2mm 1mm;">NCM</td>
                <td style="font-weight:700;padding:2mm 1mm;">${g.ncm || t(lang, 'notProvided')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Linha final e infos da proposta -->
      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0 4mm;"></div>

      <div style="
        display:grid;
        grid-template-columns: repeat(3, 1fr);
        text-align:center;
        font-size:4.2mm;
        letter-spacing:0.1mm;
        gap:8mm;
        margin-top:2mm;
      ">
        <div>
          <div style="font-weight:700;">${t(lang, 'proposalNumber')}</div>
          <div style="font-weight:600;font-size:4.5mm;margin-top:1mm;">#${numeroProposta}</div>
        </div>
        <div>
          <div style="font-weight:700;">${t(lang, 'issueDate')}</div>
          <div style="font-weight:600;font-size:4.5mm;margin-top:1mm;">${data}</div>
        </div>
        <div>
          <div style="font-weight:700;">${t(lang, 'validity')}</div>
          <div style="font-weight:600;font-size:4.5mm;margin-top:1mm;">${t(lang, 'validityDays10')}</div>
        </div>
      </div>

      <!-- FRASE DE IMPACTO PERSONALIZADA -->
      <div style="
        margin-top:8mm;
        padding:0 15mm;
      ">
        <div style="
          padding:20px 30px;
          background:#ffffff;
          border:2px solid #e5e7eb;
          border-radius:8px;
          text-align:center;
        ">
          <p style="
            font-size:20px;
            font-weight:bold;
            color:#000000;
            line-height:1.6;
            margin:0;
            text-align:justify;
            text-align-last:center;
          ">
            ${tr(lang, 'impactPhrase', { cliente: (c.nome || 'Cliente'), equip: (g.nome || g.modelo || 'Guindaste') })}
          </p>
        </div>
      </div>
    </div>
  `;

  return el;
};

// DADOS DO CLIENTE (se quiser manter como seção separada em outras páginas)
const renderCliente = (pedidoData, { inline = false } = {}) => {
  const c = pedidoData.clienteData || {};
  const lang = getLang(pedidoData);
  const endereco = (() => {
    const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
    const bairro = c.bairro ? ` - ${c.bairro}` : '';
    const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
    const cep = c.cep ? ` - CEP: ${c.cep}` : '';
    const linha = `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim();
    return linha || (c.endereco || t(lang, 'notProvided'));
  })();

  const el = createContainer('pdf-cliente', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">${t(lang, 'clientDataTitle')}</div>
      <div class="kvs">
        <div class="row"><div class="k">${t(lang, 'name')}</div><div class="v">${c.nome || t(lang, 'notProvided')}</div></div>
        <div class="row"><div class="k">CNPJ/CPF</div><div class="v">${c.documento || t(lang, 'notProvided')}</div></div>
        <div class="row"><div class="k">${t(lang, 'stateRegistration')}</div><div class="v">${c.inscricao_estadual || c.inscricaoEstadual || t(lang, 'notProvided')}</div></div>
        <div class="row"><div class="k">${t(lang, 'phone')}</div><div class="v">${c.telefone || t(lang, 'notProvided')}</div></div>
        <div class="row"><div class="k">${t(lang, 'email')}</div><div class="v">${c.email || t(lang, 'notProvided')}</div></div>
        <div class="row"><div class="k">${t(lang, 'address')}</div><div class="v">${endereco}</div></div>
      </div>
      ${c.observacoes ? `
        <div class="subtitle">${t(lang, 'observations')}</div>
        <div class="p caps">${c.observacoes}</div>
      ` : ''}
    </div>
  `;
  return el;
};

// EQUIPAMENTO / PRODUTO
const renderEquipamento = (pedidoData, { inline = false } = {}) => {
  const lang = getLang(pedidoData);
  console.log(' [renderEquipamento] Dados recebidos:', {
    carrinho: pedidoData.carrinho,
    guindastes: pedidoData.guindastes
  });

  const guindastes = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const opcionais = (pedidoData.carrinho || []).filter(i => i.tipo === 'opcional');

  const enrich = (item) => {
    console.log(' [enrich] Processando item:', {
      id: item.id,
      nome: item.nome,
      modelo: item.modelo,
      finame: item.finame,
      ncm: item.ncm
    });

    // Buscar dados completos do guindaste
    const banco = (pedidoData.guindastes || []).find(g => 
      (g?.id && item?.id && g.id === item.id) ||
      (g?.nome && item?.nome && g.nome === item.nome) ||
      (g?.modelo && item?.modelo && g.modelo === item.modelo)
    );

    if (banco) {
      console.log(' [enrich] Dados encontrados no banco:', {
        id: banco.id,
        nome: banco.nome,
        finame: banco.finame,
        ncm: banco.ncm
      });
    } else {
      console.log(' [enrich] Nenhum dado adicional encontrado no banco para o item:', item.id || item.nome);
    }

    // Criar objeto enriquecido com fallbacks
    const enriched = {
      ...item,
      ...(banco || {}),
      descricao: banco?.descricao || item?.descricao || '',
      finame: banco?.finame || item?.finame || t(lang, 'notProvided'),
      ncm: banco?.ncm || item?.ncm || t(lang, 'notProvided')
    };

    console.log(' [enrich] Dados finais do item:', {
      id: enriched.id,
      nome: enriched.nome,
      finame: enriched.finame,
      ncm: enriched.ncm
    });

    return enriched;
  };

  const gList = guindastes.map(enrich);
  console.log('📋 [renderEquipamento] Lista de guindastes processada:', gList);
  
  // Log detalhado dos dados que estão chegando
  console.log('🔍 [renderEquipamento] Dados completos do primeiro guindaste:', gList[0]);
  console.log('🔍 [renderEquipamento] Dados completos do pedidoData:', {
    carrinho: pedidoData.carrinho[0],
    guindastes: pedidoData.guindastes[0]
  });

  const el = createContainer('pdf-equipamento', { inline });
  let html = `
    <div class="wrap" style="padding:22px;">
    <div style="page-break-before: always;"></div>
      <div class="title" style="font-size:26px;margin-bottom:16px;">${t(lang, 'equipmentTechDescription')}</div>
  `;

  if (gList.length === 0) {
    html += `<div class="p caps">${t(lang, 'noMainEquipment')}</div>`;
  } else {
    gList.forEach((g, idx) => {
      const desc = formatarTexto(g.descricao) || '';
      const naoIncluido = formatarTexto(g.nao_incluido) || '';
      const descLang = lang === 'es' ? translatePtToEsHeuristic(desc) : desc;
      const naoIncluidoLang = lang === 'es' ? translatePtToEsHeuristic(naoIncluido) : naoIncluido;

      html += `
        ${idx > 0 ? '<div class="rule"></div>' : ''}
        <div class="p p-justify caps" style="white-space: pre-line; font-size: 13px; line-height: 1.25;">${descLang || t(lang, 'notProvided')}</div>

        <div class="small-gap"></div>
        <div class="subtitle">${t(lang, 'notIncluded')}</div>
        <div class="p p-justify caps" style="white-space: pre-line; font-size: 13px; line-height: 1.25;">${naoIncluidoLang || t(lang, 'notProvided')}</div>
        <!-- PROGRAMA DE REVISÕES DENTRO DA GARANTIA -->
<div class="small-gap"></div>
<div class="subtitle">${t(lang, 'warrantyProgramTitle')}</div>
<div class="p lower" style="font-size: 13px; line-height: 1.35; text-transform:none;">
  <ul style="margin-left: 16px; padding-left: 8px; list-style-type: disc;">
    <li>${t(lang, 'warrantyBullet1')}</li>
    <ul style="margin-left: 20px; list-style-type: circle;">
      <li>${t(lang, 'warrantyBullet2')}</li>
      <li>${t(lang, 'warrantyBullet3')}</li>
    </ul>
        <li>${t(lang, 'warrantyBullet4')}</li>
        <li>${t(lang, 'warrantyBullet5')}</li>
      </ul>
        <li>${t(lang, 'warrantyBullet6')}</li>
        <li>${t(lang, 'warrantyBullet7')}</li>
        <li>${t(lang, 'warrantyBullet8')}</li>
        <li>${t(lang, 'warrantyBullet9')}</li>
       <li>${t(lang, 'warrantyBullet10')}</li>
      `;
    });
  }

  if (opcionais.length > 0) {
    html += `
      <div class="rule"></div>
      <div class="subtitle">${t(lang, 'selectedOptionals')}</div>
      <table class="table">
        <thead>
          <tr>
            <th>${t(lang, 'optional')}</th>
            <th>${t(lang, 'description')}</th>
            <th class="right">${t(lang, 'price')}</th>
          </tr>
        </thead>
        <tbody>
          ${opcionais.map(op => `
            <tr>
              <td>${op.nome}</td>
              <td>${op.descricao || '-'}</td>
              <td class="right">${formatCurrency(op.preco || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  html += `
    </div>
  `;
  
  el.innerHTML += html;
  return el;
};

// DADOS DO CAMINHÃO
const renderCaminhao = (pedidoData, { inline = false } = {}) => {
  const v = pedidoData.caminhaoData || {};
  const lang = getLang(pedidoData);
  const el = createContainer('pdf-caminhao', { inline });

  el.innerHTML += `
    <div class="wrap" style="padding:18px;">
      <div class="title" style="font-size:20px;margin-bottom:10px;">${t(lang, 'vehicleDataTitle')}</div>
      
      <!-- TABELA EM 2 COLUNAS LADO A LADO -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:8px;">
        <!-- COLUNA 1 -->
        <table class="table" style="font-size:13px;">
          <tbody>
            <tr>
              <td style="font-weight:600;width:35%;">${t(lang, 'type')}</td>
              <td style="font-weight:700;">${v.tipo || t(lang, 'notProvided')}</td>
            </tr>
            <tr>
              <td style="font-weight:600;">${t(lang, 'brand')}</td>
              <td style="font-weight:700;">${v.marca || t(lang, 'notProvided')}</td>
            </tr>
            <tr>
              <td style="font-weight:600;">MODELO</td>
              <td style="font-weight:700;">${v.modelo || t(lang, 'notProvided')}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- COLUNA 2 -->
        <table class="table" style="font-size:13px;">
          <tbody>
            <tr>
              <td style="font-weight:600;width:35%;">${t(lang, 'year')}</td>
              <td style="font-weight:700;">${v.ano || t(lang, 'notProvided')}</td>
            </tr>
            <tr>
              <td style="font-weight:600;">${t(lang, 'voltage')}</td>
              <td style="font-weight:700;">${v.voltagem || t(lang, 'notProvided')}</td>
            </tr>
            ${v.observacoes ? `
              <tr>
                <td colspan="2" style="font-weight:600;background:#f9f9f9;padding:8px;border-left:3px solid #333334ff;">
                  <div style="font-size:11px;color:#666;margin-bottom:3px;">${t(lang, 'observations')}:</div>
                  <div style="font-size:12px;">${v.observacoes}</div>
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
  return el;
};

// ESTUDO VEICULAR
const renderEstudoVeicular = (pedidoData, { inline = false } = {}) => {
  const v = pedidoData.caminhaoData || {};
  const temMedidas = v.medidaA || v.medidaB || v.medidaC || v.medidaD || v.comprimentoChassi;
  const lang = getLang(pedidoData);

  const el = createContainer('pdf-estudo', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:18px;">
      <div class="title" style="font-size:20px;margin-bottom:10px;">${t(lang, 'vehicleStudyTitle')}</div>
      <div class="center" style="margin:8px 0;">
        <img src="/estudoveicular.png" alt="Estudo Veicular" style="max-width:600px;width:100%;height:auto;"/>
      </div>
      ${
        temMedidas ? `
          <!-- MEDIDAS E PATOLAMENTO LADO A LADO -->
          <div style="display:grid;grid-template-columns:${v.patolamento ? '2fr 1fr' : '1fr'};gap:12px;margin-top:10px;">
            <!-- TABELA DE MEDIDAS -->
            <table class="table" style="font-size:13px;">
              <thead>
                <tr>
                  <th style="width:65%;text-align:left;background:#f5f5f5;font-size:12px;">${t(lang, 'measure')}</th>
                  <th style="width:35%;text-align:center;background:#f5f5f5;font-size:12px;">${t(lang, 'value')}</th>
                </tr>
              </thead>
              <tbody>
                ${v.medidaA ? `
                  <tr>
                    <td style="font-weight:600;font-size:12px;">A (Chassi ao Assoalho)</td>
                    <td style="text-align:center;font-weight:700;font-size:15px;">${v.medidaA}cm</td>
                  </tr>
                ` : ''}
                ${v.medidaB ? `
                  <tr>
                    <td style="font-weight:600;font-size:12px;">B (Chassi)</td>
                    <td style="text-align:center;font-weight:700;font-size:15px;">${v.medidaB}cm</td>
                  </tr>
                ` : ''}
                ${v.medidaC ? `
                  <tr>
                    <td style="font-weight:600;font-size:12px;">C (Solo ao Chassi)</td>
                    <td style="text-align:center;font-weight:700;font-size:15px;">${v.medidaC}cm</td>
                  </tr>
                ` : ''}
                ${v.medidaD ? `
                  <tr>
                    <td style="font-weight:600;font-size:12px;">D (Dist. Entre Eixos)</td>
                    <td style="text-align:center;font-weight:700;font-size:15px;">${v.medidaD}cm</td>
                  </tr>
                ` : ''}
                ${v.comprimentoChassi ? `
                  <tr>
                    <td style="font-weight:600;font-size:12px;">📏 Comprimento do Chassi</td>
                    <td style="text-align:center;font-weight:700;font-size:15px;">${v.comprimentoChassi}cm</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
            
            <!-- PATOLAMENTO COMPACTO -->
            ${v.patolamento ? `
              <div style="padding:15px;background:linear-gradient(135deg, #525255ff 0%, #3d3c35ff 100%);border-radius:6px;text-align:center;border:2px solid #555;display:flex;flex-direction:column;justify-content:center;">
                <div style="color:white;font-size:12px;font-weight:600;margin-bottom:8px;">⚙️ ${t(lang, 'patolamento')}</div>
                <div style="color:#ffd700;font-size:36px;font-weight:bold;letter-spacing:2px;line-height:1;">${v.patolamento}</div>
                <div style="color:white;font-size:11px;opacity:0.9;margin-top:8px;font-weight:500;">
                  ${parseFloat(v.medidaC) >= 70 ? 'C ≥ 70cm' : parseFloat(v.medidaC) >= 60 ? 'C: 60-69cm' : 'C < 60cm'}
                </div>
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="p caps center" style="margin-top:10px;">${t(lang, 'measuresNotProvided')}</div>
        `
      }
    </div>
  `;
  return el;
};

// CONDIÇÕES COMERCIAIS E FINANCEIRAS
// CONDIÇÕES COMERCIAIS E FINANCEIRAS + DADOS BANCÁRIOS COM ÍCONES
const renderFinanceiro = async (pedidoData, { inline = false } = {}) => {
  const p = pedidoData.pagamentoData || {};
  const lang = getLang(pedidoData);
  const totalBase = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);
  const extraValor = parseFloat(p.extraValor || 0);
  const extraDescricao = (p.extraDescricao || '').trim();
  const observacoesNegociacao = (p.observacoesNegociacao || '').trim();
  const tipoClienteCalc = (p.tipoCliente || p.tipoPagamento || '').toString().toLowerCase();
  const percentualEntradaNum = parseFloat(p.percentualEntrada || 0) || 0;
  
  // CÁLCULOS CORRETOS SEGUINDO A LÓGICA:
  // 1. Aplicar descontos SOBRE O VALOR BASE (não sobre subtotal)
  const valorDescontoVendedor = p.desconto ? (totalBase * p.desconto / 100) : 0;
  const valorDescontoPrazo = p.descontoPrazo ? (totalBase * p.descontoPrazo / 100) : 0;
  const valorAcrescimo = p.acrescimo ? (totalBase * p.acrescimo / 100) : 0;
  
  // 2. Base com descontos aplicados
  const baseComDescontos = totalBase - valorDescontoVendedor - valorDescontoPrazo + valorAcrescimo;

  // Fonte de verdade (quando existir): valor final calculado na política
  const valorFinalPolitica = parseFloat(p.valorFinal || p.total || 0) || 0;

  // Alguns cenários chegam com tipoFrete=CIF mas valorFrete=0 no pagamentoData.
  // Se tivermos valorFinal vindo da política, inferimos o frete pela diferença.
  const valorFreteInformado = parseFloat(p.valorFrete || 0) || 0;
  const valorInstalacaoInformado = parseFloat(p.valorInstalacao || 0) || 0;
  const freteInferido = (
    String(p.tipoFrete).toUpperCase() === 'CIF' &&
    valorFreteInformado === 0 &&
    valorFinalPolitica > 0
  )
    ? Math.max(0, valorFinalPolitica - (baseComDescontos + extraValor + valorInstalacaoInformado))
    : 0;
  const valorFreteFinal = valorFreteInformado || freteInferido;
  
  // 3. Adicionar extras (sem desconto), frete e instalação
  const subtotalComAdicionais = baseComDescontos + extraValor + valorFreteFinal + valorInstalacaoInformado;

  // 4. Valor Total Final
  const valorTotalFinal = valorFinalPolitica > 0 ? valorFinalPolitica : subtotalComAdicionais;

  const moeda = String(p.moeda || 'BRL').toUpperCase();
  const cotacaoUsd = Number(p.cotacao_usd);
  const isUSD = moeda === 'USD';
  const fmt = isUSD ? formatCurrencyUSD : formatCurrency;
  const divisor = isUSD && Number.isFinite(cotacaoUsd) && cotacaoUsd > 0 ? cotacaoUsd : 1;
  const convert = (v) => (Number(v) || 0) / divisor;
  
  // 4. Entrada
  const entradaTotalCalc = p.entradaTotal || (p.percentualEntrada ? (valorTotalFinal * p.percentualEntrada / 100) : 0);
  const sinalPago = p.valorSinal || 0;
  
  // 5. Saldo a Pagar (o que falta após entrada e sinal)
  const saldoAPagarCalc = valorTotalFinal - entradaTotalCalc;

  // 6. RECALCULAR PARCELAS com base no saldo correto
  const numParcelas = p.parcelas?.length || 1;
  const valorParcela = saldoAPagarCalc / numParcelas;
  let somaAcumulada = 0;
  const parcelasCorrigidas = p.parcelas?.map((parcela, idx) => {
    const isUltima = idx === numParcelas - 1;
    const valor = isUltima 
      ? Math.round((saldoAPagarCalc - somaAcumulada) * 100) / 100
      : Math.round(valorParcela * 100) / 100;
    somaAcumulada += valor;
    return {
      ...parcela,
      valor
    };
  }) || [];

  const concessionariaLogo = pedidoData?.concessionariaLogoUrl || '';
  const dadosBancariosConcessionaria = (pedidoData?.concessionariaDadosBancarios || '').trim();
  const concessionariaNome = (pedidoData?.concessionariaNome || '').trim();
  const usarDadosConcessionaria = Boolean(dadosBancariosConcessionaria || concessionariaLogo);

  // Carregar logos dos bancos como base64
  const logoBB = await renderImageToDataURL('/banco do brasil.jfif');
  const logoSicredi = await renderImageToDataURL('/sicredi.png');
  const logoSicoob = await renderImageToDataURL('/sicoob.png');

  const el = createContainer('pdf-financeiro', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:14px 10px;">
      <div class="title" style="font-size:26px; margin-bottom:12px; font-weight:800;">${t(lang, 'conditionsTitle')}</div>

      ${isUSD ? `
        <div style="margin-top:-4px; margin-bottom:10px; padding:8px 10px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:800; font-size:14px; margin-bottom:4px;">USD</div>
          <div style="font-weight:600; font-size:12px;">${t(lang, 'exchangeRateApplied')}: 1 USD = ${formatCurrency(cotacaoUsd || 0)}</div>
        </div>
      ` : ''}

      ${p.financiamentoBancario === 'sim' ? `
        <div style="margin-top:-4px; margin-bottom:10px; padding:8px 10px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#000;">${t(lang, 'financingModeShort')}</div>
        </div>
      ` : ''}

      ${observacoesNegociacao ? `
        <div style="margin-top:10px; padding:10px 12px; background:#fff; border:1px solid #ddd; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#000; margin-bottom:6px;">${t(lang, 'negotiationNotes')}</div>
          <div style="font-size:13px; color:#000; line-height:1.4; white-space:pre-line; font-weight:600;">${observacoesNegociacao}</div>
        </div>
      ` : ''}

      <!-- LAYOUT 2 COLUNAS: VALOR BASE + DESCONTOS -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
        
        <!-- COLUNA 1: VALOR BASE -->
        <div style="padding:12px; background:#f8f9fa; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">${t(lang, 'baseEquipmentValue')}</div>
          <div style="font-size:24px; font-weight:700; color:#000;">${fmt(convert(totalBase))}</div>
        </div>

        <!-- COLUNA 2: DESCONTOS -->
        ${(p.desconto || p.descontoPrazo || p.acrescimo) ? `
          <div style="padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">${t(lang, 'discountsAndAdjustments')}</div>
            ${p.desconto ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                <span style="font-weight:600; color:#000;">${t(lang, 'sellerDiscount')} (${p.desconto}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">- ${fmt(convert(valorDescontoVendedor))}</span>
              </div>
            ` : ''}
            ${p.descontoPrazo ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                <span style="font-weight:600; color:#000;">${t(lang, 'termDiscount')} (${p.descontoPrazo}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">- ${fmt(convert(valorDescontoPrazo))}</span>
              </div>
            ` : ''}
            ${p.acrescimo ? `
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="font-weight:600; color:#000;">${t(lang, 'surcharge')} (${p.acrescimo}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorAcrescimo))}</span>
              </div>
            ` : ''}
          </div>
        ` : '<div></div>'}
      </div>

      <!-- FRETE E INSTALAÇÃO -->
      ${(p.tipoFrete || p.tipoInstalacao || valorFreteFinal || valorInstalacaoInformado) ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">${t(lang, 'freightAndInstallation')}</div>
          ${p.tipoFrete ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
              <span style="font-weight:600; color:#000;">${t(lang, 'freight')}: ${String(p.tipoFrete).toUpperCase()}${p.valorFrete > 0 ? ` - ${t(lang, 'included')}` : ''}</span>
              ${valorFreteFinal > 0 ? `
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorFreteFinal))}</span>
              ` : `
                <span style="color:#555; font-size:12px;">${t(lang, 'customerPaysDirectly')}</span>
              `}
            </div>
          ` : ''}
          ${p.tipoInstalacao ? `
            <div style="display:flex; justify-content:space-between; font-size:14px;">
              <span style="font-weight:600; color:#000;">${t(lang, 'installation')}: ${p.tipoInstalacao.toUpperCase()}</span>
              ${valorInstalacaoInformado > 0 ? `
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorInstalacaoInformado))}</span>
              ` : `
                <span style="color:#555; font-size:12px;">${t(lang, 'customerPaysDirectly')}</span>
              `}
            </div>
          ` : ''}
          ${p.localInstalacao ? `
            <div style="margin-top:5px; padding-top:5px; border-top:1px solid #ddd; font-size:13px;">
              <span style="font-weight:600; color:#000;">📍 ${t(lang, 'installationLocation')}:</span>
              <span style="font-weight:700; color:#000; margin-left:5px;">${p.localInstalacao.toUpperCase()}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${(extraValor > 0) ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">${t(lang, 'extra')}</div>
          <div style="display:flex; justify-content:space-between; font-size:14px;">
            <span style="font-weight:600; color:#000;">${extraDescricao ? extraDescricao.toUpperCase() : t(lang, 'commercialAdjustment')}</span>
            <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(extraValor))}</span>
          </div>
        </div>
      ` : ''}

      ${(parseFloat(p.valorConversor || 0) > 0) ? `
        <div style="margin-top:12px; padding:12px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">⚡ CONVERSOR DE VOLTAGEM</div>
          <div style="display:flex; justify-content:space-between; font-size:14px;">
            <span style="font-weight:600; color:#000;">CONTROLE REMOTO + CAMINHÃO 12V</span>
            <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(parseFloat(p.valorConversor || 0)))}</span>
          </div>
          <div style="margin-top:5px; font-size:12px; color:#856404; font-style:italic;">
            * Necessário conversor de voltagem para compatibilidade
          </div>
        </div>
      ` : ''}

      <!-- VALOR TOTAL -->
      <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:18px; color:#000;">${t(lang, 'totalProposal')}</span>
          <span style="font-weight:800; font-size:26px; color:#000;">${fmt(convert(valorTotalFinal))}</span>
        </div>
      </div>

      <!-- ENTRADA (se houver) -->
      ${(tipoClienteCalc === 'cliente' && percentualEntradaNum > 0) ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">④ ${t(lang, 'entry')} (${percentualEntradaNum}% do valor total)</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
            <span style="font-weight:600; color:#000;">${t(lang, 'entryValue')}</span>
            <span style="font-weight:700; font-size:20px; color:#000;">${fmt(convert(entradaTotalCalc))}</span>
          </div>
          ${p.formaEntrada ? `
            <div style="margin-bottom:6px; padding:8px; background:#fff; border-radius:4px; border:1px solid #ddd;">
              <span style="font-weight:600; color:#000; font-size:13px;">💳 ${t(lang, 'paymentMethod')}:</span>
              <span style="font-weight:700; color:#000; margin-left:5px; font-size:14px;">${p.formaEntrada.toUpperCase()}</span>
            </div>
          ` : ''}
          ${sinalPago > 0 ? `
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid #ddd; margin-top:6px; font-size:13px;">
              <span style="font-weight:600; color:#000;">${t(lang, 'downPaymentPaid')}</span>
              <span style="font-weight:700; color:#000; font-size:14px;">${fmt(convert(sinalPago))}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:13px;">
              <span style="font-weight:600; color:#000;">${t(lang, 'remainingToPay')}</span>
              <span style="font-weight:700; color:#000; font-size:14px;">${fmt(convert(entradaTotalCalc - sinalPago))}</span>
            </div>
          ` : ''}
        </div>

        <!-- SALDO A PAGAR -->
        <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:6px;">⑤ ${t(lang, 'balanceToPay')}</div>
          <div style="font-size:13px; color:#000; margin-bottom:6px;">${t(lang, 'thisAmountWillBeInstallments')}</div>
          <div style="font-weight:800; font-size:24px; color:#000;">${fmt(convert(saldoAPagarCalc))}</div>
        </div>
      ` : ''}

      <!-- PRAZO E PARCELAMENTO UNIFICADOS -->
      ${(parcelasCorrigidas && parcelasCorrigidas.length > 0 && p.prazoPagamento && p.prazoPagamento.toLowerCase() !== 'à vista') ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">
            ${tipoClienteCalc === 'cliente' && percentualEntradaNum > 0 ? '⑥' : '④'} ${t(lang, 'term')}: ${(p.prazoPagamento || '').replaceAll('_',' ').toUpperCase()}
          </div>
          <div style="font-size:13px; color:#000; margin-bottom:8px; font-weight:600;">${t(lang, 'balanceOf')} ${fmt(convert(saldoAPagarCalc))} ${t(lang, 'dividedInto')} ${parcelasCorrigidas.length} ${t(lang, 'installments')}:</div>
          <div style="display:grid; grid-template-columns:repeat(${parcelasCorrigidas.length > 3 ? '4' : parcelasCorrigidas.length > 2 ? '3' : '2'}, 1fr); gap:8px;">
            ${parcelasCorrigidas.map((parcela, idx) => `
              <div style="background:#fff; padding:8px; border-radius:4px; text-align:center; border:1px solid #ddd;">
                <div style="font-size:12px; color:#000; margin-bottom:3px; font-weight:600;">${t(lang, 'installment')} ${parcela.numero || idx + 1}</div>
                <div style="font-weight:700; color:#000; font-size:16px;">${fmt(convert(parcela.valor || 0))}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- DADOS BANCÁRIOS (MESMA PÁGINA) -->
      <div style="margin-top:16px; padding-top:12px; border-top:2px solid #ddd;">
        ${usarDadosConcessionaria ? `
          <div style="font-weight:700; font-size:16px; text-transform:uppercase; margin-bottom:10px; color:#000;">
            DADOS BANCÁRIOS – ${concessionariaNome || 'CONCESSIONÁRIA'}
          </div>
          ${concessionariaLogo ? `
            <img src="${concessionariaLogo}" alt="Logo Concessionária" style="max-width:140px; max-height:60px; margin-bottom:10px; display:block;"/>
          ` : ''}
          <div style="font-size:12px; line-height:1.6; white-space:pre-line; font-weight:600;">
            ${dadosBancariosConcessionaria || 'Dados bancários não informados.'}
          </div>
        ` : `
          <div style="font-weight:700; font-size:16px; text-transform:uppercase; margin-bottom:10px; color:#000;">${t(lang, 'bankData')}</div>
          
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; font-size:12px; line-height:1.5;">
            <div>
              <img src="${logoBB}" alt="Banco do Brasil" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
              <div style="font-weight:700; font-size:13px;">Banco do Brasil (001)</div>
              <div style="font-weight:600;">Ag: 0339-5</div>
              <div style="font-weight:600;">CC: 60548-4</div>
            </div>

            <div>
              <img src="${logoSicredi}" alt="Sicredi" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
              <div style="font-weight:700; font-size:13px;">Sicredi (748)</div>
              <div style="font-weight:600;">Ag: 0307</div>
              <div style="font-weight:600;">CC: 40771-1</div>
            </div>

            <div>
              <img src="${logoSicoob}" alt="Sicoob" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
              <div style="font-weight:700; font-size:13px;">Sicoob (756)</div>
              <div style="font-weight:600;">Ag: 3072-4</div>
              <div style="font-weight:600;">CC: 33276-3</div>
            </div>
          </div>

          <div style="margin-top:10px; font-size:12px; line-height:1.6;">
            <div style="font-weight:700;">Stark guindastes Ltda | CNPJ: 33.228.312/0001-06</div>
            <div style="margin-top:5px; font-weight:600;">
              Pix CNPJ: <b>33228312000106</b> (Sicredi) | 
              Pix e-mail: <b>financeiro@starkindustrial.ind.br</b> (BB)
            </div>
          </div>
        `}
      </div>
    </div>
  `;
  return el;
};

// CLÁUSULAS + ASSINATURAS
const renderClausulas = (pedidoData, { inline = false } = {}) => {
  const lang = getLang(pedidoData);
  const clausulasPt = [
    'O prazo de validade deste pedido será de 10 dias contados após a assinatura do mesmo para pagamento via recurso próprio e 30 dias para financiamento bancário.',
    'Caso haja a necessidade de inclusão e ou modificação de modelo da caixa de patola auxiliar no equipamento (mediante estudo de integração veicular), o custo não será de responsabilidade da STARK Guindastes.',
    'Caminhões com Caixa de Câmbio Automática exigem parametrização em concessionária para a habilitação e funcionamento da Tomada de Força. O custo deste serviço não está incluso nesta proposta.',
    'O prazo de entrega do equipamento terá início a partir do recebimento da autorização de faturamento quando via banco, do pagamento de 100% da entrada quando via parcelado fábrica e 100% do valor do equipamento quando à vista.',
    'Vendas com parcelamento fábrica, é obrigatório o envio da documentação solicitada para análise de crédito em até 5 (cinco) dias úteis.',
    'O embarque do equipamento está condicionado ao pagamento de 100% do valor acordado e contrato de reserva de domínio assinado e com firma reconhecida para os casos de financiamento fábrica.',
    'As condições deste pedido são válidas somente para os produtos e quantidades constantes no mesmo.',
    'O atendimento deste pedido está sujeito a análise cadastral e de crédito, quando a condição de pagamento for a prazo.',
    'É obrigatório informar placa, chassi e modelo de caminhão para confecção do Contrato de Reserva de Domínio.',
    'Se houver diferença de alíquota de ICMS, a mesma será de responsabilidade do comprador, conforme legislação vigente em seu estado de origem.',
    'Quando a retirada for por conta do cliente, o motorista transportador deverá estar devidamente autorizado e com carteira de motorista válida.',
    'O atraso na definição do veículo ou no encaminhamento para montagem prorroga automaticamente o prazo de entrega em dias úteis equivalentes.',
    'Em vendas a prazo, a inadimplência suspende a garantia contratual do equipamento no período, com multa de 2% e juros de 0,33% ao dia.',
    'É obrigatório o estudo de integração veicular para a montagem do equipamento; sem o estudo, a STARK não se responsabiliza pela montagem.',
    'A STARK Guindastes não se responsabiliza por despesas extras com o caminhão (ex.: deslocamento de arla, aumento de entre-eixo, reforço de molas, parametrizações etc.).',
    'No faturamento, o preço do equipamento será atualizado conforme a tabela vigente, condicionando o embarque ao pagamento da diferença.',
    'As assinaturas abaixo formalizam o presente pedido e a concordância com os termos e condições.',
    'Refere-se Instalação do Guindaste no Caminhão do cliente Comprador apenas a Implementação do Guindaste no Caminhão, demais alterações Provenientes em Virtude para Permitir a Implementação, não Estão Previstas nos Custos desta Proposta, que devem Obrigatoriamente serem Alinhados e Estritamente Concensado entre Instalador e Cliente Comprador, sem Qualquer Onus Financeiro a Stark.'
  ];

  const clausulasEs = [
    'El plazo de validez de este pedido será de 10 días contados después de su firma para pago con recursos propios y 30 días para financiación bancaria.',
    'En caso de que sea necesaria la inclusión y/o modificación del modelo de la caja de pata auxiliar en el equipo (mediante estudio de integración vehicular), el costo no será responsabilidad de STARK Guindastes.',
    'Camiones con caja de cambios automática requieren parametrización en concesionario para habilitar y operar la toma de fuerza. El costo de este servicio no está incluido en esta propuesta.',
    'El plazo de entrega del equipo comenzará a partir de la recepción de la autorización de facturación cuando sea vía banco, del pago del 100% de la entrada cuando sea vía parcelado fábrica y del 100% del valor del equipo cuando sea al contado.',
    'En ventas con parcelamiento de fábrica, es obligatorio el envío de la documentación solicitada para análisis de crédito en hasta 5 (cinco) días hábiles.',
    'El embarque del equipo está condicionado al pago del 100% del valor acordado y al contrato de reserva de dominio firmado y con firma certificada para los casos de financiación de fábrica.',
    'Las condiciones de este pedido son válidas solamente para los productos y cantidades que constan en el mismo.',
    'La atención de este pedido está sujeta a análisis de registro y crédito, cuando la condición de pago sea a plazo.',
    'Es obligatorio informar placa, chasis y modelo de camión para la confección del Contrato de Reserva de Dominio.',
    'Si hubiera diferencia de alícuota de ICMS, la misma será responsabilidad del comprador, conforme la legislación vigente en su estado de origen.',
    'Cuando el retiro sea por cuenta del cliente, el conductor transportista deberá estar debidamente autorizado y con licencia de conducir válida.',
    'El atraso en la definición del vehículo o en el envío para montaje prorroga automáticamente el plazo de entrega en días hábiles equivalentes.',
    'En ventas a plazo, la morosidad suspende la garantía contractual del equipo en el período, con multa del 2% e intereses del 0,33% al día.',
    'Es obligatorio el estudio de integración vehicular para el montaje del equipo; sin el estudio, STARK no se responsabiliza por el montaje.',
    'STARK Guindastes no se responsabiliza por gastos extra con el camión (ej.: reubicación de arla, aumento de distancia entre ejes, refuerzo de ballestas, parametrizaciones, etc.).',
    'En la facturación, el precio del equipo será actualizado conforme a la tabla vigente, condicionando el embarque al pago de la diferencia.',
    'Las firmas abajo formalizan el presente pedido y la concordancia con los términos y condiciones.',
    'La instalación de la grúa en el camión del cliente comprador se refiere únicamente a la implementación de la grúa en el camión; demás alteraciones necesarias para permitir la implementación no están previstas en los costos de esta propuesta y deberán ser alineadas y estrictamente acordadas entre instalador y cliente comprador, sin ningún cargo financiero para Stark.'
  ];

  const clausulas = lang === 'es' ? clausulasEs : clausulasPt;

  const el = createContainer('pdf-clausulas', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">${t(lang, 'clausesTitle')}</div>
      <div class="lower" style="font-size:${STYLE.CLAUSE_SIZE}px; line-height:1.28;">
        ${clausulas.map((c, i) => `<p class="p p-justify lower" style="margin-bottom:4px;">${i + 1}. ${c}</p>`).join('')}
      </div>
    </div>
  `;
  return el;
};

const renderAssinaturas = (pedidoData, { inline = false } = {}) => {
  const lang = getLang(pedidoData);
  let vendedor = pedidoData.vendedor || '';
  try {
    if (!vendedor) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      vendedor = u.nome || '';
    }
  } catch {}
  if (!vendedor) vendedor = t(lang, 'notProvided');

  const cliente = (pedidoData.clienteData && pedidoData.clienteData.nome) ? pedidoData.clienteData.nome : t(lang, 'notProvided');

  const el = createContainer('pdf-assinaturas', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">${t(lang, 'signaturesTitle')}</div>
      <div style="margin-top:24px; display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="center">
          <div style="height: 56px;"></div>
          <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 14px;">${t(lang, 'signatureClient')}: ${cliente.toUpperCase()}</div>
        </div>
        <div class="center">
          <div style="height: 56px;"></div>
          <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 14px;">${t(lang, 'signatureSeller')}: ${vendedor.toUpperCase()}</div>
        </div>
      </div>
    </div>
  `;
  return el;
};

// ====================================
//  PDF SIMPLIFICADO - COMPRA CONCESSIONÁRIA
// ====================================

// CAPA SIMPLIFICADA para pedido de compra concessionária
const renderCapaCompraConcessionaria = (pedidoData, numeroProposta, { inline = false } = {}) => {
  const el = createContainer('pdf-capa-compra', { inline });
  const data = new Date().toLocaleDateString('pt-BR');
  const c = pedidoData.clienteData || {};
  const vendedor = pedidoData.vendedor || 'Não informado';
  const vendedorTelefone = pedidoData.vendedorTelefone || '';
  const guindastes = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const opcionais = (pedidoData.carrinho || []).filter(i => i.tipo === 'opcional');
  const totalEquipamentos = guindastes.reduce((acc, g) => acc + ((parseFloat(g.preco) || 0) * (parseInt(g.quantidade, 10) || 1)), 0);
  const totalOpcionais = opcionais.reduce((acc, o) => acc + ((parseFloat(o.preco) || 0) * (parseInt(o.quantidade, 10) || 1)), 0);

  el.innerHTML = `
    <div class="wrap" style="padding:14px 5mm 14px 12mm; width:250mm; margin:0;">

      <!-- Título -->
      <div style="text-align:center; margin-top:6mm; line-height:1.1;">
        <div style="font-size:7mm; font-weight:700; letter-spacing:0.4mm;">PEDIDO DE COMPRA STARK</div>
      </div>

      <!-- BLOCO 1: STARK GUINDASTES -->
      <div style="margin-top:8mm; font-size:4.2mm; line-height:1.45;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">STARK GUINDASTES LTDA</div>
        <div><b>CNPJ:</b> 33.228.312/0001-06</div>
        <div><b>ENDEREÇO:</b> Rodovia RS-344, S/N – Santa Rosa/RS</div>
        <div><b>CONTATO:</b> (55) 2120-9961 / comercial@starkindustrial.com</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:4mm 0;"></div>

      <!-- BLOCO 2: CONCESSIONÁRIA -->
      <div style="font-size:4.2mm; line-height:1.45;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">CONCESSIONÁRIA</div>
        <div><b>NOME:</b> ${c.nome || 'Não informado'}</div>
        <div><b>CNPJ/CPF:</b> ${c.documento || 'Não informado'}</div>
        ${c.telefone ? `<div><b>TELEFONE:</b> ${c.telefone}</div>` : ''}
        ${c.email ? `<div><b>E-MAIL:</b> ${c.email}</div>` : ''}
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:4mm 0;"></div>

      <!-- BLOCO 3: REPRESENTANTE / ADMIN -->
      <div style="font-size:4.2mm; line-height:1.45;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">ADMIN CONCESSIONÁRIA</div>
        <div><b>NOME:</b> ${vendedor}</div>
        ${vendedorTelefone ? `<div><b>TELEFONE:</b> ${vendedorTelefone}</div>` : ''}
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:4mm 0;"></div>

      <!-- BLOCO 4: TABELA DE EQUIPAMENTOS -->
      <div style="font-size:4.2mm; line-height:1.45;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:3mm;">EQUIPAMENTOS (${guindastes.length})</div>
        <table style="width:100%; border-collapse:collapse; font-size:3.8mm;">
          <thead>
            <tr style="background:#f0f0f0; border-bottom:1px solid #ccc;">
              <th style="padding:2.5mm 2mm; text-align:left; font-weight:700;">#</th>
              <th style="padding:2.5mm 2mm; text-align:left; font-weight:700;">EQUIPAMENTO</th>
              <th style="padding:2.5mm 2mm; text-align:left; font-weight:700;">MODELO</th>
              <th style="padding:2.5mm 2mm; text-align:right; font-weight:700;">VALOR UNIT.</th>
            </tr>
          </thead>
          <tbody>
            ${guindastes.map((g, idx) => `
              <tr style="border-bottom:0.5px solid #ddd;">
                <td style="padding:2mm; font-weight:600;">${idx + 1}</td>
                <td style="padding:2mm; font-weight:700;">${g.nome || 'Guindaste'}</td>
                <td style="padding:2mm;">${g.modelo || '-'}</td>
                <td style="padding:2mm; text-align:right; font-weight:700;">${formatCurrency((parseFloat(g.preco) || 0) * (parseInt(g.quantidade, 10) || 1))}</td>
              </tr>
            `).join('')}
            ${opcionais.length > 0 ? opcionais.map(op => `
              <tr style="border-bottom:0.5px solid #eee; background:#fafafa;">
                <td style="padding:2mm;"></td>
                <td colspan="2" style="padding:2mm; font-style:italic; font-size:3.5mm;">↳ ${op.nome}${op.descricao ? ` — ${op.descricao}` : ''}</td>
                <td style="padding:2mm; text-align:right; font-size:3.5mm;">${formatCurrency((parseFloat(op.preco) || 0) * (parseInt(op.quantidade, 10) || 1))}</td>
              </tr>
            `).join('') : ''}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid #333; background:#f8f8f8;">
              <td colspan="3" style="padding:3mm 2mm; font-weight:800; font-size:4.2mm;">TOTAL DOS EQUIPAMENTOS</td>
              <td style="padding:3mm 2mm; text-align:right; font-weight:800; font-size:4.5mm;">${formatCurrency(totalEquipamentos + totalOpcionais)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Proposta info -->
      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0 4mm;"></div>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); text-align:center; font-size:4.2mm; gap:8mm; margin-top:2mm;">
        <div>
          <div style="font-weight:700;">Nº PEDIDO</div>
          <div style="font-weight:600; font-size:4.5mm; margin-top:1mm;">#${numeroProposta}</div>
        </div>
        <div>
          <div style="font-weight:700;">DATA DE EMISSÃO</div>
          <div style="font-weight:600; font-size:4.5mm; margin-top:1mm;">${data}</div>
        </div>
        <div>
          <div style="font-weight:700;">VALIDADE</div>
          <div style="font-weight:600; font-size:4.5mm; margin-top:1mm;">10 DIAS</div>
        </div>
      </div>
    </div>
  `;

  return el;
};

// Render financeiro COMPLETO para compra concessionária
// Igual ao renderFinanceiro mas SEM restrição tipoCliente para ENTRADA + breakdown por equipamento
const renderFinanceiroCompra = async (pedidoData, { inline = false } = {}) => {
  const p = pedidoData.pagamentoData || {};
  const lang = getLang(pedidoData);
  const totalBase = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);
  const extraValor = parseFloat(p.extraValor || 0);
  const extraDescricao = (p.extraDescricao || '').trim();
  const observacoesNegociacao = (p.observacoesNegociacao || '').trim();
  const percentualEntradaNum = parseFloat(p.percentualEntrada || 0) || 0;

  // 1. Descontos sobre o valor base
  const valorDescontoVendedor = p.desconto ? (totalBase * p.desconto / 100) : 0;
  const valorDescontoPrazo = p.descontoPrazo ? (totalBase * p.descontoPrazo / 100) : 0;
  const valorAcrescimo = p.acrescimo ? (totalBase * p.acrescimo / 100) : 0;
  const baseComDescontos = totalBase - valorDescontoVendedor - valorDescontoPrazo + valorAcrescimo;

  const valorFinalPolitica = parseFloat(p.valorFinal || p.total || 0) || 0;
  const valorFreteInformado = parseFloat(p.valorFrete || 0) || 0;
  const valorInstalacaoInformado = parseFloat(p.valorInstalacao || 0) || 0;
  const freteInferido = (
    String(p.tipoFrete).toUpperCase() === 'CIF' &&
    valorFreteInformado === 0 &&
    valorFinalPolitica > 0
  ) ? Math.max(0, valorFinalPolitica - (baseComDescontos + extraValor + valorInstalacaoInformado)) : 0;
  const valorFreteFinal = valorFreteInformado || freteInferido;

  const subtotalComAdicionais = baseComDescontos + extraValor + valorFreteFinal + valorInstalacaoInformado;
  const valorTotalFinal = valorFinalPolitica > 0 ? valorFinalPolitica : subtotalComAdicionais;

  const moeda = String(p.moeda || 'BRL').toUpperCase();
  const cotacaoUsd = Number(p.cotacao_usd);
  const isUSD = moeda === 'USD';
  const fmt = isUSD ? formatCurrencyUSD : formatCurrency;
  const divisor = isUSD && Number.isFinite(cotacaoUsd) && cotacaoUsd > 0 ? cotacaoUsd : 1;
  const convert = (v) => (Number(v) || 0) / divisor;

  // Entrada e saldo
  const entradaTotalCalc = p.entradaTotal || (p.percentualEntrada ? (valorTotalFinal * p.percentualEntrada / 100) : 0);
  const sinalPago = p.valorSinal || 0;
  const saldoAPagarCalc = valorTotalFinal - entradaTotalCalc;

  // Parcelas
  const numParcelas = p.parcelas?.length || 1;
  const valorParcela = saldoAPagarCalc / numParcelas;
  let somaAcumulada = 0;
  const parcelasCorrigidas = p.parcelas?.map((parcela, idx) => {
    const isUltima = idx === numParcelas - 1;
    const valor = isUltima
      ? Math.round((saldoAPagarCalc - somaAcumulada) * 100) / 100
      : Math.round(valorParcela * 100) / 100;
    somaAcumulada += valor;
    return { ...parcela, valor };
  }) || [];

  // Logos bancários
  const logoBB = await renderImageToDataURL('/banco do brasil.jfif');
  const logoSicredi = await renderImageToDataURL('/sicredi.png');
  const logoSicoob = await renderImageToDataURL('/sicoob.png');

  // Breakdown por equipamento (quando múltiplos guindastes)
  const guindastes = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const mostrarBreakdown = guindastes.length > 1;

  let breakdownHtml = '';
  if (mostrarBreakdown) {
    breakdownHtml = `
      <div style="margin-top:12px; padding:12px; background:#f8f9fa; border-left:4px solid #6d6e6fff; border-radius:4px;">
        <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:10px;">DETALHAMENTO POR EQUIPAMENTO</div>
        ${guindastes.map((g, idx) => {
          const precoUnit = parseFloat(g.preco) || 0;
          const entradaUnit = percentualEntradaNum > 0 ? (precoUnit * percentualEntradaNum / 100) : 0;
          const saldoUnit = precoUnit - entradaUnit;
          return `
            <div style="padding:10px; margin-bottom:8px; background:#fff; border:1px solid #ddd; border-radius:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:700; font-size:14px; color:#000;">${idx + 1}. ${(g.nome || g.modelo || 'Guindaste').toUpperCase()}</span>
                <span style="font-weight:800; font-size:16px; color:#000;">${fmt(convert(precoUnit))}</span>
              </div>
              ${percentualEntradaNum > 0 ? `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="font-weight:600;">Entrada (${percentualEntradaNum}%):</span>
                    <span style="font-weight:700;">${fmt(convert(entradaUnit))}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="font-weight:600;">Saldo:</span>
                    <span style="font-weight:700;">${fmt(convert(saldoUnit))}</span>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const el = createContainer('pdf-financeiro-compra', { inline });
  el.innerHTML = `
    <div class="wrap" style="padding:14px 10px;">
      <div class="title" style="font-size:26px; margin-bottom:12px; font-weight:800;">CONDIÇÕES COMERCIAIS E FINANCEIRAS</div>

      ${isUSD ? `
        <div style="margin-top:-4px; margin-bottom:10px; padding:8px 10px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:800; font-size:14px; margin-bottom:4px;">USD</div>
          <div style="font-weight:600; font-size:12px;">Cotação aplicada: 1 USD = ${formatCurrency(cotacaoUsd || 0)}</div>
        </div>
      ` : ''}

      ${observacoesNegociacao ? `
        <div style="margin-top:10px; padding:10px 12px; background:#fff; border:1px solid #ddd; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#000; margin-bottom:6px;">Observações de Negociação</div>
          <div style="font-size:13px; color:#000; line-height:1.4; white-space:pre-line; font-weight:600;">${observacoesNegociacao}</div>
        </div>
      ` : ''}

      <!-- LAYOUT 2 COLUNAS: VALOR BASE + DESCONTOS -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
        <div style="padding:12px; background:#f8f9fa; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">① VALOR BASE DO EQUIPAMENTO</div>
          <div style="font-size:24px; font-weight:700; color:#000;">${fmt(convert(totalBase))}</div>
        </div>

        ${(p.desconto || p.descontoPrazo || p.acrescimo) ? `
          <div style="padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">③ DESCONTOS E AJUSTES</div>
            ${p.desconto ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                <span style="font-weight:600; color:#000;">Desconto Vendedor (${p.desconto}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">- ${fmt(convert(valorDescontoVendedor))}</span>
              </div>
            ` : ''}
            ${p.descontoPrazo ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                <span style="font-weight:600; color:#000;">Desconto Prazo (${p.descontoPrazo}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">- ${fmt(convert(valorDescontoPrazo))}</span>
              </div>
            ` : ''}
            ${p.acrescimo ? `
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="font-weight:600; color:#000;">Acréscimo (${p.acrescimo}%)</span>
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorAcrescimo))}</span>
              </div>
            ` : ''}
          </div>
        ` : '<div></div>'}
      </div>

      <!-- FRETE E INSTALAÇÃO -->
      ${(p.tipoFrete || p.tipoInstalacao || valorFreteFinal || valorInstalacaoInformado) ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">② FRETE E INSTALAÇÃO</div>
          ${p.tipoFrete ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
              <span style="font-weight:600; color:#000;">Frete: ${String(p.tipoFrete).toUpperCase()}${p.valorFrete > 0 ? ' - Incluso' : ''}</span>
              ${valorFreteFinal > 0 ? `
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorFreteFinal))}</span>
              ` : `
                <span style="color:#555; font-size:12px;">Cliente paga direto</span>
              `}
            </div>
          ` : ''}
          ${p.tipoInstalacao ? `
            <div style="display:flex; justify-content:space-between; font-size:14px;">
              <span style="font-weight:600; color:#000;">Instalação: ${p.tipoInstalacao.toUpperCase()}</span>
              ${valorInstalacaoInformado > 0 ? `
                <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(valorInstalacaoInformado))}</span>
              ` : `
                <span style="color:#555; font-size:12px;">Cliente paga direto</span>
              `}
            </div>
          ` : ''}
          ${p.localInstalacao ? `
            <div style="margin-top:5px; padding-top:5px; border-top:1px solid #ddd; font-size:13px;">
              <span style="font-weight:600; color:#000;">📍 Local de Instalação:</span>
              <span style="font-weight:700; color:#000; margin-left:5px;">${p.localInstalacao.toUpperCase()}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${(extraValor > 0) ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">EXTRA</div>
          <div style="display:flex; justify-content:space-between; font-size:14px;">
            <span style="font-weight:600; color:#000;">${extraDescricao ? extraDescricao.toUpperCase() : 'AJUSTE COMERCIAL'}</span>
            <span style="color:#000; font-weight:700; font-size:16px;">+ ${fmt(convert(extraValor))}</span>
          </div>
        </div>
      ` : ''}

      <!-- VALOR TOTAL -->
      <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:18px; color:#000;">VALOR TOTAL DA PROPOSTA</span>
          <span style="font-weight:800; font-size:26px; color:#000;">${fmt(convert(valorTotalFinal))}</span>
        </div>
      </div>

      <!-- BREAKDOWN POR EQUIPAMENTO (quando múltiplos guindastes) -->
      ${breakdownHtml}

      <!-- ENTRADA (sempre mostra quando percentualEntrada > 0) -->
      ${percentualEntradaNum > 0 ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">④ ENTRADA (${percentualEntradaNum}% do valor total)</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
            <span style="font-weight:600; color:#000;">Valor da entrada</span>
            <span style="font-weight:700; font-size:20px; color:#000;">${fmt(convert(entradaTotalCalc))}</span>
          </div>
          ${p.formaEntrada ? `
            <div style="margin-bottom:6px; padding:8px; background:#fff; border-radius:4px; border:1px solid #ddd;">
              <span style="font-weight:600; color:#000; font-size:13px;">💳 Forma de Pagamento:</span>
              <span style="font-weight:700; color:#000; margin-left:5px; font-size:14px;">${p.formaEntrada.toUpperCase()}</span>
            </div>
          ` : ''}
          ${sinalPago > 0 ? `
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid #ddd; margin-top:6px; font-size:13px;">
              <span style="font-weight:600; color:#000;">Sinal já pago</span>
              <span style="font-weight:700; color:#000; font-size:14px;">${fmt(convert(sinalPago))}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:13px;">
              <span style="font-weight:600; color:#000;">Falta pagar</span>
              <span style="font-weight:700; color:#000; font-size:14px;">${fmt(convert(entradaTotalCalc - sinalPago))}</span>
            </div>
          ` : ''}
        </div>

        <!-- SALDO A PAGAR -->
        <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:6px;">⑤ SALDO A PAGAR (APÓS FATURAMENTO)</div>
          <div style="font-size:13px; color:#000; margin-bottom:6px;">Este valor será parcelado</div>
          <div style="font-weight:800; font-size:24px; color:#000;">${fmt(convert(saldoAPagarCalc))}</div>
        </div>
      ` : ''}

      <!-- PRAZO E PARCELAMENTO -->
      ${(parcelasCorrigidas && parcelasCorrigidas.length > 0 && p.prazoPagamento && p.prazoPagamento.toLowerCase() !== 'à vista') ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">
            ${percentualEntradaNum > 0 ? '⑥' : '④'} PRAZO: ${(p.prazoPagamento || '').replaceAll('_',' ').toUpperCase()}
          </div>
          <div style="font-size:13px; color:#000; margin-bottom:8px; font-weight:600;">Saldo de ${fmt(convert(saldoAPagarCalc))} dividido em ${parcelasCorrigidas.length} parcelas:</div>
          <div style="display:grid; grid-template-columns:repeat(${parcelasCorrigidas.length > 3 ? '4' : parcelasCorrigidas.length > 2 ? '3' : '2'}, 1fr); gap:8px;">
            ${parcelasCorrigidas.map((parcela, idx) => `
              <div style="background:#fff; padding:8px; border-radius:4px; text-align:center; border:1px solid #ddd;">
                <div style="font-size:12px; color:#000; margin-bottom:3px; font-weight:600;">Parcela ${parcela.numero || idx + 1}</div>
                <div style="font-weight:700; color:#000; font-size:16px;">${fmt(convert(parcela.valor || 0))}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : (p.prazoPagamento ? `
        <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
          <div style="font-weight:700; font-size:15px; color:#000;">
            ${percentualEntradaNum > 0 ? '⑥' : '④'} PRAZO: ${(p.prazoPagamento || '').replaceAll('_',' ').toUpperCase()}
          </div>
        </div>
      ` : '')}

      <!-- DADOS BANCÁRIOS -->
      <div style="margin-top:16px; padding-top:12px; border-top:2px solid #ddd;">
        <div style="font-weight:700; font-size:16px; text-transform:uppercase; margin-bottom:10px; color:#000;">DADOS BANCÁRIOS – STARK GUINDASTES LTDA</div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; font-size:12px; line-height:1.5;">
          <div>
            <img src="${logoBB}" alt="Banco do Brasil" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
            <div style="font-weight:700; font-size:13px;">Banco do Brasil (001)</div>
            <div style="font-weight:600;">Ag: 0339-5</div>
            <div style="font-weight:600;">CC: 60548-4</div>
          </div>
          <div>
            <img src="${logoSicredi}" alt="Sicredi" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
            <div style="font-weight:700; font-size:13px;">Sicredi (748)</div>
            <div style="font-weight:600;">Ag: 0307</div>
            <div style="font-weight:600;">CC: 40771-1</div>
          </div>
          <div>
            <img src="${logoSicoob}" alt="Sicoob" style="width:65px; height:auto; margin-bottom:5px; display:block;"/>
            <div style="font-weight:700; font-size:13px;">Sicoob (756)</div>
            <div style="font-weight:600;">Ag: 3072-4</div>
            <div style="font-weight:600;">CC: 33276-3</div>
          </div>
        </div>
        <div style="margin-top:10px; font-size:12px; line-height:1.6;">
          <div style="font-weight:700;">Stark guindastes Ltda | CNPJ: 33.228.312/0001-06</div>
          <div style="margin-top:5px; font-weight:600;">
            Pix CNPJ: <b>33228312000106</b> (Sicredi) |
            Pix e-mail: <b>financeiro@starkindustrial.ind.br</b> (BB)
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
};

// Render descrição técnica individual de um equipamento para compra concessionária
const renderEquipamentoIndividualCompra = (pedidoData, guindaste, idx, total, { inline = false } = {}) => {
  const el = createContainer(`pdf-equip-compra-${idx}`, { inline });

  const banco = (pedidoData.guindastes || []).find(g =>
    (g?.id && guindaste?.id && g.id === guindaste.id) ||
    (g?.nome && guindaste?.nome && g.nome === guindaste.nome) ||
    (g?.modelo && guindaste?.modelo && g.modelo === guindaste.modelo)
  );

  const g = { ...guindaste, ...(banco || {}) };
  const desc = formatarTexto(g.descricao || '');
  const naoIncluido = formatarTexto(g.nao_incluido || '');

  const opcionaisSelecionados = (pedidoData.carrinho || [])
    .filter(i => i.tipo === 'opcional')
    .map(i => i.nome);
  const codigo = generateCodigoProduto(g.modelo || g.nome, opcionaisSelecionados) || g.codigo_produto || '-';

  el.innerHTML = `
    <div class="wrap" style="padding:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div class="title" style="font-size:22px; margin:0;">EQUIPAMENTO ${idx + 1}/${total} — ${(g.nome || g.modelo || 'GUINDASTE').toUpperCase()}</div>
        <div style="font-size:20px; font-weight:800; color:#000;">${formatCurrency((parseFloat(g.preco) || 0) * (parseInt(g.quantidade, 10) || 1))}</div>
      </div>

      <!-- Dados básicos -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tbody>
            <tr style="border-bottom:0.5px solid #ddd;">
              <td style="font-weight:600; width:40%; padding:6px 4px;">NOME / MODELO</td>
              <td style="font-weight:700; padding:6px 4px;">${g.nome || g.modelo || '-'}</td>
            </tr>
            <tr style="border-bottom:0.5px solid #ddd;">
              <td style="font-weight:600; padding:6px 4px;">CÓDIGO</td>
              <td style="font-weight:700; padding:6px 4px;">${codigo}</td>
            </tr>
          </tbody>
        </table>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tbody>
            <tr style="border-bottom:0.5px solid #ddd;">
              <td style="font-weight:600; width:40%; padding:6px 4px;">FINAME</td>
              <td style="font-weight:700; padding:6px 4px;">${g.finame || 'Não informado'}</td>
            </tr>
            <tr style="border-bottom:0.5px solid #ddd;">
              <td style="font-weight:600; padding:6px 4px;">NCM</td>
              <td style="font-weight:700; padding:6px 4px;">${g.ncm || 'Não informado'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Descrição técnica -->
      ${desc ? `
        <div style="margin-bottom:10px;">
          <div class="subtitle" style="font-size:15px; margin-bottom:6px;">DESCRIÇÃO TÉCNICA</div>
          <div style="font-size:12px; line-height:1.3; white-space:pre-line; text-transform:uppercase;">${desc}</div>
        </div>
      ` : ''}

      ${naoIncluido ? `
        <div style="margin-bottom:10px;">
          <div class="subtitle" style="font-size:15px; margin-bottom:6px;">NÃO INCLUÍDO</div>
          <div style="font-size:12px; line-height:1.3; white-space:pre-line; text-transform:uppercase;">${naoIncluido}</div>
        </div>
      ` : ''}
    </div>
  `;
  return el;
};

/**
 * ==========================
 *  ANEXO DE GRÁFICOS (PDF)
 * ==========================
 */
const appendGraficosDeCarga = async (pdf, pedidoData, headerDataURL, footerDataURL, timestampText) => {
  try {
    const graficosCadastrados = await db.getGraficosCarga();

    const indexPdfPorChave = new Map();
    for (const g of (graficosCadastrados || [])) {
      const cand = new Set([buildGraficoKey(g.nome || ''), buildGraficoKey(g.modelo || '')].filter(Boolean));
      for (const key of cand) {
        if (g.arquivo_url && !indexPdfPorChave.has(key)) {
          indexPdfPorChave.set(key, g.arquivo_url);
        }
      }
    }

    const itensGuindaste = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
    const modelos = [];
    itensGuindaste.forEach(item => {
      [item.modelo, item.nome, item.subgrupo, item.codigo_produto]
        .filter(Boolean)
        .map(buildGraficoKey)
        .filter(Boolean)
        .forEach(k => modelos.push(k));
    });
    const modelosUnicos = Array.from(new Set(modelos));

    const resolved = new Map();
    for (const k of modelosUnicos) {
      const url = resolveGraficoUrl(indexPdfPorChave, k);
      if (url) resolved.set(k, url);
    }

    const urlsIncluidas = new Set();
    for (const [, url] of resolved) {
      if (urlsIncluidas.has(url)) continue;
      urlsIncluidas.add(url);

      // Renderizar gráfico como imagem
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      pdf.addPage();
      
      // CALCULAR TAMANHO DA IMAGEM (página inteira)
      const maxW = PAGE.width;
      const maxH = PAGE.height;
      
      const scaledH = (canvas.height * maxW) / canvas.width;
      let drawW = maxW;
      let drawH = scaledH;
      
      if (scaledH > maxH) {
        drawH = maxH;
        drawW = (canvas.width * maxH) / canvas.height;
      }
      
      // Centralizar na página inteira
      const x = (PAGE.width - drawW) / 2;
      const y = (PAGE.height - drawH) / 2;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
    }
  } catch (e) {
    console.error('Erro ao anexar gráficos de carga:', e);
  }
};

/**
 * ==========================
 *  COMPONENTE PRINCIPAL
 * ==========================
 */
const PDFGenerator = ({ pedidoData, onGenerate }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const isVendedorExterior = React.useMemo(() => {
    const moeda = String(pedidoData?.pagamentoData?.moeda || '').toUpperCase();
    if (moeda === 'USD') return true;
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.tipo === 'vendedor_exterior';
    } catch {
      return false;
    }
  }, [pedidoData]);

  const [pdfLang, setPdfLang] = React.useState(() => (isVendedorExterior ? 'es' : 'pt'));

  React.useEffect(() => {
    if (!isVendedorExterior) {
      setPdfLang('pt');
    }
  }, [isVendedorExterior]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const effectiveLang = isVendedorExterior ? pdfLang : 'pt';
      const ts = `${t(effectiveLang, 'autoGeneratedProposalAt')} ${new Date().toLocaleString('pt-BR')}`;
      const numeroProposta = getNextProposalNumber();

      const pedidoDataLang = {
        ...(pedidoData || {}),
        pdfLang: effectiveLang,
      };

      const headerDataURL = await renderImageToDataURL(HEADER_IMG);
      const footerDataURL = await renderImageToDataURL(FOOTER_IMG);

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont(STYLE.FONT, 'normal');

      const isCompra = !!pedidoData?.isConcessionariaCompra;

      if (isCompra) {
        // =====================================================
        //  PDF SIMPLIFICADO — PEDIDO DE COMPRA CONCESSIONÁRIA
        // =====================================================

        // 1. CAPA: Stark + Concessionária + Tabela de equipamentos
        {
          const el = renderCapaCompraConcessionaria(pedidoDataLang, numeroProposta, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // 2. POR EQUIPAMENTO: descrição técnica individual
        const guindastesList = (pedidoDataLang.carrinho || []).filter(i => i.tipo === 'guindaste');
        for (let i = 0; i < guindastesList.length; i++) {
          const el = renderEquipamentoIndividualCompra(pedidoDataLang, guindastesList[i], i, guindastesList.length, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // 3. ESTUDO VEICULAR (se houver dados de caminhão preenchidos)
        const v = pedidoDataLang.caminhaoData || {};
        const temDadosVeiculo = v.tipo && v.tipo !== 'PREENCHER' && v.marca && v.marca !== 'PREENCHER';
        if (temDadosVeiculo) {
          const root = createContainer('page-estudo-compra', { inline: true });
          root.appendChild(renderCaminhao(pedidoDataLang, { inline: true }));
          root.appendChild(renderEstudoVeicular(pedidoDataLang, { inline: true }));
          const cv = await htmlToCanvas(root);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // 4. CONDIÇÕES DE PAGAMENTO (completas + breakdown por equipamento)
        {
          const el = await renderFinanceiroCompra(pedidoDataLang, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // 5. CLÁUSULAS + ASSINATURAS
        {
          const root = createContainer('page-clausulas-compra', { inline: true });
          root.appendChild(renderClausulas(pedidoDataLang, { inline: true }));
          root.appendChild(renderAssinaturas(pedidoDataLang, { inline: true }));
          const cv = await htmlToCanvas(root);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

      } else {
        // =====================================================
        //  PDF PADRÃO — PROPOSTA COMERCIAL (vendedores normais)
        // =====================================================

        // ==== PÁGINA 1: CAPA
        {
          const el = await renderCapa(pedidoDataLang, numeroProposta, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // ==== PÁGINA 2: DADOS DO EQUIPAMENTO
        {
          const el = renderEquipamento(pedidoDataLang, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // ==== GRÁFICOS DE CARGA
        await appendGraficosDeCarga(pdf, pedidoData, headerDataURL, footerDataURL, ts);

        // ==== PÁGINA 3: VEÍCULO + ESTUDO VEICULAR
        {
          const root = createContainer('page2-root', { inline: true });
          root.appendChild(renderCaminhao(pedidoDataLang, { inline: true }));
          root.appendChild(renderEstudoVeicular(pedidoDataLang, { inline: true }));
          const cv = await htmlToCanvas(root);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // ==== FINANCEIRO
        {
          const el = await renderFinanceiro(pedidoDataLang, { inline: false });
          const cv = await htmlToCanvas(el);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }

        // ==== CLÁUSULAS + ASSINATURAS
        {
          const root = createContainer('page4-root', { inline: true });
          root.appendChild(renderClausulas(pedidoDataLang, { inline: true }));
          root.appendChild(renderAssinaturas(pedidoDataLang, { inline: true }));
          const cv = await htmlToCanvas(root);
          addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
        }
      }

      const nomeDocumento = isCompra
        ? (pedidoData?.dados_serializados?.concessionariaInfo?.nome || pedidoData?.clienteData?.nome || 'Concessionaria')
        : (pedidoData?.clienteData?.nome || 'Cliente');

      const nomeSanitizado = sanitizeFilePart(nomeDocumento);
      const fileName = isCompra
        ? `Pedido_Compra_Concessionaria_${nomeSanitizado}.pdf`
        : `Proposta_Stark_${nomeSanitizado}.pdf`;
      pdf.save(fileName);

      onGenerate && onGenerate(fileName);
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {isVendedorExterior && (
        <select
          value={pdfLang}
          onChange={(e) => setPdfLang(e.target.value)}
          disabled={isGenerating}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontSize: '13px',
            fontWeight: 600,
          }}
          title="Idioma do PDF"
        >
          <option value="pt">PT (Português)</option>
          <option value="es">ES (Español)</option>
        </select>
      )}

      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className="pdf-generator-btn"
        style={{
          background: isGenerating
            ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
            : 'linear-gradient(135deg, #111 0%, #222 100%)',
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
            GERAR PROPOSTA (PDF)
          </>
        )}
      </button>

      {isGenerating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #e5e5e5',
              borderTop: '4px solid #111',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }}></div>
            <h3 style={{
              margin: '0 0 0.5rem',
              color: '#333',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              Gerando PDF
            </h3>
            <p style={{ margin: '0', color: '#666', fontSize: '0.875rem', lineHeight: '1.4' }}>
              Processando sua proposta com layout profissional...
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </>
  );
};

export default PDFGenerator;
