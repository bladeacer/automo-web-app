# --- COLORS ---
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RED    := $(shell tput -Txterm setaf 1)
RESET  := $(shell tput -Txterm sgr0)

# --- CONFIG ---
PROJECT_NAME = automo-web
ENV_FILE     = .env
COMPOSE_CMD  = $(shell which docker-compose 2>/dev/null || echo "docker compose")
WEB_CONTAINER_NAME = automo_web_app
CLIENT_DIR = client
GOAT_DB_PATH = ./goatcounter-data/goatcounter.sqlite
SERVICE_NAME = inference-api

.PHONY: help up dev down clean test test-env-check test-all client flush-cache check-gpu monitor

help:
	@echo "$(YELLOW)============================================================================= $(RESET)"
	@echo "$(GREEN)                        AUTOMO PIPELINE (FULL STACK)                         $(RESET)"
	@echo "$(YELLOW)============================================================================= $(RESET)"
	@echo "  $(GREEN)up$(RESET)          - Start Backend Services (Docker)"
	@echo "  $(GREEN)dev$(RESET)         - Backend Hot-reload + Logs"
	@echo "  $(GREEN)test-all$(RESET)    - Build, Start, Test, and Shutdown"
	@echo "  $(GREEN)client$(RESET)      - Start frontend"
	@echo "  $(GREEN)down$(RESET)        - Stop all containers"
	@echo "  $(GREEN)clean$(RESET)       - Wipe everything (Node & Docker)"
	@echo "  $(GREEN)flush-cache$(RESET) - Flush KeyDB cache"
	@echo "  $(GREEN)check-gpu$(RESET)   - Sanity check GPU usage in container"
	@echo "  $(GREEN)rebuild$(RESET)     - Remove Inference API, web app and restarts dev"
	@echo "$(YELLOW)============================================================================= $(RESET)"

test-env-check:
	@echo "$(YELLOW)Verifying environment readiness...$(RESET)"
	@for i in {1..15}; do \
		STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "000"); \
		if [ "$$STATUS" = "200" ]; then \
			echo "$(GREEN)Server responding (HTTP 200)$(RESET)"; \
			exit 0; \
		fi; \
		echo -n "."; sleep 2; \
	done; \
	echo "\n$(RED)Server timed out ($$STATUS)$(RESET)"; exit 1

test: test-env-check
	@echo "$(YELLOW)Running Integration Tests...$(RESET)"
	@docker build -t automo-tester -f Dockerfile.test .
	@docker run --network $(shell docker inspect $(WEB_CONTAINER_NAME) -f '{{.HostConfig.NetworkMode}}') \
		--env-file .env \
		--name automo-tester-run \
		--rm \
		automo-tester

test-all: up test down

.ensure-stats:
	@echo "$(YELLOW)Ensuring GoatCounter is initialized...$(RESET)"
	$(COMPOSE_CMD) up -d goatcounter
	@echo "$(YELLOW)Waiting for container to stabilize...$(RESET)"
	@sleep 5
	@if [ -f $(GOAT_DB_PATH) ]; then \
		echo "$(RED)Warning: DB already exists at $(GOAT_DB_PATH)$(RESET)"; \
		read -p "Do you want to override it and re-initialize? [y/N] " ans; \
		if [ "$$ans" != "y" ] && [ "$$ans" != "Y" ]; then \
			echo "$(BLUE)Skipping DB initialization.$(RESET)"; \
			exit 0; \
		fi; \
		echo "$(YELLOW)Proceeding with re-initialization...$(RESET)"; \
	fi; \
	echo "$(YELLOW)Initializing DB inside running container...$(RESET)"; \
	docker exec automo_analytics goatcounter db create site \
		-createdb \
		-db "sqlite+ /db/goatcounter.sqlite" \
		-vhost "stats.automo.local" \
		-user.email admin@example.com \
		-password admin123 || true

up: .ensure-stats
	@echo "$(YELLOW)Starting all services...$(RESET)"
	$(COMPOSE_CMD) up -d $(SERVICE_NAME)
	$(COMPOSE_CMD) up -d --build

dev: .ensure-stats
	@if [ ! -f $(ENV_FILE) ]; then echo "$(RED)Error: $(ENV_FILE) missing!$(RESET)"; exit 1; fi
	@echo "$(YELLOW)Starting Dev Mode with Compose Watch (Backend)...$(RESET)"
	$(COMPOSE_CMD) up -d $(SERVICE_NAME)
	FLASK_ENV=development $(COMPOSE_CMD) up --watch

client:
	@echo "Starting Mantine frontend..."
	cd $(CLIENT_DIR) && npm run dev

down:
	@echo "$(YELLOW)Stopping services...$(RESET)"
	$(COMPOSE_CMD) down --remove-orphans
	docker stop $(docker ps -aq)
	docker volume rm $$(docker volume ls -qf dangling=true)

flush-cache:
	docker exec -it automo_cache keydb-cli FLUSHALL

clean:
	@echo "$(YELLOW)Deep cleaning project...$(RESET)"
	rm -rf package-lock.json
	find . -type d -name "__pycache__" -exec sudo rm -rf {} +
	@if [ -n "$$(docker ps -aq)" ]; then \
		echo "$(YELLOW)Stopping and removing containers...$(RESET)"; \
		docker stop $$(docker ps -aq); \
		docker rm $$(docker ps -aq); \
	else \
		echo "$(BLUE)No containers to clean.$(RESET)"; \
	fi
	docker volume prune -a -f
	docker builder prune -a -f
	docker system prune -a -f
	docker image prune -a -f
	@echo "$(GREEN)Workspace cleared.$(RESET)"

check-gpu:
	@echo "--- Ensuring $(SERVICE_NAME) is up ---"
	@# 'up -d' is idempotent; it won't restart if already running
	@docker compose up -d $(SERVICE_NAME)
	
	@echo "--- Waiting for file sync ---"
	@# Wait a second to ensure volume mounts are linked by the kernel
	@sleep 2 
	
	@echo "--- Executing Sanity Check ---"
	@# Use exec because it's already running and has the GPU locked
	@docker compose exec $(SERVICE_NAME) python3 sanity_check.py || (echo "❌ Check failed!"; docker compose stop $(SERVICE_NAME); exit 1)
	
	@echo "--- Check Complete. Releasing GPU VRAM... ---"
	@docker compose stop $(SERVICE_NAME)
	@echo "Done."

# Watch VRAM usage in a separate terminal
monitor:
	watch -n 0.5 nvidia-smi

rebuild: 
	docker image rmi automo-automo-web-app:latest

structure:
	eza --icons=always --git-ignore --tree > project_structure.txt
