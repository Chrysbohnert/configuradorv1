import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { formatCurrency } from '../../utils/formatters';
import {
  getEquipamentosComPrecificacao,
  salvarPrecificacao,
} from '../../api/precificacao';
import {
  aprovarPrecoPendente,
  editarPrecoPendente,
} from '../../api/guindastes';
import {
  getRegrasTributacao,
  salvarRegraTributacao,
  gerarRegrasParaTodasUFs,
  atualizarRegraTributacao,
  excluirRegraTributacao,
} from '../../api/tributacao';
import {
  listarCondicoes,
  criarCondicao,
  atualizarCondicao,
  excluirCondicao,
} from '../../api/precificacaoCondicoes';
import {
  getParametros,
  salvarParametros,
} from '../../api/precificacaoParametros';
import {
  simular,
  simularESalvar,
  listarHistorico,
  excluirHistorico,
} from '../../api/precificacaoSimulador';
import '../../styles/Precificacao.css';

const UFS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];
const UFS = [...UFS_BR, 'EXPORT'];

const EMPTY_FORM_PREC = {
  guindaste_id: '',
  custo_fixo_percent: '',
  comissao_percent: '',
  assistencia_percent: '',
  margem_lucro_percent: '',
  ipi_percent: '',
};

function formatarPercent(v) {
  return `${Number(v || 0).toFixed(2)}%`;
}

