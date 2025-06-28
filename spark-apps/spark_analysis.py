'''
 Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 I Semestre - 2025
'''

# SPARK TRANSFORMATIONS

# ==================================================================================================

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, desc, hour, sum, avg
import os
import argparse
from pyspark.sql.functions import monotonically_increasing_id, to_date, date_format, date_format, lpad
from pyspark.sql.functions import col, year, month, dayofmonth, date_format, quarter
from pyspark.sql.types import IntegerType
from datetime import datetime, timedelta
from pyspark.sql import Row
from pyspark.sql.types import DecimalType
from pyspark.sql.window import Window
from pyspark.sql.functions import lag

def init_spark():
    """Initializes a Spark session optimized for Airflow"""
    return SparkSession.builder \
        .appName("RestaurantETL") \
        .config("spark.master", "spark://spark-master:7077") \
        .config("spark.sql.shuffle.partitions", "4") \
        .getOrCreate()

# -------------------------------------------------------------------------------

def analyze_top_products(spark, input_dir, output_dir):
    """ Analyses the top 5 best-selling products (only delivered orders).
        Saves results in Parquet format."""
    # a. read CSV files
    orders = spark.read.csv(f"{input_dir}/orders.csv", header=True, inferSchema=True)
    products = spark.read.csv(f"{input_dir}/products.csv", header=True, inferSchema=True)

    # b. filter only delivered orders and join with products
    top_products = orders.filter(col("status") == "delivered") \
        .join(products, "product_id") \
        .groupBy("name", "category") \
        .agg(
            count("*").alias("total_orders"),
            sum("quantity").alias("total_items"),
            avg("price").alias("avg_price")
        ) \
        .orderBy(desc("total_orders")) \
        .limit(5)
    
    # c. save results in Parquet format
    top_products.write.mode("overwrite") \
        .parquet(f"{output_dir}/top_products")
    
# -------------------------------------------------------------------------------

def analyze_peak_hours(spark, input_dir, output_dir):
    """Identifies peak hours for orders."""
    orders = spark.read.csv(f"{input_dir}/orders.csv", header=True, inferSchema=True)
    
    peak_hours = orders.withColumn("hour", hour(col("order_time"))) \
        .groupBy("hour") \
        .agg(count("*").alias("order_count")) \
        .orderBy(desc("order_count"))
    
    peak_hours.write.mode("overwrite") \
        .parquet(f"{output_dir}/peak_hours")
    
def analyze_monthly_growth(spark, input_dir, output_dir):
    """Analyzes monthly growth trends in orders (both count and revenue).
       Saves results in Parquet format."""
    
    # Read orders data
    orders = spark.read.csv(f"{input_dir}/orders.csv", header=True, inferSchema=True)
    
    # Create window specification for growth calculations
    window_spec = Window.orderBy("order_month")
    
    # Calculate monthly metrics
    monthly_growth = orders.withColumn("order_month", date_format(col("order_time"), "yyyy-MM")) \
        .groupBy("order_month") \
        .agg(
            count("*").alias("total_orders"),
            sum("quantity").alias("total_items"),
            sum(col("price") * col("quantity")).alias("total_revenue")
        ) \
        .orderBy("order_month") \
        .withColumn("order_count_growth", 
                   (col("total_orders") - lag("total_orders", 1).over(window_spec))) \
        .withColumn("revenue_growth", 
                   (col("total_revenue") - lag("total_revenue", 1).over(window_spec))) \
        .withColumn("order_count_growth_pct", 
                   (col("order_count_growth") / lag("total_orders", 1).over(window_spec)) * 100) \
        .withColumn("revenue_growth_pct", 
                   (col("revenue_growth") / lag("total_revenue", 1).over(window_spec)) * 100)
    
    # Save results
    monthly_growth.write.mode("overwrite") \
        .parquet(f"{output_dir}/monthly_growth")

# -------------------------------------------------------------------------------
def transform_dim_user(spark, input_dir, output_dir):
    """Transforma users.csv al formato de dim_user para Hive."""
    users = spark.read.csv(f"{input_dir}/users.csv", header=True, inferSchema=True)
    # Opcional: selecciona y ordena columnas por si acaso
    dim_user = users.select("user_id", "username", "email")
    dim_user.write.mode("overwrite").parquet(f"{output_dir}/dim_user")

# -------------------------------------------------------------------------------
def transform_dim_restaurant(spark, input_dir, output_dir):
    """Transforma restaurants.csv al formato de dim_restaurant para Hive."""
    restaurants = spark.read.csv(f"{input_dir}/restaurants.csv", header=True, inferSchema=True)
    dim_restaurant = restaurants.select(
        "restaurant_id", "name", "address", "phone", "city"
    )
    dim_restaurant.write.mode("overwrite").parquet(f"{output_dir}/dim_restaurant")

# -------------------------------------------------------------------------------
def transform_dim_product(spark, input_dir, output_dir):
    """Transforma products.csv al formato de dim_product para Hive."""
    products = spark.read.csv(f"{input_dir}/products.csv", header=True, inferSchema=True)
    dim_product = products.withColumn(
        "is_active", col("is_active").cast("boolean")
    ).select("product_id", "name", "category", "is_active")
    dim_product.write.mode("overwrite").parquet(f"{output_dir}/dim_product")

# -------------------------------------------------------------------------------
def transform_dim_menu(spark, input_dir, output_dir):
    """Transforma menus.csv al formato de dim_menu para Hive."""
    menus = spark.read.csv(f"{input_dir}/menus.csv", header=True, inferSchema=True)
    dim_menu = menus.select("menu_id", "name", "description")
    dim_menu.write.mode("overwrite").parquet(f"{output_dir}/dim_menu")

