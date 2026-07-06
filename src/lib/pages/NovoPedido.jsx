import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useOutletContext, useParams } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import LazyPDFGenerator from '../../components/LazyPDFGenerator';
import PaymentPolicy from '../../features/payment/PaymentPolicy';
import GuindasteConfigurador from '../../components/NovoPedido/GuindasteConfigurador';
import SeletorRegiaoCliente from '../../components/SeletorRegiaoCliente';
import LazyGuindasteImage from '../../components/LazyGuindasteImage';
import EstudosVeicularesMultiplos from '../../components/NovoPedido/EstudosVeicularesMultiplos';

import { db } from '../../config/supabase';
import { getGuindastesLite } from '../../api/guindastes';
import { getPropostaById, updateProposta, createpropostas } from '../../api/propostas';
import { normalizarRegiao } from '../../utils/regiaoHelper';
import { normalizarArray } from '../../utils/normalizadores';
import { formatCurrency, generateCodigoProduto } from '../../utils/formatters';
import { maskCPF, maskCNPJ } from '../../utils/masks';
import { createLogger } from '../../utils/productionLogger';
import { createDealInSalesIfNotExists } from '../../utils/bitrixClient';
import ResumoPedidoExterno from '../../components/NovoPedido/ResumoPedido';
import { isConcessionariaInterna } from '../../config/concessionariasInternas';
import '../../styles/NovoPedido.css';

// ⚡ Logger otimizado
const logger = createLogger('NovoPedido');

