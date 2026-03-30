import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/PrecosVendaConcessionaria.css';

const PrecosVendaConcessionaria = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [precos, setPrecos] = useState({});
  const [precosCompra, setPrecosCompra] = useState({});
  const [editando, setEditando] = useState({});
  const [salvando, setSalvando] = useState({});
  const [concessionaria, setConcessionaria] = useState(null);

  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!isAdminConcessionaria) {
      navigate('/dashboard-admin');
      return;
    }
    loadData();
  }, [user, isAdminConcessionaria, navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Carregar dados da concessionária
      const conc = await db.getConcessionariaById(user.concessionaria_id);
      setConcessionaria(conc);

      // Carregar guindastes
      const result = await db.getGuindastesLite(1, 1000, true);
      const todosGuindastes = result?.data || [];
      setGuindastes(todosGuindastes);

      // Carregar preços de venda já definidos
      const precosVenda = await db.getConcessionariaPrecos(user.concessionaria_id);
      const precosMap = {};
      precosVenda.forEach(p => {
        precosMap[p.guindaste_id] = p.preco_override;
      });
      setPrecos(precosMap);

      // Carregar preços de compra por região
      const regiao = conc?.regiao_preco || '';
      const precosCompraMap = {};
      
      for (const g of todosGuindastes) {
        const precoCompra = await db.getPrecoCompraPorRegiao(g.id, regiao);
        if (precoCompra && precoCompra > 0) {
          precosCompraMap[g.id] = precoCompra;
        }
      }
      setPrecosCompra(precosCompraMap);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarPreco = (guindasteId) => {
    setEditando(prev => ({ ...prev, [guindasteId]: true }));
  };

  const handleCancelarEdicao = (guindasteId) => {
    setEditando(prev => {
      const novo = { ...prev };
      delete novo[guindasteId];
      return novo;
    });
  };

  const handleSalvarPreco = async (guindasteId) => {
    const novoPreco = precos[guindasteId];
    
    if (!novoPreco || novoPreco <= 0) {
      alert('Preço inválido. Digite um valor maior que zero.');
      return;
    }

    const precoCompra = precosCompra[guindasteId] || 0;
    if (novoPreco < precoCompra) {
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO: O preço de venda (R$ ${formatCurrency(novoPreco)}) é MENOR que o preço de compra (R$ ${formatCurrency(precoCompra)}).\n\nVocê terá PREJUÍZO nesta venda!\n\nDeseja continuar mesmo assim?`
      );
      if (!confirmar) return;
    }

    try {
      setSalvando(prev => ({ ...prev, [guindasteId]: true }));

      await db.upsertConcessionariaPreco({
        concessionaria_id: user.concessionaria_id,
        guindaste_id: guindasteId,
        preco_override: novoPreco,
        updated_by: user.id
      });

      setEditando(prev => {
        const novo = { ...prev };
        delete novo[guindasteId];
        return novo;
      });

      alert('✅ Preço salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preço:', error);
      alert('Erro ao salvar preço. Tente novamente.');
    } finally {
      setSalvando(prev => {
        const novo = { ...prev };
        delete novo[guindasteId];
        return novo;
      });
    }
  };

  const handleChangePreco = (guindasteId, valor) => {
    const numero = parseFloat(valor) || 0;
    setPrecos(prev => ({ ...prev, [guindasteId]: numero }));
  };

  const calcularMarkup = (guindasteId) => {
    const precoCompra = precosCompra[guindasteId] || 0;
    const precoVenda = precos[guindasteId] || 0;
    
    if (precoCompra === 0) return 0;
    const markup = ((precoVenda - precoCompra) / precoCompra) * 100;
    return markup;
  };

  const guindastesFiltrados = guindastes.filter(g => {
    const precoCompra = precosCompra[g.id];
    return precoCompra && precoCompra > 0;
  });

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Preços de Venda"
        subtitle="Defina os preços que seus vendedores irão vender aos clientes"
      />

      <div className="precos-venda-container">
        <div className="precos-venda-card">
          {concessionaria && (
            <div className="precos-venda-info">
              <div className="info-item">
                <span className="info-label">Concessionária:</span>
                <span className="info-value">{concessionaria.nome}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Região de Compra:</span>
                <span className="info-value">{concessionaria.regiao_preco}</span>
              </div>
            </div>
          )}

          <div className="precos-venda-instrucoes">
            <h3>💡 Como funciona:</h3>
            <ol>
              <li><strong>Preço de Compra:</strong> Quanto você pagou pelo guindaste (definido pelo Admin Stark)</li>
              <li><strong>Preço de Venda:</strong> Quanto seus vendedores irão vender aos clientes finais</li>
              <li><strong>Markup:</strong> Sua margem de lucro calculada automaticamente</li>
            </ol>
            <p className="aviso">⚠️ Defina preços maiores que o preço de compra para ter lucro!</p>
          </div>

          {isLoading ? (
            <div className="precos-venda-loading">Carregando guindastes...</div>
          ) : guindastesFiltrados.length === 0 ? (
            <div className="precos-venda-empty">
              <p>Nenhum guindaste disponível para sua região.</p>
              <p>Entre em contato com o Admin Stark para configurar os preços de compra.</p>
            </div>
          ) : (
            <div className="precos-venda-table">
              <div className="precos-venda-row precos-venda-row--header">
                <div>Guindaste</div>
                <div>Preço de Compra</div>
                <div>Preço de Venda</div>
                <div>Markup</div>
                <div>Ações</div>
              </div>

              {guindastesFiltrados.map((g) => {
                const precoCompra = precosCompra[g.id] || 0;
                const precoVenda = precos[g.id] || 0;
                const markup = calcularMarkup(g.id);
                const isEditando = editando[g.id];
                const isSalvando = salvando[g.id];
                const temPrecoDefinido = precoVenda > 0;

                return (
                  <div key={g.id} className="precos-venda-row">
                    <div className="precos-venda-guindaste">
                      <div className="guindaste-nome">{g.modelo} {g.subgrupo}</div>
                      <div className="guindaste-codigo">{g.codigo_referencia}</div>
                    </div>

                    <div className="precos-venda-compra">
                      <span className="valor-compra">{formatCurrency(precoCompra)}</span>
                    </div>

                    <div className="precos-venda-venda">
                      {isEditando ? (
                        <input
                          type="number"
                          className="input-preco"
                          value={precoVenda || ''}
                          onChange={(e) => handleChangePreco(g.id, e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={isSalvando}
                        />
                      ) : (
                        <span className={`valor-venda ${!temPrecoDefinido ? 'valor-venda--vazio' : ''}`}>
                          {temPrecoDefinido ? formatCurrency(precoVenda) : 'Não definido'}
                        </span>
                      )}
                    </div>

                    <div className="precos-venda-markup">
                      {temPrecoDefinido && (
                        <span className={`markup ${markup < 0 ? 'markup--negativo' : markup < 10 ? 'markup--baixo' : 'markup--ok'}`}>
                          {markup >= 0 ? '+' : ''}{markup.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <div className="precos-venda-acoes">
                      {isEditando ? (
                        <>
                          <button
                            className="btn-salvar"
                            onClick={() => handleSalvarPreco(g.id)}
                            disabled={isSalvando}
                          >
                            {isSalvando ? 'Salvando...' : '✓ Salvar'}
                          </button>
                          <button
                            className="btn-cancelar"
                            onClick={() => handleCancelarEdicao(g.id)}
                            disabled={isSalvando}
                          >
                            ✕ Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-editar"
                          onClick={() => handleEditarPreco(g.id)}
                        >
                          ✎ {temPrecoDefinido ? 'Editar' : 'Definir'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PrecosVendaConcessionaria;
