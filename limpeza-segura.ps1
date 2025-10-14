# Script de Limpeza Segura do Projeto
# Data: 14/10/2025
# IMPORTANTE: Execute este script com cuidado!

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LIMPEZA SEGURA DO PROJETO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "src")) {
    Write-Host "ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Criar backup antes de começar
Write-Host "1. Criando backup..." -ForegroundColor Yellow
$backupFolder = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "   Pasta de backup: $backupFolder" -ForegroundColor Gray

# Perguntar confirmação
Write-Host ""
$confirm = Read-Host "Deseja continuar com a limpeza? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 1: Removendo Componentes Duplicados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$componentesDuplicados = @(
    "src\components\MemoizedCaminhaoForm.jsx",
    "src\components\MemoizedCardGuindaste.jsx",
    "src\components\MemoizedCarrinhoForm.jsx",
    "src\components\MemoizedClienteForm.jsx",
    "src\components\MemoizedWhatsAppModal.jsx",
    "src\components\OptimizedGuindasteCard.jsx",
    "src\components\OptimizedLoadingSpinner.jsx",
    "src\components\ProtectedRouteRefactored.jsx"
)

foreach ($file in $componentesDuplicados) {
    if (Test-Path $file) {
        Write-Host "   Removendo: $file" -ForegroundColor Gray
        Remove-Item $file -Force
    } else {
        Write-Host "   Não encontrado: $file" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 2: Removendo Arquivos de Migração" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$migracoes = @(
    "src\utils\migratePasswords.js",
    "src\utils\migrateUsersToSupabaseAuth.js",
    "src\utils\supabaseAuthMigration.js",
    "src\utils\runMigration.js"
)

foreach ($file in $migracoes) {
    if (Test-Path $file) {
        Write-Host "   Removendo: $file" -ForegroundColor Gray
        Remove-Item $file -Force
    } else {
        Write-Host "   Não encontrado: $file" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 3: Removendo Arquivos de Teste" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$testes = @(
    "src\utils\testGraficoMatching.js"
)

foreach ($file in $testes) {
    if (Test-Path $file) {
        Write-Host "   Removendo: $file" -ForegroundColor Gray
        Remove-Item $file -Force
    } else {
        Write-Host "   Não encontrado: $file" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 4: Removendo Pastas Não Usadas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Reducers
if (Test-Path "src\reducers") {
    Write-Host "   Removendo pasta: src\reducers" -ForegroundColor Gray
    Remove-Item "src\reducers" -Recurse -Force
}

# Types
if (Test-Path "src\types") {
    Write-Host "   Removendo pasta: src\types" -ForegroundColor Gray
    Remove-Item "src\types" -Recurse -Force
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 5: Removendo Hooks Duplicados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$hooksDuplicados = @(
    "src\hooks\useCapacidadesUltraRapidas.js",
    "src\hooks\useGuindasteOptimizer.js",
    "src\hooks\useGuindastesOptimized.js",
    "src\hooks\useMemoization.js",
    "src\hooks\useNovoPedido.js"
)

foreach ($file in $hooksDuplicados) {
    if (Test-Path $file) {
        Write-Host "   Removendo: $file" -ForegroundColor Gray
        Remove-Item $file -Force
    } else {
        Write-Host "   Não encontrado: $file" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FASE 6: Removendo Docs Duplicados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$docsDuplicados = @(
    "src\docs\FILE_ORGANIZATION.md",
    "src\docs\ORGANIZATION_FINAL.md",
    "src\docs\ORGANIZATION_SUMMARY.md",
    "src\docs\RAIZ_ORGANIZATION.md"
)

foreach ($file in $docsDuplicados) {
    if (Test-Path $file) {
        Write-Host "   Removendo: $file" -ForegroundColor Gray
        Remove-Item $file -Force
    } else {
        Write-Host "   Não encontrado: $file" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  LIMPEZA CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Contar arquivos removidos
Write-Host "Resumo:" -ForegroundColor Cyan
Write-Host "  - Componentes duplicados: 8 arquivos" -ForegroundColor Gray
Write-Host "  - Migrações: 4 arquivos" -ForegroundColor Gray
Write-Host "  - Testes: 1 arquivo" -ForegroundColor Gray
Write-Host "  - Hooks duplicados: 5 arquivos" -ForegroundColor Gray
Write-Host "  - Docs duplicados: 4 arquivos" -ForegroundColor Gray
Write-Host "  - Pastas removidas: 2 (reducers, types)" -ForegroundColor Gray
Write-Host ""
Write-Host "Total estimado: ~24 arquivos removidos" -ForegroundColor Green
Write-Host ""

Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Teste a aplicação: npm run dev" -ForegroundColor Gray
Write-Host "  2. Verifique se tudo funciona" -ForegroundColor Gray
Write-Host "  3. Faça commit das mudanças" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