const NovoPedido = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { propostaId } = useParams(); // Captura ID da proposta para edição
  const { user } = useOutletContext(); // Pega o usuário do VendedorLayout
  const isConcessionariaUser = user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'admin_concessionaria';
  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
  const isAdminStark = user?.tipo === 'admin';
  const isModoConcessionaria = isAdminConcessionaria && location.pathname === '/nova-proposta-concessionaria';

  const regioesCompraDisponiveis = useMemo(() => ([
    'Norte-Nordeste',
    'Centro-Oeste',
    'Sul-Sudeste',
    'RS com Inscrição Estadual',
    'RS sem Inscrição Estadual',
    'Comércio Exterior',
  ]), []);
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = localStorage.getItem('novoPedido_currentStep');
      return saved ? Number(saved) : 1;
    } catch { return 1; }
  });
  const [maxStepReached, setMaxStepReached] = useState(() => {
    try {
      const saved = localStorage.getItem('novoPedido_maxStepReached');
      return saved ? Number(saved) : 1;
    } catch { return 1; }
  });
  const [isEdicao, setIsEdicao] = useState(false); // Modo edição
  const [propostaOriginal, setPropostaOriginal] = useState(null); // Dados originais da proposta
  const [carrinho, setCarrinho] = useState(() => {
    // ✅ Carrega do localStorage em modo edição, vindo de detalhes, ou retornando com guindaste selecionado
    if (propostaId || location.state?.fromDetalhes || location.state?.guindasteSelecionado) {
      const savedCart = localStorage.getItem('carrinho');
      try { return savedCart ? JSON.parse(savedCart) : []; } catch { return []; }
    }
    return [];
  });

  // Estados para carrinho acumulativo
  const [carrinhoAcumulativo, setCarrinhoAcumulativo] = useState(() => {
    if (propostaId || location.state?.fromDetalhes) {
      const saved = localStorage.getItem('carrinhoAcumulativo');
      try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    }
    return [];
  });
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [clienteData, setClienteData] = useState(() => {
    try {
      const savedCart = localStorage.getItem('carrinho');
      let hasCart = false;
      try { hasCart = Array.isArray(JSON.parse(savedCart || '[]')) && JSON.parse(savedCart || '[]').length > 0; } catch {}
      if (hasCart || propostaId || location.state?.fromDetalhes || location.state?.guindasteSelecionado) {
        const saved = localStorage.getItem('novoPedido_clienteData');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return {};
  });
  // MODIFICADO: caminhaoData agora é um array de estudos veiculares (um por equipamento)
  const [caminhaoData, setCaminhaoData] = useState(() => {
    try {
      const savedCart = localStorage.getItem('carrinho');
      let hasCart = false;
      try { hasCart = Array.isArray(JSON.parse(savedCart || '[]')) && JSON.parse(savedCart || '[]').length > 0; } catch {}
      if (hasCart || propostaId || location.state?.fromDetalhes || location.state?.guindasteSelecionado) {
        const saved = localStorage.getItem('novoPedido_caminhaoData');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return isModoConcessionaria ? [] : {};
  });

  // Helper: normalizar estudos veiculares para array seguro (modo concessionária)
  const normalizarEstudosVeiculares = useCallback((valor, carrinhoRef) => {
    try {
      let v = valor;
      if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch { v = null; }
      }
      if (v == null) v = [];
      if (!Array.isArray(v)) v = [v];

      const guindastes = (carrinhoRef || carrinho || []).filter(Boolean).filter(i => i?.tipo === 'guindaste');
      const totalEquip = guindastes.length;
      if (totalEquip <= 0) return v; // nada para alinhar

      // Ajustar tamanho: cortar excedente ou preencher faltantes
      let arr = v.slice(0, totalEquip);
      while (arr.length < totalEquip) arr.push({});

      // Garantir metadados do equipamento (nome/modelo/id) quando possível
      arr = arr.map((estudo, idx) => ({
        equipamentoIndex: idx,
        equipamentoId: guindastes[idx]?.id ?? estudo?.equipamentoId ?? null,
        equipamentoNome: guindastes[idx]?.nome || guindastes[idx]?.modelo || estudo?.equipamentoNome || `Equipamento ${idx + 1}`,
        tipo: estudo?.tipo || '',
        marca: estudo?.marca || '',
        modelo: estudo?.modelo || '',
        ano: estudo?.ano || '',
        voltagem: estudo?.voltagem || '',
        comprimentoChassi: estudo?.comprimentoChassi || '',
        patolamento: estudo?.patolamento || '',
        observacoes: estudo?.observacoes || '',
        ...estudo,
      }));

      return arr;
    } catch {
      return [];
    }
  }, [carrinho]);
  const [pagamentoData, setPagamentoData] = useState(() => {
    if (propostaId || location.state?.fromDetalhes || location.state?.guindasteSelecionado) {
      const saved = localStorage.getItem('novoPedido_pagamentoData');
      try {
        return saved ? JSON.parse(saved) : {
          tipoPagamento: '',
          prazoPagamento: '',
          desconto: 0,
          acrescimo: 0,
          valorFinal: 0,
          localInstalacao: '',
          tipoInstalacao: ''
        };
      } catch { /* cai no default abaixo */ }
    }
    return {
      tipoPagamento: '',
      prazoPagamento: '',
      desconto: 0,
      acrescimo: 0,
      valorFinal: 0,
      localInstalacao: '',
      tipoInstalacao: ''
    };
  });
  const [clienteTemIE, setClienteTemIE] = useState(true);
  // ✅ NOVO: Usar APENAS regioes_operacao (definidas pelo admin)
  // Se admin define 1 região, usa essa. Se define múltiplas, vendedor seleciona qual usar.
  const [regiaoClienteSelecionada, setRegiaoClienteSelecionada] = useState('');
  const [concessionariaInfo, setConcessionariaInfo] = useState(null);
  const [descontoConcessionaria, setDescontoConcessionaria] = useState(0);
  const [cotacaoUSD, setCotacaoUSD] = useState(null);
  
  // ✅ NOVO: Seletor de concessionária para uso interno da Stark
  const [concessionariasDisponiveis, setConcessionariasDisponiveis] = useState([]);
  const [concessionariaSelecionadaParaPedido, setConcessionariaSelecionadaParaPedido] = useState(null);
  const [podeEscolherConcessionaria, setPodeEscolherConcessionaria] = useState(false);

  // 🛡️ Proteção contra resets automáticos após avanço manual do usuário
  const usuarioJaTentouAvancarRef = useRef(false);
  const bloqueioResetAutomaticoRef = useRef(false);
  const regiaoRestauradaRef = useRef(false);

  // Auto-set região para modo concessionária (usa regiao_preco da concessionária cadastrada)
  // Só aplica se não há concessionária de destino selecionada (para não sobrescrever a região dela)
  React.useEffect(() => {
    if (!isModoConcessionaria || !concessionariaInfo) return;
    if (concessionariaSelecionadaParaPedido) return; // destino já selecionado, não sobrescrever
    const regiao = concessionariaInfo.regiao_preco || '';
    if (regiao) setRegiaoClienteSelecionada(regiao);
  }, [isModoConcessionaria, concessionariaInfo, concessionariaSelecionadaParaPedido]);

  // ✅ NOVO: Atualizar região quando concessionária selecionada muda (uso interno Stark)
  React.useEffect(() => {
    if (!isModoConcessionaria) return;
    
    // Se uma concessionária diferente foi selecionada, usar a região dela
    if (concessionariaSelecionadaParaPedido) {
      const regiaoSelecionada = concessionariaSelecionadaParaPedido.regiao_preco || '';
      if (regiaoSelecionada && regiaoSelecionada !== regiaoClienteSelecionada) {
        setRegiaoClienteSelecionada(regiaoSelecionada);
      }
    } else if (concessionariaInfo?.regiao_preco) {
      // Desmarcou a seleção: voltar para a região da concessionária logada
      const regiaoOriginal = concessionariaInfo.regiao_preco;
      if (regiaoOriginal !== regiaoClienteSelecionada) {
        setRegiaoClienteSelecionada(regiaoOriginal);
      }
    }
  }, [concessionariaSelecionadaParaPedido, isModoConcessionaria, concessionariaInfo]);

  // ✅ Ref para acessar concessionariaInfo sem criar dependência que causa re-run
  const concessionariaInfoRef = React.useRef(concessionariaInfo);
  React.useEffect(() => { concessionariaInfoRef.current = concessionariaInfo; }, [concessionariaInfo]);

  // ✅ Atualizar clienteData quando concessionária de destino muda (uso interno Stark)
  // Não depende de podeEscolherConcessionaria para evitar race condition com o async de carregamento
  React.useEffect(() => {
    if (!isModoConcessionaria) return;
    if (concessionariaSelecionadaParaPedido) {
      const dest = concessionariaSelecionadaParaPedido;
      setClienteData({
        nome: dest.nome || 'Concessionária',
        telefone: dest.telefone || '',
        email: dest.email || '',
        documento: dest.cnpj || '',
        endereco: dest.endereco || ''
      });
    } else {
      // Quando desmarca a seleção, voltar para a concessionária logada (via ref para não criar dependência circular)
      const ci = concessionariaInfoRef.current;
      if (ci) {
        setClienteData({
          nome: ci.nome || 'Concessionária',
          telefone: ci.telefone || '',
          email: ci.email || '',
          documento: ci.cnpj || '',
          endereco: ci.endereco || ''
        });
      }
    }
  }, [concessionariaSelecionadaParaPedido, isModoConcessionaria]);

  // ✅ Persistir currentStep e maxStepReached no localStorage
  useEffect(() => {
    localStorage.setItem('novoPedido_currentStep', String(currentStep));
    localStorage.setItem('novoPedido_maxStepReached', String(maxStepReached));
  }, [currentStep, maxStepReached]);

  // ✅ Limpar carrinho e dados ao entrar em novo pedido (não em modo edição)
  React.useEffect(() => {
    if (bloqueioResetAutomaticoRef.current) {
      console.warn('[STEP_RESET_IGNORED] reset automático de entrada ignorado — avanço manual já ocorreu');
      return;
    }
    // Se há carrinho no localStorage, significa que o usuário está no meio de um pedido
    // (possível reload de página) — NÃO limpar
    const savedCart = localStorage.getItem('carrinho');
    let hasCartItems = false;
    try {
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      hasCartItems = Array.isArray(parsed) && parsed.length > 0;
    } catch (e) {
      console.warn('[STEP_PRESERVE] Erro ao parsear carrinho do localStorage:', e);
    }
    if (hasCartItems) {
      console.log('[STEP_PRESERVE] Carrinho encontrado no localStorage — pulando reset automático de entrada');
      return;
    }
    // ⚠️ PROTEÇÃO: Não resetar se já estamos em uma etapa avançada (evita voltar para step 1 indevidamente)
    if (currentStep > 1 && carrinho.length > 0) {
      console.log('[STEP_PRESERVE] Etapa avançada detectada — pulando reset para evitar perda de progresso');
      return;
    }
    if (!propostaId && !location.state?.fromDetalhes && !location.state?.guindasteSelecionado) {
      console.log('[STEP_RESET] Executando reset inicial (novo pedido)');
      setCarrinho([]);
      setCarrinhoAcumulativo([]);
      setClienteData({});
      setCaminhaoData(isModoConcessionaria ? [] : {});
      setPagamentoData({
        tipoPagamento: '',
        prazoPagamento: '',
        desconto: 0,
        acrescimo: 0,
        valorFinal: 0,
        localInstalacao: '',
        tipoInstalacao: ''
      });
      if (!isModoConcessionaria) setRegiaoClienteSelecionada('');
      setCurrentStep(1);
      setMaxStepReached(1);
      setGuindastesSelecionados([]);
      localStorage.removeItem('carrinho');
      localStorage.removeItem('novoPedido_pagamentoData');
      localStorage.removeItem('novoPedido_clienteData');
      localStorage.removeItem('novoPedido_caminhaoData');
      localStorage.removeItem('carrinhoAcumulativo');
      localStorage.removeItem('novoPedido_currentStep');
      localStorage.removeItem('novoPedido_maxStepReached');
    }
  }, [propostaId, location.state?.fromDetalhes, location.state?.guindasteSelecionado, isModoConcessionaria]);

  // ✅ NOVO: Restaurar região quando voltar de DetalhesGuindaste
  React.useEffect(() => {
    if (location.state?.regiaoClienteSelecionada && !regiaoRestauradaRef.current) {
      regiaoRestauradaRef.current = true;
      setRegiaoClienteSelecionada(location.state.regiaoClienteSelecionada);
      // NÃO usar window.history.replaceState — isso quebra o state do React Router
      // e pode apagar guindasteSelecionado/step antes que o useEffect de processamento
      // tenha chance de rodar. Usamos ref para evitar loops.
    }
  }, [location.state?.regiaoClienteSelecionada]);

  // ✅ NOVO: Restaurar step quando voltar de DetalhesGuindaste (admin concessionária)
  React.useEffect(() => {
    if (location.state?.step && isModoConcessionaria) {
      const targetStep = location.state.step;
      setCurrentStep(targetStep);
      setMaxStepReached(Math.max(maxStepReached, targetStep));
    }
  }, [location.state?.step, isModoConcessionaria]);

  useEffect(() => {
    if (!isModoConcessionaria || !user?.concessionaria_id) return;
    const carregarConcessionaria = async () => {
      try {
        const c = await db.getConcessionariaById(user.concessionaria_id);
        setConcessionariaInfo(c);
        
        // ✅ Todo admin_concessionaria pode escolher a concessionária de destino do pedido
        // (isConcessionariaInterna é fallback para casos sem a coluna uso_interno_stark)
        const podeEscolher = isAdminConcessionaria || isConcessionariaInterna(c);
        setPodeEscolherConcessionaria(podeEscolher);
        
        // Se pode escolher, carregar lista de concessionárias
        if (podeEscolher) {
          const todasConcessionarias = await db.getConcessionarias(false); // apenas ativas
          setConcessionariasDisponiveis(todasConcessionarias || []);
        }
        
        setClienteData({
          nome: c?.nome || 'Concessionária',
          telefone: c?.telefone || '',
          email: c?.email || '',
          documento: c?.cnpj || '',
          endereco: c?.endereco || ''
        });
        const desconto = c?.desconto_compra ?? c?.desconto_base ?? 0;
        setDescontoConcessionaria(Number(desconto) || 0);
      } catch (error) {
        console.error('Erro ao carregar concessionária:', error);
        alert('Erro ao carregar dados da concessionária.');
      }
    };
    carregarConcessionaria();
  }, [isModoConcessionaria, user?.concessionaria_id]);

  useEffect(() => {
    if (location.pathname !== '/nova-proposta-concessionaria') return;
    if (isAdminStark) {
      navigate('/dashboard-admin');
    }
  }, [location.pathname, isAdminStark, navigate]);

  useEffect(() => {
    if (!user) return;
    const isExteriorUser =
      user.tipo === 'vendedor_exterior' ||
      normalizarRegiao(user.regiao) === 'comercio-exterior' ||
      normalizarArray(user?.regioes_operacao).some(r => normalizarRegiao(r) === 'comercio-exterior');

    if (!isExteriorUser) {
      setCotacaoUSD(null);
      return;
    }

    let cancelled = false;
    const loadCotacao = async () => {
      try {
        const v = await db.getCotacaoUSD();
        if (!cancelled) setCotacaoUSD(Number(v) || null);
      } catch (error) {
        console.error('Erro ao carregar cotação USD:', error);
        if (!cancelled) setCotacaoUSD(null);
      }
    };

    loadCotacao();
    return () => { cancelled = true; };
  }, [user]);

  // ✅ Sincronizar guindastesSelecionados com carrinho (crucial após refresh/localStorage)
  useEffect(() => {
    if (isModoConcessionaria) return; // concessionária usa carrinho, não guindastesSelecionados
    if (carrinho.length > 0 && guindastesSelecionados.length === 0) {
      const guindasteDoCarrinho = carrinho.find(item => item.tipo === 'guindaste');
      if (guindasteDoCarrinho) {
        console.log('[STEP_SYNC] Restaurando guindastesSelecionados do carrinho/localStorage:', {
          id: guindasteDoCarrinho.id,
          nome: guindasteDoCarrinho.nome,
          preco: guindasteDoCarrinho.preco,
        });
        setGuindastesSelecionados([guindasteDoCarrinho]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Normalizar estudos veiculares quando carrinho mudar (modo concessionária)
  useEffect(() => {
    if (!isModoConcessionaria) return;
    if (carrinho.length === 0) return;
    
    const guindastes = (carrinho || []).filter(Boolean).filter(i => i?.tipo === 'guindaste');
    if (guindastes.length === 0) return;
    
    // Se caminhaoData não é array ou tem tamanho diferente do carrinho, normalizar
    if (!Array.isArray(caminhaoData) || caminhaoData.length !== guindastes.length) {
      console.log('🔧 [NovoPedido] Normalizando estudos veiculares:', {
        guindastes: guindastes.length,
        estudosAtuais: Array.isArray(caminhaoData) ? caminhaoData.length : 'não é array'
      });
      const estudosNormalizados = normalizarEstudosVeiculares(caminhaoData, carrinho);
      setCaminhaoData(estudosNormalizados);
    }
  }, [carrinho, isModoConcessionaria, caminhaoData, normalizarEstudosVeiculares]);

  // Carregar proposta para edição (se houver propostaId na URL)
  React.useEffect(() => {
    const carregarPropostaParaEdicao = async () => {
      if (!propostaId) {
        // Modo criação: só limpar se não há sessão ativa em andamento
        const savedCart = localStorage.getItem('carrinho');
        let hasCart = false;
        try { const p = JSON.parse(savedCart || '[]'); hasCart = Array.isArray(p) && p.length > 0; } catch {}
        if (!hasCart) {
          setClienteData({});
          setCaminhaoData(isModoConcessionaria ? [] : {});
          localStorage.removeItem('novoPedido_clienteData');
          localStorage.removeItem('novoPedido_caminhaoData');
        }
        setIsEdicao(false);
        return;
      }

      try {
        const proposta = await getPropostaById(propostaId);
        console.log('PROPOSTA CARREGADA PARA EDIÇÃO:', proposta);
        console.log('dados_serializados:', proposta.dados_serializados);
        console.log('tipo dados_serializados:', typeof proposta.dados_serializados);

        if (!proposta) {
          alert('Proposta não encontrada!');
          navigate('/propostas');
          return;
        }

        setPropostaOriginal(proposta);
        setIsEdicao(true);

        // Carregar dados serializados
        const dados =
          typeof proposta.dados_serializados === 'string'
            ? JSON.parse(proposta.dados_serializados)
            : (proposta.dados_serializados || {});
        
        // Carregar carrinho
        if (dados.carrinho && Array.isArray(dados.carrinho)) {
          setCarrinho(dados.carrinho);
          localStorage.setItem('carrinho', JSON.stringify(dados.carrinho));
        }

        // Carregar dados do cliente
        if (dados.clienteData) {
          setClienteData(dados.clienteData);
        }

        // Carregar dados do caminhão / estudos veiculares
        if (isModoConcessionaria) {
          const estudos = normalizarEstudosVeiculares(dados.caminhaoData, dados.carrinho);
          setCaminhaoData(estudos);
        } else if (dados.caminhaoData) {
          setCaminhaoData(dados.caminhaoData);
        }

        // Carregar dados de pagamento
        if (dados.pagamentoData) {
          setPagamentoData(dados.pagamentoData);
        }

        setRegiaoClienteSelecionada(
          dados.regiaoClienteSelecionada || dados.regiaoCompraSelecionada || ''
        );

        // Definir step para o último (Finalizar) para permitir edição completa
        setCurrentStep(5);
        setMaxStepReached(5);

      } catch (error) {
        console.error('❌ Erro ao carregar proposta:', error);
        alert('Erro ao carregar proposta para edição');
        navigate('/propostas');
      }
    };

    carregarPropostaParaEdicao();
  }, [propostaId]);

  // Salvar dados no localStorage sempre que mudarem (rascunho da proposta em andamento)

  React.useEffect(() => {
    if (Object.keys(clienteData || {}).length > 0) {
      localStorage.setItem('novoPedido_clienteData', JSON.stringify(clienteData));
    }
  }, [clienteData]);

  React.useEffect(() => {
    const hasData = Array.isArray(caminhaoData)
      ? caminhaoData.some(e => e && Object.keys(e).length > 0)
      : Object.keys(caminhaoData || {}).length > 0;
    if (hasData) {
      localStorage.setItem('novoPedido_caminhaoData', JSON.stringify(caminhaoData));
    }
  }, [caminhaoData]);

  React.useEffect(() => {
    localStorage.setItem('novoPedido_pagamentoData', JSON.stringify(pagamentoData));
  }, [pagamentoData]);

  // Função para filtrar dados do caminhão para salvamento no banco
  const filterCaminhaoDataForDB = (caminhaoData) => {
    return {
      tipo: caminhaoData.tipo,
      marca: caminhaoData.marca,
      modelo: caminhaoData.modelo,
      ano: caminhaoData.ano || null,
      voltagem: caminhaoData.voltagem,
      observacoes: caminhaoData.observacoes || null,
      comprimento_chassi: caminhaoData.comprimentoChassi || null,
      patolamento: caminhaoData.patolamento || null
    };
  };

  // Verificar se há dados salvos para cada step
  const hasStepData = (stepId) => {
    switch (stepId) {
      case 1: // Selecionar Guindaste
        return carrinho.length > 0;
      case 2: // Pagamento
        return pagamentoData.tipoPagamento !== '' || pagamentoData.prazoPagamento !== '';
      case 3:
        return false;
      default:
        return false;
    }
  };

  // Função para limpar todos os dados salvos (útil para novo pedido)
  const clearAllSavedData = () => {
    localStorage.removeItem('novoPedido_clienteData');
    localStorage.removeItem('novoPedido_caminhaoData');
    localStorage.removeItem('novoPedido_pagamentoData');
    localStorage.removeItem('carrinho');
    setClienteData({});
    setCaminhaoData(isModoConcessionaria ? [] : {});
    setPagamentoData({
      tipoPagamento: '',
      prazoPagamento: '',
      desconto: 0,
      acrescimo: 0,
      valorFinal: 0,
      localInstalacao: '',
      tipoInstalacao: ''
    });
    setCarrinho([]);
    setCurrentStep(1);
    setMaxStepReached(1);
  };

  // ✅ NOVO: Determinar IE baseado na região selecionada (não em user.regiao)
  const determinarClienteTemIE = () => {
    if (currentStep >= 2 && (regiaoClienteSelecionada?.toLowerCase().includes('rs') || regiaoClienteSelecionada === 'rio grande do sul') && pagamentoData.tipoPagamento === 'cliente') {
      return !!clienteTemIE;
    }
    return true;
  };

  const regioesParaSeletor = useMemo(() => {
    const ops = normalizarArray(user?.regioes_operacao);
    if (ops.length > 0) return ops;
    if (isModoConcessionaria) return [];
    const principal = (user?.regiao || '').trim();
    return principal ? [principal] : [];
  }, [user?.regioes_operacao, user?.regiao, isModoConcessionaria]);

  // ✅ AUTO-SELEÇÃO: Quando vendedor Stark tem apenas 1 região, seleciona automaticamente
  React.useEffect(() => {
    if (isModoConcessionaria) return;
    if (regiaoClienteSelecionada) return;
    if (regioesParaSeletor.length === 1) {
      const unicaRegiao = regioesParaSeletor[0];
      console.log('[AUTO-SELEÇÃO] Vendedor tem apenas 1 região. Selecionando automaticamente:', unicaRegiao);
      setRegiaoClienteSelecionada(unicaRegiao);
    }
  }, [regioesParaSeletor, isModoConcessionaria, regiaoClienteSelecionada]);

  // ← NOVO: Função para recalcular preços quando o contexto muda
  const recalcularPrecosCarrinho = async () => {
    // ⚠️ PROTEÇÃO: Validar carrinho como array válido
    if (!Array.isArray(carrinho) || carrinho.length === 0 || !(regiaoClienteSelecionada || '').trim()) {
      return;
    }

    // Log diagnóstico do fluxo Nova Proposta
    const regioes = normalizarArray(user?.regioes_operacao);
    console.log('[NOVA PROPOSTA] recalcularPrecosCarrinho', {
      tipoUsuario: user?.tipo,
      regioes_operacao: regioes,
      regiaoSelecionada: regiaoClienteSelecionada,
      origemRegiao: concessionariaSelecionadaParaPedido 
        ? `concessionária selecionada: ${concessionariaSelecionadaParaPedido.nome}` 
        : 'regiaoClienteSelecionada',
      isConcessionaria: isConcessionariaUser,
      isModoConcessionaria,
      carrinhoItems: carrinho.length,
    });

    const temIE = determinarClienteTemIE();
    const regiaoVendedor = normalizarRegiao(regiaoClienteSelecionada, temIE);

    const carrinhoAtualizado = [];

    for (const item of carrinho) {
      // ⚠️ PROTEÇÃO: Validar item antes de processar
      if (!item || typeof item !== 'object') {
        console.warn('[recalcularPrecosCarrinho] Item inválido no carrinho, pulando:', item);
        continue;
      }

      if (item.tipo === 'guindaste') {
        try {
          let novoPreco = 0;
          if (isModoConcessionaria) {
            novoPreco = await db.getPrecoCompraPorRegiao(item.id, regiaoVendedor);
          } else {
            novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);
          }


          const isExteriorRecalc = regiaoVendedor === 'comercio-exterior';
          carrinhoAtualizado.push({
            ...item,
            preco: isExteriorRecalc ? (novoPreco || 0) : (novoPreco || item.preco || 0)
          });
        } catch (error) {
          console.error(` [recalcularPrecosCarrinho] Erro ao recalcular preço para ${item?.nome || 'item sem nome'}:`, error);
          carrinhoAtualizado.push(item);
        }
      } else {
        carrinhoAtualizado.push(item);
      }
    }


    // Verificar se houve mudança real nos preços antes de atualizar
    const houveAlteracao = Array.isArray(carrinhoAtualizado) && carrinhoAtualizado.some((itemNovo, index) => {
      const itemAntigo = carrinho[index];
      return itemAntigo && itemNovo?.preco !== itemAntigo?.preco;
    });

    if (houveAlteracao) {
      setCarrinho(carrinhoAtualizado);
      localStorage.setItem('carrinho', JSON.stringify(carrinhoAtualizado));
    }
  };

  // Recalcular preços quando contexto de pagamento mudar OU quando região selecionada mudar
  useEffect(() => {
    // ⚠️ PROTEÇÃO: Só recalcular se houver carrinho válido e região
    if (!Array.isArray(carrinho) || carrinho.length === 0 || !regiaoClienteSelecionada) {
      return;
    }
    // ⚠️ PROTEÇÃO: Não recalcular durante processamento de guindaste selecionado (evita race condition)
    if (location.state?.guindasteSelecionado) {
      console.log('[RECALC_SKIP] Pulando recálculo durante processamento de guindaste selecionado');
      return;
    }
    console.log('[RECALC_TRIGGER] Recalculando preços do carrinho');
    recalcularPrecosCarrinho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentoData?.tipoPagamento || '', pagamentoData?.participacaoRevenda || '', pagamentoData?.revendaTemIE || '', clienteTemIE, regiaoClienteSelecionada]);

  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesSelecionados, setGuindastesSelecionados] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  // ← MOVIDO: Definir funções antes dos useEffects
  // Funções do Carrinho
  const adicionarAoCarrinho = (item, tipo) => {
    const itemComTipo = { ...item, tipo };
    setCarrinho(prev => {
      let newCart;

      if (tipo === 'guindaste') {
        if (isModoConcessionaria) {
          // No modo concessionária: múltiplos guindastes permitidos
          const cartItemId = `${itemComTipo.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          newCart = [...prev, { ...itemComTipo, cartItemId, quantidade: 1 }];
        } else {
          // Para guindastes normais, remove qualquer guindaste existente e adiciona o novo
          const carrinhoSemGuindastes = prev.filter(item => item.tipo !== 'guindaste');
          newCart = [...carrinhoSemGuindastes, itemComTipo];
        }
      } else {
        // Para opcionais, apenas adiciona
        newCart = [...prev, { ...itemComTipo, quantidade: itemComTipo.quantidade || 1 }];
      }

      localStorage.setItem('carrinho', JSON.stringify(newCart));
      return newCart;
    });
  };

  // Função para carregar dados dos guindastes
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getGuindastesLite(1, 100, true);
      // ⚠️ PROTEÇÃO: Garantir que result.data é um array
      const all = Array.isArray(result?.data) ? result.data : [];

      const regioesOp = normalizarArray(user?.regioes_operacao);
      const isVendedorCE = Array.isArray(regioesOp) && regioesOp.some(r => {
        const rLower = (r || '').toLowerCase().trim();
        return rLower.includes('comércio exterior') || rLower.includes('comercio exterior') || rLower.includes('comercio-exterior');
      });

      // ⚠️ PROTEÇÃO: Garantir que all é array antes de filtrar
      const filtrados = Array.isArray(all) ? all.filter(g => {
        if (!g || typeof g !== 'object') return false;
        if (g?.is_prototipo && !isAdminStark) return false;

        if (g?.is_comercio_exterior) {
          if (!isAdminStark && !isVendedorCE) return false;
        }

        return true;
      }) : [];

      setGuindastes(filtrados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
      setGuindastes([]); // ⚠️ PROTEÇÃO: Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, [isAdminStark, user]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  // Ref para evitar duplicação por React StrictMode (double-fire do useEffect)
  const processedNavKeyRef = useRef(null);

  // Verificar se há um guindaste selecionado vindo da tela de detalhes
  useEffect(() => {
    const processarGuindasteSelecionado = async () => {
      if (location.state?.guindasteSelecionado) {
        const guindaste = location.state.guindasteSelecionado;
        console.log('[STEP_PROCESS] processarGuindasteSelecionado iniciado', {
          guindasteId: guindaste.id,
          stepNoState: location.state.step,
          locationKey: location.key,
          jaProcessado: processedNavKeyRef.current === location.key,
          timestamp: new Date().toISOString(),
        });

        // Evitar duplicação: se já processamos esta navegação, apenas limpa o state
        if (processedNavKeyRef.current === location.key) {
          console.warn('[STEP_PROCESS] navegação já processada anteriormente, limpando state');
          navigate(location.pathname, { replace: true, state: { fromDetalhes: true } });
          return;
        }
        processedNavKeyRef.current = location.key;
        
        setGuindastesSelecionados([guindaste]);

        //  VERIFICAR SE JÁ ESTÁ NO CARRINHO (evitar duplicação - apenas no fluxo normal)
        // Em modo concessionária, múltiplos guindastes são permitidos
        if (!isModoConcessionaria) {
          const jaNoCarrinho = carrinho.some(item => item.id === guindaste.id && item.tipo === 'guindaste');
          if (jaNoCarrinho) {
            // Não readicionar ao carrinho, mas garantir avanço de step
            if (location.state.step) {
              setCurrentStep(location.state.step);
              setMaxStepReached(prev => Math.max(prev, location.state.step));
            }
            navigate(location.pathname, { replace: true, state: { fromDetalhes: true } });
            return;
          }
        }

        // Buscar preço inicial baseado na região selecionada
        let precoGuindaste = guindaste.preco || 0;
        if (isModoConcessionaria) {
          // Se estamos voltando de DetalhesGuindaste, a região já foi restaurada
          const regiaoParaUsar = location.state?.regiaoClienteSelecionada || regiaoClienteSelecionada;
          if (!regiaoParaUsar) {
            alert('Selecione a Região de Compra antes de escolher o equipamento.');
            return;
          }
          try {
            const temIE = determinarClienteTemIE();
            const regiaoParaBusca = normalizarRegiao(regiaoParaUsar, temIE);
            precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoParaBusca);
          } catch (error) {
            console.error(' [adicionarGuindaste] Erro ao buscar preço de compra do guindaste:', error);
            precoGuindaste = guindaste.preco || 0;
          }
        } else {
        }

        // Adicionar ao carrinho com TODOS os detalhes (incluindo descricao, nao_incluido, finame e ncm)
        const produto = {
          id: guindaste.id,
          nome: guindaste.subgrupo,
          modelo: guindaste.modelo,
          codigo_produto: guindaste.codigo_referencia,
          grafico_carga_url: guindaste.grafico_carga_url,
          configuracao_lancas: guindaste.peso_kg,
          descricao: guindaste.descricao,
          nao_incluido: guindaste.nao_incluido,
          finame: guindaste.finame || '',
          ncm: guindaste.ncm || '',
          is_prototipo: !!guindaste.is_prototipo,
          prototipo_label: guindaste.prototipo_label || null,
          prototipo_observacoes_pdf: guindaste.prototipo_observacoes_pdf || null,
          prototipo_payment_set_id: guindaste.prototipo_payment_set_id || null,
          valor_instalacao_cliente: guindaste.valor_instalacao_cliente ?? null,
          valor_instalacao_incluso: guindaste.valor_instalacao_incluso ?? null,
          bloquear_desconto: !!guindaste.bloquear_desconto,
          preco: precoGuindaste,
          tipo: 'guindaste'
        };

        adicionarAoCarrinho(produto, 'guindaste');

        // Definir step correto
        if (isModoConcessionaria) {
          // Concessionária: ficar no step 1 para permitir adicionar mais equipamentos
          console.log('[STEP_PROCESS] Modo concessionária → mantendo step 1');
          setCurrentStep(1);
          setMaxStepReached(Math.max(maxStepReached, 1));
        } else if (location.state.step) {
          console.log('[STEP_PROCESS] Avançando para step', location.state.step, 'via location.state');
          setCurrentStep(location.state.step);
        } else {
          console.warn('[STEP_PROCESS] location.state.step ausente — currentStep NÃO será alterado automaticamente');
        }

        // Limpar o estado da navegação
        navigate(location.pathname, { replace: true, state: { fromDetalhes: true } });
      }
    };

    if (user) {
      processarGuindasteSelecionado();
    }
  }, [location.state, navigate, user]);


  // Efeito para resetar pagamento quando voltar para Step 1 OU quando equipamento mudar
  useEffect(() => {
    // Não resetar pagamento no modo edição (dados já carregados)
    if (isEdicao) return;
    // Reseta se voltar para Step 1
    if (currentStep === 1 && pagamentoData.tipoPagamento) {
      console.log('[STEP_RESET] Resetando pagamentoData ao voltar para Step 1');
      setPagamentoData({
        tipoPagamento: '',
        prazoPagamento: '',
        desconto: 0,
        acrescimo: 0,
        valorFinal: 0,
        localInstalacao: '',
        tipoInstalacao: ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const steps = isModoConcessionaria
    ? [
        { id: 1, title: 'Selecionar Guindaste', description: 'Escolha o guindaste ideal' },
        { id: 2, title: 'Pagamento',  description: 'Condição de compra' },
        { id: 3, title: 'Estudo Veicular',  description: 'configuracao do veículo' },
        { id: 4, title: 'Resumo', description: 'Revisar e gerar PDF' }
      ]
    : [
        { id: 1, title: 'Selecionar Guindaste',  description: 'Escolha o guindaste ideal' },
        { id: 2, title: 'Pagamento', description: 'Política de pagamento' },
        { id: 3, title: 'Dados do Cliente',  description: 'Informações do cliente' },
        { id: 4, title: 'Estudo Veicular',  description: 'configuracao do veículo' },
        { id: 5, title: 'Finalizar',  description: 'Revisar e confirmar' }
      ];

  // Capacidades dinâmicas com base nos guindastes carregados
  const getCapacidadesUnicas = () => {
    const set = new Set();

    (guindastes || []).forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) set.add(match[1]);
    });

    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  const getModelosPorCapacidade = (capacidade) => {
    
    const modelos = new Map();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match && match[1] === capacidade) {
        // Agrupar por modelo base (GSI 6.5, GSE 8.0C, etc.) - coluna "Modelo" da tabela
        if (!modelos.has(modeloBase)) {
          modelos.set(modeloBase, guindaste);
        }
      }
    });
    
    const resultado = Array.from(modelos.values());
    return resultado;
  };

  const getGuindastesPorModelo = (modelo) => {
    return guindastes.filter(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      return modeloBase === modelo;
    });
  };



  // Obter dados para a interface em cascata
  const capacidades = getCapacidadesUnicas();
  const modelosDisponiveis = selectedCapacidade ? getModelosPorCapacidade(selectedCapacidade) : [];
  const guindastesDisponiveis = selectedModelo ? getGuindastesPorModelo(selectedModelo) : [];
  
  const getPrecoParaConfigurador = async (guindasteId, regiaoOverride) => {
    try {
      if (isModoConcessionaria) {
        const regiaoParaUsar = (regiaoOverride ?? (regiaoClienteSelecionada || concessionariaInfo?.regiao_preco || '')).trim();
        if (!regiaoParaUsar) return 0;

        const regiao = normalizarRegiao(regiaoParaUsar, true);
        return await db.getPrecoCompraPorRegiao(guindasteId, regiao);
      }

      const regiaoSel = (regiaoOverride ?? regiaoClienteSelecionada ?? '').trim();
      if (!regiaoSel) return 0;

      if (normalizarRegiao(regiaoSel) === 'comercio-exterior') {
        return await db.getPrecoPorRegiao(guindasteId, 'comercio-exterior');
      }

      return await db.getPrecoPorRegiao(guindasteId, normalizarRegiao(regiaoSel));
    } catch (err) {
      console.error('[getPrecoParaConfigurador]', err);
      return 0;
    }
  };
  const getImagemParaConfigurador = useCallback((guindasteId) => {
    return db.getGuindasteImagem(guindasteId);
  }, []);

  //  OTIMIZADO: Função para selecionar guindaste com cache
  const handleSelecionarGuindaste = async (guindaste) => {
    logger.log('Selecionando guindaste:', guindaste.id, guindaste.subgrupo);
    
    // Mostrar loading
    setIsLoading(true);

    try {
      // 1. Buscar detalhes completos do guindaste (com cache automático)
      logger.time('Carregamento do guindaste');
      const guindasteCompleto = await db.getGuindasteCompleto(guindaste.id);
      logger.timeEnd('Carregamento do guindaste');
      
      // 2. Buscar preço inicial
      let precoGuindaste = 0;
      let regiaoInicial = 'concessionaria';
      if (isModoConcessionaria) {
        const regiaoParaUsar = regiaoClienteSelecionada ||
          concessionariaInfo?.regiao_preco || '';
        if (!regiaoParaUsar) {
          alert('Região de compra não definida. Configure a região no cadastro do usuário.');
          setIsLoading(false);
          return;
        }
        if (!regiaoClienteSelecionada) setRegiaoClienteSelecionada(regiaoParaUsar);

        regiaoInicial = normalizarRegiao(regiaoParaUsar, true);
        precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoInicial);
        logger.log(`Preço inicial (compra concessionária): R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert('Este equipamento não possui preço de compra definido para esta região.');
          setIsLoading(false);
          return;
        }
      } else {
        const regiaoSel = (regiaoClienteSelecionada || '').trim();
        if (!regiaoSel) {
          alert('Selecione a região do cliente antes de escolher o equipamento.');
          setIsLoading(false);
          return;
        }
        const isExteriorSel = normalizarRegiao(regiaoSel) === 'comercio-exterior';
        regiaoInicial = isExteriorSel ? 'comercio-exterior' : normalizarRegiao(regiaoSel);
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoInicial);
        // Log diagnóstico Nova Proposta
        console.log('[NOVA PROPOSTA] handleSelecionarGuindaste', {
          tipoUsuario: user?.tipo,
          regioes_operacao: normalizarArray(user?.regioes_operacao),
          regiaoSelecionada: regiaoClienteSelecionada,
          origemRegiao: 'regiaoClienteSelecionada',
          regiaoNormalizada: regiaoInicial,
          origemPreco: 'getPrecoPorRegiao',
          precoFinal: precoGuindaste,
          guindaste: guindaste.subgrupo || guindaste.id,
        });
        logger.log(`Preço inicial: R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert(
            isExteriorSel
              ? 'Este equipamento não possui preço definido para Comércio Exterior.'
              : 'Este equipamento não possui preço definido para a região selecionada.'
          );
          setIsLoading(false);
          return;
        }
      }

      // 3. Criar produto com preço correto e detalhes completos
      const produto = {
        id: guindasteCompleto.id,
        nome: guindasteCompleto.subgrupo,
        modelo: guindasteCompleto.modelo,
        codigo_produto: guindasteCompleto.codigo_referencia,
        grafico_carga_url: guindasteCompleto.grafico_carga_url,
        configuracao_lancas: guindasteCompleto.peso_kg,
        descricao: guindasteCompleto.descricao || '',
        nao_incluido: guindasteCompleto.nao_incluido || '',
        finame: guindasteCompleto.finame || '',
        ncm: guindasteCompleto.ncm || '',
        is_prototipo: !!guindasteCompleto.is_prototipo,
        prototipo_label: guindasteCompleto.prototipo_label || null,
        prototipo_observacoes_pdf: guindasteCompleto.prototipo_observacoes_pdf || null,
        prototipo_payment_set_id: guindasteCompleto.prototipo_payment_set_id || null,
        valor_instalacao_cliente: guindasteCompleto.valor_instalacao_cliente ?? null,
        valor_instalacao_incluso: guindasteCompleto.valor_instalacao_incluso ?? null,
        bloquear_desconto: !!guindasteCompleto.bloquear_desconto,
        preco: precoGuindaste,
        tipo: 'guindaste'
      };

      // 4. Para o fluxo de Novo Pedido da Concessionária: adicionar ao carrinho diretamente
      // Não redirecionar para /detalhes-guindaste neste fluxo
      if (isModoConcessionaria) {
        adicionarAoCarrinho(produto, 'guindaste');
        logger.log('[CONCESSIONARIA] Guindaste adicionado ao carrinho diretamente, mantendo step 1');
        return;
      }

      // 5. Fluxo normal: navegar para detalhes com objeto completo
      logger.log('Navegando para detalhes do guindaste (sem adicionar ao carrinho ainda)');
      const navState = {
        guindaste: { ...guindasteCompleto, preco: precoGuindaste },
        returnTo: '/novo-pedido',
        step: 2,
        regiaoClienteSelecionada: regiaoClienteSelecionada
      };
      console.log('[STEP_NAVIGATE] Indo para /detalhes-guindaste com state:', {
        step: navState.step,
        guindasteId: navState.guindaste.id,
        regiaoClienteSelecionada: navState.regiaoClienteSelecionada,
      });
      navigate('/detalhes-guindaste', { state: navState });
    } catch (error) {
      logger.error('Erro ao buscar dados do guindaste:', error);
      alert('Erro ao buscar dados do equipamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para selecionar capacidade
  const handleSelecionarCapacidade = (capacidade) => {
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null);
    setGuindastesSelecionados([]);
    
    // Adicionar efeito visual de destaque
    const card = document.querySelector(`[data-capacidade="${capacidade}"]`);
    if (card) {
      card.classList.add('selection-highlight');
      setTimeout(() => card.classList.remove('selection-highlight'), 1000);
    }
    
    // Scroll automático para a próxima etapa após um pequeno delay
    setTimeout(() => {
      const stepElement = document.querySelector('.cascata-step:nth-child(2)');
      if (stepElement) {
        // Calcular offset para mobile
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 120 : 80;
        
        const elementPosition = stepElement.offsetTop - offset;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  // Função para selecionar modelo
  const handleSelecionarModelo = (modelo) => {
    setSelectedModelo(modelo);
    setGuindastesSelecionados([]);
    
    // Adicionar efeito visual de destaque
    const card = document.querySelector(`[data-modelo="${modelo}"]`);
    if (card) {
      card.classList.add('selection-highlight');
      setTimeout(() => card.classList.remove('selection-highlight'), 1000);
    }
    
    // Scroll automático para a próxima etapa após um pequeno delay
    setTimeout(() => {
      const stepElement = document.querySelector('.cascata-step:nth-child(3)');
      if (stepElement) {
        // Calcular offset para mobile
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 120 : 80;
        
        const elementPosition = stepElement.offsetTop - offset;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };



  const removerItemPorIndex = (index) => {
    setCarrinho(prev => {
      const newCart = prev.filter((_, i) => i !== index);
      localStorage.setItem('carrinho', JSON.stringify(newCart));

      // ← NOVO: Se removeu o equipamento atual, limpar rastreamento
      const removedItem = prev[index];
      if (removedItem && removedItem.tipo === 'guindaste') {
      }

      return newCart;
    });
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
  };



  const getTotalCarrinho = () => {
    const total = carrinho.reduce((acc, item) => {
      const preco = parseFloat(item.preco) || 0;
      const quantidade = parseInt(item.quantidade, 10) || 1;
      return acc + (preco * quantidade);
    }, 0);
    return total;
  };

  // Funções para carrinho acumulativo
  const adicionarPedidoAoCarrinhoAcumulativo = () => {
    const novoPedido = {
      id: Date.now(), // ID único para o pedido
      carrinho: [...carrinho],
      clienteData: { ...clienteData },
      caminhaoData: Array.isArray(caminhaoData) ? caminhaoData.map(e => ({ ...e })) : { ...caminhaoData },
      pagamentoData: { ...pagamentoData },
      regiaoCliente: regiaoClienteSelecionada,
      timestamp: new Date().toISOString()
    };

    const novoCarrinhoAcumulativo = [...carrinhoAcumulativo, novoPedido];
    setCarrinhoAcumulativo(novoCarrinhoAcumulativo);
    localStorage.setItem('carrinhoAcumulativo', JSON.stringify(novoCarrinhoAcumulativo));
    
    return novoPedido;
  };

  const limparPedidoAtual = () => {
    setCarrinho([]);
    setClienteData({});
    setCaminhaoData({});
    setPagamentoData({
      tipoPagamento: '',
      prazoPagamento: '',
      desconto: 0,
      acrescimo: 0,
      valorFinal: 0,
      localInstalacao: '',
      tipoInstalacao: ''
    });
    setRegiaoClienteSelecionada('');
    setCurrentStep(1);
    setMaxStepReached(1);
    setGuindastesSelecionados([]);
    localStorage.removeItem('carrinho');
    localStorage.removeItem('novoPedido_pagamentoData');
    localStorage.removeItem('novoPedido_clienteData');
    localStorage.removeItem('novoPedido_caminhaoData');
    localStorage.removeItem('novoPedido_currentStep');
    localStorage.removeItem('novoPedido_maxStepReached');
    // Resetar flags de proteção para permitir novo ciclo
    usuarioJaTentouAvancarRef.current = false;
    bloqueioResetAutomaticoRef.current = false;
  };

  const limparCarrinhoAcumulativo = () => {
    setCarrinhoAcumulativo([]);
    localStorage.removeItem('carrinhoAcumulativo');
  };

  const removerDoCarrinhoAcumulativo = (pedidoId) => {
    const novoCarrinho = carrinhoAcumulativo.filter(p => p.id !== pedidoId);
    setCarrinhoAcumulativo(novoCarrinho);
    localStorage.setItem('carrinhoAcumulativo', JSON.stringify(novoCarrinho));
  };

  const getTotalCarrinhoAcumulativo = () => {
    return carrinhoAcumulativo.reduce((total, pedido) => {
      return total + pedido.carrinho.reduce((subtotal, item) => {
        const preco = parseFloat(item.preco) || 0;
        const quantidade = parseInt(item.quantidade, 10) || 1;
        return subtotal + (preco * quantidade);
      }, 0);
    }, 0);
  };




  // Renderizar conteúdo do step
  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <>
              {isModoConcessionaria ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8125rem', color: '#000000' }}>
                    <span>Região de compra: <strong>{regiaoClienteSelecionada || '...'}</strong></span>
                    {concessionariaSelecionadaParaPedido && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#0369a1', fontWeight: '600' }}>
                        (região de {concessionariaSelecionadaParaPedido.nome})
                      </span>
                    )}
                  </div>
                  
                  {/* ✅ NOVO: Seletor de concessionária para uso interno Stark */}
                  {podeEscolherConcessionaria && concessionariasDisponiveis.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                        Pedido realizado para:
                      </label>
                      <select
                        value={concessionariaSelecionadaParaPedido?.id || ''}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) {
                            setConcessionariaSelecionadaParaPedido(null);
                          } else {
                            const conc = concessionariasDisponiveis.find(c => String(c.id) === String(id));
                            setConcessionariaSelecionadaParaPedido(conc || null);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '0.875rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          background: 'white',
                          color: '#111827',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Usar minha concessionária ({concessionariaInfo?.nome})</option>
                        {concessionariasDisponiveis
                          .filter(c => String(c.id) !== String(user?.concessionaria_id)) // Não mostrar a própria
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </select>
                      {concessionariaSelecionadaParaPedido && (
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#6b7280' }}>
                          ℹ️ Este pedido será registrado em nome de <strong>{concessionariaSelecionadaParaPedido.nome}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <SeletorRegiaoCliente
                  regiaoSelecionada={regiaoClienteSelecionada}
                  onRegiaoChange={setRegiaoClienteSelecionada}
                  regioesDisponiveis={regioesParaSeletor}
                  questionLabel="Região do cliente"
                />
              )}
            </>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 10px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000000' }}> Selecionar Guindaste</span>
            </div>

            <GuindasteConfigurador
              guindastes={guindastes}
              onGuindasteSelect={handleSelecionarGuindaste}
              isLoading={isLoading}
              getPreco={getPrecoParaConfigurador}
              getImagem={getImagemParaConfigurador}
              precoContextKey={
                isModoConcessionaria
                  ? ((regiaoClienteSelecionada || '').trim() || concessionariaInfo?.regiao_preco || '')
                  : (regiaoClienteSelecionada || '').trim()
              }
            />

            {/* Mostrar carrinho e botão de continuar para modo concessionária */}
            {isModoConcessionaria && carrinho.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#1f2937', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Equipamentos no carrinho
                </div>
                {(carrinho || []).filter(Boolean).map((item, idx) => item?.tipo === 'guindaste' ? (
                  <div
                    key={item.cartItemId || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      marginBottom: '6px'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.3 }}>{item.nome}</div>
                      {item.modelo && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{item.modelo}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.9375rem' }}>{formatCurrency(parseFloat(item.preco) || 0)}</span>
                      <button
                        onClick={() => removerItemPorIndex(idx)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          lineHeight: 1
                        }}
                        title="Remover item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : null)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(102, 126, 234, 0.12)', border: '1px solid rgba(102, 126, 234, 0.35)', marginTop: '4px', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 800, color: '#1f2937', fontSize: '0.875rem' }}>Total ({(carrinho || []).filter(Boolean).filter(i => i?.tipo === 'guindaste').length} equip.)</span>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{formatCurrency(getTotalCarrinho())}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #a3a3a3 0%, #b5b5b5 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'black',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.18)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }}
                  >
                    Continuar para Pagamento ({(carrinho || []).filter(Boolean).filter(i => i?.tipo === 'guindaste').length} equip.)
                  </button>
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Política de Pagamento</h2>
              <p>{isModoConcessionaria ? 'Condição de compra para concessionária' : 'Selecione a forma de pagamento e visualize os descontos'}</p>
            </div>
            
            <PaymentPolicy
              key={`payment-${carrinho.find(item => item.tipo === 'guindaste')?.id || 'none'}-${regiaoClienteSelecionada}-${getTotalCarrinho()}`}
              precoBase={getTotalCarrinho()}
              onPaymentComputed={setPagamentoData}
              onFinish={handleNext}
              errors={validationErrors}
              user={user}
              clienteTemIE={clienteTemIE}
              onClienteIEChange={setClienteTemIE}
              carrinho={carrinho}
              onNext={handleNext}
              regiaoClienteSelecionada={regiaoClienteSelecionada}
              modoConcessionaria={isModoConcessionaria}
              descontoConcessionaria={descontoConcessionaria}
              cotacaoUSD={cotacaoUSD}
              caminhaoData={caminhaoData}
              initialPaymentData={isEdicao ? pagamentoData : null}
              concessionariaSelecionadaParaPedido={concessionariaSelecionadaParaPedido}
            />
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            {isModoConcessionaria ? (
              /* Estudo Veicular para Concessionária - Múltiplos Equipamentos */
              <EstudosVeicularesMultiplos
                carrinho={(carrinho || []).filter(Boolean)}
                estudosVeiculares={Array.isArray(caminhaoData) ? caminhaoData.filter(Boolean) : []}
                setEstudosVeiculares={setCaminhaoData}
                onNext={handleNext}
                onPrev={handlePrevious}
                errors={validationErrors}
                onPropostaRapida={() => {
                  const totalSteps = steps.length;
                  if (currentStep < totalSteps) {
                    setCurrentStep(currentStep + 1);
                    setMaxStepReached(Math.max(maxStepReached, currentStep + 1));
                    setValidationErrors({});
                  }
                }}
              />
            ) : (
              <>
                <div className="step-header-with-nav">
                  <button 
                    className="btn-back"
                    onClick={handlePrevious}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                    Voltar ao Pagamento
                  </button>
                  
                  <div className="step-header">
                    <h2>Dados do Cliente</h2>
                    <p>Preencha as informações do cliente para seguir</p>
                  </div>
                </div>
                
                <div className="client-form-container">
                  <ClienteForm formData={clienteData} setFormData={setClienteData} errors={validationErrors} user={user} />
                  
                  <div className="form-actions">
                    <button 
                      className="btn-continue"
                      onClick={handleNext}
                      disabled={!canGoNext()}
                    >
                      <span>Continuar para Estudo Veicular</span>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            {isModoConcessionaria ? (
              /* Resumo para Concessionária */
              <div className="step-content">
                <div className="step-header">
                  <h2>Resumo do Pedido de Compra</h2>
                  <p>Revise e gere o PDF</p>
                </div>
                
                <ResumoPedidoExterno
                  carrinho={carrinho}
                  clienteData={clienteData}
                  caminhaoData={caminhaoData}
                  pagamentoData={pagamentoData}
                  user={user}
                  guindastes={guindastes}
                  isEdicao={isEdicao}
                  propostaOriginal={propostaOriginal}
                  propostaId={propostaId}
                  onRemoverItem={removerItemPorIndex}
                  onLimparCarrinho={limparCarrinho}
                  isConcessionariaCompra={true}
                  concessionariaInfo={concessionariaInfo}
                  regiaoCompraSelecionada={regiaoClienteSelecionada}
                  regiaoClienteSelecionada={regiaoClienteSelecionada}
                  concessionariaSelecionadaParaPedido={concessionariaSelecionadaParaPedido}
                  cotacaoUSD={cotacaoUSD}
                />
              </div>
            ) : (
              <EstudoVeicular
                caminhaoData={caminhaoData}
                setCaminhaoData={setCaminhaoData}
                carrinho={carrinho}
                onNext={handleNext}
                onPrev={handlePrevious}
                errors={validationErrors}
                onPropostaRapida={() => {
                  const totalSteps = steps.length;
                  if (currentStep < totalSteps) {
                    setCurrentStep(currentStep + 1);
                    setMaxStepReached(Math.max(maxStepReached, currentStep + 1));
                    setValidationErrors({});
                  }
                }}
              />
            )}
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Resumo da Proposta</h2>
              <p>Revise e confirme as informações</p>
            </div>
            <ResumoPedidoExterno
              carrinho={carrinho}
              clienteData={clienteData}
              caminhaoData={caminhaoData}
              pagamentoData={pagamentoData}
              user={user}
              guindastes={guindastes}
              isEdicao={isEdicao}
              propostaOriginal={propostaOriginal}
              propostaId={propostaId}
              regiaoClienteSelecionada={regiaoClienteSelecionada}
              onRemoverItem={removerItemPorIndex}
              onLimparCarrinho={limparCarrinho}
              cotacaoUSD={cotacaoUSD}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // ========== VALIDAÇÃO CENTRALIZADA ETAPA 1 (DEBUG/SEGURANÇA) ==========
  function validarEtapaSelecionarGuindaste() {
    const erros = [];
    const itemGuindaste = carrinho.find(i => i.tipo === 'guindaste');
    const guindasteRef = guindastesSelecionados[0] || itemGuindaste || null;
    const codigoProduto = guindasteRef?.codigo_produto || guindasteRef?.codigo_referencia || '';
    const precoEquipamento = guindasteRef?.preco || 0;

    if (isModoConcessionaria) {
      if (!regiaoClienteSelecionada) erros.push('regiaoSelecionada ausente');
      if (!itemGuindaste) erros.push('nenhum guindaste no carrinho');
    } else {
      if (!guindasteRef) erros.push('guindasteSelecionado ausente e carrinho sem guindaste');
      if (!codigoProduto) erros.push('codigoProduto ausente');
      if (!precoEquipamento || Number(precoEquipamento) <= 0) erros.push('valorEquipamento inválido');
      if (guindastesSelecionados.length === 0 && !itemGuindaste) erros.push('nenhum guindaste selecionado');
    }

    return { erros, guindasteRef, codigoProduto, precoEquipamento };
  }

  function validateStep(step) {
    const errors = {};
    
    
    if (isModoConcessionaria) {
      if (step === 1) {
        if (!regiaoClienteSelecionada) errors.regiao = 'Selecione a região de compra';
        if (carrinho.length === 0) errors.guindaste = 'Selecione pelo menos um guindaste';
      }
      if (step === 2) {
        if (!pagamentoData.tipoFrete) errors.tipoFrete = 'Selecione o tipo de frete';
      }
      if (step === 3) {
        // Validar estudos veiculares - um para cada equipamento
        const guindastes = (carrinho || []).filter(Boolean).filter(item => item?.tipo === 'guindaste');
        if (!Array.isArray(caminhaoData)) {
          errors.estudos = 'Dados de estudo veicular inválidos';
        } else if (caminhaoData.filter(Boolean).length !== guindastes.length) {
          errors.estudos = `Preencha o estudo veicular para todos os ${guindastes.length} equipamentos`;
        } else {
          // Verificar se todos os estudos estão preenchidos
          caminhaoData.filter(Boolean).forEach((estudo, idx) => {
            if (!estudo?.tipo) errors[`estudo_${idx}_tipo`] = `Equipamento ${idx + 1}: Tipo do veículo é obrigatório`;
            if (!estudo?.marca) errors[`estudo_${idx}_marca`] = `Equipamento ${idx + 1}: Marca é obrigatória`;
            if (!estudo?.modelo) errors[`estudo_${idx}_modelo`] = `Equipamento ${idx + 1}: Modelo é obrigatório`;
            if (!estudo?.voltagem) errors[`estudo_${idx}_voltagem`] = `Equipamento ${idx + 1}: Voltagem é obrigatória`;
          });
        }
      }
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    }
    switch (step) {
      case 1:
        if (guindastesSelecionados.length === 0) {
          errors.guindaste = 'Selecione pelo menos um guindaste';
        }
        break;
      case 2:
        if (!pagamentoData.tipoPagamento) {
          errors.tipoPagamento = 'Selecione o tipo de pagamento';
        }
        
        // Prazo de pagamento NÃO é obrigatório se houver financiamento bancário
        if (!pagamentoData.prazoPagamento && pagamentoData.financiamentoBancario !== 'sim') {
          errors.prazoPagamento = 'Selecione o prazo de pagamento';
        }
        
        // Local de instalação e tipo de instalação são obrigatórios apenas para cliente
        if (pagamentoData.tipoPagamento === 'cliente') {
          if (!pagamentoData.localInstalacao) {
            errors.localInstalacao = 'Informe o local de instalação';
          }
          if (!pagamentoData.tipoInstalacao) {
            errors.tipoInstalacao = 'Selecione o tipo de instalação';
          }
          // Participação de revenda é obrigatória para cliente
          if (!pagamentoData.participacaoRevenda) {
            errors.participacaoRevenda = 'Selecione se há participação de revenda';
          }
          // Se respondeu participação, IE/Tipo é obrigatório
          if (pagamentoData.participacaoRevenda && !pagamentoData.revendaTemIE) {
            errors.revendaTemIE = 'Selecione o tipo de cliente/revenda';
          }
        }
        
        if (!pagamentoData.tipoFrete) {
          errors.tipoFrete = 'Selecione o tipo de frete';
        }
        break;
      case 3:
        if (!clienteData.nome) errors.nome = 'Nome é obrigatório';
        if (!clienteData.telefone) errors.telefone = 'Telefone é obrigatório';
        if (!clienteData.modoInternacional) {
          if (!clienteData.documento) errors.documento = 'CNPJ ou CPF é obrigatório';
          if (!clienteData.inscricao_estadual || (clienteData.inscricao_estadual !== 'ISENTO' && clienteData.inscricao_estadual.trim() === '')) {
            errors.inscricao_estadual = 'Inscrição Estadual é obrigatória';
          }
          if (!clienteData.endereco) errors.endereco = 'Endereço é obrigatório';
        }
        break;
      case 4:
        if (!caminhaoData.tipo) errors.tipo = 'Tipo do veículo é obrigatório';
        if (!caminhaoData.marca) errors.marca = 'Marca é obrigatória';
        if (!caminhaoData.modelo) errors.modelo = 'Modelo é obrigatório';
        if (!caminhaoData.voltagem) errors.voltagem = 'Voltagem é obrigatória';
        // Ano é opcional; se informado, validar intervalo
        if (caminhaoData.ano && (parseInt(caminhaoData.ano) < 1960 || parseInt(caminhaoData.ano) > new Date().getFullYear())) {
          errors.ano = 'Ano inválido';
        }
        break;
    }
    
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  function canGoNext() {
    if (isModoConcessionaria) {
      switch (currentStep) {
        case 1:
          return carrinho.length > 0 && !!regiaoClienteSelecionada;
        case 2:
          return !!pagamentoData.tipoFrete;
        case 3:
          // Validar que todos os equipamentos tenham estudo veicular preenchido
          const guindastes = (carrinho || []).filter(Boolean).filter(item => item?.tipo === 'guindaste');
          if (Array.isArray(caminhaoData)) {
            const estudosValidos = caminhaoData.filter(Boolean);
            return estudosValidos.length === guindastes.length && 
                   estudosValidos.every(estudo => estudo?.tipo && estudo?.marca && estudo?.modelo && estudo?.voltagem);
          }
          return false;
        default:
          return false;
      }
    }
    switch (currentStep) {
      case 1:
        return guindastesSelecionados.length > 0;
      case 2:
        // Para revenda, apenas tipoPagamento, prazoPagamento e tipoFrete são obrigatórios
        if (pagamentoData.tipoPagamento === 'revenda') {
          return pagamentoData.tipoPagamento && 
                 pagamentoData.prazoPagamento && 
                 pagamentoData.tipoFrete;
        }
        // Para cliente com financiamento bancário, não exige prazoPagamento
        if (pagamentoData.tipoPagamento === 'cliente' && pagamentoData.financiamentoBancario === 'sim') {
          return pagamentoData.tipoPagamento && 
                 pagamentoData.localInstalacao && 
                 pagamentoData.tipoInstalacao &&
                 pagamentoData.tipoFrete &&
                 pagamentoData.participacaoRevenda &&
                 (pagamentoData.participacaoRevenda ? pagamentoData.revendaTemIE : true);
        }
        // Para cliente sem financiamento bancário, todos os campos são obrigatórios
        return pagamentoData.tipoPagamento && 
               pagamentoData.prazoPagamento && 
               pagamentoData.localInstalacao && 
               pagamentoData.tipoInstalacao &&
               pagamentoData.tipoFrete &&
               pagamentoData.participacaoRevenda &&
               (pagamentoData.participacaoRevenda ? pagamentoData.revendaTemIE : true);
      case 3:
        if (clienteData.modoInternacional) {
          return !!(clienteData.nome && clienteData.telefone);
        }
        return !!(clienteData.nome && 
               clienteData.telefone && 
               clienteData.email && 
               clienteData.documento && 
               clienteData.inscricao_estadual && 
               clienteData.endereco);
      case 4:
        return caminhaoData.tipo && 
               caminhaoData.marca && 
               caminhaoData.modelo && 
               caminhaoData.voltagem;
      case 5:
        return true;
      default:
        return false;
    }
  };

  function handleNext() {
    // 🛡️ Marcar que usuário tentou avançar manualmente (bloqueia resets automáticos)
    usuarioJaTentouAvancarRef.current = true;
    bloqueioResetAutomaticoRef.current = true;

    // Log detalhado ANTES da validação (etapa 1 é crítica para o bug)
    if (currentStep === 1) {
      const itemGuindaste = carrinho.find(i => i.tipo === 'guindaste');
      const guindasteRef = guindastesSelecionados[0] || itemGuindaste || null;
      const { erros } = validarEtapaSelecionarGuindaste();
      console.log('[STEP_DEBUG] tentativa avanço etapa 1 -> 2', {
        etapaAtual: currentStep,
        regiaoSelecionada: regiaoClienteSelecionada,
        guindasteSelecionado: guindastesSelecionados[0] || null,
        varianteSelecionada: guindasteRef?.subgrupo || guindasteRef?.nome || '',
        configuracaoSelecionada: guindasteRef?.configuracao_lancas || '',
        codigoProduto: guindasteRef?.codigo_produto || guindasteRef?.codigo_referencia || '',
        precoEquipamento: guindasteRef?.preco || 0,
        carrinhoLength: carrinho.length,
        carrinhoTemGuindaste: !!itemGuindaste,
        guindastesSelecionadosLength: guindastesSelecionados.length,
        errosValidacao: erros,
        timestamp: new Date().toISOString()
      });
    }

    if (isModoConcessionaria && currentStep === 2) {
      const itensValidos = (carrinho || []).filter(Boolean);
      const itensInvalidos = (carrinho || [])
        .map((item, idx) => (!item ? idx : null))
        .filter(idx => idx !== null);
      const guindastesParaEstudo = itensValidos.filter(item => item?.tipo === 'guindaste');
      console.log('[MODO_CONCESSIONARIA] carrinho antes de avançar para estudo veicular:', carrinho);
      console.log('[MODO_CONCESSIONARIA] itens inválidos encontrados:', itensInvalidos);
      console.log('[MODO_CONCESSIONARIA] guindastesParaEstudo:', guindastesParaEstudo);
      console.log('[MODO_CONCESSIONARIA] índice atual do estudo veicular:', 0);
      console.log('[MODO_CONCESSIONARIA] equipamento atual do estudo:', guindastesParaEstudo[0] || null);
      if (guindastesParaEstudo.length > 0) {
        const estudosNormalizados = normalizarEstudosVeiculares(caminhaoData, itensValidos);
        setCaminhaoData(estudosNormalizados);
      }
    }

    const isValid = validateStep(currentStep);

    const totalSteps = steps.length;
    if (isValid && currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      setValidationErrors({}); // Limpar erros ao avançar
      console.log('[STEP_SUCCESS] avançou da etapa', currentStep, 'para', nextStep);
    } else {
      console.warn('[STEP_BLOCKED] avanço bloqueado na etapa', currentStep);
      if (currentStep === 1) {
        const { erros } = validarEtapaSelecionarGuindaste();
        console.warn('[STEP_BLOCKED] avanço para pagamento bloqueado', {
          motivo: erros.length > 0 ? 'validação falhou' : 'validação de outro step falhou',
          campoAusente: erros,
          estadoAtualCompleto: {
            currentStep,
            regiaoClienteSelecionada,
            guindastesSelecionadosLength: guindastesSelecionados.length,
            carrinhoLength: carrinho.length,
            carrinho: (carrinho || []).filter(Boolean).map(i => ({ id: i?.id, tipo: i?.tipo, nome: i?.nome, preco: i?.preco })),
          }
        });
      } else {
        console.warn('⚠️ Não pode avançar. isValid:', isValid, 'currentStep:', currentStep);
        console.warn('📋 Campos obrigatórios faltando:', Object.keys(validationErrors));
      }
    }
  };

  function handlePrevious() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // O reset do pagamentoData é feito pelo useEffect que monitora currentStep
    }
  };

  function handleStepClick(stepId) {
    // Permite navegar para qualquer step que já foi alcançado
    if (stepId <= maxStepReached) {
      setCurrentStep(stepId);
      setValidationErrors({}); // Limpar erros ao navegar
    }
  };



  const handleFinish = async () => {
    try {
      // Salvar relatório no banco de dados
      await salvarRelatorio();
      
      // Limpar carrinho e navegar para histórico
      limparCarrinho();
      navigate(isModoConcessionaria ? '/dashboard-admin' : '/historico');
      
      alert('Proposta finalizada e salva com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar proposta:', error);
      alert('Erro ao salvar proposta. Tente novamente.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="novo-pedido-container">
      <UnifiedHeader
        showBackButton={true}
        onBackClick={() => navigate(isModoConcessionaria ? '/dashboard-admin' : '/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title={isEdicao ? `Editar Proposta #${propostaOriginal?.numero_proposta || ''}` : (isModoConcessionaria ? 'Novo Pedido da Concessionária' : 'Nova Proposta')}
        subtitle={isEdicao ? "Atualize os dados da proposta existente" : (isModoConcessionaria ? 'Compra interna simplificada' : 'Criar orçamento profissional')}
        extraButtons={[
          import.meta.env.DEV && (
            <>
              <button
                key="debug-prices"
                onClick={async () => {

                  // Verificar preços de todas as regiões para os primeiros equipamentos
                  const regioesParaTestar = ['rs-com-ie', 'rs-sem-ie', 'sul-sudeste'];
                  const equipamentosParaTestar = guindastes.slice(0, 3);

                  for (const equipamento of equipamentosParaTestar) {

                    for (const regiao of regioesParaTestar) {
                      try {
                        const preco = await db.getPrecoPorRegiao(equipamento.id, regiao);
                      } catch (error) {
                        console.error(`  ❌ Erro em ${regiao}:`, error.message);
                      }
                    }
                  }

                  // Testar lógica atual
                  const temIE = determinarClienteTemIE();
                  const regiaoAtual = (regiaoClienteSelecionada || '').trim()
                    ? normalizarRegiao(regiaoClienteSelecionada, temIE)
                    : null;
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '5px'
                }}
                title="Debug completo de preços"
              >
                🔍 DEBUG PREÇOS
              </button>
              <button
                key="test-context"
                onClick={() => {

                  // Simular mudança de contexto
                  setPagamentoData({
                    ...pagamentoData,
                    tipoPagamento: 'cliente',
                    participacaoRevenda: 'sim',
                    revendaTemIE: 'nao'
                  });
                }}
                style={{
                  background: '#ffc107',
                  color: 'black',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Testar mudança de contexto"
              >
                🧪 TESTE CONTEXTO
              </button>
            </>
          )
        ]}
      />

      {/* Banner de Edição */}
      {isEdicao && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px 24px',
          margin: '0 24px 20px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>✏️</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
              Modo Edição Ativo
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Você está editando a proposta <strong>#{propostaOriginal?.numero_proposta}</strong>. 
              As alterações substituirão os dados atuais ao gerar o PDF.
            </div>
          </div>
        </div>
      )}

      <div className="novo-pedido-content">
        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar-background">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
        <div className="progress-info">
          <span className="progress-text">Etapa {currentStep} de {steps.length}</span>
          <span className="progress-percentage">{Math.round((currentStep / steps.length) * 100)}%</span>
        </div>
      </div>

        {/* Progress Steps */}
        <div className={`progress-steps step-${currentStep}`}>
          {steps.map((step) => (
            <div
              key={step.id}
              className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''} ${step.id <= maxStepReached ? 'clickable' : 'disabled'} ${hasStepData(step.id) ? 'has-data' : ''}`}
              onClick={() => handleStepClick(step.id)}
            >
              <div className="step-number">
                {currentStep > step.id ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="content-area">
            {renderStepContent()}
          </div>

        </div>
      </div>
    </div>
  );
};

// Função para extrair configurações do título do guindaste com ícones
const extrairConfiguracoes = (subgrupo) => {
  const configuracoes = [];
  
  // Extrair configurações do título (mais específico para evitar falsos positivos)
  if (subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/')) {
    configuracoes.push({  text: 'CR - Controle Remoto' });
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push({ text: 'EH - Extensiva Hidráulica' });
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push({ text: 'ECS - Extensiva Cilindro Superior' });
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push({ text: 'P - Preparação p/ Perfuratriz' });
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push({ text: 'GR - Preparação p/ Garra e Rotator' });
  }
  if (subgrupo.includes('Caminhão 3/4')) {
    configuracoes.push({ text: 'Caminhão 3/4' });
  }
  
  return configuracoes;
};



// Componente Card do Guindaste - Design Profissional
const GuindasteCard = ({ guindaste, isSelected, onSelect }) => {
  const configuracoes = extrairConfiguracoes(guindaste.subgrupo);

  return (
    <div className={`guindaste-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      {/* Badges de Status */}
      <div className="card-badge">
        {isSelected && <span className="badge-selected">Selecionado</span>}
        {guindaste.codigo_referencia && (
          <span className="badge-codigo">#{guindaste.codigo_referencia}</span>
        )}
      </div>

      {/* Cabeçalho com Imagem e Informações Principais */}
      <div className="card-header">
        <div className="guindaste-image-container">
          {/* ⚡ Lazy loading sob demanda com cache de 30min — sem download em massa de base64 */}
          <LazyGuindasteImage
            guindasteId={guindaste.id}
            subgrupo={guindaste.subgrupo}
            alt={guindaste.subgrupo}
            className="guindaste-thumbnail"
          />
          {configuracoes.length > 0 && (
            <div className="config-badges">
              {configuracoes.slice(0, 3).map((config, idx) => (
                <span
                  key={idx}
                  className="config-badge"
                  title={config.text}
                >
                  {config.icon}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="guindaste-main-info">
          <h3 className="guindaste-title">
            {guindaste.subgrupo}
          </h3>
          <div className="guindaste-meta">
            <span className="categoria">{guindaste.Grupo}</span>
            {guindaste.codigo_referencia && (
              <span className="codigo-display">Cód: {guindaste.codigo_referencia}</span>
            )}
          </div>
        </div>
      </div>

      {/* Corpo do Card com Especificações Detalhadas */}
      <div className="card-body">
        <div className="specs-grid">
          <div className="spec-item">
            <div className="spec-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            </div>
            <div className="spec-content">
              <span className="spec-label">configuracao de Lanças</span>
              <span className="spec-value">{guindaste.peso_kg || 'Padrão'}</span>
            </div>
          </div>

          {configuracoes.length > 0 && (
            <div className="spec-item">
              <div className="spec-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="spec-content">
                <span className="spec-label">Opcionais Incluídos</span>
                <div className="opcionais-list">
                  {configuracoes.slice(0, 2).map((config, idx) => (
                    <span key={idx} className="opcional-item">
                      {config.icon} {config.text}
                    </span>
                  ))}
                  {configuracoes.length > 2 && (
                    <span className="opcional-more">+{configuracoes.length - 2} mais</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Área de Ações */}
        <div className="card-footer">
          <button className={`btn-select ${isSelected ? 'selected' : ''}`}>
            {isSelected ? (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Selecionado
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                  <path d="M2.05 11.05a13.99 13.99 0 0 1 11.9-11.9"/>
                  <path d="M21.95 12.95a13.99 13.99 0 0 1-11.9 11.9"/>
                </svg>
                Selecionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Card do Opcional
const OpcionalCard = ({ opcional, isSelected, onToggle }) => {
  return (
    <div className={`opcional-card ${isSelected ? 'selected' : ''}`} onClick={onToggle}>
      <div className="opcional-header">
        <div className="checkbox">
          <input type="checkbox" checked={isSelected} readOnly />
          <div className="checkmark"></div>
        </div>
        <div className="opcional-info">
          <h4>{opcional.nome}</h4>
          <p>{opcional.descricao}</p>
          <span className="categoria">{opcional.categoria}</span>
        </div>
        <div className="price">{formatCurrency(opcional.preco)}</div>
      </div>
    </div>
  );
};

// Componente Política de Pagamento foi movido para src/features/payment/PaymentPolicy.jsx

// Componente Form do Cliente
const ClienteForm = ({ formData, setFormData, errors = {}, user }) => {
  const isExteriorUser = user?.tipo === 'vendedor_exterior' ||
    (user?.regioes_operacao || []).some(r => (r || '').toLowerCase().includes('exterior'));

  const onlyDigits = (value) => (value || '').replace(/\D/g, '');
  const maskCEP = (value) => {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };
  const maskPhone = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    const ddd = digits.slice(0, 2);
    const isMobile = digits.length > 10;
    const partA = isMobile ? digits.slice(2, 7) : digits.slice(2, 6);
    const partB = isMobile ? digits.slice(7, 11) : digits.slice(6, 10);
    let out = '';
    if (ddd) out += `(${ddd}`;
    if (ddd.length === 2) out += ') ';
    out += partA;
    if (partB) out += `-${partB}`;
    return out;
  };
  const composeEndereco = (data, internacional = false) => {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(`, ${data.numero}`);
    if (data.bairro) parts.push(` - ${data.bairro}`);
    if (data.cidade || data.uf) parts.push(` - ${data.cidade || ''}${data.uf ? (data.cidade ? '/' : '') + data.uf : ''}`);
    if (data.cep) parts.push(internacional ? ` - ${data.cep}` : ` - CEP: ${data.cep}`);
    if (internacional && data.pais) parts.push(` - ${data.pais}`);
    return parts.join('');
  };
  const [cidadesUF, setCidadesUF] = React.useState([]);
  const [loadingCidades, setLoadingCidades] = React.useState(false);
  const [manualEndereco, setManualEndereco] = React.useState(false);
  const [isentoIE, setIsentoIE] = React.useState(false);
  const [semEmail, setSemEmail] = React.useState(false);
  const [modoInternacional, setModoInternacional] = React.useState(isExteriorUser);

  React.useEffect(() => {
    setFormData(prev => ({ ...prev, modoInternacional }));
  }, [modoInternacional]);

  const toggleModo = () => {
    setModoInternacional(prev => {
      const next = !prev;
      setFormData(d => {
        const cleared = { ...d, uf: '', cidade: '', cep: '', pais: next ? (d.pais || '') : '' };
        cleared.endereco = composeEndereco(cleared, next);
        return cleared;
      });
      return next;
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      let maskedValue = value;
      // Campos numéricos: aceitar apenas dígitos
      if (field === 'telefone') maskedValue = maskPhone(value.replace(/\D/g, ''));
      else if (field === 'cep') maskedValue = modoInternacional ? value : maskCEP(value.replace(/\D/g, ''));
      else if (field === 'documento') {
        if (modoInternacional) {
          maskedValue = value;
        } else {
          const digits = value.replace(/\D/g, '');
          maskedValue = digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
        }
      }
      else if (field === 'inscricao_estadual' && value !== 'ISENTO') {
        // IE: aceitar apenas números (exceto quando é ISENTO)
        maskedValue = value.replace(/\D/g, '');
      }
      else {
        maskedValue = value;
      }
      const next = { ...prev, [field]: maskedValue };
      // Consistência BR: ao mudar UF/Cidade manualmente, limpar CEP; ao mudar UF, limpar Cidade
      if (!modoInternacional) {
        if (field === 'uf') {
          next.cidade = '';
          if (!manualEndereco) {
            next.cep = '';
            next.logradouro = '';
            next.numero = '';
            next.bairro = '';
          }
        }
        if (field === 'cidade') {
          if (!manualEndereco && next.cep) {
            next.cep = '';
            next.logradouro = '';
            next.numero = '';
            next.bairro = '';
          }
        }
      }
      // Se o campo alterado é parte do endereço detalhado, atualizar 'endereco' composto
      if ([
        'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep', 'pais'
      ].includes(field)) {
        next.endereco = composeEndereco(next, modoInternacional);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (manualEndereco || modoInternacional) return;
    const raw = onlyDigits(formData.cep || '');
    if (raw.length !== 8) return;
    let cancelled = false;
    const fetchCEP = async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await response.json();
        if (cancelled || !data || data.erro) return;
        setFormData(prev => {
          const next = {
            ...prev,
            cep: maskCEP(raw),
            // CEP é a fonte da verdade para UF e Cidade
            uf: data.uf || '',
            cidade: data.localidade || '',
            // Logradouro e bairro: preencher apenas se ainda não informados
            logradouro: prev.logradouro || data.logradouro || '',
            bairro: prev.bairro || data.bairro || '',
          };
          next.endereco = composeEndereco(next);
          return next;
        });
      } catch (_) {
        // silencioso
      }
    };
    fetchCEP();
    return () => { cancelled = true; };
  }, [formData.cep, setFormData, manualEndereco]);

  // Carregar cidades quando UF mudar
  React.useEffect(() => {
    const uf = (formData.uf || '').trim();
    if (!uf) {
      setCidadesUF([]);
      return;
    }
    let cancelled = false;
    const loadCidades = async () => {
      try {
        setLoadingCidades(true);
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        const arr = await res.json();
        if (cancelled || !Array.isArray(arr)) return;
        const nomes = arr.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setCidadesUF(nomes);
      } catch (_) {
        setCidadesUF([]);
      } finally {
        if (!cancelled) setLoadingCidades(false);
      }
    };
    loadCidades();
    return () => { cancelled = true; };
  }, [formData.uf]);

  return (
    <div className="client-form">
      {/* Informações Pessoais */}
     <div className="client-form-container">
  <div className="client-form">

    {/* Informações pessoais */}
    <div className="form-section">
      <div className="section-header">
        <div>
          <h3>Informações pessoais</h3>
          <p>Dados básicos do cliente</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Nome completo *</label>
          <input
            type="text"
            value={formData.nome || ''}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Digite o nome completo"
            className={errors.nome ? 'error' : ''}
          />
          {errors.nome && <span className="error-message">{errors.nome}</span>}
        </div>

        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
            className={errors.telefone ? 'error' : ''}
          />
          {errors.telefone && <span className="error-message">{errors.telefone}</span>}
        </div>

        <div className="form-group">
          <label>Email</label>

          <div className="checkbox-row">
            <input
              type="checkbox"
              id="semEmail"
              checked={semEmail}
              onChange={(e) => {
                setSemEmail(e.target.checked);
                if (e.target.checked) {
                  handleChange('email', 'naopossui@gmail.com');
                } else {
                  handleChange('email', '');
                }
              }}
            />
            <label htmlFor="semEmail">Não possui e-mail</label>
          </div>

          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={semEmail ? 'naopossui@gmail.com' : 'email@exemplo.com'}
            className={errors.email ? 'error' : ''}
            disabled={semEmail}
          />

          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label>{modoInternacional ? 'Documento / ID' : 'CNPJ ou CPF *'}</label>
          <input
            type="text"
            value={formData.documento || ''}
            onChange={(e) => handleChange('documento', e.target.value)}
            placeholder={modoInternacional ? 'Número de identificação fiscal' : '000.000.000-00'}
            className={errors.documento ? 'error' : ''}
          />
          {errors.documento && <span className="error-message">{errors.documento}</span>}
        </div>

        {!modoInternacional && (
          <div className="form-group">
            <label>Inscrição Estadual {!isentoIE && '*'}</label>

            <div className="checkbox-row">
              <input
                type="checkbox"
                id="isentoIE"
                checked={isentoIE}
                onChange={(e) => {
                  setIsentoIE(e.target.checked);
                  if (e.target.checked) {
                    handleChange('inscricao_estadual', 'ISENTO');
                  } else {
                    handleChange('inscricao_estadual', '');
                  }
                }}
              />
              <label htmlFor="isentoIE">Isento de Inscrição Estadual</label>
            </div>

            <input
              type="text"
              value={formData.inscricao_estadual || ''}
              onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
              placeholder={isentoIE ? 'ISENTO' : '00000000000000'}
              className={errors.inscricao_estadual ? 'error' : ''}
              disabled={isentoIE}
            />

            {errors.inscricao_estadual && (
              <span className="error-message">{errors.inscricao_estadual}</span>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Endereço */}
    <div className="form-section">
      <div className="section-header">
        <div>
          <h3>Endereço</h3>
          <p>Localização do cliente</p>
        </div>

        {isExteriorUser && (
          <button
            type="button"
            onClick={toggleModo}
            className={`btn-mode-toggle ${modoInternacional ? 'active' : ''}`}
          >
            {modoInternacional ? 'Internacional ativo' : 'Endereço internacional'}
          </button>
        )}
      </div>

      {modoInternacional ? (
        <div className="form-group full-width">
          <label>Endereço completo *</label>
          <textarea
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Digite o endereço completo: rua, número, cidade, estado, país e código postal"
            rows={4}
            className={errors.endereco ? 'error' : ''}
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
      ) : (
        <div className="form-group full-width">
          <label>Endereço *</label>

          <div className="form-grid">
            <div className="form-group">
              <label>CEP</label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => handleChange('cep', e.target.value)}
                placeholder="00000-000"
              />

              {onlyDigits(formData.cep || '').length === 8 && !manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(true)}
                >
                  Editar manualmente UF/Cidade
                </button>
              )}

              {onlyDigits(formData.cep || '').length === 8 && manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(false)}
                >
                  Voltar ao modo CEP
                </button>
              )}
            </div>

            <div className="form-group">
              <label>UF</label>
              <select
                value={formData.uf || ''}
                onChange={(e) => handleChange('uf', e.target.value)}
                disabled={onlyDigits(formData.cep || '').length === 8 && !manualEndereco}
              >
                <option value="">Selecione UF</option>
                {[
                  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
                  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
                  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
                ].map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cidade</label>
              <select
                value={formData.cidade || ''}
                onChange={(e) => handleChange('cidade', e.target.value)}
                disabled={
                  !formData.uf ||
                  loadingCidades ||
                  (onlyDigits(formData.cep || '').length === 8 && !manualEndereco)
                }
              >
                <option value="">
                  {loadingCidades
                    ? 'Carregando...'
                    : formData.uf
                      ? 'Selecione a cidade'
                      : 'Selecione UF primeiro'}
                </option>

                {cidadesUF.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>

            {formData.uf && formData.cidade && (
              <>
                <div className="form-group">
                  <label>Rua/Avenida</label>
                  <input
                    type="text"
                    value={formData.logradouro || ''}
                    onChange={(e) => handleChange('logradouro', e.target.value)}
                    placeholder="Logradouro"
                  />
                </div>

                <div className="form-group">
                  <label>Número</label>
                  <input
                    type="text"
                    value={formData.numero || ''}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Número"
                  />
                </div>

                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro || ''}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-group generated-address">
            <label>Endereço completo</label>
            <input
              type="text"
              value={formData.endereco || ''}
              readOnly
              placeholder="Endereço completo gerado automaticamente"
              className={errors.endereco ? 'error' : ''}
            />
          </div>

          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
      )}

      <div className="form-group observacoes-group">
        <label>Observações</label>
        <textarea
          value={formData.observacoes || ''}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Informações adicionais sobre o cliente"
          rows="3"
        />
      </div>
    </div>
      </div>

      </div>
    </div>
  );
};

// Componente Form do Caminhão
const CaminhaoForm = ({ formData = {}, setFormData, errors = {}, carrinho = [] }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...(prev || {}), [field]: value }));
  };
  
  // Função para calcular o patolamento baseado na medida C
  const calcularPatolamento = (medidaC) => {
    if (!medidaC) return '';
    const medida = parseFloat(medidaC);
    if (isNaN(medida)) return '';
    
    // Regras: >= 70cm → 580mm | 60-69cm → 440mm | < 60cm → 390mm
    if (medida >= 70) return '580mm';
    if (medida >= 60) return '440mm';
    return '390mm';
  };
  
  const itensCarrinhoValidos = (carrinho || []).filter(Boolean);
  const temGSI = React.useMemo(() =>
    itensCarrinhoValidos.some(item => item?.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSI')),
    [itensCarrinhoValidos]
  );
  const temGSE = React.useMemo(() =>
    itensCarrinhoValidos.some(item => item?.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSE')),
    [itensCarrinhoValidos]
  );
  const noDetection = !temGSI && !temGSE;
  const showMedidaA = noDetection || temGSI;
  const showMedidaB = noDetection || temGSI;
  const showMedidaD = (noDetection || temGSE) && formData.tipo === 'Bitruck';
  const showComprimento = noDetection || temGSE;
  const instrucaoMedidas = noDetection
    ? 'Preencha conforme a imagem. Caminhão 1 = GSI Interno · Caminhão 2 = GSE Externo.'
    : temGSI && !temGSE
      ? 'Para instalação GSI, preencha as medidas A, B e C.'
      : !temGSI && temGSE
        ? 'Para instalação GSE, preencha a medida C (define patolamento), o comprimento do chassi e, se Bitruck, a medida D.'
        : 'Preencha conforme a imagem. Caminhão 1 = GSI Interno · Caminhão 2 = GSE Externo.';

  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

  return (
    <div className="client-form-container">
      {/* Informações do Veículo */}
      <div className="form-section">
        <div className="section-header">
          <h3>Informações do Veículo</h3>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Tipo *</label>
            <select
              value={formData.tipo || ''}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className={errors.tipo ? 'error' : ''}
            >
              <option value="">Selecione o tipo</option>
              <option value="Truck">Truck</option>
              <option value="Tractor CAVALINHO">Tractor CAVALINHO</option>
              <option value="3/4">3/4</option>
              <option value="Toco">Toco</option>
              <option value="Carreta">Carreta</option>
              <option value="Bitruck">Bitruck</option>
              <option value="Outro">Outro</option>
            </select>
            {errors.tipo && <span className="error-message">{errors.tipo}</span>}
          </div>
          
          <div className="form-group">
            <label>Marca *</label>
            <select
              value={formData.marca || ''}
              onChange={(e) => handleChange('marca', e.target.value)}
              className={errors.marca ? 'error' : ''}
            >
              <option value="">Selecione a marca</option>
              <option value="Mercedes-Benz">Mercedes-Benz</option>
              <option value="Volvo">Volvo</option>
              <option value="Scania">Scania</option>
              <option value="Iveco">Iveco</option>
              <option value="DAF">DAF</option>
              <option value="MAN">MAN</option>
              <option value="Ford">Ford</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Volkswagen">Volkswagen</option>
              <option value="Outra">Outra</option>
            </select>
            {errors.marca && <span className="error-message">{errors.marca}</span>}
          </div>
        
          <div className="form-group">
            <label>Modelo *</label>
            <input
              type="text"
              value={formData.modelo || ''}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder="Ex: Actros, FH, R-Series"
              className={errors.modelo ? 'error' : ''}
            />
            {errors.modelo && <span className="error-message">{errors.modelo}</span>}
          </div>
          
          <div className="form-group">
            <label>Ano</label>
            <select
              value={formData.ano || ''}
              onChange={(e) => handleChange('ano', e.target.value)}
            >
              <option value="">Selecione o ano</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {errors.ano && <span className="error-message">{errors.ano}</span>}
          </div>
          
          <div className="form-group">
            <label>Voltagem *</label>
            <select
              value={formData.voltagem || ''}
              onChange={(e) => handleChange('voltagem', e.target.value)}
              className={errors.voltagem ? 'error' : ''}
            >
              <option value="">Selecione a voltagem</option>
              <option value="12V">12V (1 bateria)</option>
              <option value="24V">24V (2 baterias)</option>
            </select>
            {errors.voltagem && <span className="error-message">{errors.voltagem}</span>}
          </div>
          
          <div className="form-group full-width">
            <label>Observações</label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o caminhão..."
              rows="2"
            />
          </div>
        </div>
      </div>

      {/* Seção de Medidas */}
      <div className="form-section">
        <div className="section-header">
          <h3>Medidas para Instalação</h3>
        </div>
          
          <div className="estudo-veicular-container">
            {/* Imagem do Estudo Veicular */}
            <div className="estudo-veicular-image">
              <img 
                src="/estudoveicular.png" 
                alt="Estudo Veicular" 
                className="estudo-veicular-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="estudo-veicular-fallback">
                <p>Imagem não disponível</p>
              </div>
            </div>

            {/* Campos de Medidas */}
            <div className="estudo-veicular-form">
              <p className="estudo-veicular-instructions">{instrucaoMedidas}</p>
              
              <div className="form-grid">
                {showMedidaA && (
                <div className="form-group">
                  <label>Medida A — Chassi ao Assoalho (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 63"
                  />
                </div>
                )}
                
                {showMedidaB && (
                <div className="form-group">
                  <label>Medida B — Chassi (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 70"
                  />
                </div>
                )}
                
                <div className="form-group">
                  <label>Medida C — Solo ao Chassi (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaC || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleChange('medidaC', value);
                      // Calcular e salvar patolamento automaticamente
                      const patolamento = calcularPatolamento(value);
                      handleChange('patolamento', patolamento);
                    }}
                    placeholder="Ex: 65"
                  />
                </div>
                
                {showMedidaD && (
                <div className="form-group">
                  <label>Medida D — Dist. entre Eixos, GSE (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 30"
                  />
                </div>
                )}

                {showComprimento && (
                <div className="form-group full-width">
                  <label>Comprimento do Chassi (metros)</label>
                  <input
                    type="text"
                    value={formData.comprimentoChassi || ''}
                    onChange={(e) => handleChange('comprimentoChassi', e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
                )}
              </div>
              
              {/* Patolamento */}
              {formData.patolamento && (
                <div className="patolamento-result">
                  <span className="patolamento-label">Patolamento calculado:</span>
                  <span className="patolamento-value">{formData.patolamento}</span>
                  <span className="patolamento-note">
                    {parseFloat(formData.medidaC) >= 70 && 'Medida C ≥ 70cm'}
                    {parseFloat(formData.medidaC) >= 60 && parseFloat(formData.medidaC) < 70 && 'Medida C entre 60–69cm'}
                    {parseFloat(formData.medidaC) < 60 && 'Medida C < 60cm'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

// Componente Resumo do Pedido
const ResumoPedido = ({ carrinho, clienteData, caminhaoData, pagamentoData, user, guindastes, isEdicao, propostaOriginal, propostaId, isConcessionariaCompra = false, concessionariaInfo = null, regiaoCompraSelecionada = '', carrinhoAcumulativo = [], onAdicionarAoCarrinho, onLimparPedidoAtual, onLimparCarrinhoAcumulativo, onRemoverDoCarrinhoAcumulativo }) => {
  const [pedidoSalvoId, setPedidoSalvoId] = React.useState(null);

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

  // Modo edição de verdade vem da URL (propostaId). Isso evita timing issues de estado
  // que podem fazer o fluxo cair em INSERT e duplicar registros.
  const modoEdicaoCalc = !!propostaId;
  const propostaIdCalc = propostaOriginal?.id || propostaId || null;

  // Quando estiver editando, considerar a proposta como "já salva" para evitar INSERT
  useEffect(() => {
    if (modoEdicaoCalc && propostaIdCalc) {
      setPedidoSalvoId(propostaIdCalc);
    }
  }, [modoEdicaoCalc, propostaIdCalc]);

  const handlePDFGenerated = async (fileName) => {
    try {
      if (!isConcessionariaCompra) {
        try {
          await createDealInSalesIfNotExists({
            cliente: clienteData,
            vendedorNome: user?.nome || ''
          });
        } catch (bitrixError) {
          console.warn('Bitrix: falha ao criar negócio automaticamente.', bitrixError);
        }
      }
      // Detectar se é proposta preliminar (Proposta Rápida)
      const isPropostaPreliminar = caminhaoData?.tipo === 'PREENCHER' || 
                                    caminhaoData?.marca === 'PREENCHER' || 
                                    caminhaoData?.modelo === 'PREENCHER';

      // Se estiver editando uma proposta existente, atualizar o mesmo registro
      // (evita duplicar propostas ao gerar um novo PDF)
      if (modoEdicaoCalc && propostaIdCalc) {
        const propostaAtualizada = await salvarRelatorio();
        setPedidoSalvoId(propostaAtualizada?.id || propostaIdCalc);
        alert(`PDF gerado com sucesso: ${fileName}\nProposta atualizada com sucesso!`);
        return;
      }
      
      // Critérios mínimos para salvar automaticamente sem interromper a experiência
      const camposClienteOK = clienteData?.modoInternacional
        ? Boolean(clienteData?.nome && clienteData?.telefone)
        : Boolean(clienteData?.nome && clienteData?.telefone && clienteData?.email && clienteData?.documento && clienteData?.inscricao_estadual && clienteData?.endereco);
      
      // Para proposta preliminar: apenas tipo, marca, modelo (voltagem pode estar vazio)
      // Para proposta normal: exigir todos os campos incluindo voltagem
      const camposCaminhaoOK = isPropostaPreliminar 
        ? Boolean(caminhaoData?.tipo && caminhaoData?.marca && caminhaoData?.modelo)
        : Boolean(caminhaoData?.tipo && caminhaoData?.marca && caminhaoData?.modelo && caminhaoData?.voltagem);
      
      const usuarioOK = Boolean(user?.id);

      const camposCompraOK = Boolean(pedidoData?.regiaoCompraSelecionada && carrinho.length > 0 && pagamentoData?.tipoFrete);

      if ((isConcessionariaCompra ? camposCompraOK : (camposClienteOK && camposCaminhaoOK)) && usuarioOK) {
        // Salvar relatório automaticamente no banco de dados (apenas uma vez)
        if (!pedidoSalvoId) {
          const pedido = await salvarRelatorio();
          setPedidoSalvoId(pedido?.id || null);
        }
        const tipoMsg = isPropostaPreliminar ? ' (Proposta Preliminar)' : '';
        alert(`PDF gerado com sucesso: ${fileName}\nRelatório salvo automaticamente!${tipoMsg}`);
      } else {
        alert(`PDF gerado com sucesso: ${fileName}\nObservação: Relatório não foi salvo automaticamente porque ainda faltam dados obrigatórios (Cliente e/ou Caminhão). Ao clicar em Finalizar, ele será salvo.`);
      }
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      const msg = (error && error.message) ? `\nMotivo: ${error.message}` : '';
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatório automaticamente.${msg}`);
    }
  };

  const salvarRelatorio = async () => {
  try {
    const modoEdicao = modoEdicaoCalc;
    const proposta = propostaOriginal || null;
    const propostaIdToUpdate = propostaIdCalc;

    if (modoEdicao && propostaIdToUpdate) {
      const guindasteNoCarrinho = carrinho.find(item =>
        item.tipo === 'equipamento' || item.tipo === 'guindaste'
      );

      const guindasteId = guindasteNoCarrinho?.id || null;

      const documentoClienteDB = (
        String(clienteData.documento || proposta?.cliente_documento || '')
          .replace(/\D/g, '')
          .slice(0, 14)
      ) || null;

      const dadosAtualizados = {
        data: new Date().toISOString(),
        id_guindaste: guindasteId,
        valor_total:
          pagamentoData.valorFinal ||
          carrinho.reduce((total, item) => {
            return total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1));
          }, 0),
        concessionaria_id: user?.concessionaria_id || null,
        cliente_nome: clienteData.nome || proposta?.cliente_nome || null,
        cliente_documento: documentoClienteDB,
        dados_serializados: {
          carrinho,
          clienteData,
          caminhaoData,
          pagamentoData,
          guindasteId,
          regiaoClienteSelecionada: regiaoCompraSelecionada || null,
          concessionaria_id: user?.concessionaria_id || null
        }
      };

      console.log('[DEBUG UPDATE PROPOSTA PAYLOAD]', dadosAtualizados);

      const propostaAtualizada = await updateProposta(propostaIdToUpdate, dadosAtualizados);
      return propostaAtualizada;
    }

    if (isConcessionariaCompra) {
      const timestamp = Date.now().toString();
      const numeroPedido = `PC${timestamp.slice(-8)}`;

      const guindasteNoCarrinho = carrinhoFinal.find(item =>
        item.tipo === 'guindaste' || item.tipo === 'equipamento'
      );

      const guindasteId = guindasteNoCarrinho?.id || null;

      const valorTotal =
        pagamentoData.valorFinal ||
        carrinhoFinal.reduce((total, item) => {
          return total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1));
        }, 0);

      const clienteDocumentoDB = (
        String(concessionariaInfo?.cnpj || clienteData?.documento || '')
          .replace(/\D/g, '')
          .slice(0, 14)
      ) || null;

      const canalVendaConcessionaria = (() => {
        if (user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'admin_concessionaria') {
          const ufConc = (concessionariaInfo?.uf || '').toUpperCase();
          const paisesInternacionais = ['PY', 'AR', 'UY', 'BO', 'CL', 'PE', 'CO', 'VE', 'EC', 'GY', 'SR'];

          return paisesInternacionais.includes(ufConc)
            ? 'Concessionária Internacional'
            : 'Concessionária Nacional';
        }

        return 'Concessionária Nacional';
      })();

      const linhaCarrinhoConc = carrinhoFinal.find(i => i.nome?.includes('GSI') || i.subgrupo?.includes('GSI'))
        ? 'GSI'
        : carrinhoFinal.find(i => i.nome?.includes('GSE') || i.subgrupo?.includes('GSE'))
          ? 'GSE'
          : 'Outros';

      const produtoPrincipalConc = (
        carrinhoFinal.find(i =>
          i.tipo === 'equipamento' ||
          i.tipo === 'guindaste' ||
          i.nome?.includes('GSI') ||
          i.nome?.includes('GSE')
        ) || carrinhoFinal[0]
      )?.nome || null;

      const pedidoDataToSave = {
        numero_proposta: numeroPedido,
        id_guindaste: guindasteId,
        data: new Date().toISOString(),

        vendedor_id: user.id,
        vendedor_nome: user.nome || 'Não informado',

        cliente_nome:
          concessionariaInfo?.nome ||
          clienteData?.nome ||
          'Concessionária',

        cliente_documento: clienteDocumentoDB,
        valor_total: valorTotal,

        tipo: 'proposta',
        status: 'finalizado',

        concessionaria_id: user?.concessionaria_id || null,
        canal_venda: canalVendaConcessionaria,
        segmento_cliente: clienteData?.segmento_cliente || null,
        cliente_uf: concessionariaInfo?.uf || clienteData?.uf || null,
        cliente_cidade: concessionariaInfo?.cidade || clienteData?.cidade || null,
        produto_principal: produtoPrincipalConc,
        linha_produto: linhaCarrinhoConc,

        dados_serializados: {
          carrinho: carrinhoFinal,
          pagamentoData,
          regiaoCompraSelecionada: regiaoCompraSelecionada || null,
          regiaoClienteSelecionada: regiaoCompraSelecionada || null,
          concessionaria_id: user?.concessionaria_id || null,
          concessionariaInfo: concessionariaInfo || null,
          guindasteId
        }
      };

      console.log('[DEBUG PROPOSTA PAYLOAD - CONCESSIONARIA]', pedidoDataToSave);

      const pedido = await createpropostas(pedidoDataToSave);
      return pedido;
    }

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

    const cliente = await createCliente(clienteDataToSave);

    const isPropostaPreliminar =
      caminhaoData?.tipo === 'PREENCHER' ||
      caminhaoData?.marca === 'PREENCHER' ||
      caminhaoData?.modelo === 'PREENCHER';

    let caminhao = null;

    if (isPropostaPreliminar) {
      caminhao = {
        id: null,
        ...caminhaoData,
        cliente_id: cliente.id
      };
    } else {
      const camposObrigatorios = ['tipo', 'marca', 'modelo', 'voltagem'];
      const camposFaltando = camposObrigatorios.filter(campo => !caminhaoData[campo]);

      if (camposFaltando.length > 0) {
        throw new Error(`Campos obrigatórios do caminhão não preenchidos: ${camposFaltando.join(', ')}`);
      }

      const caminhaoDataToSave = {
        ...filterCaminhaoDataForDB(caminhaoData),
        cliente_id: cliente.id
      };

      caminhao = await createCaminhao(caminhaoDataToSave);
    }

    const timestamp = Date.now().toString();
    const numeroPedido = `PED${timestamp.slice(-7)}`;

    const guindasteNoCarrinho = carrinho.find(item =>
      item.tipo === 'guindaste' || item.tipo === 'equipamento'
    );

    const guindasteId = guindasteNoCarrinho?.id || null;

    const clienteDocumentoDB = (
      String(cliente.documento || '')
        .replace(/\D/g, '')
        .slice(0, 14)
    ) || null;

    const canalVendaPropostal = (() => {
      if (user?.tipo === 'vendedor_concessionaria') return 'Concessionária Nacional';
      if (user?.tipo === 'admin_concessionaria') return 'Concessionária Nacional';
      return 'Vendedor Interno';
    })();

    const linhaCarrinho = carrinho.find(i => i.nome?.includes('GSI') || i.subgrupo?.includes('GSI'))
      ? 'GSI'
      : carrinho.find(i => i.nome?.includes('GSE') || i.subgrupo?.includes('GSE'))
        ? 'GSE'
        : 'Outros';

    const produtoPrincipal = (
      carrinho.find(i =>
        i.tipo === 'equipamento' ||
        i.tipo === 'guindaste' ||
        i.nome?.includes('GSI') ||
        i.nome?.includes('GSE')
      ) || carrinho[0]
    )?.nome || null;

    const valorTotal =
      pagamentoData.valorFinal ||
      carrinho.reduce((total, item) => {
        return total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1));
      }, 0);

    const pedidoDataToSave = {
      numero_proposta: numeroPedido,
      id_guindaste: guindasteId,
      data: new Date().toISOString(),

      vendedor_id: user.id,
      vendedor_nome: user.nome || 'Não informado',

      cliente_nome: cliente.nome || 'Não informado',
      cliente_documento: clienteDocumentoDB,

      valor_total: valorTotal,

      tipo: 'proposta',
      status: 'finalizado',

      concessionaria_id: user?.concessionaria_id || null,
      canal_venda: canalVendaPropostal,
      segmento_cliente: clienteData?.segmento_cliente || null,
      cliente_uf: clienteData?.uf || null,
      cliente_cidade: clienteData?.cidade || null,
      produto_principal: produtoPrincipal,
      linha_produto: linhaCarrinho,

      dados_serializados: {
        carrinho,
        clienteData: cliente,
        caminhaoData: caminhao,
        pagamentoData,
        guindasteId,
        regiaoClienteSelecionada: regiaoCompraSelecionada || null,
        concessionaria_id: user?.concessionaria_id || null
      }
    };

    console.log('[DEBUG PROPOSTA PAYLOAD - NORMAL]', pedidoDataToSave);

    const pedido = await createpropostas(pedidoDataToSave);
    return pedido;

  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error);
    console.error('📋 Detalhes do erro:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    console.error('🔍 Erro completo:', JSON.stringify(error, null, 2));
    throw error;
  }
};

return (
  <>
      {/* Política de Pagamento */}
      <div className="resumo-section">
        <div className="section-header"><h3>Política de Pagamento</h3></div>
        <div className="resumo-grid">
          <div className="resumo-field">
            <span className="resumo-label">Tipo de Pagamento</span>
            <span className="resumo-value">
              {pagamentoData.tipoPagamento === 'revenda_gsi' && 'Revenda — GSI'}
              {pagamentoData.tipoPagamento === 'cnpj_cpf_gse' && 'CNPJ — GSE'}
              {pagamentoData.tipoPagamento === 'parcelamento_interno' && 'Parcelamento Interno'}
              {pagamentoData.tipoPagamento === 'parcelamento_cnpj' && 'Parcelamento CNPJ'}
              {!pagamentoData.tipoPagamento && '—'}
            </span>
          </div>
          <div className="resumo-field">
            <span className="resumo-label">Prazo</span>
            <span className="resumo-value">
              {pagamentoData.prazoPagamento === 'a_vista' && 'À Vista'}
              {pagamentoData.prazoPagamento === '30_dias' && '30 dias (+3%)'}
              {pagamentoData.prazoPagamento === '60_dias' && '60 dias (+1%)'}
              {pagamentoData.prazoPagamento === '120_dias_interno' && '120 dias'}
              {pagamentoData.prazoPagamento === '90_dias_cnpj' && '90 dias'}
              {pagamentoData.prazoPagamento === 'mais_120_dias' && '+120 dias (+2%/mês)'}
              {pagamentoData.prazoPagamento === 'mais_90_dias' && '+90 dias (+2%/mês)'}
              {pagamentoData.prazoPagamento === 'Condição Exclusiva' && 'Condição Exclusiva'}
              {!pagamentoData.prazoPagamento && '—'}
            </span>
          </div>
          {pagamentoData.desconto > 0 && (
            <div className="resumo-field">
              <span className="resumo-label">Desconto</span>
              <span className="resumo-value">{pagamentoData.desconto}%</span>
            </div>
          )}
          {pagamentoData.acrescimo > 0 && (
            <div className="resumo-field">
              <span className="resumo-label">Acréscimo</span>
              <span className="resumo-value">{pagamentoData.acrescimo}%</span>
            </div>
          )}
          {parseFloat(pagamentoData.extraValor) > 0 && (
            <div className="resumo-field">
              <span className="resumo-label">Extra{pagamentoData.extraDescricao ? ` (${pagamentoData.extraDescricao})` : ''}</span>
              <span className="resumo-value">+ {formatCurrency(parseFloat(pagamentoData.extraValor) || 0)}</span>
            </div>
          )}
          {parseFloat(pagamentoData.valorConversor) > 0 && (
            <div className="resumo-field">
              <span className="resumo-label">Conversor de Voltagem</span>
              <span className="resumo-value">+ {formatCurrency(parseFloat(pagamentoData.valorConversor) || 0)}</span>
            </div>
          )}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.localInstalacao && (
            <div className="resumo-field">
              <span className="resumo-label">Local de Instalação</span>
              <span className="resumo-value">{pagamentoData.localInstalacao}</span>
            </div>
          )}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.tipoInstalacao && (
            <div className="resumo-field">
              <span className="resumo-label">Tipo de Instalação</span>
              <span className="resumo-value">
                {pagamentoData.tipoInstalacao === 'cliente paga direto' && 'Cliente paga direto'}
                {pagamentoData.tipoInstalacao === 'Incluso no pedido' && 'Incluso no pedido'}
              </span>
            </div>
          )}
          {pagamentoData.participacaoRevenda && (
            <div className="resumo-field">
              <span className="resumo-label">Participação de Revenda</span>
              <span className="resumo-value">{pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'Não'}</span>
            </div>
          )}
          {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
            <div className="resumo-field">
              <span className="resumo-label">Revenda possui IE</span>
              <span className="resumo-value">{pagamentoData.revendaTemIE === 'sim' ? 'Sim' : 'Não'}</span>
            </div>
          )}
          {pagamentoData.revendaTemIE === 'sim' && pagamentoData.descontoRevendaIE > 0 && (
            <div className="resumo-field">
              <span className="resumo-label">Desconto do Vendedor</span>
              <span className="resumo-value">{pagamentoData.descontoRevendaIE}%</span>
            </div>
          )}
          {/* Valor Final */}
          <div className="resumo-field resumo-field-wide">
            <div className="resumo-valor-final">
              <span className="resumo-valor-label">Valor Total da Proposta</span>
              <span className="resumo-valor-num">
                {formatCurrency(pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0))}
              </span>
            </div>
          </div>
          {/* Condição Exclusiva */}
          {pagamentoData.condicaoExclusiva && (
            <div className="resumo-field" style={{ background: '#fffbf0', border: '1px solid #ffd700', borderRadius: '6px', padding: '10px' }}>
              <span className="resumo-label" style={{ color: '#b45309', fontWeight: 700 }}>Condição Exclusiva</span>
              <span className="resumo-value" style={{ color: '#111', whiteSpace: 'pre-wrap', fontSize: '13px' }}>{pagamentoData.condicaoExclusivaObs}</span>
            </div>
          )}

          {/* Entrada */}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.percentualEntrada > 0 && (
            <>
              <div className="resumo-field">
                <span className="resumo-label">Entrada ({pagamentoData.percentualEntrada}%)</span>
                <span className="resumo-value">{formatCurrency(pagamentoData.entradaTotal || 0)}</span>
              </div>
              {pagamentoData.valorSinal > 0 && (
                <>
                  <div className="resumo-field">
                    <span className="resumo-label">Sinal pago</span>
                    <span className="resumo-value">— {formatCurrency(pagamentoData.valorSinal)}</span>
                  </div>
                  <div className="resumo-field">
                    <span className="resumo-label">Falta pagar (entrada)</span>
                    <span className="resumo-value">{formatCurrency(pagamentoData.faltaEntrada || 0)}</span>
                  </div>
                  {pagamentoData.formaEntrada && (
                    <div className="resumo-field">
                      <span className="resumo-label">Forma de pagamento da entrada</span>
                      <span className="resumo-value">{pagamentoData.formaEntrada}</span>
                    </div>
                  )}
                </>
              )}
              <div className="resumo-field">
                <span className="resumo-label">Saldo a Pagar</span>
                <span className="resumo-value resumo-value-bold">{formatCurrency(pagamentoData.saldoAPagar || pagamentoData.valorFinal || 0)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="resumo-acoes">
        {isConcessionariaCompra && carrinhoAcumulativo.length > 0 && (
          <div className="resumo-acumulativo">
            <div className="resumo-acumulativo-header">
              Equipamentos já adicionados ({carrinhoAcumulativo.length})
            </div>
            {carrinhoAcumulativo.map((pedido, idx) => (
              <div key={pedido.id} className="resumo-acumulativo-item">
                <span>
                  <strong>#{idx + 1}</strong> — {pedido.carrinho.map(i => i.nome).join(', ')}
                  <span className="resumo-acum-preco"> ({formatCurrency(pedido.carrinho.reduce((s, i) => s + ((parseFloat(i.preco) || 0) * (parseInt(i.quantidade, 10) || 1)), 0))})</span>
                </span>
                <button className="btn-remover-acum" onClick={() => onRemoverDoCarrinhoAcumulativo && onRemoverDoCarrinhoAcumulativo(pedido.id)}>✕</button>
              </div>
            ))}
            <div className="resumo-acumulativo-atual">
              + Pedido atual ({carrinho.map(i => i.nome).join(', ')})
            </div>
          </div>
        )}
        <div className="resumo-acoes-buttons">
          {isConcessionariaCompra && (
            <button
              className="btn-adicionar-mais"
              onClick={() => {
                if (window.confirm('Deseja adicionar este pedido ao carrinho e continuar escolhendo mais equipamentos?')) {
                  onAdicionarAoCarrinho();
                  onLimparPedidoAtual();
                }
              }}
            >
              + Adicionar Mais Equipamentos
            </button>
          )}
          <LazyPDFGenerator
            pedidoData={pedidoData}
            onGenerate={(fileName) => {
              if (isConcessionariaCompra && onLimparCarrinhoAcumulativo) {
                onLimparCarrinhoAcumulativo();
              }
              handlePDFGenerated(fileName);
            }}
          />
          {isConcessionariaCompra && carrinhoAcumulativo.length > 0 && (
              <span className="resumo-pdf-note">
                O PDF incluirá {carrinhoAcumulativo.length + 1} equipamento(s)
              </span>
            )}
        </div>
     </div>
    </>
  );
};

function EstudoVeicular({ caminhaoData, setCaminhaoData, carrinho, onNext, onPrev, errors = {}, onPropostaRapida }) {
  const podeContinuar = Boolean(
    caminhaoData?.tipo &&
    caminhaoData?.marca &&
    caminhaoData?.modelo &&
    caminhaoData?.voltagem
  );

  return (
    <div className="vehicle-form-container">
      {/* Aviso Proposta Rápida */}
      <div className="proposta-rapida-hint">
        <span>Não tem os dados do veículo agora?</span>
        <button
          className="btn-proposta-rapida"
          onClick={() => {
            setCaminhaoData({
              tipo: 'PREENCHER',
              marca: 'PREENCHER',
              modelo: 'PREENCHER',
              ano: '',
              voltagem: 'PREENCHER',
              comprimentoChassi: 'PREENCHER',
              observacoes: 'PROPOSTA PRELIMINAR - Dados do veículo a confirmar com o cliente'
            });
            if (onPropostaRapida) { onPropostaRapida(); } else { onNext(); }
          } }
        >
          Gerar proposta rápida
        </button>
        <span className="proposta-rapida-hint-note">(campos marcados como "A PREENCHER")</span>
      </div>

      <CaminhaoForm formData={caminhaoData} setFormData={setCaminhaoData} errors={errors} carrinho={carrinho} />

      <div className="form-actions">
        <button className="btn-back-secondary" onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
          Voltar
        </button>
        <button className="btn-continue" onClick={onNext} disabled={!podeContinuar}>
          <span>Continuar</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default NovoPedido;




