# DOCUMENTAÇÃO FUNCIONAL — CONFIGURADOR STARK (v1)
**Data de geração:** Julho de 2025
**Finalidade:** Documentar o sistema atual com detalhamento suficiente para reconstrução completa em novo projeto.

---

## ÍNDICE

1. Visão Geral do Sistema
2. Perfis e Permissões
3. Telas, Rotas e Modais
4. Fluxo Completo da Proposta
5. Clientes
6. Concessionárias e Vendedores
7. Guindastes, Equipamentos e Opcionais
8. Preços e Cálculos
9. Fretes e Instalação
10. Pagamentos
11. Descontos e Aprovações
12. Estudo Veicular e Gráficos de Carga
13. PDFs e Documentos
14. Banco de Dados e Relacionamentos
15. APIs, Services e Endpoints
16. Autenticação e Segurança
17. Dashboards
18. Componentes e Funcionalidades Duplicadas
19. Funcionalidades Confirmadas
20. Funcionalidades Prováveis
21. Funcionalidades Duvidosas
22. Funcionalidades Legadas
23. Regras Conflitantes
24. Problemas e Limitações Atuais
25. Requisitos Funcionais Extraídos
26. Perguntas para Validação Humana
27. Divisão do Sistema por Módulos

---

## 1. VISÃO GERAL DO SISTEMA

**Nome:** Stark Configurador v1
**Empresa:** Stark Guindastes Ltda
**Tipo:** SPA (Single Page Application) + API REST dedicada

### O que é

O Configurador Stark é uma plataforma web para geração de propostas comerciais de guindastes hidráulicos veiculares (montados em caminhão). Permite que vendedores internos da Stark e vendedores de concessionárias credenciadas configurem e gerem propostas para clientes, incluindo:

- Seleção e configuração de guindastes e opcionais
- Estudo veicular (dados técnicos do caminhão do cliente)
- Definição de condições de pagamento (entrada, prazo, plano)
- Definição de frete e instalação
- Aplicação de descontos com fluxo de aprovação em tempo real
- Geração de PDF de proposta comercial
- Registro e histórico de propostas no banco de dados
- Dashboards gerenciais com KPIs e analytics

### Stack Tecnológica

**Frontend:** React 18 + Vite, React Router v6, Context API (AuthContext + CarrinhoContext), Supabase JS Client v2 (queries diretas + Realtime WebSocket), jsPDF + html2canvas (PDF), pdf-lib (mesclagem de PDFs)

**Backend:** Node.js + Express, PostgreSQL via pg (pool max 10), JWT para autenticação, SHA-256 para hash de senha

**Banco de Dados:** PostgreSQL hospedado no Supabase, RLS habilitado em algumas tabelas, Supabase Realtime (WebSocket) para aprovação de descontos

**Deploy:** Frontend: Vercel. Backend: servidor próprio.

### Arquitetura

```
[Navegador — React SPA]
    |-- fetch() + JWT --> [Node.js/Express Backend] --> [PostgreSQL via pg pool]
    |-- Supabase JS SDK --> [PostgreSQL via Supabase RLS] (direto do frontend)
    |                   --> [Supabase Realtime WebSocket] (aprovação de descontos)
```

**[CONFLITANTE]** O sistema acessa o banco por dois canais: backend Express (operações críticas, JWT) e Supabase JS Client diretamente no frontend (planos de protótipos, cotação USD, aprovação de descontos).

---

## 2. PERFIS E PERMISSÕES

### Tipos de Usuário (campo users.tipo)

| Tipo | Descrição |
|------|-----------|
| admin | Administrador Stark — acesso total ao sistema |
| vendedor | Vendedor interno Stark — acesso às suas propostas |
| admin_concessionaria | Administrador de concessionária parceira |
| vendedor_concessionaria | Vendedor de concessionária parceira |
| vendedor_exterior | Vendedor de Comércio Exterior (USD) |

### Permissões por Perfil

**admin (Stark) [CONFIRMADA]:**
- Acessa todo o painel Admin
- Gerencia vendedores, guindastes, fretes, gráficos, concessionárias, planos de pagamento, cotação USD
- Aprova ou nega descontos extras em tempo real
- Cria propostas de compra para concessionárias via /nova-proposta-concessionaria
- Vê propostas de todos os vendedores

**vendedor (Stark) [CONFIRMADA]:**
- Acessa painel vendedor: dashboard, novo pedido, histórico
- Vê apenas suas próprias propostas
- Tem regiões de operação (regioes_operacao) definidas pelo admin
- Com 1 região: pré-selecionada automaticamente ao criar proposta
- Com múltiplas regiões: vê SeletorRegiaoCliente para escolher região do cliente
- Pode solicitar desconto extra que requer aprovação do gestor

**admin_concessionaria [CONFIRMADA]:**
- Acessa /dashboard-admin filtrado à concessionária
- Acessa /nova-proposta-concessionaria
- Se uso_interno_stark=true: pode selecionar concessionária de destino na proposta
- Gerencia apenas vendedores da própria concessionária

**vendedor_concessionaria [CONFIRMADA]:**
- Acessa painel vendedor: dashboard, novo pedido, histórico
- Sem seletor de região (preço fixado pela região da concessionária)

**vendedor_exterior [CONFIRMADA]:**
- PaymentPolicy inicia diretamente na etapa 3 (pula tipo de cliente/IE)
- Proposta gerada em USD com cotação configurável
- PDF pode ser gerado em Espanhol

### Detecção de Perfil no Frontend

O perfil é lido do objeto `user` no `localStorage` (chave 'user'), injetado após login. Token JWT armazenado separadamente (chave 'authToken').

---

## 3. TELAS, ROTAS E MODAIS

### Rotas Públicas

| Rota | Componente | Status |
|------|-----------|--------|
| / | Login | CONFIRMADA |
| /suporte | Support | CONFIRMADA |
| /proposta/:id | VisualizarProposta | DUVIDOSA — sem lógica clara de compartilhamento público |
| /detalhes-guindaste/:id? | DetalhesGuindaste | CONFIRMADA (requer auth) |

### Rotas Protegidas — Layout Vendedor (requireVendedor)

| Rota | Componente | Status |
|------|-----------|--------|
| /dashboard | DashboardVendedor | CONFIRMADA |
| /novo-pedido/:propostaId? | NovoPedido | CONFIRMADA |
| /propostas | HistoricoPropostas | CONFIRMADA |
| /graficos-carga | GraficosCarga | CONFIRMADA |
| /vendedor/configuracoes | Configuracoes | CONFIRMADA |

### Rotas Protegidas — Layout Admin (requireAdmin)

| Rota | Componente | Status |
|------|-----------|--------|
| /dashboard-admin | DashboardAdmin | CONFIRMADA |
| /gerenciar-vendedores | GerenciarVendedores | CONFIRMADA |
| /relatorio-completo | RelatorioCompleto | CONFIRMADA |
| /gerenciar-guindastes | GerenciarGuindastes | CONFIRMADA |
| /gerenciar-graficos-carga | GerenciarGraficosCarga | CONFIRMADA |
| /gerenciar-fretes | GerenciarFretes | CONFIRMADA |
| /concessionarias | Concessionarias | CONFIRMADA |
| /aprovacoes-descontos | AprovacoesDescontos | CONFIRMADA |
| /planos-pagamento | PlanosPagamento | CONFIRMADA |
| /cotacao-dolar | CotacaoDolar | CONFIRMADA |
| /admin/configuracoes | Configuracoes | CONFIRMADA |
| /nova-proposta-concessionaria/:propostaId? | NovoPedido | CONFIRMADA |

### Modais Identificados

