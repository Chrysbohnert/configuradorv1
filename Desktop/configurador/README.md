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
1. Execute o script `supabase-setup.sql` no Supabase SQL Editor
2. Execute o script `setup-admin.sql` para criar o usuário admin

### **4. Rodar o Projeto**
```bash
npm run dev
```

## 📋 **FUNCIONALIDADES**

### **👤 Sistema de Usuários**
- **Admin:** Acesso total ao sistema
- **Vendedor:** Criação de orçamentos e gestão de clientes

### **🏗️ Gestão de Guindastes**
- Cadastro de guindastes com imagens
- Upload de fotos para Supabase Storage
- Categorização por tipo (hidráulico, telescópico, torre)

### **⚙️ Opcionais**
- Cadastro de acessórios e opcionais
- Categorização por tipo
- Preços personalizáveis

### **👥 Gestão de Vendedores**
- Cadastro de vendedores
- Controle de comissões
- Histórico de vendas

### **📊 Orçamentos**
- Criação de orçamentos completos
- Seleção de guindastes e opcionais
- Cálculo automático de valores
- Geração de PDF

### **📱 Interface Responsiva**
- Design moderno e profissional
- Funciona em desktop e mobile
- Navegação intuitiva

## 🗂️ **ESTRUTURA DO PROJETO**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── CardGuindaste.jsx
│   ├── ImageUpload.jsx
│   ├── UnifiedHeader.jsx
│   └── ...
├── pages/              # Páginas da aplicação
│   ├── Login.jsx
│   ├── DashboardAdmin.jsx
│   ├── GerenciarGuindastes.jsx
│   └── ...
├── config/             # Configurações
│   └── supabase.js
├── utils/              # Utilitários
│   ├── formatters.js
│   ├── validation.js
│   └── pdfGenerator.js
├── styles/             # Arquivos CSS
└── contexts/           # Contextos React
```

## 🔧 **TECNOLOGIAS**

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (PostgreSQL + Storage)
- **Estilização:** CSS Modules
- **Deploy:** Vercel

## 📱 **ACESSO AO SISTEMA**

### **Usuário Admin**
- **Email:** chrystian@starkorcamento.com
- **Senha:** admin123

### **Adicionar Novos Usuários**
1. Faça login como admin
2. Vá em "Gerenciar Vendedores"
3. Clique em "Novo Vendedor"
4. Preencha os dados

## 🎯 **PRÓXIMOS PASSOS**

1. **Testar o sistema** com dados reais
2. **Adicionar guindastes** com fotos
3. **Cadastrar vendedores**
4. **Criar orçamentos** de teste
5. **Deploy em produção**

## 🚀 **DEPLOY**

O projeto está configurado para deploy na Vercel:

```bash
npm run build
```

## 📞 **SUPORTE**

Para dúvidas ou problemas:
- Verifique as configurações do Supabase
- Confirme se o `.env.local` está correto
- Teste a conexão com o banco de dados

---

**Desenvolvido com ❤️ para STARK Orçamento**
