dev:
	docker compose -f infrastructure/compose-dev.yaml watch

test-e2e:
	cd e2e && ./run-e2e.sh