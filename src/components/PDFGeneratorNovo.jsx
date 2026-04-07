import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils/formatters';

const PAGE = { width: 210, height: 297 }; // A4 em mm

// Renderiza imagem como dataURL
const renderImageToDataURL = async (src) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => {
      console.warn('⚠️ Erro ao carregar imagem:', src);
      resolve('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1000" height="1414"%3E%3Crect fill="%23f0f0f0" width="1000" height="1414"/%3E%3C/svg%3E');
    };
    img.src = src;
  });
};

// Cria container para renderizar
const createContainer = (id = 'pdf-section') => {
  const el = document.createElement('div');
  el.id = id;
  el.style.position = 'absolute';
  el.style.left = '-99999px';
  el.style.top = '0';
  el.style.width = '1000px';
  el.style.background = '#fff';
  return el;
};

// Renderiza página como canvas
const renderPageToCanvas = async (html) => {
  const container = createContainer();
  container.innerHTML = html;
  document.body.appendChild(container);
  
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });
  
  document.body.removeChild(container);
  return canvas;
};

// Adiciona página ao PDF
const addPageToPDF = (pdf, canvas, pageIndex) => {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const imgWidth = PAGE.width;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  if (pageIndex > 0) {
    pdf.addPage();
  }
  
  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
};

// ===== RENDERIZADORES DE PÁGINA =====

const renderCapa = async (pedidoData, capaIndex) => {
  const capaFile = capaIndex % 2 === 0 ? 'CAPA-1.jpg' : 'CAPA-3.jpg';
  const capaUrl = `/páginas do pdf/${capaFile}`;
  const capaDataUrl = await renderImageToDataURL(capaUrl);
  
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page { width: 1000px; height: 1414px; position: relative; background-image: url('${capaDataUrl}'); background-size: cover; background-position: center; }
    </style>
    <div class="page"></div>
  `;
};

const renderPagina1 = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 1 (2).jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);

  const clienteNome =
    (pedidoData.clienteData && pedidoData.clienteData.nome)
      ? pedidoData.clienteData.nome
      : (pedidoData.cliente_nome || 'CLIENTE');

  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const tituloProposta = pedidoData?.isConcessionariaCompra
    ? 'PROPOSTA DE COMPRA'
    : 'PROPOSTA COMERCIAL';

  // ✅ este é o nome do vendedor
  const vendedor = pedidoData.vendedor_nome || 'REPRESENTANTE STARK';

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      .page {
        width: 1000px;
        height: 1414px;
        position: relative;
        background-image: url('${bgDataUrl}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        font-family: Arial, sans-serif;
        color: #000;
      }

      .topbox {
        position: absolute;
        top: 260px;
        left: 120px;
        width: 760px;
        height: 170px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 48px;
      }

      .top-inner { width: 100%; }

      .top-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 24px;
        font-size: 22px;
        line-height: 1.2;
      }

      .top-row b { font-weight: 900; }

      .divider {
        width: 100%;
        height: 2px;
        background: rgba(0,0,0,0.12);
        margin: 16px 0;
      }

      .textbox {
        position: absolute;
        top: 500px;
        left: 150px;
        width: 700px;
        height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 42px;
      }

      .text {
        width: 100%;
        text-align: left;
        font-size: 28px;
        line-height: 1.25;
        color: #111;
      }

      .text strong { font-weight: 900; }
    </style>

    <div class="page">
      <div class="topbox">
        <div class="top-inner">
          <div class="top-row">
            <div>${tituloProposta} • <b>${clienteNome}</b></div>
            <div><b>${dataAtual}</b></div>
          </div>

          <div class="divider"></div>

          <!-- ✅ aqui: esquerda label, direita vendedor -->
          <div class="top-row" style="font-size:20px;">
            <div>Representante Stark</div>
            <div><b>${vendedor}</b></div>
          </div>
        </div>
      </div>

      <div class="textbox">
        <div class="text">
          Na Stark Guindastes, compreendemos a demanda do seu negócio por equipamentos que entreguem
          não apenas robustez, mas também <strong>confiabilidade, agilidade e durabilidade superiores</strong>.
          Sabemos que cada içamento é uma oportunidade de otimizar tempo e recursos.
        </div>
      </div>
    </div>
  `;
};


