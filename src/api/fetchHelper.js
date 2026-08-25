/**
 * fetchHelper.js
 * Helper para fetch seguro que valida status e content-type antes de
 * tentar parsear JSON. Evita que respostas HTML/503 quebrem o app.
 */

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok || !isJson) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // ignore
    }

    const isHtml = bodyText.trim().startsWith('<');
    const status = response.status;

    if (!response.ok && isHtml) {
      throw new Error(`Servidor indisponível (HTTP ${status}). A API pode estar fora do ar ou o caminho está incorreto.`);
    }

    if (!response.ok) {
      throw new Error(bodyText || `Erro HTTP ${status}`);
    }

    throw new Error(`Resposta inesperada do servidor (content-type: ${contentType || 'desconhecido'}).`);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error('Resposta do servidor não é um JSON válido.');
  }

  if (json && typeof json === 'object' && 'success' in json && !json.success) {
    throw new Error(json.error || 'Erro na resposta da API');
  }

  return json;
}
