import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext, useParams } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import LazyPDFGenerator from '../../components/LazyPDFGenerator';
import PaymentPolicy from '../../features/payment/PaymentPolicy';
import GuindasteConfigurador from '../../components/NovoPedido/GuindasteConfigurador';
import SeletorRegiaoCliente from '../../components/SeletorRegiaoCliente';
import LazyGuindasteImage from '../../components/LazyGuindasteImage';

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
import '../../styles/NovoPedido.css';

// âš¡ Logger otimizado
const logger = createLogger('NovoPedido');

const NovoPedido = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { propostaId } = useParams(); // Captura ID da proposta para ediÃ§Ã£o
  const { user } = useOutletContext(); // Pega o usuÃ¡rio do VendedorLayout
  const isConcessionariaUser = user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'admin_concessionaria';
  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
  const isAdminStark = user?.tipo === 'admin';
  const isModoConcessionaria = isAdminConcessionaria && location.pathname === '/nova-proposta-concessionaria';

  const regioesCompraDisponiveis = useMemo(() => ([
    'Norte-Nordeste',
    'Centro-Oeste',
    'Sul-Sudeste',
    'RS com InscriÃ§Ã£o Estadual',
    'RS sem InscriÃ§Ã£o Estadual',
    'ComÃ©rcio Exterior',
  ]), []);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isEdicao, setIsEdicao] = useState(false); // Modo ediÃ§Ã£o
  const [propostaOriginal, setPropostaOriginal] = useState(null); // Dados originais da proposta
  const [carrinho, setCarrinho] = useState(() => {
    // ✅ Só carrega do localStorage em modo edição ou vindo de detalhes
    if (propostaId || location.state?.fromDetalhes) {
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
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [pagamentoData, setPagamentoData] = useState(() => {
    if (propostaId || location.state?.fromDetalhes) {
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
  // âœ… NOVO: Usar APENAS regioes_operacao (definidas pelo admin)
  // Se admin define 1 regiÃ£o, usa essa. Se define mÃºltiplas, vendedor seleciona qual usar.
  const [regiaoClienteSelecionada, setRegiaoClienteSelecionada] = useState('');
  const [concessionariaInfo, setConcessionariaInfo] = useState(null);
  const [descontoConcessionaria, setDescontoConcessionaria] = useState(0);
  const [cotacaoUSD, setCotacaoUSD] = useState(null);

  // Auto-set regiÃ£o para modo concessionÃ¡ria (usa regiao_preco da concessionÃ¡ria cadastrada)
  React.useEffect(() => {
    if (!isModoConcessionaria || !concessionariaInfo) return;
    const regiao = concessionariaInfo.regiao_preco || '';
    if (regiao) setRegiaoClienteSelecionada(regiao);
  }, [isModoConcessionaria, concessionariaInfo]);

  // âœ… Limpar carrinho e dados ao entrar em novo pedido (nÃ£o em modo ediÃ§Ã£o)
  React.useEffect(() => {
    if (!propostaId && !location.state?.fromDetalhes) {
      setCarrinho([]);
      setCarrinhoAcumulativo([]);
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
      if (!isModoConcessionaria) setRegiaoClienteSelecionada('');
      setCurrentStep(1);
      setMaxStepReached(1);
      localStorage.removeItem('carrinho');
      localStorage.removeItem('novoPedido_pagamentoData');
      localStorage.removeItem('carrinhoAcumulativo');
    }
  }, [propostaId, location.state?.fromDetalhes]);

  // âœ… NOVO: Restaurar regiÃ£o quando voltar de DetalhesGuindaste
  React.useEffect(() => {
    if (location.state?.regiaoClienteSelecionada) {
      setRegiaoClienteSelecionada(location.state.regiaoClienteSelecionada);
      // Limpar o state para evitar loops
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.regiaoClienteSelecionada]);

  // âœ… NOVO: Restaurar step quando voltar de DetalhesGuindaste (admin concessionÃ¡ria)
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
        setClienteData({
          nome: c?.nome || 'ConcessionÃ¡ria',
          telefone: c?.telefone || '',
          email: c?.email || '',
          documento: c?.cnpj || '',
          endereco: c?.endereco || ''
        });
        const desconto = c?.desconto_compra ?? c?.desconto_base ?? 0;
        setDescontoConcessionaria(Number(desconto) || 0);
      } catch (error) {
        console.error('Erro ao carregar concessionÃ¡ria:', error);
        alert('Erro ao carregar dados da concessionÃ¡ria.');
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

  // ✅ Auto-set regiaoClienteSelecionada para Nova Proposta (fluxo vendedor comercial)
  // Prioridade: regioes_operacao[0] > user.regiao > 'Comércio Exterior' (exterior)
  useEffect(() => {
    if (!user || isModoConcessionaria) return;

    const regioes = normalizarArray(user?.regioes_operacao);
    const isExteriorType = user.tipo === 'vendedor_exterior';
    const isExteriorRegiao = normalizarRegiao(user.regiao) === 'comercio-exterior';

    if (regioes.length > 0) {
      // Vendedor com múltiplas regiões de operação: pré-seleciona a primeira
      if (!regiaoClienteSelecionada) setRegiaoClienteSelecionada(regioes[0]);
    } else if ((isExteriorType || isExteriorRegiao)) {
      // Vendedor exterior sem regioes_operacao
      setRegiaoClienteSelecionada('Comércio Exterior');
    } else if (user.regiao && !regiaoClienteSelecionada) {
      // ✅ Vendedor com apenas user.regiao (sem regioes_operacao): usa a região principal
      setRegiaoClienteSelecionada(user.regiao);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isModoConcessionaria]);

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
        console.error('Erro ao carregar cotaÃ§Ã£o USD:', error);
        if (!cancelled) setCotacaoUSD(null);
      }
    };

    loadCotacao();
    return () => { cancelled = true; };
  }, [user]);

  // Carregar proposta para ediÃ§Ã£o (se houver propostaId na URL)
  React.useEffect(() => {
    const carregarPropostaParaEdicao = async () => {
      if (!propostaId) {
        // Modo criaÃ§Ã£o: limpar dados
        setClienteData({});
        setCaminhaoData({});
        localStorage.removeItem('novoPedido_clienteData');
        localStorage.removeItem('novoPedido_caminhaoData');
        setIsEdicao(false);
        return;
      }

      try {
        const proposta = await getPropostaById(propostaId);
        
        if (!proposta) {
          alert('Proposta nÃ£o encontrada!');
          navigate('/propostas');
          return;
        }

        setPropostaOriginal(proposta);
        setIsEdicao(true);

        // Carregar dados serializados
        const dados = proposta.dados_serializados || {};
        
        // Carregar carrinho
        if (dados.carrinho && Array.isArray(dados.carrinho)) {
          setCarrinho(dados.carrinho);
          localStorage.setItem('carrinho', JSON.stringify(dados.carrinho));
        }

        // Carregar dados do cliente
        if (dados.clienteData) {
          setClienteData(dados.clienteData);
        }

        // Carregar dados do caminhÃ£o
        if (dados.caminhaoData) {
          setCaminhaoData(dados.caminhaoData);
        }

        // Carregar dados de pagamento
        if (dados.pagamentoData) {
          setPagamentoData(dados.pagamentoData);
        }

        // Definir step para o Ãºltimo (Finalizar) para permitir ediÃ§Ã£o completa
        setCurrentStep(5);
        setMaxStepReached(5);

      } catch (error) {
        console.error('âŒ Erro ao carregar proposta:', error);
        alert('Erro ao carregar proposta para ediÃ§Ã£o');
        navigate('/propostas');
      }
    };

    carregarPropostaParaEdicao();
  }, [propostaId]);

  // Salvar dados no localStorage sempre que mudarem (exceto clienteData)

  // Removido: nÃ£o salvar dados do caminhÃ£o no localStorage

  React.useEffect(() => {
    localStorage.setItem('novoPedido_pagamentoData', JSON.stringify(pagamentoData));
  }, [pagamentoData]);

  // FunÃ§Ã£o para filtrar dados do caminhÃ£o para salvamento no banco
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

  // Verificar se hÃ¡ dados salvos para cada step
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

  // FunÃ§Ã£o para limpar todos os dados salvos (Ãºtil para novo pedido)
  const clearAllSavedData = () => {
    localStorage.removeItem('novoPedido_clienteData');
    localStorage.removeItem('novoPedido_caminhaoData');
    localStorage.removeItem('novoPedido_pagamentoData');
    localStorage.removeItem('carrinho');
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
    setCarrinho([]);
    setCurrentStep(1);
    setMaxStepReached(1);
  };

  // âœ… NOVO: Determinar IE baseado na regiÃ£o selecionada (nÃ£o em user.regiao)
  const determinarClienteTemIE = () => {
    // Se a regiÃ£o selecionada Ã© RS, usa clienteTemIE; senÃ£o sempre true
    if (currentStep >= 2 && (regiaoClienteSelecionada?.toLowerCase().includes('rs') || regiaoClienteSelecionada === 'rio grande do sul') && pagamentoData.tipoPagamento === 'cliente') {
      return !!clienteTemIE;
    }
    return true;
  };

  // â† NOVO: FunÃ§Ã£o para recalcular preÃ§os quando o contexto muda
  const recalcularPrecosCarrinho = async () => {
    // ✅ Só executa se houver itens e região selecionada
    // user.regiao é o fallback para vendedores sem regioes_operacao
    if (carrinho.length === 0 || !regiaoClienteSelecionada) {
      return;
    }

    // Log diagnóstico do fluxo Nova Proposta
    const regioes = normalizarArray(user?.regioes_operacao);
    console.log('[NOVA PROPOSTA] recalcularPrecosCarrinho', {
      tipoUsuario: user?.tipo,
      regioes_operacao: regioes,
      regiaoSelecionada: regiaoClienteSelecionada,
      origemRegiao: regioes.length > 0 ? 'regioes_operacao' : 'user.regiao',
      isConcessionaria: isConcessionariaUser,
      isModoConcessionaria,
      carrinhoItems: carrinho.length,
    });

    const temIE = determinarClienteTemIE();
    // âœ… NOVO: Usar regiaoClienteSelecionada
    const regiaoVendedor = normalizarRegiao(regiaoClienteSelecionada, temIE);

    const carrinhoAtualizado = [];

    for (const item of carrinho) {
      if (item.tipo === 'guindaste') {
        try {
          let novoPreco = 0;
          if (isModoConcessionaria) {
            novoPreco = await db.getPrecoCompraPorRegiao(item.id, regiaoVendedor);
          } else {
            novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);
          }


          const isExteriorRecalc = normalizarRegiao(regiaoClienteSelecionada) === 'comercio-exterior';
          carrinhoAtualizado.push({
            ...item,
            preco: isExteriorRecalc ? (novoPreco || 0) : (novoPreco || item.preco || 0)
          });
        } catch (error) {
          console.error(` [recalcularPrecosCarrinho] Erro ao recalcular preÃ§o para ${item.nome}:`, error);
          carrinhoAtualizado.push(item);
        }
      } else {
        carrinhoAtualizado.push(item);
      }
    }


    // Verificar se houve mudanÃ§a real nos preÃ§os antes de atualizar
    const houveAlteracao = carrinhoAtualizado.some((itemNovo, index) => {
      const itemAntigo = carrinho[index];
      return itemAntigo && itemNovo.preco !== itemAntigo.preco;
    });

    if (houveAlteracao) {
      setCarrinho(carrinhoAtualizado);
      localStorage.setItem('carrinho', JSON.stringify(carrinhoAtualizado));
    }
  };

  // Recalcular preÃ§os quando contexto de pagamento mudar OU quando regiÃ£o selecionada mudar
  useEffect(() => {
    if (carrinho.length > 0 && regiaoClienteSelecionada) {
      recalcularPrecosCarrinho();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentoData?.tipoPagamento || '', pagamentoData?.participacaoRevenda || '', pagamentoData?.revendaTemIE || '', clienteTemIE, regiaoClienteSelecionada]);

  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesSelecionados, setGuindastesSelecionados] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [guindastesVisiveisParaVendedor, setGuindastesVisiveisParaVendedor] = useState(null);

  // â† MOVIDO: Definir funÃ§Ãµes antes dos useEffects
  // FunÃ§Ãµes do Carrinho
  const adicionarAoCarrinho = (item, tipo) => {
    const itemComTipo = { ...item, tipo };
    setCarrinho(prev => {
      let newCart;

      if (tipo === 'guindaste') {
        if (isModoConcessionaria) {
          // No modo concessionÃ¡ria: mÃºltiplos guindastes permitidos
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

  // FunÃ§Ã£o para carregar dados dos guindastes
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const pageSize = 200;
      const maxPages = 10;
      const all = [];

      for (let page = 1; page <= maxPages; page++) {
        const result = await getGuindastesLite(page, pageSize, true);
        const chunk = result?.data || [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
      }


      let idsVisiveis = null;
      try {
        if (!isAdminStark && user?.id) {
          idsVisiveis = await db.getGuindasteIdsVisiveisParaUser(user.id);
        }
      } catch (e) {
        console.warn(' [NovoPedido] Falha ao carregar visibilidade de protÃ³tipos:', e);
      }

      const idsSet = Array.isArray(idsVisiveis) ? new Set(idsVisiveis) : null;
      setGuindastesVisiveisParaVendedor(idsSet);

      
      const isVendedorCE = normalizarArray(user?.regioes_operacao).some(r => {
        const rLower = (r || '').toLowerCase().trim();
        return rLower.includes('comÃ©rcio exterior') || rLower.includes('comercio exterior') || rLower.includes('comercio-exterior');
      });

      const filtrados = (all || []).filter(g => {
        // Filtro de protÃ³tipos
        if (g?.is_prototipo) {
          if (!isAdminStark) {
            if (!idsSet || !idsSet.has(g.id)) return false;
          }
        }

        // Filtro de ComÃ©rcio Exterior: sÃ³ vendedores CE ou admin stark
        if (g?.is_comercio_exterior) {
          if (!isAdminStark && !isVendedorCE) return false;
        }
        
        return true;
      });

      setGuindastes(filtrados);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexÃ£o com o banco.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdminStark, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  // Verificar se hÃ¡ um guindaste selecionado vindo da tela de detalhes
  useEffect(() => {
    const processarGuindasteSelecionado = async () => {
      if (location.state?.guindasteSelecionado) {
        const guindaste = location.state.guindasteSelecionado;
        
        //  VERIFICAR SE JÃ ESTÃ NO CARRINHO (evitar duplicaÃ§Ã£o - apenas no fluxo normal)
        // Em modo concessionÃ¡ria, mÃºltiplos guindastes sÃ£o permitidos
        if (!isModoConcessionaria) {
          const jaNoCarrinho = carrinho.some(item => item.id === guindaste.id && item.tipo === 'guindaste');
          if (jaNoCarrinho) {
            navigate(location.pathname, { replace: true, state: { fromDetalhes: true } });
            return;
          }
        }
        
        setGuindastesSelecionados([guindaste]);

        // Buscar preÃ§o inicial baseado na regiÃ£o selecionada
        let precoGuindaste = guindaste.preco || 0;
        if (isModoConcessionaria) {
          // Se estamos voltando de DetalhesGuindaste, a regiÃ£o jÃ¡ foi restaurada
          const regiaoParaUsar = location.state?.regiaoClienteSelecionada || regiaoClienteSelecionada;
          if (!regiaoParaUsar) {
            alert('Selecione a RegiÃ£o de Compra antes de escolher o equipamento.');
            return;
          }
          try {
            const temIE = determinarClienteTemIE();
            const regiaoParaBusca = normalizarRegiao(regiaoClienteSelecionada, temIE);
            precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoParaBusca);
          } catch (error) {
            console.error(' [adicionarGuindaste] Erro ao buscar preÃ§o de compra do guindaste:', error);
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
        if (location.state.step) {
          setCurrentStep(location.state.step);
        }

        // Limpar o estado da navegaÃ§Ã£o
        navigate(location.pathname, { replace: true, state: { fromDetalhes: true } });
      }
    };

    if (user) {
      processarGuindasteSelecionado();
    }
  }, [location.state, navigate, user]);


  // Efeito para resetar pagamento quando voltar para Step 1 OU quando equipamento mudar
  useEffect(() => {
    // NÃ£o resetar pagamento no modo ediÃ§Ã£o (dados jÃ¡ carregados)
    if (isEdicao) return;
    // Reseta se voltar para Step 1
    if (currentStep === 1 && pagamentoData.tipoPagamento) {
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
        { id: 2, title: 'Pagamento',  description: 'CondiÃ§Ã£o de compra' },
        { id: 3, title: 'Estudo Veicular',  description: 'configuracao do veÃ­culo' },
        { id: 4, title: 'Resumo', description: 'Revisar e gerar PDF' }
      ]
    : [
        { id: 1, title: 'Selecionar Guindaste',  description: 'Escolha o guindaste ideal' },
        { id: 2, title: 'Pagamento', description: 'PolÃ­tica de pagamento' },
        { id: 3, title: 'Dados do Cliente',  description: 'InformaÃ§Ãµes do cliente' },
        { id: 4, title: 'Estudo Veicular',  description: 'configuracao do veÃ­culo' },
        { id: 5, title: 'Finalizar',  description: 'Revisar e confirmar' }
      ];

  // Capacidades dinÃ¢micas com base nos guindastes carregados
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
  
  const getPrecoParaConfigurador = useCallback(async (guindasteId) => {
    try {
      if (isModoConcessionaria) {
        const regiaoParaUsar = regiaoClienteSelecionada || concessionariaInfo?.regiao_preco || '';
        if (!regiaoParaUsar) return 0;
        const regiao = normalizarRegiao(regiaoParaUsar, true);
        return await db.getPrecoCompraPorRegiao(guindasteId, regiao);
      }
      const isExteriorSel = user?.tipo === 'vendedor_exterior' ||
        normalizarRegiao(regiaoClienteSelecionada) === 'comercio-exterior';
      if (isExteriorSel) {
        return await db.getPrecoPorRegiao(guindasteId, 'comercio-exterior');
      }
      const regiao = normalizarRegiao(regiaoClienteSelecionada || user?.regiao || '');
      return await db.getPrecoPorRegiao(guindasteId, regiao);
    } catch {
      return 0;
    }
  }, [user, regiaoClienteSelecionada, isModoConcessionaria, concessionariaInfo]);

  const getImagemParaConfigurador = useCallback((guindasteId) => {
    return db.getGuindasteImagem(guindasteId);
  }, []);

  //  OTIMIZADO: FunÃ§Ã£o para selecionar guindaste com cache
  const handleSelecionarGuindaste = async (guindaste) => {
    logger.log('Selecionando guindaste:', guindaste.id, guindaste.subgrupo);
    
    // Mostrar loading
    setIsLoading(true);

    try {
      // 1. Buscar detalhes completos do guindaste (com cache automÃ¡tico)
      logger.time('Carregamento do guindaste');
      const guindasteCompleto = await db.getGuindasteCompleto(guindaste.id);
      logger.timeEnd('Carregamento do guindaste');
      
      // 2. Buscar preÃ§o inicial
      let precoGuindaste = 0;
      let regiaoInicial = 'concessionaria';
      if (isModoConcessionaria) {
        const regiaoParaUsar = regiaoClienteSelecionada ||
          concessionariaInfo?.regiao_preco || '';
        if (!regiaoParaUsar) {
          alert('RegiÃ£o de compra nÃ£o definida. Configure a regiÃ£o no cadastro do usuÃ¡rio.');
          setIsLoading(false);
          return;
        }
        if (!regiaoClienteSelecionada) setRegiaoClienteSelecionada(regiaoParaUsar);

        regiaoInicial = normalizarRegiao(regiaoParaUsar, true);
        precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoInicial);
        logger.log(`PreÃ§o inicial (compra concessionÃ¡ria): R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert('Este equipamento nÃ£o possui preÃ§o de compra definido para esta regiÃ£o.');
          setIsLoading(false);
          return;
        }
      } else {
        const isExteriorSel = user?.tipo === 'vendedor_exterior' ||
          normalizarRegiao(regiaoClienteSelecionada) === 'comercio-exterior';
        if (isExteriorSel) {
          regiaoInicial = 'comercio-exterior';
        } else {
          regiaoInicial = normalizarRegiao(regiaoClienteSelecionada || user?.regiao || '');
        }
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoInicial);
        // Log diagnóstico Nova Proposta
        console.log('[NOVA PROPOSTA] handleSelecionarGuindaste', {
          tipoUsuario: user?.tipo,
          regioes_operacao: normalizarArray(user?.regioes_operacao),
          regiaoSelecionada: regiaoClienteSelecionada,
          origemRegiao: normalizarArray(user?.regioes_operacao).length > 0 ? 'regioes_operacao' : 'user.regiao',
          regiaoNormalizada: regiaoInicial,
          origemPreco: 'getPrecoPorRegiao',
          precoFinal: precoGuindaste,
          guindaste: guindaste.subgrupo || guindaste.id,
        });
        logger.log(`PreÃ§o inicial: R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert(
            isExteriorSel
              ? 'Este equipamento nÃ£o possui preÃ§o definido para ComÃ©rcio Exterior.'
              : 'Este equipamento nÃ£o possui preÃ§o definido para sua regiÃ£o.'
          );
          setIsLoading(false);
          return;
        }
      }

      // 3. Criar produto com preÃ§o correto e detalhes completos
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
        preco: precoGuindaste,
        tipo: 'guindaste'
      };

      // 4. NÃƒO adicionar ao carrinho aqui - apenas navegar para detalhes
      // O carrinho serÃ¡ atualizado quando voltar de DetalhesGuindaste
      logger.log('Navegando para detalhes do guindaste (sem adicionar ao carrinho ainda)');

      // 5. Navegar para detalhes com objeto completo
      navigate('/detalhes-guindaste', {
        state: {
          guindaste: { ...guindasteCompleto, preco: precoGuindaste },
          returnTo: isModoConcessionaria ? '/nova-proposta-concessionaria' : '/novo-pedido',
          step: 2,
          regiaoClienteSelecionada: regiaoClienteSelecionada
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar dados do guindaste:', error);
      alert('Erro ao buscar dados do equipamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // FunÃ§Ã£o para selecionar capacidade
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
    
    // Scroll automÃ¡tico para a prÃ³xima etapa apÃ³s um pequeno delay
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

  // FunÃ§Ã£o para selecionar modelo
  const handleSelecionarModelo = (modelo) => {
    setSelectedModelo(modelo);
    setGuindastesSelecionados([]);
    
    // Adicionar efeito visual de destaque
    const card = document.querySelector(`[data-modelo="${modelo}"]`);
    if (card) {
      card.classList.add('selection-highlight');
      setTimeout(() => card.classList.remove('selection-highlight'), 1000);
    }
    
    // Scroll automÃ¡tico para a prÃ³xima etapa apÃ³s um pequeno delay
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

      // â† NOVO: Se removeu o equipamento atual, limpar rastreamento
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

  // FunÃ§Ãµes para carrinho acumulativo
  const adicionarPedidoAoCarrinhoAcumulativo = () => {
    const novoPedido = {
      id: Date.now(), // ID Ãºnico para o pedido
      carrinho: [...carrinho],
      clienteData: { ...clienteData },
      caminhaoData: { ...caminhaoData },
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
    localStorage.removeItem('carrinho');
    localStorage.removeItem('novoPedido_pagamentoData');
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




  // Renderizar conteÃºdo do step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <>
              {isModoConcessionaria ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8125rem', color: '#000000' }}>
                  <span>RegiÃ£o de compra: <strong>{regiaoClienteSelecionada || '...'}</strong></span>
                </div>
              ) : normalizarArray(user?.regioes_operacao).length > 0 ? (
                // ✅ Só mostra seletor quando vendedor tem múltiplas regiões de operação
                <SeletorRegiaoCliente
                  regiaoSelecionada={regiaoClienteSelecionada}
                  onRegiaoChange={setRegiaoClienteSelecionada}
                  regioesDisponiveis={normalizarArray(user?.regioes_operacao)}
                  questionLabel="Região do cliente"
                />
              ) : regiaoClienteSelecionada ? (
                // ✅ Vendedor com apenas user.regiao: exibe região fixa sem seletor
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8125rem', color: '#166534' }}>
                  <span>📍 Região: <strong>{regiaoClienteSelecionada}</strong></span>
                </div>
              ) : null}
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
            />

            {/* Mostrar carrinho e botÃ£o de continuar para modo concessionÃ¡ria */}
            {isModoConcessionaria && carrinho.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#1f2937', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ðŸ›’ Equipamentos no carrinho
                </div>
                {carrinho.map((item, idx) => item.tipo === 'guindaste' ? (
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
                        âœ•
                      </button>
                    </div>
                  </div>
                ) : null)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(102, 126, 234, 0.12)', border: '1px solid rgba(102, 126, 234, 0.35)', marginTop: '4px', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 800, color: '#1f2937', fontSize: '0.875rem' }}>Total ({carrinho.filter(i => i.tipo === 'guindaste').length} equip.)</span>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{formatCurrency(getTotalCarrinho())}</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
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
                    âœ… Continuar para Pagamento ({carrinho.filter(i => i.tipo === 'guindaste').length} equip.)
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>PolÃ­tica de Pagamento</h2>
              <p>{isModoConcessionaria ? 'CondiÃ§Ã£o de compra para concessionÃ¡ria' : 'Selecione a forma de pagamento e visualize os descontos'}</p>
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
            />
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            {isModoConcessionaria ? (
              /* Estudo Veicular para ConcessionÃ¡ria */
              <div className="step-content">
                <div className="step-header">
                  <h2>ðŸš› Estudo Veicular</h2>
                  <p>Configure o veÃ­culo para instalaÃ§Ã£o do guindaste</p>
                </div>
                <EstudoVeicular
                  caminhaoData={caminhaoData}
                  setCaminhaoData={setCaminhaoData}
                  carrinho={carrinho}
                  onNext={handleNext}
                  onPrev={handlePrevious}
                  errors={validationErrors}
                />
              </div>
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
                    <p>Preencha as informaÃ§Ãµes do cliente para seguir</p>
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
              /* Resumo para ConcessionÃ¡ria */
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
                  carrinhoAcumulativo={carrinhoAcumulativo}
                  onAdicionarAoCarrinho={adicionarPedidoAoCarrinhoAcumulativo}
                  onLimparPedidoAtual={limparPedidoAtual}
                  onLimparCarrinhoAcumulativo={limparCarrinhoAcumulativo}
                  onRemoverDoCarrinhoAcumulativo={removerDoCarrinhoAcumulativo}
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
              <p>Revise e confirme as informaÃ§Ãµes</p>
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
            />
          </div>
        );

      default:
        return null;
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    
    if (isModoConcessionaria) {
      if (step === 1) {
        if (!regiaoClienteSelecionada) errors.regiao = 'Selecione a regiÃ£o de compra';
        if (carrinho.length === 0) errors.guindaste = 'Selecione pelo menos um guindaste';
      }
      if (step === 2) {
        if (!pagamentoData.tipoFrete) errors.tipoFrete = 'Selecione o tipo de frete';
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
        
        // Prazo de pagamento NÃƒO Ã© obrigatÃ³rio se houver financiamento bancÃ¡rio
        if (!pagamentoData.prazoPagamento && pagamentoData.financiamentoBancario !== 'sim') {
          errors.prazoPagamento = 'Selecione o prazo de pagamento';
        }
        
        // Local de instalaÃ§Ã£o e tipo de instalaÃ§Ã£o sÃ£o obrigatÃ³rios apenas para cliente
        if (pagamentoData.tipoPagamento === 'cliente') {
          if (!pagamentoData.localInstalacao) {
            errors.localInstalacao = 'Informe o local de instalaÃ§Ã£o';
          }
          if (!pagamentoData.tipoInstalacao) {
            errors.tipoInstalacao = 'Selecione o tipo de instalaÃ§Ã£o';
          }
          // ParticipaÃ§Ã£o de revenda Ã© obrigatÃ³ria para cliente
          if (!pagamentoData.participacaoRevenda) {
            errors.participacaoRevenda = 'Selecione se hÃ¡ participaÃ§Ã£o de revenda';
          }
          // Se respondeu participaÃ§Ã£o, IE/Tipo Ã© obrigatÃ³rio
          if (pagamentoData.participacaoRevenda && !pagamentoData.revendaTemIE) {
            errors.revendaTemIE = 'Selecione o tipo de cliente/revenda';
          }
        }
        
        if (!pagamentoData.tipoFrete) {
          errors.tipoFrete = 'Selecione o tipo de frete';
        }
        break;
      case 3:
        if (!clienteData.nome) errors.nome = 'Nome Ã© obrigatÃ³rio';
        if (!clienteData.telefone) errors.telefone = 'Telefone Ã© obrigatÃ³rio';
        if (!clienteData.modoInternacional) {
          if (!clienteData.documento) errors.documento = 'CNPJ ou CPF Ã© obrigatÃ³rio';
          if (!clienteData.inscricao_estadual || (clienteData.inscricao_estadual !== 'ISENTO' && clienteData.inscricao_estadual.trim() === '')) {
            errors.inscricao_estadual = 'InscriÃ§Ã£o Estadual Ã© obrigatÃ³ria';
          }
          if (!clienteData.endereco) errors.endereco = 'EndereÃ§o Ã© obrigatÃ³rio';
        }
        break;
      case 4:
        if (!caminhaoData.tipo) errors.tipo = 'Tipo do veÃ­culo Ã© obrigatÃ³rio';
        if (!caminhaoData.marca) errors.marca = 'Marca Ã© obrigatÃ³ria';
        if (!caminhaoData.modelo) errors.modelo = 'Modelo Ã© obrigatÃ³rio';
        if (!caminhaoData.voltagem) errors.voltagem = 'Voltagem Ã© obrigatÃ³ria';
        // Ano Ã© opcional; se informado, validar intervalo
        if (caminhaoData.ano && (parseInt(caminhaoData.ano) < 1960 || parseInt(caminhaoData.ano) > new Date().getFullYear())) {
          errors.ano = 'Ano invÃ¡lido';
        }
        break;
    }
    
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canGoNext = () => {
    if (isModoConcessionaria) {
      switch (currentStep) {
        case 1:
          return carrinho.length > 0 && !!regiaoClienteSelecionada;
        case 2:
          return !!pagamentoData.tipoFrete;
        case 3:
          return true; // Step 3 Ã© o resumo, sempre pode finalizar
        default:
          return false;
      }
    }
    switch (currentStep) {
      case 1:
        return guindastesSelecionados.length > 0;
      case 2:
        // Para revenda, apenas tipoPagamento, prazoPagamento e tipoFrete sÃ£o obrigatÃ³rios
        if (pagamentoData.tipoPagamento === 'revenda') {
          return pagamentoData.tipoPagamento && 
                 pagamentoData.prazoPagamento && 
                 pagamentoData.tipoFrete;
        }
        // Para cliente com financiamento bancÃ¡rio, nÃ£o exige prazoPagamento
        if (pagamentoData.tipoPagamento === 'cliente' && pagamentoData.financiamentoBancario === 'sim') {
          return pagamentoData.tipoPagamento && 
                 pagamentoData.localInstalacao && 
                 pagamentoData.tipoInstalacao &&
                 pagamentoData.tipoFrete &&
                 pagamentoData.participacaoRevenda &&
                 (pagamentoData.participacaoRevenda ? pagamentoData.revendaTemIE : true);
        }
        // Para cliente sem financiamento bancÃ¡rio, todos os campos sÃ£o obrigatÃ³rios
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

  const handleNext = () => {
    
    // Adicionar log detalhado ANTES da validaÃ§Ã£o
    if (currentStep === 2) {
    }
    
    const isValid = validateStep(currentStep);
    
    const totalSteps = steps.length;
    if (isValid && currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      setValidationErrors({}); // Limpar erros ao avanÃ§ar
    } else {
      console.warn('âš ï¸ NÃ£o pode avanÃ§ar. isValid:', isValid, 'currentStep:', currentStep);
      console.warn('ðŸ“‹ Campos obrigatÃ³rios faltando:', Object.keys(validationErrors));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // O reset do pagamentoData Ã© feito pelo useEffect que monitora currentStep
    }
  };

  const handleStepClick = (stepId) => {
    // Permite navegar para qualquer step que jÃ¡ foi alcanÃ§ado
    if (stepId <= maxStepReached) {
      setCurrentStep(stepId);
      setValidationErrors({}); // Limpar erros ao navegar
    }
  };



  const handleFinish = async () => {
    try {
      // Salvar relatÃ³rio no banco de dados
      await salvarRelatorio();
      
      // Limpar carrinho e navegar para histÃ³rico
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
        title={isEdicao ? `Editar Proposta #${propostaOriginal?.numero_proposta || ''}` : (isModoConcessionaria ? 'Novo Pedido da ConcessionÃ¡ria' : 'Nova Proposta')}
        subtitle={isEdicao ? "Atualize os dados da proposta existente" : (isModoConcessionaria ? 'Compra interna simplificada' : 'Criar orÃ§amento profissional')}
        extraButtons={[
          import.meta.env.DEV && (
            <>
              <button
                key="debug-prices"
                onClick={async () => {

                  // Verificar preÃ§os de todas as regiÃµes para os primeiros equipamentos
                  const regioesParaTestar = ['rs-com-ie', 'rs-sem-ie', 'sul-sudeste'];
                  const equipamentosParaTestar = guindastes.slice(0, 3);

                  for (const equipamento of equipamentosParaTestar) {

                    for (const regiao of regioesParaTestar) {
                      try {
                        const preco = await db.getPrecoPorRegiao(equipamento.id, regiao);
                      } catch (error) {
                        console.error(`  âŒ Erro em ${regiao}:`, error.message);
                      }
                    }
                  }

                  // Testar lÃ³gica atual
                  const temIE = determinarClienteTemIE();
                  const regiaoAtual = normalizarRegiao(regiaoClienteSelecionada || 'sul-sudeste', temIE);
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
                title="Debug completo de preÃ§os"
              >
                ðŸ” DEBUG PREÃ‡OS
              </button>
              <button
                key="test-context"
                onClick={() => {

                  // Simular mudanÃ§a de contexto
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
                title="Testar mudanÃ§a de contexto"
              >
                ðŸ§ª TESTE CONTEXTO
              </button>
            </>
          )
        ]}
      />

      {/* Banner de EdiÃ§Ã£o */}
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
          <span style={{ fontSize: '24px' }}>âœï¸</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
              Modo EdiÃ§Ã£o Ativo
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              VocÃª estÃ¡ editando a proposta <strong>#{propostaOriginal?.numero_proposta}</strong>. 
              As alteraÃ§Ãµes substituirÃ£o os dados atuais ao gerar o PDF.
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

// FunÃ§Ã£o para extrair configuraÃ§Ãµes do tÃ­tulo do guindaste com Ã­cones
const extrairConfiguracoes = (subgrupo) => {
  const configuracoes = [];
  
  // Extrair configuraÃ§Ãµes do tÃ­tulo (mais especÃ­fico para evitar falsos positivos)
  if (subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/')) {
    configuracoes.push({  text: 'CR - Controle Remoto' });
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push({ text: 'EH - Extensiva HidrÃ¡ulica' });
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push({ text: 'ECS - Extensiva Cilindro Superior' });
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push({ text: 'P - PreparaÃ§Ã£o p/ Perfuratriz' });
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push({ text: 'GR - PreparaÃ§Ã£o p/ Garra e Rotator' });
  }
  if (subgrupo.includes('CaminhÃ£o 3/4')) {
    configuracoes.push({ text: 'CaminhÃ£o 3/4' });
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

      {/* CabeÃ§alho com Imagem e InformaÃ§Ãµes Principais */}
      <div className="card-header">
        <div className="guindaste-image-container">
          {/* âš¡ Lazy loading sob demanda com cache de 30min â€” sem download em massa de base64 */}
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
              <span className="codigo-display">CÃ³d: {guindaste.codigo_referencia}</span>
            )}
          </div>
        </div>
      </div>

      {/* Corpo do Card com EspecificaÃ§Ãµes Detalhadas */}
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
              <span className="spec-value">{guindaste.peso_kg || 'PadrÃ£o'}</span>
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
                <span className="spec-label">Opcionais IncluÃ­dos</span>
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

        {/* Ãrea de AÃ§Ãµes */}
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

// Componente PolÃ­tica de Pagamento foi movido para src/features/payment/PaymentPolicy.jsx

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
      // Campos numÃ©ricos: aceitar apenas dÃ­gitos
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
        // IE: aceitar apenas nÃºmeros (exceto quando Ã© ISENTO)
        maskedValue = value.replace(/\D/g, '');
      }
      else {
        maskedValue = value;
      }
      const next = { ...prev, [field]: maskedValue };
      // ConsistÃªncia BR: ao mudar UF/Cidade manualmente, limpar CEP; ao mudar UF, limpar Cidade
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
      // Se o campo alterado Ã© parte do endereÃ§o detalhado, atualizar 'endereco' composto
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
            // CEP Ã© a fonte da verdade para UF e Cidade
            uf: data.uf || '',
            cidade: data.localidade || '',
            // Logradouro e bairro: preencher apenas se ainda nÃ£o informados
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
      {/* InformaÃ§Ãµes Pessoais */}
     <div className="client-form-container">
  <div className="client-form">

    {/* InformaÃ§Ãµes pessoais */}
    <div className="form-section">
      <div className="section-header">
        <div>
          <h3>InformaÃ§Ãµes pessoais</h3>
          <p>Dados bÃ¡sicos do cliente</p>
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
            <label htmlFor="semEmail">NÃ£o possui e-mail</label>
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
            placeholder={modoInternacional ? 'NÃºmero de identificaÃ§Ã£o fiscal' : '000.000.000-00'}
            className={errors.documento ? 'error' : ''}
          />
          {errors.documento && <span className="error-message">{errors.documento}</span>}
        </div>

        {!modoInternacional && (
          <div className="form-group">
            <label>InscriÃ§Ã£o Estadual {!isentoIE && '*'}</label>

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
              <label htmlFor="isentoIE">Isento de InscriÃ§Ã£o Estadual</label>
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

    {/* EndereÃ§o */}
    <div className="form-section">
      <div className="section-header">
        <div>
          <h3>EndereÃ§o</h3>
          <p>LocalizaÃ§Ã£o do cliente</p>
        </div>

        {isExteriorUser && (
          <button
            type="button"
            onClick={toggleModo}
            className={`btn-mode-toggle ${modoInternacional ? 'active' : ''}`}
          >
            {modoInternacional ? 'Internacional ativo' : 'EndereÃ§o internacional'}
          </button>
        )}
      </div>

      {modoInternacional ? (
        <div className="form-group full-width">
          <label>EndereÃ§o completo *</label>
          <textarea
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Digite o endereÃ§o completo: rua, nÃºmero, cidade, estado, paÃ­s e cÃ³digo postal"
            rows={4}
            className={errors.endereco ? 'error' : ''}
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
      ) : (
        <div className="form-group full-width">
          <label>EndereÃ§o *</label>

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
                  <label>NÃºmero</label>
                  <input
                    type="text"
                    value={formData.numero || ''}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="NÃºmero"
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
            <label>EndereÃ§o completo</label>
            <input
              type="text"
              value={formData.endereco || ''}
              readOnly
              placeholder="EndereÃ§o completo gerado automaticamente"
              className={errors.endereco ? 'error' : ''}
            />
          </div>

          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
      )}

      <div className="form-group observacoes-group">
        <label>ObservaÃ§Ãµes</label>
        <textarea
          value={formData.observacoes || ''}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="InformaÃ§Ãµes adicionais sobre o cliente"
          rows="3"
        />
      </div>
    </div>
      </div>

      </div>
    </div>
  );
};

// Componente Form do CaminhÃ£o
const CaminhaoForm = ({ formData, setFormData, errors = {}, carrinho = [] }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // FunÃ§Ã£o para calcular o patolamento baseado na medida C
  const calcularPatolamento = (medidaC) => {
    if (!medidaC) return '';
    const medida = parseFloat(medidaC);
    if (isNaN(medida)) return '';
    
    // Regras: >= 70cm â†’ 580mm | 60-69cm â†’ 440mm | < 60cm â†’ 390mm
    if (medida >= 70) return '580mm';
    if (medida >= 60) return '440mm';
    return '390mm';
  };
  
  const temGSI = React.useMemo(() =>
    carrinho.some(item => item.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSI')),
    [carrinho]
  );
  const temGSE = React.useMemo(() =>
    carrinho.some(item => item.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSE')),
    [carrinho]
  );
  const noDetection = !temGSI && !temGSE;
  const showMedidaA = noDetection || temGSI;
  const showMedidaB = noDetection || temGSI;
  const showMedidaD = (noDetection || temGSE) && formData.tipo === 'Bitruck';
  const showComprimento = noDetection || temGSE;
  const instrucaoMedidas = noDetection
    ? 'Preencha conforme a imagem. CaminhÃ£o 1 = GSI Interno Â· CaminhÃ£o 2 = GSE Externo.'
    : temGSI && !temGSE
      ? 'Para instalaÃ§Ã£o GSI, preencha as medidas A, B e C.'
      : !temGSI && temGSE
        ? 'Para instalaÃ§Ã£o GSE, preencha a medida C (define patolamento), o comprimento do chassi e, se Bitruck, a medida D.'
        : 'Preencha conforme a imagem. CaminhÃ£o 1 = GSI Interno Â· CaminhÃ£o 2 = GSE Externo.';

  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

  return (
    <div className="client-form-container">
      {/* InformaÃ§Ãµes do VeÃ­culo */}
      <div className="form-section">
        <div className="section-header">
          <h3>InformaÃ§Ãµes do VeÃ­culo</h3>
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
            <label>ObservaÃ§Ãµes</label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="InformaÃ§Ãµes adicionais sobre o caminhÃ£o..."
              rows="2"
            />
          </div>
        </div>
      </div>

      {/* SeÃ§Ã£o de Medidas */}
      <div className="form-section">
        <div className="section-header">
          <h3>Medidas para InstalaÃ§Ã£o</h3>
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
                <p>Imagem nÃ£o disponÃ­vel</p>
              </div>
            </div>

            {/* Campos de Medidas */}
            <div className="estudo-veicular-form">
              <p className="estudo-veicular-instructions">{instrucaoMedidas}</p>
              
              <div className="form-grid">
                {showMedidaA && (
                <div className="form-group">
                  <label>Medida A â€” Chassi ao Assoalho (cm)</label>
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
                  <label>Medida B â€” Chassi (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 70"
                  />
                </div>
                )}
                
                <div className="form-group">
                  <label>Medida C â€” Solo ao Chassi (cm)</label>
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
                  <label>Medida D â€” Dist. entre Eixos, GSE (cm)</label>
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
                    {parseFloat(formData.medidaC) >= 70 && 'Medida C â‰¥ 70cm'}
                    {parseFloat(formData.medidaC) >= 60 && parseFloat(formData.medidaC) < 70 && 'Medida C entre 60â€“69cm'}
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

  // Modo ediÃ§Ã£o de verdade vem da URL (propostaId). Isso evita timing issues de estado
  // que podem fazer o fluxo cair em INSERT e duplicar registros.
  const modoEdicaoCalc = !!propostaId;
  const propostaIdCalc = propostaOriginal?.id || propostaId || null;

  // Quando estiver editando, considerar a proposta como "jÃ¡ salva" para evitar INSERT
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
          console.warn('Bitrix: falha ao criar negÃ³cio automaticamente.', bitrixError);
        }
      }
      // Detectar se Ã© proposta preliminar (Proposta RÃ¡pida)
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
      
      // CritÃ©rios mÃ­nimos para salvar automaticamente sem interromper a experiÃªncia
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
        // Salvar relatÃ³rio automaticamente no banco de dados (apenas uma vez)
        if (!pedidoSalvoId) {
          const pedido = await salvarRelatorio();
          setPedidoSalvoId(pedido?.id || null);
        }
        const tipoMsg = isPropostaPreliminar ? ' (Proposta Preliminar)' : '';
        alert(`PDF gerado com sucesso: ${fileName}\nRelatÃ³rio salvo automaticamente!${tipoMsg}`);
      } else {
        alert(`PDF gerado com sucesso: ${fileName}\nObservaÃ§Ã£o: RelatÃ³rio nÃ£o foi salvo automaticamente porque ainda faltam dados obrigatÃ³rios (Cliente e/ou CaminhÃ£o). Ao clicar em Finalizar, ele serÃ¡ salvo.`);
      }
    } catch (error) {
      console.error('Erro ao salvar relatÃ³rio:', error);
      const msg = (error && error.message) ? `\nMotivo: ${error.message}` : '';
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatÃ³rio automaticamente.${msg}`);
    }
  };

  const salvarRelatorio = async () => {
    try {
      // VerificaÃ§Ã£o defensiva ULTRA ROBUSTA: garantir que isEdicao e propostaOriginal existam
      const modoEdicao = modoEdicaoCalc;
      const proposta = propostaOriginal || null;
      const propostaIdToUpdate = propostaIdCalc;
      
      
      // Se for ediÃ§Ã£o, fazer UPDATE direto
      if (modoEdicao && propostaIdToUpdate) {
        
        // Buscar o ID do guindaste principal no carrinho
        const guindasteNoCarrinho = carrinho.find(item => item.tipo === 'equipamento' || item.tipo === 'guindaste');
        const guindasteId = guindasteNoCarrinho?.id || null;

        const documentoClienteDB = (String(clienteData.documento || proposta?.cliente_documento || '')
          .replace(/\D/g, '')
          .slice(0, 10)) || null;
        
        const dadosAtualizados = {
          data: new Date().toISOString(),
          valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0),
          concessionaria_id: user?.concessionaria_id || null,
          dados_serializados: {
            carrinho,
            clienteData,
            caminhaoData,
            pagamentoData,
            guindasteId,
            concessionaria_id: user?.concessionaria_id || null
          },
          // Atualizar tambÃ©m campos principais se mudaram
          cliente_nome: clienteData.nome || proposta?.cliente_nome || null,
          cliente_documento: documentoClienteDB
        };
        
        const propostaAtualizada = await updateProposta(propostaIdToUpdate, dadosAtualizados);
        
        return propostaAtualizada;
      }
      
      // Modo criaÃ§Ã£o normal

      if (isConcessionariaCompra) {
        const timestamp = Date.now().toString();
        const numeroPedido = `PC${timestamp.slice(-8)}`;

        const valorTotal = pagamentoData.valorFinal || carrinhoFinal.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0);

        const clienteDocumentoDB = (String(concessionariaInfo?.cnpj || clienteData?.documento || '')
          .replace(/\D/g, '')
          .slice(0, 10)) || null;

        const canalVendaConcessionaria = (() => {
          if (user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'admin_concessionaria') {
            const ufConc = (concessionariaInfo?.uf || '').toUpperCase();
            const paisesInternacionais = ['PY','AR','UY','BO','CL','PE','CO','VE','EC','GY','SR'];
            return paisesInternacionais.includes(ufConc)
              ? 'ConcessionÃ¡ria Internacional'
              : 'ConcessionÃ¡ria Nacional';
          }
          return 'ConcessionÃ¡ria Nacional';
        })();
        const linhaCarrinhoConc = carrinhoFinal.find(i => i.nome?.includes('GSI') || i.subgrupo?.includes('GSI'))
          ? 'GSI'
          : carrinhoFinal.find(i => i.nome?.includes('GSE') || i.subgrupo?.includes('GSE'))
          ? 'GSE'
          : 'Outros';
        const produtoPrincipalConc = (carrinhoFinal.find(i =>
          i.tipo === 'equipamento' || i.tipo === 'guindaste' ||
          i.nome?.includes('GSI') || i.nome?.includes('GSE')
        ) || carrinhoFinal[0])?.nome || null;

        const pedidoDataToSave = {
          numero_proposta: numeroPedido,
          data: new Date().toISOString(),
          vendedor_id: user.id,
          vendedor_nome: user.nome || 'NÃ£o informado',
          cliente_nome: concessionariaInfo?.nome || clienteData?.nome || 'ConcessionÃ¡ria',
          cliente_documento: clienteDocumentoDB,
          valor_total: valorTotal,
          tipo: 'proposta',
          status: 'finalizado',
          concessionaria_id: user?.concessionaria_id || null,
          canal_venda: canalVendaConcessionaria,
          segmento_cliente: clienteData?.segmento_cliente || null,
          cliente_uf: (concessionariaInfo?.uf || clienteData?.uf || null),
          cliente_cidade: (concessionariaInfo?.cidade || clienteData?.cidade || null),
          produto_principal: produtoPrincipalConc,
          linha_produto: linhaCarrinhoConc,
          dados_serializados: {
            carrinho: carrinhoFinal,
            pagamentoData,
            regiaoCompraSelecionada: regiaoCompraSelecionada || null,
            concessionaria_id: user?.concessionaria_id || null,
            concessionariaInfo: concessionariaInfo || null,
          }
        };

        const pedido = await createpropostas(pedidoDataToSave);
        return pedido;
      }
      
      // 1. Criar cliente
      
      // Montar endereÃ§o completo a partir dos campos separados
      const enderecoCompleto = (() => {
        const c = clienteData;
        const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
        const bairro = c.bairro ? ` - ${c.bairro}` : '';
        const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
        const cep = c.cep ? ` - CEP: ${c.cep}` : '';
        return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || c.endereco || 'NÃ£o informado';
      })();
      
      // Filtrar apenas campos que existem na tabela clientes
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
      
      // 2. Criar caminhÃ£o
      
      // Detectar se Ã© proposta preliminar
      const isPropostaPreliminar = caminhaoData?.tipo === 'PREENCHER' || 
                                    caminhaoData?.marca === 'PREENCHER' || 
                                    caminhaoData?.modelo === 'PREENCHER';
      
      let caminhao = null;
      
      if (isPropostaPreliminar) {
        // Para proposta preliminar: nÃ£o salvar no banco, apenas usar dados em memÃ³ria
        caminhao = {
          id: null,
          ...caminhaoData,
          cliente_id: cliente.id
        };
      } else {
        // Para proposta normal: exigir voltagem e salvar no banco
        const camposObrigatorios = ['tipo', 'marca', 'modelo', 'voltagem'];
        const camposFaltando = camposObrigatorios.filter(campo => !caminhaoData[campo]);
        if (camposFaltando.length > 0) {
          throw new Error(`Campos obrigatÃ³rios do caminhÃ£o nÃ£o preenchidos: ${camposFaltando.join(', ')}`);
        }

        const caminhaoDataToSave = {
          ...filterCaminhaoDataForDB(caminhaoData),
          cliente_id: cliente.id
        };
        
        
        caminhao = await createCaminhao(caminhaoDataToSave);
      }
      
      // 3. Gerar nÃºmero do pedido (mÃ¡x. 10 caracteres para caber em VARCHAR(10))
      const timestamp = Date.now().toString();
      const numeroPedido = `PED${timestamp.slice(-7)}`; // Ex: PED1234567
      
      // 4. Criar pedido
      
            
            
      const clienteDocumentoDB = (String(cliente.documento || '')
        .replace(/\D/g, '')
        .slice(0, 10)) || null;

      const canalVendaPropostal = (() => {
        if (user?.tipo === 'vendedor_concessionaria') return 'ConcessionÃ¡ria Nacional';
        if (user?.tipo === 'admin_concessionaria') return 'ConcessionÃ¡ria Nacional';
        return 'Vendedor Interno';
      })();
      const linhaCarrinho = carrinho.find(i => i.nome?.includes('GSI') || i.subgrupo?.includes('GSI'))
        ? 'GSI'
        : carrinho.find(i => i.nome?.includes('GSE') || i.subgrupo?.includes('GSE'))
        ? 'GSE'
        : 'Outros';
      const produtoPrincipal = (carrinho.find(i =>
        i.tipo === 'equipamento' || i.tipo === 'guindaste' ||
        i.nome?.includes('GSI') || i.nome?.includes('GSE')
      ) || carrinho[0])?.nome || null;

      const pedidoDataToSave = {
        numero_proposta: numeroPedido,
        data: new Date().toISOString(),
        vendedor_id: user.id,
        vendedor_nome: user.nome || 'NÃ£o informado',
        cliente_nome: cliente.nome || 'NÃ£o informado',
        cliente_documento: clienteDocumentoDB,
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0),
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
          concessionaria_id: user?.concessionaria_id || null
        }
      };
      
      const pedido = await createpropostas(pedidoDataToSave);
            
      // 5. Itens do pedido jÃ¡ estÃ£o salvos em dados_serializados
      // NÃ£o Ã© necessÃ¡rio criar registros separados em propostas_itens
      
      return pedido;
    } catch (error) {
      console.error('âŒ Erro ao salvar relatÃ³rio:', error);
      console.error('ðŸ“‹ Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      console.error('ðŸ” Erro completo:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  // Buscar dados completos dos guindastes do carrinho
  // Combinar carrinho acumulativo + carrinho atual para concessionÃ¡ria
  const carrinhoFinal = isConcessionariaCompra && carrinhoAcumulativo.length > 0
    ? [...carrinhoAcumulativo.flatMap(p => p.carrinho), ...carrinho]
    : carrinho;

  const guindastesCompletos = carrinhoFinal
    .filter(item => item.tipo === 'guindaste')
    .map(item => {
      // Buscar guindaste completo da lista carregada (fallback)
      const guindasteCompleto = guindastes.find(g => g.id === item.id);
      return {
        id: item.id,
        nome: item.nome,
        modelo: item.modelo || guindasteCompleto?.modelo,
        subgrupo: item.nome,
        codigo_produto: item.codigo_produto,
        codigo_referencia: item.codigo_produto,
        peso_kg: item.configuracao_lancas,
        grafico_carga_url: item.grafico_carga_url,
        // PRIORIZAR dados do carrinho (que jÃ¡ vÃªm completos do banco)
        descricao: item.descricao || guindasteCompleto?.descricao || '',
        nao_incluido: item.nao_incluido || guindasteCompleto?.nao_incluido || '',
        finame: item.finame || guindasteCompleto?.finame || '',
        ncm: item.ncm || guindasteCompleto?.ncm || ''
      };
    });

  const pedidoData = {
    carrinho: carrinhoFinal,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'NÃ£o informado',
    vendedorTelefone: user?.telefone || '',
    guindastes: guindastesCompletos,
    isConcessionariaCompra,
    regiaoCompraSelecionada: regiaoCompraSelecionada || '',
    concessionariaLogoUrl: concessionariaInfo?.logo_url || '',
    concessionariaDadosBancarios: concessionariaInfo?.dados_bancarios || '',
    concessionariaNome: concessionariaInfo?.nome || '',
  };

  return (
    <div className="resumo-container">
      {/* Itens Selecionados */}
      <div className="resumo-section">
        <div className="section-header">
          <h3>Itens Selecionados</h3>
          <span className="resumo-badge">{carrinhoFinal.length} {carrinhoFinal.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="resumo-itens-list">
          {carrinhoFinal.map((item, idx) => (
            <div key={idx} className="resumo-item-row">
              <span className="resumo-item-nome">{item.nome}</span>
              <span className="resumo-item-preco">{formatCurrency((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1))}</span>
            </div>
          ))}
          <div className="resumo-item-total">
            <span>Total dos equipamentos</span>
            <span>{formatCurrency(carrinhoFinal.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0))}</span>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      {!isConcessionariaCompra && (
        <div className="resumo-section">
          <div className="section-header"><h3>Dados do Cliente</h3></div>
          <div className="resumo-grid">
            <div className="resumo-field">
              <span className="resumo-label">Nome</span>
              <span className="resumo-value">{clienteData.nome || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">Telefone</span>
              <span className="resumo-value">{clienteData.telefone || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">Email</span>
              <span className="resumo-value">{clienteData.email || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">CNPJ / CPF</span>
              <span className="resumo-value">{clienteData.documento || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">InscriÃ§Ã£o Estadual</span>
              <span className="resumo-value">{clienteData.inscricao_estadual || 'â€”'}</span>
            </div>
            {(clienteData.cidade || clienteData.uf) && (
              <div className="resumo-field">
                <span className="resumo-label">Cidade / UF{clienteData.cep ? ' / CEP' : ''}</span>
                <span className="resumo-value">{clienteData.cidade || 'â€”'} / {clienteData.uf || 'â€”'}{clienteData.cep ? ` â€” ${clienteData.cep}` : ''}</span>
              </div>
            )}
            <div className="resumo-field resumo-field-wide">
              <span className="resumo-label">EndereÃ§o</span>
              <span className="resumo-value">{clienteData.endereco || 'â€”'}</span>
            </div>
            {clienteData.observacoes && (
              <div className="resumo-field resumo-field-wide">
                <span className="resumo-label">ObservaÃ§Ãµes</span>
                <span className="resumo-value">{clienteData.observacoes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estudo Veicular */}
      {!isConcessionariaCompra && (
        <div className="resumo-section">
          <div className="section-header"><h3>Estudo Veicular</h3></div>
          <div className="resumo-grid">
            <div className="resumo-field">
              <span className="resumo-label">Tipo</span>
              <span className="resumo-value">{caminhaoData.tipo || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">Marca</span>
              <span className="resumo-value">{caminhaoData.marca || 'â€”'}</span>
            </div>
            <div className="resumo-field">
              <span className="resumo-label">Modelo</span>
              <span className="resumo-value">{caminhaoData.modelo || 'â€”'}</span>
            </div>
            {caminhaoData.ano && (
              <div className="resumo-field">
                <span className="resumo-label">Ano</span>
                <span className="resumo-value">{caminhaoData.ano}</span>
              </div>
            )}
            <div className="resumo-field">
              <span className="resumo-label">Voltagem</span>
              <span className="resumo-value">{caminhaoData.voltagem || 'â€”'}</span>
            </div>
            {caminhaoData.medidaA && <div className="resumo-field"><span className="resumo-label">Medida A</span><span className="resumo-value">{caminhaoData.medidaA} cm</span></div>}
            {caminhaoData.medidaB && <div className="resumo-field"><span className="resumo-label">Medida B</span><span className="resumo-value">{caminhaoData.medidaB} cm</span></div>}
            {caminhaoData.medidaC && <div className="resumo-field"><span className="resumo-label">Medida C</span><span className="resumo-value">{caminhaoData.medidaC} cm</span></div>}
            {caminhaoData.medidaD && <div className="resumo-field"><span className="resumo-label">Medida D</span><span className="resumo-value">{caminhaoData.medidaD} cm</span></div>}
            {caminhaoData.patolamento && (
              <div className="resumo-field">
                <span className="resumo-label">Patolamento</span>
                <span className="resumo-value resumo-value-bold">{caminhaoData.patolamento}</span>
              </div>
            )}
            {caminhaoData.comprimentoChassi && (
              <div className="resumo-field">
                <span className="resumo-label">Comprimento do Chassi</span>
                <span className="resumo-value">{caminhaoData.comprimentoChassi} m</span>
              </div>
            )}
            {caminhaoData.observacoes && (
              <div className="resumo-field resumo-field-wide">
                <span className="resumo-label">ObservaÃ§Ãµes</span>
                <span className="resumo-value">{caminhaoData.observacoes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PolÃ­tica de Pagamento */}
      <div className="resumo-section">
        <div className="section-header"><h3>PolÃ­tica de Pagamento</h3></div>
        <div className="resumo-grid">
          <div className="resumo-field">
            <span className="resumo-label">Tipo de Pagamento</span>
            <span className="resumo-value">
              {pagamentoData.tipoPagamento === 'revenda_gsi' && 'Revenda â€” GSI'}
              {pagamentoData.tipoPagamento === 'cnpj_cpf_gse' && 'CNPJ â€” GSE'}
              {pagamentoData.tipoPagamento === 'parcelamento_interno' && 'Parcelamento Interno'}
              {pagamentoData.tipoPagamento === 'parcelamento_cnpj' && 'Parcelamento CNPJ'}
              {!pagamentoData.tipoPagamento && 'â€”'}
            </span>
          </div>
          <div className="resumo-field">
            <span className="resumo-label">Prazo</span>
            <span className="resumo-value">
              {pagamentoData.prazoPagamento === 'a_vista' && 'Ã€ Vista'}
              {pagamentoData.prazoPagamento === '30_dias' && '30 dias (+3%)'}
              {pagamentoData.prazoPagamento === '60_dias' && '60 dias (+1%)'}
              {pagamentoData.prazoPagamento === '120_dias_interno' && '120 dias'}
              {pagamentoData.prazoPagamento === '90_dias_cnpj' && '90 dias'}
              {pagamentoData.prazoPagamento === 'mais_120_dias' && '+120 dias (+2%/mÃªs)'}
              {pagamentoData.prazoPagamento === 'mais_90_dias' && '+90 dias (+2%/mÃªs)'}
              {!pagamentoData.prazoPagamento && 'â€”'}
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
              <span className="resumo-label">AcrÃ©scimo</span>
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
              <span className="resumo-label">Local de InstalaÃ§Ã£o</span>
              <span className="resumo-value">{pagamentoData.localInstalacao}</span>
            </div>
          )}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.tipoInstalacao && (
            <div className="resumo-field">
              <span className="resumo-label">Tipo de InstalaÃ§Ã£o</span>
              <span className="resumo-value">
                {pagamentoData.tipoInstalacao === 'cliente paga direto' && 'Cliente paga direto'}
                {pagamentoData.tipoInstalacao === 'Incluso no pedido' && 'Incluso no pedido'}
              </span>
            </div>
          )}
          {pagamentoData.participacaoRevenda && (
            <div className="resumo-field">
              <span className="resumo-label">ParticipaÃ§Ã£o de Revenda</span>
              <span className="resumo-value">{pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'NÃ£o'}</span>
            </div>
          )}
          {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
            <div className="resumo-field">
              <span className="resumo-label">Revenda possui IE</span>
              <span className="resumo-value">{pagamentoData.revendaTemIE === 'sim' ? 'Sim' : 'NÃ£o'}</span>
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
                    <span className="resumo-value">â€” {formatCurrency(pagamentoData.valorSinal)}</span>
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

      {/* AÃ§Ãµes */}
      <div className="resumo-acoes">
        {isConcessionariaCompra && carrinhoAcumulativo.length > 0 && (
          <div className="resumo-acumulativo">
            <div className="resumo-acumulativo-header">
              Equipamentos jÃ¡ adicionados ({carrinhoAcumulativo.length})
            </div>
            {carrinhoAcumulativo.map((pedido, idx) => (
              <div key={pedido.id} className="resumo-acumulativo-item">
                <span>
                  <strong>#{idx + 1}</strong> â€” {pedido.carrinho.map(i => i.nome).join(', ')}
                  <span className="resumo-acum-preco"> ({formatCurrency(pedido.carrinho.reduce((s, i) => s + ((parseFloat(i.preco) || 0) * (parseInt(i.quantidade, 10) || 1)), 0))})</span>
                </span>
                <button className="btn-remover-acum" onClick={() => onRemoverDoCarrinhoAcumulativo && onRemoverDoCarrinhoAcumulativo(pedido.id)}>âœ•</button>
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
            <span className="resumo-pdf-note">O PDF incluirÃ¡ {carrinhoAcumulativo.length + 1} equipamento(s)</span>
          )}
        </div>
      </div>
    </div>
  );
};

const EstudoVeicular = ({ caminhaoData, setCaminhaoData, carrinho, onNext, onPrev, errors = {}, onPropostaRapida }) => {
  const podeContinuar = Boolean(
    caminhaoData?.tipo &&
    caminhaoData?.marca &&
    caminhaoData?.modelo &&
    caminhaoData?.voltagem
  );

  return (
    <div className="vehicle-form-container">
      {/* Aviso Proposta RÃ¡pida */}
      <div className="proposta-rapida-hint">
        <span>NÃ£o tem os dados do veÃ­culo agora?</span>
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
              observacoes: 'PROPOSTA PRELIMINAR - Dados do veÃ­culo a confirmar com o cliente'
            });
            if (onPropostaRapida) { onPropostaRapida(); } else { onNext(); }
          }}
        >
          Gerar proposta rÃ¡pida
        </button>
        <span className="proposta-rapida-hint-note">(campos marcados como "A PREENCHER")</span>
      </div>

      <CaminhaoForm formData={caminhaoData} setFormData={setCaminhaoData} errors={errors} carrinho={carrinho} />

      <div className="form-actions">
        <button className="btn-back-secondary" onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
          Voltar
        </button>
        <button className="btn-continue" onClick={onNext} disabled={!podeContinuar}>
          <span>Continuar</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NovoPedido;




