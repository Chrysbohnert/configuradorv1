import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { formatCurrency } from '../../utils/formatters';
import {
  getEquipamentosComPrecificacao,
  salvarPrecificacao,
} from '../../api/precificacao';
import '../../styles/Precificacao.css';

const EMPTY_FORM = {
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

export default function Precificacao() {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [isLoading, setIsLoading] = useState(false);
  const [equipamentos, setEquipamentos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [toast, setToast] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'admin') {
      navigate('/dashboard-admin');
      return;
    }
    loadEquipamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
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
    setForm({ ...EMPTY_FORM });
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

  if (!user) return null;

  return (
    <div className="precificacao-page">
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Precificação"
        subtitle="Formação de preço por equipamento/referência (preparação)"
      />

      <div className="precificacao-container">
        <div className="precificacao-header">
          <div>
            <h1>Precificação</h1>
            <p>
              Configure os percentuais de precificação por equipamento. Referência,
              custo MP e custo MO vêm do cadastro de guindastes. Frete e instalação
              continuam nas fontes já utilizadas pelo sistema. Esta funcionalidade
              está em preparação e ainda não altera propostas ou preços em produção.
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
              <strong>Reaproveitado:</strong> código/referência, custo MP/MO e
              cadastro de guindastes. <strong>Fontes atuais mantidas:</strong>{' '}
              fretes, instalação, planos de pagamento, propostas e PDF.
            </p>
          </div>

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
                                onChange={(e) =>
                                  handleChange('custo_fixo_percent', e.target.value)
                                }
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
                                onChange={(e) =>
                                  handleChange('comissao_percent', e.target.value)
                                }
                                className="precificacao-input"
                              />
                            </td>
                            <td className="numeric">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.assistencia_percent}
                                onChange={(e) =>
                                  handleChange('assistencia_percent', e.target.value)
                                }
                                className="precificacao-input"
                              />
                            </td>
                            <td className="numeric">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.margem_lucro_percent}
                                onChange={(e) =>
                                  handleChange('margem_lucro_percent', e.target.value)
                                }
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
                              {formatarFrete(item)}
                            </td>
                            <td className="numeric" title="Fonte: guindastes.valor_instalacao_*">
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
        </div>
      </div>
    </div>
  );
}
