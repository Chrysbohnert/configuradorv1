import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import '../styles/Support.css';

const Support = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contact');

  const handleBack = () => {
    navigate(-1);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Olá! Preciso de ajuda com o sistema STARK Orçamento.');
    window.open(`https://wa.me/55981721286?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    window.open('mailto:starkorcamento@gmail.com?subject=Suporte - STARK Orçamento', '_blank');
  };

  return (
    <div className="support-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={handleBack}
        showSupportButton={false}
        showUserInfo={false}
        title="Suporte & Ajuda"
        subtitle="Como podemos ajudar?"
      />

      <div className="support-content">
        <div className="support-tabs">
          <button 
            className={`tab-button ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            📞 Contato
          </button>
          <button 
            className={`tab-button ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            ❓ Ajuda
          </button>
          <button 
            className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ Sobre
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'contact' && (
            <div className="contact-section">
              <div className="contact-card">
                <div className="contact-icon whatsapp">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                <h3>WhatsApp</h3>
                <p>Suporte rápido e direto</p>
                <button onClick={handleWhatsApp} className="contact-button whatsapp">
                  Abrir WhatsApp
                </button>
              </div>

              <div className="contact-card">
                <div className="contact-icon email">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <h3>Email</h3>
                <p>starkorcamento@gmail.com</p>
                <button onClick={handleEmail} className="contact-button email">
                  Enviar Email
                </button>
              </div>

              <div className="contact-card">
                <div className="contact-icon phone">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </div>
                <h3>Telefone</h3>
                <p>(55) 98172-1286</p>
                <p className="phone-hours">Seg-Sex: 8h às 18h</p>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="help-section">
              <div className="faq-item">
                <h3>Como criar um novo orçamento?</h3>
                <p>1. Acesse "Nova Proposta" no menu<br/>
                2. Selecione o guindaste desejado<br/>
                3. Adicione opcionais se necessário<br/>
                4. Preencha os dados do cliente<br/>
                5. Configure o caminhão<br/>
                6. Revise e finalize o orçamento</p>
              </div>

              <div className="faq-item">
                <h3>Como compartilhar a proposta com o cliente?</h3>
                <p>1. Vá para "Propostas"<br/>
                2. Gere o PDF da proposta<br/>
                3. Compartilhe o arquivo e/ou o link público da proposta</p>
              </div>

              <div className="faq-item">
                <h3>Como alterar minha senha?</h3>
                <p>Entre em contato com o administrador do sistema para solicitar a alteração de senha.</p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="about-section">
              <div className="about-card">
                <h3>Sobre o STARK Orçamento</h3>
                <p>O STARK Orçamento é um sistema profissional desenvolvido para facilitar a criação e digitalização de proposta comercial de guindastes.</p>
                
                <div className="version-info">
                  <h4>Informações do Sistema</h4>
                  <ul>
                    <li><strong>Versão:</strong> 1.0.0</li>
                    <li><strong>Desenvolvido por:</strong> Chrystian Bohnert e Mathias Fuhr</li>
                    <li><strong>Sistema criado em:</strong> Julho 2025</li>
                    <li><strong>Última atualização:</strong> Outubro 2025</li>
                    <li><strong>Suporte:</strong> 24/7</li>
                  </ul>
                </div>

                <div className="features-list">
                  <h4>Funcionalidades Principais</h4>
                  <ul>
                    <li>✅ Criação de proposta comercial profissional</li>
                    <li>✅ Geração de PDFs automática</li>
                    <li>✅ Integração com WhatsApp</li>
                    <li>✅ Dashboard administrativo</li>
                    <li>✅ Sistema de relatórios</li>
                    <li>✅ Interface responsiva</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support; 