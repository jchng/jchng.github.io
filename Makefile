SERVICE := housewarming_backend

.PHONY: shell sh manage up down logs

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
