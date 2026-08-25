import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { formatCurrency } from '../../utils/formatters';
import {
  getEquipamentosComPrecificacao,
  salvarPrecificacao,
} from '../../api/precificacao';
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
import { calcularPreco } from '../pricingEngine';
import '../../styles/Precificacao.css';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const EMPTY_FORM_PREC = {
  guindaste_id: '',
  custo_fixo_percent: '',
  comissao_percent: '',
  assistencia_percent: '',
  margem_lucro_percent: '',
};

function calcularPrecoBase(mp, mo, regra) {
  const vMp = Number(mp) || 0;
  const vMo = Number(mo) || 0;
  const subtotal = vMp + vMo;
  const custoFixo = Number(regra?.custo_fixo_percent) || 0;
  const comissao = Number(regra?.comissao_percent) || 0;
  const assistencia = Number(regra?.assistencia_percent) || 0;
  const margem = Number(regra?.margem_lucro_percent) || 0;

  const variaveis = subtotal * (custoFixo + comissao + assistencia) / 100;
  const preco = (subtotal + variaveis) * (1 + margem / 100);
  return Number(preco.toFixed(4));
}

function formatarFrete(item) {
  const min = Number(item.frete_min);
  const max = Number(item.frete_max);
  if (min > 0 && max > 0) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }
  if (min > 0) return formatCurrency(min);
  if (max > 0) return formatCurrency(max);
  return '—';
}

function formatarInstalacao(cliente, incluso) {
  const partes = [];
  if (Number(cliente) > 0) partes.push(`Cliente: ${formatCurrency(cliente)}`);
  if (Number(incluso) > 0) partes.push(`Incluso: ${formatCurrency(incluso)}`);
  return partes.length > 0 ? partes.join(' / ') : '—';
}

function formatarPercent(v) {
  return `${Number(v || 0).toFixed(2)}%`;
}

