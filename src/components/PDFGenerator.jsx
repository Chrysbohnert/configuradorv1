import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { PDF_CONFIG } from '../config/constants';
import * as pdfjsLib from 'pdfjs-dist';
import { buildGraficoKey, resolveGraficoUrl } from '../utils/modelNormalization';
import { db } from '../config/supabase';

// Usar worker do PDF.js via CDN para evitar configuração de bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const PDFGenerator = ({ pedidoData, onGenerate }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Sequência de número de proposta local (persistido no navegador)
  const getNextProposalNumber = () => {
    try {
      const storageKey = 'proposta_seq_number';
      let current = parseInt(localStorage.getItem(storageKey) || '0', 10);
      if (Number.isNaN(current) || current < 0) current = 0;
      const formatted = String(current).padStart(4, '0');
      localStorage.setItem(storageKey, String(current + 1));
      return formatted;
    } catch (_) {
      // Fallback em caso de bloqueio ao localStorage
      return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }
  };
  
  // Função para carregar imagem como base64
  const loadImageAsBase64 = async (url) => {
    try {
      // Se já for um data URL base64, retornar diretamente
      if (url && typeof url === 'string' && url.startsWith('data:image')) {
        return url;
      }
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
    setIsGenerating(true);
    try {
      const addSeparatePolicyPage = false; // política já está dentro do conteúdo principal
      // Debug: Verificar dados de pagamento
      console.log('Dados de pagamento recebidos:', pedidoData.pagamentoData);
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
        <div style="text-align: center; font-size: 8px; color:rgb(0, 0, 0); padding: 5px; background: white;">
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
      contentElement.style.fontSize = '30px';
      contentElement.style.lineHeight = '1.5';
      
      const propostaNumero = getNextProposalNumber();
      contentElement.innerHTML = `
        <div style="border-bottom: 2px solidrgb(0, 0, 0); margin-bottom: 30px; padding-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 18px; color: #6c757d;">
            <div>
              <strong>Vendedor:</strong> ${pedidoData.vendedor || 'Não informado'}
            </div>
            <div>
              <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color:rgb(0, 0, 0); font-size: 28px; margin-bottom: 15px;">PROPOSTA COMERCIAL</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Proposta Nº:</strong> ${propostaNumero}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color:rgb(11, 11, 11); font-size: 24px; margin-bottom: 10px;">DADOS DO CLIENTE</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Nome:</strong> ${pedidoData.clienteData.nome || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Telefone:</strong> ${pedidoData.clienteData.telefone || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Email:</strong> ${pedidoData.clienteData.email || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>CPF/CNPJ:</strong> ${pedidoData.clienteData.documento || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Inscrição Estadual:</strong> ${pedidoData.clienteData.inscricao_estadual || pedidoData.clienteData.inscricaoEstadual || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Endereço:</strong>
              ${(() => {
                try {
                  const c = pedidoData.clienteData || {};
                  const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
                  const bairro = c.bairro ? ` - ${c.bairro}` : '';
                  const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
                  const cep = c.cep ? ` - CEP: ${c.cep}` : '';
                  const linha = `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim();
                  return linha || (c.endereco || 'Não informado');
                } catch(_) { return pedidoData.clienteData.endereco || 'Não informado'; }
              })()}
            </div>
            ${pedidoData.clienteData.observacoes ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6; font-size: 18px;">
              <strong>Observações:</strong> ${pedidoData.clienteData.observacoes}
            </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color:rgb(0, 0, 0); font-size: 20px; margin-bottom: 10px;">CONDIÇÕES COMERCIAIS</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom: 8px; font-size: 15px;">
              <div><strong>Prazo de Entrega:</strong> Conforme disponibilidade</div>
              <div><strong>Validade da Proposta:</strong> 30 dias</div>
              <div><strong>Vendedor:</strong> ${pedidoData.vendedor || 'Não informado'}</div>
              <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            <div style="font-size: 15px;">
              <strong>Observações:</strong> ${pedidoData.clienteData.observacoes || 'Nenhuma observação adicional.'}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color:rgb(29, 29, 29); font-size: 24px; margin-bottom: 15px;">ITENS DA PROPOSTA</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background:rgb(0, 0, 0); color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-size: 18px;">Item</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-size: 18px;">Tipo</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-size: 18px;">Código</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6; font-size: 18px;">Preço</th>
              </tr>
            </thead>
            <tbody>
              ${pedidoData.carrinho.map((item) => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-size: 18px;">${item.nome}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-transform: capitalize; font-size: 18px;">${item.tipo}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-size: 18px;">${(() => {
                    try {
                      const opcionaisSelecionados = pedidoData.carrinho
                        .filter(i => i.tipo === 'opcional')
                        .map(i => i.nome);
                      if (item.tipo === 'guindaste') {
                        const codigo = generateCodigoProduto(item.modelo || item.nome, opcionaisSelecionados);
                        return codigo || item.codigo_produto || '-';
                      }
                      return item.codigo_produto || '-';
                    } catch(_) { return item.codigo_produto || '-'; }
                  })()}</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; font-size: 18px;">${formatCurrency(item.preco)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${(() => {
            const guindastes = pedidoData.carrinho.filter(item => item.tipo === 'guindaste');
            const guindastesCompletos = guindastes.map(item => {
              const guindasteCompleto = (pedidoData.guindastes || []).find(g => (
                (g?.id && item?.id && g.id === item.id) ||
                (g?.nome && item?.nome && g.nome === item.nome) ||
                (g?.modelo && item?.modelo && g.modelo === item.modelo) ||
                (g?.subgrupo && item?.subgrupo && g.subgrupo === item.subgrupo)
              ));
              return {
                ...item,
                ...guindasteCompleto
              };
            });
            try {
              console.log('🔎 Itens com possíveis detalhes (guindastesCompletos):', guindastesCompletos.map(g => ({
                nome: g?.nome, modelo: g?.modelo, temDescricao: Boolean(g?.descricao || g?.descricao_tecnica || g?.descr || g?.descricaoTecnica || g?.descricaoTecnicaHtml || g?.observacoes),
                temNaoIncluido: Boolean(g?.nao_incluido || g?.nao_incluso || g?.naoIncluido || g?.naoIncluso)
              })));
            } catch (_) {}
            
            // Seção de FINAME e NCM (destacada e personalizada)
            const guindasteComCodigos = guindastesCompletos.find(g => g.finame || g.ncm);
            const codigosSection = guindasteComCodigos ? `
              <div style="margin-top: 30px; margin-bottom: 35px; padding: 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%); border: 4px solid #d97706; border-radius: 16px; box-shadow: 0 8px 16px rgba(217, 119, 6, 0.25), 0 0 0 1px rgba(217, 119, 6, 0.1); position: relative; overflow: hidden;">
                <!-- Barra superior decorativa -->
                <div style="background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #d97706 100%); height: 8px; width: 100%;"></div>
                
                <!-- Conteúdo principal -->
                <div style="padding: 25px 30px;">
                  <!-- Título com ícone -->
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px dashed #d97706;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 8px rgba(217, 119, 6, 0.3);">
                      📋
                    </div>
                    <div>
                      <h4 style="color: #78350f; font-size: 24px; margin: 0; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; text-shadow: 1px 1px 2px rgba(255,255,255,0.5);">
                        Informações para Financiamento
                      </h4>
                      <p style="color: #92400e; font-size: 13px; margin: 4px 0 0 0; font-weight: 600;">
                        Dados obrigatórios para FINAME e importação
                      </p>
                    </div>
                  </div>
                  
                  <!-- Grid de códigos -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    ${guindasteComCodigos.finame ? `
                      <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #d97706; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15); position: relative; overflow: hidden;">
                        <!-- Canto decorativo -->
                        <div style="position: absolute; top: 0; right: 0; width: 60px; height: 60px; background: linear-gradient(135deg, transparent 0%, #fef3c7 100%); border-bottom-left-radius: 100%;"></div>
                        
                        <!-- Ícone -->
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.3);">
                            🏦
                          </div>
                          <div style="font-size: 15px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                            Código FINAME
                          </div>
                        </div>
                        
                        <!-- Código -->
                        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 8px; border: 2px dashed #d97706; margin-top: 10px;">
                          <div style="font-size: 32px; color: #78350f; font-weight: 900; letter-spacing: 2px; text-align: center; font-family: 'Courier New', monospace; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">
                            ${guindasteComCodigos.finame}
                          </div>
                        </div>
                      </div>
                    ` : ''}
                    
                    ${guindasteComCodigos.ncm ? `
                      <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #d97706; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15); position: relative; overflow: hidden;">
                        <!-- Canto decorativo -->
                        <div style="position: absolute; top: 0; right: 0; width: 60px; height: 60px; background: linear-gradient(135deg, transparent 0%, #fef3c7 100%); border-bottom-left-radius: 100%;"></div>
                        
                        <!-- Ícone -->
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.3);">
                            🌍
                          </div>
                          <div style="font-size: 15px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                            Código NCM
                          </div>
                        </div>
                        
                        <!-- Código -->
                        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 8px; border: 2px dashed #d97706; margin-top: 10px;">
                          <div style="font-size: 32px; color: #78350f; font-weight: 900; letter-spacing: 2px; text-align: center; font-family: 'Courier New', monospace; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">
                            ${guindasteComCodigos.ncm}
                          </div>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                  
                  <!-- Nota informativa -->
                  <div style="background: rgba(255, 255, 255, 0.9); padding: 18px; border-radius: 10px; border-left: 6px solid #d97706; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="font-size: 24px; flex-shrink: 0; margin-top: -2px;">⚠️</div>
                      <div>
                        <div style="color: #78350f; font-size: 14px; font-weight: 700; margin-bottom: 6px;">
                          Importante
                        </div>
                        <div style="color: #92400e; font-size: 13px; line-height: 1.6; font-weight: 500;">
                          Estes códigos são <strong>fundamentais e obrigatórios</strong> para processos de financiamento FINAME, 
                          documentação fiscal e importação. Mantenha-os sempre disponíveis para consulta e apresentação 
                          junto às instituições financeiras.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Barra inferior decorativa -->
                <div style="background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #d97706 100%); height: 8px; width: 100%;"></div>
              </div>
            ` : '';
            
            // Seção de detalhes dos equipamentos (inclui guindaste e equipamento)
            const itensDetalhesBase = [
              ...guindastesCompletos,
              ...pedidoData.carrinho.filter(i => i.tipo === 'equipamento')
            ];
            // Derivar campos de descrição e não incluído de múltiplas fontes (inclui aninhados)
            const itensDetalhes = itensDetalhesBase.map(i => {
              const desc = i?.descricao || i?.descricao_tecnica || i?.descr || i?.descricaoTecnica || i?.descricaoTecnicaHtml || i?.observacoes ||
                           i?.detalhes?.descricao || i?.detalhes?.descricao_tecnica || i?.detalhes?.descricaoTecnica || i?.detalhes?.descricaoTecnicaHtml;
              const naoIncl = i?.nao_incluido || i?.nao_incluso || i?.naoIncluido || i?.naoIncluso ||
                               i?.detalhes?.nao_incluido || i?.detalhes?.naoIncluido || i?.detalhes?.nao_incluso || i?.detalhes?.naoIncluso;
              return { ...i, descricao_derived: desc, nao_incluido_derived: naoIncl };
            });
            const itensComDetalhes = itensDetalhes.filter(i => i && (
              i.descricao_derived || i.nao_incluido_derived || i.modelo || i.nome
            ));
            const detalhesSection = itensComDetalhes.length > 0 ? `
              <div style="margin-top: 20px;">
                <h4 style="color:rgb(0, 0, 0); font-size: 20px; margin-bottom: 15px;">Detalhes dos Equipamentos</h4>
                ${itensComDetalhes.map(item => `
                  <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h5 style="color: #1f2937; font-size: 18px; margin-bottom: 12px;">${item.nome || item.modelo || 'Equipamento'}</h5>
                    ${item.modelo ? `
                      <div style="margin-bottom: 10px;">
                        <strong style="color:rgb(0, 0, 0); font-size: 16px;">Modelo:</strong>
                        <span style="color:rgb(0, 0, 0); font-size: 16px;"> ${item.modelo}</span>
                      </div>
                    ` : ''}
                    ${(() => {
                      const desc = item.descricao_derived || item.descricao || item.descricao_tecnica || item.descr || item.descricaoTecnica || item.descricaoTecnicaHtml || item.observacoes ||
                                   item?.detalhes?.descricao || item?.detalhes?.descricao_tecnica || item?.detalhes?.descricaoTecnica || item?.detalhes?.descricaoTecnicaHtml;
                      if (desc) {
                        return `
                          <div style="margin-bottom: 10px;">
                            <strong style="color:rgb(0, 0, 0); font-size: 16px;">Descrição Técnica:</strong>
                            <div style="margin-top: 5px; color:rgb(0, 0, 0); font-size: 15px; line-height: 1.6;">${desc}</div>
                          </div>
                        `;
                      }
                      return `
                        <div style=\"margin-bottom: 10px;\">
                          <strong style=\"color:rgb(0, 0, 0); font-size: 16px;\">Descrição Técnica:</strong>
                          <div style=\"margin-top: 5px; color:rgb(0, 0, 0); font-size: 15px; line-height: 1.6;\">Não informado</div>
                        </div>
                      `;
                    })()}
                    ${(() => {
                      const naoIncl = item.nao_incluido_derived || item.nao_incluido || item.nao_incluso || item.naoIncluido || item.naoIncluso ||
                                      item?.detalhes?.nao_incluido || item?.detalhes?.naoIncluido || item?.detalhes?.nao_incluso || item?.detalhes?.naoIncluso;
                      if (naoIncl) {
                        return `
                          <div style=\"padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-top: 10px;\">\n                            <strong style=\"color: #92400e; font-size: 16px;\">⚠️ Não está incluído neste equipamento:</strong>\n                            <div style=\"margin-top: 5px; color: #92400e; font-size: 15px; line-height: 1.6;\">${naoIncl}</div>\n                          </div>
                        `;
                      }
                      return `
                        <div style=\"padding: 12px; background: #fffbea; border-left: 4px solid #fbbf24; border-radius: 4px; margin-top: 10px;\">\n                          <strong style=\"color: #92400e; font-size: 16px;\">⚠️ Não está incluído neste equipamento:</strong>\n                          <div style=\"margin-top: 5px; color: #92400e; font-size: 15px; line-height: 1.6;\">Não informado</div>\n                        </div>
                      `;
                    })()}
                  </div>
                `).join('')}
              </div>
            ` : '';
            
            return codigosSection + detalhesSection;
          })()}
          
          ${(() => {
            const opcionais = pedidoData.carrinho.filter(i => i.tipo === 'opcional');
            if (opcionais.length === 0) return '';
            return `
              <div style="margin: 12px 0 20px 0;">
                <h4 style="color:rgb(0, 0, 0); font-size: 20px; margin: 0 0 8px 0;">Opcionais Selecionados</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f1f3f5; color:rgb(0, 0, 0);">
                      <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6; font-size: 16px;">Opcional</th>
                      <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6; font-size: 16px;">Descrição</th>
                      <th style="padding: 8px; text-align: right; border: 1px solid #dee2e6; font-size: 16px;">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${opcionais.map(op => `
                      <tr>
                        <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 16px;">${op.nome}</td>
                        <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 16px;">${op.descricao || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 16px; text-align: right;">${formatCurrency(op.preco || 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          })()}
          
          <div style="text-align: right; font-size: 26px; font-weight: bold; color: #374151; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <strong>TOTAL: ${formatCurrency(pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}</strong>
          </div>
        </div>

        

        <div style="margin-bottom: 30px;">
          <h3 style="color:rgb(0, 0, 0); font-size: 24px; margin-bottom: 10px;">DADOS DO VEÍCULO</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Tipo:</strong> ${pedidoData.caminhaoData.tipo || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Marca:</strong> ${pedidoData.caminhaoData.marca || 'Não informado'}
            </div>
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Modelo:</strong> ${pedidoData.caminhaoData.modelo || 'Não informado'}
            </div>
            ${pedidoData.caminhaoData.ano ? `
            <div style=\"margin-bottom: 8px; font-size: 18px;\"> 
              <strong>Ano:</strong> ${pedidoData.caminhaoData.ano}
            </div>
            ` : ''}
            <div style="margin-bottom: 8px; font-size: 18px;">
              <strong>Voltagem:</strong> ${pedidoData.caminhaoData.voltagem || 'Não informado'}
            </div>
            ${pedidoData.caminhaoData.observacoes ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6; font-size: 18px;">
              <strong>Observações:</strong> ${pedidoData.caminhaoData.observacoes}
            </div>
            ` : ''}
          </div>
        </div>

        ${(() => {
          const temMedidas = pedidoData.caminhaoData.medidaA || pedidoData.caminhaoData.medidaB || 
                            pedidoData.caminhaoData.medidaC || pedidoData.caminhaoData.medidaD;
          if (!temMedidas) return '';
          
          return `
            <div style="margin-bottom: 30px;">
              <h3 style="color:rgb(0, 0, 0); font-size: 24px; margin-bottom: 10px;">ESTUDO VEICULAR - MEDIDAS</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="/estudoveicular.png" alt="Estudo Veicular" style="max-width: 500px; width: 100%; height: auto; border: 2px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                  ${pedidoData.caminhaoData.medidaA ? `
                    <div style="padding: 10px; background: white; border-radius: 6px;">
                      <strong style="font-size: 18px;">Medida A:</strong> 
                      <span style="font-size: 18px;">${pedidoData.caminhaoData.medidaA}</span>
                    </div>
                  ` : ''}
                  ${pedidoData.caminhaoData.medidaB ? `
                    <div style="padding: 10px; background: white; border-radius: 6px;">
                      <strong style="font-size: 18px;">Medida B:</strong> 
                      <span style="font-size: 18px;">${pedidoData.caminhaoData.medidaB}</span>
                    </div>
                  ` : ''}
                  ${pedidoData.caminhaoData.medidaC ? `
                    <div style="padding: 10px; background: white; border-radius: 6px;">
                      <strong style="font-size: 18px;">Medida C:</strong> 
                      <span style="font-size: 18px;">${pedidoData.caminhaoData.medidaC}</span>
                    </div>
                  ` : ''}
                  ${pedidoData.caminhaoData.medidaD ? `
                    <div style="padding: 10px; background: white; border-radius: 6px;">
                      <strong style="font-size: 18px;">Medida D:</strong> 
                      <span style="font-size: 18px;">${pedidoData.caminhaoData.medidaD}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        })()}
      `;

      document.body.appendChild(headerElement);
      document.body.appendChild(footerElement);
      document.body.appendChild(contentElement);

      // Elemento separado para POLÍTICA DE PAGAMENTO (página própria)
      const policyElement = document.createElement('div');
      policyElement.style.position = 'absolute';
      policyElement.style.left = '-9999px';
      policyElement.style.width = '1000px';
      policyElement.style.backgroundColor = 'white';
      policyElement.style.padding = '10px';
      policyElement.style.fontFamily = 'Arial, sans-serif';
      policyElement.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="color:rgb(0, 0, 0); font-size: 26px; margin-bottom: 10px;">POLÍTICA DE PAGAMENTO</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 16px;">
            <div style="margin-bottom: 10px;">
              <strong>Tipo de Pagamento:</strong> ${
                pedidoData.pagamentoData?.tipoPagamento === 'revenda_gsi' ? 'Revenda - Guindastes GSI' :
                pedidoData.pagamentoData?.tipoPagamento === 'cnpj_cpf_gse' ? 'CNPJ/CPF - Guindastes GSE' :
                pedidoData.pagamentoData?.tipoPagamento === 'parcelamento_interno' ? 'Parcelamento Interno - Revenda' :
                pedidoData.pagamentoData?.tipoPagamento === 'parcelamento_cnpj' ? 'Parcelamento - CNPJ/CPF' :
                'Não informado'
              }
            </div>
            <div style="margin-bottom: 10px;">
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
            <div style="margin-bottom: 10px;">
              <strong>Valor Total:</strong> ${formatCurrency(pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}
            </div>
            ${pedidoData.pagamentoData?.desconto > 0 ? `
            <div style="margin-bottom: 10px; color: #000;">
              <strong>Desconto (${pedidoData.pagamentoData.desconto}%):</strong> -${formatCurrency((pedidoData.carrinho.reduce((total, item) => total + item.preco, 0) * pedidoData.pagamentoData.desconto) / 100)}
            </div>
            ` : ''}
            ${pedidoData.pagamentoData?.acrescimo > 0 ? `
            <div style="margin-bottom: 10px; color:#000;">
              <strong>Acréscimo (${pedidoData.pagamentoData.acrescimo}%):</strong> +${formatCurrency((pedidoData.carrinho.reduce((total, item) => total + item.preco, 0) * pedidoData.pagamentoData.acrescimo) / 100)}
            </div>
            ` : ''}
            <div style="margin-bottom: 10px; font-weight: bold; color:#000;">
              <strong>Valor Final:</strong> ${formatCurrency(pedidoData.pagamentoData?.valorFinal || pedidoData.carrinho.reduce((total, item) => total + item.preco, 0))}
            </div>
            ${pedidoData.pagamentoData?.tipoCliente === 'cliente' && pedidoData.pagamentoData?.percentualEntrada > 0 ? `
            <div style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-left: 3px solid #6c757d;">
              <div style="margin-bottom: 8px;">
                <strong>Entrada Total (${pedidoData.pagamentoData.percentualEntrada}%):</strong> ${formatCurrency(pedidoData.pagamentoData.entradaTotal || 0)}
              </div>
              ${pedidoData.pagamentoData?.valorSinal > 0 ? `
              <div style="margin-left: 15px; margin-bottom: 5px; font-size: 16px; color: #000;">
                ↳ Sinal (já pago): <strong>- ${formatCurrency(pedidoData.pagamentoData.valorSinal)}</strong>
              </div>
              <div style="margin-left: 15px; font-size: 16px;">
                ↳ Falta pagar de entrada: <strong>${formatCurrency(pedidoData.pagamentoData.faltaEntrada || 0)}</strong>
              </div>
              ${pedidoData.pagamentoData?.formaEntrada ? `
              <div style="margin-left: 25px; margin-top: 5px; font-size: 14px; font-style: italic; color: #555;">
                Forma de pagamento: ${pedidoData.pagamentoData.formaEntrada}
              </div>
              ` : ''}
              ` : ''}
            </div>
            <div style="margin: 15px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid #007bff; font-weight: bold; font-size: 20px;">
              <strong style="color:rgb(123, 138, 153);">Saldo a Pagar (após entrada):</strong> <span style="color: #000;">${formatCurrency(pedidoData.pagamentoData.saldoAPagar || pedidoData.pagamentoData.valorFinal || 0)}</span>
            </div>
            ` : ''}
            ${pedidoData.pagamentoData?.tipoCliente === 'cliente' ? `
            <div style="margin-bottom: 10px;">
              <strong>Local de Instalação:</strong> ${pedidoData.pagamentoData?.localInstalacao || 'Não informado'}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Tipo de Instalação:</strong> ${
                pedidoData.pagamentoData?.tipoInstalacao === 'cliente' ? 'Por conta do cliente' :
                pedidoData.pagamentoData?.tipoInstalacao === 'fabrica' ? 'Por conta da fábrica' :
                'Não informado'
              }
            </div>
            ` : ''}
            ${pedidoData.pagamentoData?.tipoFrete ? `
            <div style="margin-bottom: 10px;">
              <strong>Tipo de Frete:</strong> 
              <span style="color: ${pedidoData.pagamentoData.tipoFrete === 'cif' ? '#28a745' : '#dc3545'}; font-weight: bold;">
                ${pedidoData.pagamentoData.tipoFrete === 'cif' ? 'CIF (Fábrica paga)' : 'FOB (Cliente paga)'}
              </span>
            </div>
            ` : ''}
            ${pedidoData.pagamentoData?.participacaoRevenda ? `
            <div style="margin-top: 10px; padding: 10px; background: ${pedidoData.pagamentoData.participacaoRevenda === 'sim' ? '#d4edda' : '#f8d7da'}; border-left: 3px solid ${pedidoData.pagamentoData.participacaoRevenda === 'sim' ? '#28a745' : '#dc3545'}; border-radius: 4px;">
              <strong>Participação de Revenda:</strong> 
              <span style="color: ${pedidoData.pagamentoData.participacaoRevenda === 'sim' ? '#155724' : '#721c24'}; font-weight: bold;">
                ${pedidoData.pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'Não'}
              </span>
              ${pedidoData.pagamentoData.participacaoRevenda === 'sim' && pedidoData.pagamentoData.revendaTemIE ? `
                <div style="margin-top: 8px; margin-left: 15px; font-size: 16px;">
                  <strong>↳ Revenda possui IE:</strong> 
                  <span style="color: ${pedidoData.pagamentoData.revendaTemIE === 'sim' ? '#007bff' : '#ffc107'}; font-weight: bold;">
                    ${pedidoData.pagamentoData.revendaTemIE === 'sim' ? 'Sim (Com IE)' : 'Não (Sem IE)'}
                  </span>
                </div>
                ${pedidoData.pagamentoData.revendaTemIE === 'sim' && pedidoData.pagamentoData.descontoRevendaIE > 0 ? `
                  <div style="margin-top: 5px; margin-left: 30px; font-size: 16px; color: #28a745;">
                    <strong>↳ Desconto Revenda:</strong> 
                    <span style="font-weight: bold;">${pedidoData.pagamentoData.descontoRevendaIE}%</span>
                  </div>
                ` : ''}
              ` : ''}
            </div>
            ` : ''}
            ${pedidoData.clienteData?.inscricao_estadual && (pedidoData.clienteData.inscricao_estadual === 'ISENTO' || pedidoData.clienteData.inscricao_estadual !== 'ISENTO') ? `
            <div style="margin-top: 10px; padding: 10px; background: #e7f3ff; border-left: 3px solid #007bff; border-radius: 4px;">
              <strong>Inscrição Estadual do Cliente:</strong> 
              <span style="${pedidoData.clienteData.inscricao_estadual === 'ISENTO' ? 'color: #dc3545;' : 'color: #28a745;'}">
                ${pedidoData.clienteData.inscricao_estadual === 'ISENTO' ? 'Isento de IE' : pedidoData.clienteData.inscricao_estadual}
              </span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
      document.body.appendChild(policyElement);

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

      const policyCanvas = await html2canvas(policyElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(headerElement);
      document.body.removeChild(footerElement);
      document.body.removeChild(contentElement);
      document.body.removeChild(policyElement);

      // Criar PDF com controle de páginas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 2;
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
      
      // Vamos renderizar a POLÍTICA DE PAGAMENTO em página própria
      let policyPageRendered = false;

      // Usar uma página apenas se todo o conteúdo couber na área útil
      if (contentHeight <= availableContentHeight) {
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
        // Conversão de mm (no PDF) para pixels (no canvas)
        const pixelsPerMm = contentCanvas.height / contentHeight;
        
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
          if (pageNum > 0) {
            pdf.addPage();
          }
          
          // Adicionar cabeçalho em todas as páginas
          const headerImgData = headerCanvas.toDataURL('image/png');
          pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
          
          // Calcular posição e altura do conteúdo para esta página
          const contentStartY = margin + headerHeight + 5;
          const overlapMm = 2; // sobreposição para evitar corte de linhas
          const yStartMm = Math.max(0, pageNum * availableContentHeight - (pageNum === 0 ? 0 : overlapMm));
          const contentForThisPage = Math.min(
            availableContentHeight + (pageNum === 0 ? 0 : overlapMm),
            contentHeight - yStartMm
          );
          
          // Adicionar parte do conteúdo (cortar verticalmente)
          const sourceYmm = yStartMm;
          const sourceHeightMm = contentForThisPage;
          const sourceY = Math.floor(sourceYmm * pixelsPerMm);
          const sourceHeight = Math.ceil(sourceHeightMm * pixelsPerMm);
          
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

        // Fim da paginação do conteúdo principal
      }

      // Renderizar a página da POLÍTICA DE PAGAMENTO sempre na sequência
      {
        const policyHeight = (policyCanvas.height * contentWidth) / policyCanvas.width;
        const headerImgDataPolicy = headerCanvas.toDataURL('image/png');
        const footerImgDataPolicy = footerCanvas.toDataURL('image/png');
        const pixelsPerMmPolicy = policyCanvas.height / policyHeight;
        const contentStartYPolicy = margin + headerHeight + 5;

        // nova página
        pdf.addPage();
        pdf.addImage(headerImgDataPolicy, 'PNG', margin, margin, contentWidth, headerHeight);

        if (policyHeight <= availableContentHeight) {
          const policyImgData = policyCanvas.toDataURL('image/png');
          pdf.addImage(policyImgData, 'PNG', margin, contentStartYPolicy, contentWidth, policyHeight);
        } else {
          const totalPolicyPages = Math.ceil(policyHeight / availableContentHeight);
          for (let p = 0; p < totalPolicyPages; p++) {
            if (p > 0) {
              pdf.addPage();
              pdf.addImage(headerImgDataPolicy, 'PNG', margin, margin, contentWidth, headerHeight);
            }
            const yStartMm = p * availableContentHeight;
            const hMm = Math.min(availableContentHeight, policyHeight - yStartMm);
            const sourceY = Math.floor(yStartMm * pixelsPerMmPolicy);
            const sourceHeight = Math.ceil(hMm * pixelsPerMmPolicy);
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = policyCanvas.width;
            tempCanvas.height = sourceHeight;
            tempCtx.drawImage(policyCanvas, 0, sourceY, policyCanvas.width, sourceHeight, 0, 0, policyCanvas.width, sourceHeight);
            const cropped = tempCanvas.toDataURL('image/png');
            pdf.addImage(cropped, 'PNG', margin, contentStartYPolicy, contentWidth, hMm);
            pdf.addImage(footerImgDataPolicy, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);
          }
        }
        // rodapé da primeira página da política
        pdf.addImage(footerImgDataPolicy, 'PNG', margin, pageHeight - footerHeight - margin, contentWidth, footerHeight);
        policyPageRendered = true;
      }

      // Adicionar gráficos de carga como PDF técnico por modelo (substitui imagens)
      try {
        // Carregar lista de PDFs de gráficos cadastrados
        const graficosCadastrados = await db.getGraficosCarga();
        console.log('📊 Gráficos cadastrados no banco:', graficosCadastrados?.length || 0);
        
        // Helpers de normalização para casar variações de nome (CR/EH etc.)
        // Indexar PDFs cadastrados por chaves normalizadas (nome e modelo)
        const indexPdfPorChave = new Map();
        for (const g of graficosCadastrados || []) {
          const candidatos = new Set([
            buildGraficoKey(g.nome || ''),
            buildGraficoKey(g.modelo || ''),
          ].filter(Boolean));
          for (const key of candidatos) {
            if (g.arquivo_url && !indexPdfPorChave.has(key)) {
              indexPdfPorChave.set(key, g.arquivo_url);
              console.log(`   ✅ Indexado: "${key}" -> ${g.arquivo_url.substring(0, 50)}...`);
            }
          }
        }
        
        console.log(`📋 Total de chaves indexadas: ${indexPdfPorChave.size}`);

        // Extrair modelos únicos dos itens 'guindaste' do carrinho e normalizar
        const itensGuindaste = (pedidoData.carrinho || []).filter(i => i.tipo === 'guindaste');
        console.log('🚛 Itens guindaste no carrinho:', itensGuindaste.length);
        
        // Para cada item, tentar várias fontes de informação do modelo
        const modelosParaBuscar = [];
        itensGuindaste.forEach(item => {
          console.log(`   🔍 Analisando item:`, {
            nome: item.nome,
            modelo: item.modelo,
            subgrupo: item.subgrupo,
            codigo_produto: item.codigo_produto
          });
          
          // Tentar extrair modelo de várias formas
          const fontes = [
            item.modelo,           // Campo modelo direto
            item.nome,             // Nome do item
            item.subgrupo,         // Subgrupo (mais completo)
            item.codigo_produto,   // Código do produto
          ];
          
          // Adicionar todas as variações normalizadas
          fontes.forEach(fonte => {
            if (fonte) {
              const chaveNormalizada = buildGraficoKey(fonte);
              if (chaveNormalizada) {
                modelosParaBuscar.push({
                  original: fonte,
                  normalizado: chaveNormalizada,
                  item: item
                });
                console.log(`      ➜ Chave gerada: "${chaveNormalizada}" de "${fonte}"`);
              }
            }
          });
        });
        
        // Remover duplicatas mantendo a ordem
        const modelosUnicos = Array.from(new Set(modelosParaBuscar.map(m => m.normalizado)));
        console.log(`🎯 Modelos únicos a buscar: ${modelosUnicos.length}`, modelosUnicos);

        // Resolver URL de PDF para cada modelo com fallbacks inteligentes
        const modeloParaPdf = new Map();
        for (const key of modelosUnicos) {
          const url = resolveGraficoUrl(indexPdfPorChave, key);
          if (url) {
            modeloParaPdf.set(key, url);
            console.log(`   ✅ Match encontrado: "${key}" -> ${url.substring(0, 50)}...`);
          } else {
            console.warn(`   ⚠️ Nenhum gráfico encontrado para: "${key}"`);
          }
        }
        
        console.log(`📈 Total de PDFs a incluir: ${modeloParaPdf.size}`);

        if (modeloParaPdf.size > 0) {
          const urlsJaIncluidas = new Set();
          for (const [modelo, pdfUrl] of modeloParaPdf.entries()) {
            if (urlsJaIncluidas.has(pdfUrl)) {
              continue;
            }
            try {
              const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
              const pdfExternal = await loadingTask.promise;
              const numPages = pdfExternal.numPages;

              for (let p = 1; p <= numPages; p++) {
                const page = await pdfExternal.getPage(p);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const imgData = canvas.toDataURL('image/png');

                // Nova página no PDF destino: sem cabeçalho/rodapé para ampliar o gráfico
                pdf.addPage();
                // Ajuste para preencher a página mantendo proporção
                const maxW = pageWidth - 2 * margin;
                const scaledH = (canvas.height * maxW) / canvas.width;
                const maxH = pageHeight - 2 * margin;
                let drawW = maxW;
                let drawH = scaledH;
                if (scaledH > maxH) {
                  drawH = maxH;
                  drawW = (canvas.width * maxH) / canvas.height;
                }
                const offsetX = (pageWidth - drawW) / 2;
                const offsetY = (pageHeight - drawH) / 2;
                pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
              }
              urlsJaIncluidas.add(pdfUrl);
            } catch (e) {
              console.error('Erro ao incorporar PDF de gráfico:', modelo, e);
              // Em caso de erro, seguir para o próximo
            }
          }
        }
      } catch (e) {
        console.error('Erro ao preparar PDFs de gráficos:', e);
      }

      // Adicionar página com cláusulas contratuais (tudo na MESMA página com assinaturas)
      // Evitar página em branco: só adicionar nova página se a anterior não estiver vazia acabada de criar
      // Garantimos nova página explicitamente aqui, pois após gráficos sempre queremos cláusulas em página própria
      pdf.addPage();
      
      // Adicionar cabeçalho
      const headerImgData = headerCanvas.toDataURL('image/png');
      pdf.addImage(headerImgData, 'PNG', margin, margin, contentWidth, headerHeight);
      
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      // Evitar erro de fonte ausente
      pdf.setFont('helvetica', 'normal');
      
      // Título das cláusulas
      pdf.setFontSize(12);
      pdf.setTextColor(73, 80, 87);
      pdf.text('CLÁUSULAS CONTRATUAIS', 20, margin + headerHeight + 20);
      
      // Conteúdo das cláusulas
      let clausulasFontSize = 8.5;
      let lineSpacing = 2.8; // mais compacto
      pdf.setFontSize(clausulasFontSize);
      pdf.setTextColor(0, 0, 0);

      const clausulasArray = [
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
      let lineWidth = 175;
      let signatureReservedHeight = 32; // espaço pequeno para assinaturas

      // Pré-calcular linhas e ajustar para caber em uma única página
      const buildLines = () => {
        const allLines = [];
        for (const clausula of clausulasArray) {
          const lines = pdf.splitTextToSize(clausula, lineWidth);
          for (const l of lines) allLines.push(l);
        }
        return allLines;
      };

      let allLines = buildLines();
      const availableForText = pageHeight - footerHeight - margin - (15 + signatureReservedHeight) - yPos;
      let requiredHeight = allLines.length * lineSpacing;
      let fitAttempts = 0;
      while (requiredHeight > availableForText && fitAttempts < 6) {
        // reduzir ligeiramente tamanho/entrelinha e aumentar largura
        clausulasFontSize = Math.max(7.0, clausulasFontSize - 0.3);
        lineSpacing = Math.max(2.2, lineSpacing - 0.1);
        lineWidth = Math.min(180, lineWidth + 1);
        pdf.setFontSize(clausulasFontSize);
        allLines = buildLines();
        requiredHeight = allLines.length * lineSpacing;
        fitAttempts += 1;
      }

      // Desenhar todas as linhas sem quebrar página
      for (const line of allLines) {
        pdf.text(line, 20, yPos);
        yPos += lineSpacing;
      }
      
      // Rodapé movido para após as assinaturas

      // Área de Assinaturas (compacta e na mesma página)
      const leftX = 25;
      const rightX = 115;
      let signatureTitleY = yPos + 8;
      // Nomes para assinaturas
      let vendedorNome = pedidoData.vendedor || '';
      try {
        if (!vendedorNome) {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          vendedorNome = userData.nome || '';
        }
      } catch (_) {}
      if (!vendedorNome) vendedorNome = 'Não informado';
      const clienteNome = (pedidoData.clienteData && pedidoData.clienteData.nome) ? pedidoData.clienteData.nome : 'Não informado';

      pdf.setFontSize(12);
      pdf.setTextColor(0,0,0);
      pdf.text('Assinaturas', 105, signatureTitleY, { align: 'center' });
      const lineY = signatureTitleY + 18;
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.4);
      pdf.line(leftX, lineY, leftX + 70, lineY);
      pdf.line(rightX, lineY, rightX + 70, lineY);
      pdf.setFontSize(10);
      pdf.text(`Cliente: ${clienteNome}`, leftX + 35, lineY + 6, { align: 'center' });
      pdf.text(`Vendedor: ${vendedorNome}`, rightX + 35, lineY + 6, { align: 'center' });

      // Adicionar rodapé após as assinaturas
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
            : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
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
            Gerar PDF
          </>
        )}
      </button>

      {/* Modal de Loading */}
      {isGenerating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
              borderTop: '4px solid #28a745',
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
              Por favor, aguarde enquanto processamos sua proposta...
            </p>
          </div>
        </div>
      )}

      {/* CSS para animação de rotação */}
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