/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const request = require('supertest');
const express = require('express');
const router = require('./Routes');

jest.mock('../shared/Middleware', () => ({
  authenticateJWT: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
  canEdit: (req, res, next) => next(),
}));

const controller = require('./Controller');

jest.mock('./Controller', () => ({
  registerUser: jest.fn((req, res) => {
    if (!req.body.password) {
      return res.status(400).json({ message: 'Contraseña requerida' });
    }
    return res.status(201).json({ message: 'Usuario registrado' });
  }),
  loginUser: jest.fn((req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    return res.status(200).json({ token: 'fake-jwt-token' });
  }),
  getMenu: jest.fn((req, res) => {
    if (req.params.id === '999') {
      return res.status(404).json({ message: 'Menú no encontrado' });
    }
    return res.status(200).json({ id: req.params.id, name: 'Pizza' });
  }),
  getUser: jest.fn((req, res) => res.status(200).json({ id: 1, name: 'Juan' })),
  updateUser: jest.fn((req, res) => res.status(200).json({ message: 'Usuario actualizado' })),
  deleteUser: jest.fn((req, res) => res.status(200).json({ message: 'Usuario eliminado' })),
  registerMenu: jest.fn((req, res) => res.status(201).json({ message: 'Menú registrado' })),
  updateMenu: jest.fn((req, res) => res.status(200).json({ message: 'Menú actualizado' })),
  deleteMenu: jest.fn((req, res) => res.status(200).json({ message: 'Menú eliminado' })),
  getOrder: jest.fn((req, res) => res.status(200).json({ id: 1, status: 'Pendiente' })),
  registerRestaurant: jest.fn((req, res) => res.status(201).json({ message: 'Restaurante registrado' })),
  getRestaurants: jest.fn((req, res) => res.status(200).json([{ id: 1, name: 'La Trattoria' }])),
  registerReservation: jest.fn((req, res) => res.status(201).json({ message: 'Reservación creada' })),
  deleteReservation: jest.fn((req, res) => res.status(200).json({ message: 'Reservación eliminada' })),
  registerOrder: jest.fn((req, res) => res.status(201).json({ message: 'Orden creada' })),
  cloneUserToMongo: jest.fn((req, res) => res.status(201).json({ message: 'Usuario clonado' })),
  getReservation: jest.fn((req, res) => res.status(200).json({ id: 1, time: '2025-05-14T19:00' })),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('Pruebas de API', () => {
  test('POST /auth/register debería registrar un usuario', async () => {
    const response = await request(app).post('/auth/register').send({ username: 'test', password: '123456' });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Usuario registrado');
  });

  test('POST /auth/register debería fallar si falta la contraseña', async () => {
    const response = await request(app).post('/auth/register').send({ username: 'test' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Contraseña requerida');
  });

  test('POST /auth/login debería autenticar un usuario', async () => {
    const response = await request(app).post('/auth/login').send({ username: 'test', password: '123456' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('POST /auth/login debería fallar si no se proporciona contraseña', async () => {
    const response = await request(app).post('/auth/login').send({ username: 'test' });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciales inválidas');
  });

  test('GET /users/me debería devolver información del usuario', async () => {
    const response = await request(app).get('/users/me');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('PUT /users/:id debería actualizar un usuario', async () => {
    const response = await request(app).put('/users/1').send({ name: 'Nuevo Nombre' });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Usuario actualizado');
  });

  test('DELETE /users/:id debería eliminar un usuario', async () => {
    const response = await request(app).delete('/users/1');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Usuario eliminado');
  });

  test('POST /restaurants debería registrar un restaurante', async () => {
    const response = await request(app).post('/restaurants').send({
      name: 'Nuevo Restaurante',
      address: 'Calle 123',
      phone: '2222-3333',
      owner_id: 'user123'
    });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Restaurante registrado');
  });

  test('GET /restaurants debería listar restaurantes', async () => {
    const response = await request(app).get('/restaurants');
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('POST /menus debería registrar un menú', async () => {
    const response = await request(app).post('/menus').send({ name: 'Hamburguesa' });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Menú registrado');
  });

  test('GET /menus/:id debería obtener información del menú', async () => {
    const response = await request(app).get('/menus/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name');
  });

  test('GET /menus/:id debería devolver 404 si el menú no existe', async () => {
    const response = await request(app).get('/menus/999');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Menú no encontrado');
  });

  test('PUT /menus/:id debería actualizar un menú', async () => {
    const response = await request(app).put('/menus/1').send({
      restaurant_id: 'rest1',
      name: 'Combo Especial',
      description: 'Menú actualizado'
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Menú actualizado');
  });

  test('DELETE /menus/:id debería eliminar un menú', async () => {
    const response = await request(app).delete('/menus/1');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Menú eliminado');
  });

  test('GET /orders/:id debería obtener un pedido', async () => {
    const response = await request(app).get('/orders/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  test('GET /no-existe debería devolver 404', async () => {
    const response = await request(app).get('/no-existe');
    expect(response.status).toBe(404);
  });
});
