/**
 * Cadastros.jsx — Unified territorial registrations.
 *
 * Supports standalone (/cadastros) and embedded (inside Mapa Territorial tabs)
 * modes via the `embedded` prop. List-first UX: search text, type filter,
 * Novo Cadastro button. Form appears only when creating or editing.
 * Two-column form + map for representante/concessionaria; cliente has no area map.
 * No instaladora create/edit actions.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { TerritorialMap } from '../../features/mapa/TerritorialMap.jsx';
import { colorOf, TIPOS, UFS, temArea, tipoLabel } from '../../features/mapa/constants.js';
import { ufOfMunicipio, normalizeCidade } from '../../features/mapa/utils.js';
import { useMunicipioLists, useMunicipioNames } from '../../features/mapa/hooks.js';
import { getCadastros, createCadastro, updateCadastro, deleteCadastro, saveAreas } from '../../api/territorial.js';
import '../../styles/Cadastros.css';

const vazio = () => ({
  id: '',
  tipo: 'concessionaria',
  nome: '',
  documento: '',
  contato: '',
  email: '',
  endereco: '',
  uf: 'RS',
  municipioId: '',
  municipioNome: '',
  municipios: [],
  password: '',
});

export default function Cadastros({ embedded = false, onSwitchToMap }) {
  const { user } = useOutletContext();

  const [view, setView] = useState('lista'); // 'lista' | 'form'
  const [allCadastros, setAllCadastros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState(vazio());
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [geoFiltro, setGeoFiltro] = useState('');

  const [ufSel, setUfSel] = useState('RS');
  const [busca, setBusca] = useState('');
  const [munSel, setMunSel] = useState('');
  const [mapUf, setMapUf] = useState('RS');

  const { listByUf, loadList, loadingList } = useMunicipioLists();

  useEffect(() => { if (form.uf) loadList(form.uf); }, [form.uf, loadList]);
  useEffect(() => { if (ufSel) loadList(ufSel); }, [ufSel, loadList]);

  const listaBase = useMemo(
    () => listByUf[form.uf?.toUpperCase()] || [],
    [listByUf, form.uf]
  );
  const listaAtuacao = useMemo(
    () => listByUf[ufSel?.toUpperCase()] || [],
    [listByUf, ufSel]
  );

  useEffect(() => {
    if (form.municipioId || !form.municipioNome || !listaBase.length) return;
    const municipio = listaBase.find((item) => normalizeCidade(item.nome) === normalizeCidade(form.municipioNome));
    if (municipio) setForm((current) => ({ ...current, municipioId: String(municipio.id) }));
  }, [form.municipioId, form.municipioNome, listaBase]);

  const selectedUfs = useMemo(
    () => [...new Set(form.municipios.map(ufOfMunicipio).filter(Boolean))],
    [form.municipios]
  );
  const { names: selectedNames } = useMunicipioNames(selectedUfs);

  const nomesAtuacao = useMemo(() => {
    const m = new Map(selectedNames);
    listaAtuacao.forEach((x) => m.set(String(x.id), x.nome));
    listaBase.forEach((x) => m.set(String(x.id), x.nome));
    return m;
  }, [selectedNames, listaAtuacao, listaBase]);

  const opcoes = useMemo(() => {
    const q = normalizeCidade(busca.trim());
    return listaAtuacao
      .filter((m) => !form.municipios.includes(String(m.id)))
      .filter((m) => (q ? normalizeCidade(m.nome).startsWith(q) : true))
      .slice(0, 300);
  }, [listaAtuacao, busca, form.municipios]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await getCadastros();
      setAllCadastros(data || []);
    } catch (err) {
      setApiError(err.message || 'Erro ao carregar cadastros.');
      console.error('Erro ao carregar cadastros:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const registros = useMemo(() => {
    let list = filtroTipo === 'todos'
      ? allCadastros
      : allCadastros.filter((c) => c.tipo === filtroTipo);

    const q = normalizeCidade(search.trim());
    if (q) {
      list = list.filter(
        (c) =>
          normalizeCidade(c.nome).includes(q) ||
          normalizeCidade(c.documento || '').includes(q) ||
          normalizeCidade(c.cidade || '').includes(q)
      );
    }

    if (geoFiltro) {
      list = list.filter(
        (c) =>
          c.uf === geoFiltro ||
          (c.municipios || []).some((code) => ufOfMunicipio(code) === geoFiltro)
      );
    }

    return list;
  }, [allCadastros, filtroTipo, search, geoFiltro]);

  const pares = useMemo(
    () => allCadastros.filter((c) => c.tipo === form.tipo && temArea(c.tipo)),
    [allCadastros, form.tipo]
  );

  const cores = useMemo(() => {
    const m = new Map();
    pares.forEach((c, i) => m.set(c.id, c.cor || colorOf(i)));
    return m;
  }, [pares]);

  const paint = useMemo(() => {
    const m = new Map();
    pares.forEach((c) => {
      if (c.id === form.id) return;
      const color = cores.get(c.id) || colorOf(0);
      (c.municipios || []).forEach((code) =>
        m.set(code, { color, parceiroId: c.id, parceiroNome: c.nome })
      );
    });
    return m;
  }, [pares, cores, form.id]);

  const donoPorMunicipio = useMemo(() => {
    const m = new Map();
    pares.forEach((c) => {
      if (c.id === form.id) return;
      (c.municipios || []).forEach((code) => m.set(code, c));
    });
    return m;
  }, [pares, form.id]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resolverConflito(code) {
    const dono = donoPorMunicipio.get(code);
    if (!dono) return true;
    const nome = nomesAtuacao.get(code) || code;
    return window.confirm(
      `O municipio ${nome} ja pertence a ${dono.nome}.\n\nDeseja transferir para ${form.nome || 'este cadastro'}?`
    );
  }

  function alternarMunicipio(code) {
    if (form.municipios.includes(code)) {
      setForm((f) => ({ ...f, municipios: f.municipios.filter((c) => c !== code) }));
      return;
    }
    if (!resolverConflito(code)) return;
    setForm((f) => ({ ...f, municipios: [...f.municipios, code] }));
  }

  function adicionarMunicipio() {
    if (!munSel) return;
    if (form.municipios.includes(munSel)) return;
    if (!resolverConflito(munSel)) return;
    setForm((f) => ({ ...f, municipios: [...f.municipios, munSel] }));
    setMunSel('');
  }

  function novo() {
    setForm(vazio());
    setUfSel('RS');
    setMapUf('RS');
    setBusca('');
    setMunSel('');
    setView('form');
  }

  function editar(c) {
    const munId = c.municipioId || '';
    setForm({
      id: c.id,
      tipo: c.tipo,
      nome: c.nome,
      documento: c.documento || '',
      contato: c.contato || '',
      email: c.email || '',
      endereco: c.endereco || '',
      uf: c.uf || 'RS',
      municipioId: munId,
      municipioNome: c.municipioNome || c.cidade || '',
      municipios: c.municipios || [],
      password: '',
    });
    setUfSel(c.uf || 'RS');
    setMapUf(c.uf || 'RS');
    setBusca('');
    setMunSel('');
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluir(c) {
    if (!window.confirm(`Deseja realmente excluir ${c.nome}?`)) return;
    try {
      await deleteCadastro(c.tipo, c.id);
      await fetchAll();
    } catch (err) {
      alert(err.message || 'Erro ao excluir');
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      let entityId = form.id;
      const body = {
        nome: form.nome,
        documento: form.documento,
        contato: form.contato,
        email: form.email,
        endereco: form.endereco,
        cidade: form.municipioNome || '',
        uf: form.uf,
        cor: form.cor || undefined,
      };

      if (form.id) {
        await updateCadastro(form.tipo, form.id, body);
      } else {
        if (form.tipo === 'representante' && form.password) {
          body.password = form.password;
        }
        const result = await createCadastro({ tipo: form.tipo, ...body });
        entityId = result.id;
        setForm((current) => ({ ...current, id: entityId }));
      }

      if (temArea(form.tipo) && entityId) {
        const areaItems = form.municipios.map((code) => ({
          codigo_ibge: code,
          nome: nomesAtuacao.get(code) || code,
          uf: ufOfMunicipio(code),
        }));

        try {
          await saveAreas(form.tipo, entityId, areaItems, { transfer: false });
        } catch (err) {
          if (err.status === 409) {
            const shouldTransfer = window.confirm(
              `${err.message || 'Conflito de areas'}\n\nDeseja transferir os municipios conflitantes?`
            );
            if (shouldTransfer) {
              await saveAreas(form.tipo, entityId, areaItems, { transfer: true });
            } else {
              throw new Error('Transferencia cancelada. O cadastro foi mantido aberto para revisao.');
            }
          } else {
            throw err;
          }
        }
      }

      setForm(vazio());
      setView('lista');
      await fetchAll();
      if (onSwitchToMap) onSwitchToMap();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert(err.message || 'Erro ao salvar cadastro');
    } finally {
      setSaving(false);
    }
  }

  function cancelar() {
    setForm(vazio());
    setView('lista');
  }

  if (!user) return null;

  const isCreating = !form.id;
  const showPassword = isCreating && form.tipo === 'representante';
  const showAreas = temArea(form.tipo);

  if (view === 'lista') {
    return (
      <div className={`cadastros-page ${embedded ? 'cadastros-embedded' : ''}`}>
        {!embedded && (
          <UnifiedHeader
            showBackButton={false}
            showSupportButton={true}
            showUserInfo={true}
            user={user}
            title="Cadastros"
            subtitle="Painel unificado para perfis da operacao"
          />
        )}

        <div className="cadastros-container">
          <div className="cadastros-list-header">
            <h1 className="cadastros-list-title">Cadastros</h1>
            <button type="button" className="cadastros-new-btn" onClick={novo}>
              + Novo Cadastro
            </button>
          </div>

          <div className="cadastros-list-toolbar">
            <input
              type="text"
              className="cadastros-input cadastros-search"
              placeholder="Buscar por nome, documento ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="cadastros-input cadastros-tipo-filter"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos os tipos</option>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              className="cadastros-input cadastros-geo-filter"
              value={geoFiltro}
              onChange={(e) => setGeoFiltro(e.target.value)}
            >
              <option value="">Todo o Brasil</option>
              {UFS.map((u) => (
                <option key={u.sigla} value={u.sigla}>{u.sigla}</option>
              ))}
            </select>
          </div>

          {apiError && <div className="cadastros-api-error">{apiError}</div>}

          {loading ? (
            <div className="cadastros-feedback">
              <span className="cadastros-spinner" />
              <strong>Carregando...</strong>
            </div>
          ) : (
            <ul className="cadastros-record-list">
              {registros.map((c) => (
                <li key={`${c.tipo}-${c.id}`} className="cadastros-record-item">
                  <div className="cadastros-record-info">
                    <p className="cadastros-record-name">{c.nome}</p>
                    <p className="cadastros-record-meta">
                      {tipoLabel(c.tipo)} · {c.municipioNome || c.cidade || ''}/{c.uf}
                      {temArea(c.tipo) ? ` · ${(c.municipios || []).length} municipio(s)` : ''}
                    </p>
                  </div>
                  <div className="cadastros-record-actions">
                    <button onClick={() => editar(c)} className="cadastros-edit-btn">Editar</button>
                    <button onClick={() => excluir(c)} className="cadastros-delete-btn">Excluir</button>
                  </div>
                </li>
              ))}
              {!registros.length && (
                <li className="cadastros-empty-row">Nenhum cadastro encontrado.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`cadastros-page ${embedded ? 'cadastros-embedded' : ''}`}>
      {!embedded && (
        <UnifiedHeader
          showBackButton={false}
          showSupportButton={true}
          showUserInfo={true}
          user={user}
          title="Cadastros"
          subtitle="Painel unificado para perfis da operacao"
        />
      )}

      <div className="cadastros-two-col">
        <form onSubmit={salvar} className="cadastros-form-card">
          <div className="cadastros-form-header">
            <h1 className="cadastros-form-title">{form.id ? 'Editar cadastro' : 'Novo cadastro'}</h1>
            <button type="button" className="cadastros-back-btn" onClick={cancelar}>
              &larr; Voltar para lista
            </button>
          </div>

          <div className="cadastros-field">
            <span className="cadastros-label">Tipo de perfil</span>
            <select
              value={form.tipo}
              onChange={(e) => set('tipo', e.target.value)}
              className="cadastros-input"
              required
              disabled={Boolean(form.id)}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="cadastros-row">
            <div className="cadastros-field">
              <span className="cadastros-label">Nome / Razao social</span>
              <input
                className="cadastros-input"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                required
              />
            </div>
            <div className="cadastros-field">
              <span className="cadastros-label">CNPJ / CPF</span>
              <input
                className="cadastros-input"
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
              />
            </div>
          </div>

          <div className="cadastros-row">
            <div className="cadastros-field">
              <span className="cadastros-label">Contato</span>
              <input
                className="cadastros-input"
                value={form.contato}
                onChange={(e) => set('contato', e.target.value)}
              />
            </div>
            <div className="cadastros-field">
              <span className="cadastros-label">E-mail</span>
              <input
                type="email"
                className="cadastros-input"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="cadastros-field">
            <span className="cadastros-label">Endereco</span>
            <input
              className="cadastros-input"
              value={form.endereco}
              onChange={(e) => set('endereco', e.target.value)}
            />
          </div>

          {showPassword && (
            <div className="cadastros-field">
              <span className="cadastros-label">Senha (obrigatoria para novo usuario)</span>
              <input
                type="password"
                className="cadastros-input"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                minLength={6}
                required={isCreating && form.tipo === 'representante'}
              />
            </div>
          )}

          <div className="cadastros-row cadastros-row-uf">
            <div className="cadastros-field" style={{ maxWidth: 120 }}>
              <span className="cadastros-label">Estado</span>
              <select
                className="cadastros-input"
                value={form.uf}
                onChange={(e) => {
                  set('uf', e.target.value);
                  set('municipioId', '');
                  set('municipioNome', '');
                }}
              >
                {UFS.map((u) => (
                  <option key={u.sigla} value={u.sigla}>{u.sigla}</option>
                ))}
              </select>
            </div>
            <div className="cadastros-field" style={{ flex: 1 }}>
              <span className="cadastros-label">Cidade</span>
              <select
                className="cadastros-input"
                value={form.municipioId}
                onChange={(e) => {
                  const id = e.target.value;
                  set('municipioId', id);
                  const mun = listaBase.find((m) => String(m.id) === id);
                  set('municipioNome', mun?.nome || '');
                }}
                required
              >
                <option value="">{loadingList ? 'Carregando...' : 'Selecione a cidade'}</option>
                {listaBase.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {showAreas && (
            <div className="cadastros-area-box">
              <h2 className="cadastros-area-title">Municipios de atuacao</h2>

              <div className="cadastros-row cadastros-row-uf">
                <div className="cadastros-field" style={{ maxWidth: 110 }}>
                  <span className="cadastros-label">Estado</span>
                  <select
                    className="cadastros-input"
                    value={ufSel}
                    onChange={(e) => {
                      setUfSel(e.target.value);
                      setMapUf(e.target.value);
                      setMunSel('');
                      setBusca('');
                    }}
                  >
                    {UFS.map((u) => (
                      <option key={u.sigla} value={u.sigla}>{u.sigla}</option>
                    ))}
                  </select>
                </div>
                <div className="cadastros-field" style={{ flex: 1 }}>
                  <span className="cadastros-label">Buscar municipio</span>
                  <input
                    className="cadastros-input"
                    placeholder="Ex.: San..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>

              <div className="cadastros-area-add-row">
                <select
                  className="cadastros-input"
                  value={munSel}
                  onChange={(e) => setMunSel(e.target.value)}
                >
                  <option value="">{loadingList ? 'Carregando...' : `Municipios de ${ufSel}`}</option>
                  {opcoes.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.nome}</option>
                  ))}
                </select>
                <button type="button" className="cadastros-add-btn" onClick={adicionarMunicipio}>
                  Adicionar
                </button>
              </div>

              <div className="cadastros-chips">
                {form.municipios.length === 0 && (
                  <p className="mapa-empty-text">Nenhum municipio na cesta ainda.</p>
                )}
                {form.municipios.map((code) => (
                  <span key={code} className="cadastros-chip">
                    {nomesAtuacao.get(code) || code}
                    <span className="cadastros-chip-uf">{ufOfMunicipio(code)}</span>
                    <button
                      type="button"
                      aria-label="Remover"
                      onClick={() => setForm((f) => ({ ...f, municipios: f.municipios.filter((c) => c !== code) }))}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="cadastros-form-actions">
            <button type="submit" className="cadastros-submit-btn" disabled={saving}>
              {saving ? 'Salvando...' : form.id ? 'Salvar alteracoes' : 'Cadastrar'}
            </button>
            <button type="button" className="cadastros-cancel-btn" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </form>

        <div className="cadastros-right-col">
          {showAreas && (
            <section className="cadastros-map-section">
              <div className="cadastros-map-header">
                <h2 className="cadastros-map-title">
                  Selecionar municipios no mapa
                  {form.nome ? <span className="cadastros-map-nome"> · {form.nome}</span> : null}
                </h2>
                <span className="cadastros-map-count">
                  {form.municipios.length} selecionado(s) · clique para adicionar/remover
                </span>
              </div>
              <div className="cadastros-map-container">
                <TerritorialMap
                  focusUf={mapUf}
                  onFocusUf={(uf) => {
                    setMapUf(uf);
                    if (uf) setUfSel(uf);
                  }}
                  paint={paint}
                  pins={[]}
                  onSelectRegion={() => {}}
                  extraUfs={mapUf ? [mapUf] : []}
                  selectable
                  selected={form.municipios}
                  onToggleMunicipio={alternarMunicipio}
                />
              </div>
              <div className="cadastros-map-legend">
                <span className="cadastros-legend-item">
                  <span
                    className="cadastros-legend-dot"
                    style={{ backgroundColor: 'var(--erp-primary, #ffc928)' }}
                  />
                  {form.nome || 'Cadastro atual'}
                </span>
                {pares
                  .filter((c) => c.id !== form.id && (c.municipios || []).length > 0)
                  .map((c) => (
                    <span key={c.id} className="cadastros-legend-item cadastros-legend-other">
                      <span
                        className="cadastros-legend-dot"
                        style={{ backgroundColor: cores.get(c.id), opacity: 0.8 }}
                      />
                      {c.nome} ({(c.municipios || []).length})
                    </span>
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
