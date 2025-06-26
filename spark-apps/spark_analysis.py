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
        
    finally:
        if spark:
            spark.stop()

# -------------------------------------------------------------------------------

if __name__ == "__main__":
    main()