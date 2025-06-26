LOAD CSV WITH HEADERS FROM 'file:///csv_exports/users.csv' AS row
MERGE (u:User {id: toInteger(row.id)})
SET u.name = row.name,
    u.email = row.email,
    u.created_at = row.created_at,
    u.updated_at = row.updated_at;
