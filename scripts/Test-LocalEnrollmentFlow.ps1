[CmdletBinding()]
param(
    [string]$FrontendUrl = 'http://localhost:4200',
    [string]$ApiProjectPath = '',
    [string]$AdminEmail = '',
    [switch]$Headed
)
$ErrorActionPreference = 'Stop'
if (-not $ApiProjectPath) { $ApiProjectPath = Join-Path $PSScriptRoot '..\..\PIM4API' }
$target = [Uri]$FrontendUrl
if (-not $target.IsAbsoluteUri -or -not $target.IsLoopback -or
    $target.Scheme -notin @('http', 'https') -or $target.AbsolutePath -ne '/' -or
    $target.UserInfo -or $target.Query -or $target.Fragment) {
    throw 'O teste confirma pagamentos ficticios e aceita somente um frontend local.'
}
$frontRoot = Split-Path $PSScriptRoot -Parent
$cli = Join-Path $frontRoot 'node_modules\@playwright\test\cli.js'
if (-not (Test-Path -LiteralPath $cli)) { throw 'Execute npm install no PIM4Front primeiro.' }
$envFile = Join-Path $ApiProjectPath '.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw 'Nao foi encontrado o .env local do PIM4API. Informe -ApiProjectPath.' }
$line = [IO.File]::ReadAllLines($envFile) |
    Where-Object { $_ -match '^\s*Payments__WebhookSecret\s*=' } | Select-Object -Last 1
if (-not $line) { throw 'Payments__WebhookSecret nao esta configurado no .env local.' }
$secret = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
if ([string]::IsNullOrWhiteSpace($secret)) { throw 'A chave local do webhook esta vazia.' }

Invoke-WebRequest -Uri ($FrontendUrl.TrimEnd('/') + '/login') -UseBasicParsing -TimeoutSec 15 | Out-Null
if (-not $AdminEmail) { $AdminEmail = $env:PIM4_E2E_ADMIN_EMAIL }
if (-not $AdminEmail) { $AdminEmail = Read-Host 'Email do administrador LOCAL' }
if (-not $AdminEmail) { throw 'Informe um administrador local.' }
$password = $env:PIM4_E2E_ADMIN_PASSWORD
if (-not $password) {
    $secure = Read-Host 'Senha do administrador LOCAL (nao sera exibida)' -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential($AdminEmail, $secure)
    $password = $credential.GetNetworkCredential().Password
}
if (-not $password) { throw 'Informe a senha do administrador local.' }

$names = @('PIM4_E2E_FRONTEND_URL', 'PIM4_E2E_ADMIN_EMAIL', 'PIM4_E2E_ADMIN_PASSWORD', 'PIM4_E2E_WEBHOOK_SECRET')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:PIM4_E2E_FRONTEND_URL = $FrontendUrl.TrimEnd('/')
    $env:PIM4_E2E_ADMIN_EMAIL = $AdminEmail
    $env:PIM4_E2E_ADMIN_PASSWORD = $password
    $env:PIM4_E2E_WEBHOOK_SECRET = $secret
    Write-Host 'Teste LOCAL: cria curso, turma, aluno e pedido ficticios; confirma sem movimentar dinheiro.'
    Write-Host 'O curso sera arquivado ao finalizar. Historico do pedido e matricula de teste sera preservado.'
    Push-Location $frontRoot
    try {
        $arguments = @($cli, 'test', '--config=playwright.config.ts')
        if ($Headed) { $arguments += '--headed' }
        & node @arguments
        $result = $LASTEXITCODE
    }
    finally { Pop-Location }
}
finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    $password = $null
    $secret = $null
    $credential = $null
}
Write-Host 'Relatorio: npm run test:e2e:report'
exit $result
