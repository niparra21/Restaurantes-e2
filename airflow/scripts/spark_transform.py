from pyspark.sql import SparkSession
from pyspark.sql.functions import *

# 1. Inicia la sesión de Spark
spark = SparkSession.builder.appName("ETLTransform").getOrCreate()

# 2. Lee los archivos CSV generados por la extracción
df_orders = spark.read.csv("/opt/airflow/dags/data/orders.csv", header=True, inferSchema=True)
df_products = spark.read.csv("/opt/airflow/dags/data/products.csv", header=True, inferSchema=True)
df_reservations = spark.read.csv("/opt/airflow/dags/data/reservations.csv", header=True, inferSchema=True)

# 3. Ejemplo de transformación: top 5 productos por cantidad de órdenes
top_products = df_orders.join(df_products, df_orders.product_id == df_products.id) \
    .groupBy(df_products["name"], df_products["category"]) \
    .count() \
    .orderBy(desc("count")) \
    .limit(5)

# Guarda el resultado como CSV
top_products.write.csv("/opt/airflow/dags/data/top_products.csv", header=True, mode="overwrite")

# 4. Ejemplo: horas pico de reservaciones
peak_hours = df_reservations.withColumn("hour", hour("reservation_time")) \
    .groupBy("hour") \
    .count() \
    .orderBy(desc("count"))

peak_hours.write.csv("/opt/airflow/dags/data/peak_hours.csv", header=True, mode="overwrite")

# 5. Ejemplo: crecimiento mensual de órdenes por estado
monthly_orders = df_orders.withColumn("month", month("order_time")) \
    .groupBy("month") \
    .pivot("status", ["delivered", "cancelled"]) \
    .agg(count("*")) \
    .orderBy("month")

monthly_orders.write.csv("/opt/airflow/dags/data/monthly_orders.csv", header=True, mode="overwrite")

spark.stop()