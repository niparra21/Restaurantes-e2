# 🍽️ Sistema de Reservación de Restaurantes

El sistema de reservación de restaurantes es una plataforma digital basada en una arquitectura de microservicios que permite gestionar de manera eficiente y segura las operaciones relacionadas con la administración de restaurantes, reservas, menús, órdenes y usuarios. Mediante el uso de tecnologías modernas, como bases de datos relacionales y NoSQL, motores de búsqueda, cacheo y balanceo de carga, el sistema facilita la creación, consulta y modificación de datos en tiempo real, ofreciendo una experiencia ágil y escalable tanto para los administradores como para los clientes. Además, incorpora mecanismos de autenticación, búsqueda avanzada y automatización de procesos para garantizar alta disponibilidad, rendimiento y facilidad de mantenimiento.

***Autoras***
* Mariann Marín Barquero
* Nicole Parra Valverde
* Stephanie Sandoval Camacho

## 📦 Ejemplos de Uso
A continuación, se presentan algunos ejemplos de cómo interactuar con la API REST y el servidor de búsquedas utilizando MongoDB como base de datos.

### 1. Registro de un nuevo usuario
**POST** `http://localhost:5000/api/auth/register`

**Body:**
``` json
{
    "username": "username",
    "password": "password",
    "email": "username@email.com",
    "role": "admin"
}
```
**Respuesta:**
``` json
{
    "id": "682a92feb09d8e9100d04816",
    "username": "username",
    "email": "username@email.com",
    "role": "admin",
    "keycloak_id": "32f18ebd-008d-45c5-872d-334084191a99"
}
```

### 2. Login de un usuario registrado
**POST** `http://localhost:5000/api/auth/login`

**Body:**
``` json
{
    "username": "username",
    "password": "password"
}
```

**Notas sobre la entrada:**
- La entrada debe tener tanto `username` como `password`.
- Ambos campos deben ser tipo string.
- Los datos del usuario deben haber sido registrados previamente en el sistema.

**Respuesta:**
``` json
{
    "access_token": "...",
    "refresh_token": "..."
}
```

**Notas sobre la salida:**
- La salida debe tener tanto `access_token` como `refresh_token`.
- El `access_token` se utiliza para permitir la entrada a los demás endpoints, según rol definido.
- El `refresh_token` no se utiliza actualmente en el sistema. Cuando el token expira, el usuario debe volver a iniciar sesión.

**Posibles códigos de respuesta:**
- `200 OK`: Si la entrada es válida.
- `401 Unauthorized`: Si la entrada es inválida.

### 3. Obtener información de usuario actual
**GET** `http://localhost:5000/api/users/me`

**Respuesta:**
``` json
{
    "_id": "682a92feb09d8e9100d04816",
    "username": "username",
    "password": "$2b$10$ZAjkTra4.fgD9MM1EmRtC.Z7oRBjF8I6dn8Xv1ehnn4v4aOr.Mw0a",
    "email": "username@email.com",
    "role": "admin",
    "keycloak_id": "32f18ebd-008d-45c5-872d-334084191a99",
    "created_at": "2025-05-19T02:10:06.969Z",
    "updated_at": "2025-05-19T02:10:06.969Z"
}
```

### 4. Actualizar la información del usuario
**PUT** `http://localhost:5000/api/users/682a92feb09d8e9100d04816`

**Body:**
``` json
{
    "email": "username@gmail.com",
    "role": "admin"
}
```

**Respuesta:**
``` json
{
    "_id": "682a92feb09d8e9100d04816",
    "username": "username",
    "password": "$2b$10$ZAjkTra4.fgD9MM1EmRtC.Z7oRBjF8I6dn8Xv1ehnn4v4aOr.Mw0a",
    "email": "username@gmail.com",
    "role": "admin",
    "keycloak_id": "32f18ebd-008d-45c5-872d-334084191a99",
    "created_at": "2025-05-19T02:10:06.969Z",
    "updated_at": "2025-05-19T02:13:42.808Z"
}
```

### 5. Eliminar la cuenta del usuario
**DELETE** `http://localhost:5000/api/users/682a92feb09d8e9100d04816`

