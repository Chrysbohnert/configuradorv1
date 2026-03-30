import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext, useParams } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import LazyPDFGenerator from '../components/LazyPDFGenerator';
import PaymentPolicy from '../features/payment/PaymentPolicy';
import GuindasteSelector from '../components/GuindasteSelector';
import SeletorRegiaoCliente from '../components/SeletorRegiaoCliente';

import { db } from '../config/supabase';
import { normalizarRegiao } from '../utils/regiaoHelper';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { CODIGOS_MODELOS, DESCRICOES_OPCIONAIS } from '../config/codigosGuindaste';
import { createLogger } from '../utils/productionLogger';
import { createDealInSalesIfNotExists } from '../utils/bitrixClient';
import '../styles/NovoPedido.css';

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
  ]), []);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isEdicao, setIsEdicao] = useState(false); // Modo edição
  const [propostaOriginal, setPropostaOriginal] = useState(null); // Dados originais da proposta
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [pagamentoData, setPagamentoData] = useState(() => {
    const saved = localStorage.getItem('novoPedido_pagamentoData');
    return saved ? JSON.parse(saved) : {
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

  // ✅ NOVO: Restaurar região quando voltar de DetalhesGuindaste
  React.useEffect(() => {
    if (location.state?.regiaoClienteSelecionada) {
      console.log('📍 [NovoPedido] Restaurando região de location.state:', location.state.regiaoClienteSelecionada);
      setRegiaoClienteSelecionada(location.state.regiaoClienteSelecionada);
    }
  }, [location.state?.regiaoClienteSelecionada]);

  useEffect(() => {
    if (!isModoConcessionaria || !user?.concessionaria_id) return;
    const carregarConcessionaria = async () => {
      try {
        const c = await db.getConcessionariaById(user.concessionaria_id);
        setConcessionariaInfo(c);
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
    if (user?.tipo !== 'vendedor_exterior') {
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

  // Carregar proposta para edição (se houver propostaId na URL)
  React.useEffect(() => {
    const carregarPropostaParaEdicao = async () => {
      if (!propostaId) {
        // Modo criação: limpar dados
        setClienteData({});
        setCaminhaoData({});
        localStorage.removeItem('novoPedido_clienteData');
        localStorage.removeItem('novoPedido_caminhaoData');
        setIsEdicao(false);
        return;
      }

      try {
        console.log('📝 Carregando proposta para edição:', propostaId);
        const proposta = await db.getPropostaById(propostaId);
        
        if (!proposta) {
          alert('Proposta não encontrada!');
          navigate('/propostas');
          return;
        }

        console.log('✅ Proposta carregada:', proposta);
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

        // Carregar dados do caminhão
        if (dados.caminhaoData) {
          setCaminhaoData(dados.caminhaoData);
        }

        // Carregar dados de pagamento
        if (dados.pagamentoData) {
          setPagamentoData(dados.pagamentoData);
        }

        // Definir step para o último (Finalizar) para permitir edição completa
        setCurrentStep(5);
        setMaxStepReached(5);

        console.log('✅ Dados carregados com sucesso para edição');
        console.log('📊 Carrinho:', dados.carrinho?.length || 0, 'itens');
        console.log('👤 Cliente:', dados.clienteData?.nome || 'N/A');
        console.log('🚛 Caminhão:', dados.caminhaoData?.marca || 'N/A', dados.caminhaoData?.modelo || 'N/A');
        console.log('💰 Pagamento:', dados.pagamentoData?.tipoPagamento || 'N/A');
        console.log('🎯 Step definido para: 5 (Finalizar)');
      } catch (error) {
        console.error('❌ Erro ao carregar proposta:', error);
        alert('Erro ao carregar proposta para edição');
        navigate('/propostas');
      }
    };

    carregarPropostaParaEdicao();
  }, [propostaId]);

  // Salvar dados no localStorage sempre que mudarem (exceto clienteData)

  // Removido: não salvar dados do caminhão no localStorage

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
      medida_a: caminhaoData.medidaA || null,
      medida_b: caminhaoData.medidaB || null,
      medida_c: caminhaoData.medidaC || null,
      medida_d: caminhaoData.medidaD || null,
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

  // ✅ NOVO: Determinar IE baseado na região selecionada (não em user.regiao)
  const determinarClienteTemIE = () => {
    // Se a região selecionada é RS, usa clienteTemIE; senão sempre true
    if (currentStep >= 2 && (regiaoClienteSelecionada?.toLowerCase().includes('rs') || regiaoClienteSelecionada === 'rio grande do sul') && pagamentoData.tipoPagamento === 'cliente') {
      return !!clienteTemIE;
    }
    return true;
  };

  // ← NOVO: Função para recalcular preços quando o contexto muda
  const recalcularPrecosCarrinho = async () => {
    // ✅ NOVO: Usar APENAS regioes_operacao 
    const regioes = user?.regioes_operacao || [];
    
    // ✅ NOVO: Não recalcular se região não foi selecionada
    if (carrinho.length === 0 || (!regiaoClienteSelecionada) || (!isConcessionariaUser && (regioes.length === 0))) {
      console.log('⚠️ [recalcularPrecosCarrinho] Condições não atendidas:', {
        carrinhoLength: carrinho.length,
        regioesOperacao: regioes.length,
        regiaoSelecionada: regiaoClienteSelecionada || '(vazia)'
      });
      return;
    }

    console.log('🔄 [recalcularPrecosCarrinho] INICIANDO recálculo...');
    console.log('📊 [recalcularPrecosCarrinho] Carrinho antes:', carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco })));

    const temIE = determinarClienteTemIE();
    // ✅ NOVO: Usar regiaoClienteSelecionada
    const regiaoVendedor = normalizarRegiao(regiaoClienteSelecionada, temIE);

    console.log(`🌍 [recalcularPrecosCarrinho] Contexto - Cliente tem IE: ${temIE}, Região selecionada: ${regiaoClienteSelecionada}`);
    console.log(`📍 [recalcularPrecosCarrinho] Regiões de operação disponíveis: ${regioes.join(', ')}`);
    console.log(`🔑 [recalcularPrecosCarrinho] Região normalizada para busca: ${regiaoVendedor}`);

    // ← NOVO: Testar preços de todas as regiões para comparação (se região selecionada é RS)
    if (regiaoClienteSelecionada?.toLowerCase().includes('rs') || regiaoClienteSelecionada === 'rio grande do sul') {
      console.log('🔍 [recalcularPrecosCarrinho] Verificando preços em diferentes regiões RS:');
      for (const item of carrinho.filter(i => i.tipo === 'guindaste').slice(0, 1)) {
        try {
          const precoComIE = await db.getPrecoPorRegiao(item.id, 'rs-com-ie');
          const precoSemIE = await db.getPrecoPorRegiao(item.id, 'rs-sem-ie');
          console.log(`  ${item.nome}: rs-com-ie = R$ ${precoComIE}, rs-sem-ie = R$ ${precoSemIE}`);
        } catch (error) {
          console.error(`  Erro ao verificar preços para ${item.nome}:`, error);
        }
      }
    }

    const carrinhoAtualizado = [];

    for (const item of carrinho) {
      if (item.tipo === 'guindaste') {
        try {
          let novoPreco = 0;
          if (isModoConcessionaria) {
            console.log(`💰 [recalcularPrecosCarrinho] (COMPRA CONCESSIONÁRIA) Buscando preço por região para ${item.nome} (ID: ${item.id})`);
            novoPreco = await db.getPrecoCompraPorRegiao(item.id, regiaoVendedor);
          } else {
            console.log(`💰 [recalcularPrecosCarrinho] Buscando preço para ${item.nome} (ID: ${item.id}) na região ${regiaoVendedor}`);
            novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);
          }

          console.log(`✅ [recalcularPrecosCarrinho] ${item.nome}: R$ ${item.preco} → R$ ${novoPreco} (${isConcessionariaUser ? 'concessionaria' : regiaoVendedor})`);

          if (novoPreco !== item.preco) {
            console.log(`🔄 [recalcularPrecosCarrinho] PREÇO MUDOU para ${item.nome}!`);
          } else {
            console.log(`➡️ [recalcularPrecosCarrinho] PREÇO MANTIDO para ${item.nome}`);
          }

          carrinhoAtualizado.push({
            ...item,
            preco: novoPreco || item.preco || 0
          });
        } catch (error) {
          console.error(`❌ [recalcularPrecosCarrinho] Erro ao recalcular preço para ${item.nome}:`, error);
          carrinhoAtualizado.push(item);
        }
      } else {
        carrinhoAtualizado.push(item);
      }
    }

    console.log('📊 [recalcularPrecosCarrinho] Carrinho depois:', carrinhoAtualizado.map(i => ({ id: i.id, nome: i.nome, preco: i.preco })));

    // Verificar se houve mudança real nos preços antes de atualizar
    const houveAlteracao = carrinhoAtualizado.some((itemNovo, index) => {
      const itemAntigo = carrinho[index];
      return itemAntigo && itemNovo.preco !== itemAntigo.preco;
    });

    if (houveAlteracao) {
      console.log('✅ [recalcularPrecosCarrinho] Carrinho atualizado e salvo');
      setCarrinho(carrinhoAtualizado);
      localStorage.setItem('carrinho', JSON.stringify(carrinhoAtualizado));
    } else {
      console.log('➡️ [recalcularPrecosCarrinho] Nenhuma alteração de preço, carrinho mantido');
    }
  };

  // Recalcular preços quando contexto de pagamento mudar OU quando região selecionada mudar
  useEffect(() => {
    console.log('📌 [useEffect recalcularPrecosCarrinho] Disparado! Carrinho:', carrinho.length, 'Região:', regiaoClienteSelecionada);
    if (carrinho.length > 0 && regiaoClienteSelecionada) {
      console.log('✅ [useEffect recalcularPrecosCarrinho] Condições atendidas, chamando recalcularPrecosCarrinho');
      recalcularPrecosCarrinho();
    } else {
      console.log('⚠️ [useEffect recalcularPrecosCarrinho] Condições NÃO atendidas:', {
        carrinhoLength: carrinho.length,
        regiaoClienteSelecionada: regiaoClienteSelecionada || '(vazia)'
      });
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

  // ← MOVIDO: Definir funções antes dos useEffects
  // Funções do Carrinho
  const adicionarAoCarrinho = (item, tipo) => {
    const itemComTipo = { ...item, tipo };
    setCarrinho(prev => {
      let newCart;

      if (tipo === 'guindaste') {
        if (isModoConcessionaria) {
          // No modo concessionária (compra), permite múltiplos guindastes e agrega quantidade
          const idx = prev.findIndex(i => i.tipo === 'guindaste' && i.id === itemComTipo.id);
          if (idx >= 0) {
            const updated = [...prev];
            const atual = updated[idx];
            const qtdAtual = parseInt(atual.quantidade, 10) || 1;
            updated[idx] = {
              ...atual,
              quantidade: qtdAtual + 1,
            };
            newCart = updated;
          } else {
            newCart = [...prev, { ...itemComTipo, quantidade: 1 }];
          }
        } else {
          // Para guindastes, remove qualquer guindaste existente e adiciona o novo
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

      const pageSize = 200;
      const maxPages = 10;
      const all = [];

      for (let page = 1; page <= maxPages; page++) {
        const result = await db.getGuindastesLite(page, pageSize, true);
        const chunk = result?.data || [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
      }

      console.log('🔍 [NovoPedido] Guindastes carregados (paginação):', all.length);
      console.log('🔍 [NovoPedido] Primeiros 3 guindastes:', all.slice(0, 3));

      let idsVisiveis = null;
      try {
        if (!isAdminStark && user?.id) {
          idsVisiveis = await db.getGuindasteIdsVisiveisParaUser(user.id);
        }
      } catch (e) {
        console.warn('⚠️ [NovoPedido] Falha ao carregar visibilidade de protótipos:', e);
      }

      const idsSet = Array.isArray(idsVisiveis) ? new Set(idsVisiveis) : null;
      setGuindastesVisiveisParaVendedor(idsSet);

      // Filtro de estoque para vendedores de concessionária
      let idsEstoque = null;
      if (user?.tipo === 'vendedor_concessionaria' && user?.concessionaria_id) {
        try {
          const estoque = await db.getEstoqueConcessionaria(user.concessionaria_id);
          idsEstoque = new Set(
            estoque
              .filter(item => item.quantidade > 0)
              .map(item => item.guindaste_id)
          );
          console.log('📦 [NovoPedido] Guindastes em estoque:', idsEstoque.size);
        } catch (e) {
          console.warn('⚠️ [NovoPedido] Falha ao carregar estoque da concessionária:', e);
        }
      }

      const filtrados = (all || []).filter(g => {
        // Filtro de protótipos
        if (g?.is_prototipo) {
          if (!isAdminStark) {
            if (!idsSet || !idsSet.has(g.id)) return false;
          }
        }
        
        // Filtro de estoque para vendedores de concessionária
        if (user?.tipo === 'vendedor_concessionaria' && idsEstoque) {
          return idsEstoque.has(g.id);
        }
        
        return true;
      });

      setGuindastes(filtrados);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
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

  // Verificar se há um guindaste selecionado vindo da tela de detalhes
  useEffect(() => {
    const processarGuindasteSelecionado = async () => {
      if (location.state?.guindasteSelecionado) {
        const guindaste = location.state.guindasteSelecionado;
        setGuindastesSelecionados([guindaste]);

        // Buscar preço inicial baseado na região selecionada
        let precoGuindaste = guindaste.preco || 0;
        if (isModoConcessionaria) {
          if (!regiaoClienteSelecionada) {
            alert('Selecione a Região de Compra antes de escolher o equipamento.');
            return;
          }
          try {
            const regiaoParaBusca = normalizarRegiao(regiaoClienteSelecionada, true);
            console.log(`🌍 [adicionarGuindaste] (COMPRA) Buscando preço para região: ${regiaoClienteSelecionada} → ${regiaoParaBusca}`);
            precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoParaBusca);
            console.log(`💰 [adicionarGuindaste] (COMPRA) Preço encontrado: R$ ${precoGuindaste}`);
            if (!precoGuindaste || precoGuindaste === 0) {
              alert('Este equipamento não possui preço de compra definido para esta região.');
              return;
            }
          } catch (error) {
            console.error('❌ [adicionarGuindaste] Erro ao buscar preço de compra por região:', error);
            alert('Erro ao buscar preço de compra.');
            return;
          }
        } else if (isConcessionariaUser) {
          try {
            precoGuindaste = await db.getConcessionariaPreco(user?.concessionaria_id, guindaste.id);
            if (!precoGuindaste || precoGuindaste === 0) {
              alert('Este equipamento não possui preço definido para esta concessionária.');
              return;
            }
          } catch (error) {
            console.error('❌ [adicionarGuindaste] Erro ao buscar preço override da concessionária:', error);
            alert('Erro ao buscar preço da concessionária.');
            return;
          }
        } else if (regiaoClienteSelecionada) {
          try {
            const temIE = determinarClienteTemIE();
            const regiaoParaBusca = normalizarRegiao(regiaoClienteSelecionada, temIE);
            console.log(`🌍 [adicionarGuindaste] Buscando preço inicial para região: ${regiaoClienteSelecionada} → ${regiaoParaBusca}`);
            precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoParaBusca);
            console.log(`💰 [adicionarGuindaste] Preço encontrado: R$ ${precoGuindaste}`);
          } catch (error) {
            console.error('❌ [adicionarGuindaste] Erro ao buscar preço do guindaste:', error);
            precoGuindaste = guindaste.preco || 0;
          }
        } else {
          console.log('⚠️ [adicionarGuindaste] Nenhuma região selecionada, usando preço padrão');
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
          preco: precoGuindaste,
          tipo: 'guindaste'
        };

        console.log('🛒 [adicionarGuindaste] Produto adicionado ao carrinho:', {
          id: produto.id,
          nome: produto.nome,
          finame: produto.finame,
          ncm: produto.ncm
        });

        adicionarAoCarrinho(produto, 'guindaste');

        // Definir step correto
        if (location.state.step) {
          setCurrentStep(location.state.step);
        }

        // Limpar o estado da navegação
        navigate(location.pathname, { replace: true });
      }
    };

    if (user) {
      processarGuindasteSelecionado();
    }
  }, [location.state, navigate, user]);


  // Efeito para resetar pagamento quando voltar para Step 1 OU quando equipamento mudar
  useEffect(() => {
    // Reseta se voltar para Step 1
    if (currentStep === 1 && pagamentoData.tipoPagamento) {
      console.log('🔄 Voltou para Step 1, resetando dados de pagamento');
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
        { id: 1, title: 'Selecionar Guindaste', icon: '🏗️', description: 'Escolha o guindaste ideal' },
        { id: 2, title: 'Pagamento', icon: '💳', description: 'Condição de compra' },
        { id: 3, title: 'Resumo', icon: '✅', description: 'Revisar e gerar PDF' }
      ]
    : [
        { id: 1, title: 'Selecionar Guindaste', icon: '🏗️', description: 'Escolha o guindaste ideal' },
        { id: 2, title: 'Pagamento', icon: '💳', description: 'Política de pagamento' },
        { id: 3, title: 'Dados do Cliente', icon: '👤', description: 'Informações do cliente' },
        { id: 4, title: 'Estudo Veicular', icon: '🚛', description: 'Configuração do veículo' },
        { id: 5, title: 'Finalizar', icon: '✅', description: 'Revisar e confirmar' }
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
    console.log('🔍 [getModelosPorCapacidade] Buscando modelos para capacidade:', capacidade);
    console.log('🔍 [getModelosPorCapacidade] Total de guindastes:', guindastes?.length || 0);
    
    const modelos = new Map();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match && match[1] === capacidade) {
        console.log('🔍 [getModelosPorCapacidade] Encontrado modelo:', modeloBase, 'para guindaste:', guindaste.id);
        // Agrupar por modelo base (GSI 6.5, GSE 8.0C, etc.) - coluna "Modelo" da tabela
        if (!modelos.has(modeloBase)) {
          modelos.set(modeloBase, guindaste);
        }
      }
    });
    
    const resultado = Array.from(modelos.values());
    console.log('🔍 [getModelosPorCapacidade] Modelos encontrados:', resultado.length);
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
  
  console.log('🔍 [NovoPedido] Estado atual:', {
    selectedCapacidade,
    selectedModelo,
    totalGuindastes: guindastes?.length || 0,
    modelosDisponiveis: modelosDisponiveis?.length || 0,
    guindastesDisponiveis: guindastesDisponiveis?.length || 0
  });

  // ⚡ OTIMIZADO: Função para selecionar guindaste com cache
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
        if (!regiaoClienteSelecionada) {
          alert('Selecione a Região de Compra antes de escolher o equipamento.');
          setIsLoading(false);
          return;
        }

        regiaoInicial = normalizarRegiao(regiaoClienteSelecionada, true);
        precoGuindaste = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoInicial);
        logger.log(`Preço inicial (compra concessionária): R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert('Este equipamento não possui preço de compra definido para esta região.');
          setIsLoading(false);
          return;
        }
      } else {
        regiaoInicial = user?.regiao === 'rio grande do sul' ? 'rs-com-ie' : 'sul-sudeste';
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoInicial);
        logger.log(`Preço inicial: R$ ${precoGuindaste} (${regiaoInicial})`);
        if (!precoGuindaste || precoGuindaste === 0) {
          alert('Este equipamento não possui preço definido para sua região.');
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
        preco: precoGuindaste,
        tipo: 'guindaste'
      };

      // 4. Adicionar ao carrinho (isso substitui qualquer guindaste anterior)
      adicionarAoCarrinho(produto, 'guindaste');

      logger.success('Guindaste adicionado ao carrinho');

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
        console.log('🔄 Equipamento removido do carrinho:', removedItem.id);
      }

      return newCart;
    });
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
    console.log('🔄 Carrinho limpo completamente');
  };



  const getTotalCarrinho = () => {
    const total = carrinho.reduce((acc, item) => {
      const preco = parseFloat(item.preco) || 0;
      const quantidade = parseInt(item.quantidade, 10) || 1;
      return acc + (preco * quantidade);
    }, 0);
    return total;
  };




  // Renderizar conteúdo do step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <>
              {/* Seletor de região */}
              <div className="step-header">
                <h2>{isModoConcessionaria ? '📍 Região de Compra' : '📍 Região do Cliente'}</h2>
                <p>{isModoConcessionaria ? 'Selecione a região para definir a tabela de preço de compra' : 'Selecione a região para definir a tabela de preços'}</p>
              </div>

              <SeletorRegiaoCliente
                regiaoSelecionada={regiaoClienteSelecionada}
                onRegiaoChange={setRegiaoClienteSelecionada}
                regioesDisponiveis={isModoConcessionaria ? regioesCompraDisponiveis : (user?.regioes_operacao || [])}
                title={isModoConcessionaria ? 'Região de Compra' : 'Região do Cliente'}
                subtitle={isModoConcessionaria ? 'Selecione a região para aplicar a tabela de preço de compra' : 'Selecione a região onde o cliente está localizado'}
                questionLabel={isModoConcessionaria ? 'Qual a região de compra?' : 'Qual região o cliente está?'}
              />
            </>

            <div className="step-header" style={{ marginTop: '40px' }}>
              <h2>🏗️ Selecionar Guindaste</h2>
              <p>Escolha o guindaste ideal</p>
            </div>

            <GuindasteSelector
              guindastes={guindastes}
              onGuindasteSelect={handleSelecionarGuindaste}
              isLoading={isLoading}
              selectedCapacidade={selectedCapacidade}
              selectedModelo={selectedModelo}
              onCapacidadeSelect={handleSelecionarCapacidade}
              onModeloSelect={handleSelecionarModelo}
            />
          </div>
        );

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
            />
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            {isModoConcessionaria ? (
              <div className="step-content">
                <div className="step-header">
                  <h2>Resumo do Pedido de Compra</h2>
                  <p>Revise e gere o PDF</p>
                </div>
                <ResumoPedido 
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
                  regiaoCompraSelecionada={regiaoClienteSelecionada}
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
                    <h2>👤 Dados do Cliente</h2>
                    <p>Preencha as informações do cliente para finalizar o orçamento</p>
                  </div>
                </div>
                
                <div className="client-form-container">
                  <ClienteForm formData={clienteData} setFormData={setClienteData} errors={validationErrors} />
                  
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
            <div className="step-header-with-nav">
              <button 
                className="btn-back"
                onClick={handlePrevious}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                Voltar aos Dados do Cliente
              </button>
              
              <div className="step-header">
                <h2>🚛 Estudo Veicular</h2>
                <p>Informações do veículo para o serviço de guindaste</p>
              </div>
            </div>
            
            <div className="vehicle-form-container">
              {/* Banner informativo sobre Proposta Rápida */}
              <div style={{
                background: 'linear-gradient(135deg, #fff9e6, #fff3cd)',
                border: '2px solid #ffc107',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <div>
                  <strong style={{ color: '#856404', display: 'block', marginBottom: '4px' }}>
                    Precisa de uma proposta rápida?
                  </strong>
                  <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                    Clique em "Gerar Proposta Rápida" para criar um orçamento preliminar. 
                    Os dados do veículo serão marcados como "PREENCHER" e você poderá completá-los depois.
                  </p>
                </div>
              </div>

              <CaminhaoForm formData={caminhaoData} setFormData={setCaminhaoData} errors={validationErrors} />
              
              <div className="form-actions">
                <button 
                  className="btn-back-secondary"
                  onClick={handlePrevious}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                  Voltar
                </button>
                
                <button 
                  style={{
                    background: 'linear-gradient(135deg, #ffc107, #ff9800)',
                    color: '#000',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                  }}
                  onClick={() => {
                    console.log('⚡ Gerando Proposta Rápida...');
                    // Preencher com dados placeholder
                    setCaminhaoData({
                      tipo: 'PREENCHER',
                      marca: 'PREENCHER',
                      modelo: 'PREENCHER',
                      ano: '',
                      voltagem: 'PREENCHER',
                      observacoes: '⚠️ PROPOSTA PRELIMINAR - Dados do veículo a confirmar com o cliente'
                    });
                    // Avançar para próxima etapa
                    setTimeout(() => {
                      handleNext();
                    }, 300);
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 193, 7, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3)';
                  }}
                >
                  <span>⚡</span>
                  <span>Gerar Proposta Rápida</span>
                </button>
                
                <button 
                  className="btn-continue"
                  onClick={handleNext}
                  disabled={!canGoNext()}
                >
                  <span>Finalizar Orçamento</span>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Resumo da Proposta</h2>
              <p>Revise e confirme as informações</p>
            </div>
            <ResumoPedido 
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
    
    console.log('🔎 validateStep chamado para step:', step);
    
    if (isModoConcessionaria) {
      if (step === 1) {
        if (!regiaoClienteSelecionada) errors.regiao = 'Selecione a região de compra';
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
        console.log('🔎 Validando case 2...');
        console.log('  tipoPagamento:', pagamentoData.tipoPagamento, '| vazio?', !pagamentoData.tipoPagamento);
        if (!pagamentoData.tipoPagamento) {
          console.log('  ❌ Erro: tipoPagamento vazio');
          errors.tipoPagamento = 'Selecione o tipo de pagamento';
        }
        
        // Prazo de pagamento NÃO é obrigatório se houver financiamento bancário
        console.log('  prazoPagamento:', pagamentoData.prazoPagamento, '| financiamento:', pagamentoData.financiamentoBancario);
        if (!pagamentoData.prazoPagamento && pagamentoData.financiamentoBancario !== 'sim') {
          console.log('  ❌ Erro: prazoPagamento vazio (sem financiamento)');
          errors.prazoPagamento = 'Selecione o prazo de pagamento';
        }
        
        // Local de instalação e tipo de instalação são obrigatórios apenas para cliente
        console.log('  É cliente?', pagamentoData.tipoPagamento === 'cliente');
        if (pagamentoData.tipoPagamento === 'cliente') {
          console.log('  localInstalacao:', pagamentoData.localInstalacao, '| vazio?', !pagamentoData.localInstalacao);
          if (!pagamentoData.localInstalacao) {
            console.log('  ❌ Erro: localInstalacao vazio');
            errors.localInstalacao = 'Informe o local de instalação';
          }
          console.log('  tipoInstalacao:', pagamentoData.tipoInstalacao, '| vazio?', !pagamentoData.tipoInstalacao);
          if (!pagamentoData.tipoInstalacao) {
            console.log('  ❌ Erro: tipoInstalacao vazio');
            errors.tipoInstalacao = 'Selecione o tipo de instalação';
          }
          // Participação de revenda é obrigatória para cliente
          console.log('  participacaoRevenda:', pagamentoData.participacaoRevenda, '| vazio?', !pagamentoData.participacaoRevenda);
          if (!pagamentoData.participacaoRevenda) {
            console.log('  ❌ Erro: participacaoRevenda vazio');
            errors.participacaoRevenda = 'Selecione se há participação de revenda';
          }
          // Se respondeu participação, IE/Tipo é obrigatório
          console.log('  revendaTemIE:', pagamentoData.revendaTemIE, '| vazio?', !pagamentoData.revendaTemIE);
          if (pagamentoData.participacaoRevenda && !pagamentoData.revendaTemIE) {
            console.log('  ❌ Erro: revendaTemIE vazio');
            errors.revendaTemIE = 'Selecione o tipo de cliente/revenda';
          }
        }
        
        console.log('  tipoFrete:', pagamentoData.tipoFrete, '| vazio?', !pagamentoData.tipoFrete);
        if (!pagamentoData.tipoFrete) {
          console.log('  ❌ Erro: tipoFrete vazio');
          errors.tipoFrete = 'Selecione o tipo de frete';
        }
        break;
      case 3:
        if (!clienteData.nome) errors.nome = 'Nome é obrigatório';
        if (!clienteData.telefone) errors.telefone = 'Telefone é obrigatório';
        // Email não é mais obrigatório
        if (!clienteData.documento) errors.documento = 'CNPJ ou CPF é obrigatório';
        // Inscrição Estadual só é obrigatória se não for marcado como "ISENTO"
        if (!clienteData.inscricao_estadual || (clienteData.inscricao_estadual !== 'ISENTO' && clienteData.inscricao_estadual.trim() === '')) {
          errors.inscricao_estadual = 'Inscrição Estadual é obrigatória';
        }
        if (!clienteData.endereco) errors.endereco = 'Endereço é obrigatório';
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
    
    console.log('🔎 Total de erros encontrados:', Object.keys(errors).length);
    console.log('🔎 Erros:', errors);
    
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
          return true; // Step 3 é o resumo, sempre pode finalizar
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
        return clienteData.nome && 
               clienteData.telefone && 
               clienteData.email && 
               clienteData.documento && 
               clienteData.inscricao_estadual && // Pode ser "ISENTO" ou um número
               clienteData.endereco;
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
    console.log('🚀🚀🚀 VERSÃO NOVA DO CÓDIGO - handleNext chamado 🚀🚀🚀');
    console.log('📍 currentStep:', currentStep);
    console.log('📊 pagamentoData:', JSON.stringify(pagamentoData, null, 2));
    
    // Adicionar log detalhado ANTES da validação
    if (currentStep === 2) {
      console.log('🔍 Validando Step 2:');
      console.log('  - tipoPagamento:', pagamentoData.tipoPagamento);
      console.log('  - prazoPagamento:', pagamentoData.prazoPagamento);
      console.log('  - financiamentoBancario:', pagamentoData.financiamentoBancario);
      console.log('  - localInstalacao:', pagamentoData.localInstalacao);
      console.log('  - tipoInstalacao:', pagamentoData.tipoInstalacao);
      console.log('  - participacaoRevenda:', pagamentoData.participacaoRevenda);
      console.log('  - revendaTemIE:', pagamentoData.revendaTemIE);
      console.log('  - tipoFrete:', pagamentoData.tipoFrete);
    }
    
    const isValid = validateStep(currentStep);
    console.log('✅ Validação passou?', isValid);
    console.log('❌ Erros de validação (estado antigo):', JSON.stringify(validationErrors, null, 2));
    console.log('⚠️ ATENÇÃO: Os erros reais foram logados dentro do validateStep acima ☝️');
    
    const totalSteps = steps.length;
    if (isValid && currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      console.log('➡️ Avançando para step:', nextStep);
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      setValidationErrors({}); // Limpar erros ao avançar
    } else {
      console.warn('⚠️ Não pode avançar. isValid:', isValid, 'currentStep:', currentStep);
      console.warn('📋 Campos obrigatórios faltando:', Object.keys(validationErrors));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // O reset do pagamentoData é feito pelo useEffect que monitora currentStep
    }
  };

  const handleStepClick = (stepId) => {
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
                  console.log('🔍 === DEBUG COMPLETO DE PREÇOS ===');
                  console.log('👤 Usuário:', user?.nome, 'Região:', user?.regiao);

                  // Verificar preços de todas as regiões para os primeiros equipamentos
                  const regioesParaTestar = ['rs-com-ie', 'rs-sem-ie', 'sul-sudeste'];
                  const equipamentosParaTestar = guindastes.slice(0, 3);

                  for (const equipamento of equipamentosParaTestar) {
                    console.log(`\n🏗️ ${equipamento.subgrupo} (ID: ${equipamento.id}):`);

                    for (const regiao of regioesParaTestar) {
                      try {
                        const preco = await db.getPrecoPorRegiao(equipamento.id, regiao);
                        console.log(`  ${regiao}: R$ ${preco}`);
                      } catch (error) {
                        console.error(`  ❌ Erro em ${regiao}:`, error.message);
                      }
                    }
                  }

                  // Testar lógica atual
                  const temIE = determinarClienteTemIE();
                  const regiaoAtual = normalizarRegiao(regiaoClienteSelecionada || 'sul-sudeste', temIE);
                  console.log(`\n🎯 Lógica atual:`);
                  console.log(`  Cliente tem IE: ${temIE}`);
                  console.log(`  Região selecionada: ${regiaoAtual}`);
                  console.log(`  Carrinho atual:`, carrinho.map(i => ({ nome: i.nome, preco: i.preco })));
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
                  console.log('🧪 === TESTE DE CONTEXTO ===');
                  console.log('📊 Estado atual do pagamentoData:', pagamentoData);
                  console.log('🎯 Testando determinarClienteTemIE():', determinarClienteTemIE());

                  // Simular mudança de contexto
                  setPagamentoData({
                    ...pagamentoData,
                    tipoPagamento: 'cliente',
                    participacaoRevenda: 'sim',
                    revendaTemIE: 'nao'
                  });
                  console.log('✅ Simulado contexto: cliente + CNPJ/CPF');
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
    configuracoes.push({ icon: '🕹️', text: 'CR - Controle Remoto' });
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push({ icon: '⚙️', text: 'EH - Extensiva Hidráulica' });
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push({ icon: '⊓', text: 'ECS - Extensiva Cilindro Superior' });
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push({ icon: '🔨', text: 'P - Preparação p/ Perfuratriz' });
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push({ icon: '🦾', text: 'GR - Preparação p/ Garra e Rotator' });
  }
  if (subgrupo.includes('Caminhão 3/4')) {
    configuracoes.push({ icon: '🚛', text: 'Caminhão 3/4' });
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
          <div className="guindaste-image">
            {guindaste.imagem_url ? (
              <img
                src={guindaste.imagem_url}
                alt={guindaste.subgrupo}
                className="guindaste-thumbnail"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="guindaste-icon" style={{ display: guindaste.imagem_url ? 'none' : 'flex' }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
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
              <span className="spec-label">Configuração de Lanças</span>
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
const ClienteForm = ({ formData, setFormData, errors = {} }) => {
  const onlyDigits = (value) => (value || '').replace(/\D/g, '');
  const maskCEP = (value) => {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };
  const maskPhone = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    const ddd = digits.slice(0, 2);
    const isMobile = digits.length > 10; // 11 dígitos
    const partA = isMobile ? digits.slice(2, 7) : digits.slice(2, 6);
    const partB = isMobile ? digits.slice(7, 11) : digits.slice(6, 10);
    let out = '';
    if (ddd) out += `(${ddd}`;
    if (ddd.length === 2) out += ') ';
    out += partA;
    if (partB) out += `-${partB}`;
    return out;
  };
  const composeEndereco = (data) => {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(`, ${data.numero}`);
    if (data.bairro) parts.push(` - ${data.bairro}`);
    if (data.cidade || data.uf) parts.push(` - ${data.cidade || ''}${data.uf ? (data.cidade ? '/' : '') + data.uf : ''}`);
    if (data.cep) parts.push(` - CEP: ${data.cep}`);
    return parts.join('');
  };
  const [cidadesUF, setCidadesUF] = React.useState([]);
  const [loadingCidades, setLoadingCidades] = React.useState(false);
  const [manualEndereco, setManualEndereco] = React.useState(false);
  const [isentoIE, setIsentoIE] = React.useState(false);
  const [semEmail, setSemEmail] = React.useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => {
      let maskedValue = value;
      // Campos numéricos: aceitar apenas dígitos
      if (field === 'telefone') maskedValue = maskPhone(value.replace(/\D/g, ''));
      else if (field === 'cep') maskedValue = maskCEP(value.replace(/\D/g, ''));
      else if (field === 'documento') {
        // CPF/CNPJ: aceitar apenas números
        const digits = value.replace(/\D/g, '');
        maskedValue = digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
      }
      else if (field === 'inscricao_estadual' && value !== 'ISENTO') {
        // IE: aceitar apenas números (exceto quando é ISENTO)
        maskedValue = value.replace(/\D/g, '');
      }
      else {
        maskedValue = value;
      }
      const next = { ...prev, [field]: maskedValue };
      // Consistência: ao mudar UF/Cidade manualmente, limpar CEP; ao mudar UF, limpar Cidade
      if (field === 'uf') {
        next.cidade = '';
        if (!manualEndereco && next.cep) next.cep = '';
      }
      if (field === 'cidade') {
        if (!manualEndereco && next.cep) next.cep = '';
      }
      // Se o campo alterado é parte do endereço detalhado, atualizar 'endereco' composto
      if ([
        'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep'
      ].includes(field)) {
        next.endereco = composeEndereco(next);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (manualEndereco) return; // não sobrescrever quando edição manual estiver ativa
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
      <div className="form-section">
        <div className="section-header">
          <h3>📋 Informações Pessoais</h3>
          <p>Dados básicos do cliente</p>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>
              <span className="label-icon">👤</span>
              Nome Completo *
            </label>
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
            <label>
              <span className="label-icon">📞</span>
              Telefone *
            </label>
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
            <label>
              <span className="label-icon">📧</span>
              Email
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
                style={{ width: 'auto', margin: '0' }}
              />
              <label htmlFor="semEmail" style={{ margin: '0', fontWeight: 'normal' }}>
                Não possui e-mail
              </label>
            </div>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder={semEmail ? "naopossui@gmail.com" : "email@exemplo.com"}
              className={errors.email ? 'error' : ''}
              disabled={semEmail}
              style={semEmail ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <label>
              <span className="label-icon">🆔</span>
              CNPJ ou CPF *
            </label>
            <input
              type="text"
              value={formData.documento || ''}
              onChange={(e) => handleChange('documento', e.target.value)}
              placeholder="000.000.000-00"
              className={errors.documento ? 'error' : ''}
            />
            {errors.documento && <span className="error-message">{errors.documento}</span>}
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">🏢</span>
              Inscrição Estadual {!isentoIE && '*'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
                style={{ width: 'auto', margin: '0' }}
              />
              <label htmlFor="isentoIE" style={{ margin: '0', fontWeight: 'normal' }}>
                Isento de Inscrição Estadual
              </label>
            </div>
            <input
              type="text"
              value={formData.inscricao_estadual || ''}
              onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
              placeholder={isentoIE ? "ISENTO" : "00000000000000"}
              className={errors.inscricao_estadual ? 'error' : ''}
              disabled={isentoIE}
              style={isentoIE ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
            />
            {errors.inscricao_estadual && <span className="error-message">{errors.inscricao_estadual}</span>}
          </div>
        </div>
      </div>
      
      {/* Endereço */}
      <div className="form-section">
        <div className="section-header">
          <h3>📍 Endereço</h3>
          <p>Localização do cliente</p>
        </div>
        
        {/* Endereço - fluxo em cascata: CEP → UF → Cidade → Rua/Número/Bairro */}
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
                  style={{ marginTop: '6px' }}
                >
                  Editar manualmente UF/Cidade
                </button>
              )}
              {onlyDigits(formData.cep || '').length === 8 && manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(false)}
                  style={{ marginTop: '6px' }}
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
                {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <select
                value={formData.cidade || ''}
                onChange={(e) => handleChange('cidade', e.target.value)}
                disabled={!formData.uf || loadingCidades || (onlyDigits(formData.cep || '').length === 8 && !manualEndereco)}
              >
                <option value="">{loadingCidades ? 'Carregando...' : (formData.uf ? 'Selecione a cidade' : 'Selecione UF primeiro')}</option>
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
          {/* Campo composto (somente leitura) */}
          <input
            type="text"
            value={formData.endereco || ''}
            readOnly
            placeholder="Endereço completo (gerado automaticamente)"
            className={errors.endereco ? 'error' : ''}
            style={{ marginTop: '8px' }}
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
        
        <div className="form-group">
          <label>
            <span className="label-icon">📝</span>
            Observações
          </label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais..."
            rows="3"
          />
        </div>
      </div>
    </div>
  );
};

// Componente Form do Caminhão
const CaminhaoForm = ({ formData, setFormData, errors = {} }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
  
  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

  return (
    <div className="vehicle-form">
      {/* Informações do Veículo */}
      <div className="form-section">
        <div className="section-header">
          <h3>🚛 Informações do Veículo</h3>
          <p>Dados técnicos do caminhão para instalação</p>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>
              <span className="label-icon">🚚</span>
              Tipo *
            </label>
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
            <label>
              <span className="label-icon">🏭</span>
              Marca *
            </label>
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
            <label>
              <span className="label-icon">🚗</span>
              Modelo *
            </label>
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
            <label>
              <span className="label-icon">📅</span>
              Ano
            </label>
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
            <label>
              <span className="label-icon">⚡</span>
              Voltagem *
            </label>
            <select
              value={formData.voltagem || ''}
              onChange={(e) => handleChange('voltagem', e.target.value)}
              className={errors.voltagem ? 'error' : ''}
            >
              <option value="">Selecione a voltagem</option>
              <option value="12V">12V</option>
              <option value="24V">24V</option>
            </select>
            {errors.voltagem && <span className="error-message">{errors.voltagem}</span>}
          </div>
          
          <div className="form-group full-width">
            <label>
              <span className="label-icon">📝</span>
              Observações
            </label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o caminhão..."
              rows="3"
            />
          </div>
        </div>
      </div>

      {/* Seção de Medidas */}
      <div className="form-section">
        <div className="section-header">
          <h3>📐 Estudo Veicular - Medidas</h3>
          <p>Medidas técnicas para instalação do guindaste</p>
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
              <p className="estudo-veicular-instructions">
                Preencha as medidas conforme indicado na imagem, Caminhão 1 Guindaste GSI Interno, caminhão 2 GUindaste GSE Externo:
              </p>
              
              <div className="estudo-veicular-grid">
                <div className="form-group">
                  <label>Medida A "CHASSI AO ASSOALHO" (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 63cm"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida B "CHASSI" (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 70cm"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida C "SOLO AO CHASSI" (cm)</label>
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
                
                <div className="form-group">
                  <label>Medida D QUANDO GSE "DIST ENTRE EIXOS" (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 30cm"
                  />
                </div>
              </div>
              
              {/* Patolamento Calculado Automaticamente */}
              {formData.patolamento && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  background: 'linear-gradient(135deg, #c9ccddff 0%, #caa72aff 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: 'white'
                  }}>
                    <span style={{ fontSize: '24px' }}>🔧</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        Patolamento Calculado Automaticamente:
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        letterSpacing: '1px'
                      }}>
                        {formData.patolamento}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        opacity: '0.9',
                        marginTop: '4px'
                      }}>
                        {parseFloat(formData.medidaC) >= 70 && 'Medida C ≥ 70cm'}
                        {parseFloat(formData.medidaC) >= 60 && parseFloat(formData.medidaC) < 70 && 'Medida C entre 60-69cm'}
                        {parseFloat(formData.medidaC) < 60 && 'Medida C < 60cm'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

// Componente Resumo do Pedido
const ResumoPedido = ({ carrinho, clienteData, caminhaoData, pagamentoData, user, guindastes, isEdicao, propostaOriginal, propostaId, isConcessionariaCompra = false, regiaoCompraSelecionada = '' }) => {
  // Log para depuração dos dados do equipamento
  useEffect(() => {
    if (carrinho && carrinho.length > 0) {
      console.log('📦 Dados do equipamento no ResumoPedido:', {
        modelo: carrinho[0]?.modelo,
        finame: carrinho[0]?.finame,
        ncm: carrinho[0]?.ncm,
        codigo_referencia: carrinho[0]?.codigo_referencia,
        configuracao: carrinho[0]?.configuracao,
        tem_contr: carrinho[0]?.tem_contr
      });
    }
  }, [carrinho]);
  const [pedidoSalvoId, setPedidoSalvoId] = React.useState(null);

  const filterCaminhaoDataForDB = (data) => {
    return {
      tipo: data.tipo,
      marca: data.marca,
      modelo: data.modelo,
      ano: data.ano || null,
      voltagem: data.voltagem,
      observacoes: data.observacoes || null
    };
  };

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
      const camposClienteOK = Boolean(clienteData?.nome && clienteData?.telefone && clienteData?.email && clienteData?.documento && clienteData?.inscricao_estadual && clienteData?.endereco);
      
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
    console.log('🆕 [VERSÃO CORRIGIDA] salvarRelatorio iniciado - 10/11/2025 21:54');
    try {
      // Verificação defensiva ULTRA ROBUSTA: garantir que isEdicao e propostaOriginal existam
      const modoEdicao = modoEdicaoCalc;
      const proposta = propostaOriginal || null;
      const propostaIdToUpdate = propostaIdCalc;
      
      console.log(`🔄 Iniciando ${modoEdicao ? 'atualização' : 'salvamento'} do relatório...`);
      console.log('📋 Dados do cliente:', clienteData);
      console.log('🚛 Dados do caminhão:', caminhaoData);
      console.log('💳 Dados de pagamento:', pagamentoData);
      console.log('🛒 Carrinho:', carrinho);
      console.log('👤 Usuário:', user);
      
      // Se for edição, fazer UPDATE direto
      if (modoEdicao && propostaIdToUpdate) {
        console.log('✏️ Modo EDIÇÃO - Atualizando proposta existente:', propostaIdToUpdate);
        
        // Buscar o ID do guindaste principal no carrinho
        const guindasteNoCarrinho = carrinho.find(item => item.tipo === 'equipamento' || item.tipo === 'guindaste');
        const guindasteId = guindasteNoCarrinho?.id || null;
        
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
          // Atualizar também campos principais se mudaram
          cliente_nome: clienteData.nome || proposta?.cliente_nome || null,
          cliente_documento: clienteData.documento || proposta?.cliente_documento || null
        };
        
        console.log('📋 Dados para atualização:', dadosAtualizados);
        const propostaAtualizada = await db.updateProposta(propostaIdToUpdate, dadosAtualizados);
        console.log('✅ Proposta atualizada com sucesso:', propostaAtualizada);
        
        return propostaAtualizada;
      }
      
      // Modo criação normal
      console.log('➕ Modo CRIAÇÃO - Criando nova proposta');

      if (isConcessionariaCompra) {
        const timestamp = Date.now().toString();
        const numeroPedido = `PC${timestamp.slice(-8)}`;

        const valorTotal = pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0);

        const pedidoDataToSave = {
          numero_proposta: numeroPedido,
          data: new Date().toISOString(),
          vendedor_id: user.id,
          vendedor_nome: user.nome || 'Não informado',
          cliente_nome: concessionariaInfo?.nome || clienteData?.nome || 'Concessionária',
          cliente_documento: concessionariaInfo?.cnpj || clienteData?.documento || null,
          valor_total: valorTotal,
          tipo: 'pedido_compra_concessionaria',
          status: 'finalizado',
          concessionaria_id: user?.concessionaria_id || null,
          dados_serializados: {
            carrinho,
            pagamentoData,
            regiaoCompraSelecionada: regiaoCompraSelecionada || null,
            concessionaria_id: user?.concessionaria_id || null,
            concessionariaInfo: concessionariaInfo || null,
          }
        };

        const pedido = await db.createpropostas(pedidoDataToSave);
        return pedido;
      }
      
      // 1. Criar cliente
      console.log('1️⃣ Criando cliente...');
      
      // Montar endereço completo a partir dos campos separados
      const enderecoCompleto = (() => {
        const c = clienteData;
        const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
        const bairro = c.bairro ? ` - ${c.bairro}` : '';
        const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
        const cep = c.cep ? ` - CEP: ${c.cep}` : '';
        return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || c.endereco || 'Não informado';
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
      
      console.log('📋 Dados do cliente para salvar:', clienteDataToSave);
      const cliente = await db.createCliente(clienteDataToSave);
      console.log('✅ Cliente criado:', cliente);
      
      // 2. Criar caminhão
      console.log('2️⃣ Criando caminhão...');
      
      // Detectar se é proposta preliminar
      const isPropostaPreliminar = caminhaoData?.tipo === 'PREENCHER' || 
                                    caminhaoData?.marca === 'PREENCHER' || 
                                    caminhaoData?.modelo === 'PREENCHER';
      
      let caminhao = null;
      
      if (isPropostaPreliminar) {
        // Para proposta preliminar: não salvar no banco, apenas usar dados em memória
        console.log('⚠️ Proposta Preliminar - Caminhão não será salvo no banco');
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
          throw new Error(`Campos obrigatórios do caminhão não preenchidos: ${camposFaltando.join(', ')}`);
        }

        const caminhaoDataToSave = {
          ...filterCaminhaoDataForDB(caminhaoData),
          cliente_id: cliente.id
        };
        
        console.log('📋 Dados do caminhão para salvar:', caminhaoDataToSave);
        
        caminhao = await db.createCaminhao(caminhaoDataToSave);
        console.log('✅ Caminhão criado:', caminhao);
      }
      
      // 3. Gerar número do pedido (máx. 10 caracteres para caber em VARCHAR(10))
      const timestamp = Date.now().toString();
      const numeroPedido = `PED${timestamp.slice(-7)}`; // Ex: PED1234567
      console.log('3️⃣ Número do pedido gerado:', numeroPedido);
      
      // 4. Criar pedido
      console.log('4️⃣ Criando pedido...');
      
      // Buscar o ID do guindaste principal no carrinho (para controle de estoque)
      const guindasteNoCarrinho = carrinho.find(item => item.tipo === 'equipamento' || item.tipo === 'guindaste');
      const guindasteId = guindasteNoCarrinho?.id || null;
      
      console.log('🔍 [DEBUG] Carrinho completo:', carrinho);
      console.log('🔍 [DEBUG] Guindaste no carrinho:', guindasteNoCarrinho);
      console.log('🔍 [DEBUG] ID do guindaste:', guindasteId);
      
      if (guindasteId) {
        console.log('📦 Guindaste encontrado no carrinho - ID:', guindasteId);
      } else {
        console.warn('⚠️ ATENÇÃO: Nenhum guindaste encontrado no carrinho!');
      }
      
      const pedidoDataToSave = {
        numero_proposta: numeroPedido,
        data: new Date().toISOString(),
        vendedor_id: user.id,
        vendedor_nome: user.nome || 'Não informado',
        cliente_nome: cliente.nome || 'Não informado',
        cliente_documento: cliente.documento || null,
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0),
        tipo: 'proposta',
        status: 'finalizado',
        concessionaria_id: user?.concessionaria_id || null,
        dados_serializados: {
          carrinho,
          clienteData: cliente,
          caminhaoData: caminhao,
          pagamentoData,
          guindasteId, // Guardar ID do guindaste nos dados serializados para controle de estoque
          concessionaria_id: user?.concessionaria_id || null
        }
      };
      console.log('📋 Dados do pedido para salvar:', pedidoDataToSave);
      
      const pedido = await db.createpropostas(pedidoDataToSave);
      console.log('✅ Pedido criado:', pedido);
      console.log('🔍 [DEBUG] estoque_descontado:', pedido.estoque_descontado);
      
      // Verificar se o estoque foi descontado
      if (pedido.estoque_descontado) {
        console.log('✅ Estoque descontado automaticamente!');
      } else {
        console.warn('⚠️ ATENÇÃO: Estoque NÃO foi descontado!');
      }
      
      // 5. Itens do pedido já estão salvos em dados_serializados
      // Não é necessário criar registros separados em propostas_itens
      console.log('5️⃣ Itens do pedido salvos em dados_serializados:', carrinho.length, 'itens');
      
      console.log('🎉 Relatório salvo com sucesso:', {
        pedidoId: pedido.id,
        numeroPedido,
        cliente: cliente.nome,
        vendedor: user.nome
      });
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

  // Buscar dados completos dos guindastes do carrinho
  const guindastesCompletos = carrinho
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
        // PRIORIZAR dados do carrinho (que já vêm completos do banco)
        descricao: item.descricao || guindasteCompleto?.descricao || '',
        nao_incluido: item.nao_incluido || guindasteCompleto?.nao_incluido || '',
        finame: item.finame || guindasteCompleto?.finame || '',
        ncm: item.ncm || guindasteCompleto?.ncm || ''
      };
    });

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'Não informado',
    vendedorTelefone: user?.telefone || '',
    guindastes: guindastesCompletos,
    isConcessionariaCompra,
    regiaoCompraSelecionada: regiaoCompraSelecionada || ''
  };

  return (
    <div className="resumo-container">
      <div className="resumo-section">
        <div className="section-header">
          <h3>🛒 Itens Selecionados</h3>
          <span className="item-count">{carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="resumo-total">
          <span>Total: {formatCurrency(carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0))}</span>
        </div>
      </div>

      {!isConcessionariaCompra && (
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
              <span className="label">CNPJ ou CPF:</span>
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
                <span className="value">{`${clienteData.cidade || '—'}/${clienteData.uf || '—'}${clienteData.cep ? ' - ' + clienteData.cep : ''}`}</span>
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
      )}

      {!isConcessionariaCompra && (
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
            
            {/* Mostrar medidas do estudo veicular se alguma foi preenchida */}
            {(caminhaoData.medidaA || caminhaoData.medidaB || caminhaoData.medidaC || caminhaoData.medidaD) && (
              <>
                <div className="data-row" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
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
      )}

      <div className="resumo-section">
        <h3>Política de Pagamento</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo de Pagamento:</span>
            <span className="value">
              {pagamentoData.tipoPagamento === 'revenda_gsi' && 'Revenda - Guindastes GSI'}
              {pagamentoData.tipoPagamento === 'cnpj_cpf_gse' && 'CNPJ - Guindastes GSE'}
              {pagamentoData.tipoPagamento === 'parcelamento_interno' && 'Parcelamento Interno - Revenda'}
              {pagamentoData.tipoPagamento === 'parcelamento_cnpj' && 'Parcelamento - CNPJ'}
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

          {(parseFloat(pagamentoData.extraValor) > 0) && (
            <div className="data-row">
              <span className="label">Extra{pagamentoData.extraDescricao ? ` (${pagamentoData.extraDescricao})` : ''}:</span>
              <span className="value">+ {formatCurrency(parseFloat(pagamentoData.extraValor) || 0)}</span>
            </div>
          )}
          <div className="data-row">
            <span className="label">Valor Final:</span>
            <span className="value" style={{ fontWeight: 'bold', color: '#007bff' }}>
              {formatCurrency(pagamentoData.valorFinal || carrinho.reduce((total, item) => total + ((parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1)), 0))}
            </span>
          </div>
          {/* Mostrar campos adicionais para cliente */}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.percentualEntrada > 0 && (
            <>
              <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
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
                  
                  {/* Exibir forma de pagamento da entrada se preenchida */}
                  {pagamentoData.formaEntrada && (
                    <div className="data-row" style={{ fontSize: '0.9em', marginLeft: '10px', marginTop: '5px', fontStyle: 'italic', color: '#555' }}>
                      <span className="label">Forma de pagamento:</span>
                      <span className="value">{pagamentoData.formaEntrada}</span>
                    </div>
                  )}
                </>
              )}
              <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #007bff' }}>
                <span className="label" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Saldo a Pagar (após entrada):</span>
                <span className="value" style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.1em' }}>
                  {formatCurrency(pagamentoData.saldoAPagar || pagamentoData.valorFinal || 0)}
                </span>
              </div>
            </>
          )}
          {/* Campos Local de Instalação e Tipo de Instalação apenas para cliente */}
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
              
              {/* Informações sobre Participação de Revenda */}
              {pagamentoData.participacaoRevenda && (
                <>
                  <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
                    <span className="label">Participação de Revenda:</span>
                    <span className="value" style={{ fontWeight: 'bold', color: pagamentoData.participacaoRevenda === 'sim' ? '#28a745' : '#dc3545' }}>
                      {pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  
                  {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
                    <>
                      <div className="data-row" style={{ fontSize: '0.95em', marginLeft: '10px' }}>
                        <span className="label">↳ Revenda possui IE:</span>
                        <span className="value" style={{ color: pagamentoData.revendaTemIE === 'sim' ? '#007bff' : '#ffc107' }}>
                          {pagamentoData.revendaTemIE === 'sim' ? 'Sim (Com IE)' : 'Não (Sem IE)'}
                        </span>
                      </div>
                      
                      {pagamentoData.revendaTemIE === 'sim' && pagamentoData.descontoRevendaIE > 0 && (
                        <div className="data-row" style={{ fontSize: '0.95em', marginLeft: '20px', color: '#28a745' }}>
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

      <div className="resumo-section">
        <h3>Ações</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <LazyPDFGenerator 
            pedidoData={pedidoData} 
            onGenerate={handlePDFGenerated}
          />
        </div>
      </div>
    </div>
  );
};

export default NovoPedido; 