.PHONY: dev dev-bg seed reset logs logs-backend build stop build-frontend install test-backend health

dev:
	docker-compose up --build

dev-bg:
	docker-compose up --build -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

seed:
	docker-compose exec backend python data/seed_data.py

reset:
	docker-compose exec backend python -c "from app.utils.db import reset_db; reset_db()"
	docker-compose exec backend python data/seed_data.py

build-frontend:
	cd frontend && npm run build

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test-backend:
	cd backend && pytest tests/ -v

health:
	curl -s http://localhost:8000/api/health | python -m json.tool
