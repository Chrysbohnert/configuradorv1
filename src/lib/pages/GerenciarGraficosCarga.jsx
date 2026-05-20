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
      console.error('Erro ao carregar grÃ¡ficos:', error);
      alert('Erro ao carregar grÃ¡ficos. Verifique a conexÃ£o com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      // ðŸš« LOGIN SUPABASE DESATIVADO TEMPORARIAMENTE
      // Durante migraÃ§Ã£o Supabase -> PostgreSQL
      // O sistema agora usa autenticaÃ§Ã£o via API REST/PostgreSQL

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
        alert('GrÃ¡fico atualizado com sucesso!');
      } else {
        await db.createGraficoCarga(graficoData);
        alert('GrÃ¡fico criado com sucesso!');
      }

      setShowModal(false);
      setEditingGrafico(null);
      resetForm();
      loadGraficos();
    } catch (error) {
      console.error('Erro ao salvar grÃ¡fico:', error);
      console.error('Detalhes completos:', JSON.stringify(error, null, 2));

      let errorMessage = 'Erro ao salvar grÃ¡fico. Tente novamente.';

      if (error.message) {
        if (error.message.includes('storage')) {
          errorMessage =
            'Erro no sistema de arquivos. Verifique se o arquivo Ã© vÃ¡lido e tente novamente.';
        } else if (error.message.includes('bucket')) {
          errorMessage =
            'Erro na configuracao do sistema. Entre em contato com o suporte.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Erro de permissÃ£o. Verifique suas credenciais.';
        } else if (error.message.includes('file size')) {
          errorMessage = 'Arquivo muito grande. O tamanho mÃ¡ximo Ã© 50MB.';
        } else if (error.message.includes('file type')) {
          errorMessage =
            'Tipo de arquivo nÃ£o suportado. Use apenas arquivos PDF.';
        } else if (
          error.message.includes('RLS') ||
          error.message.includes('row-level security policy')
        ) {
          errorMessage =
            'Erro de permissÃ£o: configure as polÃ­ticas de acesso no Supabase Storage.';
        } else if (error.message.includes('400')) {
          errorMessage =
            'Erro de requisiÃ§Ã£o. Verifique se o arquivo Ã© vÃ¡lido.';
        } else if (error.message.includes('403')) {
          errorMessage =
            'Acesso negado. Verifique suas permissÃµes no Supabase.';
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
    if (!window.confirm('Tem certeza que deseja excluir este grÃ¡fico?')) {
      return;
    }

    try {
      setIsLoading(true);
      await db.deleteGraficoCarga(id);
      alert('GrÃ¡fico excluÃ­do com sucesso!');
      loadGraficos();
    } catch (error) {
      console.error('Erro ao excluir grÃ¡fico:', error);
      alert('Erro ao excluir grÃ¡fico. Tente novamente.');
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
        title="Gerenciar GrÃ¡ficos de Carga"
        subtitle="Upload e gestÃ£o de grÃ¡ficos tÃ©cnicos"
      />

      {/* restante do JSX permanece igual */}
    </>
  );
};

export default GerenciarGraficosCarga;



