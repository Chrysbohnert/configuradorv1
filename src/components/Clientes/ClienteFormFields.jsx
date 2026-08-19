import React, { useEffect } from 'react';
import { maskPhone, maskCPF, maskCNPJ, onlyDigits } from '../../utils/masks';

const UFs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

/**
 * Campos de cadastro de cliente, reaproveitados em:
 * - src/lib/pages/Clientes.jsx (cadastro/edição administrativa)
 * - src/components/Clientes/ClienteSelectorStep.jsx (cadastro rápido dentro da Nova Proposta)
 *
 * Mantém EXATAMENTE os mesmos valores já usados pelas regras de pagamento/preço:
 * - tipo_venda: 'cliente' | 'revenda'                 (== PaymentPolicy.tipoCliente)
 * - participacao_revenda: 'sim' | 'nao'                (== PaymentPolicy.participacaoRevenda)
 * - tipo_cliente: 'produtor' | 'cnpj_cpf'               (== PaymentPolicy.tipoIE)
 *     Derivado internamente a partir de documento_tipo + possui_ie
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

  const handleDocumentoTipoChange = (tipo) => {
    setFormData((prev) => ({
      ...prev,
      documento_tipo: tipo,
      documento: '',
    }));
  };

  // Detecta o tipo de documento a partir do valor salvo (edição de clientes antigos).
  useEffect(() => {
    if (!formData.id || formData.documento_tipo) return;
    const digits = onlyDigits(formData.documento || '');
    if (digits.length > 11) {
      setFormData((prev) => ({ ...prev, documento_tipo: 'cnpj' }));
    } else if (digits.length > 0) {
      setFormData((prev) => ({ ...prev, documento_tipo: 'cpf' }));
    }
  }, [formData.id, formData.documento, formData.documento_tipo]);

  const handleDocumentoChange = (value) => {
    const digits = onlyDigits(value);
    const isCNPJ = formData.documento_tipo === 'cnpj';
    const masked = isCNPJ ? maskCNPJ(digits) : maskCPF(digits);
    handleChange('documento', masked);
  };

  // Deriva internamente o tipo_cliente esperado pelo PaymentPolicy.
  // 'produtor'  => cliente possui Inscrição Estadual.
  // 'cnpj_cpf'  => cliente NÃO possui Inscrição Estadual.
  useEffect(() => {
    setFormData((prev) => {
      const { documento_tipo, possui_ie } = prev;
      let tipo_cliente = '';
      if (documento_tipo && possui_ie) {
        tipo_cliente = possui_ie === 'sim' ? 'produtor' : 'cnpj_cpf';
      }
      if (prev.tipo_cliente === tipo_cliente) return prev;
      return { ...prev, tipo_cliente };
    });
  }, [formData.documento_tipo, formData.possui_ie]);

  const mostraParticipacao = formData.tipo_venda === 'cliente';

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

        <Field label="Telefone" required error={errors.telefone}>
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

        <Field label="Tipo de Documento" required error={errors.documento_tipo}>
          <select
            value={formData.documento_tipo || ''}
            onChange={(e) => handleDocumentoTipoChange(e.target.value)}
          >
            <option value="">-- CPF ou CNPJ --</option>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
          </select>
        </Field>

        {formData.documento_tipo && (
          <Field label={formData.documento_tipo === 'cnpj' ? 'CNPJ' : 'CPF'} required error={errors.documento}>
            <input
              type="text"
              value={formData.documento || ''}
              onChange={(e) => handleDocumentoChange(e.target.value)}
              placeholder={formData.documento_tipo === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
            />
          </Field>
        )}

        <Field label="Possui Inscrição Estadual?" error={errors.possui_ie}>
          <select
            value={formData.possui_ie || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({
                ...prev,
                possui_ie: value,
                inscricao_estadual: value === 'sim' ? prev.inscricao_estadual : '',
              }));
            }}
          >
            <option value="">-- Selecione --</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </Field>

        {formData.possui_ie === 'sim' && (
          <Field label="Inscrição Estadual" error={errors.inscricao_estadual}>
            <input
              type="text"
              value={formData.inscricao_estadual || ''}
              onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
              placeholder="ISENTO ou número"
            />
          </Field>
        )}

        <Field label="Endereço" error={errors.endereco}>
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Rua, número, bairro"
          />
        </Field>

        <Field label="Cidade" error={errors.cidade}>
          <input
            type="text"
            value={formData.cidade || ''}
            onChange={(e) => handleChange('cidade', e.target.value)}
            placeholder="Cidade"
          />
        </Field>

        <Field label="UF" error={errors.uf}>
          <select
            value={formData.uf || ''}
            onChange={(e) => handleChange('uf', e.target.value)}
          >
            <option value="">-- UF --</option>
            {UFs.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </Field>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <Field label="Região do Cliente" error={errors.regiao}>
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

        <Field label="Tipo de Venda" error={errors.tipo_venda}>
          <select
            value={formData.tipo_venda || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({
                ...prev,
                tipo_venda: value,
                // ao trocar tipo de venda, limpa dependentes (mesma regra do PaymentPolicy)
                participacao_revenda: value === 'revenda' ? '' : prev.participacao_revenda,
              }));
            }}
          >
            <option value="">-- Selecione --</option>
            <option value="cliente">Cliente (venda direta)</option>
            <option value="revenda">Revenda</option>
          </select>
        </Field>

        {mostraParticipacao && (
          <Field label="Participação de Revenda?" error={errors.participacao_revenda}>
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
