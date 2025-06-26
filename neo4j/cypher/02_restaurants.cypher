LOAD CSV WITH HEADERS FROM 'file:///csv_exports/restaurants.csv' AS row
MERGE (r:Restaurant {id: toInteger(row.id)})
SET r.name = row.name,
    r.location = row.location,
    r.created_at = row.created_at,
    r.updated_at = row.updated_at;
