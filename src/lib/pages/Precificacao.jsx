import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
        Cadastro de regras tributárias por UF + NCM. Por enquanto apenas preparação;
        não afeta cálculo de propostas.
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

export default function Precificacao() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState('precificacao');
  const [toast, setToast] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'admin') {
      navigate('/dashboard-admin');
      return;
    }
  }, [user, navigate]);

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
        subtitle="Formação de preço e tributação por equipamento/UF (preparação)"
      />

      <div className="precificacao-container">
        <div className="precificacao-header">
          <div>
            <h1>Precificação</h1>
            <p>
              Configure os percentuais de precificação por equipamento e as regras
              tributárias por UF + NCM. Estas funcionalidades estão em preparação e
              ainda não alteram propostas ou preços em produção.
            </p>
          </div>
          <span className="precificacao-badge">Em preparação</span>
        </div>

        <div className="precificacao-content">
          {toast.message && (
            <div className={`precificacao-status ${toast.type}`}>{toast.message}</div>
          )}

          <div className="precificacao-info-box">
            <p>
              <strong>Fontes atuais mantidas:</strong> fretes, instalação, planos de
              pagamento, propostas e PDF. Não há integração automática com a nova
              precificação/tributação.
            </p>
          </div>

          <div className="precificacao-tabs">
            <button
              className={`precificacao-tab ${activeTab === 'precificacao' ? 'active' : ''}`}
              onClick={() => setActiveTab('precificacao')}
            >
              Precificação
            </button>
            <button
              className={`precificacao-tab ${activeTab === 'tributacao' ? 'active' : ''}`}
              onClick={() => setActiveTab('tributacao')}
            >
              Tributação
            </button>
          </div>

          {activeTab === 'precificacao' && <PrecificacaoEquipamentos showToast={showToast} />}
          {activeTab === 'tributacao' && <Tributacao showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
