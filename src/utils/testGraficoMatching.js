// Utilitário para testar matching de gráficos de carga
// Use no console do navegador para debugar problemas de matching

import { buildGraficoKey, resolveGraficoUrl } from './modelNormalization';

/**
 * Testa o matching de um modelo específico contra os gráficos cadastrados
 * 
 * Uso no console:
 * import { testGraficoMatching } from './utils/testGraficoMatching';
 * testGraficoMatching('GSI 10.8 C', graficosCadastrados);
 */
export function testGraficoMatching(modeloParaTestar, graficosCadastrados) {
  console.group(`🧪 Teste de Matching: "${modeloParaTestar}"`);
  
  // 1. Normalizar o modelo de entrada
  const chaveNormalizada = buildGraficoKey(modeloParaTestar);
  console.log(`📝 Modelo original: "${modeloParaTestar}"`);
  console.log(`🔑 Chave normalizada: "${chaveNormalizada}"`);
  console.log('');
  
  // 2. Indexar os gráficos cadastrados
  const indexPdfPorChave = new Map();
  console.log('📊 Gráficos cadastrados:');
  for (const g of graficosCadastrados || []) {
    const chaves = [
      buildGraficoKey(g.nome || ''),
      buildGraficoKey(g.modelo || ''),
    ].filter(Boolean);
    
    console.log(`   📄 ${g.nome || g.modelo}:`);
    chaves.forEach(chave => {
      if (!indexPdfPorChave.has(chave)) {
        indexPdfPorChave.set(chave, g.arquivo_url);
        console.log(`      ➜ Chave: "${chave}"`);
      }
    });
  }
  console.log('');
  
  // 3. Tentar resolver
  console.log('🔍 Tentando resolver...');
  const url = resolveGraficoUrl(indexPdfPorChave, chaveNormalizada);
  
  if (url) {
    console.log(`✅ MATCH ENCONTRADO!`);
    console.log(`📎 URL: ${url}`);
  } else {
    console.log(`❌ NENHUM MATCH ENCONTRADO`);
    console.log(`💡 Sugestões:`);
    console.log(`   1. Verifique se o gráfico está cadastrado no banco`);
    console.log(`   2. Verifique se o nome/modelo do gráfico está correto`);
    console.log(`   3. Possíveis chaves a cadastrar:`, [chaveNormalizada]);
  }
  
  console.groupEnd();
  return url;
}

/**
 * Lista todos os gráficos cadastrados com suas chaves normalizadas
 */
export function listarGraficosCadastrados(graficosCadastrados) {
  console.group('📋 Lista de Gráficos Cadastrados');
  
  const lista = [];
  for (const g of graficosCadastrados || []) {
    const chaves = [
      buildGraficoKey(g.nome || ''),
      buildGraficoKey(g.modelo || ''),
    ].filter(Boolean);
    
    const uniqueChaves = [...new Set(chaves)];
    
    lista.push({
      nome: g.nome,
      modelo: g.modelo,
      chaves: uniqueChaves,
      url: g.arquivo_url
    });
  }
  
  console.table(lista);
  console.groupEnd();
  
  return lista;
}

/**
 * Testa múltiplos modelos de uma vez
 */
export function testarMultiplosModelos(modelos, graficosCadastrados) {
  console.group('🧪 Teste em Lote');
  
  const resultados = modelos.map(modelo => {
    const chave = buildGraficoKey(modelo);
    const indexPdfPorChave = new Map();
    
    for (const g of graficosCadastrados || []) {
      const candidatos = [
        buildGraficoKey(g.nome || ''),
        buildGraficoKey(g.modelo || ''),
      ].filter(Boolean);
      
      for (const key of candidatos) {
        if (g.arquivo_url && !indexPdfPorChave.has(key)) {
          indexPdfPorChave.set(key, g.arquivo_url);
        }
      }
    }
    
    const url = resolveGraficoUrl(indexPdfPorChave, chave);
    
    return {
      original: modelo,
      normalizado: chave,
      encontrado: !!url,
      url: url ? url.substring(0, 50) + '...' : 'N/A'
    };
  });
  
  console.table(resultados);
  console.groupEnd();
  
  return resultados;
}

// Exemplos de uso para testar no console:
export const exemplosDeUso = `
// ===== EXEMPLOS DE USO =====

// 1. Testar um modelo específico
import { db } from '../config/supabase';
import { testGraficoMatching } from './testGraficoMatching';

const graficos = await db.getGraficosCarga();
testGraficoMatching('GSI 10.8 C', graficos);

// 2. Listar todos os gráficos cadastrados
import { listarGraficosCadastrados } from './testGraficoMatching';
listarGraficosCadastrados(graficos);

// 3. Testar múltiplos modelos
import { testarMultiplosModelos } from './testGraficoMatching';
const modelos = ['GSI 10.8 C', 'GSE 8.0', 'GSI 12.8 T'];
testarMultiplosModelos(modelos, graficos);
`;

console.log(exemplosDeUso);

