
#  Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
#  Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
#  I Semestre - 2025

# this code extracts data from a PostgreSQL database and saves it to CSV files.

import pandas as pd
import psycopg2

def extract_users_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql("SELECT id as user_id, username, email FROM users;", conn)
    df.to_csv('/opt/airflow/dags/data/users.csv', index=False)
    conn.close()

def extract_restaurants_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql("SELECT id as restaurant_id, name, address, phone, city FROM restaurants;", conn)
    df.to_csv('/opt/airflow/dags/data/restaurants.csv', index=False)
    conn.close()

def extract_menus_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql("SELECT id as menu_id, name, description FROM menus;", conn)
    df.to_csv('/opt/airflow/dags/data/menus.csv', index=False)
    conn.close()

def extract_products_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql("SELECT id as product_id, name, category, is_active FROM products;", conn)
    df.to_csv('/opt/airflow/dags/data/products.csv', index=False)
    conn.close()

def extract_orders_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql('''
        SELECT 
            o.id AS order_id,
            o.user_id,
            o.restaurant_id,
            o.menu_id,
            mi.product_id,
            mi.quantity,
            o.order_time,
            o.status,
            p.price as price
        FROM orders o
        JOIN menu_items mi ON o.menu_id = mi.menu_id
        JOIN products p ON p.id = mi.product_id;
    ''', conn)
    df.to_csv('/opt/airflow/dags/data/orders.csv', index=False)
    conn.close()

def extract_reservations_to_csv():
    conn = psycopg2.connect(
        host="db",          
        database="Restaurante",  
        user="postgres",     
        password="mitzy"    
    )
    df = pd.read_sql('''
        SELECT 
            r.id AS reservation_id,
            r.user_id,
            r.restaurant_id,
            r.reservation_time
        FROM reservations r;
    ''', conn)
    df.to_csv('/opt/airflow/dags/data/reservations.csv', index=False)
    conn.close()