from pyspark.sql import SparkSession
from pyspark.sql.functions import *
import os

db_url = os.getenv("SPARK_POSTGRES_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")

# 2. start Spark session with PostgreSQL JDBC driver
spark = SparkSession.builder \
    .appName("RestaurantAnalysis") \
    .config("spark.jars", "/opt/spark/jars/postgresql-42.7.3.jar") \
    .getOrCreate()

# 3. read tables from PostgreSQL database
def read_table(table_name):
    return spark.read \
        .format("jdbc") \
        .option("url", f"jdbc:postgresql://{db_url}:{db_port}/{db_name}") \
        .option("dbtable", table_name) \
        .option("user", db_user) \
        .option("password", db_password) \
        .load()

df_orders = read_table("orders")
df_products = read_table("products")
df_reservations = read_table("reservations")

# 4. perform some basic analyses on the data
# analysis 1: top 5 products by order count
top_products = df_orders.join(df_products, df_orders.menu_id == df_products.id) \
    .groupBy(df_products["name"], df_products["category"]) \
    .count() \
    .orderBy(desc("count")) \
    .limit(5)
top_products.show()

# analysis 2: peak reservation hours
peak_hours = df_reservations.withColumn("hour", hour("reservation_time")) \
    .groupBy("hour") \
    .count() \
    .orderBy(desc("count"))
peak_hours.show()

# analysis 3: monthly order growth (completed vs cancelled)
monthly_orders = df_orders.withColumn("month", month("order_time")) \
    .groupBy("month") \
    .pivot("status", ["completed", "cancelled"]) \
    .agg(count("*")) \
    .orderBy("month")
monthly_orders.show()