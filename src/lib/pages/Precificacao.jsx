import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import BlobButton from '../../components/BlobButton';
import { formatCurrency } from '../../utils/formatters';
import {
  getRegras,
  salvarRegra,
  atualizarRegra,
  excluirRegra,
  calcularPreco,
  getGuindastesComCusto,
} from '../../api/precificacao';
import '../../styles/Precificacao.css';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const EMPTY_REGRA = {
  uf: '',
  descricao: '',
  custo_fixo_percent: '',
  comissao_percent: '',
  assistencia_percent: '',
  margem_lucro_percent: '',
  icms_percent: '',
  ipi_percent: '',
  pis_percent: '',
  cofins_percent: '',
  outros_impostos_percent: '',
  ativo: true,
};

export default function Precificacao() {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [activeTab, setActiveTab] = useState('regras');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  const [regras, setRegras] = useState([]);
  const [editingRegra, setEditingRegra] = useState(null);
  const [formRegra, setFormRegra] = useState({ ...EMPTY_REGRA });

  const [guindastes, setGuindastes] = useState([]);
  const [simulador, setSimulador] = useState({ guindaste_id: '', uf: '' });
  const [simuladorResult, setSimuladorResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'admin') {
      navigate('/dashboard-admin');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [regrasData, guindastesData] = await Promise.all([
        getRegras(),
        getGuindastesComCusto(),
      ]);
      setRegras(regrasData || []);
      setGuindastes(guindastesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados de precificação:', error);
      showToast('error', 'Erro ao carregar dados. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
  };

  const handleChangeRegra = (field, value) => {
    setFormRegra((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRegra = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formRegra,
        uf: formRegra.uf || null,
        custo_fixo_percent: parseFloat(formRegra.custo_fixo_percent) || 0,
        comissao_percent: parseFloat(formRegra.comissao_percent) || 0,
        assistencia_percent: parseFloat(formRegra.assistencia_percent) || 0,
        margem_lucro_percent: parseFloat(formRegra.margem_lucro_percent) || 0,
        icms_percent: parseFloat(formRegra.icms_percent) || 0,
        ipi_percent: parseFloat(formRegra.ipi_percent) || 0,
        pis_percent: parseFloat(formRegra.pis_percent) || 0,
        cofins_percent: parseFloat(formRegra.cofins_percent) || 0,
        outros_impostos_percent: parseFloat(formRegra.outros_impostos_percent) || 0,
      };

      if (editingRegra) {
        await atualizarRegra(editingRegra.id, payload);
        showToast('success', 'Regra atualizada com sucesso!');
      } else {
        await salvarRegra(payload);
        showToast('success', 'Regra salva com sucesso!');
      }
      setFormRegra({ ...EMPTY_REGRA });
      setEditingRegra(null);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      showToast('error', error.message || 'Erro ao salvar regra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRegra = (regra) => {
    setEditingRegra(regra);
    setFormRegra({
      uf: regra.uf || '',
      descricao: regra.descricao || '',
      custo_fixo_percent: regra.custo_fixo_percent ?? '',
      comissao_percent: regra.comissao_percent ?? '',
      assistencia_percent: regra.assistencia_percent ?? '',
      margem_lucro_percent: regra.margem_lucro_percent ?? '',
      icms_percent: regra.icms_percent ?? '',
      ipi_percent: regra.ipi_percent ?? '',
      pis_percent: regra.pis_percent ?? '',
      cofins_percent: regra.cofins_percent ?? '',
      outros_impostos_percent: regra.outros_impostos_percent ?? '',
      ativo: regra.ativo ?? true,
    });
  };

  const handleCancelEdit = () => {
    setEditingRegra(null);
    setFormRegra({ ...EMPTY_REGRA });
  };

  const handleDeleteRegra = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    setIsLoading(true);
    try {
      await excluirRegra(id);
      showToast('success', 'Regra excluída com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      showToast('error', 'Erro ao excluir regra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimular = async (e) => {
    e.preventDefault();
    if (!simulador.guindaste_id || !simulador.uf) {
      showToast('error', 'Selecione o guindaste e a UF.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await calcularPreco(simulador.guindaste_id, simulador.uf);
      setSimuladorResult(result);
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      showToast('error', 'Erro ao calcular preço.');
    } finally {
      setIsLoading(false);
    }
  };

  const guindasteSelecionado = useMemo(() => {
    return guindastes.find((g) => String(g.id) === String(simulador.guindaste_id));
  }, [guindastes, simulador.guindaste_id]);

  const regrasDefaultFirst = useMemo(() => {
    return [...regras].sort((a, b) => {
      if (!a.uf && b.uf) return -1;
      if (a.uf && !b.uf) return 1;
      return (a.uf || '').localeCompare(b.uf || '');
    });
  }, [regras]);

  if (!user) return null;

  return (
    <div className="precificacao-page">
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Precificação"
        subtitle="Formação de preço dos guindastes por UF (preparação)"
      />

      <div className="precificacao-container">
        <div className="precificacao-header">
          <div>
            <h1>Precificação</h1>
            <p>
              Configure regras percentuais por UF e simule o preço de venda dos
              equipamentos. Esta funcionalidade está em preparação e ainda não
              altera propostas, fretes, instalação ou pagamentos em produção.
            </p>
          </div>
          <span className="precificacao-badge">Em preparação</span>
        </div>

        <div className="precificacao-content">
          {toast.message && (
            <div className={`precificacao-status ${toast.type}`}>{toast.message}</div>
          )}

          <div className="precificacao-tabs">
            <button
              className={`precificacao-tab ${activeTab === 'regras' ? 'active' : ''}`}
              onClick={() => setActiveTab('regras')}
            >
              Regras por UF
            </button>
            <button
              className={`precificacao-tab ${activeTab === 'simulador' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulador')}
            >
              Simulador
            </button>
            <button
              className={`precificacao-tab ${activeTab === 'custos' ? 'active' : ''}`}
              onClick={() => setActiveTab('custos')}
            >
              Custos dos Equipamentos
            </button>
          </div>

          {activeTab === 'regras' && (
            <section>
              <h2 className="precificacao-section-title">Regras de precificação</h2>
              <p className="precificacao-section-subtitle">
                Defina os percentuais usados no cálculo. Deixe UF vazio para criar a
                regra padrão (fallback). Impostos por UF devem ser preenchidos nas
                regras específicas.
              </p>

              <div className="precificacao-info-box">
                <p>
                  <strong>Reaproveitado:</strong> código/referência e cadastro de
                  guindastes existentes. <strong>Não altera:</strong> fretes,
                  instalação, planos de pagamento, propostas ou geração de PDF.
                </p>
              </div>

              <form onSubmit={handleSubmitRegra}>
                <div className="precificacao-form-grid">
                  <div className="precificacao-form-group">
                    <label>UF (vazio = padrão)</label>
                    <select
                      value={formRegra.uf}
                      onChange={(e) => handleChangeRegra('uf', e.target.value)}
                    >
                      <option value="">Padrão (todas as UFs)</option>
                      {UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="precificacao-form-group">
                    <label>Descrição</label>
                    <input
                      type="text"
                      value={formRegra.descricao}
                      onChange={(e) => handleChangeRegra('descricao', e.target.value)}
                      placeholder="Ex: Regra padrão Stark"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Custo fixo (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.custo_fixo_percent}
                      onChange={(e) => handleChangeRegra('custo_fixo_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Comissão (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.comissao_percent}
                      onChange={(e) => handleChangeRegra('comissao_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Assistência (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.assistencia_percent}
                      onChange={(e) => handleChangeRegra('assistencia_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Margem de lucro (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.margem_lucro_percent}
                      onChange={(e) => handleChangeRegra('margem_lucro_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>ICMS (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.icms_percent}
                      onChange={(e) => handleChangeRegra('icms_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>IPI (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.ipi_percent}
                      onChange={(e) => handleChangeRegra('ipi_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>PIS (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.pis_percent}
                      onChange={(e) => handleChangeRegra('pis_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>COFINS (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.cofins_percent}
                      onChange={(e) => handleChangeRegra('cofins_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Outros impostos (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formRegra.outros_impostos_percent}
                      onChange={(e) => handleChangeRegra('outros_impostos_percent', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="precificacao-form-group">
                    <label>Ativa?</label>
                    <select
                      value={formRegra.ativo ? 'sim' : 'nao'}
                      onChange={(e) => handleChangeRegra('ativo', e.target.value === 'sim')}
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>

                <div className="precificacao-form-actions">
                  <button
                    type="submit"
                    className="precificacao-btn primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Salvando...' : editingRegra ? 'Atualizar regra' : 'Salvar regra'}
                  </button>
                  {editingRegra && (
                    <button
                      type="button"
                      className="precificacao-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {isLoading && regras.length === 0 ? (
                <div className="precificacao-loading">Carregando regras...</div>
              ) : regrasDefaultFirst.length === 0 ? (
                <div className="precificacao-empty">
                  <h3>Nenhuma regra cadastrada</h3>
                  <p>
                    Cadastre a regra padrão (UF em branco) e depois as específicas
                    por UF.
                  </p>
                </div>
              ) : (
                <div className="precificacao-table-wrap">
                  <table className="precificacao-table">
                    <thead>
                      <tr>
                        <th>UF</th>
                        <th>Descrição</th>
                        <th className="numeric">Custo fixo</th>
                        <th className="numeric">Comissão</th>
                        <th className="numeric">Assistência</th>
                        <th className="numeric">Margem</th>
                        <th className="numeric">ICMS</th>
                        <th className="numeric">IPI</th>
                        <th className="numeric">PIS</th>
                        <th className="numeric">COFINS</th>
                        <th className="numeric">Outros</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regrasDefaultFirst.map((regra) => (
                        <tr key={regra.id}>
                          <td>
                            {regra.uf ? (
                              <span className="precificacao-tag uf">{regra.uf}</span>
                            ) : (
                              <span className="precificacao-tag default">Padrão</span>
                            )}
                          </td>
                          <td>{regra.descricao || '-'}</td>
                          <td className="numeric">{Number(regra.custo_fixo_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.comissao_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.assistencia_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.margem_lucro_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.icms_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.ipi_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.pis_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.cofins_percent).toFixed(2)}%</td>
                          <td className="numeric">{Number(regra.outros_impostos_percent).toFixed(2)}%</td>
                          <td>
                            {regra.ativo ? (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>Ativa</span>
                            ) : (
                              <span style={{ color: '#64748b' }}>Inativa</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="precificacao-btn small"
                                onClick={() => handleEditRegra(regra)}
                              >
                                Editar
                              </button>
                              <button
                                className="precificacao-btn small danger"
                                onClick={() => handleDeleteRegra(regra.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'simulador' && (
            <section>
              <h2 className="precificacao-section-title">Simulador de preço de venda</h2>
              <p className="precificacao-section-subtitle">
                Teste o cálculo sem afetar propostas ou preços em produção.
                Frete e instalação não estão incluídos aqui — continuam vindo das
                fontes já utilizadas.
              </p>

              <div className="precificacao-simulador">
                <form onSubmit={handleSimular}>
                  <div className="precificacao-form-grid">
                    <div className="precificacao-form-group">
                      <label>Guindaste</label>
                      <select
                        value={simulador.guindaste_id}
                        onChange={(e) =>
                          setSimulador((prev) => ({ ...prev, guindaste_id: e.target.value }))
                        }
                      >
                        <option value="">Selecione</option>
                        {guindastes.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.codigo_referencia} — {g.modelo} {g.subgrupo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="precificacao-form-group">
                      <label>UF de venda</label>
                      <select
                        value={simulador.uf}
                        onChange={(e) =>
                          setSimulador((prev) => ({ ...prev, uf: e.target.value }))
                        }
                      >
                        <option value="">Selecione</option>
                        {UFS.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="precificacao-form-actions">
                    <button
                      type="submit"
                      className="precificacao-btn primary"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Calculando...' : 'Calcular preço'}
                    </button>
                  </div>
                </form>

                {simuladorResult && (
                  <div className="precificacao-simulador-result">
                    <div className="precificacao-simulador-card">
                      <div className="label">Código / Referência</div>
                      <div className="value">
                        {guindasteSelecionado?.codigo_referencia || '-'}
                      </div>
                    </div>
                    <div className="precificacao-simulador-card">
                      <div className="label">UF</div>
                      <div className="value">{simuladorResult.uf}</div>
                    </div>
                    <div className="precificacao-simulador-card">
                      <div className="label">Custo MP</div>
                      <div className="value">
                        {formatCurrency(Number(guindasteSelecionado?.custo_mp) || 0)}
                      </div>
                    </div>
                    <div className="precificacao-simulador-card">
                      <div className="label">Custo MO</div>
                      <div className="value">
                        {formatCurrency(Number(guindasteSelecionado?.custo_mo) || 0)}
                      </div>
                    </div>
                    <div className="precificacao-simulador-card">
                      <div className="label">Preço de venda calculado</div>
                      <div className="value highlight">
                        {formatCurrency(simuladorResult.preco)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'custos' && (
            <section>
              <h2 className="precificacao-section-title">Custos dos equipamentos</h2>
              <p className="precificacao-section-subtitle">
                Valores de matéria-prima e mão-de-obra cadastrados em cada
                guindaste. Para alterar, use o menu{' '}
                <strong>Gerenciar Guindastes</strong>.
              </p>

              {guindastes.length === 0 ? (
                <div className="precificacao-empty">
                  <h3>Nenhum guindaste com custo cadastrado</h3>
                  <p>
                    Cadastre os valores de MP e MO na tela de Gerenciar Guindastes.
                  </p>
                </div>
              ) : (
                <div className="precificacao-table-wrap">
                  <table className="precificacao-table">
                    <thead>
                      <tr>
                        <th>Código / Referência</th>
                        <th>Modelo / Subgrupo</th>
                        <th className="numeric">Custo MP (sem impostos)</th>
                        <th className="numeric">Custo MO (sem impostos)</th>
                        <th className="numeric">Subtotal custos</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guindastes.map((g) => (
                        <tr key={g.id}>
                          <td>{g.codigo_referencia || '-'}</td>
                          <td>
                            {g.modelo} {g.subgrupo}
                          </td>
                          <td className="numeric">
                            {formatCurrency(Number(g.custo_mp) || 0)}
                          </td>
                          <td className="numeric">
                            {formatCurrency(Number(g.custo_mo) || 0)}
                          </td>
                          <td className="numeric">
                            {formatCurrency((Number(g.custo_mp) || 0) + (Number(g.custo_mo) || 0))}
                          </td>
                          <td>
                            <BlobButton
                              onClick={() => navigate('/gerenciar-guindastes')}
                              style={{ '--blob-color': '#ffffff', color: '#ffffff' }}
                            >
                              Editar
                            </BlobButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
