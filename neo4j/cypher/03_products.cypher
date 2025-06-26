LOAD CSV WITH HEADERS FROM 'file:///csv_exports/products.csv' AS row
MERGE (p:Product {id: toInteger(row.id)})
SET p.name = row.name,
    p.description = row.description,
    p.price = toFloat(row.price),
    p.category = row.category,
    p.is_active = row.is_active = 'true',
    p.created_at = row.created_at,
    p.updated_at = row.updated_at;

// Relación con restaurante
WITH row
MATCH (p:Product {id: toInteger(row.id)})
MATCH (r:Restaurant {id: toInteger(row.restaurant_id)})
MERGE (r)-[:OFFERS]->(p);