# -------------------------------------------------------------------------------
def transform_dim_date(spark, output_dir, start_date="2024-01-01", end_date="2025-12-31"):
    """Genera la dimensión de fechas para el data warehouse."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range((end-start).days+1)]
    df = spark.createDataFrame(dates, "string").toDF("date_str")
    df = df.withColumn("date", col("date_str").cast("date")) \
           .withColumn("date_key", date_format(col("date"), "yyyyMMdd").cast(IntegerType())) \
           .withColumn("year", year(col("date"))) \
           .withColumn("month", month(col("date"))) \
           .withColumn("day", dayofmonth(col("date"))) \
           .withColumn("weekday", date_format(col("date"), "EEEE")) \
           .withColumn("quarter", quarter(col("date"))) \
           .select("date_key", "year", "month", "day", "weekday", "quarter")
    df.write.mode("overwrite").parquet(f"{output_dir}/dim_date")


# -- ---------------------------------------------------------------------------------
def transform_dim_time(spark, output_dir):
    """Genera la dimensión de tiempo para el data warehouse."""
    times = []
    for h in range(0, 24):
        for m in range(0, 60):
            time_key = int(f"{h:02d}{m:02d}")
            times.append(Row(time_key=time_key, hour=h, minute=m))
    df = spark.createDataFrame(times)
    df.write.mode("overwrite").parquet(f"{output_dir}/dim_time")
    

# -------------------------------------------------------------------------------
def transform_dim_status(spark, output_dir):
    """Genera la dimensión de status para el data warehouse."""
    data = [
        ("delivered", "Order delivered to customer"),
        ("pending", "Order pending"),
        ("cancelled", "Order cancelled"),
        # Agrega más estados si los tienes
    ]
    df = spark.createDataFrame(data, ["status", "description"])
    df.write.mode("overwrite").parquet(f"{output_dir}/dim_status")

# ---------------------------------------------------------------------------------
def transform_fact_orders(spark, input_dir, output_dir):
    """Transforma orders.csv al formato de fact_orders para Hive."""
    orders = spark.read.csv(f"{input_dir}/orders.csv", header=True, inferSchema=True)

    # Extraer order_date en formato INT (YYYYMMDD) desde order_time
    orders = orders.withColumn(
        "order_date",
        date_format(to_date(col("order_time")), "yyyyMMdd").cast("int")
    )

    orders = orders.withColumn(
        "order_time_int",
        (lpad(date_format(col("order_time"), "HHmm"), 4, "0")).cast("int")
    )

    # Generar fact_order_id único
    fact_orders = orders.withColumn(
        "fact_order_id", monotonically_increasing_id()
    ).withColumn(
        "price", col("price").cast(DecimalType(10, 2))
    ).select(
        "fact_order_id",
        "order_id",
        "user_id",
        "restaurant_id",
        "menu_id",
        "product_id",
        "quantity",
        col("order_time_int").alias("order_time"),
        "status",
        "price",
        "order_date"
    )

    # Guardar particionando por order_date
    fact_orders.write.mode("overwrite") \
        .partitionBy("order_date") \
        .parquet(f"{output_dir}/fact_orders")

# ---------------------------------------------------------------------------------


def transform_fact_reservations(spark, input_dir, output_dir):
    """Transforma reservations.csv al formato de fact_reservations para Hive."""
    reservations = spark.read.csv(f"{input_dir}/reservations.csv", header=True, inferSchema=True)

    # Extraer reservation_date en formato INT (YYYYMMDD) desde reservation_time
    reservations = reservations.withColumn(
        "reservation_date",
        date_format(to_date(col("reservation_time")), "yyyyMMdd").cast("int")
    )

    # Extraer reservation_time en formato INT (HHMM)
    reservations = reservations.withColumn(
        "reservation_time_int",
        (lpad(date_format(col("reservation_time"), "HHmm"), 4, "0")).cast("int")
    )

    # Generar fact_reservation_id único
    fact_reservations = reservations.withColumn(
        "fact_reservation_id", monotonically_increasing_id()
    ).select(
        "fact_reservation_id",
        "reservation_id",
        "user_id",
        "restaurant_id",
        col("reservation_time_int").alias("reservation_time"),
        "reservation_date"
    )

    # Guardar particionando por reservation_date
    fact_reservations.write.mode("overwrite") \
        .partitionBy("reservation_date") \
        .parquet(f"{output_dir}/fact_reservations")

# -------------------------------------------------------------------------------

def main():
    """Main function to parse arguments and run Spark transformations."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, help="Ruta de los CSV de entrada (ej: /opt/airflow/dags/data)")
    parser.add_argument("--output-dir", required=True, help="Ruta para resultados (ej: /opt/airflow/dags/data/transformed)")
    args = parser.parse_args()

    spark = None
    try:
        spark = init_spark()
        os.makedirs(args.output_dir, exist_ok=True)
        
        # execute transformations
        analyze_top_products(spark, args.input_dir, args.output_dir)
        analyze_peak_hours(spark, args.input_dir, args.output_dir)
        analyze_monthly_growth(spark, args.input_dir, args.output_dir)
        transform_dim_user(spark, args.input_dir, args.output_dir)
        transform_dim_restaurant(spark, args.input_dir, args.output_dir)    
        transform_dim_product(spark, args.input_dir, args.output_dir)
        transform_dim_menu(spark, args.input_dir, args.output_dir)
        transform_dim_date(spark, args.output_dir)
        transform_dim_time(spark, args.output_dir)
        transform_dim_status(spark, args.output_dir)
        transform_fact_orders(spark, args.input_dir, args.output_dir)
        transform_fact_reservations(spark, args.input_dir, args.output_dir)

    finally:
        if spark:
            spark.stop()

# -------------------------------------------------------------------------------

if __name__ == "__main__":
    main()