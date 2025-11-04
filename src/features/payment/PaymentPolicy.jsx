import React, { useState, useEffect, useMemo } from 'react';
import { getPaymentPlans, getPlanLabel, getPlanByDescription } from '../../services/paymentPlans';
import { calcularPagamento } from '../../lib/payments';
import { formatCurrency } from '../../utils/formatters';
import { db, supabase } from '../../config/supabase';
import { useFretes } from '../../hooks/useFretes';
import SolicitarDescontoModal from '../../components/SolicitarDescontoModal';
import './PaymentPolicy.css';

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
  // callbacks opcionais
  onPaymentComputed,
  onPlanSelected,
  onFinish, // Callback para finalizar e ir para próxima etapa
  debug = false,
}) {
  // =============== DERIVAÇÃO DE PRODUTOS (GSE/GSI) ===============
  const itens = useMemo(() => (carrinho?.length ? carrinho : equipamentos || []), [carrinho, equipamentos]);

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

  // 6) Entrada, plano, financiamento e desconto do vendedor
  const [percentualEntrada, setPercentualEntrada] = useState(''); // '30' | '50' | 'financiamento'
  const [valorSinal, setValorSinal] = useState('');
  const [formaEntrada, setFormaEntrada] = useState('');
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

  // Estado para preço ajustado por região/IE (para valor flutuante)
  const [precoAjustadoPorRegiao, setPrecoAjustadoPorRegiao] = useState(precoBase);
  const [carregandoPreco, setCarregandoPreco] = useState(false);

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

  // =============== BUSCAR PREÇO CORRETO POR REGIÃO/IE ============
  useEffect(() => {
    async function buscarPrecoCorreto() {
      // Só busca se tiver produtos no carrinho
      if (itens.length === 0) {
        setPrecoAjustadoPorRegiao(precoBase);
        return;
      }

      // Pega o primeiro guindaste do carrinho
      const guindaste = itens.find(i => i.tipo === 'guindaste' || i.id);
      if (!guindaste || !guindaste.id) {
        setPrecoAjustadoPorRegiao(precoBase);
        return;
      }

      try {
        setCarregandoPreco(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const regiaoVendedor = user?.regiao?.toLowerCase() || '';

        // Determinar região para busca de preço
        let regiaoParaBusca = '';

        if (regiaoVendedor === 'rio grande do sul' || regiaoVendedor === 'rs') {
          // RS: depende APENAS do tipo de IE selecionado (ignora participação de revenda)
          if (tipoIE === 'produtor') {
            regiaoParaBusca = 'rs-com-ie'; // Produtor Rural = Com IE
          } else if (tipoIE === 'cnpj_cpf') {
            regiaoParaBusca = 'rs-sem-ie'; // CNPJ/CPF = Sem IE
          } else {
            // Fallback se não tiver tipo selecionado ainda
            regiaoParaBusca = 'rs-com-ie';
          }
        } else {
          // Outras regiões: usa região normalizada (sul-sudeste, norte-nordeste, etc)
          if (regiaoVendedor.includes('sul') || regiaoVendedor.includes('paraná') || regiaoVendedor.includes('santa catarina')) {
            regiaoParaBusca = 'sul-sudeste';
          } else if (regiaoVendedor.includes('norte') || regiaoVendedor.includes('nordeste')) {
            regiaoParaBusca = 'norte-nordeste';
          } else if (regiaoVendedor.includes('centro') || regiaoVendedor.includes('oeste')) {
            regiaoParaBusca = 'centro-oeste';
          } else {
            regiaoParaBusca = 'sul-sudeste'; // fallback
          }
        }

        if (regiaoParaBusca) {
          const precoRegiao = await db.getPrecoPorRegiao(guindaste.id, regiaoParaBusca);
          if (precoRegiao && precoRegiao > 0) {
            setPrecoAjustadoPorRegiao(precoRegiao);
          } else {
            setPrecoAjustadoPorRegiao(precoBase);
          }
        } else {
          setPrecoAjustadoPorRegiao(precoBase);
        }
      } catch (error) {
        console.error('Erro ao buscar preço por região:', error);
        setPrecoAjustadoPorRegiao(precoBase);
      } finally {
        setCarregandoPreco(false);
      }
    }

    buscarPrecoCorreto();
  }, [tipoCliente, participacaoRevenda, tipoIE, itens, precoBase]);

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
      }, (payload) => {
        console.log('🔔 [PaymentPolicy] Atualização recebida:', payload);

        if (payload.new.status === 'aprovado') {
          const descontoAprovado = payload.new.desconto_aprovado;
          const aprovadorNome = payload.new.aprovador_nome;

          console.log(`✅ [PaymentPolicy] Desconto de ${descontoAprovado}% aprovado por ${aprovadorNome}`);

          // Aplica o desconto automaticamente
          setDescontoVendedor(descontoAprovado);

          // Fecha modal e limpa estados
          setModalSolicitacaoOpen(false);
          setAguardandoAprovacao(false);
          setSolicitacaoId(null);

          // Mostra notificação de sucesso
          alert(`✅ Desconto de ${descontoAprovado}% aprovado por ${aprovadorNome}!\n\nVocê pode continuar preenchendo a proposta.`);

        } else if (payload.new.status === 'negado') {
          const aprovadorNome = payload.new.aprovador_nome;
          const observacao = payload.new.observacao_gestor;

          console.log(`❌ [PaymentPolicy] Solicitação negada por ${aprovadorNome}`);

          // Fecha modal e limpa estados
          setModalSolicitacaoOpen(false);
          setAguardandoAprovacao(false);
          setSolicitacaoId(null);

          // Mostra notificação de negação
          alert(`❌ Solicitação negada por ${aprovadorNome}${observacao ? `\n\nMotivo: ${observacao}` : ''}`);
        }
      })
      .subscribe();

    // Cleanup: remove listener quando componente desmonta ou solicitacaoId muda
    return () => {
      console.log('🔕 [PaymentPolicy] Removendo listener');
      supabase.removeChannel(channel);
    };
  }, [solicitacaoId]);

  // =============== PLANOS DISPONÍVEIS ============================
  const audience = tipoCliente === 'revenda' ? 'revenda' : 'cliente';
  const todosPlanos = useMemo(() => getPaymentPlans(audience), [audience]);

  // Filtra por percentual quando for cliente e não for financiamento
  const planosFiltrados = useMemo(() => {
    if (tipoCliente !== 'cliente') return todosPlanos;
    if (!percentualEntrada || percentualEntrada === 'financiamento') return todosPlanos.filter(p => !p.entry_percent_required);
    const pNum = parseFloat(percentualEntrada) / 100;
    return todosPlanos.filter(p => p.entry_percent_required === pNum);
  }, [todosPlanos, tipoCliente, percentualEntrada]);

  // =============== REGRAS DE RESET (evitar estado sujo) ==========
  useEffect(() => {
    // Mudou tipo de cliente? zera dependentes
    setParticipacaoRevenda('');
    setTipoIE('');
    setInstalacao('');
    setTipoFrete('');
    setLocalInstalacao('');
    setTipoEntrega('');
    setPercentualEntrada('');
    setValorSinal('');
    setFormaEntrada('');
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

    // Financiamento Bancário: notifica sem cálculo de parcelas internas
    if (percentualEntrada === 'financiamento') {
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
        prazoPagamento: '', // Não aplicável para financiamento
        // Valores
        descontoValor: 0,
        acrescimoValor: 0,
        valorAjustado: precoBase,
        entrada: 0,
        saldo: precoBase,
        parcelas: [],
        total: precoBase,
      };
      setResultado(r);
      onPaymentComputed?.(r);
      return;
    }

    if (!planoSelecionado) { setResultado(null); return; }

    // Usa teu cálculo existente (com preço ajustado por região)
    try {
      const r = calcularPagamento({
        precoBase: precoAjustadoPorRegiao,
        plan: planoSelecionado,
        dataEmissaoNF: new Date(),
      });

      // aplica desconto do vendedor (sobre o PREÇO AJUSTADO POR REGIÃO)
      const descontoExtraValor = precoAjustadoPorRegiao * (descontoVendedor / 100);
      const valorAposExtra = r.valorAjustado - descontoExtraValor;

      // frete: somente se frete incluso + selecionado tipo de entrega e local
      const valorFrete = tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega
        ? (tipoEntrega === 'prioridade'
          ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
          : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0))
        : 0;

      // instalação: apenas para CLIENTE, revenda não tem instalação
      const valorInstalacao = tipoCliente === 'cliente' && instalacao === 'incluso'
        ? (temGSI ? 6350 : temGSE ? 7500 : 0)
        : 0;

      const valorFinal = valorAposExtra + valorFrete + valorInstalacao;

      const resultadoFinal = {
        ...r,
        precoBase: precoAjustadoPorRegiao, // Usar preço ajustado
        descontoAdicionalValor: descontoExtraValor,
        valorFinalComDescontoAdicional: valorAposExtra,
        valorFrete,
        valorInstalacao,
        total: valorFinal,
        financiamentoBancario: 'nao', // Não é financiamento bancário
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
        tipoInstalacao: tipoCliente === 'revenda' 
          ? 'Definido na venda final' 
          : instalacao === 'incluso' 
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
    planoSelecionado,
    percentualEntrada,
    descontoVendedor,
    temGSE,
    temGSI,
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
        valorBase: precoAjustadoPorRegiao,
        descontoAtual: descontoVendedor || 7,
        justificativa
      });

      // Criar solicitação no banco
      const solicitacao = await db.criarSolicitacaoDesconto({
        vendedorId: user.id,
        vendedorNome: user.nome,
        vendedorEmail: user.email,
        equipamentoDescricao,
        valorBase: precoAjustadoPorRegiao,
        descontoAtual: descontoVendedor || 7,
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

  // Função para verificar status manualmente
  const handleVerificarStatus = async () => {
    if (!solicitacaoId) return;

    try {
      console.log('🔄 [PaymentPolicy] Verificando status da solicitação:', solicitacaoId);
      
      const solicitacao = await db.getSolicitacaoPorId(solicitacaoId);
      
      if (solicitacao.status === 'aprovado') {
        console.log('✅ [PaymentPolicy] Desconto aprovado:', solicitacao.desconto_aprovado);
        setDescontoVendedor(solicitacao.desconto_aprovado);
        setAguardandoAprovacao(false);
        setModalSolicitacaoOpen(false);
        alert(`✅ Desconto de ${solicitacao.desconto_aprovado}% aprovado por ${solicitacao.aprovador_nome}!\n\nVocê pode continuar preenchendo a proposta.`);
      } else if (solicitacao.status === 'negado') {
        console.log('❌ [PaymentPolicy] Solicitação negada');
        setAguardandoAprovacao(false);
        setModalSolicitacaoOpen(false);
        alert(`❌ Solicitação negada por ${solicitacao.aprovador_nome}.\n\n${solicitacao.observacao_gestor || 'Sem justificativa'}`);
      } else {
        alert('⏳ Solicitação ainda está pendente.\n\nO gestor ainda não respondeu.');
      }
    } catch (error) {
      console.error('❌ [PaymentPolicy] Erro ao verificar status:', error);
      alert('❌ Erro ao verificar status. Tente novamente.');
    }
  };

  // =============== CALCULAR VALOR FLUTUANTE EM TEMPO REAL ========
  const valorFlutuante = useMemo(() => {
    let valor = precoAjustadoPorRegiao;

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
      valor -= (precoAjustadoPorRegiao * (descontoVendedor / 100));
    }

    // Adicionar frete (se incluso)
    if (tipoFrete === 'CIF' && dadosFreteAtual && tipoEntrega) {
      const valorFreteCalc = tipoEntrega === 'prioridade'
        ? parseFloat(dadosFreteAtual.valor_prioridade || 0)
        : parseFloat(dadosFreteAtual.valor_reaproveitamento || 0);
      valor += valorFreteCalc;
    }

    // Adicionar instalação (apenas para CLIENTE)
    if (tipoCliente === 'cliente' && instalacao === 'incluso') {
      valor += (temGSI ? 6350 : temGSE ? 7500 : 0);
    }

    return valor;
  }, [precoAjustadoPorRegiao, resultado, descontoVendedor, tipoFrete, dadosFreteAtual, tipoEntrega, instalacao, temGSE, temGSI]);

  // =============== RENDER ========================================
  return (
    <div className="payment-policy">
      {/* Card Flutuante de Valor em Tempo Real */}
      <div className="floating-price-card">
        <div className="floating-price-header">
          <span className="floating-price-icon">💰</span>
          <span className="floating-price-title">Valor em Tempo Real</span>
        </div>
        <div className="floating-price-value">
          {carregandoPreco ? (
            <span className="loading">Calculando...</span>
          ) : (
            <span className="price">{formatCurrency(valorFlutuante)}</span>
          )}
        </div>
        <div className="floating-price-breakdown">
          <div className="breakdown-line">
            <span>Base:</span>
            <span>{formatCurrency(precoAjustadoPorRegiao)}</span>
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
              <span>{formatCurrency(precoAjustadoPorRegiao * (descontoVendedor / 100))}</span>
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
      {/* Stepper 1..7 */}
      <div className="pp-stepper">
        {[1, 2, 3, 4, 5, 6, 7].map(n => (
          <div
            key={n}
            className={`pp-step ${etapa === n ? 'active' : etapa > n ? 'done' : ''}`}
            onClick={() => setEtapa(n)}
            title={
              n===1?'Tipo de Cliente':
              n===2?'Participação & IE':
              n===3?'Instalação':
              n===4?'Tipo de Frete':
              n===5?'Local & Entrega':
              n===6?'Entrada & Plano':
              'Resumo'
            }
          >
            {n}
          </div>
        ))}
      </div>

      {/* 1) Tipo de Cliente */}
      {etapa === 1 && (
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

      {/* 2) Participação & Tipo de IE (só faz sentido para Cliente) */}
      {etapa === 2 && (
        <section className="payment-section">
          <h3>2) Participação da Revenda & Tipo de IE</h3>

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
                  <label>Tipo de IE *</label>
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
                        <span>CNPJ/CPF</span>
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
      {etapa === 3 && (
        <section className="payment-section">
          <h3>3) Instalação</h3>

          {tipoCliente === 'revenda' ? (
            // REVENDA: Apenas informativo, sem seleção
            <div className="pp-banner ok">
              ℹ️ <b>Instalação será definida na venda para cliente final</b>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', opacity: 0.9 }}>
                Como este equipamento será revendido, a instalação será negociada quando a revenda vender para o cliente final.
              </p>
            </div>
          ) : (
            // CLIENTE: Opções normais de instalação
            <>
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
            </>
          )}

          <div className="payment-navigation">
            <button className="payment-nav-btn" onClick={prev}>Voltar</button>
            <button className="payment-nav-btn" disabled={!podeIrEtapa4} onClick={next}>Continuar</button>
          </div>
        </section>
      )}

      {/* 4) Organização do Frete */}
      {etapa === 4 && (
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
      {etapa === 5 && (
        <section className="payment-section">
          <h3>5) Local & Tipo de Entrega</h3>

          {/* Local de Instalação - SEMPRE obrigatório */}
          <div className="form-group">
            <label>Local de Instalação *</label>
            <select value={localInstalacao} onChange={e => setLocalInstalacao(e.target.value)}>
              <option value="">Selecione...</option>
              {pontosInstalacao.map((p, idx) => (
                <option key={p.id || idx} value={p.nome || `${p.oficina} - ${p.cidade}/${p.uf}`}>
                  {p.nome || `${p.oficina} - ${p.cidade}/${p.uf}`}
                </option>
              ))}
            </select>
            <small className="form-help help-info">
              {pontosInstalacao.length === 0 
                ? '⚠️ Nenhum ponto de instalação disponível para sua região'
                : `${pontosInstalacao.length} ponto(s) disponível(is) na sua região`}
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
                <option value="30">30%</option>
                <option value="50">50%</option>
                <option value="financiamento">🏦 Financiamento Bancário</option>
              </select>
            </div>

            {percentualEntrada && percentualEntrada !== 'financiamento' && (
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
            )}
          </div>

          {percentualEntrada !== 'financiamento' && (
            <>
              <div className="form-group">
                <label>Plano de Pagamento *</label>
                <select
                  value={planoSelecionado?.description || ''}
                  onChange={e => {
                    const p = getPlanByDescription(e.target.value, audience);
                    setPlanoSelecionado(p || null);
                    onPlanSelected?.(p || null);
                  }}
                >
                  <option value="">Selecione...</option>
                  {planosFiltrados.map(p => (
                    <option key={`${p.audience}-${p.order}`} value={p.description}>
                      {getPlanLabel(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Desconto Adicional do Vendedor</label>
                
                {/* GSI - REVENDA */}
                {temGSI && tipoCliente === 'revenda' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '14px', color: '#495057' }}>Desconto padrão (1 unidade):</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(valor => (
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

                {/* GSI - CLIENTE SEM PARTICIPAÇÃO REVENDA */}
                {temGSI && tipoCliente === 'cliente' && participacaoRevenda === 'nao' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5, 6, 7].map(valor => (
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
                          display: 'flex',
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
                        {aguardandoAprovacao ? '⏳' : '+'} {aguardandoAprovacao ? 'Aguardando...' : 'Solicitar'}
                      </button>
                    </div>
                    <small className="form-help help-info" style={{ display: 'block', marginTop: '12px' }}>
                      ℹ️ Desconto máximo padrão: 7%. Para valores maiores, clique em [+]
                    </small>
                  </div>
                )}

                {/* GSI - CLIENTE COM PARTICIPAÇÃO REVENDA (PRODUTOR RURAL) */}
                {temGSI && tipoCliente === 'cliente' && participacaoRevenda === 'sim' && tipoIE === 'produtor' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[ 1, 2, 3, 4, 5].map(valor => (
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

                {/* GSE - CLIENTE SEM PARTICIPAÇÃO REVENDA */}
                {temGSE && tipoCliente === 'cliente' && participacaoRevenda === 'nao' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[0.5, 1, 1.5, 2, 2.5, 3].map(valor => (
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
                      ℹ️ Desconto máximo: 3%
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
              </div>
            </>
          )}

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
                  <span className="summary-value">{formatCurrency(precoAjustadoPorRegiao)}</span>
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
                    <span className="summary-value">- {formatCurrency(precoAjustadoPorRegiao * (descontoVendedor / 100))}</span>
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
      <SolicitarDescontoModal
        isOpen={modalSolicitacaoOpen}
        onClose={() => {
          if (!aguardandoAprovacao) {
            setModalSolicitacaoOpen(false);
          }
        }}
        onSolicitar={handleSolicitarDesconto}
        onVerificarStatus={handleVerificarStatus}
        equipamentoDescricao={itens[0] ? `${itens[0].subgrupo || ''} ${itens[0].modelo || ''}`.trim() : 'Equipamento'}
        valorBase={precoAjustadoPorRegiao}
        descontoAtual={descontoVendedor || 7}
        isLoading={aguardandoAprovacao}
      />
    </div>
  );
}
