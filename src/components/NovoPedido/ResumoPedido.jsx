import React, { useEffect, useState } from 'react';
import { formatCurrency, generateCodigoProduto } from '../../utils/formatters';
import PDFGenerator from '../PDFGenerator';
import { db } from '../../config/supabase';

/**
 * Componente de resumo do pedido com geração de PDF e salvamento
 * @param {Object} props
 * @param {Array} props.carrinho - Itens do carrinho
 * @param {Object} props.clienteData - Dados do cliente
 * @param {Object} props.caminhaoData - Dados do caminhão
 * @param {Object} props.pagamentoData - Dados de pagamento
 * @param {Object} props.user - Dados do usuário/vendedor
 * @param {Array} props.guindastes - Lista de guindastes disponíveis
 */
const ResumoPedido = ({ 
  carrinho, 
  clienteData, 
  caminhaoData, 
  pagamentoData, 
  user, 
  guindastes = [],
  isConcessionariaCompra = false,
  carrinhoAcumulativo = [],
  onAdicionarAoCarrinho,
  onLimparPedidoAtual,
  onLimparCarrinhoAcumulativo,
  onRemoverDoCarrinhoAcumulativo
}) => {
  const [pedidoSalvoId, setPedidoSalvoId] = useState(null);

  const handlePDFGenerated = async (fileName) => {
    try {
      // Critérios mínimos para salvar automaticamente
      const camposClienteOK = Boolean(
        clienteData?.nome && 
        clienteData?.telefone && 
        clienteData?.email && 
        clienteData?.documento && 
        clienteData?.inscricao_estadual && 
        clienteData?.endereco
      );
      const camposCaminhaoOK = Boolean(
        caminhaoData?.tipo && 
        caminhaoData?.marca && 
        caminhaoData?.modelo && 
        caminhaoData?.voltagem
      );
      const usuarioOK = Boolean(user?.id);

      if (camposClienteOK && camposCaminhaoOK && usuarioOK) {
        // Salvar relatório automaticamente (apenas uma vez)
        if (!pedidoSalvoId) {
          const pedido = await salvarRelatorio();
          setPedidoSalvoId(pedido?.id || null);
        }
        alert(`PDF gerado com sucesso: ${fileName}\nRelatório salvo automaticamente!`);
      } else {
        alert(
          `PDF gerado com sucesso: ${fileName}\n` +
          `Observação: Relatório não foi salvo automaticamente porque ainda faltam dados obrigatórios ` +
          `(Cliente e/ou Caminhão). Ao clicar em Finalizar, ele será salvo.`
        );
      }
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      const msg = (error && error.message) ? `\nMotivo: ${error.message}` : '';
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatório automaticamente.${msg}`);
    }
  };

  const salvarRelatorio = async () => {
    try {
      console.log('🔄 Iniciando salvamento do relatório...');
      
      // 1. Criar cliente
      console.log('1️⃣ Criando cliente...');
      
      // Montar endereço completo
      const enderecoCompleto = (() => {
        const c = clienteData;
        const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
        const bairro = c.bairro ? ` - ${c.bairro}` : '';
        const cidadeUf = (c.cidade || c.uf) 
          ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}`  
          : '';
        const cep = c.cep ? ` - CEP: ${c.cep}` : '';
        return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || c.endereco || 'Não informado';
      })();
      
      const clienteDataToSave = {
        nome: clienteData.nome,
        telefone: clienteData.telefone,
        email: clienteData.email,
        documento: clienteData.documento,
        inscricao_estadual: clienteData.inscricao_estadual || clienteData.inscricaoEstadual,
        endereco: enderecoCompleto,
        observacoes: clienteData.observacoes || null
      };
      
      const cliente = await db.createCliente(clienteDataToSave);
      console.log('✅ Cliente criado:', cliente);
      
      // 2. Criar caminhão
      console.log('2️⃣ Criando caminhão...');
      
      // Verificar campos obrigatórios
      const camposObrigatorios = ['tipo', 'marca', 'modelo', 'voltagem'];
      const camposFaltando = camposObrigatorios.filter(campo => !caminhaoData[campo]);
      
      if (camposFaltando.length > 0) {
        throw new Error(`Campos obrigatórios do caminhão não preenchidos: ${camposFaltando.join(', ')}`);
      }
      
      // Filtrar apenas campos válidos da tabela caminhoes
      const filterCaminhaoDataForDB = (data) => ({
        tipo: data.tipo,
        marca: data.marca,
        modelo: data.modelo,
        ano: data.ano || null,
        voltagem: data.voltagem,
        observacoes: data.observacoes || null,
        comprimento_chassi: data.comprimentoChassi || null,
        patolamento: data.patolamento || null
      });

      const caminhaoDataToSave = {
        ...filterCaminhaoDataForDB(caminhaoData),
        cliente_id: cliente.id
      };
      
      const caminhao = await db.createCaminhao(caminhaoDataToSave);
      console.log('✅ Caminhão criado:', caminhao);
      
      // 3. Gerar número do pedido (máx. 10 caracteres para compatibilidade com varchar(10))
      const timestamp = Date.now().toString();
      const numeroPedido = `PED${timestamp.slice(-7)}`; // Ex: PED1234567 (10 chars)
      console.log('3️⃣ Número do pedido gerado:', numeroPedido);
      
      // 4. Criar pedido
      console.log('4️⃣ Criando pedido...');
      console.log('🔍 [DEBUG] Carrinho completo:', carrinho);
      
      const pedidoDataToSave = {
        numero_pedido: numeroPedido,
        cliente_id: cliente.id,
        vendedor_id: user.id,
        caminhao_id: caminhao.id,
        status: 'finalizado', // Proposta comercial gerada = venda finalizada
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0),
        observacoes: [
          `Proposta gerada em ${new Date().toLocaleString('pt-BR')}.`,
          `Local de instalação: ${pagamentoData.localInstalacao}.`,
          `Tipo de instalação: ${pagamentoData.tipoInstalacao === 'cliente' ? 'Por conta do cliente' : 'Por conta da fábrica'}.`
        ].join(' ')
      };
      
      console.log('🔍 [DEBUG] Dados do pedido a salvar:', pedidoDataToSave);
      
      const pedido = await db.createPedido(pedidoDataToSave);
      console.log('✅ Pedido criado:', pedido);

      // 5. Criar itens do pedido
      console.log('5️⃣ Criando itens do pedido...');
      for (const item of carrinho) {
        let codigo_produto = null;
        if (item.tipo === 'equipamento') {
          const opcionaisSelecionados = carrinho
            .filter(i => i.tipo === 'opcional')
            .map(i => i.nome);
          codigo_produto = generateCodigoProduto(item.nome, opcionaisSelecionados);
        }
        
        const itemDataToSave = {
          pedido_id: pedido.id,
          tipo: item.tipo,
          item_id: item.id,
          quantidade: 1,
          preco_unitario: item.preco,
          codigo_produto
        };
        
        await db.createPedidoItem(itemDataToSave);
      }
      
      console.log('🎉 Relatório salvo com sucesso:', {
        pedidoId: pedido.id,
        numeroPedido,
        cliente: cliente.nome,
        vendedor: user.nome
      });
      
      return pedido;
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error);
      throw error;
    }
  };

  // Buscar dados completos dos guindastes do carrinho
  const guindastesCompletos = carrinho
    .filter(item => item.tipo === 'guindaste')
    .map(item => {
      const guindasteCompleto = guindastes.find(g => g.id === item.id);
      return {
        nome: item.nome,
        modelo: item.modelo || guindasteCompleto?.modelo,
        codigo_produto: item.codigo_produto,
        descricao: guindasteCompleto?.descricao || '',
        nao_incluido: guindasteCompleto?.nao_incluido || ''
      };
    });

  const [concessionariaInfo, setConcessionariaInfo] = useState(null);

  useEffect(() => {
    const carregarConcessionaria = async () => {
      if (!user?.concessionaria_id) return;
      try {
        const c = await db.getConcessionariaById(user.concessionaria_id);
        setConcessionariaInfo(c || null);
      } catch (error) {
        console.error('Erro ao carregar concessionária para PDF:', error);
      }
    };
    carregarConcessionaria();
  }, [user?.concessionaria_id]);

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'Não informado',
    isConcessionariaCompra: user?.tipo === 'admin_concessionaria',
    concessionariaLogoUrl: concessionariaInfo?.logo_url || '',
    concessionariaDadosBancarios: concessionariaInfo?.dados_bancarios || '',
    concessionariaNome: concessionariaInfo?.nome || '',
    guindastes: guindastesCompletos
  };

  return (
    <div className="resumo-container">
      {/* Itens Selecionados */}
      <div className="resumo-section">
        <h3>Itens Selecionados</h3>
        <div className="resumo-items">
          {carrinho.map((item, idx) => {
            let codigoProduto = null;
            if (item.tipo === 'equipamento') {
              const opcionaisSelecionados = carrinho
                .filter(i => i.tipo === 'opcional')
                .map(i => i.nome);
              codigoProduto = generateCodigoProduto(item.nome, opcionaisSelecionados);
            }
            return (
              <div key={idx} className="resumo-item">
                <div className="item-info">
                  <div className="item-name">{item.nome}</div>
                  <div className="item-type">{item.tipo}</div>
                  {codigoProduto && (
                    <div className="item-codigo">Código: <b>{codigoProduto}</b></div>
                  )}
                </div>
                <div className="item-price">{formatCurrency(item.preco)}</div>
              </div>
            );
          })}
        </div>
        <div className="resumo-total">
          <span>Total: {formatCurrency(carrinho.reduce((total, item) => total + item.preco, 0))}</span>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="resumo-section">
        <h3>Dados do Cliente</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Nome:</span>
            <span className="value">{clienteData.nome || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Telefone:</span>
            <span className="value">{clienteData.telefone || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Email:</span>
            <span className="value">{clienteData.email || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">CPF/CNPJ:</span>
            <span className="value">{clienteData.documento || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Inscrição Estadual:</span>
            <span className="value">{clienteData.inscricao_estadual || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Endereço:</span>
            <span className="value">{clienteData.endereco || 'Não informado'}</span>
          </div>
          {clienteData.bairro && (
            <div className="data-row">
              <span className="label">Bairro:</span>
              <span className="value">{clienteData.bairro}</span>
            </div>
          )}
          {(clienteData.cidade || clienteData.uf || clienteData.cep) && (
            <div className="data-row">
              <span className="label">Cidade/UF/CEP:</span>
              <span className="value">
                {`${clienteData.cidade || '—'}/${clienteData.uf || '—'}${clienteData.cep ? ' - ' + clienteData.cep : ''}`}
              </span>
            </div>
          )}
          {clienteData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{clienteData.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Estudo Veicular */}
      <div className="resumo-section">
        <h3>Estudo Veicular</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo:</span>
            <span className="value">{caminhaoData.tipo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Marca:</span>
            <span className="value">{caminhaoData.marca || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Modelo:</span>
            <span className="value">{caminhaoData.modelo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Voltagem:</span>
            <span className="value">{caminhaoData.voltagem || 'Não informado'}</span>
          </div>
          {caminhaoData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{caminhaoData.observacoes}</span>
            </div>
          )}
          
          {/* Medidas do estudo veicular */}
          {(caminhaoData.medidaA || caminhaoData.medidaB || caminhaoData.medidaC || caminhaoData.medidaD) && (
            <>
              <div 
                className="data-row" 
                style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}
              >
                <span className="label" style={{ fontWeight: 'bold' }}>Medidas do Veículo:</span>
                <span className="value"></span>
              </div>
              {caminhaoData.medidaA && (
                <div className="data-row">
                  <span className="label">Medida A:</span>
                  <span className="value">{caminhaoData.medidaA} cm</span>
                </div>
              )}
              {caminhaoData.medidaB && (
                <div className="data-row">
                  <span className="label">Medida B:</span>
                  <span className="value">{caminhaoData.medidaB} cm </span>
                </div>
              )}
              {caminhaoData.medidaC && (
                <div className="data-row">
                  <span className="label">Medida C:</span>
                  <span className="value">{caminhaoData.medidaC} cm </span>
                </div>
              )}
              {caminhaoData.medidaD && (
                <div className="data-row">
                  <span className="label">Medida D:</span>
                  <span className="value">{caminhaoData.medidaD} cm </span>
                </div>
              )}
              {caminhaoData.comprimentoChassi && (
                <div className="data-row">
                  <span className="label">📏 Comprimento do Chassi:</span>
                  <span className="value">{caminhaoData.comprimentoChassi} cm</span>
                </div>
              )}
              {caminhaoData.patolamento && (
                <div className="data-row" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '10px',
                  borderRadius: '6px',
                  marginTop: '10px'
                }}>
                  <span className="label" style={{ color: 'white', fontWeight: 'bold' }}>🔧 Patolamento:</span>
                  <span className="value" style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{caminhaoData.patolamento}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Política de Pagamento */}
      <div className="resumo-section">
        <h3>Política de Pagamento</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo de Pagamento:</span>
            <span className="value">
              {pagamentoData.tipoPagamento === 'revenda_gsi' && 'Revenda - Guindastes GSI'}
              {pagamentoData.tipoPagamento === 'cnpj_cpf_gse' && 'CNPJ/CPF - Guindastes GSE'}
              {pagamentoData.tipoPagamento === 'parcelamento_interno' && 'Parcelamento Interno - Revenda'}
              {pagamentoData.tipoPagamento === 'parcelamento_cnpj' && 'Parcelamento - CNPJ/CPF'}
              {!pagamentoData.tipoPagamento && 'Não informado'}
            </span>
          </div>
          <div className="data-row">
            <span className="label">Prazo de Pagamento:</span>
            <span className="value">
              {pagamentoData.prazoPagamento === 'a_vista' && 'À Vista'}
              {pagamentoData.prazoPagamento === '30_dias' && 'Até 30 dias (+3%)'}
              {pagamentoData.prazoPagamento === '60_dias' && 'Até 60 dias (+1%)'}
              {pagamentoData.prazoPagamento === '120_dias_interno' && 'Até 120 dias (sem acréscimo)'}
              {pagamentoData.prazoPagamento === '90_dias_cnpj' && 'Até 90 dias (sem acréscimo)'}
              {pagamentoData.prazoPagamento === 'mais_120_dias' && 'Após 120 dias (+2% ao mês)'}
              {pagamentoData.prazoPagamento === 'mais_90_dias' && 'Após 90 dias (+2% ao mês)'}
              {!pagamentoData.prazoPagamento && 'Não informado'}
            </span>
          </div>
          {pagamentoData.desconto > 0 && (
            <div className="data-row">
              <span className="label">Desconto:</span>
              <span className="value">{pagamentoData.desconto}%</span>
            </div>
          )}
          {pagamentoData.acrescimo > 0 && (
            <div className="data-row">
              <span className="label">Acréscimo:</span>
              <span className="value">{pagamentoData.acrescimo}%</span>
            </div>
          )}
          <div className="data-row">
            <span className="label">Valor Final:</span>
            <span className="value" style={{ fontWeight: 'bold', color: '#007bff' }}>
              {formatCurrency(pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0))}
            </span>
          </div>
          
          {/* Campos adicionais para cliente */}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.percentualEntrada > 0 && (
            <>
              <div 
                className="data-row" 
                style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}
              >
                <span className="label">Entrada Total ({pagamentoData.percentualEntrada}%):</span>
                <span className="value" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(pagamentoData.entradaTotal || 0)}
                </span>
              </div>
              {pagamentoData.valorSinal > 0 && (
                <>
                  <div className="data-row" style={{ fontSize: '0.95em', color: '#28a745' }}>
                    <span className="label">↳ Sinal (já pago):</span>
                    <span className="value">- {formatCurrency(pagamentoData.valorSinal)}</span>
                  </div>
                  <div className="data-row" style={{ fontSize: '0.95em' }}>
                    <span className="label">↳ Falta pagar de entrada:</span>
                    <span className="value" style={{ fontWeight: 'bold' }}>
                      {formatCurrency(pagamentoData.faltaEntrada || 0)}
                    </span>
                  </div>
                  {pagamentoData.formaEntrada && (
                    <div 
                      className="data-row" 
                      style={{ fontSize: '0.9em', marginLeft: '10px', marginTop: '5px', fontStyle: 'italic', color: '#555' }}
                    >
                      <span className="label">Forma de pagamento:</span>
                      <span className="value">{pagamentoData.formaEntrada}</span>
                    </div>
                  )}
                </>
              )}
              <div 
                className="data-row" 
                style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #007bff' }}
              >
                <span className="label" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                  Saldo a Pagar (após entrada):
                </span>
                <span className="value" style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.1em' }}>
                  {formatCurrency(pagamentoData.saldoAPagar || pagamentoData.valorFinal || 0)}
                </span>
              </div>
            </>
          )}
          
          {/* Campos Local e Tipo de Instalação */}
          {pagamentoData.tipoCliente === 'cliente' && (
            <>
              <div className="data-row">
                <span className="label">Local de Instalação:</span>
                <span className="value">{pagamentoData.localInstalacao || 'Não informado'}</span>
              </div>
              <div className="data-row">
                <span className="label">Tipo de Instalação:</span>
                <span className="value">
                  {pagamentoData.tipoInstalacao === 'cliente paga direto' && 'Cliente paga direto'}
                  {pagamentoData.tipoInstalacao === 'Incluso no pedido' && 'Incluso no pedido'}
                  {!pagamentoData.tipoInstalacao && 'Não informado'}
                </span>
              </div>
              
              {/* Participação de Revenda */}
              {pagamentoData.participacaoRevenda && (
                <>
                  <div 
                    className="data-row" 
                    style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}
                  >
                    <span className="label">Participação de Revenda:</span>
                    <span 
                      className="value" 
                      style={{ 
                        fontWeight: 'bold', 
                        color: pagamentoData.participacaoRevenda === 'sim' ? '#28a745' : '#dc3545' 
                      }}
                    >
                      {pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  
                  {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
                    <>
                      <div className="data-row" style={{ fontSize: '0.95em', marginLeft: '10px' }}>
                        <span className="label">↳ Revenda possui IE:</span>
                        <span 
                          className="value" 
                          style={{ color: pagamentoData.revendaTemIE === 'sim' ? '#007bff' : '#ffc107' }}
                        >
                          {pagamentoData.revendaTemIE === 'sim' ? 'Sim (Com IE)' : 'Não (Sem IE)'}
                        </span>
                      </div>
                      
                      {pagamentoData.revendaTemIE === 'sim' && pagamentoData.descontoRevendaIE > 0 && (
                        <div 
                          className="data-row" 
                          style={{ fontSize: '0.95em', marginLeft: '20px', color: '#28a745' }}
                        >
                          <span className="label">↳ Desconto do Vendedor:</span>
                          <span className="value" style={{ fontWeight: 'bold' }}>
                            {pagamentoData.descontoRevendaIE}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="resumo-section">
        <h3>Ações</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {isConcessionariaCompra ? (
            /* Ações para Concessionária */
            <>
              {/* Itens acumulados anteriormente */}
              {carrinhoAcumulativo.length > 0 && (
                <div style={{
                  width: '100%',
                  marginBottom: '16px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
                  borderRadius: '10px',
                  border: '1px solid #a5d6a7'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#2e7d32', marginBottom: '10px' }}>
                    📦 Equipamentos já adicionados ({carrinhoAcumulativo.length})
                  </div>
                  {carrinhoAcumulativo.map((pedido, idx) => (
                    <div key={pedido.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'white',
                      borderRadius: '6px',
                      marginBottom: idx < carrinhoAcumulativo.length - 1 ? '6px' : '0',
                      fontSize: '0.9rem'
                    }}>
                      <div>
                        <strong>#{idx + 1}</strong> — {pedido.carrinho.map(i => i.nome).join(', ')}
                        <span style={{ color: '#666', marginLeft: '8px' }}>
                          ({formatCurrency(pedido.carrinho.reduce((s, i) => s + ((parseFloat(i.preco) || 0) * (parseInt(i.quantidade, 10) || 1)), 0))})
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoverDoCarrinhoAcumulativo && onRemoverDoCarrinhoAcumulativo(pedido.id)}
                        style={{
                          background: '#ef5350',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        title="Remover do carrinho"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Deseja adicionar este pedido ao carrinho e continuar comprando?')) {
                      onAdicionarAoCarrinho();
                      onLimparPedidoAtual();
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #28a745, #20c997)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  ➕ Adicionar Mais Equipamentos
                </button>
              </div>

              {/* Gerar PDF com todos os itens (acumulados + atual) */}
              <div style={{ marginTop: '12px', width: '100%' }}>
                <PDFGenerator 
                  pedidoData={{
                    ...pedidoData,
                    carrinho: [
                      ...carrinhoAcumulativo.flatMap(p => p.carrinho),
                      ...carrinho
                    ]
                  }}
                  onGenerate={(fileName) => {
                    if (onLimparCarrinhoAcumulativo) {
                      onLimparCarrinhoAcumulativo();
                    }
                    handlePDFGenerated(fileName);
                  }}
                />
                {carrinhoAcumulativo.length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '6px' }}>
                    O PDF incluirá {carrinhoAcumulativo.length + 1} equipamento(s) — {carrinhoAcumulativo.length} acumulado(s) + pedido atual
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Ações normais */
            <PDFGenerator 
              pedidoData={pedidoData} 
              onGenerate={handlePDFGenerated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumoPedido;

