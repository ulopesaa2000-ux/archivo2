# start-tunnel.ps1
# Tunel SSH Persistente con reintentos automaticos
# Uso: .\start-tunnel.ps1
# Para detener: Ctrl+C

# --- Configuracion -------------------------------------------
$REMOTE_USER  = "root"
$REMOTE_HOST  = "148.230.84.233"
$REMOTE_PORT  = 22      # Puerto SSH del servidor
$LOCAL_PORT   = 8080    # Puerto local donde quedara disponible el MCP
$REMOTE_FPORT = 8000    # Puerto remoto al que apunta el tunel
$RETRY_WAIT   = 8       # Segundos entre reintentos
$MAX_RETRIES  = 0       # 0 = infinito
$SSH_KEY      = "$env:USERPROFILE\.ssh\id_mcp_supabase"  # Clave SSH (opcional)
$MCP_ENDPOINT = "http://localhost:$LOCAL_PORT/mcp"        # Endpoint a verificar
# -------------------------------------------------------------

Clear-Host
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  TUNEL SSH - Sistema Indumentaria   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Local MCP : $MCP_ENDPOINT" -ForegroundColor Green
Write-Host "  Remoto    : ${REMOTE_USER}@${REMOTE_HOST}:$REMOTE_FPORT" -ForegroundColor Green
Write-Host "  Presiona Ctrl+C para cerrar el tunel." -ForegroundColor Gray
Write-Host ""

# --- Verificar que ssh existe --------------------------------
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] No se encontro 'ssh'. Instala OpenSSH." -ForegroundColor Red
    exit 1
}

# --- Detectar metodo de autenticacion -----------------------
$useKeyAuth = Test-Path $SSH_KEY

if ($useKeyAuth) {
    Write-Host "  [AUTH] Clave SSH encontrada: $SSH_KEY" -ForegroundColor Green
    Write-Host "  [AUTH] Modo: autenticacion con clave (sin contrasena)" -ForegroundColor Gray
} else {
    Write-Host "  [AUTH] Clave SSH NO encontrada en: $SSH_KEY" -ForegroundColor Yellow
    Write-Host "  [AUTH] Modo: autenticacion con contrasena" -ForegroundColor Yellow
    Write-Host "  [INFO] Para crear una clave sin contrasena ejecuta:" -ForegroundColor Gray
    Write-Host "         ssh-keygen -t ed25519 -f $SSH_KEY -N ''" -ForegroundColor Gray
    Write-Host "         ssh-copy-id -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST}" -ForegroundColor Gray
}
Write-Host ""

# --- Funcion: verificar que el tunel MCP responde -----------
function Test-McpTunnel {
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "Accept"       = "application/json, text/event-stream"
        }
        $body = @{ jsonrpc = "2.0"; id = 1; method = "tools/list"; params = @{} } | ConvertTo-Json -Depth 3
        $r = Invoke-WebRequest -Uri $MCP_ENDPOINT -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 5
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

# --- Funcion: construir argumentos SSH ----------------------
function Get-SshArgs {
    $args = @(
        "-N",
        "-p", $REMOTE_PORT,
        "-L", "${LOCAL_PORT}:127.0.0.1:${REMOTE_FPORT}",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ServerAliveInterval=20",
        "-o", "ServerAliveCountMax=180",
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ConnectTimeout=15"
    )

    if ($useKeyAuth) {
        $args += "-i", $SSH_KEY
        $args += "-o", "PreferredAuthentications=publickey"
        $args += "-o", "PubkeyAuthentication=yes"
        $args += "-o", "PasswordAuthentication=no"
        $args += "-o", "BatchMode=yes"
    } else {
        # Con contrasena: permite tty para que SSH pida la contrasena interactivamente
        $args += "-o", "PreferredAuthentications=password,keyboard-interactive"
        $args += "-o", "PubkeyAuthentication=no"
        $args += "-o", "BatchMode=no"
    }

    $args += "${REMOTE_USER}@${REMOTE_HOST}"
    return $args
}

