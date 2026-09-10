import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Boxes,
  LineChart,
  MapPinned,
  Store,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  isAdminFull,
  isAdminConcessionarias,
  isAdminConcessionaria,
  isAdminCanalRepresentantes,
  isAdminCanalInterno,
  isAdminComercioExterior,
  podeAcessarPedidosCompra,
} from '../utils/permissions';
import '../styles/AdminNavigation.css';

const AdminNavigation = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const fullAccess = isAdminFull(user);
  const adminConcSede = isAdminConcessionarias(user);
  const adminConc = isAdminConcessionaria(user);
  const adminRep = isAdminCanalRepresentantes(user);
  const adminInterno = isAdminCanalInterno(user);
  const adminExt = isAdminComercioExterior(user);

  const navItems = [
    {
      path: '/dashboard-admin',
      label: 'Dashboard',
      visible: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    {
      path: '/admin/nova-proposta',
      label: 'Nova Proposta Comercial',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
        </svg>
      )
    },
    {
      path: '/admin/propostas',
      label: 'Propostas e Vendas',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      path: '/nova-proposta-concessionaria',
      label: 'Novo Pedido de Compra',
      visible: podeAcessarPedidosCompra(user),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    },

    {
      path: '/gerenciar-estoque',
      label: 'Estoque',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      )
    },
    {
      path: '/gerenciar-fretes',
      label: 'Instaladoras',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      )
    },
    {
      path: '/concessionarias',
      label: 'Concessionárias',
      visible: fullAccess || adminConcSede,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" />
          <path d="M9 21v-8h6v8" />
          <path d="M9 9h6" />
        </svg>
      )
    },
    {
      path: '/mapa-territorial',
      label: 'Mapa Territorial',
      visible: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      )
    },
    {
      path: '/relatorio-completo',
      label: 'Pedidos de Compra',
      visible: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    },
    {
      path: '/aprovacoes-descontos',
      label: 'Aprovações de Desconto',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      )
    },
    {
      path: '/planos-pagamento',
      label: 'Planos de Pagamento',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
        </svg>
      )
    },
    {
      path: '/cotacao-dolar',
      label: 'Cotação do Dólar',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      path: '/precificacao',
      label: 'Precificação',
      visible: fullAccess,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      )
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseSession');
    localStorage.removeItem('carrinho');
    localStorage.removeItem('rememberMe');
    // Reset flag de boas-vindas para próxima sessão
    sessionStorage.removeItem('welcomeShownAdmin');
    navigate('/');
  };

  const onNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const filteredNavItems = navItems.filter((item) => item.visible !== false);

  const findItem = (path) => filteredNavItems.find((item) => item.path === path);
  const groups = [
    { id: 'dashboard', direct: true, item: findItem('/dashboard-admin') },
    {
      id: 'comercial',
      label: 'Comercial',
      items: [
        findItem('/admin/nova-proposta'),
        findItem('/admin/propostas'),
        findItem('/nova-proposta-concessionaria'),
        findItem('/relatorio-completo'),
        findItem('/aprovacoes-descontos')
      ]
    },
    {
      id: 'cadastros',
      label: 'Cadastros',
      items: [
        { path: '/clientes', label: 'Clientes', visible: true, icon: <UserRound size={20} /> },
        { path: '/gerenciar-guindastes', label: 'Guindastes', visible: fullAccess, icon: <Boxes size={20} /> },
        { path: '/gerenciar-graficos-carga', label: 'Gráficos de Carga', visible: fullAccess, icon: <LineChart size={20} /> },
        { path: '/gerenciar-vendedores?canal=representantes', label: 'Representantes', visible: fullAccess || adminRep, icon: <UsersRound size={20} /> },
        { path: '/gerenciar-vendedores?canal=interno', label: 'Canal Interno', visible: fullAccess || adminInterno, icon: <BarChart3 size={20} /> },
        { path: '/gerenciar-vendedores?canal=concessionarias', label: 'Concessionárias', visible: fullAccess || adminConcSede || adminConc, icon: <Store size={20} /> },
        { path: '/gerenciar-vendedores?canal=comercio_exterior', label: 'Comércio Exterior', visible: fullAccess || adminExt, icon: <Building2 size={20} /> },
        { path: '/gerenciar-fretes', label: 'Instaladoras', visible: fullAccess, icon: <Truck size={20} /> },
        { path: '/cadastros/territorial', label: 'Áreas de Atuação', visible: fullAccess || adminConcSede, icon: <MapPinned size={20} /> },
      ].filter((item) => item.visible !== false),
    },
    { id: 'mapa', direct: true, item: findItem('/mapa-territorial') },
    {
      id: 'gestao',
      label: 'Gestão',
      items: [
        findItem('/planos-pagamento'),
        findItem('/cotacao-dolar'),
        findItem('/precificacao')
      ]
    }
  ].map((group) => ({
    ...group,
    items: group.items?.filter(Boolean),
    item: group.item?.visible !== false ? group.item : undefined
  })).filter((group) => (group.direct ? group.item : group.items.length > 0));
  const pricingSections = [
    { key: 'precificacao', label: 'Equipamentos' },
    { key: 'tributacao', label: 'Tributação' },
    { key: 'condicoes', label: 'Condições' },
    { key: 'parametros', label: 'Parâmetros' },
    { key: 'simulador', label: 'Simulador' },
    { key: 'historico', label: 'Histórico' }
  ];
  const isPathActive = (path) => {
    const [pathname, search = ''] = path.split('?');
    if (location.pathname !== pathname && !location.pathname.startsWith(`${pathname}/`)) return false;
    if (!search) return true;
    const expected = new URLSearchParams(search);
    const current = new URLSearchParams(location.search);
    return [...expected.entries()].every(([key, value]) => current.get(key) === value);
  };
  const activeGroupId = groups.find((group) => group.direct
    ? group.item && isPathActive(group.item.path)
    : group.items.some((item) => isPathActive(item.path)))?.id;
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(['dashboard']));
  const pricingExpanded = isPathActive('/precificacao');
  const activePricingSection = new URLSearchParams(location.search).get('secao') || 'precificacao';

  useEffect(() => {
    if (!activeGroupId) return;
    setExpandedGroups((current) => {
      if (current.has(activeGroupId)) return current;
      const next = new Set(current);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId]);

  const toggleGroup = (groupId) => {
    if (groupId === activeGroupId) return;
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderItem = (item) => {
    const active = isPathActive(item.path);
    return (
      <React.Fragment key={item.path}>
        <button
          className={`nav-item nav-child-item ${active ? 'active' : ''}`}
          onClick={() => onNavigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {active && <span className="nav-indicator"></span>}
        </button>
        {item.path === '/precificacao' && pricingExpanded && (
          <div className="nav-pricing-submenu">
            {pricingSections.map((section) => (
              <button
                key={section.key}
                className={`nav-pricing-item ${activePricingSection === section.key ? 'active' : ''}`}
                onClick={() => onNavigate(section.key === 'precificacao'
                  ? '/precificacao'
                  : `/precificacao?secao=${section.key}`)}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <button 
        className="mobile-toggle" 
        onClick={() => setIsOpen(!isOpen)} 
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>
      
      <div className={`admin-navigation ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <button type="button" className="admin-info" onClick={() => onNavigate('/admin/configuracoes')} aria-label="Abrir configurações do perfil">
            <div className="admin-avatar">
              {user?.foto_perfil ? (
                <img
                  src={user.foto_perfil}
                  alt={user.nome}
                  className="avatar-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <span
                className="avatar-text"
                style={{ display: user?.foto_perfil ? 'none' : 'block' }}
              >
                {user?.nome?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="admin-details">
              <div className="admin-name">{user?.nome}</div>
              <div className="admin-role">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M12 0L15.708 7.604L24 8.852L18 14.696L19.416 23L12 19.104L4.584 23L6 14.696L0 8.852L8.292 7.604L12 0Z" />
                </svg>
                {fullAccess
                  ? 'Administrador Master'
                  : adminConcSede
                  ? 'Admin Concessionárias'
                  : adminConc
                  ? 'Admin Concessionária'
                  : adminRep
                  ? 'Admin Representantes'
                  : adminInterno
                  ? 'Admin Canal Interno'
                  : adminExt
                  ? 'Admin Comércio Exterior'
                  : 'Administrador'}
              </div>
            </div>
          </button>
          {/* Botão X para fechar no mobile */}
          <button 
            className="mobile-close-btn" 
            onClick={() => setIsOpen(false)}
            aria-label="Fechar menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className="nav-menu">
          {groups.map((group) => {
            if (group.direct) {
              return group.item ? (
                <div className="nav-direct-item" key={group.id}>
                  {renderItem(group.item)}
                </div>
              ) : null;
            }

            const expanded = expandedGroups.has(group.id);
            const active = activeGroupId === group.id;
            return (
              <div className={`nav-group ${active ? 'active' : ''}`} key={group.id}>
                <button
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded}
                >
                  <span>{group.label}</span>
                  <svg className={`nav-chevron ${expanded ? 'expanded' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                {expanded && (
                  <div className="nav-group-items">
                    {group.items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="nav-footer">
          <button className="logout-button" onClick={() => { handleLogout(); setIsOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sair</span>
          </button>
        </div>
      </div>
      
      {isOpen && <div className="nav-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
};

export default AdminNavigation;
