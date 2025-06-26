# 
#  Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
#  Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
#  I Semestre - 2025
# 

from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.dummy import DummyOperator
from airflow.operators.python import PythonOperator
from datetime import datetime
from extract import extract_users_to_csv, extract_restaurants_to_csv, extract_menus_to_csv, extract_products_to_csv, extract_orders_to_csv, extract_reservations_to_csv


default_args = {
    'start_date': datetime(2024, 6, 1),
}

with DAG(
    dag_id='etl_postgres_spark',
    default_args=default_args,
    schedule_interval=None,
    catchup=False,
    description='ETL: Extrae de Postgres, transforma con Spark y carga al warehouse'
) as dag:
    
    start = DummyOperator(task_id='start')
    end = DummyOperator(task_id='end')
#Extraction from Postgres -------------------------------------------------------------------

    extract_users = PythonOperator(
        task_id='extract_users',
        python_callable=extract_users_to_csv
    )

    extract_restaurants = PythonOperator(
        task_id='extract_restaurants',
        python_callable=extract_restaurants_to_csv
    )

    extract_menus = PythonOperator(
        task_id='extract_menus',
        python_callable=extract_menus_to_csv
    )

    extract_products = PythonOperator(
        task_id='extract_products',
        python_callable=extract_products_to_csv
    )

    extract_orders = PythonOperator(
        task_id='extract_orders',
        python_callable=extract_orders_to_csv
    )

    extract_reservations = PythonOperator(
        task_id='extract_reservations',
        python_callable=extract_reservations_to_csv
    )

    transform = SparkSubmitOperator(
        task_id='transform_data',
        application='/opt/spark-apps/spark_analysis.py',
        conn_id='spark_default',
        application_args=[
            '--input-dir', '/opt/airflow/dags/data',
            '--output-dir', '/opt/airflow/dags/data/transformed'
        ],
        conf={
            "spark.master": "spark://spark-master:7077",
            "spark.submit.deployMode": "client"
        },
    )

    # load = PostgresOperator(
    #     task_id='load_data',
    #     postgres_conn_id='postgres_default',
    #     sql='INSERT INTO target_table SELECT * FROM transformed_table;',
    #     autocommit=True
    # )


    start >> extract_users >> extract_restaurants >> extract_menus >> extract_products >> extract_orders >> extract_reservations >> transform >> end