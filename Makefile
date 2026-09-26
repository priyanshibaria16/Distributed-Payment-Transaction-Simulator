.PHONY: help up down restart build logs test-go test-java clean seed

help:
	@echo "Distributed Payment Transaction Simulator - Commands"
	@echo "  make up          - Start all containers via Docker Compose"
	@echo "  make down        - Stop all containers and clean volumes"
	@echo "  make restart     - Restart all services"
	@echo "  make build       - Rebuild all container images"
	@echo "  make logs        - Tail logs from all containers"
	@echo "  make test-go     - Run Go Gateway unit and integration tests"
	@echo "  make test-java   - Run Java JUnit 5 tests"
	@echo "  make seed        - Re-apply database seed records"

up:
	docker compose up -d

down:
	docker compose down -v

restart:
	docker compose restart

build:
	docker compose build

logs:
	docker compose logs -f

test-go:
	cd gateway-go && go test -v -race ./...

test-java:
	cd java-services && mvn clean test

seed:
	docker compose exec -T postgres psql -U simulator_user -d payment_simulator -f /docker-entrypoint-initdb.d/02_seed.sql
