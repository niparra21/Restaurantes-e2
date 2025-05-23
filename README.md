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

### 🗝️ Configuración del Realm en Keycloak
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

### 📌 Consideraciones Importantes
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

- Si se quiere revisar el estado del sharding, se puede hacer con el comando `sh.status()` en el shell de MongoDB.

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