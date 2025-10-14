import React from 'react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Componente do resumo final do pedido
 * @param {Object} props
 * @param {Object} props.clienteData - Dados do cliente
 * @param {Object} props.caminhaoData - Dados do caminhão
 * @param {Array} props.carrinho - Itens do carrinho
 * @param {Object} props.pagamentoData - Dados de pagamento
 * @param {Object} props.user - Dados do usuário logado
 */
const ResumoForm = ({ 
  clienteData, 
  caminhaoData, 
  carrinho, 
  pagamentoData,
  user 
}) => {
  const getTotalCarrinho = () => {
    return carrinho.reduce((total, item) => {
      return total + (item.preco * (item.quantidade || 1));
    }, 0);
  };

  return (
    <div className="resumo-form">
      <h3>Resumo do Pedido</h3>
      
      {/* Dados do Cliente */}
      <div className="resumo-section">
        <h4>Dados do Cliente</h4>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Nome:</span>
            <span className="value">{clienteData.nome || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Documento:</span>
            <span className="value">{clienteData.documento || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Telefone:</span>
            <span className="value">{clienteData.telefone || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Email:</span>
            <span className="value">{clienteData.email || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Endereço:</span>
            <span className="value">{clienteData.endereco || 'Não informado'}</span>
          </div>
          {(clienteData.cidade || clienteData.uf || clienteData.cep) && (
            <div className="data-row">
              <span className="label">Cidade/UF/CEP:</span>
              <span className="value">
                {`${clienteData.cidade || '—'}/${clienteData.uf || '—'}${clienteData.cep ? ' - ' + clienteData.cep : ''}`}
              </span>
            </div>
          )}
          {clienteData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{clienteData.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dados do Caminhão */}
      <div className="resumo-section">
        <h4>Estudo Veicular</h4>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo:</span>
            <span className="value">{caminhaoData.tipo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Marca:</span>
            <span className="value">{caminhaoData.marca || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Modelo:</span>
            <span className="value">{caminhaoData.modelo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Ano:</span>
            <span className="value">{caminhaoData.ano || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Placa:</span>
            <span className="value">{caminhaoData.placa || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Voltagem:</span>
            <span className="value">{caminhaoData.voltagem || 'Não informado'}</span>
          </div>
          {caminhaoData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{caminhaoData.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Itens do Carrinho */}
      <div className="resumo-section">
        <h4>Itens do Pedido</h4>
        <div className="carrinho-resumo">
          {carrinho.map((item, index) => (
            <div key={`${item.id}-${index}`} className="carrinho-item-resumo">
              <div className="item-info">
                <h5>{item.nome}</h5>
                <p>{item.modelo}</p>
                <p>Código: {item.codigo_produto}</p>
              </div>
              <div className="item-details">
                <span>Quantidade: {item.quantidade || 1}</span>
                <span>Preço unitário: {formatCurrency(item.preco)}</span>
                <span className="total">Total: {formatCurrency(item.preco * (item.quantidade || 1))}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="carrinho-total">
          <h3>Total do Carrinho: {formatCurrency(getTotalCarrinho())}</h3>
        </div>
      </div>

      {/* Dados de Pagamento */}
      <div className="resumo-section">
        <h4>Política de Pagamento</h4>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo de Pagamento:</span>
            <span className="value">
              {pagamentoData.tipoPagamento === 'revenda' && 'Revenda'}
              {pagamentoData.tipoPagamento === 'cliente' && 'Cliente'}
              {!pagamentoData.tipoPagamento && 'Não informado'}
            </span>
          </div>
          <div className="data-row">
            <span className="label">Prazo de Pagamento:</span>
            <span className="value">{pagamentoData.prazoPagamento || 'Não informado'}</span>
          </div>
          {pagamentoData.desconto > 0 && (
            <div className="data-row">
              <span className="label">Desconto:</span>
              <span className="value">{pagamentoData.desconto}%</span>
            </div>
          )}
          {pagamentoData.acrescimo > 0 && (
            <div className="data-row">
              <span className="label">Acréscimo:</span>
              <span className="value">{pagamentoData.acrescimo}%</span>
            </div>
          )}
          <div className="data-row">
            <span className="label">Local de Instalação:</span>
            <span className="value">{pagamentoData.localInstalacao || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Pagamento por Conta de:</span>
            <span className="value">
              {pagamentoData.tipoInstalacao === 'cliente' && 'Cliente'}
              {pagamentoData.tipoInstalacao === 'fabrica' && 'Fábrica'}
              {!pagamentoData.tipoInstalacao && 'Não informado'}
            </span>
          </div>
          {pagamentoData.valorFinal > 0 && (
            <div className="data-row total-row">
              <span className="label">Valor Final:</span>
              <span className="value">{formatCurrency(pagamentoData.valorFinal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Informações do Vendedor */}
      <div className="resumo-section">
        <h4>Vendedor Responsável</h4>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Nome:</span>
            <span className="value">{user?.nome || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Email:</span>
            <span className="value">{user?.email || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Região:</span>
            <span className="value">{user?.regiao || 'Não informado'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumoForm;
