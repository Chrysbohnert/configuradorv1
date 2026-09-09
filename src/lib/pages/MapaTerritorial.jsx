/**
 * MapaTerritorial.jsx — Integrated territorial module.
 *
 * Internal tabs: Mapa | Cadastros.
 * Map tab: broad map, area channels (representante/concessionaria),
 * specific selection, dynamic legend, pin toggles for clientes,
 * instaladoras and vendas (no sellers layer).
 * Cadastros tab: embedded Cadastros component.
 * Refetches map data when returning to the Map tab.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { TerritorialMap } from '../../features/mapa/TerritorialMap.jsx';
import { MapFilters, Painel } from '../../features/mapa/MapFilters.jsx';
import { MapLegend } from '../../features/mapa/MapLegend.jsx';
import { colorOf, CANAIS, UFS } from '../../features/mapa/constants.js';
import { ufOfMunicipio, money } from '../../features/mapa/utils.js';
import { useMunicipioResolver } from '../../features/mapa/hooks.js';
import { getMapData } from '../../api/territorial.js';
import Cadastros from './Cadastros.jsx';
import '../../styles/MapaTerritorial.css';

export default function MapaTerritorial() {
  const { user } = useOutletContext();

  const [activeTab, setActiveTab] = useState('mapa');
  const [mapKey, setMapKey] = useState(0);

  const [mapData, setMapData] = useState({ cadastros: [], instaladoras: [], vendas: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const [cadastroView, setCadastroView] = useState(null); // null | { mode: 'novo' | 'editar', uf, entidade? }

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await getMapData();
      setMapData(data || { cadastros: [], instaladoras: [], vendas: [] });
    } catch (err) {
      setApiError(err.message || 'Erro ao carregar dados do mapa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'mapa' && !cadastroView) loadMapData();
  }, [activeTab, mapKey, cadastroView, loadMapData]);

  const refreshMap = useCallback(() => setMapKey((k) => k + 1), []);

  const abrirCadastro = useCallback((mode, uf, entidade = null) => {
    setCadastroView({ mode, uf: uf || 'RS', entidade });
  }, []);

  const fecharCadastro = useCallback(() => {
    setCadastroView(null);
    refreshMap();
  }, [refreshMap]);

  const initialForm = useMemo(() => {
    if (!cadastroView) return null;
    if (cadastroView.mode === 'novo') return null;
    const c = cadastroView.entidade;
    if (!c) return null;
    return {
      id: c.id,
      tipo: c.tipo,
      nome: c.nome,
      documento: c.documento || '',
      contato: c.contato || '',
      email: c.email || '',
      endereco: c.endereco || '',
      uf: c.uf || cadastroView.uf,
      municipioId: c.municipioId || '',
      municipioNome: c.municipioNome || c.cidade || '',
      municipios: c.municipios || [],
      password: '',
    };
  }, [cadastroView]);

  return (
    <div className="mapa-territorial-page">
      <UnifiedHeader title="Mapa Territorial" user={user} />

      <div className="mapa-territorial-tab-bar">
        <button
          type="button"
          className={activeTab === 'mapa' && !cadastroView ? 'active' : ''}
          onClick={() => { setActiveTab('mapa'); setCadastroView(null); }}
        >
          Mapa
        </button>
        <button
          type="button"
          className={activeTab === 'cadastros' || cadastroView ? 'active' : ''}
          onClick={() => { setActiveTab('cadastros'); setCadastroView(null); }}
        >
          Cadastros
        </button>
      </div>

      {cadastroView ? (
        <Cadastros
          embedded
          onVoltar={fecharCadastro}
          initialView="form"
          initialUf={cadastroView.uf}
          initialForm={initialForm}
        />
      ) : activeTab === 'mapa' ? (
        <MapaTab
          mapData={mapData}
          loading={loading}
          apiError={apiError}
          onRetry={refreshMap}
          onAbrirCadastro={abrirCadastro}
        />
      ) : (
        <Cadastros embedded formFirst />
      )}
    </div>
  );
}

function MapaTab({ mapData, loading, apiError, onRetry, onAbrirCadastro }) {
  const [canal, setCanal] = useState('concessionaria');
  const [selecionados, setSelecionados] = useState([]);
  const [verInstaladoras, setVerInstaladoras] = useState(false);
  const [verClientes, setVerClientes] = useState(false);
  const [verVendas, setVerVendas] = useState(false);
  const [periodo, setPeriodo] = useState('todos');
  const [focusUf, setFocusUf] = useState(null);
  const [regiao, setRegiao] = useState(null);

  const cadastros = useMemo(() => mapData.cadastros || [], [mapData.cadastros]);
  const instaladoras = useMemo(() => mapData.instaladoras || [], [mapData.instaladoras]);
  const vendas = useMemo(() => mapData.vendas || [], [mapData.vendas]);

  const locais = useMemo(() => {
    const out = [];
    cadastros.forEach((c) => { if (c.cidade && c.uf) out.push(c); });
    instaladoras.forEach((i) => { if (i.cidade && i.uf) out.push(i); });
    vendas.forEach((v) => { if (v.cidade && v.uf) out.push(v); });
    return out;
  }, [cadastros, instaladoras, vendas]);

  const { resolve } = useMunicipioResolver(locais);

  const areas = useMemo(() => {
    const m = new Map();
    cadastros.forEach((c) => m.set(c.id, [...new Set(c.municipios || [])]));
    return m;
  }, [cadastros]);

  const doCanal = useMemo(
    () => cadastros.filter((c) => c.tipo === canal),
    [cadastros, canal]
  );

  const base = useMemo(
    () => (selecionados.length ? doCanal.filter((p) => selecionados.includes(p.id)) : doCanal),
    [doCanal, selecionados]
  );

  const ativos = useMemo(
    () => (regiao ? base.filter((p) => p.id === regiao.parceiroId) : base),
    [base, regiao]
  );

  const cores = useMemo(() => {
    const m = new Map();
    doCanal.forEach((p, i) => m.set(p.id, p.cor || colorOf(i)));
    return m;
  }, [doCanal]);

  const buildPaint = useMemo(
    () => (lista) => {
      const m = new Map();
      lista.forEach((p) => {
        (areas.get(p.id) || []).forEach((code) =>
          m.set(code, { color: cores.get(p.id) || colorOf(0), parceiroId: p.id, parceiroNome: p.nome })
        );
      });
      return m;
    },
    [areas, cores]
  );

  const paint = useMemo(() => buildPaint(base), [buildPaint, base]);
  const paintFoco = useMemo(() => buildPaint(ativos), [buildPaint, ativos]);
  const owners = useMemo(() => buildPaint(doCanal), [buildPaint, doCanal]);

  const parceirosVisiveis = useMemo(
    () => (focusUf
      ? doCanal.filter((p) => (areas.get(p.id) || []).some((c) => ufOfMunicipio(c) === focusUf))
      : doCanal),
    [doCanal, focusUf, areas]
  );

  const entidadesNaUf = useMemo(
    () => (focusUf
      ? doCanal.filter((p) =>
          (areas.get(p.id) || []).some((c) => ufOfMunicipio(c) === focusUf) ||
          (p.cidade && p.uf === focusUf))
      : []),
    [doCanal, focusUf, areas]
  );

  const clientesComCodigo = useMemo(
    () => cadastros
      .filter((c) => c.tipo === 'cliente')
      .map((c) => ({ ...c, codigo: resolve(c) }))
      .filter((c) => c.codigo && (focusUf ? ufOfMunicipio(c.codigo) === focusUf : true)),
    [cadastros, resolve, focusUf]
  );

  const instaladorasComCodigo = useMemo(
    () => instaladoras
      .map((i) => ({ ...i, codigo: resolve(i) || (i.municipios?.[0]) }))
      .filter((i) => i.codigo && (focusUf ? ufOfMunicipio(i.codigo) === focusUf : true)),
    [instaladoras, resolve, focusUf]
  );

  const vendasComCodigo = useMemo(
    () => vendas
      .map((v) => ({ ...v, codigo: resolve(v) }))
      .filter((v) => v.codigo && (focusUf ? ufOfMunicipio(v.codigo) === focusUf : true)),
    [vendas, resolve, focusUf]
  );

  const periodos = useMemo(
    () => [...new Set(vendas.map((v) => v.periodo))].sort().reverse(),
    [vendas]
  );

  const vendasFiltradas = useMemo(
    () => vendasComCodigo.filter((v) => periodo === 'todos' || v.periodo === periodo),
    [vendasComCodigo, periodo]
  );

  const pins = useMemo(() => {
    const out = [];
    if (verInstaladoras) {
      instaladorasComCodigo.forEach((i) =>
        out.push({
          id: i.id,
          label: i.nome,
          sub: `${i.cidade || ''}/${i.uf}`,
          municipioId: i.codigo,
          kind: 'instaladora',
        })
      );
    }
    if (verClientes) {
      clientesComCodigo.forEach((c) =>
        out.push({
          id: c.id,
          label: c.nome,
          sub: `${c.cidade || ''}/${c.uf}`,
          municipioId: c.codigo,
          kind: 'cliente',
        })
      );
    }
    if (verVendas) {
      vendasFiltradas.forEach((v) =>
        out.push({
          id: v.id,
          label: v.cliente,
          sub: `${v.cidade || ''}/${v.uf} — ${money(v.valor)} (${v.periodo})`,
          municipioId: v.codigo,
          kind: 'venda',
        })
      );
    }
    return out;
  }, [verInstaladoras, verClientes, verVendas, instaladorasComCodigo, clientesComCodigo, vendasFiltradas]);

  const extraUfs = useMemo(() => {
    const s = new Set();
    paint.forEach((_v, code) => s.add(ufOfMunicipio(code)));
    pins.forEach((p) => s.add(ufOfMunicipio(p.municipioId)));
    return [...s].filter(Boolean);
  }, [paint, pins]);

  const legenda = useMemo(
    () => ativos.filter((p) => (focusUf ? (areas.get(p.id) || []).some((c) => ufOfMunicipio(c) === focusUf) : true)),
    [ativos, focusUf, areas]
  );

  function toggleParceiro(id) {
    setRegiao(null);
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="mapa-territorial-layout">
      <section className="mapa-territorial-main">
        {apiError && (
          <div className="mapa-territorial-api-error">
            <span>{apiError}</span>
            <button type="button" onClick={onRetry}>Tentar novamente</button>
          </div>
        )}
        {loading && (
          <div className="mapa-territorial-overlay">
            <div className="mapa-territorial-overlay-content">
              <div className="map-spinner" />
              <span>Carregando dados territoriais...</span>
            </div>
          </div>
        )}
        <TerritorialMap
          focusUf={focusUf}
          onFocusUf={(uf) => {
            setFocusUf(uf);
            if (!uf) setRegiao(null);
          }}
          paint={regiao ? paintFoco : paint}
          owners={owners}
          pins={pins}
          extraUfs={extraUfs}
          onSelectRegion={(parceiroId, municipioId) => {
            setRegiao({ parceiroId, municipioId });
            const uf = ufOfMunicipio(municipioId);
            if (uf) setFocusUf(uf);
          }}
        />
      </section>

      <aside className="mapa-territorial-sidebar">
        <MapFilters
          canais={CANAIS}
          canal={canal}
          onCanal={(v) => { setCanal(v); setSelecionados([]); setRegiao(null); }}
          parceirosVisiveis={parceirosVisiveis}
          cores={cores}
          selecionados={selecionados}
          onToggleParceiro={toggleParceiro}
          onLimparSelecao={() => { setSelecionados([]); setRegiao(null); }}
          focusUf={focusUf}
          verInstaladores={verInstaladoras}
          onVerInstaladores={setVerInstaladoras}
          verClientes={verClientes}
          onVerClientes={setVerClientes}
          verVendas={verVendas}
          onVerVendas={setVerVendas}
          periodos={periodos}
          periodo={periodo}
          onPeriodo={setPeriodo}
          totalVendas={vendasFiltradas.length}
          somaVendas={vendasFiltradas.reduce((s, v) => s + v.valor, 0)}
        />

        <MapLegend
          itens={legenda}
          cores={cores}
          focusUf={focusUf}
          areaDe={(id) => {
            const list = areas.get(id) || [];
            return focusUf ? list.filter((c) => ufOfMunicipio(c) === focusUf).length : list.length;
          }}
        />

        <Painel titulo="Camadas ativas">
          <div className="mapa-layer-summary">
            {verClientes && <span className="mapa-layer-tag cliente">Clientes: {clientesComCodigo.length}</span>}
            {verInstaladoras && <span className="mapa-layer-tag instaladora">Instaladoras: {instaladorasComCodigo.length}</span>}
            {verVendas && <span className="mapa-layer-tag venda">Vendas: {vendasFiltradas.length}</span>}
            {!verClientes && !verInstaladoras && !verVendas && (
              <p className="mapa-empty-text">Nenhuma camada de pontos ativa.</p>
            )}
          </div>
        </Painel>

        {focusUf && (
          <Painel titulo={`Ações em ${focusUf}`}>
            <button
              type="button"
              className="mapa-canal-btn"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => onAbrirCadastro('novo', focusUf)}
            >
              + Novo cadastro em {focusUf}
            </button>
            {entidadesNaUf.length > 0 && (
              <>
                <p className="mapa-empty-text" style={{ marginBottom: 8 }}>
                  {entidadesNaUf.length} entidade(s) nesta UF
                </p>
                <div className="mapa-check-list">
                  {entidadesNaUf.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="mapa-link-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => onAbrirCadastro('editar', focusUf, p)}
                    >
                      <span
                        className="mapa-check-dot"
                        style={{ backgroundColor: cores.get(p.id) }}
                      />
                      <span className="mapa-check-name">{p.nome}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Painel>
        )}
      </aside>
    </div>
  );
}
