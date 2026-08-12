import React from 'react';
import { maskPhone, maskCPF, maskCNPJ, onlyDigits } from '../../utils/masks';

/**
 * Campos de cadastro de cliente, reaproveitados em:
 * - src/lib/pages/Clientes.jsx (cadastro/edição administrativa)
 * - src/components/Clientes/ClienteSelectorStep.jsx (cadastro rápido dentro da Nova Proposta)
 *
 * Mantém EXATAMENTE os mesmos valores já usados pelas regras de pagamento/preço:
 * - tipo_venda: 'cliente' | 'revenda'                 (== PaymentPolicy.tipoCliente)
 * - participacao_revenda: 'sim' | 'nao'                (== PaymentPolicy.participacaoRevenda)
 * - tipo_cliente: 'produtor' | 'cnpj_cpf'               (== PaymentPolicy.tipoIE)
 * - regiao: label livre (== user.regioes_operacao / regiaoClienteSelecionada)
 */
export default function ClienteFormFields({
  formData,
  setFormData,
  regioesDisponiveis = [],
  errors = {},
  compact = false,
}) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentoChange = (value) => {
    const digits = onlyDigits(value);
    const masked = digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits);
    handleChange('documento', masked);
  };

  const mostraParticipacao = formData.tipo_venda === 'cliente';
  const mostraTipoCliente = mostraParticipacao && !!formData.participacao_revenda;

  return (
    <div style={{ display: 'grid', gap: compact ? '10px' : '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <Field label="Nome / Razão Social" required error={errors.nome}>
          <input
            type="text"
            value={formData.nome || ''}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Nome completo ou razão social"
          />
        </Field>

        <Field label="CPF/CNPJ" required error={errors.documento}>
          <input
            type="text"
            value={formData.documento || ''}
            onChange={(e) => handleDocumentoChange(e.target.value)}
            placeholder="000.000.000-00"
          />
        </Field>

        <Field label="Telefone" error={errors.telefone}>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="cliente@email.com"
          />
        </Field>

        <Field label="Inscrição Estadual" error={errors.inscricao_estadual}>
          <input
            type="text"
            value={formData.inscricao_estadual || ''}
            onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
            placeholder="ISENTO ou número"
          />
        </Field>

        <Field label="Endereço" error={errors.endereco}>
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Rua, número, bairro, cidade/UF"
          />
        </Field>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <Field label="Região do Cliente" required error={errors.regiao}>
          <select
            value={formData.regiao || ''}
            onChange={(e) => handleChange('regiao', e.target.value)}
          >
            <option value="">-- Selecione a região --</option>
            {regioesDisponiveis.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de Venda" required error={errors.tipo_venda}>
          <select
            value={formData.tipo_venda || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({
                ...prev,
                tipo_venda: value,
                // ao trocar tipo de venda, limpa dependentes (mesma regra do PaymentPolicy)
                participacao_revenda: value === 'revenda' ? '' : prev.participacao_revenda,
                tipo_cliente: value === 'revenda' ? '' : prev.tipo_cliente,
              }));
            }}
          >
            <option value="">-- Selecione --</option>
            <option value="cliente">Cliente (venda direta)</option>
            <option value="revenda">Revenda</option>
          </select>
        </Field>

        {mostraParticipacao && (
          <Field label="Participação de Revenda?" required error={errors.participacao_revenda}>
            <select
              value={formData.participacao_revenda || ''}
              onChange={(e) => handleChange('participacao_revenda', e.target.value)}
            >
              <option value="">-- Selecione --</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </Field>
        )}

        {mostraTipoCliente && (
          <Field label="Tipo de Cliente" required error={errors.tipo_cliente}>
            <select
              value={formData.tipo_cliente || ''}
              onChange={(e) => handleChange('tipo_cliente', e.target.value)}
            >
              <option value="">-- Selecione --</option>
              <option value="produtor">Produtor Rural</option>
              <option value="cnpj_cpf">CNPJ/CPF</option>
            </select>
          </Field>
        )}
      </div>

      <Field label="Observações" error={errors.observacoes}>
        <textarea
          rows={2}
          value={formData.observacoes || ''}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Informações adicionais sobre o cliente..."
        />
      </Field>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div className="cliente-field-input">
        {React.cloneElement(children, {
          style: {
            width: '100%',
            padding: '9px 12px',
            border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            ...(children.props.style || {}),
          },
        })}
      </div>
      {error && <span style={{ color: '#dc2626', fontSize: '12px' }}>{error}</span>}
    </div>
  );
}
