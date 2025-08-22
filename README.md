# 🏗️ STARK Orçamento

Sistema profissional de orçamentos para guindastes, desenvolvido com React + Vite e Supabase.

## 🚀 **CONFIGURAÇÃO RÁPIDA**

### **1. Instalar Dependências**
```bash
npm install
```

### **2. Configurar Variáveis de Ambiente**
Crie um arquivo `.env.local` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### **3. Configurar Banco de Dados**
Execute no Supabase SQL Editor na seguinte ordem:
1. `supabase-setup.sql` - Estrutura completa do banco
2. `criar-tabela-precos.sql` - Tabela de preços por região
3. `setup-admin.sql` - Usuário admin inicial

### **4. Rodar o Projeto**
```bash
npm run dev
```

## 📋 **FUNCIONALIDADES**

### **👤 Sistema de Usuários**
- **Admin:** Acesso total ao sistema com navegação lateral
- **Vendedor:** Criação de orçamentos e gestão de clientes

### **🏗️ Gestão de Guindastes**
- Cadastro de guindastes com imagens
- Upload de fotos para Supabase Storage
- Categorização por tipo (hidráulico, telescópico, torre)
- **Opcionais específicos** por guindaste
- **Preços por região** configuráveis

### **⚙️ Sistema de Opcionais**
- Cada guindaste tem seus próprios opcionais
- Categorização por tipo (acessório, iluminação, controle, segurança)
- Preços personalizáveis
- Seleção múltipla independente

### **👥 Gestão de Vendedores**
- Cadastro de vendedores com região
- Controle de comissões
- Histórico de vendas detalhado
- Relatórios por vendedor

### **📊 Orçamentos e Relatórios**
- Criação de orçamentos completos
- Seleção de guindastes e opcionais
- Cálculo automático de valores
- Geração de PDF
- **Relatório completo** com filtros por status e período
- **Preços específicos** por região do vendedor

### **📱 Interface Responsiva**
- Design moderno e profissional
- Navegação lateral para admin
- Funciona em desktop e mobile
- Navegação intuitiva

## 🗂️ **ESTRUTURA DO PROJETO**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── AdminNavigation.jsx    # Navegação lateral do admin
│   ├── CardGuindaste.jsx      # Card de guindaste
│   ├── FormCliente.jsx        # Formulário de cliente
│   ├── FormCaminhao.jsx       # Formulário de caminhão
│   ├── GuindasteLoading.jsx   # Componente de loading
│   ├── ImageUpload.jsx        # Upload de imagens
│   ├── PDFGenerator.jsx       # Geração de PDF
│   ├── PrecosPorRegiaoModal.jsx # Modal de preços por região
│   ├── UnifiedHeader.jsx      # Header unificado
│   └── WhatsAppModal.jsx      # Modal do WhatsApp
├── config/             # Configurações
│   ├── constants.js    # Constantes do sistema
│   └── supabase.js     # Configuração do Supabase
├── pages/              # Páginas da aplicação
│   ├── Login.jsx       # Página de login
│   ├── DashboardAdmin.jsx      # Dashboard do admin
│   ├── DashboardVendedor.jsx   # Dashboard do vendedor
│   ├── GerenciarGuindastes.jsx # Gestão de guindastes
│   ├── GerenciarVendedores.jsx # Gestão de vendedores
│   ├── Historico.jsx   # Histórico de pedidos
│   ├── NovoPedido.jsx  # Criação de pedidos
│   ├── RelatorioCompleto.jsx   # Relatório completo
│   ├── Support.jsx     # Página de suporte
│   └── AlterarSenha.jsx # Alteração de senha
├── styles/             # Estilos CSS
│   ├── AdminNavigation.css    # Estilos da navegação
│   ├── Dashboard.css          # Estilos dos dashboards
│   ├── global.css             # Estilos globais
│   ├── GerenciarGuindastes.css # Estilos da gestão
│   ├── GerenciarVendedores.css # Estilos da gestão
│   ├── Historico.css          # Estilos do histórico
│   ├── Login.css              # Estilos do login
│   ├── NovoPedido.css         # Estilos do novo pedido
│   ├── Support.css            # Estilos do suporte
│   ├── UnifiedHeader.css      # Estilos do header
│   └── WhatsAppModal.css      # Estilos do WhatsApp
└── utils/              # Utilitários
    ├── formatters.js   # Formatação de dados
    ├── pdfGenerator.js # Geração de PDF
    └── validation.js   # Validações
```

## 🗄️ **ESTRUTURA DO BANCO**

### **Tabelas Principais:**
- `users` - Usuários (admin/vendedor)
- `guindastes` - Guindastes disponíveis
- `opcionais` - Opcionais do sistema
- `guindaste_opcionais` - Relacionamento guindaste-opcional
- `precos_guindaste_regiao` - Preços por região
- `clientes` - Clientes dos pedidos
- `caminhoes` - Caminhões dos pedidos
- `pedidos` - Pedidos/orçamentos
- `pedido_itens` - Itens dos pedidos

## 🎯 **FUNCIONALIDADES DESTACADAS**

### **✅ Sistema Completo de Orçamentos**
- Fluxo completo de criação de orçamentos
- Seleção de guindastes com preços por região
- Opcionais específicos por guindaste
- Dados completos de cliente e caminhão
- Geração de PDF profissional

### **✅ Gestão Administrativa**
- Dashboard com estatísticas reais
- Relatório completo de vendedores
- Filtros por status e período
- Navegação lateral intuitiva
- CRUD completo de guindastes e vendedores

### **✅ Preços por Região**
- Configuração de preços diferentes por região
- Vendedores veem preços específicos
- Sistema usa preço padrão se não houver regional

### **✅ Relatórios Detalhados**
- Relatório completo de todos os vendedores
- Estatísticas por vendedor
- Filtros por status e período
- Geração de PDF por vendedor

## 🚀 **DEPLOY**

### **Vercel (Recomendado)**
```bash
npm run build
vercel --prod
```

### **Outras Plataformas**
- Netlify
- Railway
- Heroku

## 📱 **RESPONSIVIDADE**

O sistema é totalmente responsivo e funciona em:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (375px+)

## 🔧 **TECNOLOGIAS**

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Estilização:** CSS3 + Flexbox/Grid
- **PDF:** jsPDF
- **Ícones:** SVG inline
- **Deploy:** Vercel

## 📄 **LICENÇA**

Este projeto é de uso interno da STARK Orçamento.

---

**🎉 Sistema 100% funcional e pronto para produção!**
