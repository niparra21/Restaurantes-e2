const request = require('supertest');
const express = require('express');
const router = require('./Routes');

jest.mock('./Middleware', () => ({
  authenticateJWT: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
  canEdit: (req, res, next) => next(),
}));

jest.mock('./Controller', () => ({
    registerUser: jest.fn((req, res) => res.status(201).json({ message: 'Usuario registrado' })),
    loginUser: jest.fn((req, res) => res.status(200).json({ token: 'fake-jwt-token' })),
    getUser: jest.fn((req, res) => res.status(200).json({ id: 1, name: 'Juan' })),
    updateUser: jest.fn((req, res) => res.status(200).json({ message: 'Usuario actualizado' })),
    deleteUser: jest.fn((req, res) => res.status(200).json({ message: 'Usuario eliminado' })),
    registerMenu: jest.fn((req, res) => res.status(201).json({ message: 'Menú registrado' })),
    getMenu: jest.fn((req, res) => res.status(200).json({ id: 1, name: 'Pizza' })),
    updateMenu: jest.fn((req, res) => res.status(200).json({ message: 'Menú actualizado' })),
    deleteMenu: jest.fn((req, res) => res.status(200).json({ message: 'Menú eliminado' })),
    getOrder: jest.fn((req, res) => res.status(200).json({ id: 1, status: 'Pendiente' })),
    registerRestaurant: jest.fn((req, res) => res.status(201).json({ message: 'Restaurante registrado' })),
    getRestaurants: jest.fn((req, res) => res.status(200).json([{ id: 1, name: 'La Trattoria' }])),
    registerReservation: jest.fn((req, res) => res.status(201).json({ message: 'Reservación creada' })),
    deleteReservation: jest.fn((req, res) => res.status(200).json({ message: 'Reservación eliminada' })), 
    registerOrder: jest.fn((req, res) => res.status(201).json({ message: 'Orden creada' })), 
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

  test('POST /auth/login debería autenticar un usuario', async () => {
    const response = await request(app).post('/auth/login').send({ username: 'test', password: '123456' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
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
    const response = await request(app).post('/restaurants').send({ name: 'Nuevo Restaurante' });
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

  test('PUT /menus/:id debería actualizar un menú', async () => {
    const response = await request(app).put('/menus/1').send({ name: 'Pizza Grande' });
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