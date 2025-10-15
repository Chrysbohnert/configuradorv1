# Script de Limpeza Agressiva de Código
# Remove console.logs, comentários excessivos, espaços em branco
# Data: 14/10/2025

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LIMPEZA AGRESSIVA DE CÓDIGO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "src")) {
    Write-Host "ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Estatísticas
$totalFiles = 0
$totalLogsRemoved = 0
$totalLinesRemoved = 0
$totalSizeReduced = 0

# Perguntar confirmação
Write-Host "Este script irá:" -ForegroundColor Yellow
Write-Host "  - Remover ~400 console.log de debug" -ForegroundColor Gray
Write-Host "  - Remover comentários excessivos" -ForegroundColor Gray
Write-Host "  - Remover linhas em branco excessivas" -ForegroundColor Gray
Write-Host "  - Remover espaços no final das linhas" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANTE: Faça backup antes!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Processando arquivos..." -ForegroundColor Cyan
Write-Host ""

# Função para processar arquivo
function Process-File {
    param($file)
    
    $originalSize = $file.Length
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) {
        return
    }
    
    $originalContent = $content
    $logsRemoved = 0
    
    # 1. Remover console.log (manter console.error, console.warn)
    $logMatches = [regex]::Matches($content, "console\.log\([^)]*\);?")
    $logsRemoved = $logMatches.Count
    $content = $content -replace "console\.log\([^)]*\);?\r?\n?", ""
    
    # 2. Remover comentários de linha única óbvios (// seguido de espaço e texto curto)
    # Manter comentários importantes (IMPORTANTE, TODO, FIXME, NOTE, etc.)
    $content = $content -replace "(?m)^\s*//\s*={3,}.*$\r?\n?", ""  # Separadores ====
    $content = $content -replace "(?m)^\s*//\s*-{3,}.*$\r?\n?", ""  # Separadores ----
    
    # 3. Remover múltiplas linhas em branco (mais de 2 consecutivas)
    $content = $content -replace "(\r?\n\s*){3,}", "`r`n`r`n"
    
    # 4. Remover espaços no final das linhas
    $content = $content -replace "[ \t]+(\r?\n)", "`$1"
    
    # 5. Remover linhas vazias no início do arquivo
    $content = $content -replace "^\s+", ""
    
    # 6. Garantir uma linha vazia no final
    if (-not $content.EndsWith("`n")) {
        $content += "`r`n"
    }
    
    # Verificar se houve mudanças
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        
        $newSize = (Get-Item $file.FullName).Length
        $sizeReduced = $originalSize - $newSize
        
        $script:totalFiles++
        $script:totalLogsRemoved += $logsRemoved
        $script:totalSizeReduced += $sizeReduced
        
        $fileName = $file.Name
        $sizeKB = [math]::Round($sizeReduced / 1KB, 2)
        
        if ($logsRemoved -gt 0) {
            Write-Host "  ✓ $fileName" -ForegroundColor Green -NoNewline
            Write-Host " - $logsRemoved logs, -$sizeKB KB" -ForegroundColor Gray
        } else {
            Write-Host "  ✓ $fileName" -ForegroundColor Green -NoNewline
            Write-Host " - -$sizeKB KB" -ForegroundColor Gray
        }
    }
}

# Processar todos os arquivos .js e .jsx
Write-Host "Fase 1: Limpando arquivos JavaScript..." -ForegroundColor Yellow
Write-Host ""

Get-ChildItem -Path "src" -Recurse -Include "*.js","*.jsx" -Exclude "*.min.js" | ForEach-Object {
    Process-File $_
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  LIMPEZA CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Estatísticas finais
Write-Host "Estatísticas:" -ForegroundColor Cyan
Write-Host "  Arquivos processados: $totalFiles" -ForegroundColor Gray
Write-Host "  Console.logs removidos: $totalLogsRemoved" -ForegroundColor Gray
Write-Host "  Tamanho reduzido: $([math]::Round($totalSizeReduced / 1KB, 2)) KB" -ForegroundColor Gray
Write-Host ""

# Verificar se há arquivos específicos com muitos logs
Write-Host "Arquivos que podem precisar de revisão manual:" -ForegroundColor Yellow
Write-Host ""

$filesWithManyLogs = @(
    "src\config\supabase.js",
    "src\pages\NovoPedido.jsx",
    "src\pages\GerenciarGuindastes.jsx",
    "src\components\PDFGenerator.jsx"
)

foreach ($file in $filesWithManyLogs) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $errorLogs = ([regex]::Matches($content, "console\.error")).Count
        $warnLogs = ([regex]::Matches($content, "console\.warn")).Count
        
        if ($errorLogs -gt 0 -or $warnLogs -gt 0) {
            Write-Host "  $file" -ForegroundColor Gray
            Write-Host "    - console.error: $errorLogs (mantidos)" -ForegroundColor DarkGray
            Write-Host "    - console.warn: $warnLogs (mantidos)" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Revisar mudanças: git diff" -ForegroundColor Gray
Write-Host "  2. Testar aplicação: npm run dev" -ForegroundColor Gray
Write-Host "  3. Verificar funcionalidades críticas" -ForegroundColor Gray
Write-Host "  4. Commit: git commit -m 'Limpeza de código'" -ForegroundColor Gray
Write-Host ""

Write-Host "ATENÇÃO:" -ForegroundColor Red
Write-Host "  - Console.error e console.warn foram MANTIDOS" -ForegroundColor Gray
Write-Host "  - Comentários importantes foram MANTIDOS" -ForegroundColor Gray
Write-Host "  - Revise as mudanças antes de fazer commit!" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