const renderPagina2 = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 2.jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);

  const guindasteNome =
    pedidoData.carrinho?.[0]?.nome || pedidoData.guindaste_nome || 'STARK GSI 6.5 2H1M';

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page {
        width: 1000px; height: 1414px; position: relative;
        background-image: url('${bgDataUrl}');
        background-size: 100% 100%;      /* <<< TROCA PRINCIPAL (evita corte) */
        background-repeat: no-repeat;
        background-position: center;
      }

      .box {
        position: absolute;
        font-family: Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px;                  /* ajuste fino */
      }

      /* IMPORTANTÍSSIMO: o texto vai aqui dentro */
      .box-content {
        width: 100%;
        text-align: justify;
      }

      .box-white {
        top: 250px; left: 70px;
        width: 860px; height: 260px;
        font-size: 19px; line-height: 1.85;
        color: ##222;
      }
      .box-white strong { font-weight: 800; color: #000; }

      .box-green {
        top: 640px; left: 70px;
        width: 860px; height: 230px;
        font-size: 18px; line-height: 1.8;
        color: #fff;
      }
      .box-green strong { font-weight: 700; color: #fff; }
    </style>

    <div class="page">
      <div class="box box-white">
        <div class="box-content">
          É por isso que temos o prazer de apresentar o Guindaste Veicular Stark <strong>${guindasteNome}</strong>. Mais do que um equipamento, esta é uma solução de investimento estratégico projetada para transformar suas operações, agregando maior força, segurança e, acima de tudo, um retorno financeiro sólido para o seu empreendimento.
        </div>
      </div>

      <div class="box box-green">
        <div class="box-content">
          Acreditamos que a inovação e a qualidade do <strong>${guindasteNome}</strong> não só elevarão sua eficiência operacional a um novo patamar, mas também garantirão a valorização contínua do seu investimento. Convidamos você a explorar as próximas páginas e descobrir todos os detalhes que comprovam o valor desta parceria.
        </div>
      </div>
    </div>
  `;
};
const renderPagina3 = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 3.jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);

  const guindasteNome =
    pedidoData.carrinho?.[0]?.nome ||
    pedidoData.guindaste_nome ||
    'STARK GSI 6.5 2H1M';

  const alcance =
    pedidoData.carrinho?.[0]?.alcance ||
    pedidoData.alcance ||
    '5,5';

  const capacidadeTon =
    pedidoData.carrinho?.[0]?.capacidade ||
    pedidoData.capacidade ||
    '4,6';

  const capTonNum = parseFloat(String(capacidadeTon).replace(',', '.'));
  const capacidadeKg = Number.isFinite(capTonNum)
    ? Math.round(capTonNum * 1000).toLocaleString('pt-BR')
    : '4.060';

  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .page {
        width: 1000px;
        height: 1414px;
        position: relative;
        background-image: url('${bgDataUrl}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        font-family: Arial, sans-serif;
      }

      /* ===== TÍTULO ===== */
      .title-wrap {
        position: absolute;
        top: 110px;
        left: 90px;
        width: 820px;
      }

      .title-line {
        font-size: 34px;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #000;
      }

      .title-pill {
        display: inline-block;
        margin-top: 10px;
        background: rgba(230,230,230,0.9);
        border-radius: 999px;
        padding: 8px 22px;
      }

      .title-pill span {
        font-size: 36px;
        font-weight: 900;
        color: #000;
        text-transform: uppercase;
      }

      /* ===== BOXES ===== */
      .box {
        position: absolute;
        padding: 44px 46px;
      }

      .box-content {
        font-size: 19px;
        line-height: 1.75;
        color: #111;
        text-align: justify;
      }

      .box-content .bold {
        font-weight: 900;
      }

      /* BOX BRANCO */
      .box-white {
        top: 295px;
        left: 120px;
        width: 760px;
        height: 260px;
      }

      /* BOX AMARELO */
      .box-yellow {
        top: 615px;
        left: 120px;
        width: 760px;
        height: 300px;
      }
    </style>

    <div class="page">

      <!-- TÍTULO -->
      <div class="title-wrap">
        <div class="title-line">SEUS BENEFÍCIOS COM O</div>
        <div class="title-pill">
          <span>${guindasteNome}:</span>
        </div>
      </div>

      <!-- BOX BRANCO -->
      <div class="box box-white">
        <div class="box-content">
          <span class="bold">MÁXIMA PRODUTIVIDADE:</span>
          Com um alcance horizontal de ${alcance} metros e capacidade de içamento de até
          ${capacidadeKg} kg, você poderá executar mais tarefas em menos tempo, otimizando sua
          logística e mão de obra, resultando em uma
          <span class="bold">redução de tempo de carga e descarga em até 20%</span>.
        </div>
      </div>

      <!-- BOX AMARELO -->
      <div class="box box-yellow">
        <div class="box-content">
          <span class="bold">DURABILIDADE E VALORIZAÇÃO:</span>
          A construção em aço de alta resistência (STRENX 700 MPa) não só garante uma vida útil
          prolongada em condições severas de trabalho, mas também assegura um excelente valor de revenda
          para o seu ativo, contribuindo para um
          <span class="bold">menor custo de manutenção</span> graças aos componentes anticorrosivos.
        </div>
      </div>

    </div>
  `;
};

const renderPagina4 = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 4.jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);

  const guindasteNome =
    pedidoData.carrinho?.[0]?.nome || pedidoData.guindaste_nome || 'STARK GSI 6.5 2H1M';

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      .page {
        width: 1000px;
        height: 1414px;
        position: relative;
        background-image: url('${bgDataUrl}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        font-family: Arial, sans-serif;
        color: #000;
      }

      /* BASE DOS BOXES (estilo do print 2) */
      .box {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
      }

      .box-content {
        width: 100%;
        max-width: 520px;          /* trava pra não invadir a faixa da direita */
        text-align: center;        /* <<< IGUAL o print 2 */
        font-size: 22px;           /* <<< maior */
        line-height: 1.35;         /* <<< “cara de catálogo” */
        letter-spacing: 0.2px;
      }

      .box-content .t {
        display: block;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 10px;
      }

      .box-content .b {
        display: block;
        font-weight: 500;
      }

      .box-content .em {
        font-weight: 900;
      }

      /* BOX BRANCO */
      .box-white {
        top: 210px;
        left: 85px;
        width: 640px;
        height: 330px;
      }

      /* BOX AMARELO */
      .box-yellow {
        top: 610px;
        left: 110px;
        width: 600px;
        height: 520px;
      }

      /* no amarelo, um tiquinho menor pra caber perfeito */
      .box-yellow .box-content {
        font-size: 21px;
        line-height: 1.33;
      }
    </style>

    <div class="page">
      <!-- BOX BRANCO (igual print 2) -->
      <div class="box box-white">
        <div class="box-content">
          <span class="t">OPERAÇÃO SEGURA E PRECISA:</span>
          <span class="b">
            Equipado com válvulas de segurança<br/>
            em todos os cilindros e um sistema de<br/>
            giro de 360° suave, o GSI 6.5 oferece<br/>
            total controle e proteção para o<br/>
            operador, a carga e o ambiente de<br/>
            trabalho, garantindo uma <span class="em">operação</span><br/>
            <span class="em">segura e dentro das normas.</span>
          </span>
        </div>
      </div>

      <!-- BOX AMARELO (igual print 2) -->
      <div class="box box-yellow">
        <div class="box-content">
          <span class="t">EFICIÊNCIA FINANCEIRA E RETORNO<br/>SOBRE O INVESTIMENTO:</span>
          <span class="b">
            Além da agilidade operacional, o Stark ${guindasteNome}<br/>
            é uma escolha inteligente para o<br/>
            seu capital. Sua robustez e a minimização<br/>
            de paradas para manutenção,<br/>
            combinadas com a otimização dos<br/>
            tempos de ciclo, proporcionam uma<br/>
            <span class="em">redução significativa nos custos</span><br/>
            <span class="em">operacionais totais</span>, maximizando a<br/>
            lucratividade do seu negócio no médio e<br/>
            longo prazo.
          </span>
        </div>
      </div>
    </div>
  `;
};
const renderPagina5 = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 5.jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page {
        width: 1000px; height: 1414px; position: relative;
        background-image: url('${bgDataUrl}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        font-family: Arial, sans-serif;
        color: #000;
      }

      .box-white {
        position: absolute;
        top: 950px;       /* ✅ sobe um pouco pra encaixar melhor */
        left: 170px;      /* ✅ centraliza visualmente no shape */
        width: 660px;
        height: 360px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 42px 50px;
      }

      .content {
        width: 100%;
        text-align: center;      /* ✅ igual teu print 2 */
      }

      .title {
        font-size: 20px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 14px;
        letter-spacing: 0.2px;
      }

      .text {
        font-size: 17px;         /* ✅ maior */
        line-height: 1.55;
        color: #222;
      }

      .text strong { font-weight: 900; }
    </style>

    <div class="page">
      <div class="box-white">
        <div class="content">
          <div class="title">PARCERIA E SUPORTE INIGUALÁVEL:</div>
          <div class="text">
            Ao escolher a Stark, você não adquire apenas um guindaste; você garante uma parceria sólida e completa.
            Além de uma <strong>garantia padrão de fábrica de 12 meses</strong>, oferecemos suporte técnico especializado
            pós-instalação, que inclui uma <strong>revisão programada gratuita em até 30 dias</strong> após a instalação,
            e acesso facilitado à nossa rede de serviços e peças. Tudo isso assegura a máxima disponibilidade do seu
            equipamento, traduzindo-se em total tranquilidade e continuidade para sua operação, minimizando interrupções
            e garantindo que seu Stark esteja sempre pronto para o trabalho.
          </div>
        </div>
      </div>
    </div>
  `;
};


