import React, { useState } from 'react';
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
  guindastes = [] 
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
      
      const caminhaoDataToSave = {
        ...caminhaoData,
        cliente_id: cliente.id,
        observacoes: caminhaoData.observacoes || null,
        placa: 'N/A' // Campo obrigatório no banco
      };
      
      const caminhao = await db.createCaminhao(caminhaoDataToSave);
      console.log('✅ Caminhão criado:', caminhao);
      
      // 3. Gerar número do pedido
      const numeroPedido = `PED${Date.now()}`;
      console.log('3️⃣ Número do pedido gerado:', numeroPedido);
      
      // 4. Criar pedido
      console.log('4️⃣ Criando pedido...');
      const pedidoDataToSave = {
        numero_pedido: numeroPedido,
        cliente_id: cliente.id,
        vendedor_id: user.id,
        caminhao_id: caminhao.id,
        status: 'em_andamento',
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0),
        observacoes: [
          `Proposta gerada em ${new Date().toLocaleString('pt-BR')}.`,
          `Local de instalação: ${pagamentoData.localInstalacao}.`,
          `Tipo de instalação: ${pagamentoData.tipoInstalacao === 'cliente' ? 'Por conta do cliente' : 'Por conta da fábrica'}.`
        ].join(' ')
      };
      
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

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'Não informado',
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
                  <span className="value">{caminhaoData.medidaA} mm</span>
                </div>
              )}
              {caminhaoData.medidaB && (
                <div className="data-row">
                  <span className="label">Medida B:</span>
                  <span className="value">{caminhaoData.medidaB} mm</span>
                </div>
              )}
              {caminhaoData.medidaC && (
                <div className="data-row">
                  <span className="label">Medida C:</span>
                  <span className="value">{caminhaoData.medidaC} mm</span>
                </div>
              )}
              {caminhaoData.medidaD && (
                <div className="data-row">
                  <span className="label">Medida D:</span>
                  <span className="value">{caminhaoData.medidaD} mm</span>
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
                  {pagamentoData.tipoInstalacao === 'cliente' && 'Por conta do cliente'}
                  {pagamentoData.tipoInstalacao === 'fabrica' && 'Por conta da fábrica'}
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
          <PDFGenerator 
            pedidoData={pedidoData} 
            onGenerate={handlePDFGenerated}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumoPedido;