| Modal | Arquivo | Gatilho | Status |
|-------|---------|---------|--------|
| Solicitar Desconto | SolicitarDescontoModal.jsx | Botão no PaymentPolicy | CONFIRMADA |
| Preços por Região | PrecosPorRegiaoModal.jsx | GerenciarGuindastes | CONFIRMADA |
| Tipo de Proposta | ModalTipoProposta.jsx | Não encontrado em uso claro | DUVIDOSA |
| WhatsApp | WhatsAppModal.jsx | Botão de contato | PROVÁVEL |
| Exclusão de Guindaste | inline em GerenciarGuindastes | Botão excluir | CONFIRMADA |

### Layouts

- **AdminLayout**: sidebar de navegação admin + Outlet
- **VendedorLayout**: header simplificado + Outlet
- **AdminNavigation.jsx**: links do menu admin
- **VendedorNavigation.jsx**: links do menu vendedor
- **UnifiedHeader.jsx**: header unificado reutilizado em páginas internas

---

## 4. FLUXO COMPLETO DA PROPOSTA

### Modo Vendedor Stark — Proposta para Cliente Final

O fluxo é orchestrado por `NovoPedido.jsx` com stepper de etapas:

```
STEP 1 — Seleção de Equipamento
  GuindasteConfigurador (filtra por capacidade e modelo)
  Usuário clica "Detalhes" -> navega para DetalhesGuindaste
  DetalhesGuindaste retorna com guindasteSelecionado no location.state
  Opcionais adicionados via CarrinhoForm
  Carrinho persistido no localStorage['carrinho']

STEP 2 — Condições de Pagamento (PaymentPolicy — 7 sub-etapas)
  Sub 1: Tipo de Cliente (cliente final / revenda)
  Sub 2: Participação de Revenda + Tipo de IE (Produtor Rural / CNPJ-CPF)
  Sub 3: Tipo de Instalação (incluso no pedido / cliente paga direto)
  Sub 4: Tipo de Frete (FOB / CIF)
  Sub 5: Local de Instalação (apenas para CIF)
  Sub 6: % de Entrada + Plano + Desconto do Vendedor
  Sub 7: Resumo financeiro calculado + botão "Continuar"

STEP 3 — Dados do Cliente
  ClienteForm / ClienteFormDetalhado
  Campos: nome, CPF/CNPJ, endereço, telefone, email, IE (RS)

STEP 4 — Estudo Veicular
  CaminhaoForm / CaminhaoFormDetalhado
  Campos: tipo, marca, modelo, ano, voltagem, comprimento chassi, patolamento, observações

STEP 5 — Resumo e Geração de PDF
  ResumoPedido (componente interno)
  Botão "Gerar PDF" -> PDFGenerator
  Após PDF: proposta salva automaticamente no banco (db.createpropostas)
  Em modo edição: proposta atualizada (db.updateProposta)
```

### Modo Admin Concessionária — Proposta de Compra

Rota: /nova-proposta-concessionaria. Mesmo componente NovoPedido com flag isModoConcessionaria = true.

- Permite **múltiplos guindastes** no carrinho (modo normal permite apenas 1)
- Usa preço de **compra** (não preço de venda): getPrecoCompraPorRegiao
- EstudosVeicularesMultiplos: um formulário de estudo por guindaste
- Se admin tem uso_interno_stark=true: pode selecionar qual concessionária é o destino

### Modo Edição de Proposta

- Rota: /novo-pedido/:propostaId
- getPropostaById(propostaId) carrega a proposta
- dados_serializados é desserializado para restaurar: carrinho, clienteData, caminhaoData, pagamentoData, região
- Sistema avança automaticamente para Step 5 (Resumo)
- Ao gerar PDF novamente: chama updateProposta (não cria nova)

### Persistência Local (localStorage)

| Chave | Conteúdo |
|-------|----------|
| carrinho | Array de itens do carrinho |
| novoPedido_clienteData | Dados do cliente |
| novoPedido_caminhaoData | Dados do caminhão/estudos veiculares |
| novoPedido_pagamentoData | Dados de pagamento |
| authToken | JWT do usuário logado |
| user | Objeto do usuário (sem senha) |

**[CONFLITANTE]** O número de proposta é gerado localmente via localStorage sem garantia de unicidade com múltiplos usuários simultâneos.

### Seleção de Região e Impacto no Preço

[CONFIRMADA] Vendedores Stark com regioes_operacao veem o SeletorRegiaoCliente. Quando a região muda, recalcularPrecosCarrinho() busca o novo preço via API. A normalização é feita por normalizarRegiao(regiao, temIE) em src/utils/regiaoHelper.js.

Regiões disponíveis: norte-nordeste, centro-oeste, sul-sudeste, rs-com-ie, rs-sem-ie, comercio-exterior.

---

## 5. CLIENTES

### Campos do Objeto clienteData

| Campo | Tipo | Descrição | Status |
|-------|------|-----------|--------|
| nome | string | Nome completo ou razão social | CONFIRMADA |
| documento | string | CPF ou CNPJ (com máscara) | CONFIRMADA |
| telefone | string | Telefone de contato | CONFIRMADA |
| email | string | E-mail do cliente | CONFIRMADA |
| endereco | string | Endereço (modo simples) | CONFIRMADA |
| logradouro | string | Rua/Av (modo detalhado) | CONFIRMADA |
| numero | string | Número do endereço | CONFIRMADA |
| bairro | string | Bairro | CONFIRMADA |
| cidade | string | Cidade | CONFIRMADA |
| uf | string | UF (estado) | CONFIRMADA |
| cep | string | CEP | CONFIRMADA |
| ie | string | Inscrição Estadual (RS) | PROVÁVEL |

### Tipos de Cliente no Contexto de Pagamento

No PaymentPolicy, o tipo de cliente define regras de desconto e IE:

- **cliente** — Cliente final
  - participacaoRevenda='sim': revenda está envolvida
    - tipoIE='produtor': Produtor Rural com IE -> regime especial
    - tipoIE='cnpj_cpf': sem IE produtor
  - participacaoRevenda='nao': cliente compra direto
- **revenda** — Revenda comprando para estoque ou revenda posterior

### Regra de Trava de Inscrição Estadual [CONFIRMADA]

Quando guindaste é GSI ou GSE + tipoCliente='cliente' + participacaoRevenda='sim', o campo Tipo de IE é **travado em "Produtor Rural"**, não permitindo seleção de "CNPJ/CPF".

```javascript
const travaIEProdutor = tipoCliente === 'cliente' && participacaoRevenda === 'sim' && (temGSE || temGSI);
```

### Dados do Cliente no Modo Concessionária [CONFIRMADA]

Dados do cliente preenchidos automaticamente com dados da concessionária logada/selecionada.

---

## 6. CONCESSIONÁRIAS E VENDEDORES

### Campos da Tabela concessionarias

| Campo | Descrição |
|-------|-----------|
| id | Chave primária |
| nome | Nome da concessionária |
| cnpj | CNPJ |
| telefone, email, endereco | Contato |
| uf | UF (usada para filtrar pontos de instalação CIF) |
| regiao_preco | Região de preço padrão (ex: 'sul-sudeste') |
| desconto_compra / desconto_base | Percentual de desconto padrão nas compras |
| ativo | Ativa/inativa |
| uso_interno_stark | Flag para seleção de concessionária de destino |
| logo_url | URL do logo (exibido no PDF) |

### Campos da Tabela users (Vendedores)

| Campo | Descrição |
|-------|-----------|
| id, nome, email, senha | Identificação (senha = SHA-256 hash) |
| tipo | Perfil de acesso |
| regiao | Região principal [LEGADO — substituído por regioes_operacao] |
| regioes_operacao | Array JSON de regiões de operação |
| concessionaria_id | FK para concessionária |
| telefone, cpf | Dados pessoais |
| ativo | Ativo/inativo |

### Gestão de Vendedores (GerenciarVendedores) [CONFIRMADA]

Admin pode: criar, editar, desativar/ativar vendedores, definir regiões de operação via seletor múltiplo.

### Preços de Concessionária [CONFIRMADA]

Tabela concessionaria_precos: preços de compra customizados por concessionária e região. Acessível via /api/concessionaria-precos.

### Metas de Vendedores [PROVÁVEL]

