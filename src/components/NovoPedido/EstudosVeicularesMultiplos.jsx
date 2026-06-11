import React, { useState, useEffect } from 'react';
import CaminhaoFormDetalhado from './CaminhaoFormDetalhado';
import './EstudosVeicularesMultiplos.css';

/**
 * Componente para gerenciar múltiplos estudos veiculares
 * Um estudo por equipamento no carrinho
 */
const EstudosVeicularesMultiplos = ({ 
  carrinho, 
  estudosVeiculares = [], 
  setEstudosVeiculares,
  onNext,
  onPrev,
  errors = {}
}) => {
  const itensValidos = (carrinho || []).filter(Boolean);
  const guindastes = itensValidos.filter(item => item?.tipo === 'guindaste');
  const [equipamentoAtivo, setEquipamentoAtivo] = useState(0);

  // Inicializar estudos vazios para cada equipamento
  useEffect(() => {
    if (guindastes.length > 0 && estudosVeiculares.length === 0) {
      const estudosIniciais = guindastes.map((guindaste, index) => ({
        equipamentoIndex: index,
        equipamentoNome: guindaste.nome || guindaste.modelo || `Equipamento ${index + 1}`,
        equipamentoId: guindaste.id,
        tipo: '',
        marca: '',
        modelo: '',
        ano: '',
        voltagem: '',
        comprimentoChassi: '',
        patolamento: '',
        observacoes: ''
      }));
      setEstudosVeiculares(estudosIniciais);
    }
  }, [guindastes.length]);

  // Atualizar estudo do equipamento atual (suporta objeto ou updater function)
  const handleEstudoChange = (update) => {
    if (!Array.isArray(estudosVeiculares)) {
      console.error('❌ [EstudosVeiculares] estudosVeiculares não é um array:', estudosVeiculares);
      return;
    }
    const novosEstudos = [...estudosVeiculares];
    const atual = novosEstudos[equipamentoAtivo] || {};
    const atualizado = typeof update === 'function' ? update(atual) : { ...atual, ...update };
    novosEstudos[equipamentoAtivo] = atualizado;
    setEstudosVeiculares(novosEstudos);
  };

  // Verificar se todos os estudos estão preenchidos
  const todosEstudosPreenchidos = Array.isArray(estudosVeiculares) && 
    estudosVeiculares.length > 0 &&
    estudosVeiculares.every(estudo => 
      estudo && estudo.tipo && estudo.marca && estudo.modelo && estudo.voltagem
    );

  // Verificar se o estudo atual está preenchido
  const estudoAtualPreenchido = Array.isArray(estudosVeiculares) &&
    estudosVeiculares[equipamentoAtivo] && 
    estudosVeiculares[equipamentoAtivo]?.tipo &&
    estudosVeiculares[equipamentoAtivo]?.marca &&
    estudosVeiculares[equipamentoAtivo]?.modelo &&
    estudosVeiculares[equipamentoAtivo]?.voltagem;

  const handleProximoEquipamento = () => {
    if (equipamentoAtivo < guindastes.length - 1) {
      setEquipamentoAtivo(equipamentoAtivo + 1);
    }
  };

  const handleEquipamentoAnterior = () => {
    if (equipamentoAtivo > 0) {
      setEquipamentoAtivo(equipamentoAtivo - 1);
    }
  };

  if (guindastes.length === 0) {
    return (
      <div className="estudos-veiculares-container">
        <div className="alert alert-warning">
          Nenhum equipamento no carrinho. Adicione equipamentos antes de preencher o estudo veicular.
        </div>
        <div className="form-actions">
          <button className="btn-back-secondary" onClick={onPrev}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const guindasteAtual = guindastes[equipamentoAtivo] || null;
  const estudoAtual = (Array.isArray(estudosVeiculares) && estudosVeiculares[equipamentoAtivo]) || {};

  if (!guindasteAtual) {
    return (
      <div className="estudos-veiculares-container">
        <div className="alert alert-warning">
          Equipamento não encontrado. Volte e verifique os itens do carrinho.
        </div>
        <div className="form-actions">
          <button className="btn-back-secondary" onClick={onPrev}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="estudos-veiculares-container">
      {/* Header com navegação entre equipamentos */}
      <div className="estudos-header">
        <h2>🚛 Estudo Veicular</h2>
        <p className="estudos-subtitle">
          Preencha os dados do veículo para cada equipamento selecionado
        </p>
      </div>

      {/* Abas de equipamentos */}
      <div className="equipamentos-tabs">
        {guindastes.map((guindaste, index) => {
          const estudo = Array.isArray(estudosVeiculares) ? estudosVeiculares[index] : null;
          const preenchido = estudo && estudo.tipo && estudo.marca && estudo.modelo && estudo.voltagem;
          
          return (
            <button
              key={index}
              className={`equipamento-tab ${index === equipamentoAtivo ? 'active' : ''} ${preenchido ? 'completed' : ''}`}
              onClick={() => setEquipamentoAtivo(index)}
            >
              <div className="tab-header">
                <span className="tab-numero">Equipamento {index + 1}/{guindastes.length}</span>
                {preenchido && <span className="tab-check">✓</span>}
              </div>
              <div className="tab-nome">{guindaste.nome || guindaste.modelo || `Equipamento ${index + 1}`}</div>
            </button>
          );
        })}
      </div>

      {/* Indicador do equipamento atual */}
      <div className="equipamento-atual-info">
        <div className="equipamento-badge">
          <span className="badge-label">Equipamento {equipamentoAtivo + 1} de {guindastes.length}</span>
          <span className="badge-nome">{guindasteAtual.nome || guindasteAtual.modelo}</span>
        </div>
        {estudoAtualPreenchido && (
          <div className="equipamento-status completed">
            <span className="status-icon">✓</span>
            <span>Estudo preenchido</span>
          </div>
        )}
      </div>

      {/* Formulário do estudo atual */}
      <CaminhaoFormDetalhado
        formData={estudoAtual}
        setFormData={handleEstudoChange}
        errors={errors}
      />

      {/* Navegação entre equipamentos */}
      {guindastes.length > 1 && (
        <div className="equipamentos-navigation">
          <button
            className="btn-nav-equipamento"
            onClick={handleEquipamentoAnterior}
            disabled={equipamentoAtivo === 0}
          >
            ← Equipamento Anterior
          </button>
          <span className="nav-indicator">
            {equipamentoAtivo + 1} / {guindastes.length}
          </span>
          <button
            className="btn-nav-equipamento"
            onClick={handleProximoEquipamento}
            disabled={equipamentoAtivo === guindastes.length - 1}
          >
            Próximo Equipamento →
          </button>
        </div>
      )}

      {/* Alerta se faltam estudos */}
      {!todosEstudosPreenchidos && (
        <div className="alert alert-info">
          ⚠️ Preencha o estudo veicular para todos os equipamentos antes de continuar.
          <div className="estudos-progress">
            {Array.isArray(estudosVeiculares) 
              ? estudosVeiculares.filter(e => e && e.tipo && e.marca && e.modelo && e.voltagem).length 
              : 0} de {guindastes.length} completos
          </div>
        </div>
      )}

      {/* Ações principais */}
      <div className="form-actions">
        <button className="btn-back-secondary" onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
          Voltar
        </button>
        <button 
          className="btn-continue" 
          onClick={onNext} 
          disabled={!todosEstudosPreenchidos}
        >
          <span>Continuar para Resumo</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EstudosVeicularesMultiplos;
