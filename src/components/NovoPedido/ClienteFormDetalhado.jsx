import React, { useState, useEffect } from 'react';
import { maskCEP, maskPhone, onlyDigits, composeEndereco } from '../../utils/masks';

/**
 * Formulário detalhado de cliente com integração ViaCEP e IBGE
 * @param {Object} props
 * @param {Object} props.formData - Dados do formulário
 * @param {Function} props.setFormData - Função para atualizar dados
 * @param {Object} props.errors - Erros de validação
 */
const ClienteFormDetalhado = ({ formData, setFormData, errors = {} }) => {
  const [cidadesUF, setCidadesUF] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [manualEndereco, setManualEndereco] = useState(false);
  const [isentoIE, setIsentoIE] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => {
      let maskedValue = value;
      
      // Aplicar máscaras
      if (field === 'telefone') maskedValue = maskPhone(value);
      if (field === 'cep') maskedValue = maskCEP(value);
      
      const next = { ...prev, [field]: maskedValue };
      
      // Consistência: ao mudar UF/Cidade manualmente, limpar CEP; ao mudar UF, limpar Cidade
      if (field === 'uf') {
        next.cidade = '';
        if (!manualEndereco && next.cep) next.cep = '';
      }
      if (field === 'cidade') {
        if (!manualEndereco && next.cep) next.cep = '';
      }
      
      // Se o campo alterado é parte do endereço detalhado, atualizar 'endereco' composto
      if (['logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep'].includes(field)) {
        next.endereco = composeEndereco(next);
      }
      
      return next;
    });
  };

  // Integração com ViaCEP
  useEffect(() => {
    if (manualEndereco) return; // não sobrescrever quando edição manual estiver ativa
    
    const raw = onlyDigits(formData.cep || '');
    if (raw.length !== 8) return;
    
    let cancelled = false;
    
    const fetchCEP = async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await response.json();
        
        if (cancelled || !data || data.erro) return;
        
        setFormData(prev => {
          const next = {
            ...prev,
            cep: maskCEP(raw),
            // CEP é a fonte da verdade para UF e Cidade
            uf: data.uf || '',
            cidade: data.localidade || '',
            // Logradouro e bairro: preencher apenas se ainda não informados
            logradouro: prev.logradouro || data.logradouro || '',
            bairro: prev.bairro || data.bairro || '',
          };
          next.endereco = composeEndereco(next);
          return next;
        });
      } catch (_) {
        // silencioso - erro de rede
      }
    };
    
    fetchCEP();
    return () => { cancelled = true; };
  }, [formData.cep, setFormData, manualEndereco]);

  // Carregar cidades do IBGE quando UF mudar
  useEffect(() => {
    const uf = (formData.uf || '').trim();
    if (!uf) {
      setCidadesUF([]);
      return;
    }
    
    let cancelled = false;
    
    const loadCidades = async () => {
      try {
        setLoadingCidades(true);
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
        );
        const arr = await res.json();
        
        if (cancelled || !Array.isArray(arr)) return;
        
        const nomes = arr.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setCidadesUF(nomes);
      } catch (_) {
        setCidadesUF([]);
      } finally {
        if (!cancelled) setLoadingCidades(false);
      }
    };
    
    loadCidades();
    return () => { cancelled = true; };
  }, [formData.uf]);

  return (
    <div className="form-container">
      <div className="form-grid">
        {/* Nome */}
        <div className="form-group">
          <label>Nome Completo *</label>
          <input
            type="text"
            value={formData.nome || ''}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Digite o nome completo"
            className={errors.nome ? 'error' : ''}
          />
          {errors.nome && <span className="error-message">{errors.nome}</span>}
        </div>
        
        {/* Telefone */}
        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
            className={errors.telefone ? 'error' : ''}
          />
          {errors.telefone && <span className="error-message">{errors.telefone}</span>}
        </div>
        
        {/* Email */}
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>
        
        {/* CPF/CNPJ */}
        <div className="form-group">
          <label>CPF/CNPJ *</label>
          <input
            type="text"
            value={formData.documento || ''}
            onChange={(e) => handleChange('documento', e.target.value)}
            placeholder="000.000.000-00"
            className={errors.documento ? 'error' : ''}
          />
          {errors.documento && <span className="error-message">{errors.documento}</span>}
        </div>

        {/* Inscrição Estadual */}
        <div className="form-group">
          <label>Inscrição Estadual {!isentoIE && '*'}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="isentoIE"
              checked={isentoIE}
              onChange={(e) => {
                setIsentoIE(e.target.checked);
                if (e.target.checked) {
                  handleChange('inscricao_estadual', 'ISENTO');
                } else {
                  handleChange('inscricao_estadual', '');
                }
              }}
              style={{ width: 'auto', margin: '0' }}
            />
            <label htmlFor="isentoIE" style={{ margin: '0', fontWeight: 'normal' }}>
              Isento de Inscrição Estadual
            </label>
          </div>
          <input
            type="text"
            value={formData.inscricao_estadual || ''}
            onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
            placeholder={isentoIE ? "ISENTO" : "00000000000000"}
            className={errors.inscricao_estadual ? 'error' : ''}
            disabled={isentoIE}
            style={isentoIE ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
          />
          {errors.inscricao_estadual && <span className="error-message">{errors.inscricao_estadual}</span>}
        </div>
        
        {/* Endereço - fluxo em cascata: CEP → UF → Cidade → Rua/Número/Bairro */}
        <div className="form-group full-width">
          <label>Endereço *</label>
          <div className="form-grid">
            {/* CEP */}
            <div className="form-group">
              <label>CEP</label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => handleChange('cep', e.target.value)}
                placeholder="00000-000"
              />
              {onlyDigits(formData.cep || '').length === 8 && !manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(true)}
                  style={{ marginTop: '6px' }}
                >
                  Editar manualmente UF/Cidade
                </button>
              )}
              {onlyDigits(formData.cep || '').length === 8 && manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(false)}
                  style={{ marginTop: '6px' }}
                >
                  Voltar ao modo CEP
                </button>
              )}
            </div>
            
            {/* UF */}
            <div className="form-group">
              <label>UF</label>
              <select
                value={formData.uf || ''}
                onChange={(e) => handleChange('uf', e.target.value)}
                disabled={onlyDigits(formData.cep || '').length === 8 && !manualEndereco}
              >
                <option value="">Selecione UF</option>
                {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            
            {/* Cidade */}
            <div className="form-group">
              <label>Cidade</label>
              <select
                value={formData.cidade || ''}
                onChange={(e) => handleChange('cidade', e.target.value)}
                disabled={!formData.uf || loadingCidades || (onlyDigits(formData.cep || '').length === 8 && !manualEndereco)}
              >
                <option value="">
                  {loadingCidades ? 'Carregando...' : (formData.uf ? 'Selecione a cidade' : 'Selecione UF primeiro')}
                </option>
                {cidadesUF.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>
            
            {/* Campos de endereço detalhado (aparecem após UF e Cidade) */}
            {formData.uf && formData.cidade && (
              <>
                <div className="form-group">
                  <label>Rua/Avenida</label>
                  <input
                    type="text"
                    value={formData.logradouro || ''}
                    onChange={(e) => handleChange('logradouro', e.target.value)}
                    placeholder="Logradouro"
                  />
                </div>
                <div className="form-group">
                  <label>Número</label>
                  <input
                    type="text"
                    value={formData.numero || ''}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Número"
                  />
                </div>
                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro || ''}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Campo composto (somente leitura) */}
          <input
            type="text"
            value={formData.endereco || ''}
            readOnly
            placeholder="Endereço completo (gerado automaticamente)"
            className={errors.endereco ? 'error' : ''}
            style={{ marginTop: '8px' }}
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
        
        {/* Observações */}
        <div className="form-group">
          <label>Observações</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais..."
            rows="3"
          />
        </div>
      </div>
    </div>
  );
};

export default ClienteFormDetalhado;

