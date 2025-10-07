import React, { useState, useEffect } from 'react';
import { validateCPF, validateCNPJ, validatePhone, validateName, validateEmail, validateInscricaoEstadual } from '../../utils/validation';

/**
 * Componente do formulário de dados do cliente
 * @param {Object} props
 * @param {Object} props.clienteData - Dados do cliente
 * @param {Function} props.onClienteDataChange - Callback quando dados mudam
 * @param {Object} props.errors - Erros de validação
 * @param {Function} props.onErrorsChange - Callback quando erros mudam
 * @param {boolean} props.clienteTemIE - Se cliente tem IE
 * @param {Function} props.onClienteIEChange - Callback para mudar IE
 * @param {Object} props.user - Dados do usuário logado
 */
const ClienteForm = ({ 
  clienteData, 
  onClienteDataChange, 
  errors, 
  onErrorsChange,
  clienteTemIE,
  onClienteIEChange,
  user 
}) => {
  const [formData, setFormData] = useState(clienteData);
  const [cidades, setCidades] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  // Sincronizar com dados externos
  useEffect(() => {
    setFormData(clienteData);
  }, [clienteData]);

  // Buscar CEP
  const fetchCEP = async (cep) => {
    if (!cep || cep.length < 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.ok) {
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
            cep: cep
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  // Carregar cidades por UF
  const loadCidades = async (uf) => {
    if (!uf || uf.length < 2) return;
    
    setLoadingCidades(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const arr = await res.json();
      setCidades(arr.map(cidade => cidade.nome).sort());
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      setCidades([]);
    } finally {
      setLoadingCidades(false);
    }
  };

  // Carregar cidades quando UF muda
  useEffect(() => {
    if (formData.uf) {
      loadCidades(formData.uf);
    }
  }, [formData.uf]);

  const handleInputChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onClienteDataChange(newData);

    // Limpar erro do campo quando usuário digita
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      onErrorsChange(newErrors);
    }
  };

  const handleCEPChange = (value) => {
    handleInputChange('cep', value);
    if (value.length === 8) {
      fetchCEP(value);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar nome
    const nomeError = validateName(formData.nome);
    if (nomeError) newErrors.nome = nomeError;

    // Validar documento (CPF ou CNPJ)
    if (formData.tipo_documento === 'cpf') {
      const cpfError = validateCPF(formData.documento);
      if (cpfError) newErrors.documento = cpfError;
    } else if (formData.tipo_documento === 'cnpj') {
      const cnpjError = validateCNPJ(formData.documento);
      if (cnpjError) newErrors.documento = cnpjError;
    }

    // Validar telefone
    const telefoneError = validatePhone(formData.telefone);
    if (telefoneError) newErrors.telefone = telefoneError;

    // Validar email (opcional)
    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    // Validar inscrição estadual (opcional)
    if (formData.inscricao_estadual) {
      const ieError = validateInscricaoEstadual(formData.inscricao_estadual);
      if (ieError) newErrors.inscricao_estadual = ieError;
    }

    onErrorsChange(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar automaticamente quando dados mudam
  useEffect(() => {
    if (formData.nome && formData.documento && formData.telefone) {
      validateForm();
    }
  }, [formData]);

  return (
    <div className="cliente-form">
      <h3>Dados do Cliente</h3>
      
      {/* Nome */}
      <div className="form-group">
        <label htmlFor="nome">Nome/Razão Social *</label>
        <input
          id="nome"
          type="text"
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
          placeholder="Digite o nome completo ou razão social"
          className={errors.nome ? 'error' : ''}
        />
        {errors.nome && <span className="error-message">{errors.nome}</span>}
      </div>

      {/* Tipo de Documento */}
      <div className="form-group">
        <label>Tipo de Documento *</label>
        <div className="radio-group">
          <label className={`radio-option ${formData.tipo_documento === 'cpf' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="tipo_documento"
              value="cpf"
              checked={formData.tipo_documento === 'cpf'}
              onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
            />
            <span>CPF</span>
          </label>
          <label className={`radio-option ${formData.tipo_documento === 'cnpj' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="tipo_documento"
              value="cnpj"
              checked={formData.tipo_documento === 'cnpj'}
              onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
            />
            <span>CNPJ</span>
          </label>
        </div>
      </div>

      {/* Documento */}
      <div className="form-group">
        <label htmlFor="documento">
          {formData.tipo_documento === 'cpf' ? 'CPF' : 'CNPJ'} *
        </label>
        <input
          id="documento"
          type="text"
          value={formData.documento || ''}
          onChange={(e) => handleInputChange('documento', e.target.value)}
          placeholder={formData.tipo_documento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
          className={errors.documento ? 'error' : ''}
        />
        {errors.documento && <span className="error-message">{errors.documento}</span>}
      </div>

      {/* Telefone */}
      <div className="form-group">
        <label htmlFor="telefone">Telefone *</label>
        <input
          id="telefone"
          type="tel"
          value={formData.telefone || ''}
          onChange={(e) => handleInputChange('telefone', e.target.value)}
          placeholder="(00) 00000-0000"
          className={errors.telefone ? 'error' : ''}
        />
        {errors.telefone && <span className="error-message">{errors.telefone}</span>}
      </div>

      {/* Email */}
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="email@exemplo.com"
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      {/* Inscrição Estadual */}
      <div className="form-group">
        <label htmlFor="inscricao_estadual">Inscrição Estadual</label>
        <input
          id="inscricao_estadual"
          type="text"
          value={formData.inscricao_estadual || ''}
          onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
          placeholder="Digite a inscrição estadual"
          className={errors.inscricao_estadual ? 'error' : ''}
        />
        {errors.inscricao_estadual && <span className="error-message">{errors.inscricao_estadual}</span>}
      </div>

      {/* Endereço */}
      <div className="form-group">
        <label htmlFor="endereco">Endereço *</label>
        <input
          id="endereco"
          type="text"
          value={formData.endereco || ''}
          onChange={(e) => handleInputChange('endereco', e.target.value)}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      {/* Bairro */}
      <div className="form-group">
        <label htmlFor="bairro">Bairro</label>
        <input
          id="bairro"
          type="text"
          value={formData.bairro || ''}
          onChange={(e) => handleInputChange('bairro', e.target.value)}
          placeholder="Nome do bairro"
        />
      </div>

      {/* CEP */}
      <div className="form-group">
        <label htmlFor="cep">CEP</label>
        <input
          id="cep"
          type="text"
          value={formData.cep || ''}
          onChange={(e) => handleCEPChange(e.target.value.replace(/\D/g, ''))}
          placeholder="00000-000"
          maxLength="8"
        />
      </div>

      {/* UF */}
      <div className="form-group">
        <label htmlFor="uf">UF *</label>
        <select
          id="uf"
          value={formData.uf || ''}
          onChange={(e) => handleInputChange('uf', e.target.value)}
        >
          <option value="">Selecione o estado</option>
          <option value="AC">Acre</option>
          <option value="AL">Alagoas</option>
          <option value="AP">Amapá</option>
          <option value="AM">Amazonas</option>
          <option value="BA">Bahia</option>
          <option value="CE">Ceará</option>
          <option value="DF">Distrito Federal</option>
          <option value="ES">Espírito Santo</option>
          <option value="GO">Goiás</option>
          <option value="MA">Maranhão</option>
          <option value="MT">Mato Grosso</option>
          <option value="MS">Mato Grosso do Sul</option>
          <option value="MG">Minas Gerais</option>
          <option value="PA">Pará</option>
          <option value="PB">Paraíba</option>
          <option value="PR">Paraná</option>
          <option value="PE">Pernambuco</option>
          <option value="PI">Piauí</option>
          <option value="RJ">Rio de Janeiro</option>
          <option value="RN">Rio Grande do Norte</option>
          <option value="RS">Rio Grande do Sul</option>
          <option value="RO">Rondônia</option>
          <option value="RR">Roraima</option>
          <option value="SC">Santa Catarina</option>
          <option value="SP">São Paulo</option>
          <option value="SE">Sergipe</option>
          <option value="TO">Tocantins</option>
        </select>
      </div>

      {/* Cidade */}
      <div className="form-group">
        <label htmlFor="cidade">Cidade *</label>
        <select
          id="cidade"
          value={formData.cidade || ''}
          onChange={(e) => handleInputChange('cidade', e.target.value)}
          disabled={!formData.uf || loadingCidades}
        >
          <option value="">
            {loadingCidades ? 'Carregando cidades...' : 'Selecione a cidade'}
          </option>
          {cidades.map(cidade => (
            <option key={cidade} value={cidade}>{cidade}</option>
          ))}
        </select>
      </div>

      {/* Observações */}
      <div className="form-group">
        <label htmlFor="observacoes">Observações</label>
        <textarea
          id="observacoes"
          value={formData.observacoes || ''}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Informações adicionais sobre o cliente"
          rows="3"
        />
      </div>

      {/* Campo de IE - apenas para vendedores do Rio Grande do Sul */}
      {user?.regiao === 'rio grande do sul' && (
        <div className="form-group">
          <label>Cliente possui Inscrição Estadual? *</label>
          <div className="radio-group">
            <label className={`radio-option ${clienteTemIE ? 'selected' : ''}`}>
              <input
                type="radio"
                name="clienteIE"
                checked={clienteTemIE}
                onChange={() => onClienteIEChange && onClienteIEChange(true)}
              />
              <span>Com IE</span>
            </label>
            <label className={`radio-option ${!clienteTemIE ? 'selected' : ''}`}>
              <input
                type="radio"
                name="clienteIE"
                checked={!clienteTemIE}
                onChange={() => onClienteIEChange && onClienteIEChange(false)}
              />
              <span>Sem IE</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteForm;
