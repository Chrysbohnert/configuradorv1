import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listarCondicoes } from '../../api/precificacaoCondicoes';
import { getParametros } from '../../api/precificacaoParametros';
import { simular } from '../../api/precificacaoSimulador';
import { useFretes } from '../../hooks/useFretes';
import { getOccupiedAreas } from '../../api/areas';
import { formatCurrency } from '../../utils/formatters';

const normalizarLocal = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const formatarEntradaPercentual = (valor) => `${Math.round(Number(valor) || 0)}% de entrada`;

export default function CondicoesComerciaisPrecificacao({ guindaste, uf, municipio, regiao, contribuinte, responsavelComercial, onChange }) {
  const [condicoes, setCondicoes] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [condicaoId, setCondicaoId] = useState('');
  const [parcelas, setParcelas] = useState('0');
  const [descontoPlano, setDescontoPlano] = useState('');
  const [descontoComissao, setDescontoComissao] = useState('');
  const [tipoFrete, setTipoFrete] = useState('CIF');
  const [localInstalacao, setLocalInstalacao] = useState('');
  const [areasInstaladoras, setAreasInstaladoras] = useState([]);
  const [areasCarregadas, setAreasCarregadas] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const { fretes } = useFretes();

  useEffect(() => {
    Promise.all([listarCondicoes({ ativo: true }), getParametros()])
      .then(([lista, params]) => {
        setCondicoes(lista || []);
        setParametros(params || null);
        if (lista?.length) setCondicaoId(String(lista[0].id));
      })
      .catch((error) => setErro(error.message || 'Erro ao carregar condições comerciais.'));
  }, []);

  useEffect(() => {
    getOccupiedAreas('instaladora')
      .then((areas) => setAreasInstaladoras(areas || []))
      .catch(() => setAreasInstaladoras([]))
      .finally(() => setAreasCarregadas(true));
  }, []);

  const condicao = useMemo(
    () => condicoes.find((item) => String(item.id) === String(condicaoId)),
    [condicoes, condicaoId]
  );
  const descontoPlanoMax = useMemo(() => Math.max(
    0,
    (Number(parametros?.desconto_comercial_max_percent) || 0)
      - (Number(parcelas) || 0) * (Number(parametros?.passo_desconto_parcela_percent) || 0)
  ), [parametros, parcelas]);
  const descontoComissaoMax = Number(parametros?.comissao_cedivel_max_percent) || 0;
  const descontoComercialExcedido = Number(descontoPlano) > descontoPlanoMax;
  const descontoComissaoExcedido = Number(descontoComissao) > descontoComissaoMax;
  const limiteDescontoExcedido = descontoComercialExcedido || descontoComissaoExcedido;
  const fretesFiltrados = useMemo(() => {
    if (!areasCarregadas) return [];
    const ufCliente = normalizarLocal(uf);
    const municipioCliente = normalizarLocal(municipio);
    const areasPorInstaladora = new Map();
    areasInstaladoras.forEach((area) => {
      const id = String(area.entidade_id);
      if (!areasPorInstaladora.has(id)) areasPorInstaladora.set(id, []);
      areasPorInstaladora.get(id).push(area);
    });
    return fretes
      .filter((item) => (areasPorInstaladora.get(String(item.id)) || []).some((area) => (
        normalizarLocal(area.uf) === ufCliente && normalizarLocal(area.nome) === municipioCliente
      )))
      .sort((a, b) => String(a.cidade || '').localeCompare(String(b.cidade || '')));
  }, [areasCarregadas, areasInstaladoras, fretes, municipio, uf]);
  const dadosFreteAtual = useMemo(() => fretesFiltrados.find((item) => String(item.id) === localInstalacao) || null, [fretesFiltrados, localInstalacao]);
  const frete = tipoFrete === 'CIF' ? Number(dadosFreteAtual?.valor_reaproveitamento) || 0 : 0;
  const instalacaoValor = Number(guindaste?.valor_instalacao_incluso);

  useEffect(() => {
    if (tipoFrete === 'FOB' && parcelas !== '0') setParcelas('0');
  }, [parcelas, tipoFrete]);

  useEffect(() => {
    if (!localInstalacao) return;
    const compativel = fretesFiltrados.some((item) => String(item.id) === localInstalacao);
    if (!compativel) setLocalInstalacao('');
  }, [fretesFiltrados, localInstalacao]);

  useEffect(() => {
    setResultado(null);
    onChange?.(null);
  }, [guindaste?.id, onChange]);

  const calcular = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(false);
    if (!uf) {
      setErro('A UF do cliente é obrigatória. Complete o cadastro do cliente antes de calcular.');
      return;
    }
    if (!guindaste?.id || !condicao) {
      setErro('Equipamento e condição de pagamento são obrigatórios.');
      return;
    }
    if (!Number.isFinite(instalacaoValor) || instalacaoValor < 0) {
      setErro('O equipamento não possui valor padrão de instalação cadastrado. Complete o cadastro antes de calcular.');
      return;
    }
    if (limiteDescontoExcedido) {
      setResultado(null);
      onChange?.(null);
      setErro('Limite de desconto excedido');
      return;
    }
    if (!localInstalacao || (tipoFrete === 'CIF' && !dadosFreteAtual)) {
      setErro('Selecione uma instaladora que atenda ao município do cliente.');
      return;
    }
    if (tipoFrete === 'FOB' && Number(parcelas) !== 0) {
      setResultado(null);
      onChange?.(null);
      setErro('FOB para cliente final disponível somente para pagamento à vista.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const entrada = {
        guindaste_id: guindaste.id,
        uf,
        municipio,
        regiao,
        ncm: guindaste.ncm,
        contribuinte,
        condicao_id: condicaoId,
        parcelas,
        desconto_comercial_percent: descontoPlano,
        desconto_da_comissao_percent: descontoComissao,
        tipo_frete: tipoFrete,
        instaladora_id: localInstalacao,
        frete,
        instalacao: instalacaoValor,
      };
      const calculado = await simular(entrada);
      if (requestId !== requestIdRef.current) return;
      setResultado(calculado);
      onChange?.({
        precificacaoMotor: true,
        precificacaoEntrada: entrada,
        precificacaoResultado: calculado,
        valorFinal: calculado.preco_final,
        total: calculado.preco_final,
        tipoPagamento: 'precificacao',
        prazoPagamento: Number(parcelas) === 0 ? 'a_vista' : `${parcelas}x`,
        percentualEntrada: calculado.pagamento?.entrada_percent || 0,
        entradaTotal: calculado.pagamento?.entrada_valor || 0,
        saldoAPagar: calculado.pagamento?.saldo_valor || 0,
        parcelas: calculado.pagamento?.parcelas || [],
        desconto: calculado.desconto_comercial?.percentual || 0,
        descontoComissao: calculado.comissao?.cedida_percent_sobre_base || 0,
        tipoFrete,
        valorFrete: calculado.logistica?.frete || 0,
        localInstalacao: `${dadosFreteAtual.oficina || dadosFreteAtual.nome || dadosFreteAtual.instaladora || 'Instaladora'} - ${dadosFreteAtual.cidade}/${dadosFreteAtual.uf}`,
        tipoEntrega: tipoFrete === 'CIF' ? 'reaproveitamento' : 'retirada_fabrica',
        observacaoFrete: tipoFrete === 'FOB' ? 'Retirada na fábrica pelo cliente ou transportador indicado.' : '',
        composicaoPreco: tipoFrete === 'CIF' ? 'Equipamento + Instalação + Frete' : 'Equipamento + Instalação',
        instalacao: 'incluso',
        tipoInstalacao: 'Incluso no pedido',
        valorInstalacao: calculado.logistica?.instalacao || 0,
        moeda: calculado.exportacao ? 'USD' : 'BRL',
        cotacao_usd: calculado.exportacao?.cotacao_utilizada || null,
        exportacao: calculado.exportacao || null,
      });
    } catch (error) {
      if (requestId === requestIdRef.current) setErro(error.message || 'Erro ao calcular condições comerciais.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [condicao, condicaoId, contribuinte, dadosFreteAtual, descontoComissao, descontoPlano, frete, guindaste, instalacaoValor, limiteDescontoExcedido, localInstalacao, municipio, onChange, parcelas, regiao, tipoFrete, uf]);

  useEffect(() => {
    if (!limiteDescontoExcedido) return;
    setResultado(null);
    onChange?.(null);
  }, [limiteDescontoExcedido, onChange]);

  useEffect(() => {
    const timeoutId = setTimeout(calcular, 400);
    return () => {
      clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [calcular]);

  const resumoParcelas = resultado && (Number(parcelas) === 0
    ? `Saldo à vista: ${formatCurrency(resultado.pagamento?.saldo_valor)}`
    : `${resultado.pagamento?.parcelas_selecionadas || Number(parcelas)}x de ${formatCurrency(resultado.pagamento?.parcelas?.[0]?.valor)}`);

  return (
    <section className="condicoes-comerciais-precificacao">
      <div className="condicoes-comerciais-heading">
        <div><h3>Condições Comerciais</h3><p>{uf ? `UF do cliente: ${uf}` : 'UF do cliente não informada — complete o cadastro'} · NCM {guindaste?.ncm || 'não informado'}</p></div>
        <span>Precificação administrativa</span>
      </div>
      <div className="condicoes-comerciais-grid">
        <label>% de entrada<select value={condicaoId} onChange={(e) => setCondicaoId(e.target.value)}>{condicoes.map((item) => <option key={item.id} value={item.id}>{formatarEntradaPercentual(item.entrada_percent)}</option>)}</select><small>{resultado ? `Entrada: ${formatCurrency(resultado.pagamento?.entrada_valor)}` : 'Valor calculado pelo motor'}</small></label>
        <label>Parcelas<select value={parcelas} disabled={tipoFrete === 'FOB'} onChange={(e) => setParcelas(e.target.value)}><option value="0">À vista / faturamento</option>{Array.from({ length: 12 }, (_, i) => i + 1).map((qtd) => <option key={qtd} value={qtd}>{qtd}x</option>)}</select><small>{resumoParcelas || 'Valor calculado pelo motor'}</small></label>
        <label className={descontoComercialExcedido ? 'condicoes-comerciais-campo-invalido' : ''}>Desconto Comercial (%)<input type="number" min="0" max={descontoPlanoMax} step="0.01" value={descontoPlano} aria-invalid={descontoComercialExcedido} onChange={(e) => setDescontoPlano(e.target.value)} /><small>{descontoComercialExcedido ? 'Limite de desconto excedido' : `Máximo: ${descontoPlanoMax.toFixed(2)}%`}</small></label>
        <label className={descontoComissaoExcedido ? 'condicoes-comerciais-campo-invalido' : ''}>Desconto da Comissão (%)<input type="number" min="0" max={descontoComissaoMax} step="0.01" value={descontoComissao} aria-invalid={descontoComissaoExcedido} onChange={(e) => setDescontoComissao(e.target.value)} /><small>{descontoComissaoExcedido ? 'Limite de desconto excedido' : `Máximo: ${descontoComissaoMax.toFixed(2)}%`}</small></label>
        <label>Frete<select value={tipoFrete} onChange={(e) => setTipoFrete(e.target.value)}><option value="CIF">CIF</option><option value="FOB">FOB</option></select><small>{tipoFrete === 'CIF' ? (dadosFreteAtual ? `Frete calculado pelo motor: ${formatCurrency(resultado?.logistica?.frete || 0)}` : 'Selecione a instaladora') : 'Retirada na fábrica'}</small></label>
        <label>Instaladora<select value={localInstalacao} onChange={(e) => setLocalInstalacao(e.target.value)} disabled={!areasCarregadas || fretesFiltrados.length === 0}><option value="">{!areasCarregadas ? 'Carregando cobertura...' : fretesFiltrados.length ? 'Selecione' : 'Nenhuma instaladora atende o cliente'}</option>{fretesFiltrados.map((item) => <option key={item.id} value={item.id}>{item.oficina || item.nome || item.instaladora || 'Instaladora'} - {item.cidade}/{item.uf}</option>)}</select><small>Instalação inclusa automaticamente no preço</small></label>
      </div>
      {tipoFrete === 'FOB' && <div className="condicoes-comerciais-aviso">FOB para cliente final disponível somente para pagamento à vista. Retirada na fábrica pelo cliente ou transportador indicado.</div>}
      {erro && <div className="condicoes-comerciais-erro">{erro}</div>}
      <div className="condicoes-comerciais-status">{loading ? 'Atualizando cálculo...' : resultado ? 'Cálculo atualizado automaticamente' : 'Preencha as condições para calcular automaticamente'}</div>
      {resultado && <div className="condicoes-comerciais-resultado"><div><span>Preço final</span><strong>{formatCurrency(resultado.preco_final)}</strong></div><div><span>Entrada</span><strong>{formatCurrency(resultado.pagamento?.entrada_valor)}</strong></div><div><span>Saldo</span><strong>{formatCurrency(resultado.pagamento?.saldo_valor)}</strong></div><div><span>Frete — {tipoFrete}</span><strong>{formatCurrency(resultado.logistica?.frete)}</strong></div><div><span>Parcelas</span><strong>{resultado.pagamento?.parcelas?.map((item) => `${item.numero}x ${formatCurrency(item.valor)}`).join(', ')}</strong></div>{resultado.exportacao && <><div><span>Cotação original / redução</span><strong>R$ {Number(resultado.exportacao.cotacao_original).toFixed(4)} / {Number(resultado.exportacao.reducao_dolar_percent).toFixed(2)}%</strong></div><div><span>Cotação utilizada</span><strong>R$ {Number(resultado.exportacao.cotacao_utilizada).toFixed(4)}</strong></div><div><span>Margem original / aplicada</span><strong>{Number(resultado.exportacao.margem_original_percent).toFixed(2)}% / {Number(resultado.exportacao.margem_aplicada_percent).toFixed(2)}%</strong></div></>}<div className="condicoes-comerciais-comissao"><span>Comissão comercial · {responsavelComercial || 'Responsável não informado'}</span><strong>Original {formatCurrency(resultado.comissao?.equipamento_valor)} · Desconto {formatCurrency(resultado.comissao?.cedida_valor)} · Restante {formatCurrency(resultado.comissao?.final_valor)}</strong></div></div>}
    </section>
  );
}