// =============================
// 1. Equipamentos
// =============================
function PrecificacaoEquipamentos({ showToast }) {
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

      const novaRegra = {
        custo_fixo_percent: Number(form.custo_fixo_percent) || 0,
        comissao_percent: Number(form.comissao_percent) || 0,
        assistencia_percent: Number(form.assistencia_percent) || 0,
        margem_lucro_percent: Number(form.margem_lucro_percent) || 0,
      };

      setEquipamentos((prev) =>
        prev.map((item) =>
          String(item.id) === String(form.guindaste_id)
            ? {
                ...item,
                ...novaRegra,
                precificacao_id: item.precificacao_id || true,
                preco_base_calculado: calcularPrecoBase(item.custo_mp, item.custo_mo, novaRegra),
              }
            : item
        )
      );

      showToast('success', 'Precificação salva com sucesso!');
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar precificação:', error);
      showToast('error', error.message || 'Erro ao salvar precificação.');
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
        <div className="precificacao-table-wrap">
          <table className="precificacao-table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Modelo / Subgrupo</th>
                <th className="numeric">Custo MP</th>
                <th className="numeric">Custo MO</th>
                <th className="numeric">Custo fixo %</th>
                <th className="numeric">Frete</th>
                <th className="numeric">Instalação</th>
                <th className="numeric">Comissão %</th>
                <th className="numeric">Assistência %</th>
                <th className="numeric">Margem %</th>
                <th className="numeric">Preço base</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((item) => {
                const isEditing = String(editingId) === String(item.id);
                return (
                  <tr key={item.id}>
                    <td>{item.codigo_referencia || '-'}</td>
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
                        <td className="numeric">—</td>
                        <td className="numeric">—</td>
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
                        <td className="numeric">{formatarFrete(item)}</td>
                        <td
                          className="numeric"
                          title="Fonte: guindastes.valor_instalacao_*"
                        >
                          {formatarInstalacao(item.valor_instalacao_cliente, item.valor_instalacao_incluso)}
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
                          <button
                            className="precificacao-btn small"
                            onClick={() => handleEdit(item)}
                          >
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
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
    if (!formNovaNCM.ncm.trim()) {
      showToast('error', 'Informe a NCM.');
      return;
    }
    setIsLoading(true);
    try {
      await gerarRegrasParaTodasUFs({
        ncm: formNovaNCM.ncm,
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
    if (!novaLinha.uf || !novaLinha.ncm.trim()) {
      showToast('error', 'UF e NCM são obrigatórias.');
      return;
    }
    setIsLoading(true);
    try {
      await salvarRegraTributacao({
        uf: novaLinha.uf,
        ncm: novaLinha.ncm,
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
  descricao: '',
  entrada_percent: '',
  parcelas: '1',
  taxa_mensal: '',
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
      descricao: c.descricao || '',
      entrada_percent: c.entrada_percent ?? '',
      parcelas: String(c.parcelas ?? 1),
      taxa_mensal: c.taxa_mensal ?? '',
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
            <label>Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Ex: 30% entrada + 5x"
            />
          </div>
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
            <label>Parcelas</label>
            <input
              type="number"
              min="1"
              max="12"
              step="1"
              value={form.parcelas}
              onChange={(e) => handleChange('parcelas', e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Taxa mensal (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.taxa_mensal}
              onChange={(e) => handleChange('taxa_mensal', e.target.value)}
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
                <th>Descrição</th>
                <th className="numeric">Entrada %</th>
                <th className="numeric">Parcelas</th>
                <th className="numeric">Taxa mensal %</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {condicoes.map((c) => (
                <tr key={c.id}>
                  <td>{c.descricao || '—'}</td>
                  <td className="numeric">{formatarPercent(c.entrada_percent)}</td>
                  <td className="numeric">{c.parcelas}x</td>
                  <td className="numeric">{formatarPercent(c.taxa_mensal)}</td>
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
    irpj_csll_percent: '',
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
        irpj_csll_percent: data.irpj_csll_percent ?? '',
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
        irpj_csll_percent: form.irpj_csll_percent,
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
            <label>IRPJ/CSLL sobre margem (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.irpj_csll_percent}
              onChange={(e) => handleChange('irpj_csll_percent', e.target.value)}
            />
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
  const [parametros, setParametros] = useState({});
  const [tributacoes, setTributacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [guindasteId, setGuindasteId] = useState('');
  const [uf, setUf] = useState('');
  const [contribuinteStr, setContribuinteStr] = useState('true');
  const contribuinte = contribuinteStr === 'true';
  const [condicaoId, setCondicaoId] = useState('');
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
      const [eq, cond, par, trib] = await Promise.all([
        getEquipamentosComPrecificacao(),
        listarCondicoes({ ativo: true }),
        getParametros(),
        getRegrasTributacao(),
      ]);
      setEquipamentos(eq || []);
      setCondicoes(cond || []);
      setParametros(par || {});
      setTributacoes(trib || []);
    } catch (error) {
      console.error('Erro ao carregar base do simulador:', error);
      showToast('error', 'Erro ao carregar dados do simulador.');
    }
  };

  const equipamentoSelecionado = useMemo(() => {
    return equipamentos.find((e) => String(e.id) === String(guindasteId));
  }, [equipamentos, guindasteId]);

  const ncmEquipamento = equipamentoSelecionado?.ncm || '';
  const tributacaoSelecionada = useMemo(() => {
    if (!uf) return null;
    return tributacoes.find((t) => t.uf === uf && t.ncm === (ncmEquipamento || t.ncm));
  }, [tributacoes, uf, ncmEquipamento]);

  const condicaoSelecionada = useMemo(() => {
    return condicoes.find((c) => String(c.id) === String(condicaoId));
  }, [condicoes, condicaoId]);

  const calcularLocal = () => {
    if (!equipamentoSelecionado) return null;

    const icmsPct = contribuinte
      ? tributacaoSelecionada?.icms_contribuinte_percent
      : tributacaoSelecionada?.icms_nao_contribuinte_percent;

    const input = {
      custo_mp: equipamentoSelecionado.custo_mp,
      custo_mo: equipamentoSelecionado.custo_mo,
      equipamento: {
        custo_fixo_percent: equipamentoSelecionado.custo_fixo_percent,
        comissao_percent: equipamentoSelecionado.comissao_percent,
        assistencia_percent: equipamentoSelecionado.assistencia_percent,
        margem_lucro_percent: equipamentoSelecionado.margem_lucro_percent,
      },
      tributacao: {
        icms_percent: icmsPct ?? 0,
        pis_cofins_percent: tributacaoSelecionada?.pis_cofins_percent ?? 0,
      },
      condicao: {
        entrada_percent: condicaoSelecionada?.entrada_percent ?? 0,
        parcelas: condicaoSelecionada?.parcelas ?? 1,
        taxa_mensal: condicaoSelecionada?.taxa_mensal ?? 0,
      },
      parametros,
      contribuinte,
      desconto_comercial_percent: descontoComercial,
      desconto_da_comissao_percent: descontoComissao,
      frete,
      instalacao,
    };

    return calcularPreco(input);
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
    setIsLoading(true);
    try {
      const data = await simular({
        guindaste_id: guindasteId,
        uf,
        contribuinte,
        condicao_id: condicaoId,
        desconto_comercial_percent: descontoComercial,
        desconto_da_comissao_percent: descontoComissao,
        frete,
        instalacao,
      });
      setResultado(data);
      showToast('success', 'Simulação concluída!');
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
    setIsLoading(true);
    try {
      const data = await simularESalvar({
        guindaste_id: guindasteId,
        uf,
        contribuinte,
        condicao_id: condicaoId,
        desconto_comercial_percent: descontoComercial,
        desconto_da_comissao_percent: descontoComissao,
        frete,
        instalacao,
      });
      setResultado(data.resultado);
      showToast('success', 'Simulação salva no histórico!');
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      showToast('error', error.message || 'Erro ao salvar simulação.');
    } finally {
      setIsLoading(false);
    }
  };

  const resultadoPreview = calcularLocal();

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
                  {c.descricao || `${c.entrada_percent}% entrada + ${c.parcelas}x`}
                </option>
              ))}
            </select>
          </div>
          <div className="precificacao-form-group">
            <label>Desconto comercial (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descontoComercial}
              onChange={(e) => setDescontoComercial(e.target.value)}
            />
          </div>
          <div className="precificacao-form-group">
            <label>Desconto da comissão (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descontoComissao}
              onChange={(e) => setDescontoComissao(e.target.value)}
            />
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

      {(resultado || resultadoPreview) && (
        <div className="precificacao-resultado">
          <h3>Resultado</h3>
          <ResultadoSimulacao resultado={resultado || resultadoPreview} />
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

function ResultadoSimulacao({ resultado }) {
  if (!resultado) return null;
  const p = resultado.pagamento || {};
  const c = resultado.comissao || {};
  const m = resultado.margem || {};
  const l = resultado.logistica || {};

  return (
    <div className="precificacao-resultado-grid">
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
        <span className="label">Margem bruta</span>
        <span className="value">{formatarPercent(m.percentual)} = {formatCurrency(m.bruta_valor || 0)}</span>
      </div>
      <div className="precificacao-resultado-card">
        <span className="label">Margem líquida (IRPJ/CSLL)</span>
        <span className="value">{formatCurrency(m.liquida_valor || 0)}</span>
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
  const [activeTab, setActiveTab] = useState('precificacao');
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
            {[
              { key: 'precificacao', label: 'Equipamentos' },
              { key: 'tributacao', label: 'Tributação' },
              { key: 'condicoes', label: 'Condições' },
              { key: 'parametros', label: 'Parâmetros' },
              { key: 'simulador', label: 'Simulador' },
              { key: 'historico', label: 'Histórico' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`precificacao-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'precificacao' && <PrecificacaoEquipamentos showToast={showToast} />}
          {activeTab === 'tributacao' && <Tributacao showToast={showToast} />}
          {activeTab === 'condicoes' && <CondicoesPagamento showToast={showToast} />}
          {activeTab === 'parametros' && <Parametros showToast={showToast} />}
          {activeTab === 'simulador' && <Simulador showToast={showToast} />}
          {activeTab === 'historico' && <Historico showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
