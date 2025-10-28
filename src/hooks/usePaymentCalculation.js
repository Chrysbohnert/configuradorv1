import { useState, useEffect, useMemo } from 'react';
import { calcularPagamento } from '../lib/payments';

/**
 * Hook customizado para cálculos de pagamento
 * Centraliza toda a lógica de cálculo de descontos, acréscimos e parcelas
 */
export const usePaymentCalculation = ({
  tipoCliente,
  prazoSelecionado,
  precoBase,
  localInstalacao,
  pagamentoPorConta,
  pagamentoInstalacaoPorConta,
  financiamentoBancario,
  valorSinal,
  formaEntrada,
  descontoAdicional,
  percentualEntrada,
  tipoFrete,
  participacaoRevenda,
  revendaTemIE,
  descontoRevendaIE,
  temGuindasteGSE,
  temGuindasteGSI,
  aplicarRegraGSISemParticipacao,
  tipoFreteSelecionado,
  dadosFreteAtual,
  plan
}) => {
  const [calculoAtual, setCalculoAtual] = useState(null);
  const [erroCalculo, setErroCalculo] = useState('');

  useEffect(() => {
    if (!tipoCliente || !prazoSelecionado || precoBase <= 0) {
      setCalculoAtual(null);
      setErroCalculo('');
      return;
    }

    try {
      // Calcular valores base
      const valorSinalNum = parseFloat(valorSinal) || 0;
      const percentualEntradaNum = parseFloat(percentualEntrada) || 0;
      const entradaParaCalculo = (percentualEntradaNum / 100) * precoBase;

      // Calcular desconto adicional - sempre usa descontoAdicional
      let descontoFinal = descontoAdicional;

      const descontoAdicionalValor = precoBase * (descontoFinal / 100);
      const precoComDescontoAdicional = precoBase - descontoAdicionalValor;

      // Calcular resultado base
      const resultado = calcularPagamento({
        precoBase: precoComDescontoAdicional,
        plan,
        tipoCliente,
        entrada: entradaParaCalculo,
        sinal: valorSinalNum,
        financiamentoBancario: financiamentoBancario === 'sim',
        aplicarRegraGSISemParticipacao
      });

      // Calcular valores de instalação baseado no modelo
      let valorInstalacao = 0;
      let valorInformativoInstalacao = 0;
      let somaInstalacao = false;

      if (tipoCliente === 'cliente' && localInstalacao && pagamentoInstalacaoPorConta) {
        const clientePagaDireto = pagamentoInstalacaoPorConta === 'cliente paga direto';
        const inclusoNoPedido = pagamentoInstalacaoPorConta === 'Incluso no pedido';

        // GSI
        if (temGuindasteGSI) {
          if (clientePagaDireto) {
            valorInformativoInstalacao = 5500;
            somaInstalacao = false;
          } else if (inclusoNoPedido) {
            valorInstalacao = 6350;
            valorInformativoInstalacao = 6350;
            somaInstalacao = true;
          }
        }
        // GSE
        else if (temGuindasteGSE) {
          if (clientePagaDireto) {
            valorInformativoInstalacao = 6500;
            somaInstalacao = false;
          } else if (inclusoNoPedido) {
            valorInstalacao = 7500;
            valorInformativoInstalacao = 7500;
            somaInstalacao = true;
          }
        }
      }

      const valorFrete = tipoFrete === 'cif' && dadosFreteAtual && tipoFreteSelecionado ?
        (tipoFreteSelecionado === 'prioridade' ?
          parseFloat(dadosFreteAtual.valor_prioridade || 0) :
          parseFloat(dadosFreteAtual.valor_reaproveitamento || 0)) : 0;

      // Calcular valores finais
      const valorFinalComFreteEInstalacao = resultado.valorFinal + valorFrete + valorInstalacao;
      const saldoComDesconto = resultado.saldo + valorFrete + valorInstalacao;

      const parcelasAtualizadas = resultado.parcelas?.map(p => ({
        ...p,
        valor: p.valor + (valorFrete + valorInstalacao) / resultado.parcelas.length
      })) || [];

      const entradaTotal = entradaParaCalculo;
      const faltaEntrada = entradaTotal - valorSinalNum;
      const saldo = saldoComDesconto;

      setCalculoAtual({
        ...resultado,
        descontoAdicional: descontoFinal,
        descontoAdicionalValor,
        parcelas: parcelasAtualizadas,
        saldo: saldoComDesconto,
        valorFrete,
        valorInstalacao,
        valorInformativoInstalacao,
        somaInstalacao,
        valorFinalComFrete: valorFinalComFreteEInstalacao,
        entradaTotal,
        faltaEntrada: Math.max(0, faltaEntrada),
        saldoAPagar: saldo,
        valorFinal: valorFinalComFreteEInstalacao
      });
      
      setErroCalculo('');

    } catch (error) {
      setErroCalculo(error.message);
      setCalculoAtual(null);
    }
  }, [
    tipoCliente,
    prazoSelecionado,
    precoBase,
    localInstalacao,
    pagamentoPorConta,
    pagamentoInstalacaoPorConta,
    financiamentoBancario,
    valorSinal,
    formaEntrada,
    descontoAdicional,
    percentualEntrada,
    tipoFrete,
    participacaoRevenda,
    revendaTemIE,
    descontoRevendaIE,
    temGuindasteGSE,
    aplicarRegraGSISemParticipacao,
    tipoFreteSelecionado,
    dadosFreteAtual,
    plan
  ]);

  return { calculoAtual, erroCalculo };
};