Tabela metas_vendedores referenciada em backend/db/create_metas_vendedores.sql e rota /api/metas. Funcionalidade não encontrada claramente em nenhuma tela.

---

## 7. GUINDASTES, EQUIPAMENTOS E OPCIONAIS

### Campos da Tabela guindastes

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer | Chave primária |
| subgrupo | string | Nome comercial (ex: "Guindaste 6.5 Toneladas GSI") |
| modelo | string | Código do modelo (ex: "GSI-650") |
| grupo | string | Grupo/linha do produto |
| peso_kg | string | Peso em kg / config de lanças |
| configuracao | string | Configuração do equipamento |
| tem_contr | string | "Sim"/"Não" — controle remoto |
| imagem_url | string | URL da imagem principal |
| imagens_adicionais | jsonb | Array de URLs de imagens adicionais |
| descricao | string | Descrição técnica (suporta **negrito** e listas -) |
| nao_incluido | string | O que NÃO está incluído |
| finame | string | Código FINAME |
| ncm | string | NCM do produto |
| codigo_referencia | string | Código interno de referência |
| quantidade_disponivel | integer | Estoque disponível |
| is_prototipo | boolean | Equipamento protótipo (acesso restrito) |
| prototipo_label | string | Rótulo do protótipo para PDF |
| prototipo_observacoes_pdf | string | Observações do protótipo para PDF |
| prototipo_payment_set_id | integer | FK para set de planos de protótipo |
| is_comercio_exterior | boolean | Exclusivo para comércio exterior |
| valor_instalacao_cliente | numeric | Valor customizado instalação (cliente paga direto) |
| valor_instalacao_incluso | numeric | Valor customizado instalação (incluso no pedido) |
| bloquear_desconto | boolean | Bloqueia qualquer desconto para este guindaste |
| grafico_carga_url | string | URL do PDF do gráfico de carga |

### Linhas de Produto

O sistema detecta automaticamente a linha pelo nome/modelo:
- **GSI** — Guindastes com instalação interna ("GSI" no texto)
- **GSE** — Guindastes com instalação externa ("GSE" no texto)
- **Outros** — Demais equipamentos

### Valores Padrão de Instalação (fallback hardcoded) [CONFIRMADA]

```javascript
// Quando valor_instalacao_cliente/incluso não definidos no banco:
instalacaoClienteValor = guindaste.valor_instalacao_cliente ?? (temGSI ? 5500 : temGSE ? 6500 : 0);
instalacaoInclusoValor = guindaste.valor_instalacao_incluso ?? (temGSI ? 6350 : temGSE ? 7500 : 0);
```

### Opcionais [CONFIRMADA]

Itens com tipo='opcional'. Têm nome, preco, quantidade. Listados no PDF na seção de equipamentos. Contribuem para o precoBase total.

### Visibilidade de Guindastes [CONFIRMADA]

Tabela guindaste_visibilidade controla quais vendedores veem quais guindastes. Gerenciada via db.setGuindasteVisibilidade() e db.getGuindasteIdsVisiveisParaUser().

### Equipamentos Protótipo [CONFIRMADA]

Guindastes com is_prototipo=true:
- Visíveis apenas para admin Stark
- Têm planos de pagamento próprios (prototype_payment_plan_sets / prototype_payment_plan_items)
- Publicado gera view prototype_payment_plans_published
- PDF exibe label de protótipo e observações específicas

### Filtro no Configurador [CONFIRMADA]

- Protótipos filtrados para não-admins
- Guindastes de comércio exterior filtrados para não-vendedores-exterior
- Cache de 10 minutos na API de guindastes (frontend)

---

## 8. PREÇOS E CÁLCULOS

### Estrutura de Preços por Região [CONFIRMADA]

Preços dos guindastes definidos por região em tabela separada (não diretamente no guindaste):

| Região | Código |
|--------|--------|
| Norte / Nordeste | norte-nordeste |
| Centro-Oeste | centro-oeste |
| Sul / Sudeste (exceto RS) | sul-sudeste |
| Rio Grande do Sul (com IE) | rs-com-ie |
| Rio Grande do Sul (sem IE) | rs-sem-ie |
| Comércio Exterior | comercio-exterior |

Endpoints:
- GET /api/guindastes/:id/preco?regiao=X — preço de venda
- GET /api/guindastes/:id/preco-compra?regiao=X — preço de compra (concessionária)

### Cálculo do Preço Base Total [CONFIRMADA]

```
precoBase = Σ (item.preco × item.quantidade) para todos os itens do carrinho
```

### Conversor de Voltagem [CONFIRMADA]

Se caminhão tem voltagem 12V, soma R$ 450,00 ao valor total:
```javascript
const valorConversor = caminhaoData?.voltagem === '12V' ? 450 : 0;
```

### Composição do Valor Final [CONFIRMADA]

```
valorFinal =
  precoBase
  + valorFrete (se CIF)
  + valorInstalacao (se "incluso no pedido")
  + valorConversor (se caminhão 12V)
  + extraValor (valor extra opcional)
  - descontoPlano (% do plano sobre precoBase)
  + acrescimoPlano (% sobre saldo parcelado)
  - descontoVendedor (% digitado pelo vendedor)
  - descontoGestorValor (R$ aprovado pelo gestor)
```

---

## 9. FRETES E INSTALAÇÃO

### Tabela de Fretes [CONFIRMADA]

Tabela fretes armazena pontos de instalação/entrega. Campos: id, cidade, uf, nome/oficina (ponto), valor_prioridade, valor_reaproveitamento.

### Tipos de Frete [CONFIRMADA]

- **FOB** — Cliente retira. Frete = R$ 0,00. Sem seleção de ponto.
- **CIF** — Stark entrega. Vendedor seleciona ponto de instalação e tipo de entrega.

### Tipos de Entrega (CIF) [CONFIRMADA]

- **Prioridade** — Entrega prioritária, valor = valor_prioridade
- **Reaproveitamento** — Aproveita carga, valor = valor_reaproveitamento

### Filtro de Pontos por Perfil [CONFIRMADA]

- Vendedor Stark: getFretesPorVendedor(user.id)
- Modo concessionária: getFretes() ou filtrado por UF

### Instalação [CONFIRMADA]

- **'cliente'** — Cliente paga direto. Valor é **informativo** no PDF, NÃO soma ao total.
- **'incluso'** — Instalação inclusa. Valor **soma** ao total da proposta.

Fallbacks hardcoded: GSI cliente paga=5500, GSI incluso=6350, GSE cliente paga=6500, GSE incluso=7500.

---

## 10. PAGAMENTOS

### Função Principal: calcularPagamento (src/lib/payments.js) [CONFIRMADA]

Parâmetros: precoBase, plan (objeto do plano), dataEmissaoNF (padrão: hoje).

Retorno: { precoBase, descontoValor, acrescimoValor, valorAjustado, entrada, saldo, parcelas:[{numero, valor, vencimento, vencimentoStr}], total }

Lógica:
1. Aplica desconto do plano sobre precoBase
2. Calcula entrada: max(valorComDesconto × entry_percent, entry_min)
3. Saldo = valorComDesconto - entrada
4. Aplica acréscimo sobre o saldo: saldo = saldo × (1 + surcharge_percent)
5. Gera parcelas distribuindo saldo igualmente, ajuste de centavos na última
6. Datas de vencimento: parseia da descrição (ex: "30/60/90 DD") ou gera de 30 em 30

### Planos de Pagamento [CONFIRMADA]

**Planos Globais** (gerenciados em /planos-pagamento):
Campos: description, installments, discount_percent, surcharge_percent, min_order_value, entry_percent_required, entry_percent, entry_min, active, audience, scope, juros_mensal.
audience: 'cliente' | 'revenda' | 'concessionaria_compra' | 'comercio_exterior'
scope: 'stark' | 'concessionaria'

