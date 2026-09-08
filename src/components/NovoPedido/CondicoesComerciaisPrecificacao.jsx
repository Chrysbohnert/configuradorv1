import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listarCondicoes } from '../../api/precificacaoCondicoes';
import { getParametros } from '../../api/precificacaoParametros';
import { simular } from '../../api/precificacaoSimulador';
import { useFretes } from '../../hooks/useFretes';
import { getOccupiedAreas } from '../../api/areas';
import { formatCurrency } from '../../utils/formatters';

const normalizarLocal = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

export default function CondicoesComerciaisPrecificacao({ guindaste, uf, municipio, contribuinte, responsavelComercial, onChange }) {
  const [condicoes, setCondicoes] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [condicaoId, setCondicaoId] = useState('');
  const [parcelas, setParcelas] = useState('0');
  const [descontoPlano, setDescontoPlano] = useState('');
  const [descontoComissao, setDescontoComissao] = useState('');
  const [localInstalacao, setLocalInstalacao] = useState('');
  const [areasInstaladoras, setAreasInstaladoras] = useState([]);
  const [areasCarregadas, setAreasCarregadas] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const { fretes, dadosFreteAtual } = useFretes(localInstalacao);

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
      .map((item) => {
        const areas = areasPorInstaladora.get(String(item.id)) || [];
        const cobreMunicipio = municipioCliente && areas.some((area) => normalizarLocal(area.uf) === ufCliente && normalizarLocal(area.nome) === municipioCliente);
        const cobreUf = areas.some((area) => normalizarLocal(area.uf) === ufCliente);
        const fallbackUf = areas.length === 0 && normalizarLocal(item.uf) === ufCliente;
        return { ...item, _prioridadeCobertura: cobreMunicipio ? 0 : cobreUf ? 1 : fallbackUf ? 2 : 3 };
      })
      .filter((item) => item._prioridadeCobertura < 3)
      .sort((a, b) => a._prioridadeCobertura - b._prioridadeCobertura || String(a.cidade || '').localeCompare(String(b.cidade || '')));
  }, [areasCarregadas, areasInstaladoras, fretes, municipio, uf]);
  const frete = Number(dadosFreteAtual?.valor_reaproveitamento) || 0;
  const instalacaoValor = Number(guindaste?.valor_instalacao_incluso);

  useEffect(() => {
    if (!localInstalacao) return;
    const compativel = fretesFiltrados.some((item) => `${item.oficina || item.nome || item.instaladora || 'Instaladora'} - ${item.cidade}/${item.uf}` === localInstalacao);
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
    if ((Number(descontoPlano) || 0) > descontoPlanoMax || (Number(descontoComissao) || 0) > descontoComissaoMax) {
      setErro('Os descontos informados ultrapassam os limites da precificação.');
      return;
    }
    if (!localInstalacao || !dadosFreteAtual) {
      setErro('Selecione a instaladora para utilizar o frete por reaproveitamento de carga.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const entrada = {
        guindaste_id: guindaste.id,
        uf,
        ncm: guindaste.ncm,
        contribuinte,
        condicao_id: condicaoId,
        parcelas,
        desconto_comercial_percent: descontoPlano,
        desconto_da_comissao_percent: descontoComissao,
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
        tipoFrete: 'Reaproveitamento de carga',
        valorFrete: calculado.logistica?.frete || 0,
        localInstalacao,
        tipoEntrega: 'reaproveitamento',
        observacaoFrete: 'Frete mediante fechamento de carga',
        instalacao: 'incluso',
        tipoInstalacao: 'Incluso no pedido',
        valorInstalacao: calculado.logistica?.instalacao || 0,
      });
    } catch (error) {
      if (requestId === requestIdRef.current) setErro(error.message || 'Erro ao calcular condições comerciais.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [condicao, condicaoId, contribuinte, dadosFreteAtual, descontoComissao, descontoComissaoMax, descontoPlano, descontoPlanoMax, frete, guindaste, instalacaoValor, localInstalacao, onChange, parcelas, uf]);

  useEffect(() => {
    const timeoutId = setTimeout(calcular, 400);
    return () => {
      clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [calcular]);

  return (
    <section className="condicoes-comerciais-precificacao">
      <div className="condicoes-comerciais-heading">
        <div><h3>Condições Comerciais</h3><p>{uf ? `UF do cliente: ${uf}` : 'UF do cliente não informada — complete o cadastro'} · NCM {guindaste?.ncm || 'não informado'}</p></div>
        <span>Precificação administrativa</span>
      </div>
      <div className="condicoes-comerciais-grid">
        <label>% de entrada<select value={condicaoId} onChange={(e) => setCondicaoId(e.target.value)}>{condicoes.map((item) => <option key={item.id} value={item.id}>{item.descricao || `${item.entrada_percent}%`}</option>)}</select></label>
        <label>Parcelas<select value={parcelas} onChange={(e) => setParcelas(e.target.value)}><option value="0">À vista / faturamento</option>{Array.from({ length: 12 }, (_, i) => i + 1).map((qtd) => <option key={qtd} value={qtd}>{qtd}x</option>)}</select></label>
        <label>Desconto do plano (%)<input type="number" min="0" max={descontoPlanoMax} step="0.01" value={descontoPlano} onChange={(e) => setDescontoPlano(e.target.value)} /><small>Máximo: {descontoPlanoMax.toFixed(2)}%</small></label>
        <label>Desconto da comissão (%)<input type="number" min="0" max={descontoComissaoMax} step="0.01" value={descontoComissao} onChange={(e) => setDescontoComissao(e.target.value)} /><small>Máximo: {descontoComissaoMax.toFixed(2)}%</small></label>
        <label>Frete<input type="text" readOnly value="Reaproveitamento de carga" /><small>Frete mediante fechamento de carga</small></label>
        <label>Instaladora<select value={localInstalacao} onChange={(e) => setLocalInstalacao(e.target.value)} disabled={!areasCarregadas || fretesFiltrados.length === 0}><option value="">{!areasCarregadas ? 'Carregando cobertura...' : fretesFiltrados.length ? 'Selecione' : 'Nenhuma instaladora atende o cliente'}</option>{fretesFiltrados.map((item) => { const value = `${item.oficina || item.nome || item.instaladora || 'Instaladora'} - ${item.cidade}/${item.uf}`; return <option key={item.id} value={value}>{value}</option>; })}</select><small>{dadosFreteAtual ? `Valor cadastrado: ${formatCurrency(frete)}` : 'Selecione para carregar o valor cadastrado'}</small></label>
        <label>Instalação<input type="text" readOnly value={`Inclusa no pedido — ${Number.isFinite(instalacaoValor) ? formatCurrency(instalacaoValor) : 'valor não cadastrado'}`} /></label>
      </div>
      {erro && <div className="condicoes-comerciais-erro">{erro}</div>}
      <div className="condicoes-comerciais-status">{loading ? 'Atualizando cálculo...' : resultado ? 'Cálculo atualizado automaticamente' : 'Preencha as condições para calcular automaticamente'}</div>
      {resultado && <div className="condicoes-comerciais-resultado"><div><span>Preço final</span><strong>{formatCurrency(resultado.preco_final)}</strong></div><div><span>Entrada</span><strong>{formatCurrency(resultado.pagamento?.entrada_valor)}</strong></div><div><span>Saldo</span><strong>{formatCurrency(resultado.pagamento?.saldo_valor)}</strong></div><div><span>Frete — reaproveitamento de carga</span><strong>{formatCurrency(resultado.logistica?.frete)}</strong></div><div><span>Parcelas</span><strong>{resultado.pagamento?.parcelas?.map((item) => `${item.numero}x ${formatCurrency(item.valor)}`).join(', ')}</strong></div><div className="condicoes-comerciais-comissao"><span>Comissão comercial · {responsavelComercial || 'Responsável não informado'}</span><strong>Original {formatCurrency(resultado.comissao?.equipamento_valor)} · Desconto {formatCurrency(resultado.comissao?.cedida_valor)} · Restante {formatCurrency(resultado.comissao?.final_valor)}</strong></div></div>}
    </section>
  );
}
