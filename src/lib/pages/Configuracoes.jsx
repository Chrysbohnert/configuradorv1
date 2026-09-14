import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { supabase } from '../../config/supabase';
import { updateMe, changePassword as changeUserPassword } from '../../api/users';
import '../../styles/Configuracoes.css';

const Configuracoes = () => {
  const { user: contextUser } = useOutletContext();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [profileData, setProfileData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: ''
  });

  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    if (contextUser) {
      setUser(contextUser);
      setProfileData({
        nome: contextUser.nome || '',
        email: contextUser.email || '',
        telefone: contextUser.telefone || '',
        cpf: contextUser.cpf || ''
      });
      setPhotoPreview(contextUser.foto_perfil || null);
    } else {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setProfileData({
          nome: parsedUser.nome || '',
          email: parsedUser.email || '',
          telefone: parsedUser.telefone || '',
          cpf: parsedUser.cpf || ''
        });
        setPhotoPreview(parsedUser.foto_perfil || null);
      }
    }
  }, [contextUser]);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB.' });
      return;
    }

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });

      if (!profileData.nome.trim()) {
        setMessage({ type: 'error', text: 'Nome é obrigatório.' });
        return;
      }

      if (!profileData.email.trim()) {
        setMessage({ type: 'error', text: 'Email é obrigatório.' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        setMessage({ type: 'error', text: 'Email inválido.' });
        return;
      }

      let fotoUrl = user.foto_perfil;
      if (photoFile) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(photoFile);
          });

          fotoUrl = await base64Promise;

          try {
            const fileName = `perfil_${user.id}_${Date.now()}.${photoFile.name.split('.').pop()}`;
            const { data: buckets } = await supabase.storage.listBuckets();
            const bucketExists = buckets?.some(bucket => bucket.name === 'perfis');

            if (!bucketExists) {
              const { error: createError } = await supabase.storage.createBucket('perfis', {
                public: true,
                allowedMimeTypes: ['image/*'],
                fileSizeLimit: 5242880
              });

              if (createError) {
                console.warn('Não foi possível criar bucket, usando base64:', createError);
              }
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('perfis')
              .upload(fileName, photoFile, {
                cacheControl: '3600',
                upsert: true
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from('perfis').getPublicUrl(fileName);
              if (urlData?.publicUrl) {
                fotoUrl = urlData.publicUrl;
              }
            }
          } catch (storageError) {
            console.warn('Erro no storage, usando base64:', storageError);
          }
        } catch (error) {
          console.error('Erro ao processar foto:', error);
          setMessage({ type: 'error', text: 'Erro ao processar a foto.' });
          return;
        }
      }

      await updateMe({
        nome: profileData.nome.trim(),
        email: profileData.email.trim(),
        telefone: profileData.telefone.trim() || null,
        cpf: profileData.cpf.trim() || null,
        foto_perfil: fotoUrl
      });

      const updatedUser = {
        ...user,
        nome: profileData.nome.trim(),
        email: profileData.email.trim(),
        telefone: profileData.telefone.trim() || null,
        cpf: profileData.cpf.trim() || null,
        foto_perfil: fotoUrl
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setPhotoFile(null);

      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });

      if (!passwordData.senhaAtual) {
        setMessage({ type: 'error', text: 'Senha atual é obrigatória.' });
        return;
      }

      if (!passwordData.novaSenha) {
        setMessage({ type: 'error', text: 'Nova senha é obrigatória.' });
        return;
      }

      if (passwordData.novaSenha.length < 6) {
        setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
        return;
      }

      if (passwordData.novaSenha !== passwordData.confirmarSenha) {
        setMessage({ type: 'error', text: 'As senhas não coincidem.' });
        return;
      }

      await changeUserPassword({
        senhaAtual: passwordData.senhaAtual,
        novaSenha: passwordData.novaSenha
      });

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });

      setPasswordData({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setMessage({ type: 'error', text: 'Erro ao alterar senha. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="erp-page">
      <div className="erp-container">
        <PageHeader
          breadcrumb={[{ label: 'Configurações' }]}
          title="Configurações"
          subtitle="Gerencie suas informações pessoais e senha de acesso."
        />

        <div className="config-card">
          <div className="config-tabs">
            <button
              type="button"
              className={`config-tab ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Perfil
            </button>

            <button
              type="button"
              className={`config-tab ${activeTab === 'senha' ? 'active' : ''}`}
              onClick={() => setActiveTab('senha')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Senha
            </button>
          </div>

          {message.text && (
            <div className={`config-message ${message.type}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                {message.type === 'success' ? (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                ) : (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                )}
              </svg>
              {message.text}
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="config-panel">
              <h2>Informações do Perfil</h2>

              <div className="photo-section">
                <div className="photo-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Foto de perfil" />
                  ) : (
                    <div className="photo-placeholder">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="photo-actions">
                  <label className="erp-btn erp-btn-secondary upload-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Escolher Foto
                    <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                  </label>
                  <p className="photo-hint">JPG, PNG ou GIF. Máximo 2MB.</p>
                </div>
              </div>

              <div className="config-form">
                <div className="erp-form-group">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={profileData.nome}
                    onChange={(e) => handleProfileChange('nome', e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="erp-form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    className="erp-input"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="form-row">
                  <div className="erp-form-group">
                    <label>Telefone</label>
                    <input
                      type="tel"
                      className="erp-input"
                      value={profileData.telefone}
                      onChange={(e) => handleProfileChange('telefone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>CPF</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={profileData.cpf}
                      onChange={(e) => handleProfileChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      disabled
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="erp-btn erp-btn-primary save-btn"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                      </svg>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'senha' && (
            <div className="config-panel">
              <h2>Alterar Senha</h2>

              <div className="config-form">
                <div className="erp-form-group">
                  <label>Senha Atual *</label>
                  <input
                    type="password"
                    className="erp-input"
                    value={passwordData.senhaAtual}
                    onChange={(e) => handlePasswordChange('senhaAtual', e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="erp-form-group">
                  <label>Nova Senha *</label>
                  <input
                    type="password"
                    className="erp-input"
                    value={passwordData.novaSenha}
                    onChange={(e) => handlePasswordChange('novaSenha', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="erp-form-group">
                  <label>Confirmar Nova Senha *</label>
                  <input
                    type="password"
                    className="erp-input"
                    value={passwordData.confirmarSenha}
                    onChange={(e) => handlePasswordChange('confirmarSenha', e.target.value)}
                    placeholder="Digite a nova senha novamente"
                  />
                </div>

                <button
                  type="button"
                  className="erp-btn erp-btn-primary save-btn"
                  onClick={handleSavePassword}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                      </svg>
                      Alterar Senha
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