**Planos de Protótipo** (por guindaste via Supabase JS direto no frontend):
Gerenciados via prototype_payment_plan_sets / prototype_payment_plan_items. Publicados via RPC.

**Fallback JSON** (src/services/paymentPlans.js): Usado quando o banco não retorna planos.

### Filtro de Planos por Entrada

- Entrada 0% / financiamento: planos sem entry_percent_required
- Entrada >= 50%: planos com entry_percent_required = 0.50
- Entrada >= 30%: planos com entry_percent_required = 0.30
- Entrada < 30%: nenhum plano disponível

### Modos de Entrada

- **Percentual** — Digita % (ex: 30%, 50%, 100%)
- **Valor** — Digita valor em R$
- **Exclusiva** — Condição totalmente customizada (sem seleção de plano, vendedor descreve)
- **Financiamento Bancário** — Sem plano, sem parcelas calculadas

### Campos do Resultado Final (objeto enviado a onPaymentComputed)

precoBase, valorFrete, valorInstalacao, valorConversor, extraValor, extraDescricao, descontoValor, acrescimoValor, valorAjustado, descontoAdicionalValor, total, valorFinal, percentualEntrada, entradaTotal, valorSinal, faltaEntrada, saldoAPagar, parcelas, prazoPagamento, formaEntrada, observacoesNegociacao, tipoCliente, participacaoRevenda, tipoIE, instalacao, tipoFrete, localInstalacao, tipoEntrega, tipoPagamento (=tipoCliente), tipoInstalacao (mapeado), revendaTemIE (mapeado), financiamentoBancario, condicaoExclusiva, moeda, cotacao_usd, valorFinalUSD, desconto, descontoPrazo.

---

## 11. DESCONTOS E APROVAÇÕES

### Tipos de Desconto [CONFIRMADA]

1. **Desconto do Plano** — automático, definido no plano (discount_percent)
2. **Acréscimo do Plano** — sobretaxa sobre o saldo (surcharge_percent)
3. **Desconto do Vendedor** — percentual digitado, limitado por regras
4. **Desconto do Gestor** — valor final em R$ aprovado via sistema de aprovação

### Limites de Desconto do Vendedor

Calculados em src/utils/paymentHelpers.js — calcularLimiteDesconto():

| Cenário | Limite |
|---------|--------|
| Revenda, sem GSI | 12% |
| Revenda, com GSI (1 unidade) | 12% |
| Revenda, com GSI (2+ unidades) | 15% |
| Cliente, sem participação revenda | 3% |
| Cliente, sem participação, GSI Produtor Rural | 12% |
| Cliente, com participação revenda | 0% |

**[CONFLITANTE]** A lógica de limites em paymentHelpers.js não está totalmente alinhada com os botões de desconto em PaymentPolicy.jsx.

### Sistema de Aprovação de Desconto Extra [CONFIRMADA]

1. Vendedor clica "Solicitar desconto extra"
2. SolicitarDescontoModal abre — vendedor informa justificativa (opcional)
3. INSERT em solicitacoes_desconto com status='pendente'
4. Supabase Realtime notifica gestor em AprovacoesDescontos.jsx
5. Gestor informa o **valor final desejado em R$** (NÃO percentual)
6. Gestor clica "Aprovar" ou "Negar"
7. Supabase Realtime notifica vendedor imediatamente
8. Se aprovado: PaymentPolicy recalcula com novo valor final

Tabela solicitacoes_desconto campos chave:
- desconto_aprovado = VALOR FINAL DESEJADO EM R$ (não percentual)
- status: 'pendente' | 'aprovado' | 'negado' | 'cancelado'
- aprovador_nome, observacao_gestor, justificativa

Aplicação:
```javascript
// descontoAprovado = valor final em R$ desejado pelo gestor
const valorAposExtra = descontoAprovado > 0 ? descontoAprovado : valorCalculado;
const descontoExtraValor = valorCalculado - valorAposExtra;
```

### Bloqueio de Desconto por Guindaste [CONFIRMADA]

Campo bloquear_desconto=true: zera descontoVendedor, força discount_percent=0 no plano, oculta botões de desconto, exibe aviso vermelho.

---

## 12. ESTUDO VEICULAR E GRÁFICOS DE CARGA

### Dados do Estudo Veicular (objeto caminhaoData)

| Campo | Descrição |
|-------|-----------|
| tipo | Tipo do veículo (ex: "Caminhão", "Utilitário") |
| marca | Marca do veículo |
| modelo | Modelo do veículo |
| ano | Ano de fabricação |
| voltagem | "12V" ou "24V" — impacta cálculo (+R$ 450,00 se 12V) |
| comprimentoChassi | Comprimento do chassi |
| patolamento | Tipo de patolamento |
| observacoes | Observações livres |

No modo concessionária: caminhaoData é um array de objetos, um por guindaste no carrinho. Cada objeto inclui equipamentoId e equipamentoNome.

### Componentes de Formulário Veicular

[CONFIRMADA] Existem múltiplos formulários:
- CaminhaoForm.jsx — formulário simples (src/components/NovoPedido/)
- CaminhaoFormDetalhado.jsx — formulário expandido (src/components/NovoPedido/)
- FormCaminhao.jsx — terceira versão (src/components/)
- EstudosVeicularesMultiplos.jsx — gerencia array de estudos (modo concessionária)

**[CONFLITANTE]** Três versões do formulário de caminhão existem sem distinção clara de uso atual.

### Gráficos de Carga [CONFIRMADA]

Armazenados como PDFs externos (Supabase Storage ou URL externa).
- Tabela: graficos_carga
- Chave de busca: buildGraficoKey() a partir do modelo do guindaste
- Resolução de URL: resolveGraficoUrl() em src/utils/modelNormalization.js
- No PDF: anexados como páginas adicionais via pdf-lib

---

## 13. PDFs E DOCUMENTOS

### Como é Gerado

O PDF é gerado **100% no navegador** (client-side), sem processamento no servidor.

### Bibliotecas Utilizadas [CONFIRMADA]

- **jsPDF** — criação do documento PDF (coordenadas, páginas)
- **html2canvas** — converte blocos HTML renderizados em imagens canvas
- **pdf-lib** — mescla PDFs externos (gráficos de carga) ao PDF gerado

### Usa Captura de Tela? [CONFIRMADA]

**Sim.** html2canvas captura containers HTML invisíveis (position: absolute; left: -99999px) e os converte em canvas. Não é uma captura da tela visível do usuário, mas sim de elementos DOM criados especificamente para a geração.

### Quais Conteúdos São Texto Real

**Apenas o timestamp** (data/hora de geração) é inserido como texto real via pdf.text(). Todo o restante é imagem de canvas.

### Quais Conteúdos NÃO Podem Ser Copiados

**Tudo exceto o timestamp:** dados do cliente, equipamento, valores financeiros, cláusulas contratuais, campos de assinatura, cabeçalho, rodapé — tudo é imagem JPEG renderizada via html2canvas.

### Como Cabeçalho e Rodapé São Inseridos [CONFIRMADA]

1. Imagens estáticas carregadas de /public/cebecalho1.png e /public/rodapé.png
2. Cada imagem é carregada via html2canvas em um container temporário e convertida para dataURL JPEG 92%
3. Cache de módulo _pdfImageCache evita recarregamento a cada página
4. As imagens são inseridas em cada página via pdf.addImage() nas posições fixas:
   - Header: x=0, y=0, largura=210mm, altura=28mm
   - Footer: x=0, y=PAGE.height-24, largura=210mm, altura=24mm

### Dimensões e Zonas do PDF

```
Página A4: 210mm × 297mm
Header: 28mm (topo)
Footer: 24mm (rodapé)
Margem lateral: 12mm
Área de conteúdo disponível: 186mm largura × ~237mm altura
Container HTML interno: 1000px largura (base para html2canvas)
```

### Problemas de Margens [CONFIRMADO]

Há um `-8` hardcoded em CONTENT_H para "respiro adicional". O container HTML usa padding interno. Em diferentes resoluções ou impressoras podem ocorrer desalinhamentos sutis.

