CREATE EXTERNAL TABLE IF NOT EXISTS dim_user (
  user_id INT,
  username STRING,
  email STRING
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_user';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_restaurant (
  restaurant_id INT,
  name STRING,
  address STRING,
  phone STRING,
  city STRING
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_restaurant';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_product (
  product_id INT,
  name STRING,
  category STRING,
  is_active BOOLEAN
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_product';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_menu (
  menu_id INT,
  name STRING,
  description STRING
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_menu';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_date (
  date_key INT,
  year INT,
  month INT,
  day INT,
  weekday STRING,
  quarter INT
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_date';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_time (
  time_key INT,
  hour INT,
  minute INT
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_time';

CREATE EXTERNAL TABLE IF NOT EXISTS dim_status (
  status STRING,
  description STRING
)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/dim_status';

-- Hechos

CREATE EXTERNAL TABLE IF NOT EXISTS fact_orders (
  fact_order_id BIGINT,
  order_id INT,
  user_id INT,
  restaurant_id INT,
  menu_id INT,
  product_id INT,
  quantity INT,
  order_time INT,
  status STRING,
  price DECIMAL(10,2)
)
PARTITIONED BY (order_date INT)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/fact_orders';

CREATE EXTERNAL TABLE IF NOT EXISTS fact_reservations (
  fact_reservation_id BIGINT,
  reservation_id INT,
  user_id INT,
  restaurant_id INT,
  reservation_time INT
)
PARTITIONED BY (reservation_date INT)
STORED AS PARQUET
LOCATION '/opt/airflow/dags/data/transformed/fact_reservations';