# 🍽️ Sistema de Reservación de Restaurantes

El sistema de reservación de restaurantes es una plataforma digital basada en una arquitectura de microservicios que permite gestionar de manera eficiente y segura las operaciones relacionadas con la administración de restaurantes, reservas, menús, órdenes y usuarios. Mediante el uso de tecnologías modernas, como bases de datos relacionales y NoSQL, motores de búsqueda, cacheo y balanceo de carga, el sistema facilita la creación, consulta y modificación de datos en tiempo real, ofreciendo una experiencia ágil y escalable tanto para los administradores como para los clientes. Además, incorpora mecanismos de autenticación, búsqueda avanzada y automatización de procesos para garantizar alta disponibilidad, rendimiento y facilidad de mantenimiento.

***Autoras***
* Mariann Marín Barquero
* Nicole Parra Valverde
* Stephanie Sandoval Camacho

## Requisitos

- Docker y Docker Compose

## ⚙️ Configuraciones

### Variables de Entorno
Cree un archivo `.env` en la raíz del proyecto con las variables de entorno necesarias. En este caso, en la raíz se creó un archivo llamado `.envTemplate` con los nombres de las variables de entorno que se deben reemplazar.

### Configuración del Realm en Keycloak
El sistema utiliza Keycloak como gestor de autenticación y autorización. Para configurar el Realm, se deben seguir los siguientes pasos:

1. En el docker-compose.yml, en el servicio `keycloak`, se encontrarán dos líneas comentadas. Descoméntelas y, en su lugar, comente las líneas anteriores a estas para que obtenga la siguiente configuración:

``` yml
keycloak:
  image: quay.io/keycloak/keycloak:24.0.1
  #command: start-dev
  command: start-dev --import-realm
  environment:
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
    KC_DB_USERNAME: keycloak
    KC_DB_PASSWORD: keycloak
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
  ports:
    - "8080:8080"
  volumes:
    #- keycloak-data:/opt/keycloak/data
    - ./keycloak-realm:/opt/keycloak/data/import
  depends_on:
    keycloak-db:
      condition: service_healthy
  networks:
    - backend-network
```
2. Ejecute el siguiente comando:
``` bash
docker-compose up keycloak
```
3. Deje que el sistema termine de inicializarse y luego acceda a la URL `http://localhost:8080` en su navegador. Inicie sesión con el usuario `admin` y la contraseña `admin`. Luego, haga clic en el dropdown con el Realm actual en la esquina superior izquierda y verifica que existan dos realms:
  - `Keycloak master` (el que se crea automáticamente).
  - `reserva-restaurantes` (el que se importa desde el archivo `keycloak-realm\reserva-restaurantes-realm.json`)
4. Cuando esto esté listo, puede bajar el contenedor con el comando
``` bash
docker-compose down
```

## 🚀 Inicialización del Sistema
Una vez que el sistema esté configurado, puede inicializarlo con el comando
``` bash
docker-compose up --build -d
```
Esto levantará todos los servicios: PostgreSQL, MongoDB, Redis, ElasticSearch, Keycloak junto con su base de datos y la API REST.

### Consideraciones Importantes
- Antes de ejecutar el comando anterior, se debe haber devuelto la configuración de Keycloak a su estado original, es decir, que se debieron descomentar las líneas comentadas en el archivo `docker-compose.yml` y se tuvieron que comentar las líneas que se descomentaron anteriormente.
- La variable de entorno `REINDEX_ON_START` se debe establecer en `false` ya que aun no existen productos en ninguna base de datos para reindexar. Una vez que existan productos, se puede establecer en `true` para reindexarlos.
- La variable de entorno `DB_TYPE` se debe establecer en `postgres` o `mongo` según la base de datos que se desee utilizar.

## 🍀 Inicialización del Clúster Shardeado de MongoDB
Una vez que el sistema está arriba, si la base de datos seleccionada es MongoDB, se debe inicializar el clúster de MongoDB. Para esto, se deben seguir los siguientes pasos:
1. Inicializar el Config Server Replica Set
``` bash
docker exec -it mongo-config1 mongosh
```

``` js
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "mongo-config1:27017" },
    { _id: 1, host: "mongo-config2:27017" },
    { _id: 2, host: "mongo-config3:27017" }
  ]
});
```

2. Inicializar el Shard Replica Set
``` bash
docker exec -it mongors1n1 mongosh
```

``` js
rs.initiate({
  _id: "mongors1",
  members: [
    { _id: 0, host: "mongors1n1:27017" },
    { _id: 1, host: "mongors1n2:27017" },
    { _id: 2, host: "mongors1n3:27017" }
  ]
});
```

- Si se quiere revisar el estado de los replicaset, se puede hacer con el comando `rs.status()` en el shell de MongoDB.

3. Configuración del Sharding
``` bash
docker exec -it mongos mongosh
```

``` js
sh.addShard("mongors1/mongors1n1:27017,mongors1n2:27017,mongors1n3:27017")
sh.enableSharding("Restaurante")
```

