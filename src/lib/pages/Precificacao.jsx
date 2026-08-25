import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { formatCurrency } from '../../utils/formatters';
import {
  getEquipamentosComPrecificacao,
  salvarPrecificacao,
  calcularPrecoBase,
} from '../../api/precificacao';
import '../../styles/Precificacao.css';

const EMPTY_FORM = {
  guindaste_id: '',
  custo_fixo_percent: '',
  comissao_percent: '',
  assistencia_percent: '',
  margem_lucro_percent: '',
};

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

      // Recalcula preço base localmente para feedback imediato
      const calc = await calcularPrecoBase(form.guindaste_id);

      setEquipamentos((prev) =>
        prev.map((item) =>
          item.id === form.guindaste_id
            ? {
                ...item,
                custo_fixo_percent: Number(form.custo_fixo_percent) || 0,
                comissao_percent: Number(form.comissao_percent) || 0,
                assistencia_percent: Number(form.assistencia_percent) || 0,
                margem_lucro_percent: Number(form.margem_lucro_percent) || 0,
                preco_base_calculado: calc.preco,
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

          <div className="precificacao-info-box" style={{ marginTop: '20px' }}>
            <p>
              <strong>Frete e instalação:</strong> continuam sendo buscados
              automaticamente pelas estruturas já utilizadas hoje (cadastro de
              fretes e valores de instalação do guindaste). Não há cadastro
              duplicado nesta tela.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
