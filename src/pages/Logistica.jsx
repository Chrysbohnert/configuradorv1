import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { startOfWeek, startOfMonth, addDays, isToday, format as dfFormat } from 'date-fns';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/Dashboard.css';
import '../styles/Logistica.css';

const Logistica = () => {
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const [isLoading, setIsLoading] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [notaAtual, setNotaAtual] = useState({ id: null, data: '', titulo: '', descricao: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [prontaEntregaDescricao, setProntaEntregaDescricao] = useState('');
  const [isSavingDescricao, setIsSavingDescricao] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const ev = await db.getEventosLogistica();
      setEventos(ev);
      
      // Carregar descrição de pronta entrega
      const descricaoData = await db.getProntaEntregaDescricao();
      setProntaEntregaDescricao(descricaoData?.descricao || '');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarDescricao = async () => {
    // Validar se é admin
    if (user?.tipo !== 'admin') {
      alert('Apenas administradores podem salvar a descrição de pronta entrega.');
      return;
    }

    try {
      setIsSavingDescricao(true);
      console.log('Salvando descrição:', prontaEntregaDescricao);
      const result = await db.updateProntaEntregaDescricao(prontaEntregaDescricao);
      console.log('Descrição salva com sucesso:', result);
      alert('Descrição de pronta entrega salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
      console.error('Mensagem:', error.message);
      console.error('Detalhes completos:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar descrição: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingDescricao(false);
    }
  };

  const eventosPorDia = useMemo(() => {
    const map = {};
    eventos.forEach(e => {
      const key = (e.data || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [eventos]);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const iso = dfFormat(d, 'yyyy-MM-dd');
      days.push({
        date: d,
        iso,
        isCurrentMonth: d.getMonth() === currentDate.getMonth(),
        isToday: isToday(d),
        count: (eventosPorDia[iso] || []).length
      });
    }
    return days;
  }, [currentDate, eventosPorDia]);

  const years = useMemo(() => {
    const now = new Date();
    const start = now.getFullYear() - 3;
    const end = now.getFullYear() + 3;
    const arr = [];
    for (let y = start; y <= end; y++) arr.push(y);
    return arr;
  }, []);

  const months = [
    { label: 'Jan', value: 0 },
    { label: 'Fev', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Abr', value: 3 },
    { label: 'Mai', value: 4 },
    { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 },
    { label: 'Ago', value: 7 },
    { label: 'Set', value: 8 },
    { label: 'Out', value: 9 },
    { label: 'Nov', value: 10 },
    { label: 'Dez', value: 11 }
  ];

  const handleSalvarNota = async (e) => {
    e.preventDefault();
    if (!notaAtual.data || !notaAtual.titulo) {
      alert('Informe a anotação.');
      return;
    }
    try {
      if (notaAtual.id) {
        await db.updateEventoLogistica(notaAtual.id, {
          data: notaAtual.data,
          titulo: notaAtual.titulo,
          descricao: ''
        });
      } else {
        await db.createEventoLogistica({
          data: notaAtual.data,
          titulo: notaAtual.titulo,
          descricao: ''
        });
      }
      setNotaAtual({ id: null, data: '', titulo: '', descricao: '' });
      setIsNotaModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      alert('Erro ao salvar nota.');
    }
  };

  const handleEditarNota = (ev) => {
    const dia = (ev.data || '').slice(0,10);
    setSelectedDateStr(dia);
    setNotaAtual({ id: ev.id, data: dia, titulo: ev.titulo || ev.descricao || '', descricao: '' });
    setIsNotaModalOpen(true);
  };

  const handleRemoverNota = async (id) => {
    if (!window.confirm('Remover esta nota?')) return;
    try {
      await db.deleteEventoLogistica(id);
      await loadData();
      setNotaAtual({ id: null, data: '', titulo: '', descricao: '' });
      setIsNotaModalOpen(false);
    } catch (error) {
      console.error('Erro ao remover nota:', error);
      alert('Erro ao remover nota.');
    }
  };

  if (!user) return null;

  return (
    <div className="logistica-page">
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
          title="Logística"
          subtitle="Calendário simples de anotações"
        />
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <div className="welcome-section">
                <h1>Logística</h1>
                <p>Calendário simples de anotações</p>
              </div>
            </div>

            {/* Seção de Pronta Entrega */}
            <div className="pronta-entrega-section" style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#000', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📦</span>
                  Itens em Pronta Entrega
                </h3>
                <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                  Descreva os guindastes disponíveis para venda imediata. Esta informação será exibida para os vendedores.
                </p>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>
                  Descrição dos Itens
                </label>
                <textarea
                  rows="6"
                  placeholder="Ex: Guindaste GSI 6.5 3h1m - Disponível em estoque&#10;Guindaste GSE 8.0 4h2m - Pronta entrega&#10;..."
                  value={prontaEntregaDescricao}
                  onChange={(e) => setProntaEntregaDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 120
                  }}
                />
                <small style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                  💡 Dica: Liste cada item em uma linha separada para melhor visualização
                </small>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSalvarDescricao}
                  disabled={isSavingDescricao}
                  style={{
                    padding: '10px 24px',
                    background: isSavingDescricao ? '#9ca3af' : 'linear-gradient(135deg, #000000, #333333)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isSavingDescricao ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSavingDescricao ? 'Salvando...' : '💾 Salvar Descrição'}
                </button>
              </div>
            </div>

            <div className="calendar-container" style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', marginBottom: 12 }}>
              <div className="calendar-controls">
                <select
                  value={currentDate.getMonth()}
                  onChange={(e)=>{
                    const newMonth = Number(e.target.value);
                    setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
                  }}
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={currentDate.getFullYear()}
                  onChange={(e)=>{
                    const newYear = Number(e.target.value);
                    setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
                  }}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="month-grid">
                <div className="month-grid-header">
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                  <div>Dom</div>
                </div>
                <div className="month-grid-body">
                  {monthGridDays.map((d) => (
                    <button
                      key={d.iso}
                      className={`month-cell ${d.isCurrentMonth ? '' : 'outside'} ${d.isToday ? 'today' : ''}`.trim()}
                      onClick={()=>{
                        const existing = (eventosPorDia[d.iso] || [])[0];
                        setSelectedDateStr(d.iso);
                        if (existing) {
                          setNotaAtual({ id: existing.id, data: d.iso, titulo: existing.titulo || existing.descricao || '', descricao: '' });
                        } else {
                          setNotaAtual({ id: null, data: d.iso, titulo: '', descricao: '' });
                        }
                        setIsNotaModalOpen(true);
                      }}
                    >
                      <span className="day-number">{d.date.getDate()}</span>
                      {d.count > 0 && (
                        <span className="note-indicator" title={`${d.count} anotação(ões)`}>{d.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isNotaModalOpen && (
              <div className="nota-modal-overlay" onClick={()=>{ setIsNotaModalOpen(false); setNotaAtual({ id:null, data:'', titulo:'', descricao:'' }); }}>
                <div className="nota-modal" onClick={(e)=>e.stopPropagation()}>
                  <div className="nota-modal-header">
                    <h3>{new Date((notaAtual.data || '')).toLocaleDateString()}</h3>
                    <button className="close-btn" onClick={()=>{ setIsNotaModalOpen(false); setNotaAtual({ id:null, data:'', titulo:'', descricao:'' }); }}>✕</button>
                  </div>

                  <form onSubmit={handleSalvarNota} className="gerenciar-form">
                    <div className="form-group">
                      <label>Anotação</label>
                      <textarea
                        rows="5"
                        placeholder="Escreva sua anotação..."
                        value={notaAtual.titulo}
                        onChange={(e)=>setNotaAtual(prev=>({ ...prev, titulo: e.target.value }))}
                      />
                    </div>
                    <div className="modal-actions">
                      {notaAtual.id && (
                        <button type="button" className="cancel-btn" onClick={()=>handleRemoverNota(notaAtual.id)}>Excluir</button>
                      )}
                      <button type="submit" className="save-btn">{notaAtual.id ? 'Atualizar' : 'Salvar'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
    </div>
  );
};

export default Logistica;


