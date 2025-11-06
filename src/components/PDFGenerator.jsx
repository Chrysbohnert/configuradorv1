import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { buildGraficoKey, resolveGraficoUrl } from '../utils/modelNormalization';
import { db } from '../config/supabase';

// Worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

// Cabeçalho/rodapé (imagens)
const HEADER_IMG = '/cebecalho1.png';
const FOOTER_IMG = '/rodapé.png';

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
  return canvas.toDataURL('image/png');
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
    const imgData = temp.toDataURL('image/png');

    // Conteúdo logo após o header, respeitando margem lateral
    const y = HEADER_H + 6; // respiro
    pdf.addImage(imgData, 'PNG', MARGIN, y, CONTENT_W, sliceHeightMm);

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
 *  RENDERERS DE SEÇÕES
 * ==========================
 */

// CAPA PADRÃO TKA — texto totalmente alinhado à esquerda e margens otimizadas
const renderCapa = (pedidoData, numeroProposta, { inline = false } = {}) => {
  const el = createContainer('pdf-capa', { inline });
  const vendedor = pedidoData.vendedor || 'NÃO INFORMADO';
  const data = new Date().toLocaleDateString('pt-BR');
  const c = pedidoData.clienteData || {};

  const enderecoCliente = (() => {
    const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
    const bairro = c.bairro ? ` - ${c.bairro}` : '';
    const cidadeUf = (c.cidade || c.uf)
      ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}`
      : '';
    const cep = c.cep ? ` - CEP: ${c.cep}` : '';
    return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || 'NÃO INFORMADO';
  })();

  el.innerHTML += `
    <div class="wrap" style="padding:14px 5mm 14px 12mm; width:250mm; margin:0;">

      <!-- Título -->
      <div style="text-align:center; margin-top:6mm; line-height:1.1;">
        <div style="font-size:7mm; font-weight:700; letter-spacing:0.4mm;">PROPOSTA COMERCIAL STARK GUINDASTES</div>
        <div style="font-size:4.7mm; font-weight:600; margin-top:1mm;">
           ${pedidoData.carrinho?.[0]?.modelo?.toUpperCase() || 'MODELO NÃO INFORMADO'} 
        </div>
      </div>

      <!-- BLOCO 1: DADOS STARK -->
      <div style="margin-top:10mm; font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">STARK INDUSTRIAL LTDA</div>
        <div><b>RAZÃO SOCIAL:</b> STARK INDUSTRIAL LTDA</div>
        <div><b>CNPJ:</b> 33.228.312/0001-06</div>
        <div><b>ENDEREÇO:</b> Rodovia RS-344, S/N – Santa Rosa/RS</div>
        <div><b>CONTATO:</b> (55) 99999-9999 / comercial@starkindustrial.com</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0;"></div>

      <!-- BLOCO 2: REPRESENTANTE -->
      <div style="font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">REPRESENTANTE STARK</div>
        <div><b>NOME:</b> ${vendedor}</div>
        <div><b>EMPRESA:</b> STARK INDUSTRIAL LTDA</div>
      </div>

      <div style="height:0.3mm; background:#555; opacity:0.4; margin:5mm 0;"></div>

      <!-- BLOCO 3: CLIENTE -->
      <div style="font-size:4.2mm; line-height:1.45; letter-spacing:0.05mm;">
        <div style="font-weight:700; font-size:4.4mm; margin-bottom:1mm;">CLIENTE STARK</div>
        <div><b>NOME CLIENTE:</b> ${c.nome || 'NÃO INFORMADO'}</div>
        <div><b>CNPJ/CPF:</b> ${c.documento || 'NÃO INFORMADO'}</div>
        <div><b>INSCRIÇÃO ESTADUAL:</b> ${c.inscricao_estadual || c.inscricaoEstadual || 'NÃO INFORMADO'}</div>
        <div><b>ENDEREÇO:</b> ${enderecoCliente}</div>
        <div><b>TELEFONE:</b> ${c.telefone || 'NÃO INFORMADO'}</div>
        <div><b>E-MAIL:</b> ${c.email || 'NÃO INFORMADO'}</div>
      </div>

      <!-- Linha final e infos da proposta -->
      <div style="height:0.3mm; background:#555; opacity:0.4; margin:2mm 0 5mm;"></div>

      <div style="
        display:grid;
        grid-template-columns: repeat(3, 1fr);
        text-align:center;
        font-size:4mm;
        letter-spacing:0.1mm;
        gap:8mm;
      ">
        <div>
          <div style="font-weight:700;">Nº PROPOSTA</div>
          <div style="font-weight:500;">#${numeroProposta}</div>
        </div>
        <div>
          <div style="font-weight:700;">DATA DE EMISSÃO</div>
          <div style="font-weight:500;">${data}</div>
        </div>
        <div>
          <div style="font-weight:700;">VALIDADE</div>
          <div style="font-weight:500;">30 DIAS</div>
        </div>
      </div>

      <!-- SEÇÃO MISSÃO, VISÃO E VALORES - LAYOUT HORIZONTAL (3 COLUNAS) -->
        <div style="
          margin-top:12mm;
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          gap:50mm;
          text-align:center;
          padding:0 5mm;
        ">
          
          <!-- MISSÃO -->
          <div>
            <div style="
              background:#3498db;
              width:35mm;
              height:25mm;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:0 auto 4mm;
            ">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' width='18mm' height='18mm'>
                <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z'/>
              </svg>
            </div>
            <div style="font-weight:700; font-size:4.5mm; margin-bottom:2mm;">MISSÃO</div>
            <div style="font-size:3.5mm; line-height:1.4;">Tornar eficiente o trabalho no campo e<br/>na cidade.</div>
          </div>

          <!-- VISÃO -->
          <div>
            <div style="
              background:#f39c12;
              width:50mm;
              height:50mm;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:0 auto 4mm;
            ">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' width='18mm' height='18mm'>
                <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/>
              </svg>
            </div>
            <div style="font-weight:700; font-size:4.5mm; margin-bottom:2mm;">VISÃO</div>
            <div style="font-size:3.5mm; line-height:1.4;">Ser referência no segmento de elevação e movimentação de cargas, através de produtos inovadores com alta qualidade, confiabilidade e produtividade em todo o território nacional até 2030. Primando por rentabilidade e crescimento financeiro da empresa.</div>
          </div>

          <!-- VALORES -->
          <div>
            <div style="
              background:#27ae60;
              width:35mm;
              height:25mm;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              margin:0 auto 4mm;
            ">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' width='18mm' height='18mm'>
                <path d='M12 2a10 10 0 1010 10A10 10 0 0012 2zm-1 15l-5-5 1.41-1.41L11 13.17l5.59-5.59L18 9z'/>
              </svg>
            </div>
            <div style="font-weight:700; font-size:4.5mm; margin-bottom:2mm;">VALORES</div>
            <div style="font-size:3.5mm; line-height:1.4;">Ambição em fazer o melhor e crescer juntos,<br/>com transparência, honestidade e qualidade.</div>
          </div>

        </div>
      </div>
    </div>
  </div>
      </div>
    </div>
  `;

  return el;
};

// DADOS DO CLIENTE (se quiser manter como seção separada em outras páginas)
const renderCliente = (pedidoData, { inline = false } = {}) => {
  const c = pedidoData.clienteData || {};
  const endereco = (() => {
    const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
    const bairro = c.bairro ? ` - ${c.bairro}` : '';
    const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
    const cep = c.cep ? ` - CEP: ${c.cep}` : '';
    const linha = `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim();
    return linha || (c.endereco || 'NÃO INFORMADO');
  })();

  const el = createContainer('pdf-cliente', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">DADOS DO CLIENTE</div>
      <div class="kvs">
        <div class="row"><div class="k">NOME</div><div class="v">${c.nome || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">CNPJ/CPF</div><div class="v">${c.documento || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">INSCRIÇÃO ESTADUAL</div><div class="v">${c.inscricao_estadual || c.inscricaoEstadual || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">TELEFONE</div><div class="v">${c.telefone || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">E-MAIL</div><div class="v">${c.email || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">ENDEREÇO</div><div class="v">${endereco}</div></div>
      </div>
      ${c.observacoes ? `
        <div class="subtitle">OBSERVAÇÕES</div>
        <div class="p caps">${c.observacoes}</div>
      ` : ''}
    </div>
  `;
  return el;
};

// EQUIPAMENTO / PRODUTO
const renderEquipamento = (pedidoData, { inline = false } = {}) => {
  console.log('📄 [renderEquipamento] Dados recebidos:', {
    carrinho: pedidoData.carrinho,
    guindastes: pedidoData.guindastes
  });

  const guindastes = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const opcionais = (pedidoData.carrinho || []).filter(i => i.tipo === 'opcional');

  const enrich = (item) => {
    console.log('🔍 [enrich] Processando item:', {
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
      console.log('✅ [enrich] Dados encontrados no banco:', {
        id: banco.id,
        nome: banco.nome,
        finame: banco.finame,
        ncm: banco.ncm
      });
    } else {
      console.log('⚠️ [enrich] Nenhum dado adicional encontrado no banco para o item:', item.id || item.nome);
    }

    // Criar objeto enriquecido com fallbacks
    const enriched = {
      ...item,
      ...(banco || {}),
      descricao: banco?.descricao || item?.descricao || '',
      nao_incluido: banco?.nao_incluido || item?.nao_incluido || '',
      finame: banco?.finame || item?.finame || 'NÃO INFORMADO',
      ncm: banco?.ncm || item?.ncm || 'NÃO INFORMADO'
    };

    console.log('✅ [enrich] Dados finais do item:', {
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
      <div class="title">DADOS DO EQUIPAMENTO</div>
  `;

  if (gList.length === 0) {
    html += `<div class="p caps">NENHUM EQUIPAMENTO PRINCIPAL INFORMADO.</div>`;
  } else {
    gList.forEach((g, idx) => {
      const opcionaisSelecionados = (pedidoData.carrinho || [])
        .filter(i => i.tipo === 'opcional')
        .map(i => i.nome);
      const codigo = generateCodigoProduto(g.modelo || g.nome, opcionaisSelecionados) || g.codigo_produto || '-';

      html += `
        ${idx > 0 ? '<div class="rule"></div>' : ''}
        <div class="kvs">
          <div class="row"><div class="k">NOME / MODELO</div><div class="v">${(g.nome || g.modelo || 'EQUIPAMENTO')}</div></div>
          <div class="row"><div class="k">CÓDIGO</div><div class="v">${codigo}</div></div>
          <div class="row"><div class="k">FINAME</div><div class="v">${g.finame || 'NÃO INFORMADO'}</div></div>
          <div class="row"><div class="k">NCM</div><div class="v">${g.ncm || 'NÃO INFORMADO'}</div></div>
        </div>

        <div class="small-gap"></div>
        <div class="subtitle">DESCRIÇÃO TÉCNICA</div>
        <div class="p p-justify caps" style="white-space: pre-line;">${g.descricao || 'NÃO INFORMADO'}</div>

        <div class="small-gap"></div>
        <div class="subtitle">NÃO INCLUÍDO</div>
        <div class="p p-justify caps" style="white-space: pre-line;">${g.nao_incluido || 'NÃO INFORMADO'}</div>
        <!-- PROGRAMA DE REVISÕES DENTRO DA GARANTIA -->
<div class="small-gap"></div>
<div class="subtitle">PROGRAMA DE REVISÃO E GARANTIA EQUIPAMENTO STARK</div>
<div class="p lower" style="font-size: 14px; line-height: 1.5; text-transform:none;">
  <ul style="margin-left: 16px; padding-left: 8px; list-style-type: disc;">
    <li>Para solicitação da garantia, deverão ser apresentados os seguintes documentos:</li>
    <ul style="margin-left: 20px; list-style-type: circle;">
      <li>Nota Fiscal de aquisição do equipamento.</li>
      <li>Certificado de Garantia preenchido e assinado pelo proprietário na hora da entrega.</li>
    </ul>
        <li>Comprovante de revisão efetuada pelo ponto de instalação ou fábrica de Santa Rosa Rs, de acordo com o plano de revisões abaixo:</li>
        <ul style="margin-left: 20px; list-style-type: circle;">
          <li>500 horas ou 6 meses;</li>
          <li>1000 horas ou 12 meses;</li>
          <li>2000 horas ou 24 meses;</li>
        </ul>
        <li>Comprovante de troca de óleo realizada nas primeiras 500 horas ou primeiros 6 meses de uso do equipamento.</li>
        <li>Comprovante do relatório de entrega técnica assinado pelo responsável pelo recebimento do equipamento.</li>
      </ul>
        <li>A garantia contratual concedida pela STARK Guindastes tem validade de:</li>
        <li> 6 (seis) meses para o sistema hidráulico, ou, 500 (quinhentas) horas de operação, o que ocorrer primeiro.</li>
        <li> 12 (doze) meses para a estrutura do equipamento, ou, 1000 (mil) horas de operação, o que ocorrer primeiro.</li>
        <li>O prazo é contado a partir da data de entrega ao cliente, conforme nota fiscal, e mediante o envio do Certificado de Garantia devidamente preenchido e assinado á fábrica.</li>
       <li>A validade de garantia está condicionada ao fato de que o faturamento da STARK Guindastes para a revenda não exceda 12 (doze) meses anteriores á entrega ao cliente final.</li>
      `;
    });
  }

  if (opcionais.length > 0) {
    html += `
      <div class="rule"></div>
      <div class="subtitle">OPCIONAIS SELECIONADOS</div>
      <table class="table">
        <thead>
          <tr>
            <th>OPCIONAL</th>
            <th>DESCRIÇÃO</th>
            <th class="right">PREÇO</th>
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
  const el = createContainer('pdf-caminhao', { inline });

  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">DADOS DO VEÍCULO</div>
      <div class="kvs">
        <div class="row"><div class="k">TIPO</div><div class="v">${v.tipo || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">MARCA</div><div class="v">${v.marca || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">MODELO</div><div class="v">${v.modelo || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">ANO</div><div class="v">${v.ano || 'NÃO INFORMADO'}</div></div>
        <div class="row"><div class="k">VOLTAGEM</div><div class="v">${v.voltagem || 'NÃO INFORMADO'}</div></div>
      </div>
      ${v.observacoes ? `
        <div class="subtitle">OBSERVAÇÕES</div>
        <div class="p caps">${v.observacoes}</div>
      ` : ''}
    </div>
  `;
  return el;
};

// ESTUDO VEICULAR
const renderEstudoVeicular = (pedidoData, { inline = false } = {}) => {
  const v = pedidoData.caminhaoData || {};
  const temMedidas = v.medidaA || v.medidaB || v.medidaC || v.medidaD;

  const el = createContainer('pdf-estudo', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">ESTUDO VEICULAR</div>
      <div class="center small-gap">
        <img src="/estudoveicular.png" alt="Estudo Veicular" style="max-width:700px;width:100%;height:auto;"/>
      </div>
      ${
        temMedidas ? `
          <div class="kvs" style="grid-template-columns: 1fr 1fr;">
            ${v.medidaA ? `<div class="row"><div class="k">MEDIDA A (CHASSI AO ASSOALHO)</div><div class="v">${v.medidaA}cm</div></div>` : ''}
            ${v.medidaB ? `<div class="row"><div class="k">MEDIDA B (CHASSI)</div><div class="v">${v.medidaB}cm</div></div>` : ''}
            ${v.medidaC ? `<div class="row"><div class="k">MEDIDA C (Solo ao Chassi)</div><div class="v">${v.medidaC}cm</div></div>` : ''}
            ${v.medidaD ? `<div class="row"><div class="k">MEDIDA D (DIST ENTRE EIXOS)</div><div class="v">${v.medidaD}cm</div></div>` : ''}
          </div>
          ${v.patolamento ? `
            <div style="margin-top:15px;padding:10px;background:linear-gradient(135deg, #333334ff 0%, #3d3c35ff 100%);border-radius:8px;text-align:center;">
              <div style="color:white;font-size:14px;font-weight:600;margin-bottom:6px;">🔧 PATOLAMENTO CALCULADO</div>
              <div style="color:white;font-size:28px;font-weight:bold;letter-spacing:2px;">${v.patolamento}</div>
              <div style="color:white;font-size:12px;opacity:0.9;margin-top:6px;">
                ${parseFloat(v.medidaC) >= 70 ? 'Medida C ≥ 70cm' : parseFloat(v.medidaC) >= 60 ? 'Medida C entre 60-69cm' : 'Medida C < 60cm'}
              </div>
            </div>
          ` : ''}
        ` : `
          <div class="p caps center small-gap">MEDIDAS NÃO INFORMADAS.</div>
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
  const totalBase = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);
  
  // CÁLCULOS CORRETOS SEGUINDO A LÓGICA:
  // 1. Base + Adicionais
  const subtotalComAdicionais = totalBase + (p.valorFrete || 0) + (p.valorInstalacao || 0);
  
  // 2. Aplicar descontos
  const valorDescontoVendedor = p.desconto ? (subtotalComAdicionais * p.desconto / 100) : 0;
  const valorDescontoPrazo = p.descontoPrazo ? (subtotalComAdicionais * p.descontoPrazo / 100) : 0;
  const valorAcrescimo = p.acrescimo ? (subtotalComAdicionais * p.acrescimo / 100) : 0;
  
  // 3. Valor Total Final
  const valorTotalFinal = subtotalComAdicionais - valorDescontoVendedor - valorDescontoPrazo + valorAcrescimo;
  
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

  // Carregar logos dos bancos como base64
  const logoBB = await renderImageToDataURL('/banco do brasil.jfif');
  const logoSicredi = await renderImageToDataURL('/sicredi.png');
  const logoSicoob = await renderImageToDataURL('/sicoob.png');

  const el = createContainer('pdf-financeiro', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:18px 12px;">
      <div class="title">CONDIÇÕES COMERCIAIS E FINANCEIRAS</div>

      <!-- FLUXO CASCATA: PASSO A PASSO -->
      
      <!-- PASSO 1: VALOR BASE -->
      <div style="margin-top:8px; padding:10px; background:#f8f9fa; border-left:4px solid #6d6e6fff; border-radius:4px;">
        <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:6px;">① VALOR BASE DO EQUIPAMENTO</div>
        <div style="font-size:20px; font-weight:700; color:#black;">${formatCurrency(totalBase)}</div>
      </div>

      <!-- PASSO 2: ADICIONAIS (Frete + Instalação) -->
      ${(p.tipoFrete || p.tipoInstalacao || p.valorFrete || p.valorInstalacao) ? `
        <div style="margin-top:12px; padding:10px; background:#e3f2fd; border-left:4px solid #787b7dff; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:6px;">② FRETE E INSTALAÇÃO</div>
          
          ${p.tipoFrete ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>
                <strong>Frete:</strong> FOB${p.valorFrete > 0 ? ' - Incluso no pedido' : ''}
                ${p.valorFrete > 0 && p.tipoEntrega ? ` (${p.tipoEntrega === 'prioridade' ? 'Prioridade' : 'Reaproveitamento'})` : ''}
              </span>
              ${p.valorFrete > 0 ? `
                <span style="color:#2196f3; font-weight:600;">+ ${formatCurrency(p.valorFrete)}</span>
              ` : `
                <span style="color:#666; font-size:12px;">Cliente paga direto</span>
              `}
            </div>
          ` : ''}
          
          ${p.tipoInstalacao ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span><strong>Instalação:</strong> ${p.tipoInstalacao.toUpperCase()}</span>
              ${p.valorInstalacao > 0 ? `
                <span style="color:#2196f3; font-weight:600;">+ ${formatCurrency(p.valorInstalacao)}</span>
              ` : `
                <span style="color:#666; font-size:12px;">Cliente paga direto</span>
              `}
            </div>
          ` : ''}
          
          ${(p.valorFrete > 0 || p.valorInstalacao > 0) ? `
            <div style="border-top:1px solid #bbdefb; margin-top:6px; padding-top:6px; display:flex; justify-content:space-between;">
              <span style="font-weight:600;">Subtotal com adicionais</span>
              <span style="font-weight:700; font-size:16px;">${formatCurrency(subtotalComAdicionais)}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- PASSO 3: DESCONTOS -->
      ${(p.desconto || p.descontoPrazo || p.acrescimo) ? `
        <div style="margin-top:12px; padding:10px; background:#fff3e0; border-left:4px solid #ff9800; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:6px;">③ DESCONTOS E AJUSTES</div>
          ${p.desconto ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Desconto do vendedor (${p.desconto}%)</span>
              <span style="color:#e74c3c; font-weight:600;">- ${formatCurrency(valorDescontoVendedor)}</span>
            </div>
          ` : ''}
          ${p.descontoPrazo ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Desconto do prazo (${p.descontoPrazo}%)</span>
              <span style="color:#e74c3c; font-weight:600;">- ${formatCurrency(valorDescontoPrazo)}</span>
            </div>
          ` : ''}
          ${p.acrescimo ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Acréscimo (${p.acrescimo}%)</span>
              <span style="color:#27ae60; font-weight:600;">+ ${formatCurrency(valorAcrescimo)}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- VALOR TOTAL FINAL -->
      <div style="margin-top:12px; padding:14px; background:#4caf50; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; font-size:18px; color:white;">VALOR TOTAL DA PROPOSTA</span>
          <span style="font-weight:700; font-size:24px; color:white;">${formatCurrency(valorTotalFinal)}</span>
        </div>
      </div>

      <!-- CONDIÇÕES DE PAGAMENTO -->
      <div style="margin-top:16px; padding:10px; background:#e8f5e9; border-left:4px solid #5e6e5fff; border-radius:4px;">
        <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:8px;">CONDIÇÕES DE PAGAMENTO</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <div style="font-size:11px; color:#black; margin-bottom:2px;">Tipo de Pagamento</div>
            <div style="font-weight:600;">${(p.tipoPagamento || 'NÃO INFORMADO').toUpperCase()}</div>
          </div>
          <div>
            <div style="font-size:11px; color:#black; margin-bottom:2px;">Prazo</div>
            <div style="font-weight:600;">${(p.prazoPagamento || 'NÃO INFORMADO').replaceAll('_',' ').toUpperCase()}</div>
          </div>
        </div>
      </div>

      <!-- ENTRADA (se houver) -->
      ${(p.tipoCliente === 'cliente' && p.percentualEntrada > 0) ? `
        <div style="margin-top:12px; padding:10px; background:#e1f5fe; border-left:4px solid #808283ff; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:8px;">④ ENTRADA (${p.percentualEntrada}% do valor total)</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Valor da entrada</span>
            <span style="font-weight:700; font-size:18px; color:#03a9f4;">${formatCurrency(entradaTotalCalc)}</span>
          </div>
          ${sinalPago > 0 ? `
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid #838587ff; margin-top:6px;">
              <span style="font-size:12px;">Sinal já pago</span>
              <span style="font-weight:600; color:#4caf50;">${formatCurrency(sinalPago)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px;">
              <span style="font-size:12px;">Falta pagar da entrada</span>
              <span style="font-weight:600; color:#ff9800;">${formatCurrency(entradaTotalCalc - sinalPago)}</span>
            </div>
          ` : ''}
        </div>

        <!-- SALDO A PAGAR (O QUE FALTA APÓS ENTRADA) -->
        <div style="margin-top:12px; padding:14px; background:#838587ff; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-weight:700; font-size:14px; color:black; margin-bottom:6px;">⑤ SALDO A PAGAR (APÓS FATURAMENTO)</div>
          <div style="font-size:12px; color:black; margin-bottom:6px; opacity:0.9;">Este é o valor que será parcelado</div>
          <div style="font-weight:700; font-size:22px; color:black;">${formatCurrency(saldoAPagarCalc)}</div>
        </div>
      ` : ''}

      <!-- PARCELAMENTO -->
      ${(parcelasCorrigidas && parcelasCorrigidas.length > 0 && p.prazoPagamento && p.prazoPagamento.toLowerCase() !== 'à vista') ? `
        <div style="margin-top:12px; padding:10px; background:#fce4ec; border-left:4px solid #af1a1aff; border-radius:4px;">
          <div style="font-weight:700; font-size:14px; color:#black; margin-bottom:4px;">${p.tipoCliente === 'cliente' && p.percentualEntrada > 0 ? '⑥' : '④'} PARCELAMENTO (APÓS FATURAMENTO)</div>
          <div style="font-size:11px; color:#666; margin-bottom:8px;">O saldo de ${formatCurrency(saldoAPagarCalc)} será dividido em ${parcelasCorrigidas.length} parcelas:</div>
          <div style="display:grid; grid-template-columns:repeat(${parcelasCorrigidas.length > 2 ? '3' : '2'}, 1fr); gap:8px;">
            ${parcelasCorrigidas.map((parcela, idx) => `
              <div style="background:white; padding:8px; border-radius:4px; text-align:center;">
                <div style="font-size:11px; color:#black; margin-bottom:2px;">Parcela ${parcela.numero || idx + 1}</div>
                <div style="font-weight:700; color:#black;">${formatCurrency(parcela.valor || 0)}</div>
              </div>
            `).join('')}
          </div>
          <div style="border-top:1px solid #f8bbd0; margin-top:8px; padding-top:8px; display:flex; justify-content:space-between;">
            <span style="font-size:12px; font-weight:600;">Total das parcelas:</span>
            <span style="font-size:12px; font-weight:700;">${formatCurrency(parcelasCorrigidas.reduce((acc, parc) => acc + (parc.valor || 0), 0))}</span>
          </div>
        </div>
      ` : ''}

      <!-- OUTRAS OBSERVAÇÕES -->
      <div style="margin-top:16px; padding:10px; background:#eceff1; border-left:4px solid #607d8b; border-radius:4px;">
        <div style="font-weight:700; font-size:16px; color:#black; margin-bottom:8px;">OUTRAS CONDIÇÕES</div>
        <div style="font-size:12px; line-height:1.6;">
          ${p.tipoInstalacao ? `<div><strong>Instalação:</strong> ${p.tipoInstalacao.toUpperCase()}</div>` : ''}
          ${p.localInstalacao ? `<div><strong>Local:</strong> ${p.localInstalacao.toUpperCase()}</div>` : ''}
          <div><strong>Validade:</strong> 30 DIAS</div>
        </div>
      </div>

      <!-- BLOCO DE DADOS BANCÁRIOS COM ÍCONES -->
      <div style="margin-top:80mm;"></div>
      <div style="page-break-before: always;"></div>
      <div class="rule" style="margin:8mm 0 4mm 0;"></div>
      <div style="font-weight:700; font-size:4mm; text-transform:uppercase; margin-bottom:3mm;">DADOS BANCÁRIOS – STARK INDUSTRIAL LTDA</div>

      <div style="
        display:grid;
        grid-template-columns: repeat(3, 1fr);
        column-gap:6mm;
        font-size:3.7mm;
        line-height:1.4;
      ">
        <div style="margin-bottom:3mm;">
          <img src="${logoBB}" alt="Banco do Brasil" style="width:80px;height:auto;margin-bottom:2mm;display:block;"/>
          <div style="font-weight:700;">Banco do Brasil (001)</div>
          <div>Agência: 0339-5</div>
          <div>Conta Corrente: 60548-4</div>
        </div>

        <div style="margin-bottom:3mm;">
          <img src="${logoSicredi}" alt="Sicredi" style="width:80px;height:auto;margin-bottom:2mm;display:block;"/>
          <div style="font-weight:700;">Banco Sicredi (748)</div>
          <div>Agência: 0307</div>
          <div>Conta Corrente: 40771-1</div>
        </div>

        <div style="margin-bottom:3mm;">
          <img src="${logoSicoob}" alt="Sicoob" style="width:80px;height:auto;margin-bottom:2mm;display:block;"/>
          <div style="font-weight:700;">Banco Sicoob (756)</div>
          <div>Agência: 3072-4</div>
          <div>Conta Corrente: 33276-3</div>
        </div>
      </div>

      <div style="margin-top:5mm; font-size:3.7mm;">
        <div><b>Stark Industrial Ltda</b> (EF Indústria de Máquinas)</div>
        <div>CNPJ: 33.228.312/0001-06</div>
        <div style="margin-top:2mm;">
          Pix CNPJ: <b>33228312000106</b> – Sicredi<br/>
          Pix e-mail: <b>financeiro@starkindustrial.ind.br</b> – Banco do Brasil
        </div>
      </div>
    </div>
  `;
  return el;
};

// CLÁUSULAS + ASSINATURAS
const renderClausulas = ({ inline = false } = {}) => {
  const clausulas = [
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
    'As assinaturas abaixo formalizam o presente pedido e a concordância com os termos e condições.'
  ];

  const el = createContainer('pdf-clausulas', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">CLÁUSULAS CONTRATUAIS</div>
      <div class="lower" style="font-size:${STYLE.CLAUSE_SIZE}px; line-height:1.28;">
        ${clausulas.map((c, i) => `<p class="p p-justify lower" style="margin-bottom:4px;">${i + 1}. ${c}</p>`).join('')}
      </div>
    </div>
  `;
  return el;
};

const renderAssinaturas = (pedidoData, { inline = false } = {}) => {
  let vendedor = pedidoData.vendedor || '';
  try {
    if (!vendedor) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      vendedor = u.nome || '';
    }
  } catch {}
  if (!vendedor) vendedor = 'NÃO INFORMADO';

  const cliente = (pedidoData.clienteData && pedidoData.clienteData.nome) ? pedidoData.clienteData.nome : 'NÃO INFORMADO';

  const el = createContainer('pdf-assinaturas', { inline });
  el.innerHTML += `
    <div class="wrap" style="padding:22px;">
      <div class="title">ASSINATURAS</div>
      <div style="margin-top:24px; display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="center">
          <div style="height: 56px;"></div>
          <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 14px;">CLIENTE: ${cliente.toUpperCase()}</div>
        </div>
        <div class="center">
          <div style="height: 56px;"></div>
          <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 14px;">VENDEDOR: ${vendedor.toUpperCase()}</div>
        </div>
      </div>
    </div>
  `;
  return el;
};

/**
 * ==========================
 *  ANEXO DE GRÁFICOS (PDF)
 * ==========================
 */
const appendGraficosDeCarga = async (pdf, pedidoData) => {
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

      const loadingTask = pdfjsLib.getDocument({ url });
      const extPDF = await loadingTask.promise;
      const n = extPDF.numPages;

      for (let p = 1; p <= n; p++) {
        const page = await extPDF.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const img = canvas.toDataURL('image/png');

        pdf.addPage(); // sem header/footer
        const maxW = PAGE.width - 2 * MARGIN;
        const scaledH = (canvas.height * maxW) / canvas.width;
        const maxH = PAGE.height - 2 * MARGIN;
        let drawW = maxW;
        let drawH = scaledH;
        if (scaledH > maxH) {
          drawH = maxH;
          drawW = (canvas.width * maxH) / canvas.height;
        }
        const x = (PAGE.width - drawW) / 2;
        const y = (PAGE.height - drawH) / 2;
        pdf.addImage(img, 'PNG', x, y, drawW, drawH);
      }
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

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const ts = `PROPOSTA GERADA AUTOMATICAMENTE EM ${new Date().toLocaleString('pt-BR')}`;
      const numeroProposta = getNextProposalNumber();

      const headerDataURL = await renderImageToDataURL(HEADER_IMG);
      const footerDataURL = await renderImageToDataURL(FOOTER_IMG);

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont(STYLE.FONT, 'normal');

      // ==== PÁGINA 1: CAPA + CLIENTE + EQUIPAMENTO (todos inline)
     {
  const el = renderCapa(pedidoData, numeroProposta, { inline: false });
  const cv = await htmlToCanvas(el);
  addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
}

// ==== PÁGINA 2: DADOS DO EQUIPAMENTO
{
  const el = renderEquipamento(pedidoData, { inline: false });
  const cv = await htmlToCanvas(el);
  addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
}

      // ==== GRÁFICOS DE CARGA (logo após dados do equipamento)
      await appendGraficosDeCarga(pdf, pedidoData);

      // ==== PÁGINA 3: VEÍCULO + ESTUDO VEICULAR (inline para tentar caber)
      {
        const root = createContainer('page2-root', { inline: true });
        root.appendChild(renderCaminhao(pedidoData, { inline: true }));
        root.appendChild(renderEstudoVeicular(pedidoData, { inline: true }));
        const cv = await htmlToCanvas(root);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // ==== PÁGINA 4: FINANCEIRO
      {
        const el = await renderFinanceiro(pedidoData, { inline: false });
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // ==== PÁGINA 5: CLÁUSULAS + ASSINATURAS (mesma página)
      {
        const root = createContainer('page4-root', { inline: true });
        root.appendChild(renderClausulas({ inline: true }));
        root.appendChild(renderAssinaturas(pedidoData, { inline: true }));
        const cv = await htmlToCanvas(root);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      const fileName = `proposta_stark_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // (Opcional) salvar metadados no banco — mantém tua lógica
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const valorTotal = (pedidoData.carrinho || []).reduce((acc, item) => acc + (item.preco || 0), 0);

        await db.createProposta({
          numero_proposta: numeroProposta,
          data: new Date().toISOString(),
          vendedor_id: user.id || null,
          vendedor_nome: pedidoData.vendedor || user.nome || 'Não informado',
          cliente_nome: pedidoData.clienteData?.nome || 'Não informado',
          cliente_documento: pedidoData.clienteData?.documento || null,
          valor_total: valorTotal,
          tipo: 'proposta', // se quiser retomar a lógica de orçamento x proposta, dá para reativar aqui
          status: 'finalizado',
          dados_serializados: pedidoData
        });
      } catch (dbError) {
        console.error('❌ Erro ao salvar proposta no banco:', dbError);
      }

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
