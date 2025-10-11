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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  // Versão leve para listagens: apenas campos necessários, com paginação e busca
  async getGuindastesLite({ page = 1, pageSize = 24, search = '' } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('guindastes')
      .select('id, subgrupo, modelo, imagem_url, grafico_carga_url, peso_kg, codigo_referencia, configuração, tem_contr, descricao, nao_incluido, imagens_adicionais, updated_at', { count: 'exact' })
      .order('subgrupo');

    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      query = query.or(`subgrupo.ilike.${pattern},modelo.ilike.${pattern}`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  async createGuindaste(guindasteData) {
    const { data, error } = await supabase
      .from('guindastes')
      .insert([guindasteData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateGuindaste(id, guindasteData) {
    try {
      // Fazer update direto
      const { error: updateError } = await supabase
        .from('guindastes')
        .update(guindasteData)
        .eq('id', Number(id));
      
      if (updateError) throw updateError;
      
      // Buscar o registro atualizado para retornar
      const { data: updatedData, error: fetchError } = await supabase
        .from('guindastes')
        .select('*')
        .eq('id', Number(id))
        .single();
      
      if (fetchError) {
        // Update funcionou, mas busca falhou - não é crítico
        return null;
      }
      
      return updatedData;
    } catch (err) {
      console.error('Erro ao atualizar guindaste:', err);
      throw err;
    }
  }

  async deleteGuindaste(id) {
    const { error } = await supabase
      .from('guindastes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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
// Movidas para src/utils/debug/
// Carregadas automaticamente em modo DEV
if (import.meta.env.DEV) {
  import('../utils/debug/index.js');
}
