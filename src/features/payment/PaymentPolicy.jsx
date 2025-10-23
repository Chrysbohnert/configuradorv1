import React, { useState, useEffect, useMemo } from 'react';
import { getPaymentPlans, getPlanLabel, getPlanByDescription } from '../../services/paymentPlans';
import { calcularPagamento } from '../../lib/payments';
import { formatCurrency } from '../../utils/formatters';
import { db } from '../../config/supabase';
import './PaymentPolicy.css';

/**
 * Componente de Política de Pagamento refatorado
 * @param {Object} props
 * @param {number} props.precoBase - Preço base do carrinho
 * @param {Function} props.onPaymentComputed - Callback quando o cálculo é feito
 * @param {Function} props.onPlanSelected - Callback quando um plano é selecionado
 * @param {Object} props.errors - Erros de validação
 * @param {Object} props.user - Dados do usuário logado
 * @param {boolean} props.clienteTemIE - Se o cliente tem Inscrição Estadual
 * @param {Function} props.onClienteIEChange - Callback para mudar o estado de IE
 * @param {Array} props.carrinho - Itens do carrinho para verificar modelos GSE
 */
const PaymentPolicy = ({
  precoBase = 0,
  onPaymentComputed,
  onPlanSelected,
  errors = {},
  user = null,
  clienteTemIE = true,
  onClienteIEChange,
  carrinho = [],
  debug = false,
  onNext = null
}) => {
  // Evitar logs excessivos em produção
  const [tipoCliente, setTipoCliente] = useState(''); // 'revenda' | 'cliente'
  const [financiamentoBancario, setFinanciamentoBancario] = useState(''); // 'sim' | 'nao'
  const [prazoSelecionado, setPrazoSelecionado] = useState('');
  const [localInstalacao, setLocalInstalacao] = useState('');
  const [pagamentoPorConta, setPagamentoPorConta] = useState(''); // 'cliente paga direto' | 'Incluso no pedido'
  const [valorSinal, setValorSinal] = useState('');
  const [percentualEntrada, setPercentualEntrada] = useState(''); // '30' | '50'
  const [formaEntrada, setFormaEntrada] = useState(''); // Forma de pagamento da entrada
  const [descontoAdicional, setDescontoAdicional] = useState(0); // Desconto adicional do vendedor (0-3%)
  const [tipoFrete, setTipoFrete] = useState(''); // 'cif' | 'fob'
  const [calculoAtual, setCalculoAtual] = useState(null);
  const [erroCalculo, setErroCalculo] = useState('');

  // Estados para o sistema de frete
  const [pontosInstalacao, setPontosInstalacao] = useState([]); // Pontos de instalação filtrados por região
  const [tipoFreteSelecionado, setTipoFreteSelecionado] = useState(''); // 'prioridade' | 'reaproveitamento'
  const [dadosFreteAtual, setDadosFreteAtual] = useState(null); // Dados do frete selecionado
  const [loadingPontos, setLoadingPontos] = useState(false);

  // Carregar pontos de instalação filtrados por região do vendedor
  useEffect(() => {
    const carregarPontos = async () => {
      if (!user?.regiao) {
        console.warn('⚠️ Vendedor sem região definida');
        return;
      }

      try {
        setLoadingPontos(true);
        
        // Importar dinamicamente o helper de mapeamento
        const { mapRegiaoToGrupo } = await import('../../utils/regiaoMapper');
        
        // Para RS, o grupo depende se o cliente tem IE (mas aqui pegamos todos do RS)
        // A lógica de IE só afeta os PREÇOS, não os pontos disponíveis
        const grupoRegiao = mapRegiaoToGrupo(user.regiao, clienteTemIE);
        
        console.log('🌍 Carregando pontos para:', { 
          regiaoVendedor: user.regiao, 
          grupoRegiao,
          clienteTemIE 
        });

        const pontos = await db.getPontosInstalacaoPorRegiao(grupoRegiao);
        setPontosInstalacao(pontos);
        
        console.log('✅ Pontos carregados:', pontos.length);
      } catch (error) {
        console.error('❌ Erro ao carregar pontos de instalação:', error);
        setPontosInstalacao([]);
      } finally {
        setLoadingPontos(false);
      }
    };

    carregarPontos();
  }, [user?.regiao, clienteTemIE]);

  // Atualizar dados do frete quando o local de instalação mudar
  useEffect(() => {
    if (localInstalacao && pontosInstalacao.length > 0) {
      // Extrair oficina, cidade e UF do localInstalacao (formato: "Oficina - Cidade/UF")
      const partes = localInstalacao.split(' - ');
      if (partes.length === 2) {
        const oficina = partes[0];
        const cidadeUF = partes[1].split('/');
        const cidade = cidadeUF[0];
        const uf = cidadeUF[1];

        // Buscar dados de frete específicos (oficina + cidade + UF para evitar ambiguidade)
        const freteEncontrado = pontosInstalacao.find(ponto =>
          ponto.oficina === oficina &&
          ponto.cidade === cidade &&
          ponto.uf === uf
        );

        if (freteEncontrado) {
          console.log('✅ Frete encontrado para:', { oficina, cidade, uf });
          setDadosFreteAtual(freteEncontrado);
          setTipoFreteSelecionado(''); // Resetar seleção para forçar escolha
        } else {
          console.warn('⚠️ Frete não encontrado para:', { oficina, cidade, uf });
          setDadosFreteAtual(null);
          setTipoFreteSelecionado('');
        }
      }
    } else {
      setDadosFreteAtual(null);
      setTipoFreteSelecionado('');
    }
  }, [localInstalacao, pontosInstalacao]);

  // Os pontos disponíveis já vêm filtrados do banco por região do vendedor
  // Formatar para exibição no select
  const oficinasDisponiveis = pontosInstalacao.map(ponto => ({
    nome: ponto.oficina,
    cidade: ponto.cidade,
    uf: ponto.uf,
    valor_prioridade: ponto.valor_prioridade,
    valor_reaproveitamento: ponto.valor_reaproveitamento
  }));
  
  // Estados para Participação de Revenda (apenas para Cliente)
  const [participacaoRevenda, setParticipacaoRevenda] = useState(''); // 'sim' | 'nao'
  const [revendaTemIE, setRevendaTemIE] = useState(''); // 'sim' | 'nao' (se participacaoRevenda === 'sim')
  const [descontoRevendaIE, setDescontoRevendaIE] = useState(0); // Desconto do vendedor: 1-5% (se cliente COM participação de revenda - Produtor rural)

  // ← NOVO: Log quando estados internos mudam
  useEffect(() => {
    if (debug) {
      console.log('📊 [PaymentPolicy] Estados internos atualizados:', {
        tipoCliente,
        prazoSelecionado,
        participacaoRevenda,
        revendaTemIE,
        descontoRevendaIE
      });
    }
  }, [tipoCliente, prazoSelecionado, participacaoRevenda, revendaTemIE, descontoRevendaIE, debug]);

  // Verificar se há guindastes GSE no carrinho
  const temGuindasteGSE = useMemo(() => {
    return carrinho.some(item => {
      // Verificar se o modelo, subgrupo ou nome contém "GSE"
      const modelo = (item.modelo || '').toUpperCase();
      const subgrupo = (item.subgrupo || '').toUpperCase();
      const nome = (item.nome || '').toUpperCase();
      
      return modelo.includes('GSE') || subgrupo.includes('GSE') || nome.includes('GSE');
    });
  }, [carrinho]);

  // Verificar se há guindastes GSI no carrinho e contar quantos
  const { temGuindasteGSI, quantidadeGSI } = useMemo(() => {
    let quantidade = 0;
    
    carrinho.forEach(item => {
      // Verificar se o modelo, subgrupo ou nome contém "GSI"
      const modelo = (item.modelo || '').toUpperCase();
      const subgrupo = (item.subgrupo || '').toUpperCase();
      const nome = (item.nome || '').toUpperCase();
      
      const temGSI = modelo.includes('GSI') || subgrupo.includes('GSI') || nome.includes('GSI');
      
      if (temGSI) {
        quantidade++;
      }
    });
    
    return {
      temGuindasteGSI: quantidade > 0,
      quantidadeGSI: quantidade
    };
  }, [carrinho]);

  // Calcular valor de instalação baseado no modelo e tipo de pagamento
  const calcularValorInstalacao = useMemo(() => {
    if (tipoCliente !== 'cliente' || !localInstalacao || !pagamentoPorConta) {
      return { valor: 0, valorInformativo: 0, soma: false };
    }

    const clientePagaDireto = pagamentoPorConta === 'cliente paga direto';
    const inclusoNoPedido = pagamentoPorConta === 'Incluso no pedido';

    // GSI
    if (temGuindasteGSI) {
      if (clientePagaDireto) {
        return { valor: 0, valorInformativo: 5500, soma: false }; // Apenas informativo
      }
      if (inclusoNoPedido) {
        return { valor: 6350, valorInformativo: 6350, soma: true }; // Soma na proposta
      }
    }

    // GSE
    if (temGuindasteGSE) {
      if (clientePagaDireto) {
        return { valor: 0, valorInformativo: 6500, soma: false }; // Apenas informativo
      }
      if (inclusoNoPedido) {
        return { valor: 7500, valorInformativo: 7500, soma: true }; // Soma na proposta
      }
    }

    return { valor: 0, valorInformativo: 0, soma: false };
  }, [tipoCliente, localInstalacao, pagamentoPorConta, temGuindasteGSI, temGuindasteGSE]);

  // Determinar o limite máximo de desconto para revenda
  // Se tem GSE: máximo 3%
  // Se tem GSI:
  //   - 1 unidade: até 12% (ou 12% para cliente sem participação + produtor rural)
  //   - 2 unidades: até 14%
  //   - 3+ unidades: até 15%
  // Se não tem GSE/GSI: máximo 12%
  const maxDescontoRevenda = useMemo(() => {
    if (temGuindasteGSE) return 3;
    if (temGuindasteGSI) {
      if (quantidadeGSI >= 3) return 15;
      if (quantidadeGSI === 2) return 14;
      return 12; // 1 unidade
    }
    return 12;
  }, [temGuindasteGSE, temGuindasteGSI, quantidadeGSI]);

  // Nova regra: GSI + Cliente sem participação de revenda + Produtor rural = desconto até 12%
  const aplicarRegraGSISemParticipacao = useMemo(() => {
    return temGuindasteGSI &&
           tipoCliente === 'cliente' &&
           participacaoRevenda === 'nao' &&
           revendaTemIE === 'sim';
  }, [temGuindasteGSI, tipoCliente, participacaoRevenda, revendaTemIE]);

  // Lista de planos disponíveis baseado no tipo de cliente e percentual de entrada
  const planosDisponiveis = useMemo(() => {
    if (!tipoCliente) return [];
    
    const todosPlanos = getPaymentPlans(tipoCliente);
    
    // Se for cliente e tiver selecionado percentual de entrada
    if (tipoCliente === 'cliente' && percentualEntrada) {
      const percentualNum = parseFloat(percentualEntrada) / 100; // Converter 30 para 0.30
      
      // Filtrar planos que exigem esse percentual específico
      return todosPlanos.filter(plan => 
        plan.entry_percent_required === percentualNum
      );
    }
    
    // Para revenda ou cliente sem percentual, mostrar planos que não exigem percentual específico
    return todosPlanos.filter(plan => !plan.entry_percent_required);
  }, [tipoCliente, percentualEntrada]);

  // Resetar desconto adicional se exceder o limite (por exemplo, se GSE for adicionado ao carrinho)
  // MAS permitir 14% e 15% manualmente para GSI (pois o sistema ainda não permite múltiplos itens)
  // E permitir até 12% para GSI + Cliente sem participação + Produtor rural
  useEffect(() => {
    const limiteCliente = aplicarRegraGSISemParticipacao ? 12 : 3; // Cliente sem participação: 3% normal, 12% com GSI + produtor rural

    if (tipoCliente === 'revenda' && descontoAdicional > maxDescontoRevenda) {
      // Se for GSI, permitir até 15% (seleção manual do vendedor)
      const limiteReal = temGuindasteGSI ? 15 : maxDescontoRevenda;
      if (descontoAdicional > limiteReal) {
        setDescontoAdicional(0);
      }
    } else if (tipoCliente === 'cliente' && participacaoRevenda === 'nao' && descontoAdicional > limiteCliente) {
      setDescontoAdicional(0);
    }
  }, [tipoCliente, maxDescontoRevenda, descontoAdicional, temGuindasteGSI, aplicarRegraGSISemParticipacao, participacaoRevenda]);

  // Forçar "Produtor rural" quando for Cliente + Participação de Revenda + GSI
  useEffect(() => {
    if (tipoCliente === 'cliente' && participacaoRevenda === 'sim' && temGuindasteGSI && revendaTemIE !== 'sim') {
      setRevendaTemIE('sim');
      if (onClienteIEChange) {
        onClienteIEChange(true);
      }
      setDescontoRevendaIE(1); // Default: 1%
    }
  }, [tipoCliente, participacaoRevenda, temGuindasteGSI, revendaTemIE, onClienteIEChange]);

  // Zerar desconto do vendedor quando houver GSE (Cliente + Participação de Revenda + Produtor rural)
  useEffect(() => {
    if (tipoCliente === 'cliente' && participacaoRevenda === 'sim' && revendaTemIE === 'sim' && temGuindasteGSE && descontoRevendaIE > 0) {
      setDescontoRevendaIE(0);
    }
  }, [tipoCliente, participacaoRevenda, revendaTemIE, temGuindasteGSE, descontoRevendaIE]);

  // Efeito para recalcular quando mudar o tipo, prazo ou preço base
  useEffect(() => {

    // Se for À Vista, zerar o valor do sinal
    if (prazoSelecionado === 'À Vista' && valorSinal) {
      setValorSinal('');
    }

    // Validações antes de fazer o cálculo
    if (!tipoCliente || !prazoSelecionado || !precoBase) {
      // silencioso
      setCalculoAtual(null);
      setErroCalculo('');
      return;
    }

    // Validação: somente para CIF, se há dados de frete disponíveis, o tipo deve ser selecionado
    if (tipoFrete === 'cif' && dadosFreteAtual && !tipoFreteSelecionado) {
      setCalculoAtual(null);
      setErroCalculo(`🚛 Selecione o tipo de entrega para ${dadosFreteAtual.cidade} (Prioridade ou Reaproveitamento)`);
      return;
    }

    try {
      // Buscar o plano correto considerando o percentual de entrada para clientes
      let plan;
      if (tipoCliente === 'cliente' && percentualEntrada) {
        // Para cliente, buscar o plano que corresponde ao percentual de entrada selecionado
        const percentualNum = parseFloat(percentualEntrada) / 100;
        const todosPlanos = getPaymentPlans(tipoCliente);
        plan = todosPlanos.find(p => 
          p.description === prazoSelecionado && 
          p.entry_percent_required === percentualNum
        );
      } else {
        // Para revenda ou cliente sem percentual, buscar normalmente
        plan = getPlanByDescription(prazoSelecionado, tipoCliente);
      }
      
      if (!plan) {
        setErroCalculo('Plano não encontrado');
        setCalculoAtual(null);
        return;
      }

      const resultado = calcularPagamento({
        precoBase,
        plan,
        dataEmissaoNF: new Date()
      });

      // Determinar qual desconto o VENDEDOR pode aplicar:
      // - Cliente COM participação de revenda - Produtor rural → vendedor pode dar 1-5% (MAS NÃO se houver GSE)
      // - Cliente COM participação de revenda - Rodoviário → vendedor NÃO pode dar desconto
      // - Cliente SEM participação de revenda → vendedor pode dar 0-3% (OU até 12% se houver GSI e for produtor rural)
      // - Revenda → vendedor pode dar 0-12% (ou até 15% para GSI com múltiplas unidades)
      let descontoFinal = 0;
      if (tipoCliente === 'cliente' && participacaoRevenda === 'sim') {
        if (revendaTemIE === 'sim' && !temGuindasteGSE) {
          descontoFinal = descontoRevendaIE; // Vendedor aplica: 1-5% (apenas se NÃO houver GSE)
        }
        // Se for Rodoviário OU se houver GSE, vendedor não pode dar desconto (descontoFinal permanece 0)
      } else {
        descontoFinal = descontoAdicional; // Vendedor aplica: 0-3% (cliente) ou 0-15% (revenda com GSI)
      }

      // Aplicar desconto adicional do vendedor (sobre o PREÇO BASE, não sobre o valor ajustado)
      const descontoAdicionalValor = precoBase * (descontoFinal / 100);
      const valorFinalComDescontoAdicional = resultado.valorAjustado - descontoAdicionalValor;

      // Adicionar valor do frete selecionado APENAS quando tipo de frete for CIF
      const valorFrete = (tipoFrete === 'cif' && dadosFreteAtual && tipoFreteSelecionado) ?
        (tipoFreteSelecionado === 'prioridade' ?
          parseFloat(dadosFreteAtual.valor_prioridade || 0) :
          parseFloat(dadosFreteAtual.valor_reaproveitamento || 0)) : 0;

      // Adicionar valor de instalação (apenas se soma = true)
      const valorInstalacao = calcularValorInstalacao.soma ? calcularValorInstalacao.valor : 0;

      const valorFinalComFreteEInstalacao = valorFinalComDescontoAdicional + valorFrete + valorInstalacao;

      // Para Cliente: calcular entrada baseada no percentual (30% ou 50%)
      // Para Revenda: usar a entrada do plano
      const valorSinalNum = parseFloat(valorSinal) || 0;
      const percentualEntradaNum = parseFloat(percentualEntrada) || 0;
      const entradaParaCalculo = tipoCliente === 'cliente' && percentualEntradaNum > 0
        ? (valorFinalComFreteEInstalacao * percentualEntradaNum / 100)
        : resultado.entrada;

      // Recalcular parcelas com o valor final (com desconto adicional, frete e instalação) e entrada correta
      const saldoComDesconto = valorFinalComFreteEInstalacao - entradaParaCalculo;
      const numParcelas = resultado.parcelas.length;
      const valorParcela = saldoComDesconto / numParcelas;
      
      const parcelasAtualizadas = [];
      let somaAcumulada = 0;
      
      for (let i = 0; i < numParcelas; i++) {
        const isUltima = i === numParcelas - 1;
        const valor = isUltima 
          ? Math.round((saldoComDesconto - somaAcumulada) * 100) / 100
          : Math.round(valorParcela * 100) / 100;
        
        somaAcumulada += valor;
        
        parcelasAtualizadas.push({
          numero: i + 1,
          valor
        });
      }

      setCalculoAtual({
        ...resultado,
        descontoAdicionalValor,
        valorFinalComDescontoAdicional,
        valorFrete,
        valorInstalacao,
        valorInformativoInstalacao: calcularValorInstalacao.valorInformativo,
        somaInstalacao: calcularValorInstalacao.soma,
        valorFinalComFrete: valorFinalComFreteEInstalacao,
        parcelas: parcelasAtualizadas,
        saldo: saldoComDesconto,
        tipoFreteSelecionado,
        dadosFreteAtual
      });
      setErroCalculo('');

      // Notificar o componente pai
      if (onPaymentComputed) {
        // Calcular valores de entrada e saldo (apenas para cliente)
        // O sinal FAZ PARTE da entrada total
        const entradaTotal = entradaParaCalculo;
        const faltaEntrada = entradaTotal - valorSinalNum; // Quanto falta para completar a entrada
        const saldo = saldoComDesconto; // Saldo após pagar a entrada completa (já inclui frete e instalação)
        const valorFinal = valorFinalComFreteEInstalacao;
        const valorFrete = (tipoFrete === 'cif' && dadosFreteAtual && tipoFreteSelecionado) ?
          (tipoFreteSelecionado === 'prioridade' ?
            parseFloat(dadosFreteAtual.valor_prioridade || 0) :
            parseFloat(dadosFreteAtual.valor_reaproveitamento || 0)) : 0;
        
        onPaymentComputed({
          ...resultado,
          plan,
          tipoCliente,
          financiamentoBancario: financiamentoBancario, // 'sim' | 'nao' | ''
          localInstalacao,
          pagamentoPorConta,
          valorSinal: valorSinalNum,
          percentualEntrada: percentualEntradaNum,
          entradaTotal: entradaTotal,
          faltaEntrada: Math.max(0, faltaEntrada),
          saldoAPagar: saldo,
          formaEntrada: formaEntrada, // Forma de pagamento da entrada
          descontoAdicional: descontoFinal, // Percentual do desconto aplicado (pode ser descontoAdicional ou descontoRevendaIE)
          descontoAdicionalValor: descontoAdicionalValor, // Valor do desconto adicional
          parcelas: parcelasAtualizadas, // Parcelas recalculadas com desconto adicional
          saldo: saldoComDesconto, // Saldo atualizado
          tipoFrete: tipoFrete, // Tipo de frete (CIF ou FOB)
          // Informações sobre participação de revenda
          participacaoRevenda: participacaoRevenda, // 'sim' | 'nao'
          revendaTemIE: revendaTemIE, // 'sim' | 'nao'
          descontoRevendaIE: descontoRevendaIE, // 1-5%
          // Informações sobre frete
          tipoFreteSelecionado: tipoFreteSelecionado, // 'prioridade' | 'reaproveitamento'
          dadosFreteAtual: dadosFreteAtual, // Dados completos do frete selecionado
          valorFrete: valorFrete, // Valor do frete aplicado
          // Informações sobre instalação
          valorInstalacao: valorInstalacao, // Valor da instalação (0 se não soma)
          valorInformativoInstalacao: calcularValorInstalacao.valorInformativo, // Valor informativo (sempre exibe)
          somaInstalacao: calcularValorInstalacao.soma, // Se soma ou não na proposta
          valorFinalComFrete: valorFinal, // Valor final com desconto, frete e instalação
          // Manter compatibilidade com estrutura antiga
          tipoPagamento: tipoCliente,
          prazoPagamento: prazoSelecionado,
          desconto: plan.discount_percent ? (plan.discount_percent * 100) : 0,
          acrescimo: plan.surcharge_percent ? (plan.surcharge_percent * 100) : 0,
          valorFinal: valorFinal, // Valor final com desconto adicional e frete aplicado
          tipoInstalacao: pagamentoPorConta
        });
      }

      if (onPlanSelected) {
        onPlanSelected(plan);
      }

    } catch (error) {
      setErroCalculo(error.message);
      setCalculoAtual(null);
      
      if (onPaymentComputed) {
        onPaymentComputed(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCliente, prazoSelecionado, precoBase, localInstalacao, pagamentoPorConta, valorSinal, formaEntrada, descontoAdicional, percentualEntrada, tipoFrete, participacaoRevenda, revendaTemIE, descontoRevendaIE, temGuindasteGSE, aplicarRegraGSISemParticipacao, tipoFreteSelecionado, dadosFreteAtual]);

  // Resetar prazo quando mudar tipo de cliente
  const handleTipoClienteChange = (novoTipo) => {
    setTipoCliente(novoTipo);
    setPrazoSelecionado(''); // Limpar seleção de prazo
    setCalculoAtual(null);
    setErroCalculo('');
    // Resetar estados de participação de revenda
    setParticipacaoRevenda('');
    setRevendaTemIE('');
    setDescontoRevendaIE(0);
  };

  // Resetar prazo quando mudar percentual de entrada
  const handlePercentualEntradaChange = (novoPercentual) => {
    setPercentualEntrada(novoPercentual);
    setPrazoSelecionado(''); // Limpar seleção de prazo
    setCalculoAtual(null);
    setErroCalculo('');
  };

  return (
    <div className="payment-policy">
      {/* Seleção de Tipo de Cliente e Prazo */}
      <div className="payment-section">
        <h3>Política de Pagamento</h3>
        
        <div className="form-group">
          <label htmlFor="tipoCliente">
            Tipo de Cliente e Pagamento *
          </label>
          <select
            id="tipoCliente"
            value={tipoCliente}
            onChange={(e) => handleTipoClienteChange(e.target.value)}
            className={errors.tipoPagamento ? 'error' : ''}
          >
            <option value="">Selecione o tipo de cliente</option>
            <option value="revenda">Revenda</option>
            <option value="cliente">Cliente</option>
          </select>
          {errors.tipoPagamento && (
            <span className="error-message">{errors.tipoPagamento}</span>
          )}
        </div>

        {/* Opção de Financiamento Bancário - LOGO APÓS TIPO DE CLIENTE */}
        {tipoCliente === 'cliente' && (
          <>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label htmlFor="financiamentoBancario" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
                Financiamento Bancário? <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label 
                  onClick={() => {
                    setFinanciamentoBancario('sim');
                    setValorSinal('');
                    setPercentualEntrada('');
                    setPrazoSelecionado('');
                    setParticipacaoRevenda('');
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    cursor: 'pointer', 
                    padding: '8px 16px', 
                    background: financiamentoBancario === 'sim' ? '#0066cc' : '#ffffff', 
                    color: financiamentoBancario === 'sim' ? '#ffffff' : '#495057', 
                    borderRadius: '6px', 
                    border: financiamentoBancario === 'sim' ? '2px solid #0066cc' : '2px solid #ced4da', 
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    fontWeight: financiamentoBancario === 'sim' ? '600' : '500',
                    flex: '1',
                    boxShadow: financiamentoBancario === 'sim' ? '0 2px 8px rgba(0, 102, 204, 0.3)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <input 
                    type="radio" 
                    name="financiamentoBancario" 
                    checked={financiamentoBancario === 'sim'} 
                    onChange={() => {}}
                    style={{ 
                      cursor: 'pointer',
                      accentColor: '#0066cc',
                      width: '14px',
                      height: '14px'
                    }}
                  />
                  <span>Sim</span>
                </label>
                <label 
                  onClick={() => {
                    setFinanciamentoBancario('nao');
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    cursor: 'pointer', 
                    padding: '8px 16px', 
                    background: financiamentoBancario === 'nao' ? '#dc3545' : '#ffffff', 
                    color: financiamentoBancario === 'nao' ? '#ffffff' : '#495057', 
                    borderRadius: '6px', 
                    border: financiamentoBancario === 'nao' ? '2px solid #dc3545' : '2px solid #ced4da', 
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    fontWeight: financiamentoBancario === 'nao' ? '600' : '500',
                    flex: '1',
                    boxShadow: financiamentoBancario === 'nao' ? '0 2px 8px rgba(220, 53, 69, 0.3)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <input 
                    type="radio" 
                    name="financiamentoBancario" 
                    checked={financiamentoBancario === 'nao'} 
                    onChange={() => {}}
                    style={{ 
                      cursor: 'pointer',
                      accentColor: '#dc3545',
                      width: '14px',
                      height: '14px'
                    }}
                  />
                  <span>Não</span>
                </label>
              </div>
              {financiamentoBancario === 'sim' && (
                <small style={{ display: 'block', marginTop: '8px', color: '#0066cc', fontSize: '12px', fontWeight: '500' }}>
                  🏦 Condições definidas pelo banco financiador
                </small>
              )}
            </div>

            {/* Participação de Revenda - SÓ aparece se financiamento = NÃO */}
            {financiamentoBancario === 'nao' && (
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="participacaoRevenda" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
                  Há Participação de Revenda? <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <label 
                    onClick={() => {
                      setParticipacaoRevenda('sim');
                      setRevendaTemIE('');
                      setDescontoRevendaIE(0);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '6px', 
                      cursor: 'pointer', 
                      padding: '8px 16px', 
                      background: participacaoRevenda === 'sim' ? '#28a745' : '#ffffff', 
                      color: participacaoRevenda === 'sim' ? '#ffffff' : '#495057', 
                      borderRadius: '6px', 
                      border: participacaoRevenda === 'sim' ? '2px solid #28a745' : '2px solid #ced4da', 
                      transition: 'all 0.2s ease',
                      fontSize: '13px',
                      fontWeight: participacaoRevenda === 'sim' ? '600' : '500',
                      flex: '1',
                      boxShadow: participacaoRevenda === 'sim' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="participacaoRevenda" 
                      checked={participacaoRevenda === 'sim'} 
                      onChange={() => {}}
                      style={{ 
                        cursor: 'pointer',
                        accentColor: '#28a745',
                        width: '14px',
                        height: '14px'
                      }}
                    />
                    <span>Sim</span>
                  </label>
                  <label 
                    onClick={() => {
                      setParticipacaoRevenda('nao');
                      setRevendaTemIE('');
                      setDescontoRevendaIE(0);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '6px', 
                      cursor: 'pointer', 
                      padding: '8px 16px', 
                      background: participacaoRevenda === 'nao' ? '#dc3545' : '#ffffff', 
                      color: participacaoRevenda === 'nao' ? '#ffffff' : '#495057', 
                      borderRadius: '6px', 
                      border: participacaoRevenda === 'nao' ? '2px solid #dc3545' : '2px solid #ced4da', 
                      transition: 'all 0.2s ease',
                      fontSize: '13px',
                      fontWeight: participacaoRevenda === 'nao' ? '600' : '500',
                      flex: '1',
                      boxShadow: participacaoRevenda === 'nao' ? '0 2px 8px rgba(220, 53, 69, 0.3)' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="participacaoRevenda" 
                      checked={participacaoRevenda === 'nao'} 
                      onChange={() => {}}
                      style={{ 
                        cursor: 'pointer',
                        accentColor: '#dc3545',
                        width: '14px',
                        height: '14px'
                      }}
                    />
                    <span>Não</span>
                  </label>
                </div>
              </div>
            )}

            {/* Campo de IE - Aparece SEMPRE após selecionar participação de revenda */}
            {financiamentoBancario === 'nao' && participacaoRevenda && (
              <div className="form-group" style={{ marginTop: '15px', padding: '15px', background: '#fff3cd', borderRadius: '6px', border: '2px solid #ffc107' }}>
                <label htmlFor="clienteRevendaIE" style={{ fontWeight: '600', fontSize: '15px', marginBottom: '8px', display: 'block', color: '#495057' }}>
                  {participacaoRevenda === 'sim' ? 'Tipo de Revenda:' : 'O cliente possui Inscrição Estadual?'} <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <small style={{ display: 'block', marginBottom: '10px', color: '#856404', fontSize: '0.875em', fontWeight: '600' }}>
                  ⚠️ IMPORTANTE: Este campo afeta o PREÇO BASE do equipamento
                </small>
                {user?.regiao === 'rio grande do sul' && (
                  <small style={{ display: 'block', marginBottom: '10px', color: '#0056b3', fontSize: '0.875em', fontWeight: '600', background: '#cfe2ff', padding: '8px', borderRadius: '4px', border: '1px solid #0056b3' }}>
                    ℹ️ Vendedores do RS: Selecione "Produtor rural" para preços RS com IE ou "Rodoviário" para preços RS sem IE
                  </small>
                )}
                {/* Mensagem especial para GSI */}
                {participacaoRevenda === 'sim' && temGuindasteGSI && (
                  <small style={{ display: 'block', marginBottom: '10px', color: '#28a745', fontSize: '0.875em', fontWeight: '600', background: '#d4edda', padding: '8px', borderRadius: '4px', border: '1px solid #28a745' }}>
                    ✓ Guindastes GSI detectados - Apenas "Produtor rural" disponível
                  </small>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <label 
                    onClick={() => {
                      setRevendaTemIE('sim');
                      // Atualizar estado do componente pai (para recalcular preços no carrinho)
                      if (onClienteIEChange) {
                        onClienteIEChange(true);
                      }
                      // Se houver participação de revenda - Produtor rural, o vendedor pode aplicar desconto de 1-5%
                      if (participacaoRevenda === 'sim') {
                        setDescontoRevendaIE(1); // Default: 1%
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '6px', 
                      cursor: 'pointer', 
                      padding: '8px 16px', 
                      background: revendaTemIE === 'sim' ? '#28a745' : '#ffffff', 
                      color: revendaTemIE === 'sim' ? '#ffffff' : '#495057', 
                      borderRadius: '6px', 
                      border: revendaTemIE === 'sim' ? '2px solid #28a745' : '2px solid #ced4da', 
                      transition: 'all 0.2s ease',
                      fontSize: '13px',
                      fontWeight: revendaTemIE === 'sim' ? '600' : '500',
                      flex: participacaoRevenda === 'sim' && temGuindasteGSI ? '1 1 100%' : '1',
                      boxShadow: revendaTemIE === 'sim' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="revendaTemIE" 
                      checked={revendaTemIE === 'sim'} 
                      onChange={() => {}}
                      style={{ 
                        cursor: 'pointer',
                        accentColor: '#28a745',
                        width: '14px',
                        height: '14px'
                      }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontWeight: '600' }}>🚜 Produtor rural</span>
                      {user?.regiao === 'rio grande do sul' && (
                        <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 'normal' }}>Com Inscrição Estadual</span>
                      )}
                    </span>
                  </label>
                  {/* Esconder "Rodoviário" quando for Cliente + Participação de Revenda + GSI */}
                  {!(participacaoRevenda === 'sim' && temGuindasteGSI) && (
                    <label 
                      onClick={() => {
                        setRevendaTemIE('nao');
                        // Atualizar estado do componente pai (para recalcular preços no carrinho)
                        if (onClienteIEChange) {
                          onClienteIEChange(false);
                        }
                        // Rodoviário = vendedor NÃO pode aplicar desconto (se houver participação de revenda)
                        setDescontoRevendaIE(0);
                      }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '6px', 
                      cursor: 'pointer', 
                      padding: '8px 16px', 
                      background: revendaTemIE === 'nao' ? '#dc3545' : '#ffffff', 
                      color: revendaTemIE === 'nao' ? '#ffffff' : '#495057', 
                      borderRadius: '6px', 
                      border: revendaTemIE === 'nao' ? '2px solid #dc3545' : '2px solid #ced4da', 
                      transition: 'all 0.2s ease',
                      fontSize: '13px',
                      fontWeight: revendaTemIE === 'nao' ? '600' : '500',
                      flex: '1',
                      boxShadow: revendaTemIE === 'nao' ? '0 2px 8px rgba(220, 53, 69, 0.3)' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="revendaTemIE" 
                      checked={revendaTemIE === 'nao'} 
                      onChange={() => {}}
                      style={{ 
                        cursor: 'pointer',
                        accentColor: '#dc3545',
                        width: '14px',
                        height: '14px'
                      }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontWeight: '600' }}>🚛 Rodoviário</span>
                      {user?.regiao === 'rio grande do sul' && (
                        <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 'normal' }}>Sem Inscrição Estadual</span>
                      )}
                    </span>
                  </label>
                  )}
                </div>

                {/* Se houver participação de revenda E revenda tem IE, o vendedor pode aplicar desconto de 1% a 5% */}
                {/* MAS NÃO aparece se houver GSE no carrinho */}
                {participacaoRevenda === 'sim' && revendaTemIE === 'sim' && !temGuindasteGSE && (
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label htmlFor="descontoRevendaIE" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
                      Desconto do Vendedor (1% a 5%) <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <select
                      id="descontoRevendaIE"
                      value={descontoRevendaIE}
                      onChange={(e) => setDescontoRevendaIE(parseFloat(e.target.value))}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        fontSize: '14px', 
                        borderRadius: '6px', 
                        border: '2px solid #ced4da',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="1">1%</option>
                      <option value="2">2%</option>
                      <option value="3">3%</option>
                      <option value="4">4%</option>
                      <option value="5">5%</option>
                    </select>
                    <small style={{ display: 'block', marginTop: '5px', color: '#28a745', fontSize: '0.875em' }}>
                      Desconto que você (vendedor) pode aplicar sobre o valor total do pedido
                    </small>
                  </div>
                )}

                {/* Mensagem informativa quando GSE bloqueia o desconto */}
                {participacaoRevenda === 'sim' && revendaTemIE === 'sim' && temGuindasteGSE && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                    <small style={{ color: '#856404', fontSize: '0.875em', fontWeight: '600' }}>
                      ⚠️ Guindastes GSE não permitem desconto adicional do vendedor
                    </small>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
      {/* Resumo do Carrinho - só aparece depois de selecionar Revenda ou Cliente */}
      {tipoCliente && (
        <div style={{ marginTop: '20px' }}>
          <h3>Resumo do Pedido</h3>
          <div className="summary-box">
            <div className="summary-row">
              <span className="summary-label">Valor Total do Carrinho:</span>
              <span className="summary-value">{formatCurrency(precoBase)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Informações Adicionais */}
      <div className="payment-section">
        <h3>Informações Adicionais</h3>
        {/* Pagamento da Instalação por conta de: */}
        {tipoCliente === 'cliente' && (
          <div className="form-group">
            <label>Instalação: *</label>
            <div className="radio-group">
              <label className={`radio-option ${pagamentoPorConta === 'cliente paga direto' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="pagamentoPorConta"
                  value="cliente paga direto"
                  checked={pagamentoPorConta === 'cliente paga direto'}
                  onChange={(e) => setPagamentoPorConta(e.target.value)}
                />
                <span>Cliente paga direto</span>
              </label>
              <label className={`radio-option ${pagamentoPorConta === 'Incluso no pedido' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="pagamentoPorConta"
                  value="Incluso no pedido"
                  checked={pagamentoPorConta === 'Incluso no pedido'}
                  onChange={(e) => setPagamentoPorConta(e.target.value)}
                />
                <span>Incluso no pedido</span>
              </label>
            </div>
            {errors.tipoInstalacao && (
              <span className="error-message">{errors.tipoInstalacao}</span>
            )}
            
            {/* Exibir valor de instalação com destaque */}
            {pagamentoPorConta && localInstalacao && calcularValorInstalacao.valorInformativo > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px 16px', 
                background: calcularValorInstalacao.soma ? '#d4edda' : '#fff3cd',
                borderLeft: `4px solid ${calcularValorInstalacao.soma ? '#28a745' : '#ffc107'}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>
                    {calcularValorInstalacao.soma ? '✅' : 'ℹ️'}
                  </span>
                  <strong style={{ color: calcularValorInstalacao.soma ? '#155724' : '#856404' }}>
                    Valor da Instalação: {formatCurrency(calcularValorInstalacao.valorInformativo)}
                  </strong>
                </div>
                <small style={{ 
                  display: 'block', 
                  color: calcularValorInstalacao.soma ? '#155724' : '#856404',
                  fontWeight: '500',
                  marginLeft: '26px'
                }}>
                  {calcularValorInstalacao.soma 
                    ? '✓ Este valor está INCLUSO no total da proposta' 
                    : '⚠ Este valor é apenas informativo - Cliente pagará direto à oficina'}
                </small>
                <small style={{ 
                  display: 'block', 
                  color: calcularValorInstalacao.soma ? '#155724' : '#856404',
                  fontStyle: 'italic',
                  marginLeft: '26px',
                  marginTop: '4px'
                }}>
                  {temGuindasteGSI ? '📦 Guindaste GSI' : '📦 Guindaste GSE'}
                </small>
              </div>
            )}
          </div>
        )}

        {/* Tipo de Frete */}
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label htmlFor="tipoFrete" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
            Tipo de Frete <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <label
              onClick={() => setTipoFrete('cif')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '10px 20px',
                background: tipoFrete === 'cif' ? '#28a745' : '#ffffff',
                color: tipoFrete === 'cif' ? '#ffffff' : '#495057',
                borderRadius: '6px',
                border: tipoFrete === 'cif' ? '2px solid #28a745' : '2px solid #ced4da',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: tipoFrete === 'cif' ? '600' : '500',
                flex: '1',
                boxShadow: tipoFrete === 'cif' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
                userSelect: 'none'
              }}
            >
              <input
                type="radio"
                name="tipoFrete"
                checked={tipoFrete === 'cif'}
                onChange={() => {}}
                style={{
                  cursor: 'pointer',
                  accentColor: '#28a745',
                  width: '16px',
                  height: '16px'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontWeight: '600' }}>CIF</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>Fábrica paga</span>
              </div>
            </label>
            <label
              onClick={() => setTipoFrete('fob')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '10px 20px',
                background: tipoFrete === 'fob' ? '#dc3545' : '#ffffff',
                color: tipoFrete === 'fob' ? '#ffffff' : '#495057',
                borderRadius: '6px',
                border: tipoFrete === 'fob' ? '2px solid #dc3545' : '2px solid #ced4da',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: tipoFrete === 'fob' ? '600' : '500',
                flex: '1',
                boxShadow: tipoFrete === 'fob' ? '0 2px 8px rgba(220, 53, 69, 0.3)' : 'none',
                userSelect: 'none'
              }}
            >
              <input
                type="radio"
                name="tipoFrete"
                checked={tipoFrete === 'fob'}
                onChange={() => {}}
                style={{
                  cursor: 'pointer',
                  accentColor: '#dc3545',
                  width: '16px',
                  height: '16px'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontWeight: '600' }}>FOB</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>Cliente paga</span>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Local de Instalação - aparece após selecionar o tipo de frete */}
      {tipoCliente === 'cliente' && tipoFrete && (
        <>
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="localInstalacao">
              Local de Instalação *
            </label>
            <select
              id="localInstalacao"
              value={localInstalacao}
              onChange={(e) => setLocalInstalacao(e.target.value)}
              className={errors.localInstalacao ? 'error' : ''}
              disabled={loadingPontos}
            >
              <option value="">
                {loadingPontos 
                  ? 'Carregando oficinas...'
                  : oficinasDisponiveis.length === 0
                    ? 'Nenhuma oficina disponível para sua região'
                    : 'Selecione o local de instalação'
                }
              </option>
              {oficinasDisponiveis.map((oficina, index) => (
                <option key={index} value={`${oficina.nome} - ${oficina.cidade}/${oficina.uf}`}>
                  {oficina.nome} - {oficina.cidade}/{oficina.uf}
                </option>
              ))}
            </select>
            {loadingPontos && (
              <small style={{ display: 'block', marginTop: '5px', color: '#6c757d', fontSize: '0.875em' }}>
                🔄 Carregando pontos de instalação da sua região...
              </small>
            )}
            {!loadingPontos && oficinasDisponiveis.length > 0 && (
              <small style={{ display: 'block', marginTop: '5px', color: '#28a745', fontSize: '0.875em' }}>
                ✓ {oficinasDisponiveis.length} {oficinasDisponiveis.length === 1 ? 'oficina disponível' : 'oficinas disponíveis'}
              </small>
            )}
            {errors.localInstalacao && (
              <span className="error-message">{errors.localInstalacao}</span>
            )}
          </div>
          {/* Tipo de Entrega visível apenas quando CIF e dados disponíveis */}
          {tipoFrete === 'cif' && dadosFreteAtual && (
            <div className="form-group" style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '2px solid #007bff' }}>
              <label style={{ fontWeight: '600', fontSize: '14px', marginBottom: '10px', display: 'block', color: '#007bff' }}>
                🚛 Tipo de Entrega - {dadosFreteAtual.cidade} <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <small style={{ display: 'block', marginBottom: '12px', color: '#6c757d', fontSize: '0.875em' }}>
                Selecione o tipo de entrega para incluir no cálculo
              </small>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <label
                  onClick={() => setTipoFreteSelecionado('prioridade')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background: tipoFreteSelecionado === 'prioridade' ? '#ffc107' : '#ffffff',
                    color: tipoFreteSelecionado === 'prioridade' ? '#212529' : '#495057',
                    borderRadius: '6px',
                    border: tipoFreteSelecionado === 'prioridade' ? '2px solid #ffc107' : '2px solid #ced4da',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: tipoFreteSelecionado === 'prioridade' ? '600' : '500',
                    flex: '1',
                    boxShadow: tipoFreteSelecionado === 'prioridade' ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="radio"
                    name="tipoFreteSelecionado"
                    checked={tipoFreteSelecionado === 'prioridade'}
                    onChange={() => {}}
                    style={{
                      cursor: 'pointer',
                      accentColor: '#ffc107',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ fontWeight: '600' }}>Prioridade</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>
                      {formatCurrency(dadosFreteAtual.valor_prioridade || 0)} - Entrega exclusiva
                    </span>
                  </div>
                </label>
                <label
                  onClick={() => setTipoFreteSelecionado('reaproveitamento')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background: tipoFreteSelecionado === 'reaproveitamento' ? '#28a745' : '#ffffff',
                    color: tipoFreteSelecionado === 'reaproveitamento' ? '#ffffff' : '#495057',
                    borderRadius: '6px',
                    border: tipoFreteSelecionado === 'reaproveitamento' ? '2px solid #28a745' : '2px solid #ced4da',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: tipoFreteSelecionado === 'reaproveitamento' ? '600' : '500',
                    flex: '1',
                    boxShadow: tipoFreteSelecionado === 'reaproveitamento' ? '0 2px 8px rgba(40, 167, 69, 0.3)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="radio"
                    name="tipoFreteSelecionado"
                    checked={tipoFreteSelecionado === 'reaproveitamento'}
                    onChange={() => {}}
                    style={{
                      cursor: 'pointer',
                      accentColor: '#28a745',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ fontWeight: '600' }}>Reaproveitamento</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>
                      {formatCurrency(dadosFreteAtual.valor_reaproveitamento || 0)} - Carga compartilhada
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </>
      )}

      {/* Campos de sinal e entrada apenas para "cliente" SEM financiamento bancário */}
      {tipoCliente === 'cliente' && financiamentoBancario === 'nao' && (
        <>
          {/* Campo de sinal: não aparece quando prazo é "À Vista" */}
            {prazoSelecionado !== 'À Vista' && (
              <div className="form-group">
                <label htmlFor="valorSinal">
                  Valor do Sinal
                </label>
                <input
                  id="valorSinal"
                  type="number"
                  value={valorSinal}
                  onChange={(e) => setValorSinal(e.target.value)}
                  placeholder="Digite o valor do sinal"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="percentualEntrada">
                Percentual de Entrada *
              </label>
              <select
                id="percentualEntrada"
                value={percentualEntrada}
                onChange={(e) => handlePercentualEntradaChange(e.target.value)}
              >
                <option value="">Selecione o percentual</option>
                <option value="30">30%</option>
                <option value="50">50%</option>
              </select>
              <small style={{ display: 'block', marginTop: '5px', color: '#6c757d', fontSize: '0.875em' }}>
                {percentualEntrada === '30' && 'Planos específicos para 30% de entrada (sem desconto/acréscimo)'}
                {percentualEntrada === '50' && 'Planos específicos para 50% de entrada (com descontos de 1% a 5%)'}
              </small>
            </div>

            {percentualEntrada && (
              <div className="form-group">
                <label htmlFor="formaEntrada">
                  Forma de pagamento da entrada
                </label>
                <input
                  id="formaEntrada"
                  type="text"
                  value={formaEntrada}
                  onChange={(e) => setFormaEntrada(e.target.value)}
                  placeholder="Ex: Boleto, Pix, Transferência..."
                  maxLength="100"
                />
              </div>
            )}
          </>
      )}

      {/* Campo de Prazo de Pagamento - NÃO aparece quando for financiamento bancário */}
      {!(tipoCliente === 'cliente' && financiamentoBancario === 'sim') && (
        <div className="form-group">
            <label htmlFor="prazoPagamento">
              Prazo de Pagamento *
            </label>
            <select
              id="prazoPagamento"
              value={prazoSelecionado}
              onChange={(e) => setPrazoSelecionado(e.target.value)}
              disabled={
                !tipoCliente || 
                (tipoCliente === 'cliente' && financiamentoBancario === '') ||
                (tipoCliente === 'cliente' && financiamentoBancario === 'nao' && !percentualEntrada)
              }
              className={errors.prazoPagamento ? 'error' : ''}
            >
              <option value="">
                {!tipoCliente && 'Selecione primeiro o tipo de cliente'}
                {tipoCliente === 'cliente' && financiamentoBancario === '' && 'Selecione se haverá financiamento bancário'}
                {tipoCliente === 'cliente' && financiamentoBancario === 'nao' && !percentualEntrada && 'Selecione o percentual de entrada primeiro'}
                {tipoCliente === 'revenda' && 'Selecione o prazo'}
                {tipoCliente === 'cliente' && financiamentoBancario === 'nao' && percentualEntrada && 'Selecione o prazo'}
              </option>
              {planosDisponiveis.map((plan, idx) => (
                <option key={idx} value={plan.description}>
                  {getPlanLabel(plan)}
                </option>
              ))}
            </select>
            {errors.prazoPagamento && (
              <span className="error-message">{errors.prazoPagamento}</span>
            )}
        </div>
      )}

      {/* Campo de Desconto Adicional do Vendedor */}
      {/* Só aparece quando:
          1. Tipo for revenda (sempre) - até 3% (com GSE) ou 12% (sem GSE)
          2. Tipo for cliente SEM participação de revenda - até 3%
          3. Tipo for cliente COM participação de revenda mas Rodoviário - até 3%
          NÃO aparece quando for cliente com participação de revenda - Produtor rural
      */}
      {prazoSelecionado && (
        tipoCliente === 'revenda' || 
        (tipoCliente === 'cliente' && participacaoRevenda === 'nao') ||
        (tipoCliente === 'cliente' && participacaoRevenda === 'sim' && revendaTemIE === 'nao')
      ) && (
          <div className="form-group">
            <label htmlFor="descontoAdicional">
              Desconto Adicional do Vendedor
            </label>
            <select
              id="descontoAdicional"
              value={descontoAdicional}
              onChange={(e) => setDescontoAdicional(parseFloat(e.target.value))}
            >
              <option value="0">Sem desconto adicional</option>
              {tipoCliente === 'revenda' ? (
                // Para revenda: limite dinâmico baseado em GSE/GSI
                maxDescontoRevenda === 3 ? (
                  // Tem GSE: de 0.5% a 3%
                  <>
                    <option value="0.5">0,5%</option>
                    <option value="1">1%</option>
                    <option value="1.5">1,5%</option>
                    <option value="2">2%</option>
                    <option value="2.5">2,5%</option>
                    <option value="3">3%</option>
                  </>
                ) : (
                  // Não tem GSE: de 1% até o limite (12%, 14% ou 15% dependendo da quantidade de GSI)
                  <>
                    <option value="1">1%</option>
                    <option value="2">2%</option>
                    <option value="3">3%</option>
                    <option value="4">4%</option>
                    <option value="5">5%</option>
                    <option value="6">6%</option>
                    <option value="7">7%</option>
                    <option value="8">8%</option>
                    <option value="9">9%</option>
                    <option value="10">10%</option>
                    <option value="11">11%</option>
                    <option value="12">12%</option>
                    {/* Sempre mostrar 14% e 15% quando houver GSI (independente da quantidade no carrinho) */}
                    {temGuindasteGSI && (
                      <>
                        <option value="14" style={{ fontWeight: 'bold', backgroundColor: '#fff3cd' }}>
                          ⭐ 14% (2 unidades GSI)
                        </option>
                        <option value="15" style={{ fontWeight: 'bold', backgroundColor: '#d4edda' }}>
                          ⭐⭐ 15% (3 ou mais unidades GSI)
                        </option>
                      </>
                    )}
                  </>
                )
              ) : aplicarRegraGSISemParticipacao ? (
                // Para cliente sem participação + GSI + Produtor rural: até 12%
                <>
                  <option value="1">1%</option>
                  <option value="2">2%</option>
                  <option value="3">3%</option>
                  <option value="4">4%</option>
                  <option value="5">5%</option>
                  <option value="6">6%</option>
                  <option value="7">7%</option>
                  <option value="8">8%</option>
                  <option value="9">9%</option>
                  <option value="10">10%</option>
                  <option value="11">11%</option>
                  <option value="12">12%</option>
                </>
              ) : (
                // Para cliente: de 0.5% a 3%
                <>
                  <option value="0.5">0,5%</option>
                  <option value="1">1%</option>
                  <option value="1.5">1,5%</option>
                  <option value="2">2%</option>
                  <option value="2.5">2,5%</option>
                  <option value="3">3%</option>
                </>
              )}
            </select>
            <small style={{ display: 'block', marginTop: '5px', color: '#6c757d', fontSize: '0.875em' }}>
              {tipoCliente === 'revenda'
                ? temGuindasteGSE
                  ? '⚠️ Desconto limitado a 3% devido à presença de guindastes GSE no carrinho'
                  : temGuindasteGSI
                    ? 'Desconto especial para GSI: 12% (1 un), ⭐ 14% (2 un), ⭐⭐ 15% (3+ un). Selecione conforme a quantidade vendida.'
                    : 'Desconto adicional aplicado sobre o valor total do carrinho (máximo 12%)'
                : aplicarRegraGSISemParticipacao
                  ? '⭐ Desconto especial para GSI + Produtor Rural: até 12% permitido'
                  : 'Desconto adicional aplicado sobre o valor total do carrinho (máximo 3%)'
              }
            </small>
          </div>
      )}

      


      {/* Mensagem de Erro */}
      {erroCalculo && (
        <div className="payment-section">
          <div className="error-box">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{erroCalculo}</span>
          </div>
        </div>
      )}

      {/* Resumo Automático do Cálculo */}
      {calculoAtual && !erroCalculo && (() => {
        // Calcular valores de entrada e saldo
        // O sinal FAZ PARTE da entrada total
        const valorSinalNum = parseFloat(valorSinal) || 0;
        const percentualEntradaNum = parseFloat(percentualEntrada) || 0;
        const entradaTotal = tipoCliente === 'cliente' && percentualEntradaNum > 0 
          ? (calculoAtual.valorFinalComDescontoAdicional * percentualEntradaNum / 100) 
          : 0;
        const faltaEntrada = entradaTotal - valorSinalNum; // Quanto falta para completar a entrada
        const saldo = calculoAtual.valorFinalComDescontoAdicional - entradaTotal; // Saldo após pagar a entrada completa
        
        return (
          <div className="payment-section">
            <h3>Cálculo do Pagamento</h3>
            
            <div className="calculation-box">
              <div className="calc-row">
                <span className="calc-label">Preço Base:</span>
                <span className="calc-value">{formatCurrency(calculoAtual.precoBase)}</span>
              </div>

              {calculoAtual.descontoValor > 0 && (
                <div className="calc-row discount">
                  <span className="calc-label">Condições de pagamento:</span>
                  <span className="calc-value">- {formatCurrency(calculoAtual.descontoValor)}</span>
                </div>
              )}

              {calculoAtual.acrescimoValor > 0 && (
                <div className="calc-row surcharge">
                  <span className="calc-label">Acréscimo:</span>
                  <span className="calc-value">+ {formatCurrency(calculoAtual.acrescimoValor)}</span>
                </div>
              )}

              {calculoAtual.descontoAdicionalValor > 0 && (
                <div className="calc-row discount">
                  <span className="calc-label">
                    {tipoCliente === 'cliente' && participacaoRevenda === 'sim' && revendaTemIE === 'sim'
                      ? `Desconto do Vendedor (${descontoRevendaIE}%):`
                      : `Desconto Adicional do Vendedor (${descontoAdicional}%):`}
                  </span>
                  <span className="calc-value">- {formatCurrency(calculoAtual.descontoAdicionalValor)}</span>
                </div>
              )}

              <div className="calc-row separator" style={{ background: '#f8f9fa', padding: '10px 0', marginTop: '8px' }}>
                <span className="calc-label" style={{ fontSize: '15px' }}>Subtotal (Equipamento):</span>
                <span className="calc-value bold" style={{ fontSize: '16px' }}>{formatCurrency(calculoAtual.valorFinalComDescontoAdicional)}</span>
              </div>

              {/* Seção de Valores Adicionais */}
              <div style={{ marginTop: '15px', padding: '12px', background: '#f1f3f5', borderRadius: '6px' }}>
                <div style={{ marginBottom: '10px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                  📦 Valores Adicionais:
                </div>

                {calculoAtual.valorFrete > 0 && (
                  <div className="calc-row" style={{ padding: '8px', background: '#e7f5ff', borderRadius: '4px', marginBottom: '8px', borderLeft: '4px solid #1971c2' }}>
                    <span className="calc-label" style={{ color: '#1971c2', fontWeight: '500' }}>
                      🚛 Frete ({tipoFreteSelecionado === 'prioridade' ? 'Prioridade' : 'Reaproveitamento'})
                    </span>
                    <span className="calc-value" style={{ color: '#1971c2', fontWeight: 'bold' }}>
                      + {formatCurrency(calculoAtual.valorFrete)}
                    </span>
                  </div>
                )}

                {/* Exibir valor de instalação com destaque melhorado */}
                {calculoAtual.valorInformativoInstalacao > 0 && (
                  <div style={{ 
                    padding: '12px',
                    background: calculoAtual.somaInstalacao ? '#d3f9d8' : '#fff9db',
                    borderRadius: '6px',
                    border: `2px solid ${calculoAtual.somaInstalacao ? '#37b24d' : '#fab005'}`,
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ 
                        color: calculoAtual.somaInstalacao ? '#2b8a3e' : '#e67700',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        🔧 Instalação - Guindaste {temGuindasteGSI ? 'GSI' : 'GSE'}
                      </span>
                      <span style={{ 
                        color: calculoAtual.somaInstalacao ? '#2b8a3e' : '#e67700',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {calculoAtual.somaInstalacao ? '+ ' : ''}{formatCurrency(calculoAtual.valorInformativoInstalacao)}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      padding: '6px 10px',
                      background: calculoAtual.somaInstalacao ? '#51cf66' : '#ffd43b',
                      borderRadius: '4px',
                      color: calculoAtual.somaInstalacao ? '#2b8a3e' : '#e67700',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {calculoAtual.somaInstalacao 
                        ? '✅ INCLUSO NO VALOR TOTAL DA PROPOSTA' 
                        : '⚠️ VALOR INFORMATIVO - Cliente paga direto à oficina (NÃO SOMA no total)'}
                    </div>
                  </div>
                )}
              </div>

              <div className="calc-row separator" style={{ 
                background: '#fff3bf', 
                padding: '12px', 
                marginTop: '15px',
                borderTop: '3px solid #fab005',
                borderBottom: '3px solid #fab005'
              }}>
                <span className="calc-label" style={{ fontSize: '16px', fontWeight: '700', color: '#495057' }}>
                  💰 VALOR TOTAL DA PROPOSTA:
                </span>
                <span className="calc-value bold" style={{ fontSize: '20px', color: '#f59f00' }}>
                  {formatCurrency(calculoAtual.valorFinalComFrete)}
                </span>
              </div>

              {/* Mostrar valores de entrada (apenas para cliente) */}
              {tipoCliente === 'cliente' && entradaTotal > 0 && (
                <>
                  <div className="calc-row entry" style={{ borderTop: '1px solid #dee2e6', paddingTop: '10px', marginTop: '10px' }}>
                    <span className="calc-label">Entrada Total ({percentualEntradaNum}%):</span>
                    <span className="calc-value" style={{ fontWeight: 'bold' }}>{formatCurrency(entradaTotal)}</span>
                  </div>
                  {valorSinalNum > 0 && (
                    <>
                      <div className="calc-row entry" style={{ fontSize: '0.95em', color: '#28a745' }}>
                        <span className="calc-label">↳ Sinal (já pago):</span>
                        <span className="calc-value">- {formatCurrency(valorSinalNum)}</span>
                      </div>
                      <div className="calc-row entry" style={{ fontSize: '0.95em', paddingLeft: '10px' }}>
                        <span className="calc-label">↳ Falta pagar de entrada:</span>
                        <span className="calc-value" style={{ fontWeight: 'bold' }}>{formatCurrency(Math.max(0, faltaEntrada))}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {calculoAtual.entrada > 0 && (
                <div className="calc-row entry">
                  <span className="calc-label">Entrada (plano):</span>
                  <span className="calc-value">{formatCurrency(calculoAtual.entrada)}</span>
                </div>
              )}

              {calculoAtual.parcelas && calculoAtual.parcelas.length > 0 && (
                <div className="calc-parcelas">
                  <span className="calc-label">Parcelas:</span>
                  <div className="parcelas-list">
                    {calculoAtual.parcelas.map((parcela) => (
                      <div key={parcela.numero} className="parcela-item">
                        <span className="parcela-numero">{parcela.numero}ª parcela:</span>
                        <span className="parcela-valor">{formatCurrency(parcela.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="calc-row total">
                <span className="calc-label">Total:</span>
                <span className="calc-value bold">{formatCurrency(calculoAtual.valorFinalComFrete)}</span>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Botão de Navegação */}
      <div className="payment-navigation">
        <button 
          className="payment-nav-btn"
          onClick={() => {
            if (onNext && typeof onNext === 'function') {
              onNext();
            }
          }}
          disabled={!calculoAtual || erroCalculo}
        >
          <span>Continuar para Dados do Cliente</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PaymentPolicy;
