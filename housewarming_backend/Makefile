SERVICE := housewarming_backend

.PHONY: shell sh manage up down logs prod-up prod-down prod-logs prod-check

shell:
	docker compose exec $(SERVICE) bash

sh:
	docker compose exec $(SERVICE) sh

manage:
	docker compose exec $(SERVICE) python manage.py $(args)

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f $(SERVICE)

prod-up:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f $(SERVICE)

prod-check:
	docker compose -f docker-compose.prod.yml exec $(SERVICE) python manage.py check --deploy
