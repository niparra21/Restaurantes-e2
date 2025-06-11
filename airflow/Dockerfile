FROM apache/airflow:2.9.1-python3.10

USER root
RUN apt-get update && apt-get install -y build-essential python3-dev libkrb5-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER airflow
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir cython && \
    pip install --no-cache-dir "PyYAML==6.0" && \
    pip install --no-cache-dir \
        apache-airflow-providers-postgres==5.10.2 \
        apache-airflow-providers-apache-spark==4.3.0 \
        apache-airflow-providers-apache-hive==6.2.0 \
        apache-airflow-providers-elasticsearch==4.4.0