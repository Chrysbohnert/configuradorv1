import React, { useEffect, useState } from 'react';
import { db } from '../config/supabase';

const regioes = [
  { id: 'norte-nordeste', nome: 'Norte-Nordeste', descricao: 'Estados do Norte e Nordeste' },
  { id: 'centro-oeste', nome: 'Centro Oeste', descricao: 'MT, MS, GO, DF' },
  { id: 'sul-sudeste', nome: 'Sul-Sudeste', descricao: 'PR, SC, SP, RJ, MG, ES (exceto RS)' },
  { id: 'rs-com-ie', nome: 'RS com Inscrição Estadual', descricao: '🚜 Produtor Rural (Com IE)', destaque: true },
  { id: 'rs-sem-ie', nome: 'RS sem Inscrição Estadual', descricao: '📄 CNPJ/CPF (Sem IE)', destaque: true },
];

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return '';
  const num = typeof valor === 'string' ? valor.replace(/\D/g, '') : String(Math.round(valor * 100));
  if (!num || num === '0') return '';
  const numPadded = num.padStart(3, '0');
  const inteiro = numPadded.slice(0, -2).replace(/^0+/, '') || '0';
  const decimal = numPadded.slice(-2);
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiroFormatado},${decimal}`;
};

const parseMoeda = (valorFormatado) => {
  if (!valorFormatado) return null;
  const limpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
};

const handleMoedaInput = (e) => {
  const apenasDigitos = e.target.value.replace(/\D/g, '');
  return formatarMoeda(apenasDigitos);
};

const PrecosPorRegiaoModal = ({ guindasteId, open, onClose }) => {
  const [precos, setPrecos] = useState([]);
  const [precosCompra, setPrecosCompra] = useState([]);
  const [precosFormatados, setPrecosFormatados] = useState({});
  const [precosCompraFormatados, setPrecosCompraFormatados] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && guindasteId) {
      fetchPrecos();
    }
    // eslint-disable-next-line
  }, [open, guindasteId]);

  const fetchPrecos = async () => {
    setLoading(true);
    try {
      const [dataStark, dataCompra] = await Promise.all([
        db.getPrecosPorRegiao(guindasteId),
        db.getPrecosCompraPorRegiao(guindasteId),
      ]);
      setPrecos(dataStark || []);
      setPrecosCompra(dataCompra || []);

      const fmtPrecos = {};
      (dataStark || []).forEach(p => {
        if (p.preco) fmtPrecos[p.regiao] = formatarMoeda(p.preco);
      });
      setPrecosFormatados(fmtPrecos);

      const fmtCompra = {};
      (dataCompra || []).forEach(p => {
        if (p.preco) fmtCompra[p.regiao] = formatarMoeda(p.preco);
      });
      setPrecosCompraFormatados(fmtCompra);
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    }
    setLoading(false);
  };

  const handleChange = (regiao, valorDigitado) => {
    const formatado = handleMoedaInput({ target: { value: valorDigitado } });
    setPrecosFormatados(prev => ({ ...prev, [regiao]: formatado }));
    const numerico = parseMoeda(formatado);
    setPrecos(prev => {
      const idx = prev.findIndex(p => p.regiao === regiao);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].preco = numerico;
        return updated;
      } else {
        return [...prev, { guindaste_id: guindasteId, regiao, preco: numerico }];
      }
    });
  };

  const handleChangeCompra = (regiao, valorDigitado) => {
    const formatado = handleMoedaInput({ target: { value: valorDigitado } });
    setPrecosCompraFormatados(prev => ({ ...prev, [regiao]: formatado }));
    const numerico = parseMoeda(formatado);
    setPrecosCompra(prev => {
      const idx = prev.findIndex(p => p.regiao === regiao);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].preco = numerico;
        return updated;
      } else {
        return [...prev, { guindaste_id: guindasteId, regiao, preco: numerico }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const precosParaSalvar = [];
      const precosCompraParaSalvar = [];
      
      for (const regiao of regioes) {
        const precoObj = precos.find(p => p.regiao === regiao.id);
        if (precoObj && precoObj.preco) {
          precosParaSalvar.push({
            regiao: regiao.id,
            preco: typeof precoObj.preco === 'number' ? precoObj.preco : parseFloat(precoObj.preco)
          });
        }

        const precoCompraObj = precosCompra.find(p => p.regiao === regiao.id);
        if (precoCompraObj && precoCompraObj.preco) {
          precosCompraParaSalvar.push({
            regiao: regiao.id,
            preco: typeof precoCompraObj.preco === 'number' ? precoCompraObj.preco : parseFloat(precoCompraObj.preco)
          });
        }
      }
      
      await Promise.all([
        db.salvarPrecosPorRegiao(guindasteId, precosParaSalvar),
        db.salvarPrecosCompraPorRegiao(guindasteId, precosCompraParaSalvar),
      ]);
      alert('Preços salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preços:', error);
      alert('Erro ao salvar preços. Tente novamente.');
    }
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Preços por Região</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div style={{ padding: '15px', background: '#e7f3ff', borderBottom: '2px solid #0056b3', marginBottom: '15px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#004085', lineHeight: '1.6' }}>
            <strong>💡 Dica:</strong> Configure preços diferentes para cada região. Para o <strong>Rio Grande do Sul</strong>, 
            há duas opções: <strong>Com IE</strong> (Produtor Rural) e <strong>Sem IE</strong> (CNPJ/CPF).
          </p>
        </div>
        <div className="modal-form">
          {loading ? (
            <div>Carregando...</div>
          ) : (
            regioes.map(regiao => {
              const precoObj = precos.find(p => p.regiao === regiao.id) || {};
              const precoCompraObj = precosCompra.find(p => p.regiao === regiao.id) || {};
              return (
                <div 
                  className="form-group" 
                  key={regiao.id}
                  style={regiao.destaque ? {
                    padding: '12px',
                    background: '#fff3cd',
                    borderRadius: '6px',
                    border: '2px solid #ffc107',
                    marginBottom: '12px'
                  } : {}}
                >
                  <label style={{ fontWeight: regiao.destaque ? '600' : '500' }}>
                    {regiao.nome}
                    {regiao.descricao && (
                      <small style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        color: '#6c757d', 
                        fontWeight: 'normal',
                        marginTop: '4px'
                      }}>
                        {regiao.descricao}
                      </small>
                    )}
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', marginBottom: '4px', color: '#555' }}>Preço Stark</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={precosFormatados[regiao.id] || ''}
                        onChange={e => handleChange(regiao.id, e.target.value)}
                        placeholder="R$"
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', marginBottom: '4px', color: '#555' }}>Preço Compra Concessionária</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={precosCompraFormatados[regiao.id] || ''}
                        onChange={e => handleChangeCompra(regiao.id, e.target.value)}
                        placeholder="R$"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Cancelar</button>
          <button onClick={handleSave} className="save-btn" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};

export default PrecosPorRegiaoModal; 