# --- Loop principal de reintentos ---------------------------
$attempt = 0

while ($true) {
    $attempt++
    $timestamp = Get-Date -Format "HH:mm:ss"

    Write-Host "[$timestamp] Conectando (intento $($attempt))..." -ForegroundColor Yellow

    $sshArgs = Get-SshArgs

    # Iniciar SSH en segundo plano para poder verificar el tunel
    if ($useKeyAuth) {
        # Sin contrasena: podemos verificar el tunel despues de iniciar
        $job = Start-Job -ScriptBlock {
            param($a) & ssh @a
        } -ArgumentList (, $sshArgs)

        # Esperar un momento para que SSH establezca la conexion
        Start-Sleep -Seconds 3

        # Verificar si el tunel MCP esta respondiendo
        $mcpOk = Test-McpTunnel

        if ($mcpOk) {
            $timestamp = Get-Date -Format "HH:mm:ss"
            Write-Host ""
            Write-Host "[$timestamp] Tunel establecido correctamente." -ForegroundColor Green
            Write-Host "  MCP disponible en: $MCP_ENDPOINT" -ForegroundColor Green
            Write-Host "  Manteniendo conexion activa... (Ctrl+C para cerrar)" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host "  [AVISO] El tunel tardo en responder, esperando..." -ForegroundColor Yellow
        }

        # Esperar a que el job termine (cuando SSH se desconecte)
        Wait-Job $job | Out-Null
        $jobResult = Receive-Job $job 2>&1
        if ($job.State -eq "Completed") { $exitCode = 0 } else { $exitCode = 1 }
        Remove-Job $job -Force

    } else {
        # Con contrasena: SSH debe correr de forma interactiva (en primer plano)
        Write-Host "  Ingresa la contrasena SSH cuando se solicite..." -ForegroundColor Cyan
        Write-Host ""
        & ssh @sshArgs
        $exitCode = $LASTEXITCODE

        # Despues de conectar exitosamente, verificar MCP
        if ($exitCode -eq 0) {
            $mcpOk = Test-McpTunnel
            if ($mcpOk) {
                Write-Host ""
                Write-Host "  MCP respondiendo en: $MCP_ENDPOINT" -ForegroundColor Green
            }
        }
    }

    $timestamp = Get-Date -Format "HH:mm:ss"

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "[$timestamp] Tunel cerrado correctamente." -ForegroundColor Cyan
        break
    }

    Write-Host ""
    Write-Host "[$timestamp] Tunel desconectado (codigo: $exitCode)." -ForegroundColor Red

    # Diagnostico segun el codigo de salida
    switch ($exitCode) {
        255 { Write-Host "  -> Fallo de conexion SSH (host inaccesible o credenciales incorrectas)." -ForegroundColor DarkRed }
        130 { Write-Host "  -> Sesion terminada por el usuario (Ctrl+C)." -ForegroundColor Gray; exit 0 }
        -1073741510 { Write-Host "  -> Sesion terminada por el usuario (Ctrl+C)." -ForegroundColor Gray; exit 0 }
        default { Write-Host "  -> Error inesperado. Codigo de salida: $exitCode" -ForegroundColor DarkRed }
    }

    # Verificar limite de reintentos
    if ($MAX_RETRIES -gt 0 -and $attempt -ge $MAX_RETRIES) {
        Write-Host "  Se alcanzo el limite de $MAX_RETRIES reintentos." -ForegroundColor Red
        break
    }

    Write-Host "  Reintentando en $RETRY_WAIT segundos... (Ctrl+C para cancelar)" -ForegroundColor Yellow
    Start-Sleep -Seconds $RETRY_WAIT
    Write-Host ""
}

Write-Host ""
Write-Host "Tunel SSH finalizado." -ForegroundColor Cyan
