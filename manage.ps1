# --- CONFIG ---
$PROJECT_NAME = "automo-web"
$ENV_FILE     = ".env"
$CLIENT_DIR   = "client"
$WEB_CONTAINER_NAME = "automo_web_app"

# Find docker-compose or docker compose
$COMPOSE_CMD = if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) { "docker-compose" } else { "docker compose" }

# --- COLORS ---
function Write-Green  { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Red    { param($msg) Write-Host $msg -ForegroundColor Red }

# --- HELPERS ---

function Show-Help {
    Write-Yellow "============================================================================="
    Write-Green  "                       AUTOMO PIPELINE (FULL STACK)                          "
    Write-Yellow "============================================================================="
    Write-Host "  up          - Start Backend Services (Docker)"
    Write-Host "  dev         - Backend Hot-reload + Logs"
    Write-Host "  test-all    - Build, Start, Test, and Shutdown"
    Write-Host "  client      - Start frontend"
    Write-Host "  down        - Stop all containers"
    Write-Host "  flush-cache - Flush KeyDB cache"
    Write-Host "  clean       - Wipe everything (Node & Docker)"
    Write-Yellow "============================================================================="
}

function Invoke-Up {
    if (-not (Test-Path $ENV_FILE)) { Write-Red "Error: $ENV_FILE missing!"; exit 1 }
    Write-Yellow "Starting Backend Services..."
    & $COMPOSE_CMD up -d --build
    
    Write-Yellow "Waiting for Health Check..."
    for ($i=1; $i -le 15; $i++) {
        try {
            $res = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get -ErrorAction Stop
            if ($res.status -eq "alive") {
                Write-Green "`nBackend is Healthy!"
                return
            }
        } catch { }
        Write-Host "." -NoNewline; Start-Sleep -Seconds 2
    }
    Write-Red "`nHealth check timed out."
    exit 1
}

function Invoke-TestEnvCheck {
    Write-Yellow "Verifying environment readiness..."
    for ($i=1; $i -le 15; $i++) {
        try {
            $res = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Green "Server responding (HTTP 200)"
                return
            }
        } catch { }
        Write-Host "." -NoNewline; Start-Sleep -Seconds 2
    }
    Write-Red "`nServer timed out."
    exit 1
}

function Invoke-Test {
    Invoke-TestEnvCheck
    Write-Yellow "Running Integration Tests..."
    docker build -t automo-tester -f Dockerfile.test .
    
    # Dynamically detect network (mimicking the shell subquery in Makefile)
    $network = docker inspect $WEB_CONTAINER_NAME -f '{{.HostConfig.NetworkMode}}'
    
    docker run --network $network `
        --env-file $ENV_FILE `
        --name automo-tester-run `
        --rm `
        automo-tester
}

function Invoke-Dev {
    if (-not (Test-Path $ENV_FILE)) { Write-Red "Error: $ENV_FILE missing!"; exit 1 }
    Write-Yellow "Starting Dev Mode with Compose Watch (Backend)..."
    & $COMPOSE_CMD up -d ts-model-api
    $env:FLASK_ENV = "development"
    & $COMPOSE_CMD up --watch automo-web-app
}

function Invoke-Clean {
    Invoke-Down
    Write-Yellow "Deep cleaning project..."
    if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" }
    
    # Clean Python caches
    Get-ChildItem -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force
    
    & $COMPOSE_CMD down --rmi all --volumes --remove-orphans
    
    # Remove dangling volumes
    $dangling = docker volume ls -qf dangling=true
    if ($dangling) { docker volume rm $dangling }
    
    Write-Green "Workspace cleared."
}

function Invoke-Down {
    Write-Yellow "Stopping services..."
    & $COMPOSE_CMD down --remove-orphans
}

# --- DISPATCHER ---
if ($args.Count -eq 0) { Show-Help }
else {
    switch ($args[0]) {
        "up"          { Invoke-Up }
        "test"        { Invoke-Test }
        "test-all"    { Invoke-Up; Invoke-Test; Invoke-Down }
        "dev"         { Invoke-Dev }
        "client"      { Set-Location $CLIENT_DIR; npm run dev }
        "down"        { Invoke-Down }
        "flush-cache" { docker exec -it automo_cache keydb-cli FLUSHALL }
        "clean"       { Invoke-Clean }
        Default       { Show-Help }
    }
}
