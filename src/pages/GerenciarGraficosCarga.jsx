import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import BlobButton from '../components/BlobButton';
import { db, supabase } from '../config/supabase';
import '../styles/GerenciarGraficosCarga.css';

const GerenciarGraficosCarga = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [graficos, setGraficos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGrafico, setEditingGrafico] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    arquivo: null,
  });

  useEffect(() => {
    if (user?.tipo === 'admin_concessionaria') {
      navigate('/dashboard-admin');
      return;
    }

    if (user) {
      loadGraficos();
    }
  }, [user, navigate]);

  const loadGraficos = async () => {
    try {
      setIsLoading(true);
      const graficosData = await db.getGraficosCarga();
      setGraficos(graficosData || []);
    } catch (error) {
      console.error('Erro ao carregar gráficos:', error);
      alert('Erro ao carregar gráficos. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const userData = localStorage.getItem('user');
      if (!userData) {
        alert('Usuário não autenticado. Faça login novamente.');
        navigate('/');
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const userObj = JSON.parse(userData);

          if (userObj.email && userObj.password) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: userObj.email,
              password: userObj.password,
            });

            if (signInError) {
            } else {
            }
          }
        }
      } catch (error) {
      }

      let arquivoUrl = '';

      if (formData.arquivo) {
        const fileName = `grafico_${Date.now()}_${formData.arquivo.name}`;
        arquivoUrl = await db.uploadGraficoCarga(formData.arquivo, fileName);
      }

      const graficoData = {
        nome: formData.nome,
        arquivo_url: arquivoUrl || editingGrafico?.arquivo_url,
      };

      if (editingGrafico) {
        await db.updateGraficoCarga(editingGrafico.id, graficoData);
        alert('Gráfico atualizado com sucesso!');
      } else {
        await db.createGraficoCarga(graficoData);
        alert('Gráfico criado com sucesso!');
      }

      setShowModal(false);
      setEditingGrafico(null);
      resetForm();
      loadGraficos();
    } catch (error) {
      console.error('Erro ao salvar gráfico:', error);
      console.error('Detalhes completos:', JSON.stringify(error, null, 2));

      let errorMessage = 'Erro ao salvar gráfico. Tente novamente.';

      if (error.message) {
        if (error.message.includes('storage')) {
          errorMessage =
            'Erro no sistema de arquivos. Verifique se o arquivo é válido e tente novamente.';
        } else if (error.message.includes('bucket')) {
          errorMessage =
            'Erro na configuração do sistema. Entre em contato com o suporte.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Erro de permissão. Verifique suas credenciais.';
        } else if (error.message.includes('file size')) {
          errorMessage = 'Arquivo muito grande. O tamanho máximo é 50MB.';
        } else if (error.message.includes('file type')) {
          errorMessage = 'Tipo de arquivo não suportado. Use apenas arquivos PDF.';
        } else if (
          error.message.includes('RLS') ||
          error.message.includes('row-level security policy')
        ) {
          errorMessage =
            'Erro de permissão: configure as políticas de acesso no Supabase Storage.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Erro de requisição. Verifique se o arquivo é válido.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Acesso negado. Verifique suas permissões no Supabase.';
        }
      }

      console.error('Erro detalhado para debug:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (grafico) => {
    setEditingGrafico(grafico);
    setFormData({
      nome: grafico.nome,
      arquivo: null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este gráfico?')) {
      return;
    }

    try {
      setIsLoading(true);
      await db.deleteGraficoCarga(id);
      alert('Gráfico excluído com sucesso!');
      loadGraficos();
    } catch (error) {
      console.error('Erro ao excluir gráfico:', error);
      alert('Erro ao excluir gráfico. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      arquivo: null,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.type === 'application/pdf') {
      setFormData((prev) => ({ ...prev, arquivo: file }));
    } else {
      alert('Por favor, selecione apenas arquivos PDF.');
      e.target.value = '';
    }
  };

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gerenciar Gráficos de Carga"
        subtitle="Upload e gestão de gráficos técnicos"
      />

      <div className="gerenciar-graficos-container">
        <div className="gerenciar-content">
          <div className="header-section">
            <div className="header-info">
              <h1>Gerenciar Gráficos de Carga</h1>
              <p>Faça upload e gerencie os gráficos técnicos dos guindastes</p>
            </div>

            <BlobButton
              onClick={() => {
                setEditingGrafico(null);
                resetForm();
                setShowModal(true);
              }}
              className="add-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Adicionar Gráfico
            </BlobButton>
          </div>

          <div className="graficos-list">
            {isLoading && graficos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                </div>
                <h3>Carregando gráficos</h3>
                <p>Aguarde enquanto buscamos os arquivos técnicos.</p>
              </div>
            ) : graficos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                </div>
                <h3>Nenhum gráfico cadastrado</h3>
                <p>Clique em “Adicionar Gráfico” para começar.</p>
              </div>
            ) : (
              <div className="graficos-grid">
                {graficos.map((grafico) => (
                  <div key={grafico.id} className="grafico-item">
                    <div className="grafico-info">
                      <div className="grafico-header">
                        <div className="grafico-icon">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                          </svg>
                        </div>

                        <div className="grafico-details">
                          <h3>{grafico.nome}</h3>

                          {grafico.arquivo_url && (
                            <a
                              href={grafico.arquivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="pdf-chip"
                              title="Abrir PDF em nova aba"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                              </svg>
                              Abrir PDF
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grafico-meta">
                        <div className="meta-item">
                          <span className="label">Atualizado:</span>
                          <span className="value">
                            {new Date(grafico.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grafico-actions">
                      <BlobButton
                        onClick={() => handleEdit(grafico)}
                        className="edit-btn"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                        Editar
                      </BlobButton>

                      <BlobButton
                        onClick={() => handleDelete(grafico.id)}
                        className="delete-btn"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                        Excluir
                      </BlobButton>

                      <BlobButton
                        onClick={() => window.open(grafico.arquivo_url, '_blank')}
                        className="view-btn"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 10.5a3 3 0 110-6 3 3 0 010 6z" />
                        </svg>
                        Visualizar
                      </BlobButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGrafico ? 'Editar Gráfico' : 'Adicionar Gráfico'}</h2>
              <BlobButton
                onClick={() => setShowModal(false)}
                className="close-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </BlobButton>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nome do Gráfico *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    placeholder="Ex: GSI 6.5 - Gráfico de Carga"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Arquivo PDF {editingGrafico ? '(opcional)' : '*'}</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required={!editingGrafico}
                  />
                  <small>
                    Apenas arquivos PDF são aceitos.
                    {editingGrafico ? ' Deixe vazio para manter o arquivo atual.' : ''}
                  </small>
                </div>
              </div>

              <div className="modal-actions">
                <BlobButton
                  onClick={() => setShowModal(false)}
                  className="cancel-btn"
                >
                  Cancelar
                </BlobButton>

                <BlobButton type="submit" className="save-btn" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : editingGrafico ? 'Atualizar' : 'Salvar'}
                </BlobButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GerenciarGraficosCarga;
