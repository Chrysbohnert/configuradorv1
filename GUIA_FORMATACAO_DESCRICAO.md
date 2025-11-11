# 📝 Guia de Formatação - Descrição Técnica

## Como usar formatação na Descrição Técnica e Não Incluído

Ao cadastrar ou editar guindastes no painel admin, você pode usar marcadores especiais para formatar o texto que aparecerá no PDF.

---

## ✨ Formatações Disponíveis

### **Negrito**
Use `**` (dois asteriscos) antes e depois do texto que quer em negrito.

**Exemplo no admin:**
```
Este guindaste possui **capacidade de 6.5 toneladas** e é ideal para **trabalhos pesados**.
```

**Resultado no PDF:**
```
Este guindaste possui capacidade de 6.5 toneladas e é ideal para trabalhos pesados.
                      ^^^^^^^^^^^^^^^^^^^^^^^^              ^^^^^^^^^^^^^^^^^
                           (em negrito)                        (em negrito)
```

---

## 📋 Exemplos Práticos

### Exemplo 1: Destacar especificações importantes
```
**CARACTERÍSTICAS TÉCNICAS:**
- Capacidade: **6.5 toneladas**
- Alcance: **8 metros**
- Sistema hidráulico: **Alta pressão**
```

### Exemplo 2: Destacar avisos importantes
```
**ATENÇÃO:** Este equipamento requer **manutenção preventiva** a cada 500 horas de uso.
```

### Exemplo 3: Descrição completa
```
Guindaste articulado modelo GSI 6.5 2H1M com **capacidade de 6.5 toneladas** e **alcance máximo de 8 metros**.

**ESPECIFICAÇÕES:**
- Rotação: **360 graus contínua**
- Estabilizadores: **4 patolamentos hidráulicos**
- Comando: **Rádio controle remoto**

**DIFERENCIAIS:**
- Sistema de **segurança ativa**
- Válvulas de **sobrecarga automática**
- Pintura **epóxi de alta resistência**
```

---

## ⚠️ Regras Importantes

1. **Sempre feche os marcadores:** Se abrir `**`, precisa fechar com `**`
   - ✅ Correto: `**texto em negrito**`
   - ❌ Errado: `**texto em negrito`

2. **Não use dentro de palavras:** Use em palavras ou frases completas
   - ✅ Correto: `capacidade de **6.5 toneladas**`
   - ❌ Evite: `capaci**dade de 6.5 tonel**adas`

3. **Funciona em múltiplas linhas:** Pode usar em qualquer parte do texto
   ```
   Linha 1 com **negrito**
   Linha 2 também com **negrito**
   ```

---

## 🎯 Onde Usar

Esta formatação funciona em:
- ✅ **Descrição Técnica** (campo principal)
- ✅ **Não Incluído** (campo de exclusões)

---

## 💡 Dicas de Uso

1. **Use com moderação:** Negrito demais perde o efeito
2. **Destaque o importante:** Capacidades, medidas, avisos críticos
3. **Mantenha consistência:** Use o mesmo padrão em todos os equipamentos
4. **Teste antes:** Gere um PDF de teste para ver como ficou

---

## 🔄 Futuras Formatações (em desenvolvimento)

Em breve você poderá usar também:
- `*texto*` para itálico
- `_texto_` para sublinhado
- `# Título` para títulos grandes

---

**Última atualização:** 10/11/2025
**Versão:** 1.0
