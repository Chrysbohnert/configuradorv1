import React, { useEffect, useMemo, useState } from 'react';
import { format as dfFormat, parse as dfParse, startOfWeek, getDay, startOfMonth, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import AdminNavigation from '../components/AdminNavigation';
import { db } from '../config/supabase';
import '../styles/Dashboard.css';
import '../styles/Logistica.css';

const Logistica = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [prontaEntrega, setProntaEntrega] = useState([]);
  const [guindastes, setGuindastes] = useState([]);
  const [notaAtual, setNotaAtual] = useState({ id: null, data: '', titulo: '', descricao: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      if (userObj.tipo !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }
      setUser(userObj);
      loadData();
    } else {
      window.location.href = '/';
    }
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ev, pe, gs] = await Promise.all([
        db.getEventosLogistica(),
        db.getProntaEntrega(),
        db.getGuindastes()
      ]);
      setEventos(ev);
      setProntaEntrega(pe);
      setGuindastes(gs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
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
      alert('Preencha data e título.');
      return;
    }
    try {
      if (notaAtual.id) {
        await db.updateEventoLogistica(notaAtual.id, {
          data: notaAtual.data,
          titulo: notaAtual.titulo,
          descricao: notaAtual.descricao || ''
        });
      } else {
        await db.createEventoLogistica({
          data: notaAtual.data,
          titulo: notaAtual.titulo,
          descricao: notaAtual.descricao || ''
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
    setNotaAtual({ id: ev.id, data: dia, titulo: ev.titulo || '', descricao: ev.descricao || '' });
    setIsNotaModalOpen(true);
  };

  const handleRemoverNota = async (id) => {
    if (!window.confirm('Remover esta nota?')) return;
    try {
      await db.deleteEventoLogistica(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao remover nota:', error);
      alert('Erro ao remover nota.');
    }
  };

  const handleAdicionarPronta = async (guindasteId) => {
    try {
      await db.addProntaEntrega({ guindaste_id: guindasteId, status: 'disponivel' });
      await loadData();
    } catch (error) {
      console.error('Erro ao adicionar pronta-entrega:', error);
      alert('Erro ao adicionar à pronta-entrega.');
    }
  };

  const handleRemoverPronta = async (id) => {
    if (!window.confirm('Remover da pronta-entrega?')) return;
    try {
      await db.removeProntaEntrega(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao remover pronta-entrega:', error);
      alert('Erro ao remover.');
    }
  };

  if (!user) return null;

  return (
    <div className="admin-layout logistica-page">
      <AdminNavigation user={user} />
      <div className="admin-content">
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <div className="welcome-section">
                <h1>Logística</h1>
                <p>Calendário de notas e gestão de pronta-entrega</p>
              </div>
            </div>
              
            

            <div className="admin-sections" style={{ gap: '24px' }}>
              <div className="top-vendedores-section" style={{ flex: 1 }}>
                <h2>Calendário de Notas</h2>

                <div className="calendar-container" style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', marginBottom: 20 }}>
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
                            setSelectedDateStr(d.iso);
                            setNotaAtual({ id: null, data: d.iso, titulo: '', descricao: '' });
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
                      <div className="nota-modal-list" style={{ marginBottom: 12 }}>
                        {(eventosPorDia[notaAtual.data] || []).map(ev => (
                          <div key={ev.id} className="action-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{ev.titulo}</div>
                              {ev.descricao ? <div style={{ color: '#6b7280' }}>{ev.descricao}</div> : null}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="action-btn" onClick={()=>handleEditarNota(ev)}>✏️ Editar</button>
                              <button className="action-btn" onClick={()=>handleRemoverNota(ev.id)}>🗑️ Remover</button>
                            </div>
                          </div>
                        ))}
                        {(eventosPorDia[notaAtual.data] || []).length === 0 && (
                          <div className="vendedor-card" style={{ padding: 12 }}>
                            <div className="vendedor-name">Sem anotações neste dia</div>
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleSalvarNota} className="gerenciar-form">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Data</label>
                            <input type="date" value={notaAtual.data} onChange={(e)=>setNotaAtual(prev=>({ ...prev, data: e.target.value }))} required />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Título</label>
                            <input type="text" placeholder="Ex: 20/10 pronto guindaste X do cliente Y" value={notaAtual.titulo} onChange={(e)=>setNotaAtual(prev=>({ ...prev, titulo: e.target.value }))} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Descrição (opcional)</label>
                          <textarea rows="6" value={notaAtual.descricao} onChange={(e)=>setNotaAtual(prev=>({ ...prev, descricao: e.target.value }))} />
                        </div>
                        <div className="modal-actions">
                          {notaAtual.id && (
                            <button type="button" className="cancel-btn" onClick={()=>{ setIsNotaModalOpen(false); setNotaAtual({ id:null, data:'', titulo:'', descricao:'' }); }}>Cancelar</button>
                          )}
                          <button type="submit" className="save-btn">{notaAtual.id ? 'Atualizar Nota' : 'Adicionar Nota'}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="vendedores-list">
                  {Object.keys(eventosPorDia).sort().map(dia => (
                    <div key={dia} className="vendedor-card">
                      <div className="vendedor-info">
                        <div className="vendedor-details">
                          <div className="vendedor-name">{new Date(dia).toLocaleDateString()}</div>
                          <div className="vendedor-stats">
                            <span>{eventosPorDia[dia].length} nota(s)</span>
                          </div>
                        </div>
                      </div>
                      <div className="vendedor-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        {eventosPorDia[dia].map(ev => (
                          <div key={ev.id} className="action-card" style={{ cursor: 'default' }}>
                            <div className="action-content" style={{ minWidth: '300px' }}>
                              <h3 style={{ marginBottom: 4 }}>{ev.titulo}</h3>
                              {ev.descricao ? <p style={{ margin: 0 }}>{ev.descricao}</p> : null}
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button className="action-btn" onClick={()=>handleEditarNota(ev)}>✏️ Editar</button>
                                <button className="action-btn" onClick={()=>handleRemoverNota(ev.id)}>🗑️ Remover</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="top-vendedores-section" style={{ flex: 1 }}>
                <h2>Pronta-Entrega</h2>
                <div className="gerenciar-form" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>Adicionar guindaste</label>
                    <select onChange={(e)=>{ const id = Number(e.target.value); if (id) { handleAdicionarPronta(id); e.target.value=''; } }}>
                      <option value="">Selecione um guindaste</option>
                      {guindastes.map(g => (
                        <option key={g.id} value={g.id}>{g.subgrupo} - {g.modelo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="vendedores-list">
                  {prontaEntrega.map(item => (
                    <div key={item.id} className="vendedor-card">
                      <div className="vendedor-info">
                        <div className="vendedor-details">
                          <div className="vendedor-name">{item.guindaste?.subgrupo} - {item.guindaste?.modelo}</div>
                          <div className="vendedor-stats">
                            <span>Status: {item.status || 'disponivel'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="vendedor-actions">
                        <button className="action-btn" onClick={()=>handleRemoverPronta(item.id)}>Remover</button>
                      </div>
                    </div>
                  ))}
                  {prontaEntrega.length === 0 && (
                    <div className="vendedor-card">
                      <div className="vendedor-info">
                        <div className="vendedor-details">
                          <div className="vendedor-name">Nenhum item à pronta-entrega</div>
                          <div className="vendedor-stats"><span>Use o seletor acima para adicionar</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logistica;


