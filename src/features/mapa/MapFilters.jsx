import React from 'react';
import { money } from './utils.js';

export function Painel({ titulo, acao, children }) {
  return (
    <div className="mapa-painel">
      <div className="mapa-painel-header">
        <h2 className="mapa-painel-titulo">{titulo}</h2>
        {acao}
      </div>
      {children}
    </div>
  );
}

export function MapFilters({
  canais, canal, onCanal,
  parceirosVisiveis, cores, selecionados,
  onToggleParceiro, onLimparSelecao, focusUf,
  verInstaladores, onVerInstaladores,
  verClientes, onVerClientes,
  verVendas, onVerVendas,
  periodos, periodo, onPeriodo,
  totalVendas, somaVendas,
}) {
  return (
    <>
      {canais.length > 1 && (
        <Painel titulo="1. Tipo de canal">
          <div className="mapa-canal-grid">
            {canais.map((c) => (
              <button
                key={c.value}
                onClick={() => onCanal(c.value)}
                className={`mapa-canal-btn ${canal === c.value ? 'active' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Painel>
      )}

      <Painel titulo="2. Selecao especifica">
        <label className="mapa-check-label mapa-check-bold">
          <input
            type="checkbox"
            checked={selecionados.length === 0}
            onChange={onLimparSelecao}
          />
          Todos ({parceirosVisiveis.length}){focusUf ? ` em ${focusUf}` : ''}
        </label>
        <div className="mapa-check-list">
          {parceirosVisiveis.map((p) => (
            <label key={p.id} className="mapa-check-label">
              <input
                type="checkbox"
                checked={selecionados.includes(p.id)}
                onChange={() => onToggleParceiro(p.id)}
              />
              <span className="mapa-check-dot" style={{ backgroundColor: cores.get(p.id) }} />
              <span className="mapa-check-name">{p.nome}</span>
            </label>
          ))}
          {!parceirosVisiveis.length && (
            <p className="mapa-empty-text">
              Nenhum parceiro {focusUf ? `com atuacao em ${focusUf}` : 'cadastrado neste canal'}.
            </p>
          )}
        </div>
      </Painel>

      <Painel titulo="3. Camadas de pontos">
        <label className="mapa-check-label">
          <input type="checkbox" checked={verInstaladores} onChange={(e) => onVerInstaladores(e.target.checked)} />
          <span className="mapa-dot-install" />
          Mostrar instaladoras
        </label>
        <label className="mapa-check-label">
          <input type="checkbox" checked={verClientes} onChange={(e) => onVerClientes(e.target.checked)} />
          <span className="mapa-dot-cliente" />
          Mostrar clientes
        </label>
        <label className="mapa-check-label">
          <input type="checkbox" checked={verVendas} onChange={(e) => onVerVendas(e.target.checked)} />
          <span className="mapa-dot-sale" />
          Mostrar vendas realizadas
        </label>
        {verVendas && (
          <div className="mapa-vendas-extra">
            <label className="mapa-vendas-label">Periodo</label>
            <select value={periodo} onChange={(e) => onPeriodo(e.target.value)} className="mapa-select">
              <option value="todos">Todos os periodos</option>
              {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <p className="mapa-vendas-info">
              {totalVendas} venda(s) — {money(somaVendas)}
            </p>
          </div>
        )}
      </Painel>
    </>
  );
}
