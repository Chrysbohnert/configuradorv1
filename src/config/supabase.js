import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
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
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUser(id, userData) {
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
    const { data, error } = await supabase
      .from('guindastes')
      .update(guindasteData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteGuindaste(id) {
    const { error } = await supabase
      .from('guindastes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ===== OPCIONAIS DO GUINDASTE =====
  async getOpcionaisDoGuindaste(guindasteId) {
    const { data, error } = await supabase
      .from('guindaste_opcionais')
      .select(`
        opcional_id,
        opcional:opcionais(*)
      `)
      .eq('guindaste_id', guindasteId);
    
    if (error) throw error;
    return data?.map(item => item.opcional).filter(opcional => opcional && opcional.ativo) || [];
  }

  async salvarOpcionaisDoGuindaste(guindasteId, opcionais) {
    // Remove todos os opcionais existentes deste guindaste
    await supabase
      .from('guindaste_opcionais')
      .delete()
      .eq('guindaste_id', guindasteId);
    
    // Adiciona os novos opcionais
    if (opcionais && opcionais.length > 0) {
      const opcionaisData = opcionais.map(opcional => ({
        guindaste_id: guindasteId,
        opcional_id: opcional.id
      }));
      
      const { error } = await supabase
        .from('guindaste_opcionais')
        .insert(opcionaisData);
      
      if (error) throw error;
    }
  }

  // ===== OPCIONAIS DO EQUIPAMENTO =====
  async getOpcionaisDoEquipamento(equipamentoId) {
    const { data, error } = await supabase
      .from('equipamento_opcionais')
      .select(`
        opcional_id,
        opcional:opcionais(*)
      `)
      .eq('equipamento_id', equipamentoId);
    
    if (error) throw error;
    return data?.map(item => item.opcional).filter(opcional => opcional && opcional.ativo) || [];
  }

  async salvarOpcionaisDoEquipamento(equipamentoId, opcionais) {
    // Remove todos os opcionais existentes deste equipamento
    await supabase
      .from('equipamento_opcionais')
      .delete()
      .eq('equipamento_id', equipamentoId);
    
    // Adiciona os novos opcionais
    if (opcionais && opcionais.length > 0) {
      const opcionaisData = opcionais.map(opcional => ({
        equipamento_id: equipamentoId,
        opcional_id: opcional.id
      }));
      
      const { error } = await supabase
        .from('equipamento_opcionais')
        .insert(opcionaisData);
      
      if (error) throw error;
    }
  }

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
    const { data, error } = await supabase
      .from('caminhoes')
      .insert([caminhaoData])
      .select()
      .single();
    
    if (error) throw error;
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

  // ===== PREÇOS POR REGIÃO DO EQUIPAMENTO =====
  async getPrecosPorRegiaoEquipamento(equipamentoId) {
    const { data, error } = await supabase
      .from('precos_equipamento_regiao')
      .select('*')
      .eq('equipamento_id', equipamentoId);
    
    if (error) throw error;
    return data || [];
  }

  async salvarPrecosPorRegiaoEquipamento(equipamentoId, precos) {
    // Remove preços existentes
    await supabase
      .from('precos_equipamento_regiao')
      .delete()
      .eq('equipamento_id', equipamentoId);

    // Adiciona os novos preços
    if (precos && precos.length > 0) {
      const { error } = await supabase
        .from('precos_equipamento_regiao')
        .insert(precos.map(p => ({
          equipamento_id: equipamentoId,
          regiao: p.regiao,
          preco: p.preco
        })));
      
      if (error) throw error;
    }
  }

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

  // ===== GRÁFICOS DE CARGA =====
  async getGraficosCarga() {
    const { data, error } = await supabase
      .from('graficos_carga')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
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
    const { data, error } = await supabase.storage
      .from('graficos-carga')
      .upload(fileName, file);
    
    if (error) throw error;
    
    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('graficos-carga')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }
}

// Instância única do serviço
export const db = new DatabaseService(); 