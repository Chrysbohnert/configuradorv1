import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import SeletorCliente from '../../components/Clientes/SeletorCliente';
import { getAcessorios } from '../../api/acessorios';
import { createProposta } from '../../api/propostas';
import { formatCurrency } from '../../utils/formatters';
import { isAdminFull } from '../../utils/permissions';
import PDFAcessorios from '../../components/PDFAcessorios';
import '../../styles/NovaPropostaAcessorio.css';

const steps = [
  { id: 1, title: 'Cliente', description: 'Selecione o cliente' },
  { id: 2, title: 'Acessórios', description: 'Escolha os itens' },
  { id: 3, title: 'Pagamento', description: 'Condição financeira' },
  { id: 4, title: 'Resumo', description: 'Revisar e gerar PDF' },
];

const NovaPropostaAcessorio = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [acessorios, setAcessorios] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [selecionados, setSelecionados] = useState({});
  const [pagamento, setPagamento] = useState({
    parcelas: 1,
    formaPagamento: '',
    observacoes: '',
  });
  const [savedProposta, setSavedProposta] = useState(null);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    if (!isAdminFull(user)) {
      navigate('/dashboard-admin');
    }
  }, [user, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getAcessorios();
        setAcessorios((data || []).filter((a) => a.ativo !== false));
      } catch (error) {
        console.error('Erro ao carregar acessórios:', error);
        alert('Erro ao carregar acessórios. Verifique a conexão.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const maxParcelas = useMemo(() => {
    const selectedIds = Object.keys(selecionados).filter((id) => selecionados[id] > 0);
    if (selectedIds.length === 0) return 12;
    return Math.min(
      ...selectedIds.map((id) => {
        const item = acessorios.find((a) => String(a.id) === id);
        return item?.max_parcelas || 1;
      })
    );
  }, [selecionados, acessorios]);

  useEffect(() => {
    if (pagamento.parcelas > maxParcelas) {
      setPagamento((prev) => ({ ...prev, parcelas: maxParcelas }));
    }
  }, [maxParcelas, pagamento.parcelas]);

  const itensSelecionados = useMemo(() => {
    return Object.entries(selecionados)
      .filter(([, qtd]) => qtd > 0)
      .map(([id, qtd]) => {
        const item = acessorios.find((a) => String(a.id) === id);
        return { ...item, quantidade: qtd };
      })
      .filter(Boolean);
  }, [selecionados, acessorios]);

  const total = useMemo(() => {
    return itensSelecionados.reduce((sum, item) => sum + (Number(item.preco) || 0) * item.quantidade, 0);
  }, [itensSelecionados]);

  const handleQtdChange = (id, value) => {
    const qtd = parseInt(value, 10);
    setSelecionados((prev) => ({
      ...prev,
      [id]: Number.isFinite(qtd) && qtd > 0 ? qtd : 0,
    }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !cliente) {
      alert('Selecione um cliente para continuar.');
      return;
    }
    if (currentStep === 2 && itensSelecionados.length === 0) {
      alert('Selecione pelo menos um acessório.');
      return;
    }
    if (currentStep === 3 && !pagamento.formaPagamento) {
      alert('Informe a forma de pagamento.');
      return;
    }
    if (currentStep < steps.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSalvar = async () => {
    try {
      setIsLoading(true);
      const timestamp = Date.now().toString();
      const numeroProposta = `ACE${timestamp.slice(-7)}`;
      const acessoriosPayload = itensSelecionados.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        foto_url: item.foto_url,
        preco: Number(item.preco) || 0,
        quantidade: item.quantidade,
      }));

      const payload = {
        numero_proposta: numeroProposta,
        data: new Date().toISOString(),
        vendedor_id: user.id,
        vendedor_nome: user.nome || 'Admin',
        cliente_id: cliente?.id || null,
        cliente_nome: cliente?.nome || cliente?.razao_social || 'Não informado',
        cliente_documento: cliente?.documento || null,
        cliente_uf: cliente?.uf || null,
        cliente_cidade: cliente?.cidade || null,
        valor_total: total,
        tipo: 'proposta',
        status: 'finalizado',
        canal_venda: 'Venda Direta',
        segmento_cliente: 'acessorio',
        produto_principal: acessoriosPayload.map((a) => a.nome).join(', ').slice(0, 250),
        linha_produto: 'Acessórios',
        dados_serializados: {
          tipo_fluxo: 'acessorio',
          clienteData: cliente,
          acessorios: acessoriosPayload,
          pagamentoData: pagamento,
        },
      };

      const proposta = await createProposta(payload);
      setSavedProposta(proposta);
      setShowPdf(true);
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      alert(`Erro ao salvar proposta: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdminFull(user)) return null;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="npac-step">
            <h2>Cliente</h2>
            <SeletorCliente
              clienteSelecionado={cliente}
              onClienteSelecionado={setCliente}
            />
            {cliente && (
              <div className="npac-cliente-card">
                <strong>{cliente.nome || cliente.razao_social}</strong>
                <span>{cliente.documento}</span>
                <span>{cliente.telefone}</span>
                <span>{cliente.email}</span>
                <span>{cliente.cidade} {cliente.uf && ` - ${cliente.uf}`}</span>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="npac-step">
            <h2>Acessórios</h2>
            {isLoading ? (
              <p>Carregando...</p>
            ) : acessorios.length === 0 ? (
              <p>Nenhum acessório ativo cadastrado.</p>
            ) : (
              <div className="npac-grid">
                {acessorios.map((item) => {
                  const qtd = selecionados[String(item.id)] || 0;
                  return (
                    <div key={item.id} className={`npac-card ${qtd > 0 ? 'selected' : ''}`}>
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nome} className="npac-thumb" />
                      ) : (
                        <div className="npac-no-thumb">📦</div>
                      )}
                      <div className="npac-card-body">
                        <h3>{item.nome}</h3>
                        <small>{item.codigo}</small>
                        <p>{item.descricao || 'Sem descrição'}</p>
                        <div className="npac-preco">{formatCurrency(Number(item.preco) || 0)}</div>
                        <div className="npac-qtd">
                          <label>Qtd:</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={qtd || ''}
                            onChange={(e) => handleQtdChange(String(item.id), e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="npac-step">
            <h2>Pagamento</h2>
            <div className="npac-form-group">
              <label>Forma de Pagamento *</label>
              <select
                value={pagamento.formaPagamento}
                onChange={(e) => setPagamento({ ...pagamento, formaPagamento: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="a_vista">À vista</option>
                <option value="boleto">Boleto</option>
                <option value="transferencia">Transferência</option>
                <option value="financiamento">Financiamento Bancário</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="pix">PIX</option>
              </select>
            </div>
            <div className="npac-form-group">
              <label>Parcelas (máx. {maxParcelas}x nesta proposta)</label>
              <select
                value={pagamento.parcelas}
                onChange={(e) => setPagamento({ ...pagamento, parcelas: Number(e.target.value) })}
              >
                {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
            <div className="npac-form-group">
              <label>Observações</label>
              <textarea
                rows="3"
                value={pagamento.observacoes}
                onChange={(e) => setPagamento({ ...pagamento, observacoes: e.target.value })}
                placeholder="Condições adicionais, prazos ou entrega..."
              />
            </div>
            <div className="npac-total">
              <span>Total:</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="npac-step">
            <h2>Resumo</h2>
            <div className="npac-resumo">
              <div className="npac-resumo-section">
                <h3>Cliente</h3>
                <p>{cliente?.nome || cliente?.razao_social}</p>
                <p>{cliente?.documento}</p>
              </div>
              <div className="npac-resumo-section">
                <h3>Acessórios</h3>
                {itensSelecionados.map((item) => (
                  <div key={item.id} className="npac-resumo-item">
                    <span>{item.quantidade}x {item.nome} ({item.codigo})</span>
                    <strong>{formatCurrency(Number(item.preco) * item.quantidade)}</strong>
                  </div>
                ))}
              </div>
              <div className="npac-resumo-section">
                <h3>Pagamento</h3>
                <p>{pagamento.formaPagamento.replace('_', ' ')} — {pagamento.parcelas}x</p>
                {pagamento.observacoes && <p>{pagamento.observacoes}</p>}
              </div>
              <div className="npac-total">
                <span>Total:</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>
            {savedProposta ? (
              <div className="npac-actions">
                <button type="button" className="npac-btn-secondary" onClick={() => setShowPdf(!showPdf)}>
                  {showPdf ? 'Ocultar PDF' : 'Ver PDF'}
                </button>
                <button type="button" className="npac-btn-primary" onClick={() => navigate('/admin/propostas')}>
                  Ir para Propostas
                </button>
              </div>
            ) : (
              <div className="npac-actions">
                <button type="button" className="npac-btn-primary" onClick={handleSalvar} disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar e Gerar PDF'}
                </button>
              </div>
            )}
            {showPdf && savedProposta && (
              <PDFAcessorios
                proposta={savedProposta}
                cliente={cliente}
                acessorios={itensSelecionados}
                pagamento={pagamento}
                total={total}
                vendedor={user}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Nova Proposta de Acessórios"
        subtitle="Criar proposta comercial somente de acessórios"
      />
      <div className="npac-container">
        <div className="npac-progress">
          <div className="npac-progress-bar" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
        </div>
        <div className="npac-steps">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`npac-step-pill ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            >
              <span className="npac-step-num">{step.id}</span>
              <span>{step.title}</span>
            </div>
          ))}
        </div>
        <div className="npac-content">{renderStep()}</div>
        <div className="npac-nav">
          <button type="button" className="npac-btn-secondary" onClick={handlePrevious} disabled={currentStep === 1}>
            Voltar
          </button>
          {currentStep < steps.length ? (
            <button type="button" className="npac-btn-primary" onClick={handleNext}>
              Avançar
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default NovaPropostaAcessorio;
