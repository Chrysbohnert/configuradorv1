import { DESCRICOES_OPCIONAIS } from './codigosGuindaste';

// Mapeamento centralizado de opcionais para imagens ilustrativas.
// Pode ser indexado pelo código do opcional ou pelo nome/descrição exibido.
export const OPCIONAL_IMAGES = {
  // Controle Remoto
  'CR': '/opcionais/controle-remoto.png',
  'Controle Remoto': '/opcionais/controle-remoto.png',
  'Controle Remoto Alfa Tronic': '/opcionais/controle-remoto.png',

  // Extensiva Hidráulica
  'EH': '/opcionais/extensiva-hidraulica.png',
  'Extensiva Hidráulica': '/opcionais/extensiva-hidraulica.png',

  // Preparação para Garra / Perfuratriz
  'P': '/opcionais/preparacao-garra-perfuratriz.png',
  'GR': '/opcionais/preparacao-garra-perfuratriz.png',
  'Preparação p/ Garra': '/opcionais/preparacao-garra-perfuratriz.png',
  'Preparação p/ Garra e Rotator': '/opcionais/preparacao-garra-perfuratriz.png',
  'Preparação p/ Perfuratriz': '/opcionais/preparacao-garra-perfuratriz.png',
  'Preparação para Garra': '/opcionais/preparacao-garra-perfuratriz.png',
  'Preparação para Perfuratriz': '/opcionais/preparacao-garra-perfuratriz.png',

  // Patolamento Traseiro
  'PTR': '/opcionais/patolamento-traseiro.png',
  'Patolamento Traseiro': '/opcionais/patolamento-traseiro.png',
};

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();

const IMAGES_BY_NORMALIZED_KEY = Object.fromEntries(
  Object.entries(OPCIONAL_IMAGES).map(([key, src]) => [normalize(key), src])
);

/**
 * Retorna o caminho da imagem de um opcional, buscando pelo código ou nome.
 * Retorna null quando não houver imagem cadastrada.
 */
export function getOpcionalImage(value) {
  if (!value) return null;
  if (OPCIONAL_IMAGES[value]) return OPCIONAL_IMAGES[value];

  const normalized = normalize(value);
  if (IMAGES_BY_NORMALIZED_KEY[normalized]) {
    return IMAGES_BY_NORMALIZED_KEY[normalized];
  }

  // Fallback por substring (ex.: "Controle Remoto Alfa Tronic" → "Controle Remoto")
  for (const [key, src] of Object.entries(IMAGES_BY_NORMALIZED_KEY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return src;
    }
  }

  return null;
}

/**
 * Dada a string de opcionais de uma variante (ex.: "CR/EH/P"),
 * retorna um array com os caminhos das imagens correspondentes,
 * sem duplicatas. Opcionais sem imagem são ignorados.
 */
export function getOpcionalImagesFromVariant(optStr) {
  if (!optStr) return [];

  const codes = optStr.split('/').map(s => s.trim()).filter(Boolean);
  const images = [];
  const seen = new Set();

  codes.forEach((code) => {
    const desc = DESCRICOES_OPCIONAIS[code] || code;
    const src = getOpcionalImage(code) || getOpcionalImage(desc);
    if (src && !seen.has(src)) {
      seen.add(src);
      images.push(src);
    }
  });

  return images;
}
