.PHONY: help install dev test seed migrate lint docker-up docker-down

help:
	@echo "Realtouch Financial ERP — Dev Commands"
	@echo ""
	@echo "  make install      Install all dependencies"
	@echo "  make dev          Start backend + frontend (dev mode)"
	@echo "  make test         Run full test suite"
	@echo "  make seed         Seed database with Harvest Touch data"
	@echo "  make migrate      Run Alembic migrations"
	@echo "  make docker-up    Start all services via Docker Compose"
	@echo "  make docker-down  Stop all Docker services"
	@echo "  make lint         Run linting checks"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	@echo "Starting backend + frontend in parallel..."
	@trap 'kill 0' EXIT; \
		(cd backend && uvicorn backend.main:app --reload --port 8000) & \
		(cd frontend && npm run dev) & \
		wait

test:
	cd backend && pytest backend/tests/ -v

seed:
	python -m database.seeds.seed_harvest_touch

migrate:
	alembic upgrade head

migrate-generate:
	alembic revision --autogenerate -m "$(MSG)"

docker-up:
	docker-compose -f infrastructure/docker/docker-compose.yml up -d
	@echo "Services starting..."
	@echo "  Frontend:  http://localhost:3000"
	@echo "  API:       http://localhost:8000"
	@echo "  API Docs:  http://localhost:8000/docs"

docker-down:
	docker-compose -f infrastructure/docker/docker-compose.yml down

docker-logs:
	docker-compose -f infrastructure/docker/docker-compose.yml logs -f backend

lint:
	cd backend && python -m flake8 . --max-line-length=120 --exclude=venv,.venv 2>/dev/null || true
	cd frontend && npx tsc --noEmit 2>/dev/null || true

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name "test.db" -delete 2>/dev/null || true