const renderPagina6EstudoVeicular = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 6 (2).jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);
  
  const v = pedidoData.caminhao || pedidoData.caminhaoData || {};
  const temMedidas = v.medidaA || v.medidaB || v.medidaC || v.medidaD || v.comprimentoChassi;

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page { width: 1000px; height: 1414px; position: relative; background-image: url('${bgDataUrl}'); background-size: cover; background-position: center; }
      .wrap { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 18px; }
      .title { text-transform: uppercase; font-weight: 700; font-size: 20px; text-align: left; margin-bottom: 10px; }
      .center { text-align: center; }
      .table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .table th, .table td { border: 1px solid #000; padding: 8px; vertical-align: top; }
      .table th { font-weight: 700; text-align: left; background: #f5f5f5; font-size: 12px; }
      .table td { font-weight: 700; font-size: 13px; }
    </style>
    <div class="page">
      <div class="wrap">
        <!-- DADOS DO VEÍCULO -->
        <div class="title">DADOS DO VEÍCULO</div>
        
        <!-- TABELA EM 2 COLUNAS LADO A LADO -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 8px;">
          <!-- COLUNA 1 -->
          <table class="table" style="font-size: 13px;">
            <tbody>
              <tr>
                <td style="font-weight: 600; width: 35%;">TIPO</td>
                <td style="font-weight: 700;">${v.tipo || 'NÃO INFORMADO'}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">MARCA</td>
                <td style="font-weight: 700;">${v.marca || 'NÃO INFORMADO'}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">MODELO</td>
                <td style="font-weight: 700;">${v.modelo || 'NÃO INFORMADO'}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- COLUNA 2 -->
          <table class="table" style="font-size: 13px;">
            <tbody>
              <tr>
                <td style="font-weight: 600; width: 35%;">ANO</td>
                <td style="font-weight: 700;">${v.ano || 'NÃO INFORMADO'}</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">VOLTAGEM</td>
                <td style="font-weight: 700;">${v.voltagem || 'NÃO INFORMADO'}</td>
              </tr>
              ${v.observacoes ? `
                <tr>
                  <td colspan="2" style="font-weight: 600; background: #f9f9f9; padding: 8px; border-left: 3px solid #333334ff;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 3px;">OBSERVAÇÕES:</div>
                    <div style="font-size: 12px;">${v.observacoes}</div>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- ESTUDO VEICULAR -->
        <div style="margin-top: 15px; padding-top: 12px; border-top: 2px solid #333;">
          <div class="title">ESTUDO VEICULAR</div>
          <div class="center" style="margin: 8px 0;">
            <img src="/estudoveicular.png" alt="Estudo Veicular" style="max-width: 600px; width: 100%; height: auto;"/>
          </div>
          ${
            temMedidas ? `
              <!-- MEDIDAS E PATOLAMENTO LADO A LADO -->
              <div style="display: grid; grid-template-columns: ${v.patolamento ? '2fr 1fr' : '1fr'}; gap: 12px; margin-top: 10px;">
                <!-- TABELA DE MEDIDAS -->
                <table class="table" style="font-size: 13px;">
                  <thead>
                    <tr>
                      <th style="width: 65%; text-align: left; background: #f5f5f5; font-size: 12px;">MEDIDA</th>
                      <th style="width: 35%; text-align: center; background: #f5f5f5; font-size: 12px;">VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${v.medidaA ? `
                      <tr>
                        <td style="font-weight: 600; font-size: 12px;">A (CHASSI AO ASSOALHO)</td>
                        <td style="text-align: center; font-weight: 700; font-size: 15px;">${v.medidaA}cm</td>
                      </tr>
                    ` : ''}
                    ${v.medidaB ? `
                      <tr>
                        <td style="font-weight: 600; font-size: 12px;">B (CHASSI)</td>
                        <td style="text-align: center; font-weight: 700; font-size: 15px;">${v.medidaB}cm</td>
                      </tr>
                    ` : ''}
                    ${v.medidaC ? `
                      <tr>
                        <td style="font-weight: 600; font-size: 12px;">C (SOLO AO CHASSI)</td>
                        <td style="text-align: center; font-weight: 700; font-size: 15px;">${v.medidaC}cm</td>
                      </tr>
                    ` : ''}
                    ${v.medidaD ? `
                      <tr>
                        <td style="font-weight: 600; font-size: 12px;">D (DIST. ENTRE EIXOS)</td>
                        <td style="text-align: center; font-weight: 700; font-size: 15px;">${v.medidaD}cm</td>
                      </tr>
                    ` : ''}
                    ${v.comprimentoChassi ? `
                      <tr>
                        <td style="font-weight: 600; font-size: 12px;">📏 COMPRIMENTO DO CHASSI</td>
                        <td style="text-align: center; font-weight: 700; font-size: 15px;">${v.comprimentoChassi}cm</td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
                
                ${v.patolamento ? `
                  <div style="padding:15px; background:linear-gradient(135deg, #525255ff 0%, #3d3c35ff 100%); border-radius:6px; text-align:center; border:2px solid #555; display:flex; flex-direction:column; justify-content:center;">
                    <div style="color:white; font-size:12px; font-weight:600; margin-bottom:8px;">⚙️ PATOLAMENTO</div>
                    <div style="color:#ffd700; font-size:36px; font-weight:bold; letter-spacing:2px; line-height:1;">${v.patolamento}</div>
                    <div style="color:white; font-size:11px; opacity:0.9; margin-top:8px; font-weight:500;">
                      ${v.medidaC && parseFloat(v.medidaC) >= 70 ? 'C ≥ 70cm' : v.medidaC && parseFloat(v.medidaC) >= 60 ? 'C: 60-69cm' : 'C < 60cm'}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : `
              <div style="text-align: center; margin-top: 10px; font-size: 14px; font-weight: 600;">MEDIDAS NÃO INFORMADAS.</div>
            `
          }
        </div>
      </div>
    </div>
  `;
};

const renderPagina7Especificacoes = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 7 (2).jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);
  
  const guindaste = pedidoData.guindaste || {};
  
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page { width: 1000px; height: 1414px; position: relative; background-image: url('${bgDataUrl}'); background-size: cover; background-position: center; padding: 80px; }
      
      .title { font-family: Arial, sans-serif; font-size: 22px; font-weight: 800; color: #000; margin-bottom: 25px; }
      .spec-item { background: rgba(255,255,255,0.95); padding: 18px; border-radius: 6px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .spec-label { font-family: Arial, sans-serif; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .spec-value { font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #000; margin-top: 6px; }
    </style>
    <div class="page">
      <div class="title">ESPECIFICAÇÕES TÉCNICAS</div>
      
      <div class="spec-item">
        <div class="spec-label">Modelo</div>
        <div class="spec-value">${guindaste.nome || 'STARK GSI 6.5 2H1M'}</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">Alcance Horizontal</div>
        <div class="spec-value">${guindaste.alcance || '5,5'} metros</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">Capacidade de Içamento</div>
        <div class="spec-value">${guindaste.capacidade || '4,6'} toneladas</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">Material de Construção</div>
        <div class="spec-value">Aço STRENX 700 MPa</div>
      </div>
      <div class="spec-item">
        <div class="spec-label">Sistema de Giro</div>
        <div class="spec-value">360º Suave</div>
      </div>
    </div>
  `;
};

const renderPagina8CondicoesComercias = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 7 (2).jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);
  
  const p = pedidoData.pagamentoData || {};
  const totalBase = (pedidoData.carrinho || []).reduce((acc, it) => acc + (it.preco || 0), 0);
  const extraValor = parseFloat(p.extraValor || 0);
  const extraDescricao = (p.extraDescricao || '').trim();
  const tipoClienteCalc = (p.tipoCliente || p.tipoPagamento || '').toString().toLowerCase();
  const percentualEntradaNum = parseFloat(p.percentualEntrada || 0) || 0;
  
  // CÁLCULOS CORRETOS SEGUINDO A LÓGICA:
  // 1. Aplicar descontos SOBRE O VALOR BASE (não sobre subtotal)
  const valorDescontoVendedor = p.desconto ? (totalBase * p.desconto / 100) : 0;
  const valorDescontoPrazo = p.descontoPrazo ? (totalBase * p.descontoPrazo / 100) : 0;
  const valorAcrescimo = p.acrescimo ? (totalBase * p.acrescimo / 100) : 0;
  
  // 2. Base com descontos aplicados
  const baseComDescontos = totalBase - valorDescontoVendedor - valorDescontoPrazo + valorAcrescimo;
  
  // 3. Adicionar extras (sem desconto), frete e instalação
  const subtotalComAdicionais = baseComDescontos + extraValor + (p.valorFrete || 0) + (p.valorInstalacao || 0);
  
  // 4. Valor Total Final
  const valorTotalFinal = subtotalComAdicionais;
  
  // 5. Entrada
  const entradaTotalCalc = p.entradaTotal || (p.percentualEntrada ? (valorTotalFinal * p.percentualEntrada / 100) : 0);
  const sinalPago = p.valorSinal || 0;
  
  // 6. Saldo a Pagar (o que falta após entrada e sinal)
  const saldoAPagarCalc = valorTotalFinal - entradaTotalCalc;

  // 7. RECALCULAR PARCELAS com base no saldo correto
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

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page { width: 1000px; height: 1414px; position: relative; background-image: url('${bgDataUrl}'); background-size: cover; background-position: center; }
      .wrap { font-family: Arial, sans-serif; color: #000; padding: 14px 10px; }
      .title { font-size: 26px; margin-bottom: 12px; font-weight: 800; }
    </style>
    <div class="page">
      <div class="wrap">
        <div class="title">CONDIÇÕES COMERCIAIS E FINANCEIRAS</div>

        <!-- LAYOUT 2 COLUNAS: VALOR BASE + DESCONTOS -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
          
          <!-- COLUNA 1: VALOR BASE -->
          <div style="padding:12px; background:#f8f9fa; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">① VALOR BASE DO EQUIPAMENTO</div>
            <div style="font-size:24px; font-weight:700; color:#000;">${formatCurrency(totalBase)}</div>
          </div>

          <!-- COLUNA 2: DESCONTOS -->
          ${(p.desconto || p.descontoPrazo || p.acrescimo) ? `
            <div style="padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
              <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">③ DESCONTOS E AJUSTES</div>
              ${p.desconto ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                  <span style="font-weight:600; color:#000;">Desconto Vendedor (${p.desconto}%)</span>
                  <span style="color:#000; font-weight:700; font-size:16px;">- ${formatCurrency(valorDescontoVendedor)}</span>
                </div>
              ` : ''}
              ${p.descontoPrazo ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                  <span style="font-weight:600; color:#000;">Desconto Prazo (${p.descontoPrazo}%)</span>
                  <span style="color:#000; font-weight:700; font-size:16px;">- ${formatCurrency(valorDescontoPrazo)}</span>
                </div>
              ` : ''}
              ${p.acrescimo ? `
                <div style="display:flex; justify-content:space-between; font-size:14px;">
                  <span style="font-weight:600; color:#000;">Acréscimo (${p.acrescimo}%)</span>
                  <span style="color:#000; font-weight:700; font-size:16px;">+ ${formatCurrency(valorAcrescimo)}</span>
                </div>
              ` : ''}
            </div>
          ` : '<div></div>'}
        </div>

        <!-- FRETE E INSTALAÇÃO -->
        ${(p.tipoFrete || p.tipoInstalacao || p.valorFrete || p.valorInstalacao) ? `
          <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">② FRETE E INSTALAÇÃO</div>
            ${p.tipoFrete ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                <span style="font-weight:600; color:#000;">Frete: FOB${p.valorFrete > 0 ? ' - Incluso' : ''}</span>
                ${p.valorFrete > 0 ? `
                  <span style="color:#000; font-weight:700; font-size:16px;">+ ${formatCurrency(p.valorFrete)}</span>
                ` : `
                  <span style="color:#555; font-size:12px;">Cliente paga direto</span>
                `}
              </div>
            ` : ''}
            ${p.tipoInstalacao ? `
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="font-weight:600; color:#000;">Instalação: ${p.tipoInstalacao.toUpperCase()}</span>
                ${p.valorInstalacao > 0 ? `
                  <span style="color:#000; font-weight:700; font-size:16px;">+ ${formatCurrency(p.valorInstalacao)}</span>
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
              <span style="color:#000; font-weight:700; font-size:16px;">+ ${formatCurrency(extraValor)}</span>
            </div>
          </div>
        ` : ''}

        <!-- VALOR TOTAL -->
        <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; font-size:18px; color:#000;">VALOR TOTAL DA PROPOSTA</span>
            <span style="font-weight:800; font-size:26px; color:#000;">${formatCurrency(valorTotalFinal)}</span>
          </div>
        </div>

        <!-- ENTRADA (se houver) -->
        ${(tipoClienteCalc === 'cliente' && percentualEntradaNum > 0) ? `
          <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">④ ENTRADA (${percentualEntradaNum}% do valor total)</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
              <span style="font-weight:600; color:#000;">Valor da entrada</span>
              <span style="font-weight:700; font-size:20px; color:#000;">${formatCurrency(entradaTotalCalc)}</span>
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
                <span style="font-weight:700; color:#000; font-size:14px;">${formatCurrency(sinalPago)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:13px;">
                <span style="font-weight:600; color:#000;">Falta pagar</span>
                <span style="font-weight:700; color:#000; font-size:14px;">${formatCurrency(entradaTotalCalc - sinalPago)}</span>
              </div>
            ` : ''}
          </div>

          <!-- SALDO A PAGAR -->
          <div style="margin-top:12px; padding:14px; background:#e8e8e8; border:2px solid #555; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:6px;">⑤ SALDO A PAGAR (APÓS FATURAMENTO)</div>
            <div style="font-size:13px; color:#000; margin-bottom:6px;">Este valor será parcelado</div>
            <div style="font-weight:800; font-size:24px; color:#000;">${formatCurrency(saldoAPagarCalc)}</div>
          </div>
        ` : ''}

        <!-- PRAZO E PARCELAMENTO UNIFICADOS -->
        ${(parcelasCorrigidas && parcelasCorrigidas.length > 0 && p.prazoPagamento && p.prazoPagamento.toLowerCase() !== 'à vista') ? `
          <div style="margin-top:12px; padding:12px; background:#f5f5f5; border-left:4px solid #6d6e6fff; border-radius:4px;">
            <div style="font-weight:700; font-size:15px; color:#000; margin-bottom:8px;">
              ${tipoClienteCalc === 'cliente' && percentualEntradaNum > 0 ? '⑥' : '④'} PRAZO: ${(p.prazoPagamento || '').replaceAll('_',' ').toUpperCase()}
            </div>
            <div style="font-size:13px; color:#000; margin-bottom:8px; font-weight:600;">Saldo de ${formatCurrency(saldoAPagarCalc)} dividido em ${parcelasCorrigidas.length} parcelas:</div>
            <div style="display:grid; grid-template-columns:repeat(${parcelasCorrigidas.length > 3 ? '4' : parcelasCorrigidas.length > 2 ? '3' : '2'}, 1fr); gap:8px;">
              ${parcelasCorrigidas.map((parcela, idx) => `
                <div style="background:#fff; padding:8px; border-radius:4px; text-align:center; border:1px solid #ddd;">
                  <div style="font-size:12px; color:#000; margin-bottom:3px; font-weight:600;">Parcela ${parcela.numero || idx + 1}</div>
                  <div style="font-weight:700; color:#000; font-size:16px;">${formatCurrency(parcela.valor || 0)}</div>
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
            <div style="font-weight:700; font-size:16px; text-transform:uppercase; margin-bottom:10px; color:#000;">DADOS BANCÁRIOS – STARK INDUSTRIAL LTDA</div>
            
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
              <div style="font-weight:700;">Stark Industrial Ltda | CNPJ: 33.228.312/0001-06</div>
              <div style="margin-top:5px; font-weight:600;">
                Pix CNPJ: <b>33228312000106</b> (Sicredi) | 
                Pix e-mail: <b>financeiro@starkindustrial.ind.br</b> (BB)
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};

// CLÁUSULAS + ASSINATURAS

const renderPagina9Clausulas = async (pedidoData) => {
  const bgUrl = `/páginas do pdf/PÁGINA 9.jpg`;
  const bgDataUrl = await renderImageToDataURL(bgUrl);
  
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
    'As assinaturas abaixo formalizam o presente pedido e a concordância com os termos e condições.',
    'Refere-se Instalação do Guindaste no Caminhão do cliente Comprador apenas a Implementação do Guindaste no Caminhão, demais alterações Provenientes em Virtude para Permitir a Implementação, não Estão Previstas nos Custos desta Proposta, que devem Obrigatoriamente serem Alinhados e Estritamente Concensado entre Instalador e Cliente Comprador, sem Qualquer Onus Financeiro a Stark.'
  ];

  let vendedor = pedidoData.vendedor_nome || '';
  try {
    if (!vendedor) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      vendedor = u.nome || '';
    }
  } catch {}
  if (!vendedor) vendedor = 'NÃO INFORMADO';

  const cliente = (pedidoData.clienteData && pedidoData.clienteData.nome) ? pedidoData.clienteData.nome : (pedidoData.cliente_nome || 'NÃO INFORMADO');

  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .page { width: 1000px; height: 1414px; position: relative; background-image: url('${bgDataUrl}'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 260px; }
      .wrap { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 0 110px; width: 100%; }
      .title { text-transform: uppercase; font-weight: 700; font-size: 18px; text-align: left; margin-bottom: 20px; color: #000; }
      .clausulas-container { font-size: 10.8px; line-height: 1.35; margin-bottom: 50px; }
      .p { margin-bottom: 6px; text-align: justify; }
      .assinaturas-section { margin-top: 25px; }
      .assinaturas-title { text-transform: uppercase; font-weight: 700; font-size: 18px; text-align: left; margin-bottom: 40px; color: #000; }
      .assinaturas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
      .assinatura-item { text-align: center; }
      .assinatura-linha { height: 60px; }
      .assinatura-nome { border-top: 1px solid #000; padding-top: 8px; font-size: 13px; font-weight: 600; }
      .center { text-align: center; }
    </style>
    <div class="page">
      <div class="wrap clausulas-wrap">
        <!-- CLÁUSULAS CONTRATUAIS -->
        <div class="title">CLÁUSULAS CONTRATUAIS</div>
        <div class="clausulas-container">
          ${clausulas.map((c, i) => `<p class="p"><strong>${i + 1}.</strong> ${c}</p>`).join('')}
        </div>

        <!-- ASSINATURAS -->
        <div class="assinaturas-section">
          <div class="assinaturas-title">ASSINATURAS</div>
          <div class="assinaturas-grid">
            <div class="assinatura-item">
              <div class="assinatura-linha"></div>
              <div class="assinatura-nome">CLIENTE: ${cliente.toUpperCase()}</div>
            </div>
            <div class="assinatura-item">
              <div class="assinatura-linha"></div>
              <div class="assinatura-nome">VENDEDOR: ${vendedor.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// ===== FUNÇÃO PRINCIPAL =====

export const generatePDFNovo = async (pedidoData) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    let pageIndex = 0;
    
    // Determinar qual capa usar (intercalação sequencial)
    let capaCounter = parseInt(localStorage.getItem('capa_counter') || '0', 10);
    const capaIndex = capaCounter % 2;
    localStorage.setItem('capa_counter', String(capaCounter + 1));
    
    // PÁGINA 0: CAPA
    console.log('🎨 Renderizando CAPA...');
    const capaHtml = await renderCapa(pedidoData, capaIndex);
    const capaCanvas = await renderPageToCanvas(capaHtml);
    addPageToPDF(pdf, capaCanvas, pageIndex++);
    
    // PÁGINA 1: APRESENTAÇÃO
    console.log('📄 Renderizando PÁGINA 1 (Apresentação)...');
    const pag1Html = await renderPagina1(pedidoData);
    const pag1Canvas = await renderPageToCanvas(pag1Html);
    addPageToPDF(pdf, pag1Canvas, pageIndex++);
    
    // PÁGINA 2: PROPOSTA
    console.log('📄 Renderizando PÁGINA 2 (Proposta)...');
    const pag2Html = await renderPagina2(pedidoData);
    const pag2Canvas = await renderPageToCanvas(pag2Html);
    addPageToPDF(pdf, pag2Canvas, pageIndex++);
    
    // PÁGINA 3: BENEFÍCIOS
    console.log('📄 Renderizando PÁGINA 3 (Benefícios)...');
    const pag3Html = await renderPagina3(pedidoData);
    const pag3Canvas = await renderPageToCanvas(pag3Html);
    addPageToPDF(pdf, pag3Canvas, pageIndex++);
    
    // PÁGINA 4: DIFERENCIAIS
    console.log('📄 Renderizando PÁGINA 4 (Diferenciais)...');
    const pag4Html = await renderPagina4(pedidoData);
    const pag4Canvas = await renderPageToCanvas(pag4Html);
    addPageToPDF(pdf, pag4Canvas, pageIndex++);
    
    // PÁGINA 5: SUPORTE
    console.log('📄 Renderizando PÁGINA 5 (Suporte)...');
    const pag5Html = await renderPagina5(pedidoData);
    const pag5Canvas = await renderPageToCanvas(pag5Html);
    addPageToPDF(pdf, pag5Canvas, pageIndex++);
    
    // PÁGINA 6: ESTUDO VEICULAR
    console.log('📄 Renderizando PÁGINA 6 (Estudo Veicular)...');
    const pag6Html = await renderPagina6EstudoVeicular(pedidoData);
    const pag6Canvas = await renderPageToCanvas(pag6Html);
    addPageToPDF(pdf, pag6Canvas, pageIndex++);
    
    // PÁGINA 8: CONDIÇÕES COMERCIAIS
    console.log('📄 Renderizando PÁGINA 8 (Condições Comerciais)...');
    const pag8Html = await renderPagina8CondicoesComercias(pedidoData);
    const pag8Canvas = await renderPageToCanvas(pag8Html);
    addPageToPDF(pdf, pag8Canvas, pageIndex++);
    
    // PÁGINA 9: CLÁUSULAS
    console.log('📄 Renderizando PÁGINA 9 (Cláusulas)...');
    const pag9Html = await renderPagina9Clausulas(pedidoData);
    const pag9Canvas = await renderPageToCanvas(pag9Html);
    addPageToPDF(pdf, pag9Canvas, pageIndex++);
    
    // Salvar PDF
    const clienteNome = pedidoData.cliente_nome || 'Cliente';
    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const filename = `Proposta Stark ${clienteNome} ${dataAtual}.pdf`;
    
    pdf.save(filename);
    console.log('✅ PDF gerado com sucesso:', filename);
    
    return pdf;
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    throw error;
  }
};

export default generatePDFNovo;
