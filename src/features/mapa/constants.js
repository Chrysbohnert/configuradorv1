/** Constants for the territorial map module. */

export const MAP_W = 900;
export const MAP_H = 700;
export const MIN_K = 1;
export const MAX_K = 40;

export const UFS = [
  { code: '12', sigla: 'AC', nome: 'Acre' },
  { code: '27', sigla: 'AL', nome: 'Alagoas' },
  { code: '16', sigla: 'AP', nome: 'Amapa' },
  { code: '13', sigla: 'AM', nome: 'Amazonas' },
  { code: '29', sigla: 'BA', nome: 'Bahia' },
  { code: '23', sigla: 'CE', nome: 'Ceara' },
  { code: '53', sigla: 'DF', nome: 'Distrito Federal' },
  { code: '32', sigla: 'ES', nome: 'Espirito Santo' },
  { code: '52', sigla: 'GO', nome: 'Goias' },
  { code: '21', sigla: 'MA', nome: 'Maranhao' },
  { code: '51', sigla: 'MT', nome: 'Mato Grosso' },
  { code: '50', sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { code: '31', sigla: 'MG', nome: 'Minas Gerais' },
  { code: '15', sigla: 'PA', nome: 'Para' },
  { code: '25', sigla: 'PB', nome: 'Paraiba' },
  { code: '41', sigla: 'PR', nome: 'Parana' },
  { code: '26', sigla: 'PE', nome: 'Pernambuco' },
  { code: '22', sigla: 'PI', nome: 'Piaui' },
  { code: '33', sigla: 'RJ', nome: 'Rio de Janeiro' },
  { code: '24', sigla: 'RN', nome: 'Rio Grande do Norte' },
  { code: '43', sigla: 'RS', nome: 'Rio Grande do Sul' },
  { code: '11', sigla: 'RO', nome: 'Rondonia' },
  { code: '14', sigla: 'RR', nome: 'Roraima' },
  { code: '42', sigla: 'SC', nome: 'Santa Catarina' },
  { code: '35', sigla: 'SP', nome: 'Sao Paulo' },
  { code: '28', sigla: 'SE', nome: 'Sergipe' },
  { code: '17', sigla: 'TO', nome: 'Tocantins' },
];

export const ufByCode = new Map(UFS.map((u) => [u.code, u]));
export const ufBySigla = new Map(UFS.map((u) => [u.sigla, u]));

export const PALETTE = [
  '#e0653a', '#2f8f6b', '#3b6ea5', '#b8873b', '#8a4fa0',
  '#c2415f', '#2f7f8f', '#6b8f2f', '#a05a2f', '#4f5fa0',
];

export const colorOf = (i) => PALETTE[i % PALETTE.length];

export const CANAIS = [
  { value: 'concessionaria', label: 'Concessionarias' },
  { value: 'representante', label: 'Representantes' },
];

/** Editable territorial profile types. */
export const TIPOS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'concessionaria', label: 'Concessionaria' },
  { value: 'representante', label: 'Representante' },
];

/** Non-editable layer/display types used by map pins/filters. */
export const TIPOS_EXIBICAO = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'instaladora', label: 'Instaladora' },
];

export function tipoLabel(tipo) {
  const t = [...TIPOS, ...TIPOS_EXIBICAO].find((x) => x.value === tipo);
  return t ? t.label : tipo;
}

export function temArea(tipo) {
  return tipo === 'concessionaria' || tipo === 'representante';
}
