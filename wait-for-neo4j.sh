#!/bin/bash

echo "⏳ Esperando que Neo4j esté listo..."

HOST=${NEO4J_HOST:-neo4j}
PORT=${NEO4J_PORT:-7687}

until nc -z "$HOST" "$PORT"; do
  echo "⏱️ Esperando a $HOST:$PORT..."
  sleep 2
done

echo "✅ Neo4j está disponible en $HOST:$PORT"
echo "🚀 Ejecutando carga en Python..."

cd /app/neo4j
python3 carga_grafos.py
