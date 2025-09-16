SHELL := /bin/sh
.PHONY: dev build start stop restart logs ps clean install app-dev app-build app-start

DC := docker compose
DEV_FILE := docker-compose.dev.yml
PROD_FILE := docker-compose.yml

# Dev: run dashboard + converter with hot-reload
dev:
	$(DC) -f $(DEV_FILE) up --build

# Build production images
build:
	$(DC) -f $(PROD_FILE) build

# Start production stack (detached)
start:
	$(DC) -f $(PROD_FILE) up -d

stop:
	$(DC) -f $(PROD_FILE) down

restart:
	$(MAKE) stop && $(MAKE) start

logs:
	$(DC) -f $(PROD_FILE) logs -f

ps:
	$(DC) -f $(PROD_FILE) ps

clean:
	$(DC) -f $(PROD_FILE) down -v || true
	$(DC) -f $(DEV_FILE) down -v || true

# Optional: run app locally without Docker
install:
	pnpm install

app-dev:
	pnpm dev

app-build:
	pnpm build

app-start:
	pnpm start


