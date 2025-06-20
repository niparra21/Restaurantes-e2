# 2nd simple test for spark job

from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("PostgreSQLTest") \
    .getOrCreate()

df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:postgresql://db:5432/Restaurante") \
    .option("dbtable", "users") \
    .option("user", "postgres") \
    .option("password", "mitzy") \
    .load()

print(f"Success! Found {df.count()} rows")
df.show(5)
spark.stop()