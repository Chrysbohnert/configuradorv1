import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Boxes,
  LineChart,
  MapPinned,
  Package,
  Store,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import UnifiedHeader from '../../components/UnifiedHeader';
import {
  isAdminFull,
  isAdminConcessionarias,
  isAdminCanalRepresentantes,
  isAdminCanalInterno,
  isAdminComercioExterior,
} from '../../utils/permissions';
import '../../styles/CadastrosHome.css';

export default function CadastrosHome() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const full = isAdminFull(user);
  const concSede = isAdminConcessionarias(user);
  const rep = isAdminCanalRepresentantes(user);
  const interno = isAdminCanalInterno(user);
  const exterior = isAdminComercioExterior(user);

  const items = [
    { label: 'Clientes', description: 'Consulte, cadastre e edite clientes.', path: '/clientes', icon: UserRound, visible: true },
    { label: 'Guindastes', description: 'Gerencie equipamentos, configurações e preços.', path: '/gerenciar-guindastes', icon: Boxes, visible: full },
    { label: 'Gráficos de Carga', description: 'Gerencie os gráficos vinculados aos equipamentos.', path: '/gerenciar-graficos-carga', icon: LineChart, visible: full },
    { label: 'Representantes', description: 'Gerencie representantes e suas áreas de atuação.', path: '/gerenciar-vendedores?canal=representantes', icon: UsersRound, visible: full || rep },
    { label: 'Canal Interno', description: 'Gerencie a equipe comercial do canal interno.', path: '/gerenciar-vendedores?canal=interno', icon: BarChart3, visible: full || interno },
    { label: 'Concessionárias', description: 'Gerencie concessionárias, responsáveis e áreas.', path: '/concessionarias', icon: Store, visible: full || concSede },
    { label: 'Comércio Exterior', description: 'Gerencie representantes do comércio exterior.', path: '/gerenciar-vendedores?canal=comercio_exterior', icon: Building2, visible: full || exterior },
    { label: 'Instaladoras', description: 'Consulte, cadastre e edite instaladoras e fretes.', path: '/gerenciar-fretes', icon: Truck, visible: full },
    { label: 'Acessórios', description: 'Cadastre e gerencie acessórios comerciais.', path: '/gerenciar-acessorios', icon: Package, visible: full },
    { label: 'Áreas de Atuação', description: 'Abra o cadastro territorial existente para entidades com cobertura geográfica.', path: '/cadastros/territorial', icon: MapPinned, visible: full || concSede },
  ].filter((item) => item.visible);

  return (
    <div className="cadastros-home-page">
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Cadastros"
        subtitle="Escolha o cadastro que deseja gerenciar"
      />
      <main className="cadastros-home-content">
        <div className="cadastros-home-heading">
          <h1>Cadastros disponíveis</h1>
          <p>As opções respeitam as permissões do seu perfil.</p>
        </div>
        <div className="cadastros-home-grid">
          {items.map((item) => (
            <button key={item.path} type="button" className="cadastros-home-card" onClick={() => navigate(item.path)}>
              <span className="cadastros-home-icon">{React.createElement(item.icon, { size: 24 })}</span>
              <span className="cadastros-home-card-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span className="cadastros-home-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
