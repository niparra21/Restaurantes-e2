LOAD CSV WITH HEADERS FROM 'file:///csv_exports/reservations.csv' AS row
MERGE (res:Reservation {id: toInteger(row.id)})
SET res.date = row.date,
    res.time = row.time,
    res.num_people = toInteger(row.num_people),
    res.status = row.status,
    res.created_at = row.created_at,
    res.updated_at = row.updated_at;

// Relación con usuario y restaurante
WITH row
MATCH (res:Reservation {id: toInteger(row.id)})
MATCH (u:User {id: toInteger(row.user_id)})
MATCH (r:Restaurant {id: toInteger(row.restaurant_id)})
MERGE (u)-[:MADE]->(res)
MERGE (res)-[:FOR]->(r);