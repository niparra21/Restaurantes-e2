// productos co comprados

MATCH (o:Order)-[:CONTAINS]->(p1:Product)
MATCH (o)-[:CONTAINS]->(p2:Product)
WHERE p1.id < p2.id
RETURN p1.name AS Producto1, p2.name AS Producto2, COUNT(*) AS VecesCompradosJuntos
ORDER BY VecesCompradosJuntos DESC
LIMIT 5

// usuarios recomiendan a otros

MATCH (u1:User)-[:RECOMMENDS]->(u2:User)
RETURN u1.username AS Recomienda, u2.username AS Recomendado
ORDER BY u1.username

// Verificar repartidores:

MATCH (d:DeliveryPerson) 
RETURN d.id AS id, d.name AS nombre

// Verificar órdenes asignadas:

MATCH (d:DeliveryPerson)<-[:ASSIGNED_TO]-(o:Order)
RETURN d.id AS repartidor, o.id AS orden, o.status AS estado

// grafos

MATCH path = (d:DeliveryPerson)<-[:ASSIGNED_TO]-(o:Order)-[:FROM]->(r:Restaurant)
MATCH (o)<-[:PLACED]-(u:User)
MATCH (r)-[:LOCATED_AT]->(rl)
MATCH (u)-[:LIVES_AT]->(ul)
RETURN d, o, r, rl, u, ul, path


// ordenes con distancia

MATCH (d:DeliveryPerson)<-[:ASSIGNED_TO]-(o:Order)
MATCH (o)-[:FROM]->(r:Restaurant)-[:LOCATED_AT]->(rl:Location)
MATCH (o)<-[:PLACED]-(u:User)-[:LIVES_AT]->(ul:Location)
RETURN d.id AS repartidor_id,
       d.name AS repartidor,
       r.name AS restaurante,
       rl.address AS direccion_restaurante,
       u.username AS cliente,
       ul.address AS direccion_cliente,
       o.id AS orden_id,
       point.distance(
           point({x: rl.x, y: rl.y}),
           point({x: ul.x, y: ul.y})
       ) AS distancia_directa
ORDER BY repartidor_id, orden_id

// entregas ordenadas

MATCH (d:DeliveryPerson)<-[:ASSIGNED_TO]-(o:Order)-[:FROM]->(r:Restaurant)-[:LOCATED_AT]->(rest_loc)
MATCH (o)<-[:PLACED]-(u:User)-[:LIVES_AT]->(user_loc)
WITH d, r, rest_loc, o, 
     point.distance(point(rest_loc), point(user_loc)) AS distancia
ORDER BY d.id, distancia
WITH d, r, rest_loc, 
     COLLECT(o.id) AS ordenes_ids,
     COUNT(o) AS total_entregas
RETURN d.id AS repartidor,
       r.id AS restaurante_id,
       rest_loc.address AS direccion_restaurante,
       ordenes_ids AS entregas_ordenadas,
       total_entregas
ORDER BY repartidor