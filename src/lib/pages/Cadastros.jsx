import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { getClientes } from '../../api/clientes';
import { getConcessionarias } from '../../api/concessionarias';
import { getTodosFretesAdmin } from '../../api/fretes';
import { db } from '../../config/supabase';
import '../../styles/Cadastros.css';

const TypeIcon = ({ type }) => {
  const paths = {
    clientes: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    representantes: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /><path d="M16 3.5 18 2l2 2" /></>,
    concessionarias: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /><path d="M9 10h.01M15 10h.01" /></>,
    'vendedores-concessionaria': <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 21a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M17 15a5 5 0 0 1 4.5 3" /></>,
    instaladoras: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-7h6v7" /><path d="m16 4 2-2 4 4-2 2" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
};

const TYPES = [
  { id: 'clientes', label: 'Clientes', path: '/clientes', profiles: ['admin', 'admin_concessionaria'] },
  { id: 'representantes', label: 'Representantes', path: '/gerenciar-vendedores', profiles: ['admin'] },
  { id: 'concessionarias', label: 'Concessionárias', path: '/concessionarias', profiles: ['admin'] },
  { id: 'vendedores-concessionaria', label: 'Vendedores da Concessionária', path: '/gerenciar-vendedores', profiles: ['admin', 'admin_concessionaria'] },
  { id: 'instaladoras', label: 'Instaladoras', path: '/gerenciar-fretes', profiles: ['admin'] }
];

const TABS = [{ id: 'todos', label: 'Todos' }, ...TYPES.map(({ id, label }) => ({ id, label }))];

const normalizeCliente = (item) => ({
  key: `clientes-${item.id}`,
  id: item.id,
  type: 'clientes',
  typeLabel: 'Cliente',
  name: item.nome || 'Sem nome',
  city: item.cidade,
  uf: item.uf,
  contact: item.telefone || item.email,
  secondaryContact: item.telefone && item.email ? item.email : '',
  status: null,
  path: '/clientes'
});

const normalizeConcessionaria = (item) => ({
  key: `concessionarias-${item.id}`,
  id: item.id,
  type: 'concessionarias',
  typeLabel: 'Concessionária',
  name: item.nome || 'Sem nome',
  city: item.cidade,
  uf: item.uf,
  contact: item.telefone || item.email,
  secondaryContact: item.telefone && item.email ? item.email : '',
  status: item.ativo === false ? 'inativo' : 'ativo',
  path: '/concessionarias'
});

const normalizeInstaladora = (item) => ({
  key: `instaladoras-${item.id}`,
  id: item.id,
  type: 'instaladoras',
  typeLabel: 'Instaladora',
  name: item.oficina || 'Sem nome',
  city: item.cidade,
  uf: item.uf,
  contact: null,
  secondaryContact: '',
  status: null,
  path: '/gerenciar-fretes'
});

const normalizeUsuario = (item) => {
  const concessionaria = item.tipo === 'vendedor_concessionaria';
  const type = concessionaria ? 'vendedores-concessionaria' : 'representantes';
  return {
    key: `${type}-${item.id}`,
    id: item.id,
    type,
    typeLabel: concessionaria ? 'Vendedor da Concessionária' : 'Representante',
    name: item.nome || 'Sem nome',
    city: item.cidade || item.regiao,
    uf: item.uf,
    contact: item.telefone || item.email,
    secondaryContact: item.telefone && item.email ? item.email : '',
    status: null,
    path: '/gerenciar-vendedores'
  };
};

export default function Cadastros() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const availableTypes = useMemo(
    () => TYPES.filter((type) => type.profiles.includes(user?.tipo)),
    [user?.tipo]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadRecords = async () => {
      setLoading(true);
      setError('');
      try {
        const usersFilter = user.tipo === 'admin_concessionaria'
          ? { concessionaria_id: user.concessionaria_id }
          : {};
        const requests = [getClientes(), db.getUsers(usersFilter)];
        if (user.tipo === 'admin') requests.push(getConcessionarias(true), getTodosFretesAdmin());
        const [clientes, usuarios, concessionarias = [], instaladoras = []] = await Promise.all(requests);
        if (!active) return;
        const usuariosPermitidos = usuarios.filter((item) => user.tipo === 'admin_concessionaria'
          ? item.tipo === 'vendedor_concessionaria'
          : ['vendedor', 'vendedor_exterior', 'vendedor_concessionaria'].includes(item.tipo));
        setRecords([
          ...clientes.map(normalizeCliente),
          ...usuariosPermitidos.map(normalizeUsuario),
          ...concessionarias.map(normalizeConcessionaria),
          ...instaladoras.map(normalizeInstaladora)
        ]);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Não foi possível carregar os cadastros.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRecords();
    return () => { active = false; };
  }, [user]);

  const visibleTabs = TABS.filter(
    (tab) => tab.id === 'todos' || availableTypes.some((type) => type.id === tab.id)
  );

  const filteredRecords = records.filter((record) => {
    const matchesType = activeTab === 'todos' || record.type === activeTab;
    const matchesStatus = statusFilter === 'todos' || record.status === statusFilter;
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const searchable = `${record.typeLabel} ${record.name} ${record.city || ''} ${record.uf || ''} ${record.contact || ''} ${record.secondaryContact || ''}`;
    return matchesType && matchesStatus && (!term || searchable.toLocaleLowerCase('pt-BR').includes(term));
  });

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab !== 'todos' && tab !== 'concessionarias') setStatusFilter('todos');
  };

  const openCadastro = (type) => {
    setShowTypeSelector(false);
    navigate(type.path);
  };

  if (!user) return null;

  return (
    <div className="cadastros-page">
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Cadastros"
        subtitle="Central de cadastros administrativos"
      />

      <main className="cadastros-container">
        <div className="cadastros-heading">
          <div className="cadastros-heading-copy">
            <span className="cadastros-eyebrow">Gestão centralizada</span>
            <h1>Cadastros</h1>
            <p>Consulte os registros disponíveis e acesse os fluxos atuais de manutenção.</p>
          </div>
          <button className="cadastros-new-button" onClick={() => setShowTypeSelector(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            Novo Cadastro
          </button>
        </div>

        <section className="cadastros-toolbar" aria-label="Filtros de cadastros">
          <div className="cadastros-tabs" role="tablist">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => selectTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
                {tab.id === 'todos' && <span>{records.length}</span>}
              </button>
            ))}
          </div>
          <div className="cadastros-toolbar-actions">
            {(activeTab === 'todos' || activeTab === 'concessionarias') && user.tipo === 'admin' && (
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status">
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            )}
            <label className="cadastros-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar registros" />
            </label>
          </div>
        </section>

        <div className="cadastros-list-heading">
          <span>{activeTab === 'todos' ? 'Todos os cadastros' : visibleTabs.find((tab) => tab.id === activeTab)?.label}</span>
          <small>{filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}</small>
        </div>

        <section className="cadastros-table-shell" aria-live="polite">
          {loading ? (
            <div className="cadastros-feedback"><span className="cadastros-spinner" /><strong>Carregando cadastros...</strong></div>
          ) : error ? (
            <div className="cadastros-feedback cadastros-feedback--error"><strong>Não foi possível carregar os dados</strong><span>{error}</span></div>
          ) : filteredRecords.length === 0 ? (
            <div className="cadastros-feedback"><span className="cadastros-empty-icon"><TypeIcon type="clientes" /></span><strong>Nenhum cadastro encontrado</strong><span>Ajuste a busca ou os filtros selecionados.</span></div>
          ) : (
            <div className="cadastros-table-scroll">
              <table className="cadastros-table">
                <thead><tr><th>Tipo</th><th>Nome</th><th>Cidade/UF</th><th>Contato</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.key}>
                      <td><span className={`cadastro-type-badge cadastro-card--${record.type}`}><span className="cadastro-type-icon"><TypeIcon type={record.type} /></span>{record.typeLabel}</span></td>
                      <td><strong className="cadastro-record-name">{record.name}</strong></td>
                      <td>{record.city || record.uf ? <span>{record.city || '—'}{record.uf ? ` / ${record.uf}` : ''}</span> : <span className="cadastro-muted">Não informado</span>}</td>
                      <td><span className="cadastro-contact">{record.contact || 'Não informado'}{record.secondaryContact && <small>{record.secondaryContact}</small>}</span></td>
                      <td>{record.status ? <span className={`cadastro-status cadastro-status--${record.status}`}>{record.status === 'ativo' ? 'Ativo' : 'Inativo'}</span> : <span className="cadastro-muted">—</span>}</td>
                      <td><button className="cadastro-edit-button" onClick={() => navigate(record.path)}>Editar <span>›</span></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showTypeSelector && (
        <div className="cadastros-modal-overlay" onClick={() => setShowTypeSelector(false)}>
          <div className="cadastros-modal" role="dialog" aria-modal="true" aria-labelledby="cadastros-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="cadastros-modal-header">
              <div><span className="cadastros-eyebrow">Novo cadastro</span><h2 id="cadastros-modal-title">O que deseja cadastrar?</h2><p>Selecione um tipo para acessar o fluxo correspondente.</p></div>
              <button className="cadastros-modal-close" onClick={() => setShowTypeSelector(false)} aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
            </div>
            <div className="cadastros-type-list">
              {availableTypes.map((type) => (
                <button className={`cadastro-type cadastro-card--${type.id}`} key={type.id} onClick={() => openCadastro(type)}>
                  <span className="cadastro-card-icon"><TypeIcon type={type.id} /></span>
                  <span><strong>{type.label}</strong><small>Abrir módulo existente</small></span>
                  <svg className="cadastro-type-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
