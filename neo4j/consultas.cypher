// Verificar repartidores:

MATCH (d:DeliveryPerson) 
RETURN d.id AS id, d.name AS nombre

// Verificar órdenes asignadas:

MATCH (d:DeliveryPerson)<-[:ASSIGNED_TO]-(o:Order)
RETURN d.id AS repartidor, o.id AS orden, o.status AS estado

// Verificar rutas completas:

MATCH (d:DeliveryPerson {id: 1})<-[:ASSIGNED_TO]-(o:Order)
MATCH (o)-[:FROM]->(r:Restaurant)-[:LOCATED_AT]->(rest_loc)
MATCH (o)<-[:PLACED]-(u:User)-[:LIVES_AT]->(user_loc)
RETURN d.name AS repartidor,
       o.id AS orden,
       r.name AS restaurante,
       rest_loc.address AS direccion_restaurante,
       u.username AS cliente,
       user_loc.address AS direccion_cliente