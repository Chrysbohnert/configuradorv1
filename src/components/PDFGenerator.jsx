import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { buildGraficoKey, resolveGraficoUrl } from '../utils/modelNormalization';
import { db } from '../config/supabase';

// Worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * ==========================
 *  CONFIGURAÇÕES GERAIS
 * ==========================
 */
const PAGE = { width: 210, height: 297 }; // A4 em mm
const MARGIN = 12;                         // margem interna do PDF
const HEADER_H = 25;                       // altura do cabeçalho (mm)
const FOOTER_H = 22;                       // altura do rodapé (mm)
const CONTENT_W = PAGE.width - 2 * MARGIN; // largura útil
const CONTENT_H = PAGE.height - HEADER_H - FOOTER_H - 4; // altura útil

// Tipografia / estilo base (coeso e corporativo)
const STYLE = {
  TITLE_SIZE: 22,
  SUBTITLE_SIZE: 14,
  BODY_SIZE: 11,
  CLAUSE_SIZE: 9.2, // cláusulas em corpo menor e caixa baixa
  LINE: 5,          // espaçamento base em mm para títulos/blocos
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

// Cria contêiner off-DOM com CSS padrão (preto/branco + CAIXA ALTA)
const createOffscreenContainer = (id = 'pdf-section') => {
  const el = document.createElement('div');
  el.id = id;
  el.style.position = 'absolute';
  el.style.left = '-99999px';
  el.style.top = '0';
  el.style.width = '1000px'; // base para html2canvas
  el.style.background = '#fff';
  el.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      body, div, p, table, td, th, h1, h2, h3 { margin: 0; padding: 0; }
      .wrap { font-family: Arial, Helvetica, sans-serif; color: #000; }
      .title { 
        text-transform: uppercase; 
        font-weight: 700; 
        letter-spacing: 0.6px; 
        font-size: 28px; 
        text-align: center; 
        margin-bottom: 22px; 
      }
      .subtitle {
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.4px;
        font-size: 16px;
        margin: 18px 0 8px 0;
      }
      .kvs {
        text-transform: uppercase;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 16px;
        font-size: 18px;
        line-height: 1.8;
      }
      .kvs .row { display: grid; grid-template-columns: 180px 1fr; gap: 8px; }
      .k { font-weight: 700; }
      .v { }
      .v {
      font-size: 15px;
      }
      .rule {
        height: 1px; background: #000; margin: 18px 0;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: 16px;
        text-transform: uppercase;
      }
      .table th, .table td {
        border: 1px solid #000; padding: 8px; vertical-align: top;
      }
      .table th { font-weight: 700; text-align: left; }
      .muted { color: #111; opacity: 0.88; }
      .block { margin-bottom: 18px; }
      .center { text-align: center; }
      .right { text-align: right; }
      .small-gap { margin-top: 10px; }
      .caps { text-transform: uppercase; }
      .lower { text-transform: none; } /* exceção para cláusulas */
      .p { font-size: 16px; line-height: 1.55; }
      .p-justify { text-align: justify; }
    </style>
  `;
  return el;
};

// Renderiza cabeçalho/rodapé como canvas e retorna dataURL para reuso
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

// Desenha uma página no PDF com header/footer + um conteúdo (canvas) centralizado e paginado se precisar
const addSectionCanvasPaginated = (pdf, sectionCanvas, headerDataURL, footerDataURL, timestampText) => {
  // Converter px→mm desta seção
  const sectionWpx = sectionCanvas.width;
  const sectionHpx = sectionCanvas.height;

  // Queremos encaixar a largura do conteúdo dentro de CONTENT_W
  const mmPerPx = CONTENT_W / sectionWpx; // escala em mm/px (horizontal)
  const sectionHmm = sectionHpx * mmPerPx; // altura em mm do conteúdo, mantendo proporção

  // Quantidade de páginas necessárias para esta seção
  const pages = Math.max(1, Math.ceil(sectionHmm / CONTENT_H));

  // Para cada página, cortar um slice vertical do canvas
  for (let p = 0; p < pages; p++) {
    if (!(pdf.__firstPageAdded)) {
      pdf.__firstPageAdded = true;
    } else {
      pdf.addPage();
    }

    // Header
    pdf.addImage(headerDataURL, 'PNG', 0, 0, PAGE.width, HEADER_H + 5);

    // Cálculo do recorte
    const sliceStartMm = p * CONTENT_H;
    const sliceHeightMm = Math.min(CONTENT_H, sectionHmm - sliceStartMm);
    const sliceStartPx = Math.floor(sliceStartMm / mmPerPx);
    const sliceHeightPx = Math.ceil(sliceHeightMm / mmPerPx);

    // Canvas temporário para cortar a fatia
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

    // Posição do conteúdo logo após o header
    const y = HEADER_H + 10; // aumenta o afastamento do texto em relação ao cabeçalho
    pdf.addImage(imgData, 'PNG', MARGIN, y, CONTENT_W, sliceHeightMm);

    // Timestamp pequeno (logo acima do rodapé)
    pdf.setFont(STYLE.FONT, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(timestampText, MARGIN, PAGE.height - FOOTER_H - 2);

    // Footer
    pdf.addImage(footerDataURL, 'PNG', 0, PAGE.height - FOOTER_H, PAGE.width, FOOTER_H + 3);
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

// CAPA / IDENTIFICAÇÃO
const renderCapa = (pedidoData, numeroProposta) => {
  const el = createOffscreenContainer('pdf-capa');
  const vendedor = pedidoData.vendedor || 'NÃO INFORMADO';
  const data = new Date().toLocaleDateString('pt-BR');
  const c = pedidoData.clienteData || {};
  const endereco = (() => {
  const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
  const bairro = c.bairro ? ` - ${c.bairro}` : '';
  const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
  const cep = c.cep ? ` - CEP: ${c.cep}` : '';
  const linha = `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim();
  return linha || (c.endereco || 'NÃO INFORMADO');
  })();

  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
      <div class="rule"></div>
      <div class="kvs" style="margin-top: 16px;">
        <div class="row"><div class="k">Nº DA PROPOSTA</div><div class="v">#${numeroProposta}</div></div>
        <div class="row"><div class="k">DATA</div><div class="v">${data}</div></div>
        <div class="row"><div class="k">VENDEDOR</div><div class="v">${vendedor}</div></div>
        <div class="row"><div class="k">EMPRESA</div><div class="v">STARK INDUSTRIAL LTDA.</div></div>
      </div>
      <div class="rule"></div>
      <div class="subtitle">DADOS DO CLIENTE</div>
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

// DADOS DO CLIENTE
const renderCliente = (pedidoData) => {
  const c = pedidoData.clienteData || {};
  const endereco = (() => {
    const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
    const bairro = c.bairro ? ` - ${c.bairro}` : '';
    const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
    const cep = c.cep ? ` - CEP: ${c.cep}` : '';
    const linha = `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim();
    return linha || (c.endereco || 'NÃO INFORMADO');
  })();

  const el = createOffscreenContainer('pdf-cliente');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
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
const renderEquipamento = (pedidoData) => {
  // Guindaste principal (ou vários)
  const guindastes = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
  const opcionais = (pedidoData.carrinho || []).filter(i => i.tipo === 'opcional');

  // Tentar enriquecer dados do guindaste com 'pedidoData.guindastes' (se houver)
  const enrich = (item) => {
    const banco = (pedidoData.guindastes || []).find(g => (
      (g?.id && item?.id && g.id === item.id) ||
      (g?.nome && item?.nome && g.nome === item.nome) ||
      (g?.modelo && item?.modelo && g.modelo === item.modelo)
    ));
    return {
      ...item,
      ...(banco || {}),
      descricao: banco?.descricao || item?.descricao || '',
      nao_incluido: banco?.nao_incluido || item?.nao_incluido || '',
      finame: banco?.finame || item?.finame || '',
      ncm: banco?.ncm || item?.ncm || '',
    };
  };
  const gList = guindastes.map(enrich);

  // Conteúdo
  const el = createOffscreenContainer('pdf-equipamento');
  let html = `
    <div class="wrap" style="padding:28px;">
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
          ${g.subgrupo ? `<div class="row"><div class="k">SUBGRUPO</div><div class="v">${g.subgrupo}</div></div>` : ''}
          ${g.finame ? `<div class="row"><div class="k">FINAME</div><div class="v">${g.finame}</div></div>` : ''}
          ${g.ncm ? `<div class="row"><div class="k">NCM</div><div class="v">${g.ncm}</div></div>` : ''}
        </div>
        <div class="small-gap"></div>
        <div class="subtitle">DESCRIÇÃO TÉCNICA</div>
        <div class="p p-justify caps">${g.descricao ? g.descricao : 'NÃO INFORMADO'}</div>
        <div class="small-gap"></div>
        <div class="subtitle">NÃO INCLUÍDO</div>
        <div class="p p-justify caps">${g.nao_incluido ? g.nao_incluido : 'NÃO INFORMADO'}</div>
      `;
    });
  }

  // Opcionais
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

  // Total
  const total = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);
  html += `
      <div class="rule"></div>
      <div class="kvs">
        <div class="row"><div class="k">TOTAL DA PROPOSTA</div><div class="v right">${formatCurrency(total)}</div></div>
      </div>
    </div>
  `;
  el.innerHTML += html;
  return el;
};

// DADOS DO CAMINHÃO
const renderCaminhao = (pedidoData) => {
  const v = pedidoData.caminhaoData || {};
  const el = createOffscreenContainer('pdf-caminhao');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
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
const renderEstudoVeicular = (pedidoData) => {
  const v = pedidoData.caminhaoData || {};
  const temMedidas = v.medidaA || v.medidaB || v.medidaC || v.medidaD;

  const el = createOffscreenContainer('pdf-estudo');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
      <div class="title">ESTUDO VEICULAR</div>
      <div class="center small-gap">
        <img src="/estudoveicular.png" alt="Estudo Veicular" style="max-width:700px;width:100%;height:auto;"/>
      </div>
      ${
        temMedidas ? `
          <div class="subtitle">MEDIDAS</div>
          <div class="kvs" style="grid-template-columns: 1fr 1fr;">
            ${v.medidaA ? `<div class="row"><div class="k">MEDIDA A</div><div class="v">${v.medidaA}</div></div>` : ''}
            ${v.medidaB ? `<div class="row"><div class="k">MEDIDA B</div><div class="v">${v.medidaB}</div></div>` : ''}
            ${v.medidaC ? `<div class="row"><div class="k">MEDIDA C</div><div class="v">${v.medidaC}</div></div>` : ''}
            ${v.medidaD ? `<div class="row"><div class="k">MEDIDA D</div><div class="v">${v.medidaD}</div></div>` : ''}
          </div>
        ` : `
          <div class="p caps center small-gap">MEDIDAS NÃO INFORMADAS.</div>
        `
      }
    </div>
  `;
  return el;
};

// CONDIÇÕES COMERCIAIS E FINANCEIRAS
const renderFinanceiro = (pedidoData) => {
  const p = pedidoData.pagamentoData || {};
  const totalBase = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);

  const el = createOffscreenContainer('pdf-financeiro');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
      <div class="title">CONDIÇÕES COMERCIAIS E FINANCEIRAS</div>

      <div class="kvs">
        <div class="row"><div class="k">TIPO DE PAGAMENTO</div><div class="v">${(p.tipoPagamento || 'NÃO INFORMADO').toUpperCase()}</div></div>
        <div class="row"><div class="k">PRAZO</div><div class="v">${(p.prazoPagamento || 'NÃO INFORMADO').replaceAll('_',' ').toUpperCase()}</div></div>
        <div class="row"><div class="k">VALOR BASE</div><div class="v">${formatCurrency(totalBase)}</div></div>
        <div class="row"><div class="k">DESCONTO</div><div class="v">${p.desconto ? `${p.desconto}%` : '0%'}</div></div>
        <div class="row"><div class="k">ACRÉSCIMO</div><div class="v">${p.acrescimo ? `${p.acrescimo}%` : '0%'}</div></div>
        ${p.valorFrete ? `<div class="row"><div class="k">FRETE</div><div class="v">${formatCurrency(p.valorFrete)}</div></div>` : ''}
        ${p.valorInstalacao ? `<div class="row"><div class="k">INSTALAÇÃO</div><div class="v">${formatCurrency(p.valorInstalacao)}</div></div>` : ''}
        <div class="row"><div class="k">VALOR FINAL</div><div class="v">${formatCurrency(p.valorFinal || totalBase)}</div></div>
      </div>

      ${(p.tipoCliente === 'cliente' && p.percentualEntrada > 0) ? `
        <div class="rule"></div>
        <div class="subtitle">ENTRADA</div>
        <div class="kvs">
          <div class="row"><div class="k">PERCENTUAL DE ENTRADA</div><div class="v">${p.percentualEntrada}%</div></div>
          <div class="row"><div class="k">ENTRADA TOTAL</div><div class="v">${formatCurrency(p.entradaTotal || 0)}</div></div>
          ${p.valorSinal ? `<div class="row"><div class="k">SINAL JÁ PAGO</div><div class="v">- ${formatCurrency(p.valorSinal)}</div></div>` : ''}
          <div class="row"><div class="k">FALTA PAGAR DE ENTRADA</div><div class="v">${formatCurrency(p.faltaEntrada || 0)}</div></div>
          <div class="row"><div class="k">SALDO A PAGAR</div><div class="v">${formatCurrency(p.saldoAPagar || p.valorFinal || 0)}</div></div>
        </div>
      ` : ''}

      <div class="rule"></div>
      <div class="subtitle">OUTRAS CONDIÇÕES</div>
      <div class="kvs">
        ${p.tipoFrete ? `<div class="row"><div class="k">TIPO DE FRETE</div><div class="v">${p.tipoFrete.toUpperCase()}</div></div>` : ''}
        ${p.tipoInstalacao ? `<div class="row"><div class="k">TIPO DE INSTALAÇÃO</div><div class="v">${p.tipoInstalacao.toUpperCase()}</div></div>` : ''}
        ${p.localInstalacao ? `<div class="row"><div class="k">LOCAL DE INSTALAÇÃO</div><div class="v">${p.localInstalacao.toUpperCase()}</div></div>` : ''}
        <div class="row"><div class="k">VALIDADE DA PROPOSTA</div><div class="v">30 DIAS</div></div>
      </div>
    </div>
  `;
  return el;
};

// CLÁUSULAS CONTRATUAIS (única parte em caixa baixa)
const renderClausulas = () => {
  const clausulas = [
    'O prazo de validade deste pedido será de 10 dias contados após a assinatura do mesmo para pagamento via recurso próprio e 30 dias para financiamento bancário.',
    'Caso haja a necessidade de inclusão e ou modificação de modelo da caixa de patola auxiliar no equipamento (mediante estudo de integração veicular), o custo não será de responsabilidade da STARK Guindastes.',
    'Caminhões com Caixa de Câmbio Automática exigem parametrização em concessionária para a habilitação e funcionamento da Tomada de Força. O custo deste serviço não está incluso nesta proposta.',
    'O prazo de entrega do equipamento terá início a partir do recebimento da autorização de faturamento quando via banco, do pagamento de 100% da entrada quando via parcelado fábrica e 100% do valor do equipamento quando à vista.',
    'Vendas com parcelamento fábrica, é obrigatório o envio da documentação solicitada para análise de crédito em até 5 (cinco) dias úteis.',
    'O embarque do equipamento está condicionado ao pagamento de 100% do valor acordado e contrato de reserva de domínio assinado e com firma reconhecida para os casos de financiamento fábrica.',
    'As condições deste pedido são válidas somente para os produtos e quantidades constantes no mesmo.',
    'O atendimento deste pedido está sujeito a análise cadastral e de crédito, quando a condição de pagamento for a prazo.',
    'É obrigatório informar placa, chassi e modelo de caminhão onde será instalado o guindaste para confecção do Contrato de Reserva de Domínio, mediante cópia do documento ou NF do caminhão. Desde já fica autorizada a inclusão desta no documento do veículo.',
    'Se houver diferença de alíquota de ICMS, a mesma será de responsabilidade do comprador, conforme legislação vigente em seu estado de origem.',
    'Quando a retirada for por conta do cliente, o motorista transportador deverá estar devidamente autorizado e com carteira de motorista válida.',
    'O atraso na definição da marca/modelo do veículo e do nº e modelo da caixa de câmbio, bem como, atraso no encaminhamento do veículo para montagem, prorrogam automaticamente o prazo de entrega, em números de dias úteis equivalentes.',
    'No caso de vendas feitas a prazo, caso ocorra inadimplência de quaisquer das parcelas ficará suspensa a garantia contratual do equipamento no respectivo período, a qual perdurará até a data de regularização da situação. O inadimplemento de parcela(s) ensejará no pagamento de multa de 2% sobre seu respectivo valor e juros de 0,33% por dia de atraso.',
    'É obrigatório o estudo de integração veicular para a montagem do equipamento, sendo de responsabilidade do cliente o envio à STARK Guindastes dos dados do caminhão em até 5 (cinco) dias úteis contados da assinatura do pedido. Caso a montagem seja feita sem o estudo, a STARK Guindastes não se responsabiliza pela mesma.',
    'A STARK Guindastes não se responsabiliza por despesas extras com o caminhão, tais como: deslocamento de arla, aumento de entre eixo e balanço traseiro, inclusão de eixo extra, deslocamento de barra de direção, reforço de molas, retirada e modificações em carrocerias e parametrização do caminhão.',
    'No momento do faturamento, o preço do equipamento será atualizado para o valor a ele correspondente na tabela vigente (Tabela de Preços STARK Guindastes), ficando condicionado o seu embarque ao pagamento da respectiva diferença resultante dessa correção a ser feito pelo Contratante à STARK Guindastes.',
    'As assinaturas abaixo formalizam o presente pedido, indicando a total concordância entre as partes com os termos e condições do presente negócio.'
  ];

  const el = createOffscreenContainer('pdf-clausulas');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
      <div class="title">CLÁUSULAS CONTRATUAIS</div>
     <div class="lower" style="font-size:${STYLE.CLAUSE_SIZE}px; line-height:1.3;">
    ${clausulas.map((c, i) => `<p class="p p-justify lower" style="margin-bottom:4px;">${i+1}. ${c}</p>`).join('')}
    </div>
    </div>
  `;
  return el;
};

// ASSINATURAS
const renderAssinaturas = (pedidoData) => {
  let vendedor = pedidoData.vendedor || '';
  try {
    if (!vendedor) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      vendedor = u.nome || '';
    }
  } catch { /* ignore */ }
  if (!vendedor) vendedor = 'NÃO INFORMADO';

  const cliente = (pedidoData.clienteData && pedidoData.clienteData.nome) ? pedidoData.clienteData.nome : 'NÃO INFORMADO';

  const el = createOffscreenContainer('pdf-assinaturas');
  el.innerHTML += `
    <div class="wrap" style="padding:28px;">
      <div class="title">ASSINATURAS</div>
      <div style="margin-top:30px; display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="center">
          <div style="height: 72px;"></div>
          <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 14px;">CLIENTE: ${cliente.toUpperCase()}</div>
        </div>
        <div class="center">
          <div style="height: 72px;"></div>
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

        pdf.addPage();
        // Encaixar no A4, sem header/rodapé
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
      // Data/hora de geração (timestamp discreto)
      const ts = `PROPOSTA GERADA AUTOMATICAMENTE EM ${new Date().toLocaleString('pt-BR')}`;
      const numeroProposta = getNextProposalNumber();

      // Pré-render de header e footer (reuso nas páginas)
      const headerDataURL = await renderImageToDataURL(HEADER_IMG);
      const footerDataURL = await renderImageToDataURL(FOOTER_IMG);

      // Instanciar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont(STYLE.FONT, 'normal');

      /**
       * ORDEM DAS PÁGINAS (uma seção por página)
       */
      // CAPA + CLIENTE + EQUIPAMENTO (mesma página)
      {
        const el = document.createElement('div');
        el.appendChild(renderCapa(pedidoData, numeroProposta, modo));
        el.appendChild(renderCliente(pedidoData));
        el.appendChild(renderEquipamento(pedidoData));
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 4) VEÍCULO
      {
        const el = renderCaminhao(pedidoData);
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 5) ESTUDO VEICULAR
      {
        const el = renderEstudoVeicular(pedidoData);
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 6) FINANCEIRO
      {
        const el = renderFinanceiro(pedidoData);
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 7) CLÁUSULAS
      {
        const el = renderClausulas(pedidoData);
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 8) ASSINATURAS
      {
        const el = renderAssinaturas(pedidoData);
        const cv = await htmlToCanvas(el);
        addSectionCanvasPaginated(pdf, cv, headerDataURL, footerDataURL, ts);
      }

      // 9) ANEXAR PDFs DE GRÁFICO DE CARGA (SEM HEADER/FOOTER)
      await appendGraficosDeCarga(pdf, pedidoData);

      // Salvar
      const fileName = `proposta_stark_${new Date().toISOString().split('T')[0]}.pdf`;
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
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: '0.875rem',
              lineHeight: '1.4'
            }}>
              Processando sua proposta com layout profissional...
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </>
  );
};

export default PDFGenerator;
