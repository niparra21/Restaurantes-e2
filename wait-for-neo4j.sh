#!/bin/bash

echo "Esperando a que Neo4j esté disponible en $NEO4J_HOST:$NEO4J_PORT..."

# Esperar hasta que la conexión TCP sea exitosa
while ! timeout 1 bash -c "</dev/tcp/$NEO4J_HOST/$NEO4J_PORT" 2>/dev/null; do
  sleep 1
done

echo "Neo4j está listo. Ejecutando script Python..."
python neo4j/load_graph.py