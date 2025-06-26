LOAD CSV WITH HEADERS FROM 'file:///csv_exports/menus.csv' AS row
MERGE (m:Menu {id: toInteger(row.id)})
SET m.name = row.name,
    m.created_at = row.created_at,
    m.updated_at = row.updated_at;

// Relación con restaurante
WITH row
MATCH (m:Menu {id: toInteger(row.id)})
MATCH (r:Restaurant {id: toInteger(row.restaurant_id)})
MERGE (r)-[:HAS_MENU]->(m);