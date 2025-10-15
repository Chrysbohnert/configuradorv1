import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
  console.error('📋 Verifique se o arquivo .env.local existe e contém:');
  console.error('   VITE_SUPABASE_URL=sua-url');
  console.error('   VITE_SUPABASE_ANON_KEY=sua-chave');
  throw new Error('Variáveis de ambiente do Supabase não configuradas!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  }
});

// Classe para operações do banco de dados
class DatabaseService {
  // ===== USUÁRIOS =====
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  async createUser(userData) {
    // Se a senha não estiver em hash, fazer hash automaticamente
    if (userData.senha && !this.isPasswordHashed(userData.senha)) {
      const { hashPassword } = await import('../utils/passwordHash');
      userData.senha = hashPassword(userData.senha);
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Verificar se a senha já está em hash
  isPasswordHashed(password) {
    return password && password.length === 64 && /^[a-f0-9]+$/i.test(password);
  }

  async updateUser(id, userData) {
    // Se a senha não estiver em hash, fazer hash automaticamente
    if (userData.senha && !this.isPasswordHashed(userData.senha)) {
      const { hashPassword } = await import('../utils/passwordHash');
      userData.senha = hashPassword(userData.senha);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteUser(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ===== GUINDASTES =====
  async getGuindastes() {
    const { data, error } = await supabase
      .from('guindastes')
      .select('*')
      .order('subgrupo');
    
    if (error) throw error;
    return data || [];
  }

  // Cache para evitar múltiplas requisições
  _guindastesCache = new Map();

  // Função para limpar cache manualmente
  clearGuindastesCache() {
    console.log('🗑️ Limpando cache de guindastes...');
    this._guindastesCache.clear();
  }

  // Versão leve para listagens: apenas campos necessários, com paginação e busca
  async getGuindastesLite(page = 1, pageSize = 100, forceRefresh = false) {
    const cacheKey = `guindastes_lite_${page}_${pageSize}`;
    const now = Date.now();
    
    // Verificar cache apenas se não for forceRefresh
    if (!forceRefresh && this._guindastesCache.has(cacheKey)) {
      const cached = this._guindastesCache.get(cacheKey);
      const isExpired = now - cached.timestamp > 10 * 60 * 1000; // 10 minutos
      
      if (!isExpired) {
        console.log('🔄 [getGuindastesLite] Usando dados do cache');
        return cached.data;
      } else {
        console.log('⏰ [getGuindastesLite] Cache expirado, removendo...');
        this._guindastesCache.delete(cacheKey);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      console.log('🔍 [getGuindastesLite] Executando query otimizada...');
      
      // Query otimizada - sem count para evitar timeout
      const { data, error } = await supabase
        .from('guindastes')
        .select('id, subgrupo, modelo, imagem_url, codigo_referencia, peso_kg')
        .order('subgrupo')
        .range(from, to);

      if (error) {
        console.error('❌ [getGuindastesLite] Erro na query:', error);
        console.error('❌ [getGuindastesLite] Detalhes:', error.message);
        throw error;
      }

      // Estimar count baseado nos dados retornados para evitar timeout
      let count = 0;
      if (page === 1 && data && data.length > 0) {
        // Se retornou dados completos (menos que pageSize), usar o length
        if (data.length < pageSize) {
          count = data.length;
        } else {
          // Estimar baseado na paginação (não é exato, mas evita timeout)
          count = pageSize * 10; // Estimativa conservadora
        }
        console.log('📊 [getGuindastesLite] Count estimado:', count);
      }

      const result = {
        data: data || [],
        count: count,
        page,
        pageSize
      };

      // Armazenar no cache
      this._guindastesCache.set(cacheKey, {
        data: result,
        timestamp: now
      });

      // Limpar cache antigo (manter apenas últimos 10)
      if (this._guindastesCache.size > 10) {
        const oldestKey = Array.from(this._guindastesCache.keys())[0];
        this._guindastesCache.delete(oldestKey);
      }

      console.log('✅ [getGuindastesLite] Query executada com sucesso, registros:', data?.length || 0);
      return result;
      
    } catch (error) {
      console.error('❌ [getGuindastesLite] Erro geral:', error);
      throw error;
    }
  }

  // ⚡ OTIMIZAÇÃO: Buscar guindaste completo por ID com cache
  async getGuindasteCompleto(id) {
    const cacheKey = `guindaste_${id}`;
    
    // Verificar cache primeiro
    if (this._guindastesCache.has(cacheKey)) {
      const cached = this._guindastesCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 10 * 60 * 1000) { // 10 minutos de cache
        return cached.data;
      }
    }

    const { data, error } = await supabase
      .from('guindastes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Armazenar no cache
    this._guindastesCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }

  async createGuindaste(guindasteData) {
    console.log('🔧 [createGuindaste] Dados recebidos:', guindasteData);
    console.log('🔧 [createGuindaste] Campos do objeto:', Object.keys(guindasteData));
    
    // Verificar se código de referência já existe
    if (guindasteData.codigo_referencia) {
      console.log('🔍 [createGuindaste] Verificando se código de referência já existe:', guindasteData.codigo_referencia);
      const { data: existingCode, error: checkError } = await supabase
        .from('guindastes')
        .select('id, codigo_referencia')
        .eq('codigo_referencia', guindasteData.codigo_referencia)
        .limit(1);
      
      if (checkError) {
        console.error('❌ [createGuindaste] Erro ao verificar código:', checkError);
      } else if (existingCode && existingCode.length > 0) {
        console.error('❌ [createGuindaste] Código de referência já existe:', existingCode[0]);
        throw new Error(`Código de referência "${guindasteData.codigo_referencia}" já existe no sistema. Use um código único.`);
      } else {
        console.log('✅ [createGuindaste] Código de referência disponível');
      }
    }
    
    // Criar uma cópia limpa dos dados, removendo TODOS os campos que possam causar conflito
    const cleanData = {
      subgrupo: guindasteData.subgrupo,
      modelo: guindasteData.modelo,
      grupo: guindasteData.grupo,
      peso_kg: guindasteData.peso_kg,
      configuração: guindasteData.configuração,
      tem_contr: guindasteData.tem_contr,
      imagem_url: guindasteData.imagem_url,
      descricao: guindasteData.descricao,
      nao_incluido: guindasteData.nao_incluido,
      imagens_adicionais: guindasteData.imagens_adicionais,
      codigo_referencia: guindasteData.codigo_referencia,
      finame: guindasteData.finame,
      ncm: guindasteData.ncm
    };
    
    console.log('🔧 [createGuindaste] Dados limpos para inserção:', cleanData);
    console.log('🔧 [createGuindaste] Campos limpos:', Object.keys(cleanData));
    
    // Verificar se há algum campo com UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    // UUIDs têm exatamente 36 caracteres e 4 hífens em posições específicas
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string' && uuidRegex.test(cleanData[key])) {
        console.log('⚠️ [createGuindaste] Campo com UUID encontrado:', key, cleanData[key]);
        // Remover campos que são UUIDs
        delete cleanData[key];
      }
    });
    
    console.log('🔧 [createGuindaste] Dados finais após validação:', cleanData);
    
    // Garantir que o campo 'id' não está presente nos dados
    // O PostgreSQL deve gerar automaticamente usando a sequência
    if (cleanData.id) {
      console.warn('⚠️ [createGuindaste] Removendo campo id dos dados para permitir auto-increment');
      delete cleanData.id;
    }
    
    console.log('🔧 [createGuindaste] Dados finais para inserção (sem ID):', cleanData);
    
    const { data, error } = await supabase
      .from('guindastes')
      .insert([cleanData])
      .select();

    if (error) {
      console.error('❌ [createGuindaste] Erro na criação:', error);
      console.error('❌ [createGuindaste] Mensagem:', error.message);
      console.error('❌ [createGuindaste] Código:', error.code);
      console.error('❌ [createGuindaste] Detalhes:', error.details);
      console.error('❌ [createGuindaste] Dados que causaram erro:', cleanData);
      
      // Tratamento específico para erro de chave duplicada
      if (error.code === '23505') {
        if (error.message.includes('guindastes_pkey')) {
          throw new Error('Erro interno: Conflito de ID. Tente novamente ou contate o suporte.');
        } else if (error.message.includes('codigo_referencia')) {
          throw new Error('Código de referência já existe. Use um código único.');
        } else {
          throw new Error(`Conflito de dados: ${error.message}`);
        }
      }
      
      throw error;
    }
    
    console.log('✅ [createGuindaste] Guindaste criado com sucesso:', data);
    console.log('✅ [createGuindaste] ID do novo registro:', data[0]?.id);
    
    // Limpar cache após criação
    this.clearGuindastesCache();
    return data;
  }

  async updateGuindaste(id, guindasteData) {
    try {
      console.log('🔧 [updateGuindaste] ID recebido:', id, 'Tipo:', typeof id);
      
      // A tabela guindastes usa id como int4 (inteiro)
      // Converter ID para número inteiro
      const numericId = parseInt(id, 10);
      console.log('🔧 [updateGuindaste] ID convertido para número:', numericId);
      
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('ID inválido: deve ser um número inteiro positivo');
      }
      
      // Limpar dados antes de enviar para evitar problemas de tipo
      const cleanData = {
        // Garantir que campos de texto sejam strings válidas
        subgrupo: guindasteData.subgrupo || '',
        modelo: guindasteData.modelo || '',
        grupo: guindasteData.grupo || '',
        peso_kg: guindasteData.peso_kg || '',
        configuração: guindasteData.configuração || '',
        tem_contr: guindasteData.tem_contr || 'Não',
        imagem_url: guindasteData.imagem_url || null,
        descricao: guindasteData.descricao || null,
        nao_incluido: guindasteData.nao_incluido || null,
        codigo_referencia: guindasteData.codigo_referencia || null,
        finame: guindasteData.finame || null,
        ncm: guindasteData.ncm || null,
        // Garantir que arrays sejam válidos
        imagens_adicionais: Array.isArray(guindasteData.imagens_adicionais) 
          ? guindasteData.imagens_adicionais 
          : []
      };
      
      // Remover qualquer campo que possa conter UUID
      console.log('🔧 [updateGuindaste] Dados limpos:', cleanData);
      
      // Verificar se há algum campo com UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      // UUIDs têm exatamente 36 caracteres e 4 hífens em posições específicas
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      Object.keys(cleanData).forEach(key => {
        if (typeof cleanData[key] === 'string' && uuidRegex.test(cleanData[key])) {
          console.log('⚠️ [updateGuindaste] Campo com UUID encontrado:', key, cleanData[key]);
          // Remover campos que são UUIDs
          delete cleanData[key];
        }
      });
      
      console.log('🔧 [updateGuindaste] Dados finais após limpeza:', cleanData);

      console.log('🔧 [updateGuindaste] Executando query com ID numérico:', numericId);
      
      // Primeiro, verificar se o registro existe
      console.log('🔍 [updateGuindaste] Verificando se registro existe...');
      const { data: existingRecord, error: checkError } = await supabase
        .from('guindastes')
        .select('*') // Buscar TODOS os campos
        .eq('id', numericId)
        .single();
      
      if (checkError) {
        console.error('❌ [updateGuindaste] Registro não encontrado com ID:', numericId);
        throw new Error(`Guindaste com ID ${numericId} não encontrado`);
      }
      
      console.log('✅ [updateGuindaste] Registro encontrado:', existingRecord);
      
      // Comparação de dados para depuração
      console.log('🔍 [updateGuindaste] Dados existentes no DB:', existingRecord);
      console.log('🔍 [updateGuindaste] Dados a serem enviados:', cleanData);
      
      const changedFields = {};
      for (const key in cleanData) {
        if (cleanData[key] !== existingRecord[key]) {
          changedFields[key] = {
            old: existingRecord[key],
            new: cleanData[key]
          };
        }
      }
      
      if (Object.keys(changedFields).length === 0) {
        console.warn('⚠️ [updateGuindaste] Nenhum campo alterado detectado. Os dados enviados são idênticos aos existentes.');
        console.warn('⚠️ [updateGuindaste] Isso explica por que 0 linhas foram afetadas.');
        return existingRecord; // Retorna os dados existentes sem fazer UPDATE
      } else {
        console.log('✅ [updateGuindaste] Campos alterados detectados:', changedFields);
      }
      
      console.log('🔧 [updateGuindaste] Executando UPDATE com dados:', cleanData);
      console.log('🔧 [updateGuindaste] WHERE id =', numericId);
      
      // Tentar UPDATE sem SELECT primeiro
      const { error: updateError } = await supabase
        .from('guindastes')
        .update(cleanData)
        .eq('id', numericId);
        
      console.log('🔧 [updateGuindaste] Resultado do UPDATE:', { updateError });
      
      if (updateError) {
        console.error('❌ [updateGuindaste] Erro no UPDATE:', updateError);
        throw updateError;
      }
      
      // Depois fazer SELECT para verificar se foi atualizado
      const { data: updatedData, error: selectError } = await supabase
        .from('guindastes')
        .select('*')
        .eq('id', numericId)
        .single();
        
      console.log('🔧 [updateGuindaste] Verificação pós-UPDATE:', { updatedData, selectError });
      
      if (selectError) {
        console.error('❌ [updateGuindaste] Erro na verificação:', selectError);
        throw selectError;
      }
      
      const data = [updatedData]; // Simular array para compatibilidade
      
      console.log('✅ [updateGuindaste] Dados atualizados com sucesso:', data);
      console.log('✅ [updateGuindaste] Registros afetados:', data?.length || 0);
      
      // Limpar cache após atualização
      this.clearGuindastesCache();
      
      return data;
    } catch (err) {
      console.error('Erro ao atualizar guindaste:', err);
      throw err;
    }
  }

  async deleteGuindaste(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error('❌ ID inválido:', id);
      return null;
    }

    const { error } = await supabase
      .from('guindastes')
      .delete()
      .eq('id', numericId);

    if (error) {
      console.error('❌ Erro ao deletar guindaste:', error);
      return null;
    }
    
    // Limpar cache após operação de delete
    this.clearGuindastesCache();
    return { success: true };
  }

  // ===== LOGÍSTICA: CALENDÁRIO =====
  async getEventosLogistica({ startDate, endDate } = {}) {
    let query = supabase
      .from('eventos_logistica')
      .select('*')
      .order('data', { ascending: true });
    
    if (startDate) query = query.gte('data', startDate);
    if (endDate) query = query.lte('data', endDate);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createEventoLogistica(eventoData) {
    const { data, error } = await supabase
      .from('eventos_logistica')
      .insert([eventoData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventoLogistica(id, eventoData) {
    const { data, error } = await supabase
      .from('eventos_logistica')
      .update(eventoData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventoLogistica(id) {
    const { error } = await supabase
      .from('eventos_logistica')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ===== LOGÍSTICA: PRONTA ENTREGA =====
  async getProntaEntrega() {
    const { data, error } = await supabase
      .from('pronta_entrega')
      .select(`
        *,
        guindaste:guindastes(*)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addProntaEntrega(itemData) {
    const { data, error } = await supabase
      .from('pronta_entrega')
      .insert([itemData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProntaEntrega(id, itemData) {
    const { data, error } = await supabase
      .from('pronta_entrega')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removeProntaEntrega(id) {
    const { error } = await supabase
      .from('pronta_entrega')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Métodos relacionados a tabelas de opcionais foram removidos
  // pois não existem nas tabelas do projeto atual (ver Supabase).

  // Métodos de opcionais de equipamento removidos (tabelas ausentes)

  // ===== CLIENTES =====
  async getClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  async createCliente(clienteData) {
    const { data, error } = await supabase
      .from('clientes')
      .insert([clienteData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ===== CAMINHÕES =====
  async getCaminhoes() {
    const { data, error } = await supabase
      .from('caminhoes')
      .select('*')
      .order('placa');
    
    if (error) throw error;
    return data || [];
  }

  async createCaminhao(caminhaoData) {
    console.log('🔍 Tentando criar caminhão com dados:', caminhaoData);
    
    const { data, error } = await supabase
      .from('caminhoes')
      .insert([caminhaoData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro na criação do caminhão:', error);
      console.error('📋 Dados enviados:', caminhaoData);
      throw error;
    }
    
    console.log('✅ Caminhão criado com sucesso:', data);
    return data;
  }

  // ===== PEDIDOS =====
  async getPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        cliente:clientes(*),
        vendedor:users(*),
        caminhao:caminhoes(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createPedido(pedidoData) {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updatePedido(id, pedidoData) {
    const { data, error } = await supabase
      .from('pedidos')
      .update(pedidoData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ===== ITENS DO PEDIDO =====
  async createPedidoItem(itemData) {
    const { data, error } = await supabase
      .from('pedido_itens')
      .insert([itemData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getPedidoItens(pedidoId) {
    const { data, error } = await supabase
      .from('pedido_itens')
      .select(`
        *,
        guindaste:guindastes(*),
        opcional:opcionais(*)
      `)
      .eq('pedido_id', pedidoId);
    
    if (error) throw error;
    return data || [];
  }

  // Métodos de preços por região de equipamento removidos (tabela ausente)

  // ===== PREÇOS POR REGIÃO DO GUINDASTE =====
  async getPrecosPorRegiao(guindasteId) {
    const { data, error } = await supabase
      .from('precos_guindaste_regiao')
      .select('*')
      .eq('guindaste_id', guindasteId);
    
    if (error) throw error;
    return data || [];
  }

  async salvarPrecosPorRegiao(guindasteId, precos) {
    // Remove preços existentes
    await supabase
      .from('precos_guindaste_regiao')
      .delete()
      .eq('guindaste_id', guindasteId);

    // Adiciona os novos preços
    if (precos && precos.length > 0) {
      const { error } = await supabase
        .from('precos_guindaste_regiao')
        .insert(precos.map(p => ({
          guindaste_id: guindasteId,
          regiao: p.regiao,
          preco: p.preco
        })));
      
      if (error) throw error;
    }
  }

  // Buscar preço específico de um guindaste por região
  async getPrecoPorRegiao(guindasteId, regiao) {
    const { data, error } = await supabase
      .from('precos_guindaste_regiao')
      .select('preco')
      .eq('guindaste_id', guindasteId)
      .eq('regiao', regiao)
      .limit(1);
    
    if (error) {
      console.error('Erro ao buscar preço por região:', error);
      return 0;
    }
    
    // Se não encontrar preço ou array vazio, retornar 0
    if (!data || data.length === 0) return 0;
    
    return data[0]?.preco || 0;
  }

  // ===== GRÁFICOS DE CARGA =====
  async getGraficosCarga() {
    const { data, error } = await supabase
      .from('graficos_carga')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  // ===== FRETES POR CIDADE/OFICINA =====
  async getFretes() {
    const { data, error } = await supabase
      .from('fretes')
      .select('*')
      .order('cidade');

    if (error) throw error;
    return data || [];
  }

  async getFretePorCidade(cidade) {
    const { data, error } = await supabase
      .from('fretes')
      .select('*')
      .eq('cidade', cidade)
      .single();

    if (error) {
      console.error('Erro ao buscar frete por cidade:', error);
      return null;
    }

    return data;
  }
  
  async createGraficoCarga(graficoData) {
    const { data, error } = await supabase
      .from('graficos_carga')
      .insert([graficoData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getFretePorOficina(oficina) {
    const { data, error } = await supabase
      .from('fretes')
      .select('*')
      .eq('oficina', oficina)
      .single();

    if (error) {
      console.error('Erro ao buscar frete por oficina:', error);
      return null;
    }

    return data;
  }

  // Buscar pontos de instalação filtrados por grupo de região
  async getPontosInstalacaoPorRegiao(grupoRegiao) {
    console.log('🔍 [DB] Buscando pontos de instalação para grupo:', grupoRegiao);
    
    const { data, error } = await supabase
      .from('fretes')
      .select('*')
      .eq('regiao_grupo', grupoRegiao)
      .order('cidade');

    if (error) {
      console.error('❌ [DB] Erro ao buscar pontos de instalação:', error);
      throw error;
    }

    console.log('✅ [DB] Pontos encontrados:', data?.length || 0);
    return data || [];
  }

  // Buscar frete específico por oficina, cidade e UF (evita ambiguidade)
  async getFretePorOficinaCidadeUF(oficina, cidade, uf) {
    const { data, error } = await supabase
      .from('fretes')
      .select('*')
      .eq('oficina', oficina)
      .eq('cidade', cidade)
      .eq('uf', uf)
      .single();

    if (error) {
      console.error('Erro ao buscar frete específico:', error);
      return null;
    }

    return data;
  }

  async createFrete(freteData) {
    const { data, error } = await supabase
      .from('fretes')
      .insert([freteData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFrete(id, freteData) {
    const { data, error } = await supabase
      .from('fretes')
      .update(freteData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFrete(id) {
    const { error } = await supabase
      .from('fretes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
  async createGraficoCarga(graficoData) {
    const { data, error } = await supabase
      .from('graficos_carga')
      .insert([graficoData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateGraficoCarga(id, graficoData) {
    const { data, error } = await supabase
      .from('graficos_carga')
      .update(graficoData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteGraficoCarga(id) {
    const { error } = await supabase
      .from('graficos_carga')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async uploadGraficoCarga(file, fileName) {
    try {
      console.log('Iniciando upload do arquivo:', fileName);
      
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🔑 Nenhuma sessão Supabase ativa, verificando localStorage...');
        
        // Verificar se há indicação de sessão Supabase no localStorage
        const supabaseSession = localStorage.getItem('supabaseSession');
        
        if (supabaseSession === 'active') {
          console.log('🔄 Sessão Supabase marcada como ativa, tentando renovar...');
          
          // Tentar renovar a sessão
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.log('❌ Erro ao renovar sessão:', refreshError);
            // Se não conseguir renovar, tentar fazer sign in novamente
            throw new Error('Sessão Supabase expirada. Faça login novamente.');
          } else {
            console.log('✅ Sessão Supabase renovada com sucesso');
          }
        } else {
          throw new Error('Sessão Supabase não encontrada. Faça login novamente.');
        }
      }
      
      // Fazer upload diretamente (bucket já existe)
      const { data, error } = await supabase.storage
        .from('graficos-carga')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Erro no upload:', error);
        console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
        console.error('Mensagem do erro:', error.message);
        console.error('Código do erro:', error.code);
        
        // Se for erro de arquivo duplicado, tentar com upsert
        if (error.message && error.message.includes('already exists')) {
          console.log('Arquivo já existe, tentando com upsert...');
          const { data: upsertData, error: upsertError } = await supabase.storage
            .from('graficos-carga')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (upsertError) {
            console.error('Erro no upsert:', upsertError);
            throw upsertError;
          }
          
          const { data: urlData } = supabase.storage
            .from('graficos-carga')
            .getPublicUrl(fileName);
          
          return urlData.publicUrl;
        }
        
        throw error;
      }
      
      console.log('Upload realizado com sucesso:', data);
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('graficos-carga')
        .getPublicUrl(fileName);
      
      console.log('URL pública gerada:', urlData.publicUrl);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Erro completo no uploadGraficoCarga:', error);
      throw error;
    }
  }

  // Função para upload de imagens de guindastes
  async uploadImagemGuindaste(file, fileName) {
    try {
      console.log('Iniciando upload da imagem:', fileName);
      
      // Verificar se o bucket existe
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === 'guindastes');
      
      if (!bucketExists) {
        console.log('Bucket guindastes não existe, criando...');
        const { error: createError } = await supabase.storage.createBucket('guindastes', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (createError) {
          console.error('Erro ao criar bucket:', createError);
          throw new Error('Erro ao criar bucket de storage');
        }
      }
      
      // Fazer upload da imagem
      const { data, error } = await supabase.storage
        .from('guindastes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Erro no upload:', error);
        throw error;
      }
      
      console.log('Upload realizado com sucesso:', data);
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('guindastes')
        .getPublicUrl(fileName);
      
      console.log('URL pública gerada:', urlData.publicUrl);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Erro completo no uploadImagemGuindaste:', error);
      throw error;
    }
  }
}

// Instância única do serviço
export const db = new DatabaseService();

// ========================================
// FUNÇÕES DE DEBUG (apenas em desenvolvimento)
// ========================================
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('🔧 Funções de debug carregadas (modo desenvolvimento)');
  
  // Função de teste para verificar campos da tabela guindastes
  window.testGuindastesFields = async (guindasteId = 36) => {
    try {
      console.log('🔍 Testando campos da tabela guindastes...');
      console.log('📌 Buscando guindaste ID:', guindasteId);
      
      // Buscar registro específico
      const { data, error } = await supabase
        .from('guindastes')
        .select('*')
        .eq('id', guindasteId)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar guindaste:', error);
        return;
      }
      
      console.log('✅ Registro encontrado:', data);
      console.log('📋 Todos os campos:', Object.keys(data));
      console.log('📝 Campo descricao:', data.descricao);
      console.log('⚠️ Campo nao_incluido:', data.nao_incluido);
      
      // Verificar se os campos existem
      if ('descricao' in data) {
        console.log('✅ Campo "descricao" existe na tabela');
      } else {
        console.error('❌ Campo "descricao" NÃO existe na tabela!');
      }
      
      if ('nao_incluido' in data) {
        console.log('✅ Campo "nao_incluido" existe na tabela');
      } else {
        console.error('❌ Campo "nao_incluido" NÃO existe na tabela!');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };
  
  // Função para testar update direto
  window.testUpdateDescricao = async (guindasteId = 36) => {
    try {
      console.log('🧪 Testando update dos campos descricao e nao_incluido...');
      console.log('📌 ID do guindaste:', guindasteId);
      
      const testeDescricao = `Teste de descrição - ${new Date().toLocaleTimeString()}`;
      const testeNaoIncluido = `Teste não incluído - ${new Date().toLocaleTimeString()}`;
      
      console.log('📝 Tentando salvar:');
      console.log('   - descricao:', testeDescricao);
      console.log('   - nao_incluido:', testeNaoIncluido);
      
      // Tentar fazer update
      const { data, error } = await supabase
        .from('guindastes')
        .update({
          descricao: testeDescricao,
          nao_incluido: testeNaoIncluido
        })
        .eq('id', guindasteId)
        .select();
      
      if (error) {
        console.error('❌ ERRO no update:', error);
        console.error('   - Message:', error.message);
        console.error('   - Code:', error.code);
        console.error('   - Details:', error.details);
        console.error('   - Hint:', error.hint);
        return;
      }
      
      console.log('✅ Update executado sem erro');
      console.log('📦 Data retornada:', data);
      
      // Buscar novamente para confirmar
      const { data: verificacao, error: errorVerif } = await supabase
        .from('guindastes')
        .select('id, descricao, nao_incluido')
        .eq('id', guindasteId)
        .single();
      
      if (errorVerif) {
        console.error('❌ Erro ao verificar:', errorVerif);
        return;

      }
      
      console.log('🔍 Verificação após update:');
      console.log('   - descricao salva:', verificacao.descricao);
      console.log('   - nao_incluido salvo:', verificacao.nao_incluido);
      
      if (verificacao.descricao === testeDescricao && verificacao.nao_incluido === testeNaoIncluido) {
        console.log('✅ ✅ ✅ SUCESSO! Os dados foram salvos corretamente!');
      } else {
        console.error('❌ ❌ ❌ PROBLEMA! Os dados NÃO foram salvos!');
        console.error('📋 POSSÍVEIS CAUSAS:');
        console.error('   1. RLS (Row Level Security) bloqueando o update');
        console.error('   2. Trigger no banco limpando os campos');
        console.error('   3. Política de segurança no Supabase');
      }
      
      return verificacao;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };
}

// Função de teste para verificar buckets (disponível no console do navegador)
if (typeof window !== 'undefined') {
  window.testSupabaseStorage = async () => {
    try {
      console.log('🔍 Testando configuração do Supabase Storage...');
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Sessão ativa:', session ? 'Sim' : 'Não');
      
      if (!session) {
        console.error('❌ Nenhuma sessão ativa! Faça login primeiro.');
        console.log('💡 Dica: Vá para a página de login e faça login novamente.');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Usuário autenticado:', user ? 'Sim' : 'Não');
      console.log('🆔 ID do usuário:', user?.id);
      console.log('📧 Email do usuário:', user?.email);
      console.log('🔍 Metadata do usuário:', user?.user_metadata);
      
      if (!user) {
        console.error('❌ Usuário não autenticado! Faça login primeiro.');
        return;
      }
      
      // Listar buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Erro ao listar buckets:', bucketsError);
        console.error('Detalhes:', JSON.stringify(bucketsError, null, 2));
        return;
      }
      
      console.log('📦 Buckets encontrados:', buckets);
      
      // Verificar se graficos-carga existe
      const graficosBucket = buckets.find(b => b.name === 'graficos-carga');
      
      if (graficosBucket) {
        console.log('✅ Bucket graficos-carga encontrado:', graficosBucket);
        
        // Testar upload com PDF
        const testContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF';
        const testFile = new File([testContent], 'test.pdf', { type: 'application/pdf' });
        
        console.log('📤 Tentando upload de PDF de teste...');
        const { data, error } = await supabase.storage
          .from('graficos-carga')
          .upload(`test_${Date.now()}.pdf`, testFile);
        
        if (error) {
          console.error('❌ Erro no teste de upload:', error);
          console.error('Mensagem:', error.message);
          console.error('Código:', error.code);
          console.error('Detalhes:', JSON.stringify(error, null, 2));
          
          if (error.message.includes('row-level security policy')) {
            console.error('🔒 PROBLEMA IDENTIFICADO: Row Level Security (RLS)');
            console.error('📋 SOLUÇÃO: Configure as políticas de acesso no Supabase');
            console.error('📋 PASSO A PASSO:');
            console.error('1. Vá para o painel do Supabase');
            console.error('2. Storage → graficos-carga → Policies');
            console.error('3. Clique em "New Policy"');
            console.error('4. Selecione "Create a policy from scratch"');
            console.error('5. Configure:');
            console.error('   - Policy name: "Allow authenticated uploads"');
            console.error('   - Allowed operation: INSERT');
            console.error('   - Target roles: authenticated');
            console.error('   - Policy definition: true');
            console.error('6. Salve a política');
          }
        } else {
          console.log('✅ Upload de teste bem-sucedido:', data);
          
          // Obter URL pública
          const { data: urlData } = supabase.storage
            .from('graficos-carga')
            .getPublicUrl(data.path);
          
          console.log('🔗 URL pública:', urlData.publicUrl);
          
          // Limpar arquivo de teste
          await supabase.storage.from('graficos-carga').remove([data.path]);
          console.log('✅ Arquivo de teste removido');
        }
      } else {
        console.log('❌ Bucket graficos-carga não encontrado');
      }
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      console.error('Detalhes:', JSON.stringify(error, null, 2));
    }
  };

  // Função para testar status válidos da tabela pedidos
  window.testPedidosStatus = async () => {
    try {
      console.log('🔍 Testando status válidos para pedidos...');
      
      const statusPossiveis = ['ativo', 'pendente', 'concluido', 'cancelado', 'em_andamento', 'aguardando', 'aprovado'];
      
      for (const status of statusPossiveis) {
        try {
          console.log(`📋 Testando status: "${status}"`);
          
          const testData = {
            numero_pedido: `TEST_${Date.now()}`,
            cliente_id: 1, // Assumindo que existe um cliente com ID 1
            vendedor_id: 1, // Assumindo que existe um vendedor com ID 1
            caminhao_id: 1, // Assumindo que existe um caminhão com ID 1
            status: status,
            valor_total: 1000.00,
            observacoes: 'Teste de status'
          };
          
          const { data, error } = await supabase
            .from('pedidos')
            .insert([testData])
            .select()
            .single();
          
          if (error) {
            console.log(`❌ Status "${status}" inválido:`, error.message);
          } else {
            console.log(`✅ Status "${status}" válido!`, data);
            
            // Limpar o registro de teste
            await supabase.from('pedidos').delete().eq('id', data.id);
            console.log(`🧹 Registro de teste removido`);
          }
        } catch (error) {
          console.log(`❌ Erro ao testar status "${status}":`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };

  // Função para testar estrutura da tabela caminhoes
  window.testCaminhoesTable = async () => {
    try {
      console.log('🔍 Testando estrutura da tabela caminhoes...');
      
      // Tentar inserir um caminhão de teste
      const testData = {
        tipo: 'Truck',
        marca: 'Mercedes-Benz',
        modelo: 'Actros',
        voltagem: '24V',
        observacoes: 'Teste de inserção',
        cliente_id: 1 // Assumindo que existe um cliente com ID 1
      };
      
      console.log('📋 Dados de teste:', testData);
      
      const { data, error } = await supabase
        .from('caminhoes')
        .insert([testData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro no teste:', error);
        console.error('📋 Detalhes:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Se for erro de constraint, mostrar sugestões
        if (error.message.includes('foreign key')) {
          console.log('💡 SUGESTÃO: O cliente_id não existe. Verifique se há clientes na tabela.');
        }
        if (error.message.includes('not-null')) {
          console.log('💡 SUGESTÃO: Algum campo obrigatório não está sendo preenchido.');
        }
        if (error.message.includes('duplicate')) {
          console.log('💡 SUGESTÃO: Já existe um registro com esses dados.');
        }
      } else {
        console.log('✅ Teste bem-sucedido:', data);
        
        // Limpar o registro de teste
        await supabase.from('caminhoes').delete().eq('id', data.id);
        console.log('🧹 Registro de teste removido');
      }
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };

  // Função para debug da autenticação
  window.debugAuth = async () => {
    try {
      console.log('🔍 DEBUG: Verificando autenticação completa...');
      
      // Verificar localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        console.log('✅ Usuário no localStorage:', userObj);
        console.log('🔑 Tem senha:', userObj.password ? 'Sim' : 'Não');
        console.log('📧 Email:', userObj.email);
      } else {
        console.log('❌ Nenhum usuário no localStorage');
      }
      
      // Verificar sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Sessão Supabase:', session ? 'Ativa' : 'Inativa');
      
      // Verificar indicador de sessão no localStorage
      const supabaseSession = localStorage.getItem('supabaseSession');
      console.log('🔑 Indicador Supabase no localStorage:', supabaseSession);
      
      // Verificar usuário do Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Usuário Supabase:', user ? 'Autenticado' : 'Não autenticado');
      if (userError) console.error('❌ Erro no usuário Supabase:', userError);
      
      if (session) {
        console.log('📋 Detalhes da sessão Supabase:');
        console.log('  - ID:', session.user.id);
        console.log('  - Email:', session.user.email);
        console.log('  - Metadata:', session.user.user_metadata);
        console.log('  - Expira em:', new Date(session.expires_at * 1000).toLocaleString());
      }
      
      if (user) {
        console.log('📋 Detalhes do usuário Supabase:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - Metadata:', user.user_metadata);
      }
      
      // Verificar se existe na tabela users
      if (user) {
        try {
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (dbError) {
            console.error('❌ Erro ao buscar na tabela users:', dbError);
          } else if (userData) {
            console.log('✅ Usuário encontrado na tabela users:', userData);
          } else {
            console.log('❌ Usuário não encontrado na tabela users');
          }
        } catch (error) {
          console.error('❌ Erro ao verificar tabela users:', error);
        }
      }
      
      // Recomendações
      if (!session && supabaseSession !== 'active') {
        console.log('💡 RECOMENDAÇÃO: Faça login novamente para ativar a sessão Supabase');
      } else if (!session && supabaseSession === 'active') {
        console.log('💡 RECOMENDAÇÃO: Sessão marcada mas inativa, tente renovar');
      } else if (session) {
        console.log('✅ Sessão Supabase ativa e funcionando');
      }
      
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
  };
}