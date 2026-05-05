$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
$tmpDir = Join-Path $PSScriptRoot "tmp"
$frontendDir = Join-Path $PSScriptRoot "frontend"

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$frontendOut = Join-Path $tmpDir "frontend.log"
$frontendErr = Join-Path $tmpDir "frontend.err"

foreach ($port in @(8000, 5173)) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            if ($connection.OwningProcess) {
                Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
    }
}

Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-Command", "Set-Location '$PSScriptRoot'; python -m uvicorn app:app --host 127.0.0.1 --port 8000" `
    -WorkingDirectory $PSScriptRoot `
    -WindowStyle Hidden

Start-Process -FilePath $npmPath `
    -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173" `
    -WorkingDirectory $frontendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr

Write-Host "Backend starting on http://127.0.0.1:8000"
Write-Host "Frontend starting on http://127.0.0.1:5173"
Write-Host "Frontend logs: tmp\\frontend.log, tmp\\frontend.err"