**Respuesta:**
``` json
{
    "message": "Usuario eliminado correctamente",
    "user": {
        "_id": "682a92feb09d8e9100d04816",
        "username": "username",
        "password": "$2b$10$ZAjkTra4.fgD9MM1EmRtC.Z7oRBjF8I6dn8Xv1ehnn4v4aOr.Mw0a",
        "email": "username@gmail.com",
        "role": "admin",
        "keycloak_id": "32f18ebd-008d-45c5-872d-334084191a99",
        "created_at": "2025-05-19T02:10:06.969Z",
        "updated_at": "2025-05-19T02:13:42.808Z"
    }
}
```

### 6. Registro de un nuevo restaurante
**POST** `http://localhost:5000/api/restaurants`

**Body:**
``` json
{
    "name": "Ristorante La Tavola",
    "address": "Rua San Marco 45, Jardim Europa",
    "phone": "+5511944433221",
    "owner_id": "682984596fc5d5e8c1c6c082"
}
```

**Respuesta:**
``` json
{
    "_id": "682a9561b09d8e9100d04817",
    "name": "Ristorante La Tavola",
    "address": "Rua San Marco 45, Jardim Europa",
    "phone": "+5511944433221",
    "owner_id": "682984596fc5d5e8c1c6c082",
    "created_at": "2025-05-19T02:20:17.112Z",
    "updated_at": "2025-05-19T02:20:17.112Z"
}
```

### 7. Obtener todos los restaurantes
**GET** `http://localhost:5000/api/restaurants`

**Respuesta:**
``` json
[
    {
        "_id": "682a9561b09d8e9100d04817",
        "name": "Ristorante La Tavola",
        "address": "Rua San Marco 45, Jardim Europa",
        "phone": "+5511944433221",
        "owner_id": "682984596fc5d5e8c1c6c082"
    }
]
```

### 8. Registro de un nuevo menú
**POST** `http://localhost:5000/api/menus`

**Body:**
``` json
{
    "restaurant_id": "682a9561b09d8e9100d04817",
    "name": "Degustazione Toscana",
    "description": "A curated journey through Tuscany’s rustic cuisine — featuring hearty ribollita, Florentine steak, pecorino pairings, and Chianti-infused delicacies"
}
```

**Respuesta:**
``` json
{
    "_id": "682a9607b09d8e9100d04819",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "name": "Degustazione Toscana",
    "description": "A curated journey through Tuscany’s rustic cuisine — featuring hearty ribollita, Florentine steak, pecorino pairings, and Chianti-infused delicacies",
    "created_at": "2025-05-19T02:23:03.879Z",
    "updated_at": "2025-05-19T02:23:03.879Z"
}
```

### 9. Obtener un menú existente por su ID
**GET** `http://localhost:5000/api/menus/682a9607b09d8e9100d04819`

**Respuesta:**
``` json
{
    "_id": "682a9607b09d8e9100d04819",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "name": "Degustazione Toscana",
    "description": "A curated journey through Tuscany’s rustic cuisine — featuring hearty ribollita, Florentine steak, pecorino pairings, and Chianti-infused delicacies"
}
```

### 10. Actualizar un menú existente por su ID
**PUT** `http://localhost:5000/api/menus/682a9561b09d8e9100d04817`

**Body:**
``` json
{
    "restaurant_id": "682a9561b09d8e9100d04817",
    "name": "Degustazione Toscana !!!",
    "description": "Traditional Sicilian flavors with a modern twist — featuring seafood pastas, arancini, and citrus-infused delights from the heart of the Mediterranean"
}
```

**Respuesta:**
``` json
{
    "_id": "682a9607b09d8e9100d04819",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "name": "Degustazione Toscana !!!",
    "description": "Traditional Sicilian flavors with a modern twist — featuring seafood pastas, arancini, and citrus-infused delights from the heart of the Mediterranean"
}
```

### 11. Eliminar un menú existente por su ID
**DELETE** `http://localhost:5000/api/menus/682a9561b09d8e9100d04817`

