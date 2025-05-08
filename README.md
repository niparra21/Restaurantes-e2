# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

Instrucciones de uso

Esta API permite gestionar usuarios, restaurantes, menús, reservaciones y pedidos, utilizando autenticación con Keycloak para garantizar la seguridad de las operaciones.

1. Configuración y Autenticación
Para utilizar la API, es necesario configurar Keycloak en el entorno de ejecución. Se deben establecer las siguientes variables de entorno en un archivo .env:

KEYCLOAK_REALM=tu_realm
KEYCLOAK_URL=https://tu-servidor-keycloak.com
KEYCLOAK_CLIENT_ID=tu_cliente
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin_password

La API usa keycloak-connect para gestionar sesiones y autenticación. Además, dispone de una función getAdminToken() que permite obtener un token de administrador cuando se necesite realizar operaciones con permisos elevados.

2. Uso de la API
2.1 Autenticación de Usuarios
Antes de acceder a la mayoría de los recursos, un usuario debe registrarse e iniciar sesión. Para ello, se dispone de los siguientes endpoints:

Registro de usuario: Se realiza enviando una solicitud POST a /auth/register, proporcionando la información necesaria para crear una cuenta.

Inicio de sesión: Para autenticarse, se debe enviar una solicitud POST a /auth/login, obteniendo un token de acceso que se usará en las siguientes peticiones.

2.2 Gestión de Usuarios
Una vez autenticado, un usuario puede consultar su información con una solicitud GET a /users/me. Además, si tiene los permisos adecuados, puede actualizar su perfil mediante una solicitud PUT a /users/:id o eliminar su cuenta con una solicitud DELETE a /users/:id.

2.3 Gestión de Restaurantes
Los administradores tienen la capacidad de registrar restaurantes enviando una solicitud POST a /restaurants. Para consultar los restaurantes disponibles, cualquier usuario autenticado puede hacer una solicitud GET a /restaurants.

2.4 Gestión de Menús
Los administradores pueden agregar menús a los restaurantes a través de una solicitud POST a /menus. Para consultar un menú específico, se debe hacer una solicitud GET a /menus/:id. Si es necesario modificar o eliminar un menú, los administradores pueden hacerlo mediante las solicitudes PUT y DELETE en el endpoint /menus/:id.

2.5 Gestión de Reservaciones
Los usuarios pueden realizar reservaciones en los restaurantes mediante una solicitud POST a /reservations. Si desean cancelar una reservación, pueden hacerlo enviando una solicitud DELETE a /reservations/:id.

2.6 Gestión de Pedidos
Para realizar un pedido, un usuario autenticado debe enviar una solicitud POST a /orders. Luego, si desea consultar los detalles de su pedido, puede hacerlo con una solicitud GET a /orders/:id.

3. Seguridad y Control de Acceso
Para garantizar que solo los usuarios autorizados accedan a ciertos recursos, la API emplea middlewares de autenticación y autorización:

authenticateJWT: Verifica que el usuario esté autenticado con un token válido.

isAdmin: Restringe el acceso a ciertos endpoints solo para administradores.

canEdit: Permite a los usuarios modificar su propia información o a administradores editar información de otros usuarios.

Gracias a estas medidas, la API ofrece un entorno seguro y controlado para la gestión de restaurantes.

### 4.  Initialize MongoDB Sharded Cluster

# a. Initialize Config Server Replica Set

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

# b. Initialize Shard Replica Set

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

use this command to check the status

``` bash
rs.status()
``` 

# b. Configure Sharding

``` bash
docker exec -it mongos mongosh
```

``` js
sh.addShard("mongors1/mongors1n1:27017,mongors1n2:27017,mongors1n3:27017")
sh.enableSharding("Restaurante")
sh.shardCollection("Restaurante.products", { product_id: 1 })
sh.shardCollection("Restaurante.reservations", { reservation_id: 1 })
sh.status() // Verify shard, database, and collections

```