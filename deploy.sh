#!/bin/bash
set -e

docker compose down
docker build -t pickleball:latest .
docker compose up -d
docker compose logs -f