## 🤖 CI/CD con GitHub Actions

Este proyecto incluye una integración continua básica usando **GitHub Actions** para asegurar la calidad y facilitar el despliegue.

### Estructura del Workflow

El flujo de trabajo principal se encuentra en:

`.github/workflows/ci.yml`

### ¿Qué hace el Workflow?

1. Ejecute los tests definidos con Jest (`npm test`)
2. Construya la imagen Docker del backend
3. La sube automáticamente a Docker Hub si los tests pasan

### Configuración Requerida en GitHub

Debe agregar sus credenciales de Docker Hub como *secrets* en su repositorio de GitHub:

- Vaya a **Settings → Secrets and variables → Actions** y agregue:

| Variable          | Descripción                         |
|-------------------|-------------------------------------|
| `DOCKER_USERNAME` | Su usuario de Docker Hub            |
| `DOCKER_PASSWORD` | Su contraseña o token de Docker Hub |

### Convención para los tags

La imagen se sube como:

`docker.io/<tu_usuario>/restaurantes-e2:latest`

Se puede modificar el nombre y tag directamente en el archivo `ci.yml`.

### Escalabilidad

Se levantan dos instancias del backend (`api1`, `api2`), accesibles a través de NGINX en:

* http://localhost/api/

Se puede probar la distribución de carga con:

``` bash
while true; do curl http://localhost/api/ping; sleep 1; done
```

Verá que las respuestas alternan entre los contenedores gracias al  round-robin configurado en NGINX.

#### Balanceador de carga (NGINX)

El archivo `nginx.conf` contiene la siguiente configuración

``` conf
upstream api_backend {
  server api1:5000;
  server api2:5000;
}

server {
  listen 80;

  location /api/ {
    proxy_pass http://api_backend;
  }

  location /search/ {
    proxy_pass http://search_backend;
  }
}
```

* La ruta `/api/` balancea entre instancias del backend.
* La ruta `/search/` redirige a un servicio de búsqueda.

## ⚡ Uso de la API
La API se utiliza para realizar operaciones con los principales objetos que maneja el sistema: usuarios, restaurantes, menús, órdenes, reservaciones y productos. A continuación, se incluyen los métodos disponibles para cada objeto:

### 🔸 Autenticación
| Método | Ruta               | Función                                                                 |
|--------|--------------------|-------------------------------------------------------------------------|
| POST   | `/auth/register`   | Registra un nuevo usuario en Keycloak y en la base de datos en uso      |
| POST   | `/auth/login`      | Inicia sesión para un usuario (devuelve token JWT de Keycloak)          |
| POST   | `/clone`           | Clona un usuario de PostgreSQL a MongoDB                                |

### 🔸 Usuarios
| Método | Ruta           | Función                                                                 |
|--------|----------------|-------------------------------------------------------------------------|
| GET    | `/users/me`    | Devuelve información del usuario con sesión activa                      |
| PUT    | `/users/:id`   | Actualiza información en Keycloak y base de datos                       |
| DELETE | `/users/:id`   | Elimina cuenta en Keycloak y base de datos                              |

### 🔸 Restaurantes
| Método | Ruta              | Función                                                                 |
|--------|-------------------|-------------------------------------------------------------------------|
| POST   | `/restaurants`    | Agrega un nuevo restaurante                                             |
| GET    | `/restaurants`    | Lista todos los restaurantes                                            |

### 🔸 Menús
| Método | Ruta            | Función                                                                 |
|--------|-----------------|-------------------------------------------------------------------------|
| POST   | `/menus`        | Agrega un nuevo menú                                                    |
| GET    | `/menus/:id`    | Obtiene detalles de un menú específico                                  |
| PUT    | `/menus/:id`    | Actualiza un menú existente                                             |
| DELETE | `/menus/:id`    | Elimina un menú                                                         |

### 🔸 Reservaciones
| Método | Ruta                  | Función                                                                 |
|--------|-----------------------|-------------------------------------------------------------------------|
| POST   | `/reservations`       | Crea una nueva reservación                                              |
| GET    | `/reservations/:id`   | Obtiene detalles de una reservación                                     |
| DELETE | `/reservations/:id`   | Cancela una reservación                                                 |

### 🔸 Órdenes
| Método | Ruta             | Función                                                                 |
|--------|------------------|-------------------------------------------------------------------------|
| POST   | `/orders`        | Crea una nueva orden                                                    |
| GET    | `/orders/:id`    | Obtiene detalles de una orden específica                                |

### 🔸 Productos
| Método | Ruta              | Función                                                                 |
|--------|-------------------|-------------------------------------------------------------------------|
| POST   | `/products`       | Agrega un nuevo producto                                                |
| GET    | `/products`       | Lista todos los productos                                               |
| DELETE | `/products/:id`   | Elimina un producto                                                     |

