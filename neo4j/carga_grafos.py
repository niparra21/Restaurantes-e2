from neo4j import GraphDatabase
import csv
import os
import random
import time
import logging
import math
from datetime import datetime


# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Neo4jLoader:
    def __init__(self):
        # Obtener valores directamente de las variables de entorno del sistema
        self.uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "safepassword")
        self.csv_dir = os.getenv("CSV_DIR", "/app/csv_exports")
        
        logger.info(f"Configuración: URI={self.uri}, User={self.user}, CSV_DIR={self.csv_dir}")
        self.driver = None

    def connect(self):
        """Establecer conexión con Neo4j con reintentos"""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                self.driver = GraphDatabase.driver(
                    self.uri, 
                    auth=(self.user, self.password),
                    max_connection_lifetime=3600
                )
                self.driver.verify_connectivity()
                logger.info("✅ Conexión exitosa con Neo4j")
                return True
            except Exception as e:
                logger.warning(f"⚠️ Intento {attempt + 1}/{max_retries}: {str(e)}")
                time.sleep(retry_delay)
        
        logger.error("❌ No se pudo conectar a Neo4j después de varios intentos")
        return False

    def load_data(self):
        """Cargar todos los datos desde los archivos CSV"""
        if not self.driver:
            if not self.connect():
                return False

        with self.driver.session() as session:
            try:
                # Limpiar base de datos
                session.run("MATCH (n) DETACH DELETE n")
                self.load_users(session)
                self.load_restaurants(session)
                self.load_products(session)
                self.load_menus(session)
                self.load_orders(session)
                self.load_menu_items(session)
                self.infer_order_contains_from_menu(session)
                # Crear relaciones adicionales
                self.create_relationships(session)
                 # Crear repartidores y asignar rutas
                self.create_delivery_persons(session, 5)
                self.set_random_order_status(session)
                self.simulate_delivery_assignment(session)
                
                logger.info("✅ Todos los datos cargados exitosamente")
                return True
                
            except Exception as e:
                logger.error(f"❌ Error al cargar datos: {str(e)}")
                return False

    def load_users(self, session):
        """Cargar datos de usuarios con ubicaciones geográficas"""
        path = os.path.join(self.csv_dir, "users.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MERGE (u:User {id: $id})
        SET u.username = $username,
            u.email = $email,
            u.role = $role
            
        MERGE (l:Location {address: $address})
        SET l.city = $city,
            l.x = $x,
            l.y = $y
        MERGE (u)-[:LIVES_AT]->(l)
        """
        
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Generar dirección y coordenadas aleatorias
                address = f"Calle {random.randint(1, 100)} # {random.randint(1, 100)}"
                city = random.choice(["Ciudad A", "Ciudad B", "Ciudad C"])
                x = round(random.uniform(-100, 100), 4)
                y = round(random.uniform(-100, 100), 4)
                
                session.run(query, 
                    id=int(row["id"]),
                    username=row["username"],
                    email=row["email"],
                    role=row["role"],
                    address=address,
                    city=city,
                    x=x,
                    y=y
                )
        logger.info(f"📊 Usuarios y ubicaciones cargados desde {path}")

    def load_restaurants(self, session):
        """Cargar datos de restaurantes con ubicaciones geográficas"""
        path = os.path.join(self.csv_dir, "restaurants.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MERGE (r:Restaurant {id: $id})
        SET r.name = $name,
            r.phone = $phone
            
        MERGE (l:Location {address: $address})
        SET l.city = $city,
            l.x = $x,
            l.y = $y
        MERGE (r)-[:LOCATED_AT]->(l)
        """
        
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Generar coordenadas aleatorias
                x = round(random.uniform(-100, 100), 4)
                y = round(random.uniform(-100, 100), 4)
                
                session.run(query, 
                    id=int(row["id"]),
                    name=row["name"],
                    phone=row["phone"],
                    address=row["address"],
                    city=row["city"],
                    x=x,
                    y=y
                )
        logger.info(f"🍽️ Restaurantes y ubicaciones cargados desde {path}")


    def load_products(self, session):
        """Cargar datos de productos"""
        path = os.path.join(self.csv_dir, "products.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MERGE (p:Product {id: $id})
        SET p.name = $name,
            p.description = $description,
            p.price = toFloat($price),
            p.category = $category,
            p.is_active = $is_active
        """
        
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                session.run(query, 
                    id=int(row["id"]),
                    name=row["name"],
                    description=row["description"],
                    price=row["price"],
                    category=row["category"],
                    is_active=row["is_active"].lower() == "true"
                )
        logger.info(f"🛒 Productos cargados desde {path}")

    def load_orders(self, session):
        """Cargar datos de órdenes"""
        path = os.path.join(self.csv_dir, "orders.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MERGE (o:Order {id: $id})
        SET o.time = $time,
            o.status = $status

        WITH o
        MATCH (u:User {id: $user_id})
        MATCH (r:Restaurant {id: $restaurant_id})
        MATCH (m:Menu {id: $menu_id})
        MERGE (u)-[:PLACED]->(o)
        MERGE (o)-[:FROM]->(r)
        MERGE (o)-[:USES]->(m)
        """
        
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                session.run(query, 
                    id=int(row["id"]),
                    time=row["order_time"],
                    status=row["status"],
                    user_id=int(row["user_id"]),
                    restaurant_id=int(row["restaurant_id"]),
                    menu_id=int(row["menu_id"])
                )
        logger.info(f"📦 Órdenes cargadas y vinculadas a menú desde {path}")


    def load_menus(self, session):
        """Cargar menús"""
        path = os.path.join(self.csv_dir, "menus.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MERGE (m:Menu {id: $id})
        SET m.name = $name,
            m.description = $description
            
        WITH m
        MATCH (r:Restaurant {id: $restaurant_id})
        MERGE (r)-[:HAS_MENU]->(m)
        """

        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                session.run(query,
                    id=int(row["id"]),
                    name=row["name"],
                    description=row["description"],
                    restaurant_id=int(row["restaurant_id"])
                )
        logger.info(f"📋 Menús cargados desde {path}")



    def load_menu_items(self, session):
        """Cargar items del menú"""
        path = os.path.join(self.csv_dir, "menu_items.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MATCH (m:Menu {id: $menu_id})
        MATCH (p:Product {id: $product_id})
        MERGE (m)-[:INCLUDES {quantity: $quantity}]->(p)
        """
        
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                session.run(query, 
                    menu_id=int(row["menu_id"]),
                    product_id=int(row["product_id"]),
                    quantity=int(row["quantity"])
                )
        logger.info(f"🍴 Items de menú cargados desde {path}")

    def infer_order_contains_from_menu(self, session):
        """
        A partir del menú usado en cada orden, crear la relación CONTAINS hacia los productos del menú.
        """
        query = """
        MATCH (o:Order)-[:USES]->(m:Menu)-[inc:INCLUDES]->(p:Product)
        MERGE (o)-[:CONTAINS {quantity: inc.quantity}]->(p)
        """
        session.run(query)
        logger.info("🔁 Relaciones CONTAINS inferidas desde los menús de cada orden")


    def load_order_contains(self, session):
        """Crear relaciones CONTAINS desde órdenes hacia productos"""
        path = os.path.join(self.csv_dir, "menu_items.csv")
        if not os.path.exists(path):
            logger.warning(f"⚠️ Archivo no encontrado: {path}")
            return

        query = """
        MATCH (o:Order {id: $order_id})
        MATCH (p:Product {id: $product_id})
        MERGE (o)-[:CONTAINS {quantity: $quantity}]->(p)
        """

        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                session.run(query,
                            order_id=int(row["order_id"]),  # asegurarse que este campo esté en el CSV
                            product_id=int(row["product_id"]),
                            quantity=int(row["quantity"]))
        logger.info(f"🔗 Relaciones CONTAINS creadas desde {path}")


    def create_relationships(self, session):
        """Crear relaciones adicionales"""
        # Conectar ubicaciones
        session.run("""
            MATCH (l1:Location), (l2:Location)
            WHERE l1 <> l2 AND rand() < 0.3
            MERGE (l1)-[r:CONNECTED]->(l2)
            SET r.distance = round(rand() * 10 + 1, 2),
                r.time = toInteger(round(rand() * 30 + 5))
        """)
        logger.info("🛣️ Conexiones entre ubicaciones creadas")
        
        # Crear algunas recomendaciones simuladas
        session.run("""
            MATCH (u1:User), (u2:User)
            WHERE u1 <> u2
            WITH u1, u2, rand() AS randomValue
            WHERE randomValue < 0.15
            WITH u1, u2
            ORDER BY randomValue  // Orden aleatorio crucial
            LIMIT 20
            MERGE (u1)-[:RECOMMENDS]->(u2)
        """)
        logger.info("👍 Recomendaciones entre usuarios creadas")

    def create_delivery_persons(self, session, count):
        """Crear nodos para repartidores"""
        for i in range(1, count + 1):
            session.run("""
                MERGE (d:DeliveryPerson {id: $id})
                SET d.name = $name
            """, id=i, name=f"Repartidor {i}")
        logger.info(f"🚚 Creados {count} repartidores")

    def set_random_order_status(self, session):
        """Marcar órdenes aleatorias como listas para entrega"""
        session.run("""
            MATCH (o:Order)
            WHERE rand() < 0.4  // 40% de las órdenes
            SET o.status = 'ready_for_delivery'
        """)
        logger.info("📦 Órdenes marcadas como listas para entrega")

    def simulate_delivery_assignment(self, session):
        """Asignación mejorada: considerar todas las órdenes listas y agrupar por restaurante"""
        # Paso 1: Obtener todas las órdenes listas para entrega, agrupadas por restaurante
        orders_query = """
            MATCH (o:Order)
            WHERE o.status IN ['ready_for_delivery', 'pending']  // ¡Corrección importante!
            AND NOT EXISTS((o)-[:ASSIGNED_TO]->())
            WITH o
            MATCH (o)-[:FROM]->(r:Restaurant)
            RETURN r.id AS restaurant_id, 
                COLLECT(o.id) AS order_ids,
                COUNT(o) AS order_count
            ORDER BY order_count DESC
        """
        orders_grouped = session.run(orders_query).data()
        
        drivers = session.run("MATCH (d:DeliveryPerson) RETURN d.id AS driver_id").data()
        
        if not orders_grouped:
            logger.info("✅ No hay pedidos pendientes de asignación")
            return
        
        if not drivers:
            logger.error("❌ No hay repartidores disponibles")
            return
        
        assigned_count = 0
        for group in orders_grouped:
            restaurant_id = group['restaurant_id']
            order_ids = group['order_ids']
            
            if not drivers:
                logger.warning(f"⚠️ No hay repartidores para restaurante {restaurant_id}")
                break
                
            driver = drivers.pop(0)
            
            # Asignar todos los pedidos del restaurante a este repartidor
            for order_id in order_ids:
                assign_query = """
                    MATCH (o:Order {id: $order_id})
                    MATCH (d:DeliveryPerson {id: $driver_id})
                    MERGE (o)-[:ASSIGNED_TO]->(d)
                """
                session.run(assign_query, order_id=order_id, driver_id=driver['driver_id'])
                assigned_count += 1
            
            logger.info(f"🚚 Repartidor {driver['driver_id']} asignado a restaurante {restaurant_id} ({len(order_ids)} pedidos)")
        
        logger.info(f"🔗 Total de órdenes asignadas: {assigned_count}")
        
        # Paso 2: Calcular y guardar rutas optimizadas (mantener igual)
        # ...
        
        # Paso 2: Calcular y guardar rutas optimizadas en Neo4J
        repartidores = session.run("MATCH (d:DeliveryPerson) RETURN d.id AS id").data()
        
        for rep in repartidores:
            repartidor_id = rep['id']
            
            # Obtener el restaurante asignado a este repartidor
            result = session.run("""
                MATCH (d:DeliveryPerson {id: $id})<-[:ASSIGNED_TO]-(o:Order)
                MATCH (o)-[:FROM]->(r:Restaurant)-[:LOCATED_AT]->(rest_loc)
                WITH rest_loc, d
                LIMIT 1  // Solo necesitamos un restaurante
                MATCH (d)<-[:ASSIGNED_TO]-(o2)
                MATCH (o2)<-[:PLACED]-(u:User)-[:LIVES_AT]->(user_loc)
                RETURN rest_loc, COLLECT(DISTINCT user_loc) AS paradas_clientes
            """, id=repartidor_id)
            
            if not result.peek():
                logger.info(f"🚴 Repartidor {repartidor_id} sin entregas asignadas")
                continue
            
            record = result.single()
            rest_loc = record["rest_loc"]
            paradas_clientes = record["paradas_clientes"]
            
            if not paradas_clientes:
                logger.warning(f"⚠️ Repartidor {repartidor_id}: sin ubicaciones de clientes")
                continue
            
            # Calcular ruta optimizada
            ruta_optimizada = self.calcular_ruta_vecino_mas_cercano(rest_loc, paradas_clientes)
            
            # Guardar ruta en Neo4J
            self.guardar_ruta_neo4j(session, repartidor_id, ruta_optimizada)
            
            # Mostrar resultados en logs
            self.mostrar_ruta_logs(repartidor_id, ruta_optimizada)

    def guardar_ruta_neo4j(self, session, repartidor_id, ruta):
        """Guardar ruta optimizada en la base de datos Neo4J (versión mejorada)"""
        # Eliminar rutas anteriores para este repartidor
        session.run("""
            MATCH (r:Route {driver_id: $driver_id})
            DETACH DELETE r
        """, driver_id=repartidor_id)
        
        # Crear nodo de ruta
        session.run("""
            CREATE (ruta:Route {driver_id: $driver_id})
            SET ruta.name = 'Ruta para Repartidor ' + $driver_id,
                ruta.timestamp = datetime()
        """, driver_id=repartidor_id)
        
        # Conectar puntos en orden
        for i, punto in enumerate(ruta):
            # Crear o actualizar nodo Location
            session.run("""
                MERGE (loc:Location {address: $address})
                SET loc.x = $x,
                    loc.y = $y,
                    loc.order_in_route = $order
                WITH loc
                MATCH (ruta:Route {driver_id: $driver_id})
                MERGE (ruta)-[:INCLUDES {point: $order}]->(loc)
            """, address=punto['address'], 
                x=punto['x'], 
                y=punto['y'], 
                order=i, 
                driver_id=repartidor_id)
        
        # Conectar puntos secuencialmente
        for i in range(1, len(ruta)):
            session.run("""
                MATCH (start:Location {address: $start_addr})
                MATCH (end:Location {address: $end_addr})
                MATCH (ruta:Route {driver_id: $driver_id})
                
                // Crear relación entre puntos consecutivos
                MERGE (start)-[r:NEXT_IN_ROUTE]->(end)
                SET r.driver_id = $driver_id,
                    r.distance = point.distance(point({x: start.x, y: start.y}), 
                                            point({x: end.x, y: end.y}))
            """, start_addr=ruta[i-1]['address'], 
                end_addr=ruta[i]['address'], 
                driver_id=repartidor_id)
        
        logger.info(f"🗺️ Ruta guardada para repartidor {repartidor_id} con {len(ruta)} puntos")

    def mostrar_ruta_logs(self, repartidor_id, ruta_optimizada):
        """Mostrar ruta en los logs de la aplicación"""
        logger.info(f"\n🚀 RUTA OPTIMIZADA PARA REPARTIDOR {repartidor_id}")
        logger.info(f"📍 Restaurante: {ruta_optimizada[0]['address']} ({ruta_optimizada[0]['x']:.2f}, {ruta_optimizada[0]['y']:.2f})")
        total_distancia = 0.0
        
        for i, punto in enumerate(ruta_optimizada[1:], start=1):
            anterior = ruta_optimizada[i-1]
            distancia = self.calcular_distancia(anterior, punto)
            total_distancia += distancia
            logger.info(f"  {i}. 📍 {punto['address']} ({punto['x']:.2f}, {punto['y']:.2f}) | Distancia: {distancia:.2f} km")
        
        logger.info(f"📏 Distancia total: {total_distancia:.2f} km")
        logger.info(f"🛵 Tiempo estimado: {total_distancia * 3:.1f} minutos\n")

    def calcular_ruta_vecino_mas_cercano(self, inicio, paradas):
        """Calcular ruta usando algoritmo del vecino más cercano"""
        ruta = [inicio]
        puntos_restantes = paradas.copy()
        actual = inicio
        
        while puntos_restantes:
            # Encontrar la parada más cercana
            mas_cercano = min(
                puntos_restantes,
                key=lambda x: self.calcular_distancia(actual, x)
            )
            ruta.append(mas_cercano)
            puntos_restantes.remove(mas_cercano)
            actual = mas_cercano
        
        return ruta

    def calcular_distancia(self, loc1, loc2):
        """Calcular distancia euclidiana entre dos ubicaciones"""
        dx = loc1['x'] - loc2['x']
        dy = loc1['y'] - loc2['y']
        return math.sqrt(dx**2 + dy**2)


if __name__ == "__main__":
    loader = Neo4jLoader()
    if loader.load_data():
        logger.info("🚀 Carga de datos completada exitosamente")
    else:
        logger.error("💥 Error en la carga de datos")
        exit(1)