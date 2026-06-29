import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import BlobButton from '../../components/BlobButton';
import { db } from '../../config/supabase';
import '../../styles/GerenciarGraficosCarga.css';

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

      // 🚫 LOGIN SUPABASE DESATIVADO TEMPORARIAMENTE
      // Durante migração Supabase -> PostgreSQL
      // O sistema agora usa autenticação via API REST/PostgreSQL

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
            'Erro na configuracao do sistema. Entre em contato com o suporte.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Erro de permissão. Verifique suas credenciais.';
        } else if (error.message.includes('file size')) {
          errorMessage = 'Arquivo muito grande. O tamanho máximo é 50MB.';
        } else if (error.message.includes('file type')) {
          errorMessage =
            'Tipo de arquivo não suportado. Use apenas arquivos PDF.';
        } else if (
          error.message.includes('RLS') ||
          error.message.includes('row-level security policy')
        ) {
          errorMessage =
            'Erro de permissão: configure as políticas de acesso no Supabase Storage.';
        } else if (error.message.includes('400')) {
          errorMessage =
            'Erro de requisição. Verifique se o arquivo é válido.';
        } else if (error.message.includes('403')) {
          errorMessage =
            'Acesso negado. Verifique suas permissões no Supabase.';
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
        <div className="header-section">
          <div className="header-info">
            <h1>Gráficos de Carga</h1>
            <p>Gerencie os gráficos técnicos dos guindastes</p>
          </div>
          <BlobButton
            onClick={() => { resetForm(); setEditingGrafico(null); setShowModal(true); }}
          >
            + Novo Gráfico
          </BlobButton>
        </div>

        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        )}

        {!isLoading && graficos.length === 0 && (
          <div className="empty-state">
            <h3>Nenhum gráfico cadastrado</h3>
            <p>Clique em "+ Novo Gráfico" para adicionar o primeiro.</p>
          </div>
        )}

        {!isLoading && graficos.length > 0 && (
          <div className="graficos-grid">
            {graficos.map((grafico) => (
              <div key={grafico.id} className="grafico-item">
                <div className="grafico-info">
                  <div className="grafico-header">
                    <div className="grafico-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="grafico-details">
                      <h3>{grafico.nome}</h3>
                    </div>
                  </div>
                  {grafico.arquivo_url && (
                    <a href={grafico.arquivo_url} target="_blank" rel="noopener noreferrer" className="pdf-chip">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Ver PDF
                    </a>
                  )}
                </div>
                <div className="grafico-actions">
                  <BlobButton onClick={() => handleEdit(grafico)}>Editar</BlobButton>
                  <BlobButton onClick={() => handleDelete(grafico.id)}>Excluir</BlobButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGrafico ? 'Editar Gráfico' : 'Novo Gráfico'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Nome do Gráfico</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Gráfico de Carga GSI 3500"
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Arquivo PDF</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                    {editingGrafico?.arquivo_url && !formData.arquivo && (
                      <small>Arquivo atual mantido. Selecione um novo para substituir.</small>
                    )}
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="save-btn" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : (editingGrafico ? 'Atualizar' : 'Salvar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GerenciarGraficosCarga;



