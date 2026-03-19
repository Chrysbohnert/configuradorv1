import React, { useState, useEffect, useMemo } from 'react';
import { getPaymentPlans, getPlanLabel } from '../../services/paymentPlans';
import { calcularPagamento } from '../../lib/payments';
import { formatCurrency } from '../../utils/formatters';
import { db, supabase } from '../../config/supabase';
import { useFretes } from '../../hooks/useFretes';
import SolicitarDescontoModal from '../../components/SolicitarDescontoModal';
import './PaymentPolicy.css';

const formatCurrencyUSD = (value) => {
  const v = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
};

/**
 * PaymentPolicy – Alinhado ao DIAGRAMA (7 etapas)
 * Regras-chave implementadas:
 * - GSE + Cliente + Participação de Revenda = SIM  → Tipo de IE travado em "Produtor rural" (não mostra CNPJ/CPF)
 * - (Mantida por consistência) GSI + Cliente + Participação de Revenda = SIM → também trava "Produtor rural"
 * - Ordem das seleções espelha o diagrama (com stepper 1..7)
 */

export default function PaymentPolicy({
  // dados de produtos para detectar GSE/GSI (pode ser "carrinho" ou "equipamentos")
  carrinho = [],
  equipamentos = [],
  // preço base total (para cálculo/resumo)
  precoBase = 0,
  cotacaoUSD = null,
  modoConcessionaria = false,
  descontoConcessionaria = 0,
  // callbacks opcionais
  onPaymentComputed,
  onPlanSelected,
  onFinish, // Callback para finalizar e ir para próxima etapa
  regiaoClienteSelecionada = '', // Região selecionada do cliente
  debug = false,
}) {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);
  const isConcessionariaUser = user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'admin_concessionaria';
  const isVendedorExterior = user?.tipo === 'vendedor_exterior';

  // =============== DERIVAÇÃO DE PRODUTOS (GSE/GSI) ===============
  const itens = useMemo(() => (carrinho?.length ? carrinho : equipamentos || []), [carrinho, equipamentos]);

  const guindasteDoPedido = useMemo(() => {
    const g = (itens || []).find(i => i?.tipo === 'guindaste') || null;
    return g || null;
  }, [itens]);

  const prototipoContext = useMemo(() => {
    if (!guindasteDoPedido) return { isPrototipo: false, id: null };
    return {
      isPrototipo: !!guindasteDoPedido?.is_prototipo,
      id: guindasteDoPedido?.id || null,
    };
  }, [guindasteDoPedido]);

  const temGSE = useMemo(() => itens.some(i => {
    const t = `${i?.modelo || ''} ${i?.subgrupo || ''} ${i?.nome || ''}`.toUpperCase();
    return t.includes('GSE');
  }), [itens]);

  const temGSI = useMemo(() => itens.some(i => {
    const t = `${i?.modelo || ''} ${i?.subgrupo || ''} ${i?.nome || ''}`.toUpperCase();
    return t.includes('GSI');
  }), [itens]);

  // =============== ESTADO PRINCIPAL (7 ETAPAS) ===================
  const [etapa, setEtapa] = useState(1);

  // 1) Tipo de cliente
  const [tipoCliente, setTipoCliente] = useState(''); // 'cliente' | 'revenda'

  // 2) Participação & IE
  const [participacaoRevenda, setParticipacaoRevenda] = useState(''); // 'sim' | 'nao'
  const [tipoIE, setTipoIE] = useState(''); // 'produtor' | 'cnpj_cpf'
  const travaIEProdutor = useMemo(() => {
    // DIAGRAMA: GSE + cliente + part.revenda=sim → só "Produtor rural"
    // (coerência com tua regra antiga: se tiver GSI também trava)
    return tipoCliente === 'cliente' && participacaoRevenda === 'sim' && (temGSE || temGSI);
  }, [tipoCliente, participacaoRevenda, temGSE, temGSI]);

  // 3) Instalação
  const [instalacao, setInstalacao] = useState(''); // 'cliente' (paga direto) | 'incluso' (no pedido)

  // 4) Tipo de frete
  const [tipoFrete, setTipoFrete] = useState(''); // 'FOB' | 'CIF'

  // 5) Local + Tipo de Entrega (se CIF)
  const [pontosInstalacao, setPontosInstalacao] = useState([]);
  const [localInstalacao, setLocalInstalacao] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState(''); // 'prioridade' | 'reaproveitamento'
  const [ufFiltroInstalacao, setUfFiltroInstalacao] = useState('');
  const [buscaInstalacao, setBuscaInstalacao] = useState('');

  // 6) Entrada, plano, financiamento e desconto do vendedor
  const [percentualEntrada, setPercentualEntrada] = useState(''); // '30' | '50' | 'financiamento'
  const [valorSinal, setValorSinal] = useState('');
  const [formaEntrada, setFormaEntrada] = useState('');
  const [observacoesNegociacao, setObservacoesNegociacao] = useState('');
  const [extraDescricao, setExtraDescricao] = useState('');
  const [extraValor, setExtraValor] = useState('');
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [descontoVendedor, setDescontoVendedor] = useState(0);

  // 7) Resumo: calculado a partir das escolhas
  const [resultado, setResultado] = useState(null);

  // Estados para solicitação de desconto adicional
  const [modalSolicitacaoOpen, setModalSolicitacaoOpen] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState(null);
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false);

  // Hook para buscar dados de frete baseado no local de instalação
  const { dadosFreteAtual } = useFretes(localInstalacao);

  const valorFreteCalculado = useMemo(() => {
    if (String(tipoFrete).toUpperCase() !== 'CIF') return 0;
    if (!dadosFreteAtual) return 0;
    if (!tipoEntrega) return 0;

    if (tipoEntrega === 'prioridade') {
      return parseFloat(dadosFreteAtual.valor_prioridade || 0);
    }
    if (tipoEntrega === 'reaproveitamento') {
      return parseFloat(dadosFreteAtual.valor_reaproveitamento || 0);
    }
    return 0;
  }, [tipoFrete, dadosFreteAtual, tipoEntrega]);

  // ✅ REMOVIDO: precoBase e carregandoPreco
  // Agora usamos precoBase diretamente do carrinho

  // =============== CARREGAR PONTOS (para CIF) ====================
  useEffect(() => {
    // Carrega uma lista genérica; teu projeto pode filtrar por região/vendedor
    async function load() {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
const data = await db.getPontosInstalacaoPorVendedor(user?.id) || [];
        setPontosInstalacao(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Erro ao carregar pontos de instalação:', e);
        setPontosInstalacao([]);
      }
    }
    load();
  }, []);

  const ufsDisponiveis = useMemo(() => {
    const set = new Set(
      (pontosInstalacao || [])
        .map(p => String(p?.uf || '').trim().toUpperCase())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pontosInstalacao]);

  const percentualEntradaNumCalc = useMemo(() => {
    if (!percentualEntrada) return 0;
    if (percentualEntrada === 'financiamento') return 0;
    const v = parseFloat(percentualEntrada);
    if (Number.isNaN(v) || v < 0) return 0;
    return Math.min(100, v);
  }, [percentualEntrada]);

  const pontosInstalacaoFiltrados = useMemo(() => {
    const base = Array.isArray(pontosInstalacao) ? pontosInstalacao : [];
    const filtrados = ufFiltroInstalacao
      ? base.filter(p => String(p?.uf || '').trim().toUpperCase() === ufFiltroInstalacao)
      : base;

    const termo = String(buscaInstalacao || '').trim().toLowerCase();
    const filtradosBusca = termo
      ? filtrados.filter(p => {
          const uf = String(p?.uf || '').trim().toLowerCase();
          const cidade = String(p?.cidade || '').trim().toLowerCase();
          const oficina = String(p?.oficina || '').trim().toLowerCase();
          const nome = String(p?.nome || '').trim().toLowerCase();
          return [uf, cidade, oficina, nome].some(v => v.includes(termo));
        })
      : filtrados;

    return filtradosBusca
      .slice()
      .sort((a, b) => {
        const ca = String(a?.cidade || '').localeCompare(String(b?.cidade || ''), 'pt-BR');
        if (ca !== 0) return ca;
        return String(a?.oficina || a?.nome || '').localeCompare(String(b?.oficina || b?.nome || ''), 'pt-BR');
      });
  }, [pontosInstalacao, ufFiltroInstalacao, buscaInstalacao]);

  // ✅ REMOVIDO: useEffect que buscava preço
  // O precoBase já vem do carrinho com o preço correto da região selecionada
  // O NovoPedido.jsx já faz o recálculo em recalcularPrecosCarrinho quando a região muda
  // Não precisamos buscar preço aqui novamente!

  // =============== LISTENER REALTIME PARA APROVAÇÃO DE DESCONTO ==
  useEffect(() => {
    if (!solicitacaoId) return;

    console.log('🔔 [PaymentPolicy] Iniciando listener para solicitação:', solicitacaoId);

    const channel = supabase
      .channel(`solicitacao-${solicitacaoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'solicitacoes_desconto',
        filter: `id=eq.${solicitacaoId}`
      }, async (payload) => {
        console.log('🔔 [PaymentPolicy] Atualização recebida:', payload);

        if (payload.new.status === 'aprovado') {
          const descontoAprovado = payload.new.desconto_aprovado;
          const aprovadorNome = payload.new.aprovador_nome;

          console.log(`✅ [PaymentPolicy] Desconto aprovado: ${descontoAprovado}% (não exibido ao vendedor)`);

          try {
            const extraValorNum = parseFloat(extraValor) || 0;

            // Atualiza o estado local com o desconto aprovado
            setDescontoVendedor(descontoAprovado);
            
            // Força o recálculo do pagamento com o novo desconto
            if (!planoSelecionado) {
              console.warn('⚠️ [PaymentPolicy] Plano não selecionado, não é possível recalcular');
              // Mesmo sem plano, o desconto já fica salvo no estado e será aplicado
              // assim que o usuário selecionar o plano.
              setModalSolicitacaoOpen(false);
              setAguardandoAprovacao(false);
              setSolicitacaoId(null);

              forceUpdate();
              alert(`✅ Desconto aprovado por ${aprovadorNome}!\n\nSelecione um plano de pagamento para atualizar os valores.`);
              return;
            }

            const r = calcularPagamento({
              precoBase: precoBase,
              plan: planoSelecionado,
              dataEmissaoNF: new Date(),
            });

            // Aplica desconto do vendedor aprovado
            const descontoExtraValor = precoBase * (descontoAprovado / 100);
            const valorAposExtra = r.valorAjustado - descontoExtraValor;

            // Calcula frete (mesma regra do cálculo principal)
            const valorFrete = valorFreteCalculado;

            // Calcula instalação
            const valorInstalacao = instalacao === 'incluso'
              ? (temGSI ? 6350 : temGSE ? 7500 : 0)
              : 0;

            const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;

            const cUsd = Number(cotacaoUSD);
            const valorFinalUSD = (isVendedorExterior && Number.isFinite(cUsd) && cUsd > 0)
              ? (valorFinal / cUsd)
              : 0;

            // Calcular campos de entrada para o PDF
            const valorSinalNum = parseFloat(valorSinal) || 0;
            
            // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
            const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
            const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
            
            const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
            
            // CORREÇÃO: Saldo a pagar = Valor Final - Entrada
            const saldoAPagarCalc = valorFinal - entradaTotalCalc;

            // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
            const numParcelas = r.parcelas?.length || 1;
            const valorParcela = saldoAPagarCalc / numParcelas;
            
            console.log('🔢 [PaymentPolicy - APROVAÇÃO] CÁLCULO DE PARCELAS:');
            console.log('   Valor Final:', valorFinal);
            console.log('   Entrada Total:', entradaTotalCalc);
            console.log('   Saldo a Pagar:', saldoAPagarCalc);
            console.log('   Número de Parcelas:', numParcelas);
            console.log('   Valor por Parcela:', valorParcela);
            
            let somaAcumulada = 0;
            const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
              const isUltima = idx === numParcelas - 1;
              const valor = isUltima 
                ? Math.round((saldoAPagarCalc - somaAcumulada) * 100) / 100
                : Math.round(valorParcela * 100) / 100;
              somaAcumulada += valor;
              console.log(`   Parcela ${idx + 1}:`, valor);
              return {
                ...parcela,
                valor
              };
            }) || [];
            
            console.log('   Total das Parcelas:', parcelasCorrigidas.reduce((acc, p) => acc + p.valor, 0));

            const novoResultado = {
              ...r,
              precoBase: precoBase,
              descontoAdicionalValor: descontoExtraValor,
              valorFinalComDescontoAdicional: valorAposExtra,
              extraDescricao: extraDescricao || '',
              extraValor: extraValorNum,
              valorFrete,
              valorInstalacao,
              total: valorFinal,
              valorFinal, // Adicionar também como valorFinal
              financiamentoBancario: percentualEntrada === 'financiamento' ? 'sim' : 'nao',

              // Comércio exterior
              moeda: isVendedorExterior ? 'USD' : 'BRL',
              cotacao_usd: isVendedorExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
              valorFinalUSD,
              
              // Campos em percentual para o PDF
              desconto: descontoAprovado, // % do desconto aprovado
              acrescimo: (planoSelecionado?.surcharge_percent || 0) * 100,
              
              // Campos de entrada
              percentualEntrada: percentualEntradaNum,
              entradaTotal: entradaTotalCalc,
              valorSinal: valorSinalNum,
              faltaEntrada: faltaEntradaCalc,
              saldoAPagar: saldoAPagarCalc,
              formaEntrada: formaEntrada || '',
              
              // CORREÇÃO: Usar parcelas recalculadas
              parcelas: parcelasCorrigidas,
              saldo: saldoAPagarCalc,
              
              tipoCliente,
              participacaoRevenda,
              tipoIE,
              instalacao,
              tipoFrete,
              localInstalacao,
              tipoEntrega,
              tipoPagamento: tipoCliente,
              tipoInstalacao: instalacao === 'incluso' ? 'Incluso no pedido' : 
                              instalacao === 'cliente' ? 'cliente paga direto' : '',
              revendaTemIE: tipoIE === 'produtor' ? 'sim' : 
                            tipoIE === 'cnpj_cpf' ? 'nao' : '',
              prazoPagamento: planoSelecionado?.description || '',
            };
            
            // Atualiza o estado com o novo resultado
            setResultado(novoResultado);
            
            // Fecha o modal e limpa os estados
            setModalSolicitacaoOpen(false);
            setAguardandoAprovacao(false);
            setSolicitacaoId(null);
            
            // Força uma nova renderização do componente
            forceUpdate();
            
            // Mostra notificação de sucesso (sem mostrar o percentual exato)
            alert(`✅ Desconto aprovado por ${aprovadorNome}!\n\nValor atualizado com sucesso. Você pode continuar preenchendo a proposta.`);
            
          } catch (error) {
            console.error('❌ [PaymentPolicy] Erro ao processar aprovação de desconto:', error);
            alert('❌ Ocorreu um erro ao aplicar o desconto. Por favor, verifique os dados e tente novamente.');
          }

        } else if (payload.new.status === 'negado') {
          const aprovadorNome = payload.new.aprovador_nome;
          const observacao = payload.new.observacao_gestor;

          console.log(`❌ [PaymentPolicy] Solicitação negada por ${aprovadorNome}`);

          // Fecha modal e limpa estados
          setModalSolicitacaoOpen(false);
          setAguardandoAprovacao(false);
          setSolicitacaoId(null);
          
          // Força uma nova renderização do componente
          forceUpdate();

          // Mostra notificação de negação
          alert(`❌ Solicitação negada por ${aprovadorNome}${observacao ? '\n\nMotivo: ' + observacao : ''}`);
        }
      })
      .subscribe();

    // Cleanup: remove listener quando componente desmonta ou solicitacaoId muda
    return () => {
      console.log('🔕 [PaymentPolicy] Removendo listener');
      supabase.removeChannel(channel);
    };
  }, [solicitacaoId, precoBase, tipoCliente, participacaoRevenda, tipoFrete, localInstalacao, tipoEntrega, percentualEntrada, planoSelecionado, extraDescricao, extraValor, formaEntrada, instalacao, temGSE, temGSI, dadosFreteAtual, valorFreteCalculado]);

  // =============== PLANOS DISPONÍVEIS ============================
  const audience = tipoCliente === 'revenda' ? 'revenda' : 'cliente';
  const [todosPlanos, setTodosPlanos] = useState(() => getPaymentPlans(audience));

  const entradaOpcoes = null;
  const permiteFinanciamento = true;
  const permiteSolicitarDescontoExtra = true;
  const descontosBotoes = null;
  const planosLiberados = null;

  useEffect(() => {
    let cancelled = false;

    const loadPublishedPlans = async () => {
      try {
        if (prototipoContext.isPrototipo && prototipoContext.id) {
          const publishedProto = await db.getPublishedPrototypePaymentPlans({
            guindaste_id: prototipoContext.id,
            audience
          });
          const publishedProtoActive = (publishedProto || []).filter(p => p.active);

          if (!cancelled) {
            if (publishedProtoActive.length > 0) {
              setTodosPlanos(publishedProtoActive);
              return;
            }
          }
        }

        const scope = isConcessionariaUser ? 'concessionaria' : 'stark';
        const concessionaria_id = user?.concessionaria_id || null;

        if (scope === 'concessionaria' && !concessionaria_id) {
          if (!cancelled) setTodosPlanos(getPaymentPlans(audience));
          return;
        }

        const published = await db.getPublishedPaymentPlans({
          scope,
          concessionaria_id: scope === 'concessionaria' ? concessionaria_id : null,
          audience
        });

        const publishedActive = (published || []).filter(p => p.active);
        if (!cancelled) {
          if (publishedActive.length > 0) {
            setTodosPlanos(publishedActive);
          } else {
            setTodosPlanos(getPaymentPlans(audience));
          }
        }
      } catch (e) {
        console.warn('⚠️ [PaymentPolicy] Falha ao carregar planos publicados, usando fallback JSON:', e);
        if (!cancelled) setTodosPlanos(getPaymentPlans(audience));
      }
    };

    loadPublishedPlans();
    return () => { cancelled = true; };
  }, [audience, isConcessionariaUser, user?.concessionaria_id, prototipoContext.isPrototipo, prototipoContext.id]);

  useEffect(() => {
    if (!prototipoContext.isPrototipo) return;

    // Se protótipo não permitir financiamento e o usuário já selecionou financiamento, limpar
    if (!permiteFinanciamento && percentualEntrada === 'financiamento') {
      setPercentualEntrada('');
    }
  }, [prototipoContext.isPrototipo, permiteFinanciamento, percentualEntrada]);

  // Filtra por percentual quando for cliente e não for financiamento
  const planosFiltrados = useMemo(() => {
    let base = tipoCliente !== 'cliente' ? todosPlanos : todosPlanos;
    if (planosLiberados) {
      base = base.filter(p => planosLiberados.has(String(p.description).trim()));
    }

    if (tipoCliente !== 'cliente') return base;
    if (!percentualEntrada) return [];
    if (percentualEntrada === 'financiamento') return base.filter(p => !p.entry_percent_required);
    const pNum = percentualEntradaNumCalc / 100;
    return base.filter(p => p.entry_percent_required === pNum);
  }, [todosPlanos, tipoCliente, percentualEntrada, percentualEntradaNumCalc, planosLiberados]);

  // =============== REGRAS DE RESET (evitar estado sujo) ==========
  useEffect(() => {
    // Mudou tipo de cliente? zera dependentes
    setParticipacaoRevenda('');
    setTipoIE('');
    setInstalacao('');
    setTipoFrete('');
    setLocalInstalacao('');
    setTipoEntrega('');
    setUfFiltroInstalacao('');
    setBuscaInstalacao('');
    setPercentualEntrada('');
    setValorSinal('');
    setFormaEntrada('');
    setObservacoesNegociacao('');
    setExtraDescricao('');
    setExtraValor('');
    setPlanoSelecionado(null);
    setDescontoVendedor(0);
    setResultado(null);

    // salta etapa correta (cliente precisa decidir participação; revenda não)
    setEtapa( tipoCliente ? (tipoCliente === 'cliente' ? 2 : 3) : 1 );
  }, [tipoCliente]);

  useEffect(() => {
    // Se a regra do diagrama exigir travar IE em "produtor", faz e mantém bloqueado
    if (travaIEProdutor && tipoIE !== 'produtor') setTipoIE('produtor');
    // Ao mudar participação revenda, limpa IE se não for travado
    if (!travaIEProdutor && tipoIE && participacaoRevenda === '') setTipoIE('');
  }, [travaIEProdutor, participacaoRevenda, tipoIE]);

  useEffect(() => {
    // Quando cliente organiza frete: limpa apenas tipo de entrega (local permanece obrigatório)
    if (tipoFrete === 'FOB') {
      setTipoEntrega('');
    }
    // Quando frete incluso: mantém tudo
  }, [tipoFrete]);

  useEffect(() => {
    // Mudou entrada/financiamento → limpar plano & sinal quando necessário
    if (percentualEntrada === 'financiamento') {
      setPlanoSelecionado(null);
      setValorSinal('');
      setFormaEntrada('');
    }
  }, [percentualEntrada]);

  // =============== CÁLCULO FINAL =================================
  useEffect(() => {
    // não calcula enquanto não definiu plano (ou financiamento)
    if (!tipoCliente) { setResultado(null); return; }

    const cUsd = Number(cotacaoUSD);

    // Financiamento Bancário: notifica sem cálculo de parcelas internas
    if (percentualEntrada === 'financiamento') {
      const extraValorNum = parseFloat(extraValor) || 0;
      const descontoExtraValor = precoBase * (descontoVendedor / 100);
      const valorAposExtra = precoBase - descontoExtraValor;

      // Frete pode ser incluso no pedido (CIF) mesmo em financiamento.
      // Quando FOB, o cliente paga direto e o valor fica 0.
      const valorFrete = valorFreteCalculado;

      // Instalação pode ser inclusa na proposta (opcional) também para revenda
      const valorInstalacao = instalacao === 'incluso'
        ? (temGSI ? 6350 : temGSE ? 7500 : 0)
        : 0;

      const valorFinalFinanciamento = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;
      const valorFinalUSD = (isVendedorExterior && Number.isFinite(cUsd) && cUsd > 0)
        ? (valorFinalFinanciamento / cUsd)
        : 0;
      const r = {
        precoBase,
        financiamentoBancario: 'sim',
        // Campos internos do PaymentPolicy
        tipoCliente,
        participacaoRevenda,
        tipoIE,
        instalacao,
        tipoFrete,
        localInstalacao,
        tipoEntrega,
        // Mapeamento para validação do NovoPedido
        tipoPagamento: tipoCliente, // 'cliente' ou 'revenda'
        tipoInstalacao: instalacao === 'incluso' ? 'Incluso no pedido' : instalacao === 'cliente' ? 'cliente paga direto' : '',
        revendaTemIE: tipoIE === 'produtor' ? 'sim' : tipoIE === 'cnpj_cpf' ? 'nao' : '',
        prazoPagamento: 'Financiamento Bancário', // Identificar no PDF
        // Valores
        descontoAdicionalValor: descontoExtraValor,
        valorFinalComDescontoAdicional: valorAposExtra,
        descontoValor: 0,
        acrescimoValor: 0,
        valorAjustado: valorAposExtra,
        valorFrete,
        valorInstalacao,
        entrada: 0,
        saldo: valorFinalFinanciamento,
        parcelas: [],
        total: valorFinalFinanciamento,
        valorFinal: valorFinalFinanciamento, // Adicionar para compatibilidade com PDF
        // Campos em percentual para o PDF
        desconto: descontoVendedor,
        descontoPrazo: 0,
        acrescimo: 0,
        // Campos de entrada (zerados para financiamento)
        percentualEntrada: 0,
        entradaTotal: 0,
        valorSinal: 0,
        faltaEntrada: 0,
        saldoAPagar: valorFinalFinanciamento,
        formaEntrada: '',
        observacoesNegociacao: (observacoesNegociacao || '').trim(),
        extraDescricao: extraDescricao || '',
        extraValor: extraValorNum,

        // Comércio exterior
        moeda: isVendedorExterior ? 'USD' : 'BRL',
        cotacao_usd: isVendedorExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
        valorFinalUSD,
      };

      console.log('💾 [PaymentPolicy] pagamentoData calculado (financiamento):', {
        tipoFrete,
        tipoEntrega,
        localInstalacao,
        valorFreteCalculado,
        valorFrete: r.valorFrete,
        valorFinal: r.valorFinal,
        total: r.total,
      });
      setResultado(r);
      onPaymentComputed?.(r);
      return;
    }

    if (!planoSelecionado) { setResultado(null); return; }

    // Usa teu cálculo existente (com preço ajustado por região)
    try {
      const extraValorNum = parseFloat(extraValor) || 0;
      const r = calcularPagamento({
        precoBase: precoBase,
        plan: planoSelecionado,
        dataEmissaoNF: new Date(),
      });

      // aplica desconto do vendedor (sobre o PREÇO AJUSTADO POR REGIÃO)
      const descontoExtraValor = precoBase * (descontoVendedor / 100);
      const valorAposExtra = r.valorAjustado - descontoExtraValor;

      // frete: somente se frete incluso + selecionado tipo de entrega e local
      const valorFrete = valorFreteCalculado;

      // instalação: apenas para CLIENTE, revenda não tem instalação
      const valorInstalacao = instalacao === 'incluso'
        ? (temGSI ? 6350 : temGSE ? 7500 : 0)
        : 0;

      const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;

      const valorFinalUSD = (isVendedorExterior && Number.isFinite(cUsd) && cUsd > 0)
        ? (valorFinal / cUsd)
        : 0;

      // Calcular campos de entrada para o PDF
      const valorSinalNum = parseFloat(valorSinal) || 0;
      
      // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
      const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
      const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
      
      const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
      
      // CORREÇÃO: Saldo a pagar = Valor Final - Entrada (não considera sinal aqui)
      const saldoAPagarCalc = valorFinal - entradaTotalCalc;

      // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
      const numParcelas = r.parcelas?.length || 1;
      const valorParcela = saldoAPagarCalc / numParcelas;
      
      console.log('🔢 [PaymentPolicy] CÁLCULO DE PARCELAS:');
      console.log('   Valor Final:', valorFinal);
      console.log('   Entrada Total:', entradaTotalCalc);
      console.log('   Saldo a Pagar:', saldoAPagarCalc);
      console.log('   Número de Parcelas:', numParcelas);
      console.log('   Valor por Parcela:', valorParcela);
      
      let somaAcumulada = 0;
      const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
        const isUltima = idx === numParcelas - 1;
        const valor = isUltima 
          ? Math.round((saldoAPagarCalc - somaAcumulada) * 100) / 100
          : Math.round(valorParcela * 100) / 100;
        somaAcumulada += valor;
        console.log(`   Parcela ${idx + 1}:`, valor);
        return {
          ...parcela,
          valor
        };
      }) || [];
      
      console.log('   Total das Parcelas:', parcelasCorrigidas.reduce((acc, p) => acc + p.valor, 0));

      const resultadoFinal = {
        ...r,
        precoBase: precoBase, // Usar preço ajustado
        descontoAdicionalValor: descontoExtraValor,
        valorFinalComDescontoAdicional: valorAposExtra,
        observacoesNegociacao: (observacoesNegociacao || '').trim(),
        extraDescricao: extraDescricao || '',
        extraValor: extraValorNum,
        valorFrete,
        valorInstalacao,
        total: valorFinal,
        valorFinal, // Adicionar também como valorFinal para compatibilidade com PDF
        financiamentoBancario: 'nao', // Não é financiamento bancário
        
        // Campos de desconto e acréscimo em PERCENTUAL (para o PDF)
        desconto: descontoVendedor, // % do desconto do vendedor
        descontoPrazo: (planoSelecionado?.discount_percent || 0) * 100, // % do desconto do plano/prazo
        acrescimo: (planoSelecionado?.surcharge_percent || 0) * 100, // % do acréscimo do plano
        
        // Campos de entrada (para o PDF)
        percentualEntrada: percentualEntradaNum,
        entradaTotal: entradaTotalCalc,
        valorSinal: valorSinalNum,
        faltaEntrada: faltaEntradaCalc,
        saldoAPagar: saldoAPagarCalc,
        formaEntrada: formaEntrada || '',

        // Comércio exterior
        moeda: isVendedorExterior ? 'USD' : 'BRL',
        cotacao_usd: isVendedorExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
        valorFinalUSD,
        
        // CORREÇÃO: Usar parcelas recalculadas
        parcelas: parcelasCorrigidas,
        saldo: saldoAPagarCalc,
        
        // Campos internos do PaymentPolicy
        tipoCliente,
        participacaoRevenda,
        tipoIE,
        instalacao,
        tipoFrete,
        localInstalacao,
        tipoEntrega,
        // Mapeamento para validação do NovoPedido
        tipoPagamento: tipoCliente, // 'cliente' ou 'revenda'
        tipoInstalacao: instalacao === 'incluso'
          ? 'Incluso no pedido'
          : instalacao === 'cliente'
            ? 'cliente paga direto'
            : '',
        revendaTemIE: tipoIE === 'produtor' ? 'sim' : tipoIE === 'cnpj_cpf' ? 'nao' : '',
        prazoPagamento: planoSelecionado?.description || '',
      };

      console.log('💾 [PaymentPolicy] pagamentoData calculado:', {
        tipoFrete,
        tipoEntrega,
        localInstalacao,
        valorFreteCalculado,
        valorFrete: resultadoFinal.valorFrete,
        valorFinal: resultadoFinal.valorFinal,
        total: resultadoFinal.total,
      });

      setResultado(resultadoFinal);
      onPaymentComputed?.(resultadoFinal);
    } catch (err) {
      console.error(err);
      setResultado(null);
      onPaymentComputed?.(null);
    }
  }, [
    precoBase,
    tipoCliente,
    participacaoRevenda,
    tipoIE,
    instalacao,
    tipoFrete,
    localInstalacao,
    tipoEntrega,
    dadosFreteAtual,
    valorFreteCalculado,
    planoSelecionado,
    percentualEntrada,
    valorSinal,
    extraDescricao,
    extraValor,
    observacoesNegociacao,
    descontoVendedor,
    temGSE,
    temGSI,
    cotacaoUSD,
    onPaymentComputed,
  ]);

  // =============== AJUDA VISUAL (debug) ==========================
  useEffect(() => {
    if (!debug) return;
    console.log('[ETAPA]', etapa, {
      tipoCliente, participacaoRevenda, tipoIE,
      instalacao, tipoFrete, localInstalacao, tipoEntrega,
      percentualEntrada, valorSinal, formaEntrada,
      planoSelecionado, descontoVendedor,
      temGSE, temGSI,
    });
  }, [debug, etapa, tipoCliente, participacaoRevenda, tipoIE, instalacao, tipoFrete, localInstalacao, tipoEntrega, percentualEntrada, valorSinal, formaEntrada, planoSelecionado, descontoVendedor, temGSE, temGSI]);

  // =============== UTILS DE NAVEGAÇÃO ============================
  const podeIrEtapa2 = !!tipoCliente && (tipoCliente === 'revenda' ? true : true);
  const podeIrEtapa3 = tipoCliente === 'revenda' ? true : !!participacaoRevenda && (!!tipoIE || travaIEProdutor);
  const podeIrEtapa4 = tipoCliente === 'revenda' ? true : !!instalacao; // Revenda não precisa selecionar instalação
  const podeIrEtapa5 = !!tipoFrete && !!localInstalacao && (tipoFrete === 'FOB' || !!tipoEntrega);
  const podeIrEtapa6 = true; // entrada/plano sempre liberados após 5
  const podeIrEtapa7 = percentualEntrada === 'financiamento' ? true : !!planoSelecionado;

  const next = () => setEtapa(e => Math.min(e + 1, 7));
  const prev = () => setEtapa(e => Math.max(e - 1, 1));

  // =============== SOLICITAR DESCONTO ADICIONAL AO GESTOR ========
  const handleSolicitarDesconto = async (justificativa) => {
    try {
      setAguardandoAprovacao(true);

      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        alert('❌ Erro: Usuário não identificado');
        return;
      }

      // Pegar descrição do equipamento
      const equipamento = itens[0];
      const equipamentoDescricao = equipamento 
        ? `${equipamento.subgrupo || ''} ${equipamento.modelo || ''}`.trim()
        : 'Equipamento não identificado';

      console.log('📝 [PaymentPolicy] Criando solicitação de desconto:', {
        vendedorId: user.id,
        vendedorNome: user.nome,
        equipamentoDescricao,
        valorBase: precoBase,
        descontoAtual: typeof descontoVendedor === 'number' ? descontoVendedor : 0,
        justificativa
      });

      // Criar solicitação no banco
      const solicitacao = await db.criarSolicitacaoDesconto({
        vendedorId: user.id,
        vendedorNome: user.nome,
        vendedorEmail: user.email,
        equipamentoDescricao,
        valorBase: precoBase,
        descontoAtual: typeof descontoVendedor === 'number' ? descontoVendedor : 0,
        justificativa
      });

      console.log('✅ [PaymentPolicy] Solicitação criada:', solicitacao);

      // Guardar ID da solicitação para o listener
      setSolicitacaoId(solicitacao.id);

      // TODO: Enviar notificação WhatsApp (implementar depois)
      // await enviarNotificacaoWhatsApp(solicitacao);

      alert('✅ Solicitação enviada!\n\nO gestor foi notificado e você será avisado assim que ele responder.');

    } catch (error) {
      console.error('❌ [PaymentPolicy] Erro ao solicitar desconto:', error);
      alert('❌ Erro ao enviar solicitação. Tente novamente.');
      setAguardandoAprovacao(false);
      setModalSolicitacaoOpen(false);
    }
  };

  // Hook para forçar atualização do componente
  const [_, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Função para verificar status manualmente
  const handleVerificarStatus = async () => {
    if (!solicitacaoId) return;

    try {
      console.log('🔄 [PaymentPolicy] Verificando status da solicitação:', solicitacaoId);
      
      const solicitacao = await db.getSolicitacaoPorId(solicitacaoId);
      
      if (solicitacao.status === 'aprovado') {
        console.log('✅ [PaymentPolicy] Desconto aprovado:', solicitacao.desconto_aprovado, '% (não exibido ao vendedor)');

        const extraValorNum = parseFloat(extraValor) || 0;
        
        // Atualiza o estado local com o desconto aprovado
        setDescontoVendedor(solicitacao.desconto_aprovado);
        
        // Força o recálculo do pagamento com o novo desconto
        if (!planoSelecionado) {
          console.warn('⚠️ [PaymentPolicy] Plano não selecionado, não é possível recalcular');
          alert('⚠️ Por favor, selecione um plano de pagamento antes de aplicar o desconto.');
          return;
        }

        const r = calcularPagamento({
          precoBase: precoBase,
          plan: planoSelecionado,
          dataEmissaoNF: new Date(),
        });

        // Aplica desconto do vendedor aprovado
        const descontoExtraValor = precoBase * (solicitacao.desconto_aprovado / 100);
        const valorAposExtra = r.valorAjustado - descontoExtraValor;

        // Calcula frete
        const valorFrete = tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega
          ? (tipoEntrega === 'prioridade'
            ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
            : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0))
          : 0;

        // Calcula instalação
        const valorInstalacao = tipoCliente === 'cliente' && instalacao === 'incluso'
          ? (temGSI ? 6350 : temGSE ? 7500 : 0)
          : 0;

        const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;

        // Calcular campos de entrada para o PDF
        const valorSinalNum = parseFloat(valorSinal) || 0;
        
        // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
        const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
        const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
        
        const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
        
        // CORREÇÃO: Saldo a pagar = Valor Final - Entrada
        const saldoAPagarCalc = valorFinal - entradaTotalCalc;

        // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
        const numParcelas = r.parcelas?.length || 1;
        const valorParcela = saldoAPagarCalc / numParcelas;
        
        console.log('🔢 [PaymentPolicy - VERIFICAÇÃO] CÁLCULO DE PARCELAS:');
        console.log('   Valor Final:', valorFinal);
        console.log('   Entrada Total:', entradaTotalCalc);
        console.log('   Saldo a Pagar:', saldoAPagarCalc);
        console.log('   Número de Parcelas:', numParcelas);
        console.log('   Valor por Parcela:', valorParcela);
        
        let somaAcumulada = 0;
        const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
          const isUltima = idx === numParcelas - 1;
          const valor = isUltima 
            ? Math.round((saldoAPagarCalc - somaAcumulada) * 100) / 100
            : Math.round(valorParcela * 100) / 100;
          somaAcumulada += valor;
          console.log(`   Parcela ${idx + 1}:`, valor);
          return {
            ...parcela,
            valor
          };
        }) || [];
        
        console.log('   Total das Parcelas:', parcelasCorrigidas.reduce((acc, p) => acc + p.valor, 0));

        const novoResultado = {
          ...r,
          precoBase: precoBase,
          descontoAdicionalValor: descontoExtraValor,
          valorFinalComDescontoAdicional: valorAposExtra,
          extraDescricao: extraDescricao || '',
          extraValor: extraValorNum,
          valorFrete,
          valorInstalacao,
          total: valorFinal,
          valorFinal, // Adicionar também como valorFinal
          financiamentoBancario: percentualEntrada === 'financiamento' ? 'sim' : 'nao',
          
          // Campos em percentual para o PDF
          desconto: solicitacao.desconto_aprovado, // % do desconto aprovado
          acrescimo: (planoSelecionado?.surcharge_percent || 0) * 100,
          
          // Campos de entrada
          percentualEntrada: percentualEntradaNum,
          entradaTotal: entradaTotalCalc,
          valorSinal: valorSinalNum,
          faltaEntrada: faltaEntradaCalc,
          saldoAPagar: saldoAPagarCalc,
          formaEntrada: formaEntrada || '',
          
          // CORREÇÃO: Usar parcelas recalculadas
          parcelas: parcelasCorrigidas,
          saldo: saldoAPagarCalc,
          
          tipoCliente,
          participacaoRevenda,
          tipoIE,
          instalacao,
          tipoFrete,
          localInstalacao,
          tipoEntrega,
          tipoPagamento: tipoCliente,
          tipoInstalacao: instalacao === 'incluso' ? 'Incluso no pedido' : 
                          instalacao === 'cliente' ? 'cliente paga direto' : '',
          revendaTemIE: tipoIE === 'produtor' ? 'sim' : 
                        tipoIE === 'cnpj_cpf' ? 'nao' : '',
          prazoPagamento: planoSelecionado?.description || '',
        };
        
        // Atualiza o estado com o novo resultado
        setResultado(novoResultado);
        
        // Fecha o modal e limpa os estados
        setAguardandoAprovacao(false);
        setModalSolicitacaoOpen(false);
        setSolicitacaoId(null);
        
        // Força uma nova renderização do componente
        forceUpdate();
        
        // Mostra notificação de sucesso (sem mostrar o percentual exato)
        alert(`✅ Desconto aprovado por ${solicitacao.aprovador_nome}!\n\nValor atualizado com sucesso. Você pode continuar preenchendo a proposta.`);
        
      } else if (solicitacao.status === 'negado') {
        console.log('❌ [PaymentPolicy] Solicitação negada');
        setAguardandoAprovacao(false);
        setModalSolicitacaoOpen(false);
        setSolicitacaoId(null);
        alert(`❌ Solicitação negada por ${solicitacao.aprovador_nome}.${solicitacao.observacao_gestor ? '\n\nMotivo: ' + solicitacao.observacao_gestor : ''}`);
      } else {
        alert('⏳ Solicitação ainda está pendente.\n\nO gestor ainda não respondeu.');
      }
    } catch (error) {
      console.error('❌ [PaymentPolicy] Erro ao verificar status:', error);
      alert('❌ Erro ao verificar status. Tente novamente.');
      setAguardandoAprovacao(false);
    }
  };

  // =============== CALCULAR VALOR FLUTUANTE EM TEMPO REAL ========
  const valorFlutuante = useMemo(() => {
    let valor = precoBase;
    const extraValorNum = parseFloat(extraValor) || 0;

    // Aplicar desconto do plano (se houver)
    if (resultado?.descontoValor) {
      valor -= resultado.descontoValor;
    }

    // Aplicar acréscimo do plano (se houver)
    if (resultado?.acrescimoValor) {
      valor += resultado.acrescimoValor;
    }

    // Aplicar desconto do vendedor
    if (descontoVendedor > 0) {
      valor -= (precoBase * (descontoVendedor / 100));
    }

    // Adicionar extra (não sofre desconto)
    if (extraValorNum > 0) {
      valor += extraValorNum;
    }

    // Adicionar frete (se incluso)
    if (valorFreteCalculado > 0) {
      valor += valorFreteCalculado;
    }

    // Adicionar instalação (quando incluso na proposta)
    if (instalacao === 'incluso') {
      valor += (temGSI ? 6350 : temGSE ? 7500 : 0);
    }

    return valor;
  }, [precoBase, resultado, descontoVendedor, extraValor, valorFreteCalculado, instalacao, temGSE, temGSI, tipoCliente]);

  const moedaResumo = useMemo(() => {
    if (!isVendedorExterior) return 'BRL';
    return 'USD';
  }, [isVendedorExterior]);

  const valorFlutuanteUSD = useMemo(() => {
    if (!isVendedorExterior) return 0;
    const c = Number(cotacaoUSD);
    if (!Number.isFinite(c) || c <= 0) return 0;
    return valorFlutuante / c;
  }, [isVendedorExterior, cotacaoUSD, valorFlutuante]);

  // =============== RENDER ========================================
  const etapasVisiveis = modoConcessionaria ? [6, 7] : [1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    if (!modoConcessionaria) return;
    setTipoCliente('revenda');
    setParticipacaoRevenda('nao');
    setTipoIE('produtor');
    setInstalacao('');
    setTipoFrete('FOB');
    setLocalInstalacao('Concessionária');
    setTipoEntrega('');
    setEtapa(6);
  }, [modoConcessionaria]);

  useEffect(() => {
    if (!modoConcessionaria) return;
    setDescontoVendedor(Number(descontoConcessionaria) || 0);
  }, [modoConcessionaria, descontoConcessionaria]);

  return (
    <div className="payment-policy">
      {/* Card Flutuante de Valor em Tempo Real */}
      <div className="floating-price-card">
        <div className="floating-price-header">
          <span className="floating-price-icon">💰</span>
          <span className="floating-price-title">Valor em Tempo Real</span>
        </div>

        <div className="floating-price-value">
          <span className="price">{isVendedorExterior ? formatCurrencyUSD(valorFlutuanteUSD) : formatCurrency(valorFlutuante)}</span>
          {isVendedorExterior && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Câmbio: 1 USD = {formatCurrency(Number(cotacaoUSD) || 0)}
            </div>
          )}
        </div>

        <div className="floating-price-breakdown">
          <div className="breakdown-line">
            <span>Base:</span>
            <span>{formatCurrency(precoBase)}</span>
          </div>

          {resultado?.descontoValor > 0 && (
            <div className="breakdown-line discount">
              <span>- Desconto plano:</span>
              <span>{formatCurrency(resultado.descontoValor)}</span>
            </div>
          )}

          {resultado?.acrescimoValor > 0 && (
            <div className="breakdown-line addition">
              <span>+ Acréscimo:</span>
              <span>{formatCurrency(resultado.acrescimoValor)}</span>
            </div>
          )}

          {descontoVendedor > 0 && (
            <div className="breakdown-line discount">
              <span>- Desconto vendedor ({descontoVendedor}%):</span>
              <span>{formatCurrency(precoBase * (descontoVendedor / 100))}</span>
            </div>
          )}

          {parseFloat(extraValor) > 0 && (
            <div className="breakdown-line addition">
              <span>+ Extra{extraDescricao ? ` (${extraDescricao})` : ''}:</span>
              <span>{formatCurrency(parseFloat(extraValor) || 0)}</span>
            </div>
          )}

          {tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega && (
            <div className="breakdown-line addition">
              <span>+ Frete:</span>
              <span>
                {formatCurrency(
                  tipoEntrega === 'prioridade'
                    ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
                    : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0)
                )}
              </span>
            </div>
          )}

          {tipoCliente === 'cliente' && instalacao === 'incluso' && (
            <div className="breakdown-line addition">
              <span>+ Instalação:</span>
              <span>{formatCurrency(temGSI ? 6350 : temGSE ? 7500 : 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
    <div className="pp-stepper">
      {etapasVisiveis.map(n => (
        <div
          key={n}
          className={`pp-step ${etapa === n ? 'active' : etapa > n ? 'done' : ''}`}
          onClick={() => setEtapa(n)}
          title={
            n===1?'Tipo de Cliente':
            n===2?'Participação & IE':
            n===3?'Instalação':
            n===4?'Frete':
            n===5?'Local & Entrega':
            n===6?'Entrada & Plano':
            'Resumo'
          }
        >
          <span>{modoConcessionaria ? (n === 6 ? 'P' : 'R') : n}</span>
        </div>
      ))}
    </div>

    {/* 1) Tipo de Cliente */}
    {!modoConcessionaria && etapa === 1 && (
      <section className="payment-section">
        <h3>1) Tipo de Cliente</h3>
        <div className="radio-group">
          <label className={`radio-option ${tipoCliente === 'cliente' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="tipoCliente"
              value="cliente"
              checked={tipoCliente === 'cliente'}
              onChange={() => setTipoCliente('cliente')}
            />
            <span>Cliente</span>
          </label>
          <label className={`radio-option ${tipoCliente === 'revenda' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="tipoCliente"
              value="revenda"
              checked={tipoCliente === 'revenda'}
              onChange={() => setTipoCliente('revenda')}
            />
            <span>Revenda</span>
          </label>
        </div>

        <div className="payment-navigation">
          <button className="payment-nav-btn" disabled={!podeIrEtapa2} onClick={next}>Continuar</button>
        </div>
      </section>
    )}

    {/* 2) Participação & Escolha de Cliente (só faz sentido para Cliente) */}
    {!modoConcessionaria && etapa === 2 && (
      <section className="payment-section">
        <h3>2) Participação da Revenda & Escolha de Cliente</h3>

        {tipoCliente === 'cliente' ? (
          <>
            <div className="form-group">
              <label>Há Participação de Revenda? *</label>
              <div className="radio-group">
                <label className={`radio-option ${participacaoRevenda === 'sim' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="participacao"
                    value="sim"
                    checked={participacaoRevenda === 'sim'}
                    onChange={() => setParticipacaoRevenda('sim')}
                  />
                  <span>Sim</span>
                </label>
                <label className={`radio-option ${participacaoRevenda === 'nao' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="participacao"
                    value="nao"
                    checked={participacaoRevenda === 'nao'}
                    onChange={() => setParticipacaoRevenda('nao')}
                  />
                  <span>Não</span>
                </label>
              </div>
            </div>

            {!!participacaoRevenda && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Escolha Cliente*</label>
                <div className="radio-group">
                  {/* Produtor rural SEMPRE disponível */}
                  <label className={`radio-option ${tipoIE === 'produtor' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="tipoIE"
                      value="produtor"
                      checked={tipoIE === 'produtor'}
                      onChange={() => setTipoIE('produtor')}
                    />
                    <span>Produtor rural</span>
                  </label>

                  {/* CNPJ/CPF: some quando a regra do diagrama manda travar */}
                  {!travaIEProdutor && (
                    <label className={`radio-option ${tipoIE === 'cnpj_cpf' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="tipoIE"
                        value="cnpj_cpf"
                        checked={tipoIE === 'cnpj_cpf'}
                        onChange={() => setTipoIE('cnpj_cpf')}
                      />
                      <span>CNPJ</span>
                    </label>
                  )}
                </div>

                {travaIEProdutor && (
                  <div className="pp-banner warn" style={{ marginTop: '12px' }}>
                    {temGSE ? 'GSE detectado' : 'GSI detectado'} com Participação de Revenda: somente <b>Produtor rural</b> é permitido nesta condição.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="pp-banner ok">Cliente do tipo <b>Revenda</b> não exige definição de IE nesta etapa.</div>
        )}

        <div className="payment-navigation">
          <button className="payment-nav-btn" onClick={prev}>Voltar</button>
          <button className="payment-nav-btn" disabled={!podeIrEtapa3} onClick={next}>Continuar</button>
        </div>
      </section>
    )}

    {/* 3) Instalação */}
    {!modoConcessionaria && etapa === 3 && (
      <section className="payment-section">
        <h3>3) Instalação</h3>

        {tipoCliente === 'revenda' && (
          <div className="pp-banner ok" style={{ marginBottom: '12px' }}>
            ℹ️ <b>Revenda: instalação é opcional</b>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', opacity: 0.9 }}>
              Se desejar, você pode incluir a instalação na proposta.
            </p>
          </div>
        )}

        <div className="radio-group">
          <label className={`radio-option ${instalacao === 'cliente' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="instalacao"
              value="cliente"
              checked={instalacao === 'cliente'}
              onChange={() => setInstalacao('cliente')}
            />
            <span>Cliente paga direto</span>
          </label>
          <label className={`radio-option ${instalacao === 'incluso' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="instalacao"
              value="incluso"
              checked={instalacao === 'incluso'}
              onChange={() => setInstalacao('incluso')}
            />
            <span>Incluso no pedido</span>
          </label>
        </div>

        {instalacao === 'cliente' && (
          <div className="pp-banner warn" style={{ marginTop: '12px' }}>
            ℹ️ Cliente pagará instalação diretamente ao instalador:
            <b> {formatCurrency(temGSI ? 5500 : temGSE ? 6500 : 0)}</b>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', opacity: 0.9 }}>
              Este valor NÃO será incluído no pedido
            </p>
          </div>
        )}

        {instalacao === 'incluso' && (
          <div className="pp-banner ok" style={{ marginTop: '12px' }}>
            Valor da instalação será adicionado ao total:
            <b> {formatCurrency(temGSI ? 6350 : temGSE ? 7500 : 0)}</b>
          </div>
        )}

        <div className="payment-navigation">
          <button className="payment-nav-btn" onClick={prev}>Voltar</button>
          <button className="payment-nav-btn" disabled={!podeIrEtapa4} onClick={next}>Continuar</button>
        </div>
      </section>
    )}

    {/* 4) Organização do Frete */}
    {!modoConcessionaria && etapa === 4 && (
      <section className="payment-section">
        <h3>4) Organização do Frete</h3>
        <div className="radio-group">
          <label className={`radio-option ${tipoFrete === 'FOB' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="frete"
              value="FOB"
              checked={tipoFrete === 'FOB'}
              onChange={() => setTipoFrete('FOB')}
            />
            <span>Cliente organiza o frete</span>
            <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
              Cliente busca o equipamento ou contrata transportadora
            </small>
          </label>
          <label className={`radio-option ${tipoFrete === 'CIF' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="frete"
              value="CIF"
              checked={tipoFrete === 'CIF'}
              onChange={() => setTipoFrete('CIF')}
            />
            <span>Frete incluso no pedido</span>
            <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
              Selecione o tipo de entrega na próxima etapa
            </small>
          </label>
        </div>

        <div className="payment-navigation">
          <button className="payment-nav-btn" onClick={prev}>Voltar</button>
          <button className="payment-nav-btn" disabled={!tipoFrete} onClick={next}>Continuar</button>
        </div>
      </section>
    )}

    {/* 5) Local de Instalação & Tipo de Entrega */}
    {!modoConcessionaria && etapa === 5 && (
      <section className="payment-section">
        <h3>5) Local & Tipo de Entrega</h3>

        {/* Local de Instalação - SEMPRE obrigatório */}
        <div className="form-row">
          <div className="form-group">
            <label>UF (filtro)</label>
            <select value={ufFiltroInstalacao} onChange={e => setUfFiltroInstalacao(e.target.value)}>
              <option value="">Todas</option>
              {ufsDisponiveis.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Buscar</label>
            <input
              type="text"
              value={buscaInstalacao}
              onChange={e => setBuscaInstalacao(e.target.value)}
              placeholder="Cidade, oficina ou UF"
              maxLength={60}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Local de Instalação *</label>
          <select value={localInstalacao} onChange={e => setLocalInstalacao(e.target.value)}>
            <option value="">Selecione...</option>
            {pontosInstalacaoFiltrados.map((p, idx) => {
              const uf = String(p?.uf || '').trim().toUpperCase();
              const cidade = String(p?.cidade || '').trim();
              const oficina = String(p?.oficina || p?.nome || '').trim();

              const value = p.nome || `${oficina} - ${cidade}/${uf}`;
              const label = cidade && uf
                ? `${cidade}/${uf} — ${oficina || 'OFICINA'}`
                : (p.nome || `${oficina} - ${cidade}/${uf}`);

              return (
                <option key={p.id || idx} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
          <small className="form-help help-info">
            {pontosInstalacao.length === 0 
              ? '⚠️ Nenhum ponto de instalação disponível para sua região'
              : `${pontosInstalacaoFiltrados.length} ponto(s) disponível(is)${ufFiltroInstalacao ? ` em ${ufFiltroInstalacao}` : ''}`}
          </small>
        </div>

        {/* Tipo de Entrega - Apenas quando frete incluso */}
        {tipoFrete === 'CIF' ? (
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Tipo de Entrega *</label>
            <select value={tipoEntrega} onChange={e => setTipoEntrega(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="prioridade">
                ⚡ Prioridade (carga exclusiva)
                {dadosFreteAtual?.valor_prioridade ? ` - ${formatCurrency(dadosFreteAtual.valor_prioridade)}` : ''}
              </option>
              <option value="reaproveitamento">
                ♻️ Reaproveitamento (quando fechar carga)
                {dadosFreteAtual?.valor_reaproveitamento ? ` - ${formatCurrency(dadosFreteAtual.valor_reaproveitamento)}` : ''}
              </option>
            </select>
            {!dadosFreteAtual && localInstalacao && (
              <small className="form-help help-warn">
                ⚠️ Valores de frete não disponíveis para este local
              </small>
            )}
          </div>
        ) : (
          <div className="pp-banner ok" style={{ marginTop: '16px' }}>
            🚚 Cliente responsável por organizar transporte até <b>{localInstalacao || '[selecione o local]'}</b>
          </div>
        )}

        <div className="payment-navigation">
          <button className="payment-nav-btn" onClick={prev}>Voltar</button>
          <button
            className="payment-nav-btn"
            disabled={!podeIrEtapa5}
            onClick={next}
          >
            Continuar
          </button>
        </div>
      </section>
    )}

    {/* 6) Entrada, Financiamento e Plano */}
    {etapa === 6 && (
      <section className="payment-section">
        <h3>6) Entrada & Plano</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Percentual de Entrada *</label>
            <select
              value={percentualEntrada}
              onChange={e => setPercentualEntrada(e.target.value)}
            >
              <option value="">Selecione...</option>
              {(entradaOpcoes || ['30', '50', 'financiamento'])
                .filter(v => permiteFinanciamento ? true : v !== 'financiamento')
                .map(v => (
                  v === 'financiamento'
                    ? <option key="financiamento" value="financiamento">🏦 Financiamento Bancário</option>
                    : <option key={v} value={v}>{v}%</option>
                ))}
            </select>
          </div>

          {percentualEntrada && percentualEntrada !== 'financiamento' && (
            <>
              <div className="form-group">
                <label>Valor do Sinal</label>
                <input
                  type="number"
                  value={valorSinal}
                  onChange={e => setValorSinal(e.target.value)}
                  placeholder="R$"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label>Forma de Pagamento da Entrada</label>
                <select
                  value={formaEntrada}
                  onChange={e => setFormaEntrada(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">BOLETO</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="DINHEIRO">DINHEIRO</option>
                  <option value="CARTÃO">CARTÃO</option>
                  {formaEntrada && !['PIX', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'CARTÃO'].includes(formaEntrada) && (
                    <option value={formaEntrada}>{`OUTRO (${formaEntrada})`}</option>
                  )}
                </select>
                <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.85em' }}>
                  💡 Informe como o cliente pagará a entrada (opcional)
                </small>
              </div>
            </>
          )}

          {percentualEntrada && (
            <>
              <div className="form-group">
                <label>Descrição do Extra (opcional)</label>
                <input
                  type="text"
                  value={extraDescricao}
                  onChange={e => setExtraDescricao(e.target.value)}
                  placeholder="Ex: Lança 3m"
                  maxLength="80"
                />
              </div>

              <div className="form-group">
                <label>Valor do Extra (R$)</label>
                <input
                  type="number"
                  value={extraValor}
                  onChange={e => setExtraValor(e.target.value)}
                  placeholder="R$"
                  min="0"
                  step="0.01"
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.85em' }}>
                  💡 Este valor será somado ao total (não sofre desconto)
                </small>
              </div>
            </>
          )}
        </div>

        <div className="form-group" style={{ marginTop: '10px' }}>
          <label>Observações da Negociação (opcional)</label>
          <textarea
            value={observacoesNegociacao}
            onChange={e => setObservacoesNegociacao(e.target.value)}
            placeholder="Ex: Condição especial acordada, carência, observações sobre financiamento, etc."
            rows={3}
            maxLength={500}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {percentualEntrada !== 'financiamento' && (
          <>
            <div className="form-group">
              <label>Plano de Pagamento *</label>
              <select
                value={planoSelecionado ? `${planoSelecionado.order}::${planoSelecionado.description}` : ''}
                onChange={e => {
                  const v = e.target.value || '';
                  if (!v) {
                    setPlanoSelecionado(null);
                    onPlanSelected?.(null);
                    return;
                  }

                  const [orderStr, ...descParts] = v.split('::');
                  const order = parseInt(orderStr, 10);
                  const description = descParts.join('::');

                  const p = planosFiltrados.find(pl => pl.order === order && pl.description === description) || null;
                  setPlanoSelecionado(p);
                  onPlanSelected?.(p);
                }}
              >
                <option value="">Selecione...</option>
                {planosFiltrados.map(p => (
                  <option key={`${p.audience}-${p.order}-${p.description}`} value={`${p.order}::${p.description}`}>
                    {getPlanLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

          <div className="form-group">
            <label>Desconto Adicional do Vendedor</label>
                
                {/* GSI - REVENDA */}
                {temGSI && tipoCliente === 'revenda' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '14px', color: '#495057' }}>Desconto padrão (1 unidade):</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(valor => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setDescontoVendedor(valor)}
                          style={{
                            padding: '10px 20px',
                            border: descontoVendedor === valor ? '2px solid #007bff' : '2px solid #dee2e6',
                            background: descontoVendedor === valor ? '#007bff' : '#fff',
                            color: descontoVendedor === valor ? '#fff' : '#495057',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: descontoVendedor === valor ? '600' : '500',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#007bff';
                              e.currentTarget.style.background = '#f8f9fa';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#dee2e6';
                              e.currentTarget.style.background = '#fff';
                            }
                          }}
                        >
                          {valor}%
                        </button>
                      ))}
                    </div>
                    
                    <div style={{ 
                      borderTop: '1px solid #dee2e6', 
                      paddingTop: '16px', 
                      marginTop: '8px',
                      marginBottom: '12px'
                    }}>
                      <strong style={{ fontSize: '14px', color: '#495057' }}>Descontos especiais por quantidade:</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setDescontoVendedor(14)}
                        style={{
                          padding: '12px 24px',
                          border: descontoVendedor === 14 ? '2px solid #28a745' : '2px solid #dee2e6',
                          background: descontoVendedor === 14 ? '#28a745' : '#fff',
                          color: descontoVendedor === 14 ? '#fff' : '#495057',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (descontoVendedor !== 14) {
                            e.currentTarget.style.borderColor = '#28a745';
                            e.currentTarget.style.background = '#f8f9fa';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (descontoVendedor !== 14) {
                            e.currentTarget.style.borderColor = '#dee2e6';
                            e.currentTarget.style.background = '#fff';
                          }
                        }}
                      >
                        <span>14%</span>
                        <span style={{ fontSize: '12px', opacity: 0.9 }}>📦 2 unidades</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setDescontoVendedor(15)}
                        style={{
                          padding: '12px 24px',
                          border: descontoVendedor === 15 ? '2px solid #28a745' : '2px solid #dee2e6',
                          background: descontoVendedor === 15 ? '#28a745' : '#fff',
                          color: descontoVendedor === 15 ? '#fff' : '#495057',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (descontoVendedor !== 15) {
                            e.currentTarget.style.borderColor = '#28a745';
                            e.currentTarget.style.background = '#f8f9fa';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (descontoVendedor !== 15) {
                            e.currentTarget.style.borderColor = '#dee2e6';
                            e.currentTarget.style.background = '#fff';
                          }
                        }}
                      >
                        <span>15%</span>
                        <span style={{ fontSize: '12px', opacity: 0.9 }}>📦 3+ unidades</span>
                      </button>
                    </div>
                    <small className="form-help help-info" style={{ display: 'block', marginTop: '12px' }}>
                      ℹ️ Selecione o desconto conforme a quantidade de equipamentos
                    </small>
                  </div>
                )}

                {/* CLIENTE SEM PARTICIPAÇÃO REVENDA */}
                {(temGSI || temGSE) && tipoCliente === 'cliente' && participacaoRevenda === 'nao' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {((descontosBotoes || (temGSI ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 0.5, 1, 1.5, 2, 2.5, 3])))
                        .map(valor => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setDescontoVendedor(valor)}
                          style={{
                            padding: '10px 20px',
                            border: descontoVendedor === valor ? '2px solid #007bff' : '2px solid #dee2e6',
                            background: descontoVendedor === valor ? '#007bff' : '#fff',
                            color: descontoVendedor === valor ? '#fff' : '#495057',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: descontoVendedor === valor ? '600' : '500',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#007bff';
                              e.currentTarget.style.background = '#f8f9fa';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#dee2e6';
                              e.currentTarget.style.background = '#fff';
                            }
                          }}
                        >
                          {valor}%
                        </button>
                      ))}
                      
                      {/* Botão [+] para solicitar desconto adicional */}
                      {/* Botão movido para baixo para aparecer em todos os cenários */}
                    </div>
                    <small className="form-help help-info" style={{ display: 'block', marginTop: '12px' }}>
                      ℹ️ Para solicitar desconto adicional, clique em [+]
                    </small>
                  </div>
                )}

                {/* GSI - CLIENTE COM PARTICIPAÇÃO REVENDA (PRODUTOR RURAL) */}
                {temGSI && tipoCliente === 'cliente' && participacaoRevenda === 'sim' && tipoIE === 'produtor' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[0, 1, 2, 3, 4, 5].map(valor => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setDescontoVendedor(valor)}
                          style={{
                            padding: '10px 20px',
                            border: descontoVendedor === valor ? '2px solid #007bff' : '2px solid #dee2e6',
                            background: descontoVendedor === valor ? '#007bff' : '#fff',
                            color: descontoVendedor === valor ? '#fff' : '#495057',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: descontoVendedor === valor ? '600' : '500',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#007bff';
                              e.currentTarget.style.background = '#f8f9fa';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (descontoVendedor !== valor) {
                              e.currentTarget.style.borderColor = '#dee2e6';
                              e.currentTarget.style.background = '#fff';
                            }
                          }}
                        >
                          {valor}%
                        </button>
                      ))}
                    </div>
                    <small className="form-help help-info" style={{ display: 'block', marginTop: '12px' }}>
                      ℹ️ Desconto máximo: 5%
                    </small>
                  </div>
                )}

                {/* GSE - CLIENTE COM PARTICIPAÇÃO REVENDA: SEM DESCONTO */}
                {temGSE && tipoCliente === 'cliente' && participacaoRevenda === 'sim' && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                      ℹ️ Não há desconto disponível para GSE com participação de revenda
                    </p>
                  </div>
                )}

                {/* Botão [+] para solicitar desconto adicional (sempre disponível, exceto concessionária) */}
                {!isConcessionariaUser && permiteSolicitarDescontoExtra && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setModalSolicitacaoOpen(true)}
                      disabled={aguardandoAprovacao}
                      style={{
                        padding: '10px 20px',
                        border: '2px dashed #667eea',
                        background: aguardandoAprovacao ? '#f8f9fa' : '#fff',
                        color: aguardandoAprovacao ? '#6c757d' : '#667eea',
                        borderRadius: '6px',
                        cursor: aguardandoAprovacao ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => {
                        if (!aguardandoAprovacao) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.background = '#f0f3ff';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!aguardandoAprovacao) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.background = '#fff';
                        }
                      }}
                      title="Solicitar desconto extra"
                    >
                      {aguardandoAprovacao ? '⏳' : '+'} {aguardandoAprovacao ? 'Aguardando...' : 'Solicitar desconto'}
                    </button>
                    <small className="form-help help-info" style={{ display: 'block', marginTop: '10px' }}>
                      ℹ️ Use este botão para solicitar aprovação de um desconto fora do padrão.
                    </small>
                  </div>
                )}
              </div>

          {percentualEntrada === 'financiamento' && (
            <div className="pp-banner ok" style={{ marginTop: 12 }}>
              🏦 Financiamento bancário selecionado — condições definidas pelo banco.
            </div>
          )}

          <div className="payment-navigation">
            <button className="payment-nav-btn" onClick={prev}>Voltar</button>
            <button
              className="payment-nav-btn"
              disabled={!podeIrEtapa6 || !(percentualEntrada && (percentualEntrada === 'financiamento' || planoSelecionado))}
              onClick={next}
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* 7) Resumo */}
      {etapa === 7 && (
        <section className="payment-section">
          <h3>7) Resumo</h3>

          {resultado ? (
            <div className="summary-card">
              <div className="summary-header">
                <h4>📊 Informações do Pagamento</h4>
              </div>
              <div className="summary-content">
                <div className="summary-item">
                  <span className="summary-label">Preço Base</span>
                  <span className="summary-value">{formatCurrency(precoBase)}</span>
                </div>

                {resultado.descontoValor > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Desconto da Condição</span>
                    <span className="summary-value">- {formatCurrency(resultado.descontoValor)}</span>
                  </div>
                )}

                {resultado.acrescimoValor > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Acréscimo</span>
                    <span className="summary-value">+ {formatCurrency(resultado.acrescimoValor)}</span>
                  </div>
                )}

                {descontoVendedor > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Desconto do Vendedor ({descontoVendedor}%)</span>
                    <span className="summary-value">- {formatCurrency(precoBase * (descontoVendedor / 100))}</span>
                  </div>
                )}

                {parseFloat(extraValor) > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Extra{extraDescricao ? ` (${extraDescricao})` : ''}</span>
                    <span className="summary-value">+ {formatCurrency(parseFloat(extraValor) || 0)}</span>
                  </div>
                )}

                {tipoCliente === 'cliente' && instalacao === 'incluso' && (
                  <div className="summary-item">
                    <span className="summary-label">Instalação</span>
                    <span className="summary-value">+ {formatCurrency(temGSI ? 6350 : temGSE ? 7500 : 0)}</span>
                  </div>
                )}

                {tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega && (
                  <div className="summary-item">
                    <span className="summary-label">Frete</span>
                    <span className="summary-value">+ {formatCurrency(
                      tipoEntrega === 'prioridade'
                        ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
                        : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0)
                    )}</span>
                  </div>
                )}

                <div className="summary-item">
                  <span className="summary-label">Total</span>
                  <span className="summary-value">{formatCurrency(valorFlutuante)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pp-banner warn">Complete as etapas para gerar o resumo.</div>
          )}

          {percentualEntrada !== 'financiamento' && !planoSelecionado && (
            <div className="pp-banner warn" style={{ marginBottom: '16px' }}>
              ⚠️ Selecione um plano de pagamento na etapa 7 para continuar
            </div>
          )}
          
          <div className="payment-navigation">
            <button className="payment-nav-btn" onClick={prev}>Voltar</button>
            <button 
              className="payment-nav-btn primary" 
              onClick={() => {
                console.log('🔘 Botão "Continuar para Dados do Cliente" clicado');
                console.log('📊 Resultado:', resultado);
                console.log('🎯 onFinish existe?', !!onFinish);
                if (onFinish) {
                  console.log('✅ Chamando onFinish...');
                  onFinish(resultado);
                } else {
                  console.warn('⚠️ onFinish não está definido!');
                }
              }}
              disabled={!resultado || (percentualEntrada !== 'financiamento' && !planoSelecionado)}
            >
              Continuar para Dados do Cliente →
            </button>
          </div>
        </section>
      )}

      {/* Modal de Solicitação de Desconto */}
      {!isConcessionariaUser && permiteSolicitarDescontoExtra && (
        <SolicitarDescontoModal
          isOpen={modalSolicitacaoOpen}
          onClose={() => {
            if (!aguardandoAprovacao) {
              setModalSolicitacaoOpen(false);
            }
          }}
          onSolicitar={handleSolicitarDesconto}
          onVerificarStatus={handleVerificarStatus}
          equipamentoDescricao={(() => {
            const equipamento = itens[0];
            return equipamento 
              ? `${equipamento.subgrupo || ''} ${equipamento.modelo || ''}`.trim()
              : 'Equipamento não identificado';
          })}
          valorBase={precoBase}
          descontoAtual={descontoVendedor || 7}
          isLoading={aguardandoAprovacao}
        />
      )}
    </div>
  );
}
