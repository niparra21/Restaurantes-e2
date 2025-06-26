// Los 5 productos más comprados juntos

MATCH (o:Order)<-[:PLACED]-(u:User),
      (o)-[:CONTAINS]->(p1:Product),
      (o)-[:CONTAINS]->(p2:Product)
WHERE id(p1) < id(p2)
RETURN p1.name AS Producto1, p2.name AS Producto2, COUNT(*) AS VecesJuntos
ORDER BY VecesJuntos DESC
LIMIT 5;

// Usuarios que recomiendan a otros

MATCH (u1:User)-[:PLACED]->(:Order)-[:CONTAINS]->(p:Product)<-[:CONTAINS]-(:Order)<-[:PLACED]-(u2:User)
WHERE u1 <> u2
WITH u1, u2, COUNT(DISTINCT p) AS productos_en_comun
WHERE productos_en_comun > 2
MERGE (u1)-[:RECOMMENDED]->(u2);

// Caminos mínimos entre ubicaciones para reparto eficiente

MATCH (origen:Restaurant {id: 3}), (destino:Restaurant {id: 12})
CALL gds.shortestPath.dijkstra.stream({
  sourceNode: origen,
  targetNode: destino,
  relationshipWeightProperty: 'duration',
  nodeProjection: 'Restaurant',
  relationshipProjection: {
    route: {
      type: 'DELIVERY_ROUTE',
      properties: 'duration',
      orientation: 'UNDIRECTED'
    }
  }
})
YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
RETURN totalCost, 
       [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS Ruta,
       costs;