function TabelaRolavel({ children }) {
  const topRef = useRef(null);
  const bodyRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    const top = topRef.current;
    const body = bodyRef.current;
    const spacer = spacerRef.current;
    if (!top || !body || !spacer) return;

    const resize = () => {
      spacer.style.width = `${body.scrollWidth}px`;
    };
    resize();

    const onTopScroll = () => { body.scrollLeft = top.scrollLeft; };
    const onBodyScroll = () => { top.scrollLeft = body.scrollLeft; };

    top.addEventListener('scroll', onTopScroll);
    body.addEventListener('scroll', onBodyScroll);
    const observer = new ResizeObserver(resize);
    observer.observe(body);

    return () => {
      top.removeEventListener('scroll', onTopScroll);
      body.removeEventListener('scroll', onBodyScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="precificacao-table-scroll-outer">
      <div className="precificacao-table-scroll-top" ref={topRef}>
        <div className="precificacao-table-scroll-spacer" ref={spacerRef} />
      </div>
      <div className="precificacao-table-scroll-body" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

// =============================
// 1. Equipamentos
// =============================
function PrecificacaoEquipamentos({ showToast, user }) {
  const isAdminFull = user?.tipo === 'admin_full';
  const [isLoading, setIsLoading] = useState(false);
  const [equipamentos, setEquipamentos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM_PREC });

  useEffect(() => {
    loadEquipamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEquipamentos = async () => {
    setIsLoading(true);
    try {
      const data = await getEquipamentosComPrecificacao();
      setEquipamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
      showToast('error', 'Erro ao carregar equipamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      guindaste_id: item.id,
      custo_fixo_percent: item.custo_fixo_percent ?? '',
      comissao_percent: item.comissao_percent ?? '',
      assistencia_percent: item.assistencia_percent ?? '',
      margem_lucro_percent: item.margem_lucro_percent ?? '',
      ipi_percent: item.ipi_percent ?? '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM_PREC });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await salvarPrecificacao({
        guindaste_id: form.guindaste_id,
        custo_fixo_percent: form.custo_fixo_percent,
        comissao_percent: form.comissao_percent,
        assistencia_percent: form.assistencia_percent,
        margem_lucro_percent: form.margem_lucro_percent,
      });

      await loadEquipamentos();

      showToast('success', 'Precificação salva com sucesso!');
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar precificação:', error);
      showToast('error', error.message || 'Erro ao salvar precificação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprovarPreco = async (item) => {
    if (!isAdminFull) return;
    setIsLoading(true);
    try {
      await aprovarPrecoPendente(item.id);
      showToast('success', `Preço do equipamento ${item.codigo_referencia || item.modelo} aprovado.`);
      await loadEquipamentos();
    } catch (error) {
      console.error('Erro ao aprovar preço:', error);
      showToast('error', error.message || 'Erro ao aprovar preço.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarPreco = async (item) => {
    if (!isAdminFull) return;
    const custoMp = window.prompt(`Editar Custo MP para ${item.codigo_referencia || item.modelo}:`, item.custo_mp ?? '');
    if (custoMp === null) return;
    const custoMo = window.prompt(`Editar Custo MO para ${item.codigo_referencia || item.modelo}:`, item.custo_mo ?? '');
    if (custoMo === null) return;
    setIsLoading(true);
    try {
      await editarPrecoPendente(item.id, {
        custo_mp: custoMp,
        custo_mo: custoMo,
      });
      showToast('success', `Preço do equipamento ${item.codigo_referencia || item.modelo} atualizado e aprovado.`);
      await loadEquipamentos();
    } catch (error) {
      console.error('Erro ao editar preço:', error);
      showToast('error', error.message || 'Erro ao editar preço.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2 className="precificacao-section-title">Precificação por equipamento</h2>
      <p className="precificacao-section-subtitle">
        Configure os percentuais de precificação por equipamento/referência.
      </p>

      {isLoading && equipamentos.length === 0 ? (
        <div className="precificacao-loading">Carregando equipamentos...</div>
      ) : equipamentos.length === 0 ? (
        <div className="precificacao-empty">
          <h3>Nenhum equipamento encontrado</h3>
          <p>Cadastre guindastes antes de configurar a precificação.</p>
        </div>
      ) : (
        <TabelaRolavel>
          <table className="precificacao-table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>NCM</th>
                <th>Modelo / Subgrupo</th>
                <th className="numeric">Custo MP</th>
                <th className="numeric">Custo MO</th>
                <th className="numeric">Custo fixo %</th>
                <th className="numeric">Comissão %</th>
                <th className="numeric">Assistência %</th>
                <th className="numeric">Margem %</th>
                <th className="numeric">Preço base</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((item) => {
                const isEditing = String(editingId) === String(item.id);
                return (
                  <tr key={item.id} className={item.status_preco === 'pendente' ? 'precificacao-pendente' : ''}>
                    <td><strong>{item.codigo_referencia || '-'}</strong></td>
                    <td>{item.ncm || '—'}</td>
                    <td>
                      {item.modelo} {item.subgrupo}
                    </td>
                    <td className="numeric">
                      {formatCurrency(Number(item.custo_mp) || 0)}
                    </td>
                    <td className="numeric">
                      {formatCurrency(Number(item.custo_mo) || 0)}
                    </td>
                    {isEditing ? (
                      <>
                        <td className="numeric">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.custo_fixo_percent}
                            onChange={(e) => handleChange('custo_fixo_percent', e.target.value)}
                            className="precificacao-input"
                          />
                        </td>
                        <td className="numeric">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.comissao_percent}
                            onChange={(e) => handleChange('comissao_percent', e.target.value)}
                            className="precificacao-input"
                          />
                        </td>
                        <td className="numeric">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.assistencia_percent}
                            onChange={(e) => handleChange('assistencia_percent', e.target.value)}
                            className="precificacao-input"
                          />
                        </td>
                        <td className="numeric">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.margem_lucro_percent}
                            onChange={(e) => handleChange('margem_lucro_percent', e.target.value)}
                            className="precificacao-input"
                          />
                        </td>
                        <td className="numeric">—</td>
                        <td>
                          <div className="precificacao-row-actions">
                            <button
                              className="precificacao-btn primary small"
                              onClick={handleSave}
                              disabled={isLoading}
                            >
                              {isLoading ? '...' : 'Salvar'}
                            </button>
                            <button
                              className="precificacao-btn small"
                              onClick={handleCancel}
                              disabled={isLoading}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="numeric">
                          {Number(item.custo_fixo_percent || 0).toFixed(2)}%
                        </td>
                        <td className="numeric">
                          {Number(item.comissao_percent || 0).toFixed(2)}%
                        </td>
                        <td className="numeric">
                          {Number(item.assistencia_percent || 0).toFixed(2)}%
                        </td>
                        <td className="numeric">
                          {Number(item.margem_lucro_percent || 0).toFixed(2)}%
                        </td>
                        <td className="numeric">
                          <strong>
                            {formatCurrency(Number(item.preco_base_calculado) || 0)}
                          </strong>
                        </td>
                        <td>
                          {item.status_preco === 'pendente' ? (
                            <span className="precificacao-status-pendente" title={`Pendente desde: ${new Date(item.preco_pendente_desde).toLocaleString('pt-BR')}`}>
                              Pendente
                            </span>
                          ) : (
                            <span className="precificacao-status-aprovado">Aprovado</span>
                          )}
                        </td>
                        <td>
                          <div className="precificacao-row-actions">
                            {item.status_preco === 'pendente' && isAdminFull && (
                              <>
                                <button
                                  type="button"
                                  className="precificacao-btn primary small"
                                  onClick={() => handleAprovarPreco(item)}
                                  disabled={isLoading}
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="precificacao-btn small"
                                  onClick={() => handleEditarPreco(item)}
                                  disabled={isLoading}
                                >
                                  Editar
                                </button>
                              </>
                            )}
                            <button
                              className="precificacao-btn small"
                              onClick={() => handleEdit(item)}
                            >
                              Editar %
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabelaRolavel>
      )}
    </section>
  );
}

// =============================
// 2. Tributação
// =============================
const EMPTY_TRIBUTACAO_FORM = {
  ncm: '',
  icms_contribuinte_percent: '',
  icms_nao_contribuinte_percent: '',
  pis_cofins_percent: '',
};

function Tributacao({ showToast }) {
  const [isLoading, setIsLoading] = useState(false);
  const [regras, setRegras] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formNovaNCM, setFormNovaNCM] = useState({ ...EMPTY_TRIBUTACAO_FORM });
  const [novaLinha, setNovaLinha] = useState({ uf: '', ncm: '', icms_contribuinte_percent: '', icms_nao_contribuinte_percent: '', pis_cofins_percent: '' });

  useEffect(() => {
    loadRegras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRegras = async () => {
    setIsLoading(true);
    try {
      const data = await getRegrasTributacao();
      setRegras(data || []);
    } catch (error) {
      console.error('Erro ao carregar regras tributárias:', error);
      showToast('error', 'Erro ao carregar regras tributárias.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGerarUFs = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await gerarRegrasParaTodasUFs({
        ncm: formNovaNCM.ncm || 'PADRAO',
        icms_contribuinte_percent: formNovaNCM.icms_contribuinte_percent,
        icms_nao_contribuinte_percent: formNovaNCM.icms_nao_contribuinte_percent,
        pis_cofins_percent: formNovaNCM.pis_cofins_percent,
      });
      showToast('success', 'Regras geradas para todas as UFs!');
      setFormNovaNCM({ ...EMPTY_TRIBUTACAO_FORM });
      loadRegras();
    } catch (error) {
      console.error('Erro ao gerar regras:', error);
      showToast('error', error.message || 'Erro ao gerar regras.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdicionarLinha = async (e) => {
    e.preventDefault();
    if (!novaLinha.uf) {
      showToast('error', 'UF é obrigatória.');
      return;
    }
    setIsLoading(true);
    try {
      await salvarRegraTributacao({
        uf: novaLinha.uf,
        ncm: novaLinha.ncm || 'PADRAO',
        icms_contribuinte_percent: novaLinha.icms_contribuinte_percent,
        icms_nao_contribuinte_percent: novaLinha.icms_nao_contribuinte_percent,
        pis_cofins_percent: novaLinha.pis_cofins_percent,
      });
      showToast('success', 'Linha adicionada!');
      setNovaLinha({ uf: '', ncm: '', icms_contribuinte_percent: '', icms_nao_contribuinte_percent: '', pis_cofins_percent: '' });
      loadRegras();
    } catch (error) {
      console.error('Erro ao adicionar linha:', error);
      showToast('error', error.message || 'Erro ao adicionar linha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (regra) => {
    setEditingId(regra.id);
  };

  const handleSalvarEdicao = async (regra, valores) => {
    setIsLoading(true);
    try {
      await atualizarRegraTributacao(regra.id, valores);
      showToast('success', 'Regra atualizada!');
      setEditingId(null);
      loadRegras();
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      showToast('error', error.message || 'Erro ao atualizar regra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    setIsLoading(true);
    try {
      await excluirRegraTributacao(id);
      showToast('success', 'Regra excluída!');
      loadRegras();
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      showToast('error', error.message || 'Erro ao excluir regra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2 className="precificacao-section-title">Tributação</h2>
      <p className="precificacao-section-subtitle">
        Cadastro de regras tributárias por UF + NCM. Usada apenas no simulador da nova precificação.
      </p>

      <div className="precificacao-form-box">
        <h3>Gerar regras para todas as UFs</h3>
        <form onSubmit={handleGerarUFs} className="precificacao-form-grid">
          <div className="precificacao-form-group">
            <label>NCM</label>
            <input
              type="text"
              value={formNovaNCM.ncm}
              onChange={(e) => setFormNovaNCM({ ...formNovaNCM, ncm: e.target.value })}
              placeholder="Ex: 8426.12.00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>ICMS contribuinte (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formNovaNCM.icms_contribuinte_percent}
              onChange={(e) => setFormNovaNCM({ ...formNovaNCM, icms_contribuinte_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>ICMS não contribuinte (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formNovaNCM.icms_nao_contribuinte_percent}
              onChange={(e) => setFormNovaNCM({ ...formNovaNCM, icms_nao_contribuinte_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>PIS/COFINS (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formNovaNCM.pis_cofins_percent}
              onChange={(e) => setFormNovaNCM({ ...formNovaNCM, pis_cofins_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="precificacao-btn primary" disabled={isLoading}>
              {isLoading ? 'Gerando...' : 'Gerar para todas as UFs'}
            </button>
          </div>
        </form>
      </div>

      <div className="precificacao-form-box">
        <h3>Adicionar linha individual</h3>
        <form onSubmit={handleAdicionarLinha} className="precificacao-form-grid">
          <div className="precificacao-form-group">
            <label>UF</label>
            <select
              value={novaLinha.uf}
              onChange={(e) => setNovaLinha({ ...novaLinha, uf: e.target.value })}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>NCM</label>
            <input
              type="text"
              value={novaLinha.ncm}
              onChange={(e) => setNovaLinha({ ...novaLinha, ncm: e.target.value })}
              placeholder="Ex: 8426.12.00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>ICMS contribuinte (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={novaLinha.icms_contribuinte_percent}
              onChange={(e) => setNovaLinha({ ...novaLinha, icms_contribuinte_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>ICMS não contribuinte (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={novaLinha.icms_nao_contribuinte_percent}
              onChange={(e) => setNovaLinha({ ...novaLinha, icms_nao_contribuinte_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>PIS/COFINS (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={novaLinha.pis_cofins_percent}
              onChange={(e) => setNovaLinha({ ...novaLinha, pis_cofins_percent: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="precificacao-btn primary" disabled={isLoading}>
              {isLoading ? 'Adicionando...' : 'Adicionar linha'}
            </button>
          </div>
        </form>
      </div>

      {isLoading && regras.length === 0 ? (
        <div className="precificacao-loading">Carregando regras...</div>
      ) : regras.length === 0 ? (
        <div className="precificacao-empty">
          <h3>Nenhuma regra tributária cadastrada</h3>
          <p>Gere regras para todas as UFs ou adicione uma linha individual.</p>
        </div>
      ) : (
        <div className="precificacao-table-wrap">
          <table className="precificacao-table">
            <thead>
              <tr>
                <th>UF</th>
                <th>NCM</th>
                <th className="numeric">ICMS contribuinte (%)</th>
                <th className="numeric">ICMS não contribuinte (%)</th>
                <th className="numeric">PIS/COFINS (%)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((regra) => (
                <LinhaTributacao
                  key={regra.id}
                  regra={regra}
                  isEditing={editingId === regra.id}
                  onEdit={() => handleEditar(regra)}
                  onSave={handleSalvarEdicao}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleExcluir(regra.id)}
                  isLoading={isLoading}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LinhaTributacao({ regra, isEditing, onEdit, onSave, onCancel, onDelete, isLoading }) {
  const [valores, setValores] = useState({
    icms_contribuinte_percent: regra.icms_contribuinte_percent ?? '',
    icms_nao_contribuinte_percent: regra.icms_nao_contribuinte_percent ?? '',
    pis_cofins_percent: regra.pis_cofins_percent ?? '',
  });

  const handleChange = (field, value) => {
    setValores((prev) => ({ ...prev, [field]: value }));
  };

  if (isEditing) {
    return (
      <tr>
        <td>{regra.uf}</td>
        <td>{regra.ncm}</td>
        <td className="numeric">
          <input
            type="number"
            min="0"
            step="0.01"
            value={valores.icms_contribuinte_percent}
            onChange={(e) => handleChange('icms_contribuinte_percent', e.target.value)}
            className="precificacao-input"
          />
        </td>
        <td className="numeric">
          <input
            type="number"
            min="0"
            step="0.01"
            value={valores.icms_nao_contribuinte_percent}
            onChange={(e) => handleChange('icms_nao_contribuinte_percent', e.target.value)}
            className="precificacao-input"
          />
        </td>
        <td className="numeric">
          <input
            type="number"
            min="0"
            step="0.01"
            value={valores.pis_cofins_percent}
            onChange={(e) => handleChange('pis_cofins_percent', e.target.value)}
            className="precificacao-input"
          />
        </td>
        <td>
          <div className="precificacao-row-actions">
            <button
              className="precificacao-btn primary small"
              onClick={() => onSave(regra, valores)}
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Salvar'}
            </button>
            <button className="precificacao-btn small" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{regra.uf}</td>
      <td>{regra.ncm}</td>
      <td className="numeric">{Number(regra.icms_contribuinte_percent || 0).toFixed(2)}%</td>
      <td className="numeric">{Number(regra.icms_nao_contribuinte_percent || 0).toFixed(2)}%</td>
      <td className="numeric">{Number(regra.pis_cofins_percent || 0).toFixed(2)}%</td>
      <td>
        <div className="precificacao-row-actions">
          <button className="precificacao-btn small" onClick={onEdit}>Editar</button>
          <button className="precificacao-btn small danger" onClick={onDelete}>Excluir</button>
        </div>
      </td>
    </tr>
  );
}

// =============================
// 3. Condições de pagamento
// =============================
const EMPTY_CONDICAO_FORM = {
  entrada_percent: '',
  taxa_anual_percent: '',
};

function CondicoesPagamento({ showToast }) {
  const [isLoading, setIsLoading] = useState(false);
  const [condicoes, setCondicoes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_CONDICAO_FORM });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await listarCondicoes({ ativo: true });
      setCondicoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar condições:', error);
      showToast('error', 'Erro ao carregar condições de pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setEditingId(null);
    setForm({ ...EMPTY_CONDICAO_FORM });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        await atualizarCondicao(editingId, form);
        showToast('success', 'Condição atualizada!');
      } else {
        await criarCondicao(form);
        showToast('success', 'Condição criada!');
      }
      reset();
      load();
    } catch (error) {
      console.error('Erro ao salvar condição:', error);
      showToast('error', error.message || 'Erro ao salvar condição.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({
      entrada_percent: c.entrada_percent ?? '',
      taxa_anual_percent: c.taxa_anual_percent ?? '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir condição?')) return;
    setIsLoading(true);
    try {
      await excluirCondicao(id);
      showToast('success', 'Condição excluída!');
      load();
    } catch (error) {
      console.error('Erro ao excluir condição:', error);
      showToast('error', error.message || 'Erro ao excluir condição.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2 className="precificacao-section-title">Condições de pagamento</h2>
      <p className="precificacao-section-subtitle">
        Condições isoladas para testes no simulador. Não afetam planos de pagamento existentes.
      </p>

      <div className="precificacao-form-box">
        <form onSubmit={handleSubmit} className="precificacao-form-grid">
          <div className="precificacao-form-group">
            <label>Entrada (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.entrada_percent}
              onChange={(e) => handleChange('entrada_percent', e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group">
            <label>Taxa anual (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.taxa_anual_percent}
              onChange={(e) => handleChange('taxa_anual_percent', e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="precificacao-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="precificacao-btn primary" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Adicionar')}
            </button>
            {editingId && (
              <button type="button" className="precificacao-btn" onClick={reset} style={{ marginLeft: 8 }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {isLoading && condicoes.length === 0 ? (
        <div className="precificacao-loading">Carregando...</div>
      ) : condicoes.length === 0 ? (
        <div className="precificacao-empty">
          <h3>Nenhuma condição cadastrada</h3>
        </div>
      ) : (
        <div className="precificacao-table-wrap">
          <table className="precificacao-table">
            <thead>
              <tr>
                <th className="numeric">Entrada %</th>
                <th className="numeric">Taxa anual %</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {condicoes.map((c) => (
                <tr key={c.id}>
                  <td className="numeric">{formatarPercent(c.entrada_percent)}</td>
                  <td className="numeric">{formatarPercent(c.taxa_anual_percent)}</td>
                  <td>
                    <div className="precificacao-row-actions">
                      <button className="precificacao-btn small" onClick={() => handleEdit(c)}>Editar</button>
                      <button className="precificacao-btn small danger" onClick={() => handleDelete(c.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// =============================
// 4. Parâmetros
// =============================
function Parametros({ showToast }) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    comissao_base_vendedor_percent: '',
    desconto_comercial_max_percent: '',
    comissao_cedivel_max_percent: '',
    passo_desconto_parcela_percent: '',
    irpj_percent: '',
    csll_percent: '',
    ipi_padrao_percent: '',
    exportacao_reducao_dolar_percent: '',
    exportacao_acrescimo_margem_percent: '',
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const data = await getParametros();
      setForm({
        comissao_base_vendedor_percent: data.comissao_base_vendedor_percent ?? '',
        desconto_comercial_max_percent: data.desconto_comercial_max_percent ?? '',
        comissao_cedivel_max_percent: data.comissao_cedivel_max_percent ?? '',
        passo_desconto_parcela_percent: data.passo_desconto_parcela_percent ?? '',
        irpj_percent: data.irpj_percent ?? '',
        csll_percent: data.csll_percent ?? '',
        ipi_padrao_percent: data.ipi_padrao_percent ?? '',
        exportacao_reducao_dolar_percent: data.exportacao_reducao_dolar_percent ?? '',
        exportacao_acrescimo_margem_percent: data.exportacao_acrescimo_margem_percent ?? '',
      });
    } catch (error) {
      console.error('Erro ao carregar parâmetros:', error);
      showToast('error', 'Erro ao carregar parâmetros.');
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await salvarParametros({
        comissao_base_vendedor_percent: form.comissao_base_vendedor_percent,
        desconto_comercial_max_percent: form.desconto_comercial_max_percent,
        comissao_cedivel_max_percent: form.comissao_cedivel_max_percent,
        passo_desconto_parcela_percent: form.passo_desconto_parcela_percent,
        irpj_percent: form.irpj_percent,
        csll_percent: form.csll_percent,
        ipi_padrao_percent: form.ipi_padrao_percent,
        exportacao_reducao_dolar_percent: form.exportacao_reducao_dolar_percent,
        exportacao_acrescimo_margem_percent: form.exportacao_acrescimo_margem_percent,
      });
      showToast('success', 'Parâmetros salvos!');
      load();
    } catch (error) {
      console.error('Erro ao salvar parâmetros:', error);
      showToast('error', error.message || 'Erro ao salvar parâmetros.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2 className="precificacao-section-title">Parâmetros</h2>
      <p className="precificacao-section-subtitle">
        Configurações globais usadas apenas no cálculo do simulador.
      </p>

      <div className="precificacao-form-box">
        <form onSubmit={handleSubmit} className="precificacao-form-grid">
          <div className="precificacao-form-group">
            <label>Comissão base do vendedor (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.comissao_base_vendedor_percent}
              onChange={(e) => handleChange('comissao_base_vendedor_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Desconto comercial máximo (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.desconto_comercial_max_percent}
              onChange={(e) => handleChange('desconto_comercial_max_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Máx. da própria comissão que o vendedor pode ceder (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.comissao_cedivel_max_percent}
              onChange={(e) => handleChange('comissao_cedivel_max_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Redução do desconto por parcela (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.passo_desconto_parcela_percent}
              onChange={(e) => handleChange('passo_desconto_parcela_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>IRPJ (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.irpj_percent}
              onChange={(e) => handleChange('irpj_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>CSLL (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.csll_percent}
              onChange={(e) => handleChange('csll_percent', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Redução de segurança do dólar (%) — Comércio Exterior</label>
            <input type="number" min="0" max="100" step="0.01" value={form.exportacao_reducao_dolar_percent} onChange={(e) => handleChange('exportacao_reducao_dolar_percent', e.target.value)} />
          </div>
          <div className="precificacao-form-group">
            <label>Acréscimo de margem para exportação (p.p.)</label>
            <input type="number" min="0" step="0.01" value={form.exportacao_acrescimo_margem_percent} onChange={(e) => handleChange('exportacao_acrescimo_margem_percent', e.target.value)} />
          </div>
          <div className="precificacao-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="precificacao-btn primary" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar parâmetros'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

// =============================
// 5. Simulador
// =============================
function Simulador({ showToast }) {
  const [equipamentos, setEquipamentos] = useState([]);
  const [condicoes, setCondicoes] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [matriz, setMatriz] = useState([]);

  const [guindasteId, setGuindasteId] = useState('');
  const [uf, setUf] = useState('');
  const [contribuinteStr, setContribuinteStr] = useState('true');
  const contribuinte = contribuinteStr === 'true';
  const [condicaoId, setCondicaoId] = useState('');
  const [parcelas, setParcelas] = useState('0');
  const [descontoComercial, setDescontoComercial] = useState('');
  const [descontoComissao, setDescontoComissao] = useState('');
  const [frete, setFrete] = useState('');
  const [instalacao, setInstalacao] = useState('');

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBase = async () => {
    try {
      const [eq, cond, param] = await Promise.all([
        getEquipamentosComPrecificacao(),
        listarCondicoes({ ativo: true }),
        getParametros(),
      ]);
      setEquipamentos(eq || []);
      setCondicoes(cond || []);
      setParametros(param || null);
    } catch (error) {
      console.error('Erro ao carregar base do simulador:', error);
      showToast('error', 'Erro ao carregar dados do simulador.');
    }
  };

  const equipamentoSelecionado = useMemo(() => {
    return equipamentos.find((e) => String(e.id) === String(guindasteId));
  }, [equipamentos, guindasteId]);

  const condicaoSelecionada = useMemo(() => {
    return condicoes.find((c) => String(c.id) === String(condicaoId));
  }, [condicoes, condicaoId]);

  const descontoComercialMax = useMemo(() => {
    const base = Number(parametros?.desconto_comercial_max_percent) || 0;
    const passo = Number(parametros?.passo_desconto_parcela_percent) || 0;
    const parcelasNum = Number(parcelas) || 0;
    return Math.max(0, base - parcelasNum * passo);
  }, [parametros, parcelas]);

  const descontoComissaoMax = Number(parametros?.comissao_cedivel_max_percent) || 0;

  const validarLimites = () => {
    const dc = Number(descontoComercial) || 0;
    const dcom = Number(descontoComissao) || 0;
    if (dc > descontoComercialMax + 0.0001) {
      return `Desconto comercial não pode ultrapassar ${descontoComercialMax.toFixed(2)}% para ${parcelas || 0}x.`;
    }
    if (dcom > descontoComissaoMax + 0.0001) {
      return `Desconto da comissão não pode ultrapassar ${descontoComissaoMax.toFixed(2)}%.`;
    }
    return null;
  };


  const carregarMatriz = async () => {
    const linhas = await Promise.all(condicoes.map(async (condicao) => {
      const respostas = await Promise.allSettled(Array.from({ length: 13 }, (_, quantidade) => simular({
        guindaste_id: guindasteId,
        uf,
        contribuinte,
        condicao_id: condicao.id,
        parcelas: quantidade,
        desconto_comercial_percent: 0,
        desconto_da_comissao_percent: 0,
        frete: 0,
        instalacao: 0,
      })));
      const resultados = respostas.map((resposta) => resposta.status === 'fulfilled' ? resposta.value : null);
      return { condicao, resultados };
    }));
    setMatriz(linhas);
  };

  const handleSimular = async () => {
    if (!equipamentoSelecionado) {
      showToast('error', 'Selecione um equipamento.');
      return;
    }
    if (!uf) {
      showToast('error', 'Selecione uma UF.');
      return;
    }
    if (!condicaoSelecionada) {
      showToast('error', 'Selecione uma condição de pagamento.');
      return;
    }
    const erroLimite = validarLimites();
    if (erroLimite) {
      showToast('error', erroLimite);
      return;
    }
    setIsLoading(true);
    try {
      const data = await simular({
        guindaste_id: guindasteId,
        uf,
        contribuinte,
        condicao_id: condicaoId,
        parcelas,
        desconto_comercial_percent: descontoComercial,
        desconto_da_comissao_percent: descontoComissao,
        frete,
        instalacao,
      });
      setResultado(data);
      await carregarMatriz();
      showToast('success', 'Simulação e matriz de condições atualizadas!');
    } catch (error) {
      console.error('Erro na simulação:', error);
      showToast('error', error.message || 'Erro na simulação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!equipamentoSelecionado || !uf || !condicaoSelecionada) {
      showToast('error', 'Preencha equipamento, UF e condição.');
      return;
    }
    const erroLimite = validarLimites();
    if (erroLimite) {
      showToast('error', erroLimite);
      return;
    }
    setIsLoading(true);
    try {
      const data = await simularESalvar({
        guindaste_id: guindasteId,
        uf,
        contribuinte,
        condicao_id: condicaoId,
        parcelas,
        desconto_comercial_percent: descontoComercial,
        desconto_da_comissao_percent: descontoComissao,
        frete,
        instalacao,
      });
      setResultado(data.resultado);
      await carregarMatriz();
      showToast('success', 'Simulação salva no histórico!');
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      showToast('error', error.message || 'Erro ao salvar simulação.');
    } finally {
      setIsLoading(false);
    }
  };

  const ncmOptions = useMemo(() => {
    const set = new Set(equipamentos.map((e) => e.ncm).filter(Boolean));
    return Array.from(set);
  }, [equipamentos]);

  return (
    <section>
      <h2 className="precificacao-section-title">Simulador</h2>
      <p className="precificacao-section-subtitle">
        Teste a nova regra de precificação sem gerar proposta. Não alimenta nenhum fluxo de produção.
      </p>

      <div className="precificacao-form-box">
        <form className="precificacao-form-grid" onSubmit={(e) => { e.preventDefault(); handleSimular(); }}>
          <div className="precificacao-form-group">
            <label>Equipamento</label>
            <select value={guindasteId} onChange={(e) => setGuindasteId(e.target.value)}>
              <option value="">Selecione</option>
              {equipamentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo_referencia || e.modelo} — {e.subgrupo}
                </option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>UF</label>
            <select value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">Selecione</option>
              {UFS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>Contribuinte ICMS?</label>
            <select value={contribuinteStr} onChange={(e) => setContribuinteStr(e.target.value)}>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>Condição de pagamento</label>
            <select value={condicaoId} onChange={(e) => setCondicaoId(e.target.value)}>
              <option value="">Selecione</option>
              {condicoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descricao || `${c.entrada_percent}% de entrada`}
                </option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>Parcelas</label>
            <select value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
              <option value="0">À vista / faturamento</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((quantidade) => (
                <option key={quantidade} value={quantidade}>{quantidade}x</option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>Desconto comercial (%) — máx. {descontoComercialMax.toFixed(2)}%</label>
            <input
              type="number"
              min="0"
              max={descontoComercialMax.toFixed(4)}
              step="0.01"
              value={descontoComercial}
              onChange={(e) => setDescontoComercial(e.target.value)}
            />
            {(Number(descontoComercial) || 0) > descontoComercialMax && (
              <span className="precificacao-field-error">Ultrapassa o limite de {descontoComercialMax.toFixed(2)}%</span>
            )}
          </div>
          <div className="precificacao-form-group">
            <label>Desconto da comissão (%) — máx. {descontoComissaoMax.toFixed(2)}%</label>
            <input
              type="number"
              min="0"
              max={descontoComissaoMax.toFixed(4)}
              step="0.01"
              value={descontoComissao}
              onChange={(e) => setDescontoComissao(e.target.value)}
            />
            {(Number(descontoComissao) || 0) > descontoComissaoMax && (
              <span className="precificacao-field-error">Ultrapassa o limite de {descontoComissaoMax.toFixed(2)}%</span>
            )}
          </div>
          <div className="precificacao-form-group">
            <label>Frete (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={frete}
              onChange={(e) => setFrete(e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Instalação (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={instalacao}
              onChange={(e) => setInstalacao(e.target.value)}
            />
          </div>
          <div className="precificacao-form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="submit" className="precificacao-btn primary" disabled={isLoading}>
              {isLoading ? 'Calculando...' : 'Simular'}
            </button>
            <button type="button" className="precificacao-btn" onClick={handleSalvar} disabled={isLoading}>
              Simular e salvar
            </button>
          </div>
        </form>
      </div>

      {resultado && (
        <div className="precificacao-resultado">
          <CadeiaCalculo resultado={resultado} />
          <MatrizCondicoes matriz={matriz} />
          <div className="precificacao-audit-panel">
            <h3>Composição do preço (auditoria)</h3>
            <ResultadoSimulacao resultado={resultado} />
          </div>
        </div>
      )}

      {ncmOptions.length === 0 && equipamentos.length > 0 && (
        <div className="precificacao-info-box" style={{ marginTop: 16 }}>
          <p>
            <strong>Atenção:</strong> os equipamentos não possuem NCM cadastrada. A tributação pode não ser encontrada.
          </p>
        </div>
      )}
    </section>
  );
}

function CadeiaCalculo({ resultado }) {
  const custos = resultado.custos || {};
  const formacao = resultado.formacao || {};
  const desconto = resultado.desconto_comercial || {};
  const comissao = resultado.comissao || {};
  const pagamento = resultado.pagamento || {};
  const margem = resultado.margem || {};
  const margemAlvo = Number(margem.percentual || 0);
  const margemLiquida = Number(margem.liquida_percent || 0);
  return (
    <>
      <div className="precificacao-audit-panel">
        <h3>Cadeia de cálculo</h3>
        <dl className="precificacao-audit-list">
          <div><dt>Custo (MP + MO)</dt><dd>{formatCurrency(custos.custoVariavel || 0)}</dd></div>
          <div><dt>IRPJ/CSLL sobre a margem (gross-up)</dt><dd>{formatarPercent(formacao.irpj_csll_gross_up_percent)}</dd></div>
          <div><dt>Σ percentuais do divisor</dt><dd>{formatarPercent(formacao.soma_percentuais)}</dd></div>
          <div><dt>÷ (1 − Σ percentuais)</dt><dd>{formatCurrency(formacao.base || 0)}</dd></div>
          <div><dt>Preço de tabela (pior cenário)</dt><dd>{formatCurrency(resultado.preco_tabela || 0)}</dd></div>
          <div><dt>× (1 − desconto financeiro {formatarPercent(formacao.desconto_financeiro_percent)})</dt><dd>{formatCurrency(formacao.preco_condicao || 0)}</dd></div>
          <div><dt>× (1 − desconto comercial {formatarPercent(desconto.percentual)}) × (1 − desconto da comissão {formatarPercent(comissao.cedida_percent_sobre_base)})</dt><dd>{formatCurrency(resultado.preco_final_sem_logistica || 0)}</dd></div>
        </dl>
        <div className="precificacao-audit-totals">
          <div><span>Preço final</span><strong>{formatCurrency(resultado.preco_final || 0)}</strong></div>
          <div><span>Entrada ({formatarPercent(pagamento.entrada_percent)})</span><strong>{formatCurrency(pagamento.entrada_valor || 0)}</strong></div>
          <div><span>Saldo no faturamento</span><strong>{formatCurrency(pagamento.saldo_valor || 0)}</strong></div>
        </div>
      </div>
      <div className="precificacao-audit-panel">
        <h3>Validação de margem</h3>
        <div className="precificacao-audit-totals">
          <div><span>Margem alvo</span><strong>{formatarPercent(margemAlvo)}</strong></div>
          <div><span>Margem antes do IR</span><strong>{formatarPercent(margem.antes_ir_percent)}</strong></div>
          <div><span>Margem líquida após IR/CSLL</span><strong>{formatarPercent(margemLiquida)}</strong></div>
        </div>
        <div className={`precificacao-margin-status ${margemLiquida + 0.0001 >= margemAlvo ? 'ok' : 'warning'}`}>
          {margemLiquida + 0.0001 >= margemAlvo
            ? 'Margem líquida dentro ou acima da margem alvo cadastrada.'
            : 'Margem líquida abaixo da margem alvo cadastrada.'}
        </div>
      </div>
    </>
  );
}

function MatrizCondicoes({ matriz }) {
  if (!matriz.length) return null;
  return (
    <div className="precificacao-audit-panel">
      <h3>Preço por condição de pagamento</h3>
      <div className="precificacao-matrix-wrap">
        <table className="precificacao-matrix">
          <thead><tr><th>Entrada</th>{Array.from({ length: 13 }, (_, index) => <th key={index}>{index === 0 ? 'À vista' : `${index}x`}</th>)}</tr></thead>
          <tbody>{matriz.map(({ condicao, resultados }) => (
            <tr key={condicao.id}>
              <th>{formatarPercent(condicao.entrada_percent)}</th>
              {resultados.map((item, index) => (
                <td key={index}>
                  {item ? (
                    <>
                      <strong>{formatCurrency(item.preco_final_sem_logistica || 0)}</strong>
                      <span>desc. até {formatarPercent(item.desconto_comercial?.maximo_permitido)}</span>
                    </>
                  ) : <span>Indisponível</span>}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="precificacao-matrix-note">O preço de tabela contempla o custo financeiro máximo; condições mais curtas liberam desconto financeiro e comercial.</p>
    </div>
  );
}

function ResultadoSimulacao({ resultado }) {
  if (!resultado) return null;
  const p = resultado.pagamento || {};
  const c = resultado.comissao || {};
  const m = resultado.margem || {};
  const l = resultado.logistica || {};
  const t = resultado.tributacao || {};
  const f = resultado.formacao || {};
  const exp = resultado.exportacao;

  return (
    <div className="precificacao-resultado-grid">
      {exp && <>
        <div className="precificacao-resultado-card"><span className="label">Cotação original</span><span className="value">R$ {Number(exp.cotacao_original || 0).toFixed(4)}</span></div>
        <div className="precificacao-resultado-card"><span className="label">Redução de segurança</span><span className="value">{formatarPercent(exp.reducao_dolar_percent)}</span></div>
        <div className="precificacao-resultado-card"><span className="label">Cotação utilizada</span><span className="value">R$ {Number(exp.cotacao_utilizada || 0).toFixed(4)}</span></div>
        <div className="precificacao-resultado-card"><span className="label">Margem original</span><span className="value">{formatarPercent(exp.margem_original_percent)}</span></div>
        <div className="precificacao-resultado-card"><span className="label">Margem aplicada</span><span className="value">{formatarPercent(exp.margem_aplicada_percent)}</span></div>
      </>}
      <div className="precificacao-resultado-card">
        <span className="label">Preço base / tabela</span>
        <span className="value">{formatCurrency(resultado.preco_tabela || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Preço final</span>
        <span className="value">{formatCurrency(resultado.preco_final || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Entrada ({formatarPercent(p.entrada_percent)})</span>
        <span className="value">{formatCurrency(p.entrada_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Saldo parcelado</span>
        <span className="value">{formatCurrency(p.saldo_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Parcelas</span>
        <span className="value">{(p.parcelas || []).map((par) => `${par.numero}x ${formatCurrency(par.valor)}`).join(', ')}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Comissão original</span>
        <span className="value">{formatarPercent(c.equipamento_percent)} = {formatCurrency(c.equipamento_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Comissão cedida</span>
        <span className="value">{formatCurrency(c.cedida_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Comissão final</span>
        <span className="value">{formatCurrency(c.final_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Margem antes de IRPJ/CSLL</span>
        <span className="value">{formatarPercent(m.antes_ir_percent)} = {formatCurrency(m.antes_ir_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Margem líquida (IRPJ/CSLL)</span>
        <span className="value">{formatarPercent(m.liquida_percent)} = {formatCurrency(m.liquida_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">IRPJ / CSLL</span>
        <span className="value">{formatarPercent(t.irpj_percent)} / {formatarPercent(t.csll_percent)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Fator pior / condição</span>
        <span className="value">{Number(f.fator_pior_cenario || 1).toFixed(4)} / {Number(f.fator_condicao || 1).toFixed(4)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Preço da condição</span>
        <span className="value">{formatCurrency(f.preco_condicao || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Frete</span>
        <span className="value">{formatCurrency(l.frete || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Instalação</span>
        <span className="value">{formatCurrency(l.instalacao || 0)}</span>
      </div>
    </div>
  );
}

// =============================
// 6. Histórico
// =============================
function Historico({ showToast }) {
  const [historico, setHistorico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await listarHistorico({ limit: 50 });
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      showToast('error', 'Erro ao carregar histórico.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir snapshot do histórico?')) return;
    try {
      await excluirHistorico(id);
      showToast('success', 'Snapshot excluído!');
      load();
      if (selecionado?.id === id) setSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir histórico:', error);
      showToast('error', error.message || 'Erro ao excluir histórico.');
    }
  };

  return (
    <section>
      <h2 className="precificacao-section-title">Histórico de teste</h2>
      <p className="precificacao-section-subtitle">
        Snapshots das simulações salvas. Preservam as regras e valores utilizados no momento do cálculo.
      </p>

      {isLoading && historico.length === 0 ? (
        <div className="precificacao-loading">Carregando histórico...</div>
      ) : historico.length === 0 ? (
        <div className="precificacao-empty">
          <h3>Nenhum snapshot salvo</h3>
          <p>Use "Simular e salvar" para guardar uma precificação.</p>
        </div>
      ) : (
        <div className="precificacao-table-wrap">
          <table className="precificacao-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Equipamento</th>
                <th>UF</th>
                <th className="numeric">Preço final</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => {
                const eq = h.equipamento || {};
                const res = h.resultado || {};
                return (
                  <React.Fragment key={h.id}>
                    <tr>
                      <td>{new Date(h.created_at).toLocaleString('pt-BR')}</td>
                      <td>{eq.codigo_referencia || eq.modelo || '—'}</td>
                      <td>{(h.tributacao || {}).uf || '—'}</td>
                      <td className="numeric">{formatCurrency(res.preco_final || 0)}</td>
                      <td>
                        <div className="precificacao-row-actions">
                          <button
                            className="precificacao-btn small"
                            onClick={() => setSelecionado(selecionado?.id === h.id ? null : h)}
                          >
                            {selecionado?.id === h.id ? 'Ocultar' : 'Detalhes'}
                          </button>
                          <button className="precificacao-btn small danger" onClick={() => handleDelete(h.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                    {selecionado?.id === h.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div className="precificacao-form-box" style={{ margin: 12, background: '#f8fafc' }}>
                            <h4>Detalhes do snapshot</h4>
                            <ResultadoSimulacao resultado={res} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}



// =============================
// Página principal
// =============================
export default function Precificacao() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = [
    { key: 'precificacao', label: 'Equipamentos' },
    { key: 'tributacao', label: 'Tributação' },
    { key: 'condicoes', label: 'Condições' },
    { key: 'parametros', label: 'Parâmetros' },
    { key: 'simulador', label: 'Simulador' },
    { key: 'historico', label: 'Histórico' },
  ];
  const requestedTab = searchParams.get('secao');
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'precificacao';
  const setActiveTab = (tab) => {
    if (tab === 'precificacao') setSearchParams({});
    else setSearchParams({ secao: tab });
  };
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
  };

  if (!user) return null;

  return (
    <div className="precificacao-page">
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Precificação"
        subtitle="Formação de preço, tributação e simulador (ambiente de teste)"
      />

      <div className="precificacao-container">
        <div className="precificacao-header">
          <div>
            <h1>Precificação</h1>
            <p>
              Configure equipamentos, tributação, condições e parâmetros; teste tudo no simulador.
              Esta área está isolada e ainda não altera propostas, preços em produção ou PDFs.
            </p>
          </div>
          <span className="precificacao-badge">Em teste</span>
        </div>

        <div className="precificacao-content">
          {toast.message && (
            <div className={`precificacao-status ${toast.type}`}>{toast.message}</div>
          )}

          <div className="precificacao-info-box">
            <p>
              <strong>Isolamento mantido:</strong> fretes, instalação, planos de pagamento,
              propostas e PDFs continuam usando as fontes atuais. A nova precificação não
              alimenta nenhum fluxo de produção.
            </p>
          </div>

          <div className="precificacao-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`precificacao-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'precificacao' && <PrecificacaoEquipamentos key={refreshKey} showToast={showToast} user={user} />}
          {activeTab === 'tributacao' && <Tributacao key={refreshKey} showToast={showToast} />}
          {activeTab === 'condicoes' && <CondicoesPagamento key={refreshKey} showToast={showToast} />}
          {activeTab === 'parametros' && <Parametros key={refreshKey} showToast={showToast} />}
          {activeTab === 'simulador' && <Simulador key={refreshKey} showToast={showToast} />}
          {activeTab === 'historico' && <Historico key={refreshKey} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
