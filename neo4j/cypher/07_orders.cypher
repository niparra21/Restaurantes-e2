LOAD CSV WITH HEADERS FROM 'file:///csv_exports/orders.csv' AS row
MERGE (o:Order {id: toInteger(row.id)})
SET o.status = row.status,
    o.total_price = toFloat(row.total_price),
    o.created_at = row.created_at,
    o.updated_at = row.updated_at;

// Relación con usuario y restaurante
WITH row
MATCH (o:Order {id: toInteger(row.id)})
MATCH (u:User {id: toInteger(row.user_id)})
MATCH (r:Restaurant {id: toInteger(row.restaurant_id)})
MERGE (u)-[:PLACED]->(o)
MERGE (o)-[:FROM]->(r);
