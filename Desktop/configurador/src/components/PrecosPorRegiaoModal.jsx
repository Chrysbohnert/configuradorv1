import React, { useEffect, useState } from 'react';
import { db } from '../config/supabase';

const regioes = [
  { id: 'norte', nome: 'Norte' },
  { id: 'nordeste', nome: 'Nordeste' },
  { id: 'sudeste', nome: 'Sudeste' },
  { id: 'sul', nome: 'Sul' },
  { id: 'centro-oeste', nome: 'Centro-Oeste' },
];

const PrecosPorRegiaoModal = ({ guindasteId, open, onClose }) => {
  const [precos, setPrecos] = useState([]);
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
      const data = await db.getPrecosPorRegiao(guindasteId);
      setPrecos(data || []);
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    }
    setLoading(false);
  };

  const handleChange = (regiao, value) => {
    setPrecos(prev => {
      const idx = prev.findIndex(p => p.regiao === regiao);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].preco = value;
        return updated;
      } else {
        return [...prev, { guindaste_id: guindasteId, regiao, preco: value }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const precosParaSalvar = [];
      
      for (const regiao of regioes) {
        const precoObj = precos.find(p => p.regiao === regiao.id);
        if (precoObj && precoObj.preco) {
          precosParaSalvar.push({
            regiao: regiao.id,
            preco: parseFloat(precoObj.preco)
          });
        }
      }
      
      await db.salvarPrecosPorRegiao(guindasteId, precosParaSalvar);
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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>Preços por Região</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-form">
          {loading ? (
            <div>Carregando...</div>
          ) : (
            regioes.map(regiao => {
              const precoObj = precos.find(p => p.regiao === regiao.id) || {};
              return (
                <div className="form-group" key={regiao.id}>
                  <label>{regiao.nome}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precoObj.preco || ''}
                    onChange={e => handleChange(regiao.id, e.target.value)}
                    placeholder="Preço em R$"
                  />
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