**Respuesta:**
``` json
{
    "message": "Menú eliminado correctamente.",
    "menu": {
        "_id": "682a9607b09d8e9100d04819",
        "restaurant_id": "682a9561b09d8e9100d04817",
        "name": "Degustazione Toscana !!!",
        "description": "Traditional Sicilian flavors with a modern twist — featuring seafood pastas, arancini, and citrus-infused delights from the heart of the Mediterranean",
        "created_at": "2025-05-19T02:23:03.879Z",
        "updated_at": "2025-05-19T02:25:06.134Z"
    }
}
```

### 12. Registro de una nueva reservación
**POST** `http://localhost:5000/api/reservations`

**Body:**
``` json
{
    "user_id": "682984596fc5d5e8c1c6c082",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "reservation_time": "2025-06-06T22:30:00"
}
```

**Respuesta:**
``` json
{
    "_id": "682a9a9b73dfd70fa993db87",
    "user_id": "682984596fc5d5e8c1c6c082",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "reservation_time": "2025-06-06T22:30:00.000Z",
    "created_at": "2025-05-19T02:42:35.904Z",
    "updated_at": "2025-05-19T02:42:35.904Z"
}
```

### 13. Obtener una reservación existente por su ID
**GET** `http://localhost:5000/api/reservations/682a9a9b73dfd70fa993db87`

**Respuesta:**
``` json
{
    "_id": "682a9a9b73dfd70fa993db87",
    "user_id": "682984596fc5d5e8c1c6c082",
    "reservation_time": "2025-06-06T22:30:00.000Z",
    "created_at": "2025-05-19T02:42:35.904Z",
    "updated_at": "2025-05-19T02:42:35.904Z"
}
```

### 14. Eliminar una reservación existente por su ID
**DELETE** `http://localhost:5000/api/reservations/682a9a9b73dfd70fa993db87`

**Respuesta:**
``` json
{
    "message": "Reservación eliminada correctamente.",
    "reservation": {
        "_id": "682a9a9b73dfd70fa993db87",
        "user_id": "682984596fc5d5e8c1c6c082",
        "restaurant_id": "682a9561b09d8e9100d04817",
        "reservation_time": "2025-06-06T22:30:00.000Z",
        "created_at": "2025-05-19T02:42:35.904Z",
        "updated_at": "2025-05-19T02:42:35.904Z"
    }
}
```

### 15. Registro de una orden nueva
**POST** `http://localhost:5000/api/orders`

**Body:**
``` json
{
    "user_id": "682984596fc5d5e8c1c6c082", 
    "restaurant_id": "682a9561b09d8e9100d04817", 
    "menu_id": "682a9a7973dfd70fa993db85", 
    "order_time":"2025-03-28T20:30:00",
    "status": "En progreso"
}
```

**Respuesta:**
``` json
{
    "_id": "682a9a8173dfd70fa993db86",
    "user_id": "682984596fc5d5e8c1c6c082",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "menu_id": "682a9a7973dfd70fa993db85",
    "order_time": "2025-03-28T20:30:00.000Z",
    "status": "En progreso",
    "created_at": "2025-05-19T02:42:09.140Z",
    "updated_at": "2025-05-19T02:42:09.140Z"
}
```

### 16. Obtener una orden existente por su ID

**GET** `http://localhost:5000/api/orders/682a9a8173dfd70fa993db86`

**Respuesta:**
``` json
{
    "_id": "682a9a8173dfd70fa993db86",
    "user_id": "682984596fc5d5e8c1c6c082",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "menu_id": "682a9a7973dfd70fa993db85",
    "order_time": "2025-03-28T20:30:00.000Z",
    "status": "En progreso"
}
```

### 17. Registro de un producto nuevo
**POST** `http://localhost:5000/api/products`

**Body:**
``` json
{
    "name": "Cannoli Siciliani",
    "price": 7.25,
    "category": "Postre",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "is_active": true
}
```

**Respuesta:**
``` json
{
    "_id": "682a9c2273dfd70fa993db88",
    "name": "Cannoli Siciliani",
    "description": "Producto sin descripción",
    "price": 7.25,
    "category": "Postre",
    "restaurant_id": "682a9561b09d8e9100d04817",
    "is_active": true,
    "created_at": "2025-05-19T02:49:06.124Z",
    "updated_at": "2025-05-19T02:49:06.124Z"
}
```

### 18. Obtener todos los productos
**GET** `http://localhost:5000/api/products`

**Respuesta:**
``` json
[
    {
        "_id": "682a9c2273dfd70fa993db88",
        "name": "Cannoli Siciliani",
        "description": "Producto sin descripción",
        "price": 7.25,
        "category": "Postre",
        "restaurant_id": "682a9561b09d8e9100d04817",
        "is_active": true
    }
]
```

### 19. Eliminar un producto existente por su ID
**DELETE** `http://localhost:5000/api/products/682a9c2273dfd70fa993db88`

**Respuesta:**
``` json
{
    "message": "Producto eliminado correctamente.",
    "product": {
        "_id": "682a9c2273dfd70fa993db88",
        "name": "Cannoli Siciliani",
        "description": "Producto sin descripción",
        "price": 7.25,
        "category": "Postre",
        "restaurant_id": "682a9561b09d8e9100d04817",
        "is_active": true,
        "created_at": "2025-05-19T02:49:06.124Z",
        "updated_at": "2025-05-19T02:49:06.124Z"
    }
}
```

Para los siguientes ejemplos, la base de datos se llenó con un par de productos para facilitar la comprensión de los ejemplos. Los productos dentro de la base son:

``` json
[
    {
        "_id": "682a142baebf7d1b8b96438d",
        "name": "Tiramisù Classico",
        "description": "Tradicional postre italiano con capas de bizcocho empapado en café, crema de mascarpone y cacao amargo",
        "price": 8.5,
        "category": "Postre",
        "restaurant_id": "682a042bab7c2b9f3224728b",
        "is_active": true
    },
    {
        "_id": "682a18532940e88b016d04fc",
        "name": "Lasagna alla Bolognese",
        "description": "Capas de pasta fresca con ragù de carne, bechamel cremosa y queso Parmigiano-Reggiano gratinado al horno",
        "price": 17.5,
        "category": "Pasta",
        "restaurant_id": "000000012940e88b016d04fb",
        "is_active": true
    },
    {
        "_id": "682a18642940e88b016d04fe",
        "name": "Spaghetti alla Carbonara",
        "description": "Spaghetti al dente con salsa cremosa de huevo, guanciale, queso Pecorino Romano y pimienta negra",
        "price": 16.8,
        "category": "Pasta",
        "restaurant_id": "000000012940e88b016d04fd",
        "is_active": true
    },
    {
        "_id": "682a29d8debebd623cd012b5",
        "name": "Bruschetta al Pomodoro",
        "description": "Tostadas de pan rústico con tomate fresco, ajo, albahaca y aceite de oliva virgen extra",
        "price": 7.95,
        "category": "Entrante",
        "restaurant_id": "00000001debebd623cd012b4",
        "is_active": true
    },
    {
        "_id": "682a9cb673dfd70fa993db89",
        "name": "Cannoli Siciliani",
        "description": "Producto sin descripción",
        "price": 7.25,
        "category": "Postre",
        "restaurant_id": "682a9561b09d8e9100d04817",
        "is_active": true
    }
]
```

### 20. Búsqueda de producto por término
**GET** `http://localhost:5001/search/products?q=tomate`

**Params:** q, category

**Respuesta:**
``` json
[
    {
        "name": "Bruschetta al Pomodoro",
        "description": "Tostadas de pan rústico con tomate fresco, ajo, albahaca y aceite de oliva virgen extra",
        "category": "Entrante",
        "restaurant_id": "00000001debebd623cd012b4"
    }
]
```

### 21. Búsqueda de producto por categoría
**GET** `http://localhost:5001/search/products/category/Postre`

**Respuesta:**
``` json
[
    {
        "name": "Tiramisù Classico",
        "description": "Tradicional postre italiano con capas de bizcocho empapado en café, crema de mascarpone y cacao amargo",
        "category": "Postre",
        "restaurant_id": "682a042bab7c2b9f3224728b"
    },
    {
        "name": "Cannoli Siciliani",
        "description": "Producto sin descripción",
        "category": "Postre",
        "restaurant_id": "682a9561b09d8e9100d04817"
    }
]
```

### 22. Reindexar productos en ElasticSearch
**POST** `http://localhost:5001/search/reindex`

**Respuesta:**
``` json
{
    "success": true,
    "message": "▫️  Reindexación completada. 5 productos procesados."
}
```