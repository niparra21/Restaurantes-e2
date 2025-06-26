LOAD CSV WITH HEADERS FROM 'file:///csv_exports/order_revenue.csv' AS row
MATCH (o:Order {id: toInteger(row.order_id)})
SET o.revenue = toFloat(row.revenue);
