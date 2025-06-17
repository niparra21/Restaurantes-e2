CREATE VIEW IF NOT EXISTS cubo_ventas_tiempo AS
SELECT 
  d.year,
  d.month,
  d.day,
  SUM(f.price * f.quantity) AS total_ventas
FROM fact_orders f
JOIN dim_date d ON f.order_date = d.date_key
GROUP BY d.year, d.month, d.day;

CREATE VIEW IF NOT EXISTS cubo_ventas_por_ciudad AS
SELECT 
  r.city,
  SUM(f.price * f.quantity) AS total_ventas
FROM fact_orders f
JOIN dim_restaurant r ON f.restaurant_id = r.restaurant_id
GROUP BY r.city;

CREATE VIEW IF NOT EXISTS cubo_frecuencia_productos AS
SELECT 
  p.name AS producto,
  SUM(f.quantity) AS total_vendidos
FROM fact_orders f
JOIN dim_product p ON f.product_id = p.product_id
GROUP BY p.name
ORDER BY total_vendidos DESC;

CREATE VIEW IF NOT EXISTS cubo_ventas_por_categoria AS
SELECT 
  p.category,
  SUM(f.price * f.quantity) AS total_ventas
FROM fact_orders f
JOIN dim_product p ON f.product_id = p.product_id
GROUP BY p.category;

CREATE VIEW IF NOT EXISTS cubo_pedidos_por_hora AS
SELECT 
  t.hour,
  COUNT(f.order_id) AS total_pedidos
FROM fact_orders f
JOIN dim_time t ON f.order_time = t.time_key
GROUP BY t.hour
ORDER BY t.hour;
