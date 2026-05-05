import React, { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { calcularPagamento } from '../../lib/payments';
import { formatCurrency } from '../../utils/formatters';
import { db, supabase } from '../../config/supabase';
import { useFretes } from '../../hooks/useFretes';
import { temControleRemoto } from '../../utils/guindasteHelper';
import { normalizarRegiao } from '../../utils/regiaoHelper';
import { getPaymentPlans, getPlanLabel } from '../../services/paymentPlans';
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
  caminhaoData = {}, // Dados do caminhão (para calcular conversor de voltagem)
  initialPaymentData = null, // Dados salvos para restauração (modo edição)
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

  // Detecta região Comércio Exterior tanto pelo tipo do usuário quanto pela região selecionada
  const isComercioExterior = useMemo(() => {
    if (isVendedorExterior) return true;
    return normalizarRegiao(regiaoClienteSelecionada) === 'comercio-exterior';
  }, [isVendedorExterior, regiaoClienteSelecionada]);

  // =============== DERIVAÇÃO DE PRODUTOS (GSE/GSI) ===============
  const itens = useMemo(() => (carrinho?.length ? carrinho : equipamentos || []), [carrinho, equipamentos]);

  const totalGuindastes = useMemo(() => {
    return (itens || [])
      .filter(i => i?.tipo === 'guindaste')
      .reduce((acc, i) => acc + (parseInt(i?.quantidade, 10) || 1), 0);
  }, [itens]);

  const descontoQuantidadePercent = useMemo(() => {
    if (!modoConcessionaria) return 0;
    if (totalGuindastes < 2) return 0;
    // 2% por unidade adicional: 2 unidades = 2%, 3 = 4%, 4 = 6%, etc
    return (totalGuindastes - 1) * 0.02;
  }, [modoConcessionaria, totalGuindastes]);

  const precoBaseAjustado = useMemo(() => {
    const base = Number(precoBase) || 0;
    const fator = 1 - (Number(descontoQuantidadePercent) || 0);
    return Math.max(0, base * fator);
  }, [precoBase, descontoQuantidadePercent]);

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

  const instalacaoClienteValor = useMemo(() => {
    if (guindasteDoPedido?.valor_instalacao_cliente != null) return Number(guindasteDoPedido.valor_instalacao_cliente);
    return temGSI ? 5500 : temGSE ? 6500 : 0;
  }, [guindasteDoPedido, temGSI, temGSE]);

  const instalacaoInclusoValor = useMemo(() => {
    if (guindasteDoPedido?.valor_instalacao_incluso != null) return Number(guindasteDoPedido.valor_instalacao_incluso);
    return temGSI ? 6350 : temGSE ? 7500 : 0;
  }, [guindasteDoPedido, temGSI, temGSE]);

  const bloquearDesconto = useMemo(() => !!guindasteDoPedido?.bloquear_desconto, [guindasteDoPedido]);

  useEffect(() => {
    if (bloquearDesconto) setDescontoVendedor(0);
  }, [bloquearDesconto]);

  // Calcular valor do conversor de voltagem (Caminhão 12V = +R$ 450)
  const valorConversor = useMemo(() => {
    // Caminhão 12V exige conversor de voltagem
    if (caminhaoData?.voltagem === '12V') {
      return 450;
    }
    return 0;
  }, [caminhaoData?.voltagem]);

  // =============== ESTADO PRINCIPAL (7 ETAPAS) ===================
  const [etapa, setEtapa] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?.tipo === 'vendedor_exterior') return 3;
    } catch {}
    if (normalizarRegiao(regiaoClienteSelecionada) === 'comercio-exterior') return 3;
    return 1;
  });
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false);

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

  // =============== RESTAURAÇÃO DE DADOS (MODO EDIÇÃO) =============
  useEffect(() => {
    if (!initialPaymentData || hasRestoredRef.current || modoConcessionaria) return;

    isRestoringRef.current = true;
    hasRestoredRef.current = true;

    // Restaurar todos os estados internos de uma vez
    if (initialPaymentData.tipoCliente) setTipoCliente(initialPaymentData.tipoCliente);
    if (initialPaymentData.participacaoRevenda) setParticipacaoRevenda(initialPaymentData.participacaoRevenda);
    if (initialPaymentData.tipoIE) setTipoIE(initialPaymentData.tipoIE);
    if (initialPaymentData.instalacao) setInstalacao(initialPaymentData.instalacao);
    if (initialPaymentData.tipoFrete) setTipoFrete(initialPaymentData.tipoFrete);
    if (initialPaymentData.localInstalacao) setLocalInstalacao(initialPaymentData.localInstalacao);
    if (initialPaymentData.tipoEntrega) setTipoEntrega(initialPaymentData.tipoEntrega);

    // Entrada: verificar se é financiamento ou percentual
    if (initialPaymentData.financiamentoBancario === 'sim') {
      setPercentualEntrada('financiamento');
    } else if (initialPaymentData.percentualEntrada) {
      setPercentualEntrada(String(initialPaymentData.percentualEntrada));
    }

    if (initialPaymentData.valorSinal) setValorSinal(String(initialPaymentData.valorSinal));
    if (initialPaymentData.formaEntrada) setFormaEntrada(initialPaymentData.formaEntrada);
    if (initialPaymentData.observacoesNegociacao) setObservacoesNegociacao(initialPaymentData.observacoesNegociacao);
    if (initialPaymentData.extraDescricao) setExtraDescricao(initialPaymentData.extraDescricao);
    if (initialPaymentData.extraValor) setExtraValor(String(initialPaymentData.extraValor));

    // Desconto do vendedor
    if (initialPaymentData.desconto !== undefined && initialPaymentData.desconto !== null) {
      setDescontoVendedor(Number(initialPaymentData.desconto) || 0);
    }

    // Ir para etapa 7 (resumo) com tudo preenchido
    setEtapa(7);

    // Liberar reset effects após restauração
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 300);
  }, [initialPaymentData, modoConcessionaria]);

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


    const channel = supabase
      .channel(`solicitacao-${solicitacaoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'solicitacoes_desconto',
        filter: `id=eq.${solicitacaoId}`
      }, async (payload) => {

        if (payload.new.status === 'aprovado') {
          const descontoAprovado = payload.new.desconto_aprovado;
          const aprovadorNome = payload.new.aprovador_nome;


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
              plan: planoEfetivo,
              dataEmissaoNF: new Date(),
            });

            // Aplica desconto do vendedor aprovado
            const descontoExtraValor = precoBase * (descontoAprovado / 100);
            const valorAposExtra = r.valorAjustado - descontoExtraValor;

            // Calcula frete (mesma regra do cálculo principal)
            const valorFrete = valorFreteCalculado;

            // Calcula instalação
            const valorInstalacao = instalacao === 'incluso' ? instalacaoInclusoValor : 0;

            const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;

            const cUsd = Number(cotacaoUSD);
            const valorFinalUSD = (isComercioExterior && Number.isFinite(cUsd) && cUsd > 0)
              ? (valorFinal / cUsd)
              : 0;

            // Calcular campos de entrada para o PDF
            const valorSinalNum = parseFloat(valorSinal) || 0;
            
            // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
            const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
            const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
            
            const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
            
            // Saldo a pagar = Total - max(entrada%, sinal)
            const deducaoEntrada = Math.max(entradaTotalCalc, valorSinalNum);
            const saldoAPagarCalc = Math.max(0, valorFinal - deducaoEntrada);

            // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
            const numParcelas = r.parcelas?.length || 1;
            const valorParcela = saldoAPagarCalc / numParcelas;
            
            
            let somaAcumulada = 0;
            const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
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
              moeda: isComercioExterior ? 'USD' : 'BRL',
              cotacao_usd: isComercioExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
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
      supabase.removeChannel(channel);
    };
  }, [solicitacaoId, precoBase, tipoCliente, participacaoRevenda, tipoFrete, localInstalacao, tipoEntrega, percentualEntrada, planoSelecionado, extraDescricao, extraValor, formaEntrada, instalacao, temGSE, temGSI, dadosFreteAtual, valorFreteCalculado]);

  // =============== PLANOS DISPONÍVEIS ============================
  const audience = isComercioExterior
    ? 'comercio_exterior'
    : modoConcessionaria
      ? 'concessionaria_compra'
      : (tipoCliente === 'revenda' ? 'revenda' : 'cliente');
  const [todosPlanos, setTodosPlanos] = useState(() => getPaymentPlans(audience));

  const planoEfetivo = useMemo(() => {
    if (!planoSelecionado) return null;
    if (!bloquearDesconto) return planoSelecionado;
    return { ...planoSelecionado, discount_percent: 0 };
  }, [planoSelecionado, bloquearDesconto]);

  const descontoVendedorEfetivo = bloquearDesconto ? 0 : descontoVendedor;

  const entradaOpcoes = null;
  const permiteFinanciamento = true;
  const permiteSolicitarDescontoExtra = !bloquearDesconto;
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

        // modoConcessionaria = compra da concessionária para a Stark → planos definidos no escopo Stark
        const scope = modoConcessionaria ? 'stark' : (isConcessionariaUser ? 'concessionaria' : 'stark');
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

    // Comércio exterior: filtrar pelos planos da audiência
    if (isComercioExterior) {
      if (!percentualEntrada) return [];
      if (percentualEntrada === '100') return base.filter(p => !p.entry_percent_required);
      const pNum = percentualEntradaNumCalc / 100;
      return base.filter(p => p.entry_percent_required === pNum);
    }

    if (tipoCliente !== 'cliente') return base;
    if (!percentualEntrada) return [];
    if (percentualEntrada === 'financiamento') return base.filter(p => !p.entry_percent_required);
    if (percentualEntrada === '100') return base.filter(p => !p.entry_percent_required);
    const pNum = percentualEntradaNumCalc / 100;
    return base.filter(p => p.entry_percent_required === pNum);
  }, [todosPlanos, tipoCliente, percentualEntrada, percentualEntradaNumCalc, planosLiberados, isComercioExterior]);

  // Restaurar planoSelecionado após os planos serem carregados (modo edição)
  useEffect(() => {
    if (!initialPaymentData?.prazoPagamento || !hasRestoredRef.current) return;
    if (planoSelecionado) return; // Já foi restaurado

    const planosParaBuscar = planosFiltrados?.length > 0 ? planosFiltrados : todosPlanos;
    const planoSalvo = planosParaBuscar.find(
      p => p.description === initialPaymentData.prazoPagamento
    );
    if (planoSalvo) {
      setPlanoSelecionado(planoSalvo);
    }
  }, [initialPaymentData, todosPlanos, planosFiltrados, planoSelecionado]);

  // =============== REGRAS DE RESET (evitar estado sujo) ==========
  useEffect(() => {
    if (modoConcessionaria) return;
    if (isRestoringRef.current) return; // Não resetar durante restauração
    if (isComercioExterior) return; // Comércio Exterior: etapas 1 e 2 são auto-inicializadas
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
  }, [tipoCliente, modoConcessionaria, isComercioExterior]);

  useEffect(() => {
    if (isRestoringRef.current) return; // Não resetar durante restauração
    // Se a regra do diagrama exigir travar IE em "produtor", faz e mantém bloqueado
    if (travaIEProdutor && tipoIE !== 'produtor') setTipoIE('produtor');
    // Ao mudar participação revenda, limpa IE se não for travado
    if (!travaIEProdutor && tipoIE && participacaoRevenda === '') setTipoIE('');
  }, [travaIEProdutor, participacaoRevenda, tipoIE]);

  useEffect(() => {
    if (isRestoringRef.current) return; // Não resetar durante restauração
    // Quando cliente organiza frete: limpa apenas tipo de entrega (local permanece obrigatório)
    if (tipoFrete === 'FOB') {
      setTipoEntrega('');
    }
    // Quando frete incluso: mantém tudo
  }, [tipoFrete]);

  useEffect(() => {
    if (isRestoringRef.current) return; // Não resetar durante restauração
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
      const descontoExtraValor = precoBase * (descontoVendedorEfetivo / 100);
      const valorAposExtra = precoBase - descontoExtraValor;

      // Frete pode ser incluso no pedido (CIF) mesmo em financiamento.
      // Quando FOB, o cliente paga direto e o valor fica 0.
      const valorFrete = valorFreteCalculado;

      // Instalação pode ser inclusa na proposta (opcional) também para revenda
      const valorInstalacao = instalacao === 'incluso' ? instalacaoInclusoValor : 0;

      const valorFinalFinanciamento = valorAposExtra + extraValorNum + valorFrete + valorInstalacao + valorConversor;
      const valorFinalUSD = (isComercioExterior && Number.isFinite(cUsd) && cUsd > 0)
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
        valorConversor, // Conversor de voltagem (Caminhão 12V = R$ 450)
        entrada: 0,
        saldo: valorFinalFinanciamento,
        parcelas: [],
        total: valorFinalFinanciamento,
        valorFinal: valorFinalFinanciamento, // Adicionar para compatibilidade com PDF
        // Campos em percentual para o PDF
        desconto: descontoVendedorEfetivo,
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
        moeda: isComercioExterior ? 'USD' : 'BRL',
        cotacao_usd: isComercioExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
        valorFinalUSD,
      };

      setResultado(r);
      onPaymentComputed?.(r);
      return;
    }

    if (!planoSelecionado) { setResultado(null); return; }

    // Usa teu cálculo existente (com preço ajustado por região)
    try {
      const extraValorNum = parseFloat(extraValor) || 0;
      const r = calcularPagamento({
        precoBase: precoBaseAjustado,
        plan: planoEfetivo,
        dataEmissaoNF: new Date(),
      });

      // aplica desconto do vendedor (sobre o PREÇO AJUSTADO POR REGIÃO)
      const descontoExtraValor = precoBaseAjustado * (descontoVendedorEfetivo / 100);
      const valorAposExtra = r.valorAjustado - descontoExtraValor;

      // frete: somente se frete incluso + selecionado tipo de entrega e local
      const valorFrete = valorFreteCalculado;

      // instalação: apenas para CLIENTE, revenda não tem instalação
      const valorInstalacao = instalacao === 'incluso' ? instalacaoInclusoValor : 0;

      const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao + valorConversor;

      const valorFinalUSD = (isComercioExterior && Number.isFinite(cUsd) && cUsd > 0)
        ? (valorFinal / cUsd)
        : 0;

      // Calcular campos de entrada para o PDF
      const valorSinalNum = parseFloat(valorSinal) || 0;
      
      // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
      const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
      const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
      
      const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
      
      // Saldo a pagar = Total - max(entrada%, sinal)
      // O sinal já foi pago: se não há entrada%, ele é a própria dedução
      const deducaoEntrada = Math.max(entradaTotalCalc, valorSinalNum);
      const saldoAPagarCalc = Math.max(0, valorFinal - deducaoEntrada);

      // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
      const numParcelas = r.parcelas?.length || 1;
      const valorParcela = saldoAPagarCalc / numParcelas;
      
      
      let somaAcumulada = 0;
      const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
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
      

      const descontoQuantidadeValor = (Number(precoBase) || 0) - (Number(precoBaseAjustado) || 0);

      const resultadoFinal = {
        ...r,
        precoBase: precoBaseAjustado,
        precoBaseOriginal: precoBase,
        descontoQuantidadePercent,
        descontoQuantidadeValor,
        descontoAdicionalValor: descontoExtraValor,
        valorFinalComDescontoAdicional: valorAposExtra,
        observacoesNegociacao: (observacoesNegociacao || '').trim(),
        extraDescricao: extraDescricao || '',
        extraValor: extraValorNum,
        valorFrete,
        valorInstalacao,
        valorConversor, // Conversor de voltagem (Caminhão 12V = R$ 450)
        total: valorFinal,
        valorFinal, // Adicionar também como valorFinal para compatibilidade com PDF
        financiamentoBancario: 'nao', // Não é financiamento bancário
        
        // Campos de desconto e acréscimo em PERCENTUAL (para o PDF)
        desconto: descontoVendedorEfetivo, // % do desconto do vendedor
        descontoPrazo: (planoEfetivo?.discount_percent || 0) * 100, // % do desconto do plano/prazo
        acrescimo: (planoSelecionado?.surcharge_percent || 0) * 100, // % do acréscimo do plano
        
        // Campos de entrada (para o PDF)
        percentualEntrada: percentualEntradaNum,
        entradaTotal: entradaTotalCalc,
        valorSinal: valorSinalNum,
        faltaEntrada: faltaEntradaCalc,
        saldoAPagar: saldoAPagarCalc,
        formaEntrada: formaEntrada || '',

        // Comércio exterior
        moeda: isComercioExterior ? 'USD' : 'BRL',
        cotacao_usd: isComercioExterior ? (Number.isFinite(cUsd) && cUsd > 0 ? cUsd : null) : null,
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

  // =============== UTILS DE NAVEGAÇÃO ============================
  const podeIrEtapa2 = !!tipoCliente && (tipoCliente === 'revenda' ? true : true);
  const podeIrEtapa3 = tipoCliente === 'revenda' ? true : !!participacaoRevenda && (!!tipoIE || travaIEProdutor);
  const podeIrEtapa4 = tipoCliente === 'revenda' ? true : !!instalacao; // Revenda não precisa selecionar instalação
  const podeIrEtapa5 = !!tipoFrete && !!localInstalacao && (tipoFrete === 'FOB' || !!tipoEntrega);
  const podeIrEtapa6 = true; // entrada/plano sempre liberados após 5
  const podeIrEtapa7 = isComercioExterior
    ? !!percentualEntrada
    : (percentualEntrada === 'financiamento' ? true : !!planoSelecionado);

  const next = () => setEtapa(e => Math.min(e + 1, 7));
  const prev = () => setEtapa(e => Math.max(e - 1, isComercioExterior ? 3 : 1));

  // =============== SOLICITAR DESCONTO ADICIONAL AO GESTOR ========
  const handleSolicitarDesconto = async (justificativa, descontoDesejado) => {
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

      // Criar solicitação no banco
      const solicitacao = await db.criarSolicitacaoDesconto({
        vendedorId: user.id,
        vendedorNome: user.nome,
        vendedorEmail: user.email,
        equipamentoDescricao,
        valorBase: precoBase,
        descontoAtual: typeof descontoVendedor === 'number' ? descontoVendedor : 0,
        descontoDesejado: descontoDesejado || null,
        justificativa
      });


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
      
      const solicitacao = await db.getSolicitacaoPorId(solicitacaoId);
      
      if (solicitacao.status === 'aprovado') {

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
          precoBase: precoBaseAjustado,
          plan: planoEfetivo,
          dataEmissaoNF: new Date(),
        });

        // Aplica desconto do vendedor aprovado
        const descontoExtraValor = precoBaseAjustado * (solicitacao.desconto_aprovado / 100);
        const valorAposExtra = r.valorAjustado - descontoExtraValor;

        // Calcula frete
        const valorFrete = tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega
          ? (tipoEntrega === 'prioridade'
            ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
            : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0))
          : 0;

        // Calcula instalação
        const valorInstalacao = tipoCliente === 'cliente' && instalacao === 'incluso' ? instalacaoInclusoValor : 0;

        const valorFinal = valorAposExtra + extraValorNum + valorFrete + valorInstalacao;

        // Calcular campos de entrada para o PDF
        const valorSinalNum = parseFloat(valorSinal) || 0;
        
        // CORREÇÃO: Calcular entrada sobre o VALOR FINAL (com frete e instalação)
        const percentualEntradaNum = percentualEntrada !== 'financiamento' ? percentualEntradaNumCalc : 0;
        const entradaTotalCalc = percentualEntradaNum > 0 ? (valorFinal * percentualEntradaNum / 100) : 0;
        
        const faltaEntradaCalc = Math.max(0, entradaTotalCalc - valorSinalNum);
        
        // Saldo a pagar = Total - max(entrada%, sinal)
        const deducaoEntrada = Math.max(entradaTotalCalc, valorSinalNum);
        const saldoAPagarCalc = Math.max(0, valorFinal - deducaoEntrada);

        // CORREÇÃO: Recalcular parcelas com base no SALDO CORRETO
        const numParcelas = r.parcelas?.length || 1;
        const valorParcela = saldoAPagarCalc / numParcelas;
        
        
        let somaAcumulada = 0;
        const parcelasCorrigidas = r.parcelas?.map((parcela, idx) => {
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
        

        const descontoQuantidadeValor = (Number(precoBase) || 0) - (Number(precoBaseAjustado) || 0);

        const novoResultado = {
          ...r,
          precoBase: precoBaseAjustado,
          precoBaseOriginal: precoBase,
          descontoQuantidadePercent,
          descontoQuantidadeValor,
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
      valor += instalacaoInclusoValor;
    }

    return valor;
  }, [precoBase, resultado, descontoVendedor, extraValor, valorFreteCalculado, instalacao, instalacaoInclusoValor, bloquearDesconto, tipoCliente]);

  const moedaResumo = useMemo(() => {
    if (!isComercioExterior) return 'BRL';
    return 'USD';
  }, [isComercioExterior]);

  const valorFlutuanteUSD = useMemo(() => {
    if (!isComercioExterior) return 0;
    const c = Number(cotacaoUSD);
    if (!Number.isFinite(c) || c <= 0) return 0;
    return valorFlutuante / c;
  }, [isComercioExterior, cotacaoUSD, valorFlutuante]);

  // =============== RENDER ========================================
  const etapasVisiveis = isComercioExterior
    ? [3, 4, 5, 6, 7]
    : (modoConcessionaria ? [4, 5, 6, 7] : [1, 2, 3, 4, 5, 6, 7]);

  useEffect(() => {
    if (!modoConcessionaria) return;
    setTipoCliente('revenda');
    setParticipacaoRevenda('nao');
    setTipoIE('produtor');
    setInstalacao('');
    setTipoFrete('FOB');
    setLocalInstalacao('Concessionária');
    setTipoEntrega('');
    setEtapa(4); // Começar na etapa 4 (Frete) para concessionária
  }, [modoConcessionaria]);

  // Auto-inicializar etapas 1 e 2 para região Comércio Exterior (pula direto para etapa 3)
  useEffect(() => {
    if (!isComercioExterior) return;
    setTipoCliente('cliente');
    setParticipacaoRevenda('nao');
    setTipoIE('cnpj_cpf');
    setEtapa(3);
  }, [isComercioExterior]);

  // Auto-selecionar plano À Vista quando percentual de entrada for 100% (exterior ou não)
  useEffect(() => {
    if (percentualEntrada !== '100') return;
    const aVistaPlano = todosPlanos.find(p => !p.entry_percent_required);
    if (aVistaPlano) {
      setPlanoSelecionado(aVistaPlano);
      onPlanSelected?.(aVistaPlano);
    }
  }, [percentualEntrada, todosPlanos]);

  useEffect(() => {
    if (!modoConcessionaria) return;
    
    // Aplicar desconto automático de 2% se houver mais de 1 guindaste no carrinho
    const quantidadeGuindastes = carrinho.filter(item => item.tipo === 'guindaste').length;
    if (quantidadeGuindastes > 1) {
      setDescontoVendedor(2);
    } else {
      setDescontoVendedor(Number(descontoConcessionaria) || 0);
    }
  }, [modoConcessionaria, descontoConcessionaria, carrinho]);

  // Notificar onPaymentComputed imediatamente no modo concessionária
  useEffect(() => {
    if (!modoConcessionaria) return;
    if (!tipoFrete) return; // Aguardar inicialização
    
    // Enviar dados iniciais para permitir validação no NovoPedido
    const dadosIniciais = {
      tipoCliente: 'revenda',
      participacaoRevenda: 'nao',
      tipoIE: 'produtor',
      instalacao: '',
      tipoFrete: tipoFrete, // Usar o estado atual
      localInstalacao: 'Concessionária',
      tipoEntrega: '',
      tipoPagamento: 'revenda',
      tipoInstalacao: '',
      revendaTemIE: 'sim',
      prazoPagamento: '', // Será preenchido quando selecionar plano
    };
    
    onPaymentComputed?.(dadosIniciais);
  }, [modoConcessionaria, onPaymentComputed, tipoFrete]);

  return (
    <div className="payment-policy">
      {/* COMPACT FORM LAYOUT */}
      <div className="pp-form-wrap">

    {/* SEÇÃO 1 — Tipo de Venda */}
    {!modoConcessionaria && !isComercioExterior && (
      <section className="pp-section">
        <span className="pp-section-label">Tipo de Venda</span>
        <div className="pp-tabs">
          <button type="button" className={`pp-tab ${tipoCliente === 'cliente' ? 'pp-tab-active' : ''}`} onClick={() => setTipoCliente('cliente')}>
            Cliente Final
          </button>
          <button type="button" className={`pp-tab ${tipoCliente === 'revenda' ? 'pp-tab-active' : ''}`} onClick={() => setTipoCliente('revenda')}>
            Revenda
          </button>
        </div>
      </section>
    )}

    {/* SEÇÃO 2 — Participação de Revenda & Tipo de Cliente */}
    {!modoConcessionaria && !isComercioExterior && tipoCliente === 'cliente' && (
      <section className="pp-section">
        <span className="pp-section-label">Participação de Revenda</span>
        <div className="pp-tabs">
          <button type="button" className={`pp-tab ${participacaoRevenda === 'sim' ? 'pp-tab-active' : ''}`} onClick={() => setParticipacaoRevenda('sim')}>
            Sim
          </button>
          <button type="button" className={`pp-tab ${participacaoRevenda === 'nao' ? 'pp-tab-active' : ''}`} onClick={() => setParticipacaoRevenda('nao')}>
            Não
          </button>
        </div>
        {!!participacaoRevenda && (
          <div className="pp-subsection">
            <span className="pp-section-label">Tipo de Cliente</span>
            <div className="pp-radio-list">
              <label className={`pp-radio-row ${tipoIE === 'produtor' ? 'pp-radio-active' : ''}`} onClick={() => setTipoIE('produtor')}>
                <span className="pp-radio-indicator">{tipoIE === 'produtor' ? '●' : '○'}</span>
                <span className="pp-radio-text">
                  <strong>Produtor Rural</strong>
                  <small>Possui Inscrição Estadual rural</small>
                </span>
              </label>
              {!travaIEProdutor && (
                <label className={`pp-radio-row ${tipoIE === 'cnpj_cpf' ? 'pp-radio-active' : ''}`} onClick={() => setTipoIE('cnpj_cpf')}>
                  <span className="pp-radio-indicator">{tipoIE === 'cnpj_cpf' ? '●' : '○'}</span>
                  <span className="pp-radio-text">
                    <strong>CNPJ / CPF</strong>
                    <small>Sem Inscrição Estadual de produtor</small>
                  </span>
                </label>
              )}
            </div>
            {travaIEProdutor && (
              <div className="pp-info-note" style={{ marginTop: '8px' }}>
                {temGSE ? 'GSE' : 'GSI'} com Participação de Revenda: somente <b>Produtor Rural</b> é permitido nesta condição.
              </div>
            )}
          </div>
        )}
      </section>
    )}

    {/* SEÇÕES 3 + 4 — Instalação e Frete lado a lado */}
    {(!modoConcessionaria && (tipoCliente === 'revenda' || isComercioExterior || (tipoCliente === 'cliente' && podeIrEtapa3))) || podeIrEtapa4 ? (
      <div className="pp-grid-2">

    {/* SEÇÃO 3 — Instalação */}
    {!modoConcessionaria && (tipoCliente === 'revenda' || isComercioExterior || (tipoCliente === 'cliente' && podeIrEtapa3)) && (
      <section className="pp-section">
        <span className="pp-section-label">Instalação</span>
        {tipoCliente === 'revenda' && (
          <div className="pp-info-note" style={{ marginBottom: '8px' }}>
            Revenda: instalação opcional.
          </div>
        )}
        <div className="pp-radio-list">
          <label className={`pp-radio-row ${instalacao === 'cliente' ? 'pp-radio-active' : ''}`} onClick={() => setInstalacao('cliente')}>
            <span className="pp-radio-indicator">{instalacao === 'cliente' ? '●' : '○'}</span>
            <span className="pp-radio-text">
              <strong>Cliente paga direto</strong>
              <small>Ref. {formatCurrency(instalacaoClienteValor)} — fora do pedido</small>
            </span>
          </label>
          <label className={`pp-radio-row ${instalacao === 'incluso' ? 'pp-radio-active' : ''}`} onClick={() => setInstalacao('incluso')}>
            <span className="pp-radio-indicator">{instalacao === 'incluso' ? '●' : '○'}</span>
            <span className="pp-radio-text">
              <strong>Incluso no pedido</strong>
              <small>+ {formatCurrency(instalacaoInclusoValor)} no total</small>
            </span>
          </label>
        </div>
      </section>
    )}

    {/* SEÇÃO 4 — Frete & Local de Instalação */}
    {podeIrEtapa4 && (
      <section className="pp-section">
        <span className="pp-section-label">Frete & Local de Instalação</span>
        <div className="pp-tabs">
          <button type="button" className={`pp-tab ${tipoFrete === 'FOB' ? 'pp-tab-active' : ''}`} onClick={() => setTipoFrete('FOB')}>
            FOB — Cliente organiza
          </button>
          <button type="button" className={`pp-tab ${tipoFrete === 'CIF' ? 'pp-tab-active' : ''}`} onClick={() => setTipoFrete('CIF')}>
            CIF — Frete incluso
          </button>
        </div>

        {tipoFrete && (
          <div className="pp-subsection">
            <div className="pp-fields-row">
              <div className="form-group" style={{ flex: '0 0 100px' }}>
                <label>UF</label>
                <select value={ufFiltroInstalacao} onChange={e => setUfFiltroInstalacao(e.target.value)}>
                  <option value="">Todas</option>
                  {ufsDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: '1' }}>
                <label>Local de Instalação *</label>
                <select value={localInstalacao} onChange={e => setLocalInstalacao(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pontosInstalacaoFiltrados.map((p, idx) => {
                    const uf = String(p?.uf || '').trim().toUpperCase();
                    const cidade = String(p?.cidade || '').trim();
                    const oficina = String(p?.oficina || p?.nome || '').trim();
                    const value = p.nome || `${oficina} - ${cidade}/${uf}`;
                    const label = cidade && uf ? `${cidade}/${uf} — ${oficina || 'OFICINA'}` : (p.nome || `${oficina} - ${cidade}/${uf}`);
                    return <option key={p.id || idx} value={value}>{label}</option>;
                  })}
                </select>
                <small className="form-help help-info">
                  {pontosInstalacao.length === 0
                    ? 'Nenhum ponto disponível para sua região'
                    : `${pontosInstalacaoFiltrados.length} ponto(s)${ufFiltroInstalacao ? ` em ${ufFiltroInstalacao}` : ''}`}
                </small>
              </div>
            </div>

            {tipoFrete === 'CIF' && localInstalacao && (
              <div className="pp-subsection">
                <span className="pp-section-label">Tipo de Entrega</span>
                <div className="pp-radio-list">
                  <label className={`pp-radio-row ${tipoEntrega === 'prioridade' ? 'pp-radio-active' : ''}`} onClick={() => setTipoEntrega('prioridade')}>
                    <span className="pp-radio-indicator">{tipoEntrega === 'prioridade' ? '●' : '○'}</span>
                    <span className="pp-radio-text">
                      <strong>Prioridade</strong>
                      <small>Carga exclusiva{dadosFreteAtual?.valor_prioridade ? ` — ${formatCurrency(dadosFreteAtual.valor_prioridade)}` : ''}</small>
                    </span>
                  </label>
                  <label className={`pp-radio-row ${tipoEntrega === 'reaproveitamento' ? 'pp-radio-active' : ''}`} onClick={() => setTipoEntrega('reaproveitamento')}>
                    <span className="pp-radio-indicator">{tipoEntrega === 'reaproveitamento' ? '●' : '○'}</span>
                    <span className="pp-radio-text">
                      <strong>Reaproveitamento</strong>
                      <small>Quando fechar carga{dadosFreteAtual?.valor_reaproveitamento ? ` — ${formatCurrency(dadosFreteAtual.valor_reaproveitamento)}` : ''}</small>
                    </span>
                  </label>
                </div>
                {!dadosFreteAtual && (
                  <small className="form-help help-warn" style={{ marginTop: '6px', display: 'block' }}>
                    Valores de frete não disponíveis para este local
                  </small>
                )}
              </div>
            )}
            {tipoFrete === 'FOB' && localInstalacao && (
              <div className="pp-info-note" style={{ marginTop: '8px' }}>
                Cliente organiza transporte até <b>{localInstalacao}</b>
              </div>
            )}
          </div>
        )}
      </section>
    )}

      </div>
    ) : null}

    {/* SEÇÃO 5 — Financeiro */}
    {podeIrEtapa5 && (
      <section className="pp-section">
        <span className="pp-section-label">Forma de Pagamento</span>

        <div className="pp-subsection">
          <span className="pp-section-label">Percentual de Entrada</span>
          {isComercioExterior ? (
            <div className="pp-tabs">
              <button type="button" className={`pp-tab ${percentualEntrada === '100' ? 'pp-tab-active' : ''}`} onClick={() => setPercentualEntrada('100')}>
                100% À Vista
              </button>
              <button type="button" className={`pp-tab ${percentualEntrada === '50' ? 'pp-tab-active' : ''}`} onClick={() => setPercentualEntrada('50')}>
                50% + 50%
              </button>
            </div>
          ) : (
            <div className="pp-entrada-btns">
              {(entradaOpcoes || ['30', '50', '100', 'financiamento'])
                .filter(v => permiteFinanciamento ? true : v !== 'financiamento')
                .map(v => (
                  <button key={v} type="button" className={`pp-entrada-btn ${percentualEntrada === v ? 'selected' : ''}`} onClick={() => setPercentualEntrada(v)}>
                    {v === 'financiamento' ? (<><strong>Financiamento</strong><small>Bancário</small></>) :
                     v === '100' ? (<><strong>100%</strong><small>À Vista</small></>) :
                     (<><strong>{v}%</strong><small>Entrada</small></>)}
                  </button>
                ))}
            </div>
          )}
        </div>

        {percentualEntrada && percentualEntrada !== 'financiamento' && percentualEntrada !== '100' && !isComercioExterior && (
          <div className="pp-fields-row pp-subsection">
            <div className="form-group">
              <label>Valor do Sinal</label>
              <select
                value={['10000', '15000', '20000', '25000'].includes(String(valorSinal)) ? String(valorSinal) : 'outro'}
                onChange={e => { if (e.target.value === 'outro') setValorSinal(''); else setValorSinal(e.target.value); }}
              >
                <option value="">Selecione</option>
                <option value="10000">R$ 10.000</option>
                <option value="15000">R$ 15.000</option>
                <option value="20000">R$ 20.000</option>
                <option value="25000">R$ 25.000</option>
                <option value="outro">Outro valor</option>
              </select>
              <input type="number" value={valorSinal} onChange={e => setValorSinal(e.target.value)} placeholder="R$" min="0" step="0.01" style={{ marginTop: '4px' }} />
            </div>
            <div className="form-group">
              <label>Forma de Pagamento da Entrada</label>
              <select value={formaEntrada} onChange={e => setFormaEntrada(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">BOLETO</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="DINHEIRO">DINHEIRO</option>
                <option value="CARTÃO">CARTÃO</option>
                <option value="TRANSFERÊNCIA BANCÁRIA">TRANSFERÊNCIA BANCÁRIA</option>
                {formaEntrada && !['PIX', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'CARTÃO', 'TRANSFERÊNCIA BANCÁRIA'].includes(formaEntrada) && (
                  <option value={formaEntrada}>{`OUTRO (${formaEntrada})`}</option>
                )}
              </select>
            </div>
          </div>
        )}

        {isComercioExterior && percentualEntrada && percentualEntrada !== 'financiamento' && (
          <div className="pp-subsection">
            <div className="form-group">
              <label>Forma de Pagamento{percentualEntrada === '50' ? ' da Entrada' : ''} *</label>
              {percentualEntrada === '50' && (
                <small style={{ display: 'block', marginBottom: '4px', color: '#1d4ed8', fontSize: '0.78em', fontWeight: 600 }}>
                  Entrada automática: 50% do valor total (R$ {resultado ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format((resultado.valorFinal || 0) * 0.5) : '---'})
                </small>
              )}
              <select value={formaEntrada} onChange={e => setFormaEntrada(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="TRANSFERÊNCIA BANCÁRIA">TRANSFERÊNCIA BANCÁRIA</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">BOLETO</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="DINHEIRO">DINHEIRO</option>
                <option value="CARTÃO">CARTÃO</option>
                {formaEntrada && !['PIX', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'CARTÃO', 'TRANSFERÊNCIA BANCÁRIA'].includes(formaEntrada) && (
                  <option value={formaEntrada}>{`OUTRO (${formaEntrada})`}</option>
                )}
              </select>
            </div>
          </div>
        )}

        {percentualEntrada && (
          <div className="pp-fields-row pp-subsection">
            <div className="form-group">
              <label>Extra — Descrição (opcional)</label>
              <input type="text" value={extraDescricao} onChange={e => setExtraDescricao(e.target.value)} placeholder="Ex: Lança 3m" maxLength="80" />
            </div>
            <div className="form-group">
              <label>Extra — Valor (R$)</label>
              <input type="number" value={extraValor} onChange={e => setExtraValor(e.target.value)} placeholder="0,00" min="0" step="0.01" />
            </div>
          </div>
        )}

        <div className="form-group pp-subsection">
          <label>Observações da Negociação (opcional)</label>
          <textarea
            value={observacoesNegociacao}
            onChange={e => setObservacoesNegociacao(e.target.value)}
            placeholder="Ex: Condição especial, carência, observações sobre financiamento..."
            rows={2}
            maxLength={500}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div className="pp-inner-2col pp-subsection">

          {percentualEntrada !== 'financiamento' && percentualEntrada !== '100' && percentualEntrada && (
            <div className="form-group">
              <label>Plano de Pagamento *</label>
              <select
                value={planoSelecionado ? `${planoSelecionado.order}::${planoSelecionado.description}` : ''}
                onChange={e => {
                  const v = e.target.value || '';
                  if (!v) { setPlanoSelecionado(null); onPlanSelected?.(null); return; }
                  const [orderStr, ...descParts] = v.split('::');
                  const order = parseInt(orderStr, 10);
                  const description = descParts.join('::');
                  const p = planosFiltrados.find(pl => pl.order === order && pl.description === description) || null;
                  setPlanoSelecionado(p);
                  onPlanSelected?.(p);
                }}
              >
                <option value="">Selecione o prazo...</option>
                {planosFiltrados.map(p => (
                  <option key={`${p.audience}-${p.order}-${p.description}`} value={`${p.order}::${p.description}`}>
                    {getPlanLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!modoConcessionaria && (
            <div className="form-group">
              <label>Desconto do Vendedor</label>

              {bloquearDesconto ? (
                <div className="pp-info-note" style={{ marginTop: '6px', color: '#ef4444', background: '#fff1f2', borderColor: '#fca5a5' }}>
                  Desconto não disponível para este guindaste.
                </div>
              ) : (
                <>
                  {temGSI && tipoCliente === 'revenda' && (
                    <div>
                      <div className="pp-section-label" style={{ margin: '6px 0 4px' }}>Padrão (1 unidade)</div>
                      <div className="pp-desconto-btns">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => (
                          <button key={v} type="button" className={`pp-desc-btn ${descontoVendedor === v ? 'pp-desc-active' : ''}`} onClick={() => setDescontoVendedor(v)}>{v}%</button>
                        ))}
                      </div>
                      <div className="pp-section-label" style={{ margin: '10px 0 4px' }}>Por quantidade</div>
                      <div className="pp-desconto-btns">
                        {[{ v: 14, label: '14% — 2 un.' }, { v: 15, label: '15% — 3+ un.' }].map(({ v, label }) => (
                          <button key={v} type="button" className={`pp-desc-btn ${descontoVendedor === v ? 'pp-desc-active' : ''}`} onClick={() => setDescontoVendedor(v)}>{label}</button>
                        ))}
                      </div>
                      <small className="form-help help-info" style={{ display: 'block', marginTop: '6px' }}>Selecione conforme a quantidade de equipamentos</small>
                    </div>
                  )}

                  {(temGSI || temGSE) && tipoCliente === 'cliente' && participacaoRevenda === 'nao' && (
                    <div className="pp-desconto-btns">
                      {((descontosBotoes || (temGSI ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 0.5, 1, 1.5, 2, 2.5, 3]))).map(v => (
                        <button key={v} type="button" className={`pp-desc-btn ${descontoVendedor === v ? 'pp-desc-active' : ''}`} onClick={() => setDescontoVendedor(v)}>{v}%</button>
                      ))}
                    </div>
                  )}

                  {temGSI && tipoCliente === 'cliente' && participacaoRevenda === 'sim' && tipoIE === 'produtor' && (
                    <div>
                      <div className="pp-desconto-btns">
                        {[0, 1, 2, 3, 4, 5].map(v => (
                          <button key={v} type="button" className={`pp-desc-btn ${descontoVendedor === v ? 'pp-desc-active' : ''}`} onClick={() => setDescontoVendedor(v)}>{v}%</button>
                        ))}
                      </div>
                      <small className="form-help help-info" style={{ display: 'block', marginTop: '6px' }}>Desconto máximo: 5%</small>
                    </div>
                  )}

                  {temGSE && tipoCliente === 'cliente' && participacaoRevenda === 'sim' && (
                    <div className="pp-info-note" style={{ marginTop: '6px' }}>
                      Não há desconto disponível para GSE com participação de revenda.
                    </div>
                  )}

                  {!isConcessionariaUser && permiteSolicitarDescontoExtra && (
                    <button
                      type="button"
                      className="pp-extra-btn"
                      onClick={() => setModalSolicitacaoOpen(true)}
                      disabled={aguardandoAprovacao}
                      style={{ marginTop: '10px' }}
                    >
                      {aguardandoAprovacao ? 'Aguardando aprovação...' : '+ Solicitar desconto adicional'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

        </div>{/* fim pp-inner-2col */}

        {percentualEntrada === 'financiamento' && (
          <div className="pp-info-note pp-subsection">
            Financiamento bancário selecionado — condições definidas pelo banco.
          </div>
        )}

      </section>
    )}

    </div>{/* fim pp-form-wrap */}

    {/* CTA BAR — sempre visível, habilitado quando tudo está preenchido */}
    <div className="pp-cta-bar">
      <div className="pp-cta-total">
        <span>Total da Proposta</span>
        <strong>{isComercioExterior ? formatCurrencyUSD(valorFlutuanteUSD) : formatCurrency(valorFlutuante)}</strong>
        <div className="pp-cta-breakdown">
          {precoBase > 0 && <span className="pp-cta-item pp-cta-base">Base {formatCurrency(precoBase)}</span>}
          {descontoVendedor > 0 && <span className="pp-cta-item pp-cta-minus">Desconto -{descontoVendedor}%</span>}
          {(resultado?.descontoValor || 0) > 0 && <span className="pp-cta-item pp-cta-minus">Prazo -{formatCurrency(resultado.descontoValor)}</span>}
          {(resultado?.acrescimoValor || 0) > 0 && <span className="pp-cta-item pp-cta-plus">Acréscimo +{formatCurrency(resultado.acrescimoValor)}</span>}
          {valorFreteCalculado > 0 && <span className="pp-cta-item pp-cta-plus">Frete +{formatCurrency(valorFreteCalculado)}</span>}
          {instalacao === 'incluso' && <span className="pp-cta-item pp-cta-plus">Instalação +{formatCurrency(instalacaoInclusoValor)}</span>}
          {(parseFloat(extraValor) || 0) > 0 && <span className="pp-cta-item pp-cta-plus">{extraDescricao || 'Extra'} +{formatCurrency(parseFloat(extraValor))}</span>}
          {resultado?.parcelas?.length > 0 && percentualEntrada !== 'financiamento' && (
            <span className="pp-cta-item pp-cta-parcelas">
              {resultado.parcelas.length}x {formatCurrency(resultado.parcelas[0]?.valor || 0)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="pp-cta-btn"
        disabled={!resultado || (percentualEntrada !== 'financiamento' && !planoSelecionado)}
        onClick={() => {
          if (onFinish) {
            onFinish(resultado);
          } else {
            console.warn('⚠️ onFinish não está definido!');
          }
        }}
      >
        {modoConcessionaria ? 'Finalizar e Ir para Resumo →' : 'Continuar para Dados do Cliente →'}
      </button>
    </div>

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
