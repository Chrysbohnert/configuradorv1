import React, { useState, useEffect, useMemo } from 'react';
import { getPaymentPlans, getPlanLabel, getPlanByDescription } from '../../services/paymentPlans';
import { calcularPagamento } from '../../lib/payments';
import { formatCurrency } from '../../utils/formatters';
import './PaymentPolicy.css';

/**
 * Componente de Política de Pagamento refatorado
 * @param {Object} props
 * @param {number} props.precoBase - Preço base do carrinho
 * @param {Function} props.onPaymentComputed - Callback quando o cálculo é feito
 * @param {Function} props.onPlanSelected - Callback quando um plano é selecionado
 * @param {Object} props.errors - Erros de validação
 * @param {Object} props.user - Dados do usuário logado
 * @param {boolean} props.clienteTemIE - Se o cliente tem Inscrição Estadual
 * @param {Function} props.onClienteIEChange - Callback para mudar o estado de IE
 */
const PaymentPolicy = ({ 
  precoBase = 0, 
  onPaymentComputed, 
  onPlanSelected,
  errors = {},
  user = null,
  clienteTemIE = true,
  onClienteIEChange
}) => {
  const [tipoCliente, setTipoCliente] = useState(''); // 'revenda' | 'cliente'
  const [prazoSelecionado, setPrazoSelecionado] = useState('');
  const [localInstalacao, setLocalInstalacao] = useState('');
  const [pagamentoPorConta, setPagamentoPorConta] = useState(''); // 'cliente' | 'fabrica'
  const [valorSinal, setValorSinal] = useState('');
  const [percentualEntrada, setPercentualEntrada] = useState(''); // '30' | '50'
  const [formaEntrada, setFormaEntrada] = useState(''); // Forma de pagamento da entrada
  const [descontoAdicional, setDescontoAdicional] = useState(0); // Desconto adicional do vendedor (0-3%)
  const [calculoAtual, setCalculoAtual] = useState(null);
  const [erroCalculo, setErroCalculo] = useState('');

  // Lista de planos disponíveis baseado no tipo de cliente e percentual de entrada
  const planosDisponiveis = useMemo(() => {
    if (!tipoCliente) return [];
    
    const todosPlanos = getPaymentPlans(tipoCliente);
    
    // Se for cliente e tiver selecionado percentual de entrada
    if (tipoCliente === 'cliente' && percentualEntrada) {
      const percentualNum = parseFloat(percentualEntrada) / 100; // Converter 30 para 0.30
      
      // Filtrar planos que exigem esse percentual específico
      return todosPlanos.filter(plan => 
        plan.entry_percent_required === percentualNum
      );
    }
    
    // Para revenda ou cliente sem percentual, mostrar planos que não exigem percentual específico
    return todosPlanos.filter(plan => !plan.entry_percent_required);
  }, [tipoCliente, percentualEntrada]);

  // Efeito para recalcular quando mudar o tipo, prazo ou preço base
  useEffect(() => {
    // Se for À Vista, zerar o valor do sinal
    if (prazoSelecionado === 'À Vista' && valorSinal) {
      setValorSinal('');
    }
    
    if (!tipoCliente || !prazoSelecionado || !precoBase) {
      setCalculoAtual(null);
      setErroCalculo('');
      return;
    }

    try {
      const plan = getPlanByDescription(prazoSelecionado, tipoCliente);
      
      if (!plan) {
        setErroCalculo('Plano não encontrado');
        setCalculoAtual(null);
        return;
      }

      const resultado = calcularPagamento({
        precoBase,
        plan,
        dataEmissaoNF: new Date()
      });

      // Aplicar desconto adicional do vendedor (sobre o valor ajustado)
      const descontoAdicionalValor = resultado.valorAjustado * (descontoAdicional / 100);
      const valorFinalComDescontoAdicional = resultado.valorAjustado - descontoAdicionalValor;

      // Recalcular parcelas com o valor final (com desconto adicional)
      const saldoComDesconto = valorFinalComDescontoAdicional - resultado.entrada;
      const numParcelas = resultado.parcelas.length;
      const valorParcela = saldoComDesconto / numParcelas;
      
      const parcelasAtualizadas = [];
      let somaAcumulada = 0;
      
      for (let i = 0; i < numParcelas; i++) {
        const isUltima = i === numParcelas - 1;
        const valor = isUltima 
          ? Math.round((saldoComDesconto - somaAcumulada) * 100) / 100
          : Math.round(valorParcela * 100) / 100;
        
        somaAcumulada += valor;
        
        parcelasAtualizadas.push({
          numero: i + 1,
          valor
        });
      }

      setCalculoAtual({
        ...resultado,
        descontoAdicionalValor,
        valorFinalComDescontoAdicional,
        parcelas: parcelasAtualizadas,
        saldo: saldoComDesconto
      });
      setErroCalculo('');

      // Notificar o componente pai
      if (onPaymentComputed) {
        // Calcular valores de entrada e saldo (apenas para cliente)
        // O sinal FAZ PARTE da entrada total
        const valorSinalNum = parseFloat(valorSinal) || 0;
        const percentualEntradaNum = parseFloat(percentualEntrada) || 0;
        const entradaTotal = tipoCliente === 'cliente' && percentualEntradaNum > 0 
          ? (valorFinalComDescontoAdicional * percentualEntradaNum / 100) 
          : 0;
        const faltaEntrada = entradaTotal - valorSinalNum; // Quanto falta para completar a entrada
        const saldo = valorFinalComDescontoAdicional - entradaTotal; // Saldo após pagar a entrada completa
        
        onPaymentComputed({
          ...resultado,
          plan,
          tipoCliente,
          localInstalacao,
          pagamentoPorConta,
          valorSinal: valorSinalNum,
          percentualEntrada: percentualEntradaNum,
          entradaTotal: entradaTotal,
          faltaEntrada: Math.max(0, faltaEntrada),
          saldoAPagar: saldo,
          formaEntrada: formaEntrada, // Forma de pagamento da entrada
          descontoAdicional: descontoAdicional, // Percentual do desconto adicional
          descontoAdicionalValor: descontoAdicionalValor, // Valor do desconto adicional
          parcelas: parcelasAtualizadas, // Parcelas recalculadas com desconto adicional
          saldo: saldoComDesconto, // Saldo atualizado
          // Manter compatibilidade com estrutura antiga
          tipoPagamento: tipoCliente,
          prazoPagamento: prazoSelecionado,
          desconto: plan.discount_percent ? (plan.discount_percent * 100) : 0,
          acrescimo: plan.surcharge_percent ? (plan.surcharge_percent * 100) : 0,
          valorFinal: valorFinalComDescontoAdicional, // Valor final com desconto adicional aplicado
          tipoInstalacao: pagamentoPorConta
        });
      }

      if (onPlanSelected) {
        onPlanSelected(plan);
      }

    } catch (error) {
      setErroCalculo(error.message);
      setCalculoAtual(null);
      
      if (onPaymentComputed) {
        onPaymentComputed(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCliente, prazoSelecionado, precoBase, localInstalacao, pagamentoPorConta, valorSinal, formaEntrada, descontoAdicional, percentualEntrada]);

  // Resetar prazo quando mudar tipo de cliente
  const handleTipoClienteChange = (novoTipo) => {
    setTipoCliente(novoTipo);
    setPrazoSelecionado(''); // Limpar seleção de prazo
    setCalculoAtual(null);
    setErroCalculo('');
  };

  // Resetar prazo quando mudar percentual de entrada
  const handlePercentualEntradaChange = (novoPercentual) => {
    setPercentualEntrada(novoPercentual);
    setPrazoSelecionado(''); // Limpar seleção de prazo
    setCalculoAtual(null);
    setErroCalculo('');
  };

  return (
    <div className="payment-policy">
      {/* Seleção de Tipo de Cliente e Prazo */}
      <div className="payment-section">
        <h3>Política de Pagamento</h3>
        
        <div className="form-group">
          <label htmlFor="tipoCliente">
            Tipo de Cliente e Pagamento *
          </label>
          <select
            id="tipoCliente"
            value={tipoCliente}
            onChange={(e) => handleTipoClienteChange(e.target.value)}
            className={errors.tipoPagamento ? 'error' : ''}
          >
            <option value="">Selecione o tipo de cliente</option>
            <option value="revenda">Revenda</option>
            <option value="cliente">Cliente</option>
          </select>
          {errors.tipoPagamento && (
            <span className="error-message">{errors.tipoPagamento}</span>
          )}
        </div>

        {/* Campo de IE - apenas para vendedores do Rio Grande do Sul quando selecionar Cliente */}
        {tipoCliente === 'cliente' && user?.regiao === 'rio grande do sul' && (
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label htmlFor="clienteIE" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#495057' }}>
              Cliente possui Inscrição Estadual? <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <label 
                onClick={() => onClienteIEChange && onClienteIEChange(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px', 
                  cursor: 'pointer', 
                  padding: '10px 20px', 
                  background: clienteTemIE ? '#007bff' : '#ffffff', 
                  color: clienteTemIE ? '#ffffff' : '#495057', 
                  borderRadius: '6px', 
                  border: clienteTemIE ? '2px solid #007bff' : '2px solid #ced4da', 
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: clienteTemIE ? '600' : '500',
                  flex: '1',
                  boxShadow: clienteTemIE ? '0 2px 8px rgba(0, 123, 255, 0.3)' : 'none',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!clienteTemIE) {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!clienteTemIE) {
                    e.currentTarget.style.borderColor = '#ced4da';
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                <input 
                  type="radio" 
                  name="clienteIE" 
                  checked={clienteTemIE} 
                  onChange={() => {}}
                  style={{ 
                    cursor: 'pointer',
                    accentColor: '#007bff',
                    width: '16px',
                    height: '16px'
                  }}
                />
                <span>Com IE</span>
              </label>
              <label 
                onClick={() => onClienteIEChange && onClienteIEChange(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px', 
                  cursor: 'pointer', 
                  padding: '10px 20px', 
                  background: !clienteTemIE ? '#007bff' : '#ffffff', 
                  color: !clienteTemIE ? '#ffffff' : '#495057', 
                  borderRadius: '6px', 
                  border: !clienteTemIE ? '2px solid #007bff' : '2px solid #ced4da', 
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: !clienteTemIE ? '600' : '500',
                  flex: '1',
                  boxShadow: !clienteTemIE ? '0 2px 8px rgba(0, 123, 255, 0.3)' : 'none',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                  if (clienteTemIE) {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (clienteTemIE) {
                    e.currentTarget.style.borderColor = '#ced4da';
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                <input 
                  type="radio" 
                  name="clienteIE" 
                  checked={!clienteTemIE} 
                  onChange={() => {}}
                  style={{ 
                    cursor: 'pointer',
                    accentColor: '#007bff',
                    width: '16px',
                    height: '16px'
                  }}
                />
                <span>Sem IE</span>
              </label>
            </div>
          </div>
        )}
      
      {/* Resumo do Carrinho - só aparece depois de selecionar Revenda ou Cliente */}
      {tipoCliente && (
        <div style={{ marginTop: '20px' }}>
          <h3>Resumo do Pedido</h3>
          <div className="summary-box">
            <div className="summary-row">
              <span className="summary-label">Valor Total do Carrinho:</span>
              <span className="summary-value">{formatCurrency(precoBase)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Campos de sinal e entrada apenas para "cliente" */}
      {tipoCliente === 'cliente' && (
        <>
          {/* Campo de sinal: não aparece quando prazo é "À Vista" */}
            {prazoSelecionado !== 'À Vista' && (
              <div className="form-group">
                <label htmlFor="valorSinal">
                  Valor do Sinal
                </label>
                <input
                  id="valorSinal"
                  type="number"
                  value={valorSinal}
                  onChange={(e) => setValorSinal(e.target.value)}
                  placeholder="Digite o valor do sinal"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="percentualEntrada">
                Percentual de Entrada *
              </label>
              <select
                id="percentualEntrada"
                value={percentualEntrada}
                onChange={(e) => handlePercentualEntradaChange(e.target.value)}
              >
                <option value="">Selecione o percentual</option>
                <option value="30">30%</option>
                <option value="50">50%</option>
              </select>
              <small style={{ display: 'block', marginTop: '5px', color: '#6c757d', fontSize: '0.875em' }}>
                {percentualEntrada === '30' && 'Planos específicos para 30% de entrada (sem desconto/acréscimo)'}
                {percentualEntrada === '50' && 'Planos específicos para 50% de entrada (com descontos de 1% a 5%)'}
              </small>
            </div>
          </>
      )}

      <div className="form-group">
          <label htmlFor="prazoPagamento">
            Prazo de Pagamento *
          </label>
          <select
            id="prazoPagamento"
            value={prazoSelecionado}
            onChange={(e) => setPrazoSelecionado(e.target.value)}
            disabled={!tipoCliente || (tipoCliente === 'cliente' && !percentualEntrada)}
            className={errors.prazoPagamento ? 'error' : ''}
          >
            <option value="">
              {!tipoCliente && 'Selecione primeiro o tipo de cliente'}
              {tipoCliente === 'cliente' && !percentualEntrada && 'Selecione o percentual de entrada primeiro'}
              {tipoCliente === 'revenda' && 'Selecione o prazo'}
              {tipoCliente === 'cliente' && percentualEntrada && 'Selecione o prazo'}
            </option>
            {planosDisponiveis.map((plan, idx) => (
              <option key={idx} value={plan.description}>
                {getPlanLabel(plan)}
              </option>
            ))}
          </select>
          {errors.prazoPagamento && (
            <span className="error-message">{errors.prazoPagamento}</span>
          )}
      </div>

      {/* Campo de Desconto Adicional do Vendedor */}
      {prazoSelecionado && (
          <div className="form-group">
            <label htmlFor="descontoAdicional">
              Desconto Adicional do Vendedor
            </label>
            <select
              id="descontoAdicional"
              value={descontoAdicional}
              onChange={(e) => setDescontoAdicional(parseFloat(e.target.value))}
            >
              <option value="0">Sem desconto adicional</option>
              <option value="0.5">0,5%</option>
              <option value="1">1%</option>
              <option value="1.5">1,5%</option>
              <option value="2">2%</option>
              <option value="2.5">2,5%</option>
              <option value="3">3%</option>
            </select>
            <small style={{ display: 'block', marginTop: '5px', color: '#6c757d', fontSize: '0.875em' }}>
              Desconto adicional aplicado sobre o valor total do carrinho (máximo 3%)
            </small>
          </div>
      )}
    </div>

      {/* Mensagem de Erro */}
      {erroCalculo && (
        <div className="payment-section">
          <div className="error-box">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{erroCalculo}</span>
          </div>
        </div>
      )}

      {/* Resumo Automático do Cálculo */}
      {calculoAtual && !erroCalculo && (() => {
        // Calcular valores de entrada e saldo
        // O sinal FAZ PARTE da entrada total
        const valorSinalNum = parseFloat(valorSinal) || 0;
        const percentualEntradaNum = parseFloat(percentualEntrada) || 0;
        const entradaTotal = tipoCliente === 'cliente' && percentualEntradaNum > 0 
          ? (calculoAtual.valorFinalComDescontoAdicional * percentualEntradaNum / 100) 
          : 0;
        const faltaEntrada = entradaTotal - valorSinalNum; // Quanto falta para completar a entrada
        const saldo = calculoAtual.valorFinalComDescontoAdicional - entradaTotal; // Saldo após pagar a entrada completa
        
        return (
          <div className="payment-section">
            <h3>Cálculo do Pagamento</h3>
            
            <div className="calculation-box">
              <div className="calc-row">
                <span className="calc-label">Preço Base:</span>
                <span className="calc-value">{formatCurrency(calculoAtual.precoBase)}</span>
              </div>

              {calculoAtual.descontoValor > 0 && (
                <div className="calc-row discount">
                  <span className="calc-label">Condições de pagamento:</span>
                  <span className="calc-value">- {formatCurrency(calculoAtual.descontoValor)}</span>
                </div>
              )}

              {calculoAtual.acrescimoValor > 0 && (
                <div className="calc-row surcharge">
                  <span className="calc-label">Acréscimo:</span>
                  <span className="calc-value">+ {formatCurrency(calculoAtual.acrescimoValor)}</span>
                </div>
              )}

              {descontoAdicional > 0 && calculoAtual.descontoAdicionalValor > 0 && (
                <div className="calc-row discount">
                  <span className="calc-label">Desconto Adicional do Vendedor ({descontoAdicional}%):</span>
                  <span className="calc-value">- {formatCurrency(calculoAtual.descontoAdicionalValor)}</span>
                </div>
              )}

              <div className="calc-row separator">
                <span className="calc-label">Valor Ajustado:</span>
                <span className="calc-value bold">{formatCurrency(calculoAtual.valorFinalComDescontoAdicional)}</span>
              </div>

              {/* Mostrar valores de entrada (apenas para cliente) */}
              {tipoCliente === 'cliente' && entradaTotal > 0 && (
                <>
                  <div className="calc-row entry" style={{ borderTop: '1px solid #dee2e6', paddingTop: '10px', marginTop: '10px' }}>
                    <span className="calc-label">Entrada Total ({percentualEntradaNum}%):</span>
                    <span className="calc-value" style={{ fontWeight: 'bold' }}>{formatCurrency(entradaTotal)}</span>
                  </div>
                  {valorSinalNum > 0 && (
                    <>
                      <div className="calc-row entry" style={{ fontSize: '0.95em', color: '#28a745' }}>
                        <span className="calc-label">↳ Sinal (já pago):</span>
                        <span className="calc-value">- {formatCurrency(valorSinalNum)}</span>
                      </div>
                      <div className="calc-row entry" style={{ fontSize: '0.95em', paddingLeft: '10px' }}>
                        <span className="calc-label">↳ Falta pagar de entrada:</span>
                        <span className="calc-value" style={{ fontWeight: 'bold' }}>{formatCurrency(Math.max(0, faltaEntrada))}</span>
                      </div>
                      
                      {/* Campo para forma de pagamento da entrada */}
                      <div className="form-group" style={{ marginTop: '12px', marginLeft: '10px' }}>
                        <label htmlFor="formaEntrada" style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                          Forma de pagamento da entrada:
                        </label>
                        <input
                          id="formaEntrada"
                          type="text"
                          value={formaEntrada}
                          onChange={(e) => setFormaEntrada(e.target.value)}
                          placeholder="Ex: Boleto, Pix, Transferência..."
                          maxLength="100"
                          style={{ fontSize: '0.9em' }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {calculoAtual.entrada > 0 && (
                <div className="calc-row entry">
                  <span className="calc-label">Entrada (plano):</span>
                  <span className="calc-value">{formatCurrency(calculoAtual.entrada)}</span>
                </div>
              )}

              {calculoAtual.parcelas && calculoAtual.parcelas.length > 0 && (
                <div className="calc-parcelas">
                  <span className="calc-label">Parcelas:</span>
                  <div className="parcelas-list">
                    {calculoAtual.parcelas.map((parcela) => (
                      <div key={parcela.numero} className="parcela-item">
                        <span className="parcela-numero">{parcela.numero}ª parcela:</span>
                        <span className="parcela-valor">{formatCurrency(parcela.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="calc-row total">
                <span className="calc-label">Total:</span>
                <span className="calc-value bold">{formatCurrency(calculoAtual.valorFinalComDescontoAdicional)}</span>
              </div>

              {/* Mostrar saldo restante (apenas para cliente com entrada) */}
              {tipoCliente === 'cliente' && entradaTotal > 0 && (
                <div className="calc-row separator" style={{ marginTop: '12px', borderTop: '2px solid #007bff', paddingTop: '12px' }}>
                  <span className="calc-label" style={{ fontSize: '1.05em' }}>Saldo a Pagar (após entrada):</span>
                  <span className="calc-value bold" style={{ color: '#007bff', fontSize: '1.1em' }}>
                    {formatCurrency(saldo)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Campos Manuais */}
      <div className="payment-section">
        <h3>Informações Adicionais</h3>
        
        <div className="form-group">
          <label htmlFor="localInstalacao">
            Local de Instalação *
          </label>
          <input
            id="localInstalacao"
            type="text"
            value={localInstalacao}
            onChange={(e) => setLocalInstalacao(e.target.value)}
            placeholder="Em qual mecânica o guindaste será instalado?"
            className={errors.localInstalacao ? 'error' : ''}
          />
          {errors.localInstalacao && (
            <span className="error-message">{errors.localInstalacao}</span>
          )}
        </div>

        <div className="form-group">
          <label>Pagamento por conta de: *</label>
          <div className="radio-group">
            <label className={`radio-option ${pagamentoPorConta === 'cliente' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="pagamentoPorConta"
                value="cliente"
                checked={pagamentoPorConta === 'cliente'}
                onChange={(e) => setPagamentoPorConta(e.target.value)}
              />
              <span>Cliente</span>
            </label>
            <label className={`radio-option ${pagamentoPorConta === 'fabrica' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="pagamentoPorConta"
                value="fabrica"
                checked={pagamentoPorConta === 'fabrica'}
                onChange={(e) => setPagamentoPorConta(e.target.value)}
              />
              <span>Fábrica</span>
            </label>
          </div>
          {errors.tipoInstalacao && (
            <span className="error-message">{errors.tipoInstalacao}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPolicy;

