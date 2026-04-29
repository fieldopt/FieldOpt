# FieldOpt — Docker shortcuts.
#
# Quick commands:
#   make up      — start stack (no demo). Browse http://localhost:8080
#   make demo    — start stack with simulation engine enabled
#   make down    — stop containers (DB volume kept)
#   make clean   — stop + wipe DB volume (fresh seed next run)
#   make logs    — tail app logs
#   make ps      — list running containers
#   make rebuild — force rebuild image (e.g. after dep change)

COMPOSE := docker compose -p fieldopt

.PHONY: up demo down clean logs ps rebuild

up:
	$(COMPOSE) up --build --remove-orphans

demo:
	IS_DEMO=true $(COMPOSE) up --build --remove-orphans

down:
	$(COMPOSE) down --remove-orphans

clean:
	$(COMPOSE) down -v --remove-orphans

logs:
	$(COMPOSE) logs -f app

ps:
	$(COMPOSE) ps

rebuild:
	$(COMPOSE) build --no-cache app
