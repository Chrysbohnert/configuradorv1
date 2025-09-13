# 🔐 Guia de Migração de Senhas

## ⚠️ IMPORTANTE: Execute este processo ANTES de usar o sistema em produção!

### 📋 Passos para Migração

#### 1. **Fazer Login no Sistema**
- Acesse o sistema normalmente
- Faça login com suas credenciais atuais

#### 2. **Executar Migração no Console**
- Abra o console do navegador (F12)
- Execute o comando:
```javascript
runPasswordMigration()
```

#### 3. **Verificar Migração**
- O console mostrará quantas senhas foram migradas
- Todas as senhas antigas serão convertidas para hash seguro

### 🆕 Criar Usuários de Teste (Opcional)

#### Criar Admin de Teste:
```javascript
createTestAdmin()
```

#### Criar Vendedor de Teste:
```javascript
createTestVendedor()
```

### ✅ Verificação Pós-Migração

1. **Teste o Login:**
   - Faça logout
   - Tente fazer login novamente
   - Deve funcionar normalmente

2. **Verifique no Banco:**
   - As senhas agora devem ter 64 caracteres
   - Formato: hash hexadecimal (ex: `a1b2c3d4...`)

### 🔒 Melhorias de Segurança Implementadas

- ✅ **Hash de senhas** com PBKDF2
- ✅ **Validação automática** de hash
- ✅ **Tratamento de erros** centralizado
- ✅ **Rotas protegidas** por tipo de usuário
- ✅ **Hook de autenticação** otimizado

### 🚨 Problemas Comuns

#### Erro: "Variáveis de ambiente não configuradas"
- Verifique se o arquivo `.env.local` existe
- Confirme se as variáveis do Supabase estão corretas

#### Erro: "Usuário não encontrado"
- Execute a migração primeiro
- Verifique se está logado como admin

#### Senha não funciona após migração
- As senhas antigas continuam funcionando
- Apenas são armazenadas de forma segura agora

### 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador
2. Confirme se todas as dependências estão instaladas
3. Teste com usuários de teste criados

---

**🎉 Após a migração, seu sistema estará muito mais seguro!**
