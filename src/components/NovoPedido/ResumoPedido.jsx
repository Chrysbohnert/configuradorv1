import React, { useEffect, useState } from 'react';
import { formatCurrency, generateCodigoProduto } from '../../utils/formatters';
import PDFGenerator from '../PDFGenerator';
import { db } from '../../config/supabase';

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
  const [concessionariaInfo, setConcessionariaInfo] = useState(null);

  const handlePDFGenerated = async (fileName) => {
    try {
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
      const msg = error?.message ? `\nMotivo: ${error.message}` : '';
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatório automaticamente.${msg}`);
    }
  };

  const salvarRelatorio = async () => {
    try {
      const enderecoCompleto = (() => {
        const c = clienteData;
        const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
        const bairro = c.bairro ? ` - ${c.bairro}` : '';
        const cidadeUf =
          c.cidade || c.uf
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

      const camposObrigatorios = ['tipo', 'marca', 'modelo', 'voltagem'];
      const camposFaltando = camposObrigatorios.filter((campo) => !caminhaoData[campo]);

      if (camposFaltando.length > 0) {
        throw new Error(`Campos obrigatórios do caminhão não preenchidos: ${camposFaltando.join(', ')}`);
      }

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

      const timestamp = Date.now().toString();
      const numeroPedido = `PED${timestamp.slice(-7)}`;

      const pedidoDataToSave = {
        numero_pedido: numeroPedido,
        cliente_id: cliente.id,
        vendedor_id: user.id,
        caminhao_id: caminhao.id,
        status: 'finalizado',
        valor_total:
          pagamentoData.valorFinal ||
          carrinho.reduce((total, item) => total + (item.preco || 0), 0),
        observacoes: [
          `Proposta gerada em ${new Date().toLocaleString('pt-BR')}.`,
          `Local de instalação: ${pagamentoData.localInstalacao}.`,
          `Tipo de instalação: ${
            pagamentoData.tipoInstalacao === 'cliente' ? 'Por conta do cliente' : 'Por conta da fábrica'
          }.`
        ].join(' ')
      };

      const pedido = await db.createPedido(pedidoDataToSave);

      for (const item of carrinho) {
        let codigo_produto = null;

        if (item.tipo === 'equipamento') {
          const opcionaisSelecionados = carrinho
            .filter((i) => i.tipo === 'opcional')
            .map((i) => i.nome);
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

      return pedido;
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error);
      throw error;
    }
  };

  const guindastesCompletos = carrinho
    .filter((item) => item.tipo === 'guindaste')
    .map((item) => {
      const guindasteCompleto = guindastes.find((g) => g.id === item.id);
      return {
        nome: item.nome,
        modelo: item.modelo || guindasteCompleto?.modelo,
        codigo_produto: item.codigo_produto,
        descricao: guindasteCompleto?.descricao || '',
        nao_incluido: guindasteCompleto?.nao_incluido || ''
      };
    });

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

  const totalItens = carrinho.reduce((total, item) => total + (item.preco || 0), 0);
  const totalFinal = pagamentoData.valorFinal || totalItens;

  const sectionStyle = {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '22px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
  };

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 0 18px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid #eef2f7',
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a'
  };

  const compactRow = (label, value, mono = false) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: '12px',
        alignItems: 'start',
        padding: '10px 0',
        borderBottom: '1px solid #f1f5f9'
      }}
    >
      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>{label}</span>
      <span
        style={{
          color: '#0f172a',
          fontSize: '14px',
          fontWeight: 600,
          lineHeight: 1.45,
          fontFamily: mono ? 'monospace' : 'inherit',
          wordBreak: 'break-word'
        }}
      >
        {value || 'Não informado'}
      </span>
    </div>
  );

  return (
    <div
      className="resumo-container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
        gap: '22px',
        padding: '18px 14px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        alignItems: 'start'
      }}
    >
      <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginBottom: '2px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            padding: '6px 16px',
            borderRadius: '999px',
            border: '1px solid #e2e8f0',
            marginBottom: '14px'
          }}
        >
          <span style={{ fontSize: '1rem' }}>✨</span>
          <span
            style={{
              fontWeight: 800,
              color: '#475569',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '11px'
            }}
          >
            Etapa 5 · Resumo Final
          </span>
        </div>

        <h2
          style={{
            fontSize: '30px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.03em',
            margin: '0 0 8px 0'
          }}
        >
          Revisão da <span style={{ color: '#ff6b00' }}>Proposta</span>
        </h2>

        <p
          style={{
            color: '#64748b',
            fontSize: '14px',
            maxWidth: '680px',
            margin: 0,
            lineHeight: 1.55
          }}
        >
          Revise as informações antes de finalizar. O layout abaixo foi organizado para leitura mais rápida e objetiva.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '22px' }}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '16px'
              }}
            >
              🛒
            </span>
            Itens Selecionados
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            {carrinho.map((item, idx) => {
              let codigoProduto = null;

              if (item.tipo === 'equipamento') {
                const opcionaisSelecionados = carrinho
                  .filter((i) => i.tipo === 'opcional')
                  .map((i) => i.nome);
                codigoProduto = generateCodigoProduto(item.nome, opcionaisSelecionados);
              }

              return (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '14px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '15px',
                        color: '#0f172a',
                        lineHeight: 1.35
                      }}
                    >
                      {item.nome}
                    </div>

                    <div
                      style={{
                        color: '#64748b',
                        fontSize: '11px',
                        marginTop: '4px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {item.tipo}
                    </div>

                    {codigoProduto && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          background: '#e2e8f0',
                          display: 'inline-flex',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        Cód: {codigoProduto}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      color: '#0f172a',
                      fontSize: '16px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatCurrency(item.preco)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '16px'
              }}
            >
              👤
            </span>
            Dados do Cliente
          </h3>

          <div style={{ display: 'grid', gap: 0 }}>
            {compactRow('Nome', clienteData.nome)}
            {compactRow('Telefone', clienteData.telefone)}
            {compactRow('Email', clienteData.email)}
            {compactRow('CPF/CNPJ', clienteData.documento, true)}
            {compactRow('Inscrição Est.', clienteData.inscricao_estadual, true)}
            {compactRow('Endereço', clienteData.endereco)}
            {clienteData.bairro ? compactRow('Bairro', clienteData.bairro) : null}
            {clienteData.cidade || clienteData.uf || clienteData.cep
              ? compactRow(
                  'Cidade/UF/CEP',
                  `${clienteData.cidade || '—'}/${clienteData.uf || '—'}${
                    clienteData.cep ? ` - ${clienteData.cep}` : ''
                  }`
                )
              : null}
          </div>

          {clienteData.observacoes && (
            <div
              style={{
                marginTop: '14px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '6px'
                }}
              >
                Observações
              </div>
              <div style={{ color: '#334155', fontSize: '14px', lineHeight: 1.5 }}>
                {clienteData.observacoes}
              </div>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#d97706',
                fontSize: '16px'
              }}
            >
              🚚
            </span>
            Estudo Veicular
          </h3>

          <div style={{ display: 'grid', gap: 0 }}>
            {compactRow('Tipo', caminhaoData.tipo)}
            {compactRow('Marca', caminhaoData.marca)}
            {compactRow('Modelo', caminhaoData.modelo)}
            {compactRow('Voltagem', caminhaoData.voltagem)}
          </div>

          {caminhaoData.observacoes && (
            <div
              style={{
                marginTop: '14px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '6px'
                }}
              >
                Observações
              </div>
              <div style={{ color: '#334155', fontSize: '14px', lineHeight: 1.5 }}>
                {caminhaoData.observacoes}
              </div>
            </div>
          )}

          {(caminhaoData.medidaA ||
            caminhaoData.medidaB ||
            caminhaoData.medidaC ||
            caminhaoData.medidaD ||
            caminhaoData.comprimentoChassi) && (
            <div
              style={{
                marginTop: '14px',
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '12px',
                  fontSize: '14px'
                }}
              >
                Medidas Técnicas
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                  gap: '10px'
                }}
              >
                {caminhaoData.medidaA && <MiniMeasure label="A" value={caminhaoData.medidaA} />}
                {caminhaoData.medidaB && <MiniMeasure label="B" value={caminhaoData.medidaB} />}
                {caminhaoData.medidaC && <MiniMeasure label="C" value={caminhaoData.medidaC} />}
                {caminhaoData.medidaD && <MiniMeasure label="D" value={caminhaoData.medidaD} />}
              </div>

              {caminhaoData.comprimentoChassi && (
                <div
                  style={{
                    marginTop: '10px',
                    background: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>
                    Comprimento do chassi
                  </span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                    {caminhaoData.comprimentoChassi} cm
                  </span>
                </div>
              )}
            </div>
          )}

          {caminhaoData.patolamento && (
            <div
              style={{
                marginTop: '14px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                padding: '16px 18px',
                borderRadius: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                Patolamento Ideal
              </span>
              <span
                style={{
                  color: '#4338ca',
                  background: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '16px'
                }}
              >
                {caminhaoData.patolamento}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '22px', position: 'sticky', top: '16px' }}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                background: '#fdf2f8',
                color: '#db2777',
                fontSize: '16px'
              }}
            >
              💳
            </span>
            Financeiro
          </h3>

          <div style={{ display: 'grid', gap: 0 }}>
            {compactRow(
              'Pagamento',
              pagamentoData.tipoPagamento === 'revenda_gsi'
                ? 'Revenda - GSI'
                : pagamentoData.tipoPagamento === 'cnpj_cpf_gse'
                ? 'CNPJ/CPF - GSE'
                : pagamentoData.tipoPagamento === 'parcelamento_interno'
                ? 'Parc. Interno - Revenda'
                : pagamentoData.tipoPagamento === 'parcelamento_cnpj'
                ? 'Parcelamento - CNPJ/CPF'
                : 'Não informado'
            )}

            {compactRow(
              'Prazo',
              pagamentoData.prazoPagamento === 'a_vista'
                ? 'À Vista'
                : pagamentoData.prazoPagamento === '30_dias'
                ? 'Até 30 dias (+3%)'
                : pagamentoData.prazoPagamento === '60_dias'
                ? 'Até 60 dias (+1%)'
                : pagamentoData.prazoPagamento === '120_dias_interno'
                ? 'Até 120 dias (s/ acréscimo)'
                : pagamentoData.prazoPagamento === '90_dias_cnpj'
                ? 'Até 90 dias (s/ acréscimo)'
                : pagamentoData.prazoPagamento === 'mais_120_dias'
                ? 'Após 120 dias (+2% a.m)'
                : pagamentoData.prazoPagamento === 'mais_90_dias'
                ? 'Após 90 dias (+2% a.m)'
                : 'Não informado'
            )}
          </div>

          {(pagamentoData.desconto > 0 || pagamentoData.acrescimo > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '14px'
              }}
            >
              {pagamentoData.desconto > 0 && (
                <MiniStatBox
                  tone="green"
                  label="Desconto"
                  value={`${pagamentoData.desconto}%`}
                />
              )}
              {pagamentoData.acrescimo > 0 && (
                <MiniStatBox
                  tone="red"
                  label="Acréscimo"
                  value={`${pagamentoData.acrescimo}%`}
                />
              )}
            </div>
          )}

          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.percentualEntrada > 0 && (
            <div
              style={{
                marginTop: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: '10px'
                }}
              >
                <FinancialLine
                  label={`Entrada (${pagamentoData.percentualEntrada}%)`}
                  value={formatCurrency(pagamentoData.entradaTotal || 0)}
                />

                {pagamentoData.valorSinal > 0 && (
                  <FinancialLine
                    label="Sinal pago"
                    value={`- ${formatCurrency(pagamentoData.valorSinal)}`}
                    valueColor="#16a34a"
                  />
                )}

                {pagamentoData.valorSinal > 0 && (
                  <FinancialLine
                    label="Falta pagar"
                    value={formatCurrency(pagamentoData.faltaEntrada || 0)}
                    valueColor="#dc2626"
                  />
                )}

                {pagamentoData.formaEntrada && (
                  <FinancialLine
                    label="Forma de pgto."
                    value={pagamentoData.formaEntrada}
                  />
                )}

                <div
                  style={{
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: '10px',
                    marginTop: '2px'
                  }}
                >
                  <FinancialLine
                    label="Saldo a Pagar"
                    value={formatCurrency(pagamentoData.saldoAPagar || pagamentoData.valorFinal || 0)}
                    strong
                    valueColor="#2563eb"
                  />
                </div>
              </div>
            </div>
          )}

          {pagamentoData.tipoCliente === 'cliente' && (
            <div
              style={{
                marginTop: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px',
                display: 'grid',
                gap: '10px'
              }}
            >
              <FinancialLine
                label="Local Instalação"
                value={pagamentoData.localInstalacao || 'Não informado'}
              />

              <FinancialLine
                label="Tipo Instalação"
                value={
                  pagamentoData.tipoInstalacao === 'cliente paga direto'
                    ? 'Cliente paga direto'
                    : pagamentoData.tipoInstalacao === 'Incluso no pedido'
                    ? 'Incluso no pedido'
                    : 'Não informado'
                }
              />

              {pagamentoData.participacaoRevenda && (
                <FinancialLine
                  label="Participação Revenda"
                  value={pagamentoData.participacaoRevenda === 'sim' ? 'SIM' : 'NÃO'}
                />
              )}

              {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
                <FinancialLine
                  label="Revenda possui IE"
                  value={pagamentoData.revendaTemIE === 'sim' ? 'Sim (Com IE)' : 'Não (Sem IE)'}
                />
              )}

              {pagamentoData.participacaoRevenda === 'sim' &&
                pagamentoData.revendaTemIE === 'sim' &&
                pagamentoData.descontoRevendaIE > 0 && (
                  <FinancialLine
                    label="Desconto do Vendedor"
                    value={`${pagamentoData.descontoRevendaIE}%`}
                    valueColor="#16a34a"
                  />
                )}
            </div>
          )}
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
            borderRadius: '22px',
            padding: '22px',
            color: 'white',
            boxShadow: '0 16px 34px rgba(15, 23, 42, 0.24)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.68)',
              fontWeight: 800,
              marginBottom: '8px'
            }}
          >
            Resumo Financeiro
          </div>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.76)', marginBottom: '4px' }}>
            Total dos itens
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
            {formatCurrency(totalItens)}
          </div>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.76)', marginBottom: '4px' }}>
            Valor final da proposta
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#38bdf8',
              marginBottom: '16px'
            }}
          >
            {formatCurrency(totalFinal)}
          </div>

          <div
            style={{
              height: '1px',
              background: 'rgba(255,255,255,0.08)',
              margin: '14px 0 16px'
            }}
          />

          <div style={{ display: 'grid', gap: '10px' }}>
            <MiniDarkLine label="Itens no pedido" value={String(carrinho.length)} />
            <MiniDarkLine label="Vendedor" value={user?.nome || 'Não informado'} />
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            <span
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                background: '#f5f3ff',
                color: '#8b5cf6',
                fontSize: '16px'
              }}
            >
              ⚡
            </span>
            Ações Finais
          </h3>

          {isConcessionariaCompra && carrinhoAcumulativo.length > 0 && (
            <div
              style={{
                marginBottom: '14px',
                padding: '14px',
                background: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#166534',
                  marginBottom: '10px'
                }}
              >
                Equipamentos já adicionados ({carrinhoAcumulativo.length})
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {carrinhoAcumulativo.map((pedido, idx) => (
                  <div
                    key={pedido.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'white',
                      borderRadius: '10px',
                      fontSize: '13px',
                      border: '1px solid #dcfce7'
                    }}
                  >
                    <div style={{ color: '#0f172a', lineHeight: 1.45 }}>
                      <strong>#{idx + 1}</strong> — {pedido.carrinho.map((i) => i.nome).join(', ')}
                    </div>

                    <button
                      onClick={() =>
                        onRemoverDoCarrinhoAcumulativo &&
                        onRemoverDoCarrinhoAcumulativo(pedido.id)
                      }
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                      title="Remover do carrinho"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isConcessionariaCompra ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                onClick={() => {
                  if (window.confirm('Deseja adicionar este pedido ao carrinho e continuar comprando?')) {
                    onAdicionarAoCarrinho();
                    onLimparPedidoAtual();
                  }
                }}
                style={primaryButtonStyle('#16a34a', '#10b981')}
              >
                ➕ Adicionar Mais Equipamentos
              </button>

              <div>
                <PDFGenerator
                  pedidoData={{
                    ...pedidoData,
                    carrinho: [...carrinhoAcumulativo.flatMap((p) => p.carrinho), ...carrinho]
                  }}
                  onGenerate={(fileName) => {
                    if (onLimparCarrinhoAcumulativo) {
                      onLimparCarrinhoAcumulativo();
                    }
                    handlePDFGenerated(fileName);
                  }}
                />
                {carrinhoAcumulativo.length > 0 && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginTop: '8px',
                      lineHeight: 1.5
                    }}
                  >
                    O PDF incluirá {carrinhoAcumulativo.length + 1} equipamento(s).
                  </div>
                )}
              </div>
            </div>
          ) : (
            <PDFGenerator pedidoData={pedidoData} onGenerate={handlePDFGenerated} />
          )}
        </div>
      </div>
    </div>
  );
};

function MiniMeasure({ label, value }) {
  return (
    <div
      style={{
        background: '#ffffff',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0'
      }}
    >
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
        MEDIDA {label}
      </div>
      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
        {value} <span style={{ fontSize: '11px', color: '#94a3b8' }}>cm</span>
      </div>
    </div>
  );
}

function MiniStatBox({ tone, label, value }) {
  const map = {
    green: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      label: '#166534',
      value: '#15803d'
    },
    red: {
      bg: '#fef2f2',
      border: '#fecaca',
      label: '#991b1b',
      value: '#b91c1c'
    }
  };

  const t = map[tone];

  return (
    <div
      style={{
        background: t.bg,
        padding: '14px',
        borderRadius: '12px',
        border: `1px solid ${t.border}`
      }}
    >
      <div
        style={{
          color: t.label,
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: t.value,
          fontSize: '22px',
          fontWeight: 900,
          marginTop: '4px'
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FinancialLine({ label, value, strong = false, valueColor = '#0f172a' }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'center'
      }}
    >
      <span
        style={{
          color: strong ? '#0f172a' : '#475569',
          fontWeight: strong ? 800 : 600,
          fontSize: strong ? '15px' : '13px'
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: valueColor,
          fontWeight: strong ? 900 : 700,
          fontSize: strong ? '18px' : '13px',
          textAlign: 'right'
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MiniDarkLine({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        color: 'rgba(255,255,255,0.88)',
        fontSize: '13px'
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.68)' }}>{label}</span>
      <strong style={{ color: '#fff' }}>{value}</strong>
    </div>
  );
}

function primaryButtonStyle(from, to) {
  return {
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color: 'white',
    border: 'none',
    padding: '13px 18px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer'
  };
}

export default ResumoPedido;