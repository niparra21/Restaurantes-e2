LOAD CSV WITH HEADERS FROM 'file:///csv_exports/menu_items.csv' AS row
MATCH (m:Menu {id: toInteger(row.menu_id)})
MATCH (p:Product {id: toInteger(row.product_id)})
MERGE (m)-[:INCLUDES {quantity: toInteger(row.quantity)}]->(p);