### Problemas de Paginação [CONFIRMADO]

addSectionCanvasPaginated() divide seções longas em múltiplas páginas cortando o canvas pixel a pixel. Pode haver quebras de linha no meio de parágrafos ou tabelas — o sistema não tem consciência do conteúdo semântico ao paginar.

### Problemas de Qualidade [CONFIRMADO]

Qualidade controlada por scale: 2 no html2canvas, salvo como JPEG 92%. Pode causar compressão visível em textos finos ou logotipos pequenos. Não é PDF vetorial.

### Estrutura do PDF — Proposta Comercial Padrão

```
Página 1: CAPA
  - Título "PROPOSTA COMERCIAL STARK"
  - Modelo do guindaste
  - Dados do vendedor, data, número da proposta
  - Dados do cliente (nome, documento, endereço)
  - Logo da concessionária (se houver)

Página 2: EQUIPAMENTO
  - Código do produto (FINAME, NCM, código referência)
  - Descrição técnica (suporta **negrito** e listas com -)
  - O que NÃO está incluído
  - Programa de Revisão e Garantia

Página 3: VEÍCULO + ESTUDO VEICULAR
  - Dados do caminhão (tipo, marca, modelo, ano, voltagem)
  - Estudo de integração veicular

Página 4: CONDIÇÕES COMERCIAIS E FINANCEIRAS
  - Tipo de pagamento, prazo
  - Valor base, desconto/acréscimo, valor final
  - Frete, instalação, conversor de voltagem
  - ENTRADA: % e R$, sinal pago, falta de entrada
  - Saldo a pagar (após faturamento)
  - PARCELAMENTO: lista individual de parcelas (Parcela 1, 2, 3...)
  - Forma de pagamento da entrada (PIX, Boleto, etc.)
  - Observações de negociação

Página 5: DADOS BANCÁRIOS
  - Dados bancários da Stark para pagamento

Página 6: CLÁUSULAS + ASSINATURAS
  - Cláusulas contratuais (texto)
  - Campos de assinatura

Páginas extras: GRÁFICOS DE CARGA
  - PDFs externos anexados via pdf-lib (NÃO incluídos em pedido de compra de concessionária)
```

### Estrutura do PDF — Pedido de Compra (Concessionária)

```
Página 1: CAPA (título "PROPOSTA DE COMPRA STARK")
Página 2: EQUIPAMENTOS (lista de guindastes com quantidade)
Página 3: ESTUDOS VEICULARES (um por equipamento)
Página 4: CONDIÇÕES FINANCEIRAS
```

### Nomenclatura do Arquivo [CONFIRMADA]

- Proposta comercial: Proposta_Stark_{NomeCliente}.pdf
- Pedido de compra: Pedido_Compra_Concessionaria_{NomeConcessionaria}.pdf

Nome sanitizado (remove acentos e caracteres especiais), truncado em 40 chars.

### Tradução para Espanhol [CONFIRMADA]

Detectada via getLang(pedidoData) pelo campo pdfLang ou pagamentoData.idioma_pdf.
Dicionário interno t(lang, key) com traduções pt / es.
Descrições técnicas traduzidas heuristicamente via translatePtToEsHeuristic().

### Arquivos Responsáveis pela Geração

| Arquivo | Responsabilidade |
|---------|-----------------|
| src/components/PDFGenerator.jsx | Toda a lógica de geração (~2.632 linhas) |
| src/components/LazyPDFGenerator.jsx | Wrapper com React.lazy |
| src/components/NovoPedido/ResumoPedido.jsx | Orquestra dados e chama o gerador |
| public/cebecalho1.png | Imagem do cabeçalho |
| public/rodapé.png | Imagem do rodapé |
| src/utils/modelNormalization.js | buildGraficoKey, resolveGraficoUrl |
| src/utils/formatters.js | formatCurrency, generateCodigoProduto |

---

## 14. BANCO DE DADOS E RELACIONAMENTOS

### Banco Principal

PostgreSQL hospedado no Supabase. Acessado via backend Express (pg pool) e via Supabase JS Client (frontend direto).

### Tabelas Identificadas

| Tabela | Uso | Acesso |
|--------|-----|--------|
| users | Usuários e vendedores | Backend Express |
| guindastes | Catálogo de guindastes | Backend Express |
| propostas | Histórico de propostas | Backend Express |
| fretes | Pontos de instalação/frete | Backend Express |
| graficos_carga | Referências de PDFs de gráficos | Backend Express |
| concessionarias | Cadastro de concessionárias | Backend Express |
| payment_plans | Planos de pagamento (rascunho) | Backend Express |
| payment_plans_published | Planos publicados | Backend + Supabase JS |
| configuracoes_globais | Configurações (cotação USD, etc.) | Supabase JS (frontend) |
| solicitacoes_desconto | Solicitações de desconto extra | Supabase JS (Realtime) |
| guindaste_visibilidade | Controle guindaste↔vendedor | Supabase JS (frontend) |
| prototype_payment_plan_sets | Conjuntos de planos de protótipos | Supabase JS (frontend) |
| prototype_payment_plan_items | Itens dos planos de protótipos | Supabase JS (frontend) |
| prototype_payment_plans_published | View de planos publicados | Supabase JS (frontend) |
| metas_vendedores | Metas de vendedores | Backend Express (PROVÁVEL) |
| concessionaria_precos | Preços de compra por concessionária | Backend Express |

### Schema da Tabela propostas

