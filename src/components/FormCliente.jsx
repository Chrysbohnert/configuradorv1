import React from 'react';

const FormCliente = ({ formData, setFormData }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-empresa-cinza mb-2 flex items-center justify-center">
          <span className="mr-2">👤</span>
          Dados do Cliente
        </h3>
        <p className="text-sm text-gray-600">Preencha as informações do cliente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Nome Completo *
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="Digite o nome completo"
            required
          />
        </div>

        {/* Documento */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            CPF/CNPJ *
          </label>
          <input
            type="text"
            name="documento"
            value={formData.documento || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="000.000.000-00"
            required
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Telefone *
          </label>
          <input
            type="tel"
            name="telefone"
            value={formData.telefone || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="(11) 99999-9999"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="cliente@email.com"
          />
        </div>

        {/* Inscrição Estadual */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Inscrição Estadual
          </label>
          <input
            type="text"
            name="inscricaoEstadual"
            value={formData.inscricaoEstadual || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="000.000.000.000"
          />
        </div>

        {/* Endereço */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Endereço Completo
          </label>
          <input
            type="text"
            name="endereco"
            value={formData.endereco || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="Rua, número, bairro"
          />
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Cidade
          </label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="Nome da cidade"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Estado
          </label>
          <select
            name="uf"
            value={formData.uf || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
          >
            <option value="">Selecione o estado</option>
            <option value="SP">São Paulo</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="MG">Minas Gerais</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="PR">Paraná</option>
            <option value="SC">Santa Catarina</option>
            <option value="BA">Bahia</option>
            <option value="GO">Goiás</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="ES">Espírito Santo</option>
            <option value="CE">Ceará</option>
            <option value="PE">Pernambuco</option>
            <option value="PA">Pará</option>
            <option value="AM">Amazonas</option>
            <option value="MA">Maranhão</option>
            <option value="PB">Paraíba</option>
            <option value="PI">Piauí</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="AL">Alagoas</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
            <option value="RO">Rondônia</option>
            <option value="AC">Acre</option>
            <option value="AP">Amapá</option>
            <option value="RR">Roraima</option>
            <option value="DF">Distrito Federal</option>
          </select>
        </div>

        {/* CEP */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            CEP
          </label>
          <input
            type="text"
            name="cep"
            value={formData.cep || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="00000-000"
          />
        </div>

        {/* Observações */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Observações
          </label>
          <textarea
            name="observacoes"
            value={formData.observacoes || ''}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50 resize-none"
            placeholder="Informações adicionais sobre o cliente..."
          />
        </div>
      </div>

      {/* Resumo dos Dados */}
      {(formData.nome || formData.documento || formData.telefone) && (
        <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <span className="mr-2">✅</span>
            Dados Preenchidos
          </h4>
          <div className="text-sm text-green-700 space-y-1">
            {formData.nome && <p><strong>Nome:</strong> {formData.nome}</p>}
            {formData.documento && <p><strong>Documento:</strong> {formData.documento}</p>}
            {formData.telefone && <p><strong>Telefone:</strong> {formData.telefone}</p>}
            {formData.inscricaoEstadual && <p><strong>Inscrição Estadual:</strong> {formData.inscricaoEstadual}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormCliente;