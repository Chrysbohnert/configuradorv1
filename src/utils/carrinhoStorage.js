const CAMPOS_PERSISTIDOS = [
  'id',
  'nome',
  'modelo',
  'codigo_produto',
  'grafico_carga_url',
  'configuracao_lancas',
  'descricao',
  'nao_incluido',
  'finame',
  'ncm',
  'is_prototipo',
  'prototipo_label',
  'prototipo_observacoes_pdf',
  'prototipo_payment_set_id',
  'valor_instalacao_cliente',
  'valor_instalacao_incluso',
  'bloquear_desconto',
  'preco',
  'tipo',
  'quantidade',
  'cartItemId',
];

function valorPersistivel(valor) {
  if (valor == null || typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (typeof valor !== 'string') return undefined;
  if (/^(data:|blob:)/i.test(valor) || valor.length > 100000) return undefined;
  return valor;
}

export function compactarCarrinho(carrinho) {
  if (!Array.isArray(carrinho)) return [];
  return carrinho.filter((item) => item && typeof item === 'object').map((item) =>
    CAMPOS_PERSISTIDOS.reduce((compacto, campo) => {
      const valor = valorPersistivel(item[campo]);
      if (valor !== undefined) compacto[campo] = valor;
      return compacto;
    }, {})
  );
}

export function carregarCarrinho() {
  try {
    const salvo = localStorage.getItem('carrinho');
    const carrinho = salvo ? JSON.parse(salvo) : [];
    return Array.isArray(carrinho) ? carrinho : [];
  } catch (error) {
    console.warn('[carrinhoStorage] Não foi possível restaurar o carrinho:', error);
    return [];
  }
}

export function salvarCarrinho(carrinho) {
  try {
    localStorage.setItem('carrinho', JSON.stringify(compactarCarrinho(carrinho)));
    return true;
  } catch (error) {
    console.warn('[carrinhoStorage] Não foi possível persistir o carrinho; o estado em memória foi preservado:', error);
    return false;
  }
}