```sql
CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_proposta VARCHAR(20) NOT NULL UNIQUE,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vendedor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendedor_nome VARCHAR(255) NOT NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_documento VARCHAR(50),
  valor_total DECIMAL(12,2) NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('orcamento', 'proposta')),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'finalizado', 'excluido')),
  dados_serializados JSONB NOT NULL,
  concessionaria_id INTEGER,
  canal_venda VARCHAR,
  segmento_cliente VARCHAR,
  cliente_uf VARCHAR,
  cliente_cidade VARCHAR,
  produto_principal VARCHAR,
  linha_produto VARCHAR,
  resultado_venda VARCHAR,
  motivo_perda VARCHAR,
  data_resultado_venda TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Conteúdo de dados_serializados (JSONB)

```json
{
  "carrinho": [...],
  "clienteData": {...},
  "caminhaoData": {...},
  "pagamentoData": {...},
  "concessionaria_id": null,
  "regiaoClienteSelecionada": "sul-sudeste"
}
```

### Relacionamentos Principais

```
users (1) ----> (N) propostas
users (N) ----> (1) concessionarias
concessionarias (1) ----> (N) users
guindastes (1) ----> (N) guindaste_visibilidade ----> (N) users
guindastes (1) ----> (N) prototype_payment_plan_sets ----> (N) prototype_payment_plan_items
```

---

## 15. APIs, SERVICES E ENDPOINTS

### Backend Express — Base: /api

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /health | Health check |
| POST | /auth/login | Login (retorna JWT + user) |
| GET | /users | Lista usuários |
| GET | /users/me | Usuário logado |
| POST | /users | Criar usuário |
| PUT | /users/:id | Atualizar usuário |
| DELETE | /users/:id | Remover usuário |
| PUT | /users/me | Atualizar perfil próprio |
| PUT | /users/me/password | Alterar senha |
| GET | /guindastes | Lista guindastes (paginado) |
| GET | /guindastes/:id | Guindaste por ID |
| POST | /guindastes | Criar guindaste |
| PUT | /guindastes/:id | Atualizar guindaste |
| DELETE | /guindastes/:id | Excluir guindaste |
| GET | /guindastes/:id/preco | Preço de venda por região |
| GET | /guindastes/:id/preco-compra | Preço de compra por região |
| GET | /guindastes/:id/precos | Todos os preços de venda |
| GET | /guindastes/:id/precos-compra | Todos os preços de compra |
| POST | /guindastes/:id/precos | Salvar preços de venda |
| POST | /guindastes/:id/precos-compra | Salvar preços de compra |
| GET | /propostas | Lista propostas (filtros: status, tipo, vendedor, concessionaria) |
| GET | /propostas/:id | Proposta por ID |
| POST | /propostas | Criar proposta |
| PUT | /propostas/:id | Atualizar proposta |
| DELETE | /propostas/:id | Excluir (soft delete) |
| GET | /payment-plans | Lista planos |
| POST | /payment-plans | Criar plano |
| PUT | /payment-plans/:id | Atualizar plano |
| DELETE | /payment-plans/:id | Remover plano |
| GET | /configuracoes/:chave | Busca configuração |
| PUT | /configuracoes/:chave | Atualizar configuração |
| GET | /fretes | Lista pontos de instalação |
| POST/PUT/DELETE | /fretes/:id | CRUD fretes |
| GET | /graficos-carga | Lista gráficos |
| POST/DELETE | /graficos-carga/:id | CRUD gráficos |
| GET | /concessionarias | Lista concessionárias |
| POST/PUT/DELETE | /concessionarias/:id | CRUD concessionárias |
| GET | /metas | Lista metas de vendedores |
| GET/POST | /concessionaria-precos | Preços de compra |
| GET/POST/PUT | /solicitacoes-desconto/:id | CRUD solicitações |

### Frontend — API Modules (src/api/)

| Arquivo | Responsabilidade |
|---------|-----------------|
| guindastes.js | CRUD guindastes, preços por região, cache 10min |
| propostas.js | CRUD propostas, filtros |
| fretes.js | Fretes, pontos de instalação |
| concessionarias.js | CRUD concessionárias |
| configuracoes.js | Configurações globais |
| config.js | API_URL base (lê VITE_API_URL) |

### Service Layer

| Arquivo | Responsabilidade |
|---------|-----------------|
| src/config/supabase.js | DatabaseService class — wrapper de todas as operações |
| src/services/paymentPlans.js | Fallback JSON de planos de pagamento |

### Autenticação nas Requests [CONFIRMADA]

Todas as chamadas ao backend incluem: Authorization: Bearer {localStorage.getItem('authToken')}

---

## 16. AUTENTICAÇÃO E SEGURANÇA

### Fluxo de Login [CONFIRMADA]

1. Usuário informa email e senha
2. POST /api/auth/login com {email, senha}
3. Backend busca usuário por email, verifica SHA-256 da senha
4. Se válido: gera JWT com payload {id, email, tipo, nome, concessionaria_id}
5. JWT com validade 7 dias (JWT_EXPIRES_IN=7d)
6. Frontend armazena: 'authToken' (JWT) e 'user' (objeto sem senha) no localStorage

### Middleware de Autenticação (backend/middleware/auth.js) [CONFIRMADA]

- requireAuth — verifica Bearer token JWT, popula req.user
- requireAdmin — verifica se req.user.tipo = 'admin' ou 'admin_concessionaria'
- requireRole(...roles) — verifica se tipo do usuário está na lista permitida

### Hash de Senha [CONFIRMADA / LEGADA]

SHA-256 via crypto.createHash('sha256').update(password).digest('hex')

**[LEGADA]** SHA-256 sem salt não é adequado para senhas em produção. Em reconstrução, usar bcrypt ou argon2.

### JWT Secret [CONFIRMADA / PROBLEMÁTICA]

Usa process.env.JWT_SECRET com fallback hardcoded 'stark-dev-secret-fallback'. O fallback é inseguro em produção.

### Supabase RLS [CONFIRMADA / PROVÁVEL]

RLS habilitado em algumas tabelas (ex: solicitacoes_desconto). O frontend acessa tabelas diretamente via Supabase JS Client — a segurança depende da configuração correta das políticas RLS no Supabase.

### ProtectedRoute (src/components/ProtectedRoute.jsx) [CONFIRMADA]

Verifica se usuário está autenticado antes de renderizar rotas protegidas. Se não autenticado, redireciona para /.

---

## 17. DASHBOARDS

### Dashboard Admin (/dashboard-admin) [CONFIRMADA]

**Acesso:** admin, admin_concessionaria

Métricas disponíveis:
- Total de vendedores ativos, total de guindastes no catálogo
- Total de propostas e valor total no período filtrado
- Taxa de conversão (efetivadas / total com resultado)
- Propostas efetivadas e perdidas (count + valor)

Filtros: período (7, 15, 30, 60, 90 dias, "Todos") e visão ("Criadas" ou "Efetivadas").

Breakdown por linha de produto (GSI / GSE / Outros): count, valor, comparativo com período anterior.

Rankings: top produtos, ranking de vendedores, breakdown por região/UF, pipeline de saúde do funil.

Carregamento: getUsers(), getGuindastesCountForDashboard(), getPropostas({includeDadosSerializados: true}).

Para admin_concessionaria: filtrado por concessionaria_id e vendedores da concessionária.

### Dashboard Vendedor (/dashboard) [CONFIRMADA]

**Acesso:** vendedor, vendedor_concessionaria

Exibe: propostas recentes do vendedor, KPIs básicos próprios, atalhos: "Nova Proposta", "Histórico".

---

## 18. COMPONENTES E FUNCIONALIDADES DUPLICADAS

### Formulários de Caminhão Duplicados [CONFLITANTE]

Existem 3 versões:
- src/components/NovoPedido/CaminhaoForm.jsx — versão simples
- src/components/NovoPedido/CaminhaoFormDetalhado.jsx — versão expandida
- src/components/FormCaminhao.jsx — terceira versão (origem incerta)

### Formulários de Cliente Duplicados [CONFLITANTE]

Existem 2 versões:
- src/components/NovoPedido/ClienteForm.jsx
- src/components/NovoPedido/ClienteFormDetalhado.jsx

Não está claro qual é o padrão de uso atual.

### Lógica de Pagamento Duplicada [CONFLITANTE]

- src/lib/payments.js — funções de cálculo (calcularPagamento, helpers)
- src/utils/paymentHelpers.js — funções auxiliares (limites de desconto, validações)
- src/features/payment/PaymentPolicy.jsx — toda a lógica de UI e orquestração de cálculo

A lógica está espalhada em 3 arquivos diferentes.

### Acesso ao Banco Duplicado [CONFLITANTE]

- Backend Express com pg pool — operações CRUD principais
- Supabase JS Client direto no frontend — operações de tempo real, protótipos, configurações

### Duas Rotas para o Mesmo Componente [CONFIRMADA]

NovoPedido é usado tanto em /novo-pedido (vendedor Stark) quanto em /nova-proposta-concessionaria (admin concessionária). A distinção é feita pelo pathname e pela lógica interna de isModoConcessionaria.

---

## 19. FUNCIONALIDADES CONFIRMADAS

Lista das funcionalidades verificadas diretamente no código:

**Autenticação e Sessão:**
- Login com email/senha via JWT
- Persistência de sessão no localStorage
- Proteção de rotas por perfil

**Fluxo de Proposta:**
- Stepper de 5 etapas (seleção, pagamento, cliente, veículo, resumo)
- Persistência em localStorage a cada mudança
- Modo edição (carrega proposta existente)
- Salvamento automático após gerar PDF
- Modo concessionária com múltiplos guindastes

**Guindastes:**
- CRUD completo de guindastes
- Preços por região (venda e compra)
- Visibilidade por vendedor
- Protótipos com planos de pagamento dedicados
- Bloqueio de desconto por guindaste
- Valores customizados de instalação

**Pagamentos:**
- Função calcularPagamento com desconto, acréscimo, entrada, parcelas, vencimentos
- Planos globais e planos de protótipo
- Fallback JSON de planos
- Financiamento bancário, condição exclusiva
- Campo formaEntrada (PIX, Boleto, etc.)

**Descontos:**
- Desconto do vendedor com limites por cenário
- Sistema de aprovação em tempo real via Supabase Realtime
- desconto_aprovado armazenado como VALOR FINAL em R$ (não percentual)
- Bloqueio de desconto por guindaste

**Fretes:**
- Tabela de pontos de instalação com valores FOB/CIF
- Dois tipos de entrega: prioridade e reaproveitamento
- Filtro por vendedor ou UF

**PDF:**
- Geração client-side com jsPDF + html2canvas
- Estrutura de 6 seções fixas
- Cabeçalho/rodapé como imagens PNG
- Mesclagem de gráficos de carga via pdf-lib
- Nomenclatura com nome do cliente
- Suporte a Espanhol (comércio exterior)
- Parcelamento detalhado por parcela individual

**Dashboards:**
- KPIs com comparativo de período
- Breakdown por linha de produto (GSI/GSE/Outros)
- Ranking de vendedores
- Pipeline de saúde do funil

---

## 20. FUNCIONALIDADES PROVÁVEIS

Funcionalidades identificadas no código mas sem validação completa no fluxo:

- **Metas de vendedores** — Tabela metas_vendedores existe, rota /api/metas existe, mas nenhuma tela claramente consome essa funcionalidade.

- **VisualizarProposta** — Rota /proposta/:id existe e há componente, mas não há fluxo claro de compartilhamento/acesso público.

- **WhatsAppModal** — Componente existe mas não foi encontrado claramente em nenhum fluxo de tela.

- **Estoque de concessionária** — EstoqueConcessionaria.jsx existe em src/lib/pages/ mas não há rota configurada para ela em App.jsx.

- **PrecosVendaConcessionaria** — PrecosVendaConcessionaria.jsx existe em src/lib/pages/ mas sem rota em App.jsx.

- **Resultado da venda** — Campos resultado_venda, motivo_perda existem na tabela propostas (schema sugere rastreamento de efetivação/perda), e há lógica de visaoConversao no DashboardAdmin, mas o fluxo de registro não foi encontrado claramente.

- **Canal de venda e segmento do cliente** — Campos canal_venda e segmento_cliente existem na tabela propostas e são salvos no schema de createpropostas, mas não foram encontrados campos de entrada no formulário.

- **Proposta Preliminar** — Há referências a "proposta preliminar" (caminhão sem voltagem) no código de ResumoPedido, sugerindo que propostas podem ser geradas sem todos os dados veiculares preenchidos.

---

## 21. FUNCIONALIDADES DUVIDOSAS

Itens encontrados no código sem evidência clara de uso ativo:

- **ModalTipoProposta.jsx** — Componente de modal para selecionar tipo de proposta existe mas não foi encontrado sendo importado ou utilizado em nenhuma tela atual.

- **VisualizarProposta (/proposta/:id)** — Rota existe mas sem lógica clara de como o link é gerado ou compartilhado. Pode ser um recurso abandonado ou em desenvolvimento.

- **Comentário de inativação de usuário** — O código de login tem um bloco comentado que verificava se o usuário estava ativo. Isso significa que usuários inativos ainda conseguem logar.

- **GraficosCarga como tela de vendedor** — A rota /graficos-carga existe no layout de vendedor, mas a utilidade prática para vendedores não está clara (é diferente da funcionalidade de anexar gráficos ao PDF).

- **src/config/codigosGuindaste.js** — Existe em src/config/ mas não foi rastreado claramente em nenhum fluxo de geração de código de produto no PDF.

---

## 22. FUNCIONALIDADES LEGADAS

Código/estrutura que existe mas está sendo ou deve ser substituído:

- **campo users.regiao** — Campo de "região principal" do vendedor, sendo substituído por regioes_operacao. Ainda existe no banco e código mas a lógica ativa usa regioes_operacao.

- **SHA-256 para senha** — Hash sem salt. Padrão inseguro para uso atual.

- **src/config/constants.js** — Contém constantes (USER_TYPES, REGIONS, PDF_CONFIG, etc.) que parecem não ser consumidas pelo código atual, com valores desatualizados (COMPANY_ADDRESS, COMPANY_CNPJ hardcoded).

- **Fallback JSON de planos de pagamento** — src/services/paymentPlans.js com planos em JSON. Existe como fallback mas deveria ser removido quando o banco estiver confiável.

- **carrinhoAcumulativo** — Referenciado no código do modo concessionária mas com comportamento não totalmente mapeado.

- **db.createPedido() e db.createPedidoItem()** — Funções que foram chamadas em ResumoPedido mas não existiam em supabase.js. Foram removidas em correção de bug, indicando código legado referenciando funções inexistentes.

---

## 23. REGRAS CONFLITANTES

| Conflito | Descrição |
|----------|-----------|
| Acesso ao banco | Sistema usa dois canais (backend Express + Supabase JS frontend) sem separação clara de responsabilidades |
| Região do vendedor | user.regiao (campo legado) vs regioes_operacao (campo atual) — ambos podem estar definidos |
| Limite de desconto | paymentHelpers.js calcula limites, mas PaymentPolicy.jsx também tem lógica própria para mostrar/ocultar botões de desconto |
| desconto_aprovado | Campo inicialmente tratado como percentual, corrigido para ser valor em R$. Dados antigos no banco podem ser inconsistentes |
| Número de proposta | Gerado localmente via localStorage sem garantia de unicidade com múltiplos usuários simultâneos |
| Formulários de caminhão | 3 versões existem. Não está documentado qual usar em qual contexto |
| Formulários de cliente | 2 versões existem. Não está documentado qual usar |
| Usuário inativo | Verificação de ativo comentada no código de login — usuários inativos conseguem acessar o sistema |
| Modo concessionária | A detecção de isModoConcessionaria usa pathname (inclui 'nova-proposta-concessionaria') E tipo de usuário, mas os dois critérios podem conflitar |

---

## 24. PROBLEMAS E LIMITAÇÕES ATUAIS

**Segurança:**
- SHA-256 sem salt para senhas (deveria ser bcrypt/argon2)
- JWT secret com fallback hardcoded em desenvolvimento
- Frontend acessa banco diretamente via Supabase JS (depende de RLS correto)
- Verificação de usuário ativo desabilitada (comentada)

**Geração de PDF:**
- Todo o conteúdo é imagem — não é possível copiar texto do PDF
- Paginação automática pode cortar conteúdo no meio de parágrafos
- Qualidade JPEG 92% pode degradar textos finos
- Geração pode ser lenta para PDFs com muitas páginas/gráficos

**Numeração de Propostas:**
- Número gerado localmente no localStorage sem garantia de unicidade em produção com múltiplos usuários

**Região/Preço:**
- Sistema usa dois campos de região (user.regiao legado + regioes_operacao), causando confusão

**Código:**
- Arquivo NovoPedido.jsx com ~148KB (arquivo único muito grande)
- PDFGenerator.jsx com ~137KB (arquivo único muito grande)
- Lógica de pagamento dispersa em 3 arquivos diferentes
- Componentes duplicados de formulários sem padrão claro

**Manutenção:**
- Múltiplos arquivos .md de documentação e .sql avulsos na raiz do projeto (artefatos de desenvolvimento)
- src/config/constants.js com valores hardcoded desatualizados

---

## 25. REQUISITOS FUNCIONAIS EXTRAÍDOS

Para reconstrução de sistema equivalente, os seguintes requisitos funcionais foram extraídos:

**RF01** — O sistema deve suportar 5 perfis de usuário com isolamento de dados: admin, vendedor, admin_concessionaria, vendedor_concessionaria, vendedor_exterior.

**RF02** — O fluxo de criação de proposta deve ser um stepper multi-etapas com persistência local entre etapas.

**RF03** — O preço do guindaste deve ser definido por região geográfica do cliente (mínimo 6 regiões: Norte-Nordeste, Centro-Oeste, Sul-Sudeste, RS com IE, RS sem IE, Comércio Exterior).

**RF04** — O sistema deve suportar preços de venda (para cliente) e preços de compra (para concessionária) por região.

**RF05** — O cálculo de pagamento deve suportar: desconto do plano, acréscimo sobre saldo, entrada mínima, múltiplas parcelas com datas de vencimento.

**RF06** — O sistema deve ter um sistema de aprovação de descontos extras em tempo real (WebSocket/Realtime).

**RF07** — Vendedores com múltiplas regiões de operação devem poder selecionar a região do cliente ao criar uma proposta.

**RF08** — O guindaste pode ter desconto bloqueado individualmente.

**RF09** — A instalação pode ser "inclusa no pedido" (soma ao total) ou "cliente paga direto" (informativa).

**RF10** — O frete pode ser FOB (cliente retira) ou CIF com dois tipos de entrega (prioridade/reaproveitamento).

**RF11** — A geração de PDF deve incluir: capa, equipamento, veículo, condições financeiras, dados bancários, cláusulas e gráficos de carga como páginas extras.

**RF12** — O PDF deve suportar idioma Português e Espanhol.

**RF13** — Propostas devem ser salvas automaticamente no banco após geração do PDF.

**RF14** — O sistema deve suportar edição de propostas existentes.

**RF15** — O modo concessionária deve suportar múltiplos guindastes em um único pedido.

**RF16** — Guindastes podem ser marcados como protótipo com acesso restrito e planos de pagamento dedicados.

**RF17** — Guindastes podem ter visibilidade controlada por vendedor.

**RF18** — O dashboard admin deve exibir KPIs com breakdown por linha de produto e comparativo de período.

**RF19** — A cotação USD deve ser configurável pelo admin e aplicada automaticamente em propostas de comércio exterior.

**RF20** — O sistema deve suportar concessionárias parceiras com preços de compra específicos.

---

## 26. PERGUNTAS PARA VALIDAÇÃO HUMANA

As seguintes perguntas requerem confirmação de um humano com conhecimento do negócio:

1. **Numeração de proposta:** O número é realmente gerado localmente? Há risco real de duplicação? Como é o formato atual (ex: "PROP-2025-001")?

2. **Usuários inativos:** A verificação de ativo está intencionalmente desabilitada? Usuários inativos devem ou não conseguir logar?

3. **VisualizarProposta (/proposta/:id):** Esta funcionalidade está em uso? Como o link é gerado e compartilhado com o cliente?

4. **Metas de vendedores:** A funcionalidade de metas está implementada em alguma tela não encontrada na análise? Ou está em desenvolvimento?

5. **EstoqueConcessionaria.jsx e PrecosVendaConcessionaria.jsx:** Essas páginas serão ativadas no futuro? Por que existem sem rota?

6. **Canal de venda e segmento do cliente:** De onde vêm esses valores? São preenchidos manualmente pelo vendedor em alguma tela não mapeada?

7. **Resultado da venda (efetivada/perdida):** O registro de resultado é feito em qual tela? Há um fluxo pós-proposta para marcar o resultado?

8. **Proposta preliminar:** Em qual cenário uma proposta é "preliminar"? O vendedor consegue escolher isso explicitamente?

9. **Limites de desconto:** Os limites hardcoded (3%, 7%, 12%, 15%) em paymentHelpers.js são definitivos? Ou deveriam ser configuráveis?

10. **Modo internacional:** Além de Espanhol, há planos para outros idiomas? As regras de negócio diferem para comércio exterior além do idioma e moeda?

11. **Gráficos de carga:** O mapeamento entre modelo de guindaste e arquivo PDF do gráfico é manual ou automático?

12. **Concessionárias com uso_interno_stark:** Quantas concessionárias têm essa flag? Qual é o propósito exato?

13. **Desconto de quantidade (modo concessionária):** O campo descontoQuantidadePercent está hardcoded em 0. Existe uma regra planejada para desconto por quantidade de equipamentos?

14. **Planos publicados:** Qual é o fluxo exato para publicar/despublicar planos de pagamento? O admin publica manualmente?

15. **RLS no Supabase:** Quais tabelas têm RLS configurado? As políticas estão corretamente implementadas para todos os perfis?

---

## 27. DIVISÃO DO SISTEMA POR MÓDULOS

Para fins de reconstrução, o sistema pode ser dividido nos seguintes módulos independentes:

### Módulo 1 — Autenticação e Usuários
**Responsabilidade:** Login, logout, gestão de perfis e permissões.
**Arquivos chave:** Login.jsx, AuthContext.jsx, ProtectedRoute.jsx, usersController.js, auth.js (middleware), GerenciarVendedores.jsx

### Módulo 2 — Catálogo de Guindastes
**Responsabilidade:** CRUD de guindastes, preços por região, visibilidade, protótipos.
**Arquivos chave:** GerenciarGuindastes.jsx, guindastes.js (API), GuindasteConfigurador.jsx, DetalhesGuindaste.jsx, PrecosPorRegiaoModal.jsx

### Módulo 3 — Configuração de Proposta (Carrinho)
**Responsabilidade:** Seleção de guindastes e opcionais, montagem do carrinho.
**Arquivos chave:** NovoPedido.jsx (Steps 1 e navegação), GuindasteConfigurador.jsx, CarrinhoForm.jsx, Step1GuindasteSelector.jsx, CarrinhoContext.jsx

### Módulo 4 — Condições Comerciais (Pagamento)
**Responsabilidade:** Seleção de tipo de cliente, frete, instalação, plano de pagamento, desconto do vendedor.
**Arquivos chave:** PaymentPolicy.jsx, payments.js (cálculos), paymentHelpers.js, PlanosPagamento.jsx, GerenciarFretes.jsx

### Módulo 5 — Dados do Cliente e Veículo
**Responsabilidade:** Formulários de dados do cliente e estudo veicular.
**Arquivos chave:** ClienteForm.jsx, ClienteFormDetalhado.jsx, CaminhaoForm.jsx, CaminhaoFormDetalhado.jsx, EstudosVeicularesMultiplos.jsx

### Módulo 6 — Geração de PDF
**Responsabilidade:** Geração e download do PDF da proposta comercial.
**Arquivos chave:** PDFGenerator.jsx, LazyPDFGenerator.jsx, ResumoPedido.jsx, public/cebecalho1.png, public/rodapé.png

### Módulo 7 — Histórico e Gestão de Propostas
**Responsabilidade:** Listagem, edição, visualização e exclusão de propostas.
**Arquivos chave:** HistoricoPropostas.jsx, VisualizarProposta.jsx, propostas.js (API)

### Módulo 8 — Sistema de Descontos
**Responsabilidade:** Solicitação, aprovação e notificação de descontos extras em tempo real.
**Arquivos chave:** SolicitarDescontoModal.jsx, AprovacoesDescontos.jsx, tabela solicitacoes_desconto (Supabase Realtime)

### Módulo 9 — Concessionárias
**Responsabilidade:** CRUD de concessionárias, preços de compra, modo de compra.
**Arquivos chave:** Concessionarias.jsx, concessionarias.js (API), NovoPedido.jsx (modo concessionária)

### Módulo 10 — Dashboards e Analytics
**Responsabilidade:** KPIs, rankings, breakdowns e comparativos de período.
**Arquivos chave:** DashboardAdmin.jsx, DashboardVendedor.jsx, RelatorioCompleto.jsx

### Módulo 11 — Gráficos de Carga
**Responsabilidade:** Gestão e exibição de gráficos de carga dos guindastes.
**Arquivos chave:** GerenciarGraficosCarga.jsx, GraficosCarga.jsx, modelNormalization.js

### Módulo 12 — Configurações Globais
**Responsabilidade:** Cotação USD, parâmetros globais do sistema.
**Arquivos chave:** CotacaoDolar.jsx, Configuracoes.jsx, configuracoes_globais (Supabase)

---

*Fim da documentação funcional do Configurador Stark v1.*
*Este documento foi gerado a partir de análise estática do código-fonte e deve ser validado com os responsáveis pelo negócio para os itens marcados como DUVIDOSO, PROVÁVEL e para todas as perguntas da seção 26.*