## 🔍 Uso del Servidor de Búsquedas
El sistema de búsquedas se utiliza para realizar consultas complejas de los productos almacenados en la base de datos. Para esto, se aprovecha las funcionalidades de ElasticSearch para realizar consultas de texto, por categoría o incluso una combinación de ambas. A continuación, se incluyen los métodos disponibles para el servidor de búsquedas:

### 🔹 Productos (Búsqueda con ElasticSearch)

| Método | Ruta                          | Función                                                                 |
|--------|-------------------------------|-------------------------------------------------------------------------|
| GET    | `/products`                   | Búsqueda en ElasticSearch por:<br>- Término (`?q=texto`)<br>- Categoría (`?category=valor`)<br>- Ambos criterios combinados |
| GET    | `/products/category/:category`| Búsqueda filtrada exclusivamente por categoría                          |
| POST   | `/reindex`                    | Ejecuta una reindexación manual completa de productos en ElasticSearch  |

## 📦 Ejemplos de Uso

[Ejemplos de Uso](EXAMPLES.md)

## 🎥 Video
Se incluye un video que muestra la funcionalidad del sistema en acción.

[Video Demostrativo](https://drive.google.com/drive/folders/1D_IdkLbZQNpx5ySEPajmJff1t3Pw8g1x) 


## ----------------------------------------------------------------------------------
## 🗄️ Paso a Paso para Inicializar el Data Warehouse (Hive)

1. Levanta todos los servicios. Desde la raíz del proyecto

``` bash
docker-compose up --build
``` 

2. 🐝 Ingresa al contenedor del Hive Server

``` bash
docker exec -it restaurantes-e2-hive-server-1 bash
``` 

3. Inicializa el esquema del metastore

Dentro del contenedor de Hive Server, ejecuta:

``` bash
schematool -dbType postgres -initSchema
```

Esto inicializa el esquema del metascore, crea las tablas internas necesarias para que Hive funcione.

4. Posterior a eso se ejecuta el siguiente comando (desde la raíz del proyecto):

``` bash
docker cp db/star-schema.hql restaurantes-e2-hive-server-1:/tmp/star-schema.hql
```

Este comando copia el archivo [Script de creación del datawarehouse](db/star-schema.hql) desde la máquina local al contenedor del hive-server

5. 🚀 Inicia el servicio HiveServer2

Dentro del contenedor de Hive Server:

``` bash
hive --service hiveserver2 &
```
Esto habilita el puerto JDBC (10000) necesario para ejecutar comandos con Beeline.

6. Verifica que HiveServer2 está corriendo

Dentro del contenedor, ejecuta:

``` bash
netstat -tulnp
```

Debería devolverle algo así:

Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 127.0.0.11:39917        0.0.0.0:*               LISTEN      -
tcp        0      0 0.0.0.0:10002           0.0.0.0:*               LISTEN      226/java
tcp        0      0 0.0.0.0:10000           0.0.0.0:*               LISTEN      226/java
udp        0      0 127.0.0.11:33011        0.0.0.0:*                           -

Note que el 0 0.0.0.0:10000 está en estado LISTEN

7. Ejecuta el script para crear las tablas del data warehouse

Dentro del contenedor de Hive Server:

``` bash
beeline -u jdbc:hive2://localhost:10000 -n hive -f /tmp/star-schema.hql
```

8.  🔍 Verifica las tablas creadas

Abre el cliente Beeline dentro del contenedor:

``` bash
beeline -u jdbc:hive2://localhost:10000 -n hive
```

Dentro de Beeline se puede ejecutar:

``` bash
SHOW TABLES;
```
Muestra las tablas existentes

``` bash
DESCRIBE fact_orders;
```
Este muestra la estructura de una tabla, cambie `fact_orders` por la tabla que necesite observar


## ---------
# para rellenar la base

dudo que esto se deba de poner en el readme pero aquí les va:

instalen esta cochinada: npm install pg @faker-js/faker **(creo que no es necesario para que ya con los package.json está creo)**

luego borren el volumen de postgres porque cambiamos la estrcutura de la base y ocupamos que esté vacía para recrearla, así:

docker volume rm restaurantes-e2_db-data

luego de eso hagan el docker-compose up --build como de costumbre

se esperan a que el contenedor de restaurantes postgres esté ready para aceptar connections
y le dan

node db/fill_postgres.js

deberia meterles los datos en la base. Y finnnnnn

Bueno no, si quieren comprobar que están ahí los datos hacen:

docker exec -it restaurantes-e2-db-1 psql -U postgres -d Restaurante

y luego cualquiera de estas consultas sql normales a como las prefieran:

SELECT * FROM users LIMIT 5;
SELECT * FROM restaurants LIMIT 5;
SELECT * FROM products LIMIT 5;
SELECT * FROM menus LIMIT 5;
SELECT * FROM menu_items LIMIT 5;
SELECT * FROM reservations LIMIT 5;
SELECT * FROM orders LIMIT 5;

ahora sí, fin?