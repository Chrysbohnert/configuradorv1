import React from 'react';

const FormCaminhao = ({ formData, setFormData }) => {
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
          <span className="mr-2">🚛</span>
          Estudo Veicular
        </h3>
        <p className="text-sm text-gray-600">Informações do veículo para o orçamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Tipo *
          </label>
          <select
            name="tipo"
            value={formData.tipo || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            required
          >
            <option value="">Selecione o tipo</option>
            <option value="Truck">Truck</option>
            <option value="Truck Tractor">Truck Tractor</option>
            <option value="Truck 3/4">Truck 3/4</option>
            <option value="Truck Toco">Truck Toco</option>
            <option value="Carreta">Carreta</option>
            <option value="Bitruck">Bitruck</option>
            <option value="Tritruck">Tritruck</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        {/* Marca */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Marca *
          </label>
          <select
            name="marca"
            value={formData.marca || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            required
          >
            <option value="">Selecione a marca</option>
            <option value="Mercedes-Benz">Mercedes-Benz</option>
            <option value="Volvo">Volvo</option>
            <option value="Scania">Scania</option>
            <option value="Iveco">Iveco</option>
            <option value="DAF">DAF</option>
            <option value="MAN">MAN</option>
            <option value="Ford">Ford</option>
            <option value="Chevrolet">Chevrolet</option>
            <option value="Fiat">Fiat</option>
            <option value="Volkswagen">Volkswagen</option>
            <option value="Outra">Outra</option>
          </select>
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Modelo *
          </label>
          <input
            type="text"
            name="modelo"
            value={formData.modelo || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
            placeholder="Ex: Actros, FH, R-Series"
            required
          />
        </div>

        {/* Voltagem */}
        <div>
          <label className="block text-sm font-medium text-empresa-cinza mb-2">
            Voltagem
          </label>
          <select
            name="voltagem"
            value={formData.voltagem || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-empresa-vermelho focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-gray-50"
          >
            <option value="">Selecione a voltagem</option>
            <option value="12V">12V</option>
            <option value="24V">24V</option>
          </select>
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
            placeholder="Informações adicionais sobre o caminhão..."
          />
        </div>
      </div>

      {/* Resumo dos Dados */}
      {(formData.marca || formData.modelo || formData.tipo) && (
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <span className="mr-2">🚛</span>
            Veículo Identificado
          </h4>
          <div className="text-sm text-blue-700 space-y-1">
            {formData.tipo && <p><strong>Tipo:</strong> {formData.tipo}</p>}
            {formData.marca && <p><strong>Marca:</strong> {formData.marca}</p>}
            {formData.modelo && <p><strong>Modelo:</strong> {formData.modelo}</p>}
            {formData.voltagem && <p><strong>Voltagem:</strong> {formData.voltagem}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormCaminhao;