## STARK Orçamento — Sistema de Orçamentos para Guindastes

Aplicação web para criação e gestão de orçamentos de guindastes, com fluxo guiado, geração de PDFs profissionais e integração a Supabase para dados, autenticação e armazenamento de arquivos.

### Resumo executivo
- **Problema**: orçamentos de guindastes são complexos, exigem padronização e rastreabilidade.
- **Solução**: um configurador com catálogo, política de preços clara, geração de PDF e histórico centralizado.
- **Público**: equipe comercial (vendedores) e administração.
- **Benefícios**: padronização de proposta, agilidade, consistência de preços, histórico e dados para gestão.

## Tema e delimitação
- **Tema**: Configuração e orçamentação de guindastes (B2B) com apoio a gráficos de carga e estudo veicular.
- **Delimitação**:
  - Abrange: login, perfis (admin/vendedor), catálogo de guindastes, política de pagamento, cadastro de cliente e estudo veicular, geração de PDFs, histórico, gestão de guindastes, vendedores, gráficos de carga e calendário simples de logística.
  - Não abrange: cobrança/pagamento online, emissão fiscal, integração ERP, gestão de estoque físico, workflow de aprovação multi-nível, SLA logístico, contratos e assinatura eletrônica.

## Problema
- Propostas manuais e dispersas, sem padronização visual/numeração.
- Erros de precificação e políticas comerciais aplicadas de forma inconsistente.
- Dificuldade de anexar e localizar gráficos de carga atualizados.
- Falta de rastreabilidade e histórico centralizado por cliente/vendedor.
- Atrito no envio de propostas (troca de arquivos e mensagens em canais distintos).

## Hipóteses
- Um configurador guiado reduzirá o tempo de emissão do orçamento e a taxa de erro.
- A centralização de gráficos de carga diminuirá retrabalho e versões desatualizadas.
- PDFs padronizados com QR de WhatsApp aumentarão a taxa de contato e conversão.
- Políticas de preço parametrizadas melhorarão a governança comercial.
- Rotas protegidas e perfis claros reduzirão acessos indevidos e inconsistências operacionais.

## Justificativa
- Padronizar propostas melhora a percepção de qualidade e reduz ambiguidade comercial.
- Velocidade e precisão na cotação impactam diretamente a taxa de ganho em vendas B2B.
- Histórico e dados consolidados permitem gestão por indicadores (vendas, ticket médio, mix).
- Integração com Supabase acelera entrega (time-to-market) mantendo segurança e escalabilidade.

## Objetivos
- **Geral**: facilitar a criação de propostas de guindastes com cálculo consistente e documentação padronizada.
- **Específicos**:
  - Permitir ao vendedor configurar um orçamento em etapas e gerar PDF com identidade visual.
  - Manter histórico de pedidos para acompanhamento e reuso.
  - Oferecer ao admin CRUD de guindastes, vendedores e gráficos de carga.
  - Disponibilizar política de pagamento com descontos/acréscimos parametrizados.

## Metodologia
### Abordagem
- Iterativa e incremental (MVP → incrementos); foco em usabilidade e valor de negócio.
- Segurança e governança by design (sessão com expiração, perfis, RLS no storage).
- Data-informed: instrumentação mínima (logs e métricas operacionais) para ajustes.

### Procedimentos
- Levantamento de requisitos com stakeholders e mapeamento de fluxos.
- Modelagem de dados e definição de políticas comerciais.
- Prototipação de telas e validação rápida com usuários-chave.
- Implementação frontend (React + Router) e BaaS (Supabase: DB/Auth/Storage).
- Testes funcionais de rotas protegidas, fluxo de orçamento e geração de PDFs.
- Publicação (build e deploy) e revisão contínua com feedback do time.

### Técnicas
- Roteamento protegido e verificação de sessão (token com validade de 24h).
- Upload de arquivos em buckets dedicados (RLS/zPolicies; tipos/limites definidos).
- Geração de PDF com jsPDF e QRCode para contato rápido via WhatsApp.
- Formatação e validação: máscaras, CEP via ViaCEP, cidades via IBGE, currency.
- Paginação e filtros no catálogo; políticas de preço por região.

## Escopo do sistema
- **No escopo**:
  - Autenticação (Supabase Auth) com fallback local.
  - Perfis admin e vendedor com rotas protegidas.
  - Catálogo de guindastes com filtro por capacidade/modelo e upload de imagens.
  - Fluxo “Novo Pedido” em 5 passos: seleção, pagamento, cliente, estudo veicular, revisão.
  - Geração de PDF (orçamento e relatório) e atalho para WhatsApp.
  - Gestão de gráficos de carga (upload/download de PDFs).
  - Calendário simples de anotações/logística.
  - Histórico de pedidos.
- **Fora do escopo (neste momento)**:
  - Aprovação eletrônica e assinatura de contrato.
  - Integrações financeiras, fiscais ou ERP.
  - Precificação dinâmica avançada e simulação de impostos.

## Personas e papéis
- **Vendedor**: cria orçamentos, consulta gráficos de carga e histórico.
- **Admin**: tudo do vendedor + gerencia guindastes, vendedores, preços por região, gráficos e logística.

## Módulos e funcionalidades
- **Autenticação e sessão**
  - Login com Supabase; token local com validade de 24h.
  - Rotas protegidas (`ProtectedRoute`) e checagem de perfil.
- **Catálogo de guindastes**
  - Listagem paginada, filtro por capacidade/modelo, imagens e código de referência.
  - CRUD administrativo com upload de imagens (bucket `guindastes`).
  - Preços por região do guindaste (`precos_guindaste_regiao`).
- **Novo Pedido (configurador em etapas)**
  - Seleção por capacidade → modelo → configuração específica.
  - Política de pagamento com descontos/acréscimos.
  - Cadastro de cliente com busca por CEP (ViaCEP) e cidades por UF (IBGE).
  - Estudo veicular (tipo, marca, modelo, voltagem, ano, observações).
  - Resumo, geração de PDF e persistência (cliente, caminhão, pedido e itens).
- **Gráficos de carga**
  - Upload (admin) para bucket `graficos-carga` e download (vendedor).
- **Logística**
  - Calendário mensal simples de anotações por dia.
- **Histórico**
  - Lista pedidos, status, valores e ações (gerar PDF, WhatsApp).
- **Relatórios/PDF**
  - PDF com cabeçalho, itens, totais e QR Code para WhatsApp.

## Fluxos principais
- **Login**: Email/senha → Supabase Auth → cria `authToken` local (24h) → redireciona por perfil.
- **Criação de orçamento**:
  1) Selecionar guindaste(s) pela cascata capacidade→modelo→configuração.
  2) Definir política de pagamento (tipo e prazo) e campos de instalação.
  3) Preencher dados do cliente (CEP/UF/cidade via APIs) e endereço composto.
  4) Preencher estudo veicular (tipo, marca, modelo, voltagem, ano opcional).
  5) Revisar, gerar PDF e salvar pedido (cliente, caminhão, pedido, itens).
- **PDF e WhatsApp**: gera Blob → download automático → instruções para envio no WhatsApp (link de atalho).
- **Gestão de guindastes**: admin cria/edita/exclui, envia imagens e tabela de preços por região.
- **Gráficos de carga**: admin sobe PDF; vendedor lista/baixa por modelo/capacidade.
- **Logística**: admin adiciona/edita/exclui anotações no calendário.

## Regras de negócio essenciais
- **Sessão**: `authToken` local expira em 24h; sessão inválida redireciona para login.
- **Perfis**: rotas administrativas exigem `admin`; demais exigem sessão válida.
- **Carrinho**: apenas um guindaste principal por orçamento; opcionais podem ser adicionados conforme evolução do catálogo.
- **Política de pagamento (exemplos implementados)**:
  - Revenda GSI: 1 unidade → 12% desconto; 2 → 14%; 3+ → 15%.
  - CNPJ/CPF GSE: 3% desconto.
  - Acréscimos por prazo: até 30 dias +3%; até 60 dias +1%.
  - Parcelamento interno até 120 dias (sem acréscimo); após, +2% a.m.
  - Parcelamento CNPJ até 90 dias (sem acréscimo); após, +2% a.m.
- **Campos obrigatórios**:
  - Cliente: nome, telefone, email, documento, inscrição estadual, endereço.
  - Caminhão: tipo, marca, modelo, voltagem (ano opcional com validação de faixa).
- **Uploads**:
  - Imagens de guindastes no bucket `guindastes` (público, 50MB, image/*).
  - Gráficos de carga no bucket `graficos-carga` (PDF, com políticas RLS para usuários autenticados).

## Modelo de dados (alto nível)
- `users` (id, nome, email, telefone, cpf, tipo, comissao, regiao, senha hash)
- `guindastes` (id, subgrupo, modelo, peso_kg, configuracao, tem_contr, imagem_url, codigo_referencia, grafico_carga_url, descricao, nao_incluido, imagens_adicionais)
- `precos_guindaste_regiao` (guindaste_id, regiao, preco)
- `clientes` (id, nome, telefone, email, documento, inscricao_estadual, endereco, cidade, uf, cep, observacoes)
- `caminhoes` (id, cliente_id, tipo, marca, modelo, ano, voltagem, placa, observacoes)
- `pedidos` (id, numero_pedido, cliente_id, vendedor_id, caminhao_id, status, valor_total, observacoes, created_at)
- `pedido_itens` (id, pedido_id, tipo, item_id, quantidade, preco_unitario, codigo_produto)

## Arquitetura e tecnologias
- **Frontend**: React + Vite, React Router, CSS modular.
- **Back-end (BaaS)**: Supabase (PostgreSQL, Auth, Storage).
- **PDF**: `jspdf` + `qrcode` para QR Code em PDF.
- **Datas**: `date-fns` para data/hora em logística.
- **APIs externas**: ViaCEP (CEP) e IBGE (cidades por UF).
- **PWA**: manifest e `sw.js` presentes; ativação opcional conforme deploy.

## Requisitos e instalação
### Dependências
```bash
npm install
```

### Variáveis de ambiente
Crie `.env.local` na raiz:
```env
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### Execução
```bash
npm run dev
```

## Deploy
- Build:
```bash
npm run build
```
- Vercel (recomendado): configurar variáveis de ambiente e apontar para a pasta `dist/` (ver `vercel.json`).

## Operação e manutenção
- Configure políticas RLS no Supabase Storage para permitir upload/visualização por usuários autenticados.
- Buckets esperados: `graficos-carga` (PDFs) e `guindastes` (imagens, público true).
- Utilize o console utilitário no navegador (funções `window.testSupabaseStorage`, `window.testPedidosStatus`, `window.testCaminhoesTable`, `window.debugAuth`) para diagnóstico.

## Segurança e privacidade
- Senhas armazenadas com hash no banco interno; Supabase Auth gerencia autenticação primária.
- Sessões locais expiram em 24h.
- Dados pessoais de clientes são usados apenas para emissão de propostas.
- Aplique políticas RLS adequadas nas tabelas e buckets.

## Limitações conhecidas
- Integrações fiscais/financeiras inexistentes no escopo atual.
- Catálogo de opcionais por guindaste em evolução (tabelas podem não estar ativas em todos os ambientes).
- Envio de PDF por WhatsApp é via instrução/atalho; não há upload automático no chat.

## Roadmap sugerido
- Aprovação eletrônica da proposta e assinatura digital.
- Perfis adicionais (financeiro, pós-venda) e fluxos de aprovação.
- Integração com ERP/CRM e emissão fiscal.
- Motor de preços com regras regionais avançadas e simulações tributárias.
- Auditoria detalhada (logs) e trilha de alterações.

## Glossário
- **Gráfico de carga**: documento técnico indicando capacidades por configuração.
- **Configuração**: combinação de recursos (ex.: CR, EH, ECL, ECS, P, GR).
- **Pronta Entrega**: itens disponíveis para entrega rápida (módulo de consulta).

## Estrutura do projeto (alto nível)
```
src/
  components/   # Header unificado, proteção de rota, navegação admin, etc.
  config/       # Supabase e constantes de negócio
  pages/        # Telas (Login, Dashboards, NovoPedido, Histórico, Logística...)
  styles/       # CSS organizado por página/módulo
  utils/        # PDF, formatações, autenticação, validação, migrações
```

## Créditos e contato
- Empresa: STARK Orçamento
- E-mail: chrystianbohnert10@gmail.com
- Telefone: (55) 98172-1286

—

Este documento descreve o sistema como entregue e serve de base para treinamento, operação e evolução do produto.
