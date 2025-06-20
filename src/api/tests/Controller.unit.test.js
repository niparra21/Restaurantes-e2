jest.mock('../../shared/elastic/elasticsearchClient', () => ({
  elasticClient: {
    index: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    bulk: jest.fn(),
    deleteByQuery: jest.fn()
  }
}));
jest.mock('../DAOFactory', () => jest.fn());
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashedpass') }));
jest.mock('axios');
jest.mock('../../shared/keycloak', () => {
  const originalModule = jest.requireActual('../../shared/keycloak');
  return {
    ...originalModule,
    getAdminToken: jest.fn().mockResolvedValue('admintoken'),
  };
});
jest.mock('../KeycloakService', () => ({
  updateKeycloakUser: jest.fn().mockImplementation(async () => {
    return { status: 200 };
  }),
  deleteKeycloakUser: jest.fn().mockImplementation(async () => {
    return { status: 204 };
  })
}));

// Redis mock setup
const mockRedisMethods = {
  del: jest.fn(),
  get: jest.fn().mockImplementation((key) => {
    if (key === 'user:cached') return JSON.stringify({ id: 'cached', username: 'cacheduser' });
    return null;
  }),
  setex: jest.fn()
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedisMethods));

const { 
  cloneUserToMongo,
  loginUser,
  registerUser,
  getUser,
  updateUser,
  deleteUser
} = require('../Controller');

describe('Authentication Controller Tests', () => {
  let req, res, postgresUserDAO, mongoUserDAO, mockAxios;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default request and response objects
    req = { body: {}, params: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Setup DAO mocks
    postgresUserDAO = {
      getUserByKeycloakId: jest.fn(),
      findUserByEmailOrUsername: jest.fn().mockResolvedValue([]),
      createUser: jest.fn(),
      findUserById: jest.fn(),
      findUserByKeycloakId: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn()
    };

    mongoUserDAO = {
      createUser: jest.fn().mockResolvedValue({
        _id: 'mongo123',
        username: 'testuser',
        email: 'test@mail.com',
        role: 'user',
        keycloak_id: 'keycloak123'
      }),
      findUserByKeycloakId: jest.fn(),
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn()
    };

    // Mock DAOFactory to return appropriate DAOs
    require('../DAOFactory').mockImplementation((dbType) => {
      if (dbType === 'postgres') return { userDAO: postgresUserDAO };
      if (dbType === 'mongo') return { userDAO: mongoUserDAO };
      return {};
    });

    // Setup axios mock
    mockAxios = require('axios');
    mockAxios.post.mockResolvedValue({
      headers: { location: '/users/keycloak123' },
      data: { access_token: 'token123', refresh_token: 'refresh123' }
    });
    mockAxios.get.mockResolvedValue({ data: { id: 'roleid', name: 'admin' } });

    // Environment variables
    process.env.DB_TYPE = 'postgres';
    process.env.KEYCLOAK_URL = 'http://keycloak:8080';
    process.env.KEYCLOAK_REALM = 'test-realm';
    process.env.KEYCLOAK_CLIENT_ID = 'test-client';
    process.env.EXPIRATION_TIME = '3600';
  });

  describe('cloneUserToMongo', () => {
    it('should clone user from Postgres to MongoDB successfully', async () => {
      req.body = { keycloak_id: 'keycloak123' };
      postgresUserDAO.getUserByKeycloakId.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashedpass',
        email: 'test@mail.com',
        role: 'user',
        keycloak_id: 'keycloak123'
      });

      await cloneUserToMongo(req, res);

      expect(postgresUserDAO.getUserByKeycloakId).toHaveBeenCalledWith('keycloak123');
      expect(mongoUserDAO.createUser).toHaveBeenCalledWith(
        'testuser', 'hashedpass', 'test@mail.com', 'user', 'keycloak123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario clonado exitosamente en MongoDB",
        user: {
          id: 'mongo123',
          username: 'testuser',
          email: 'test@mail.com',
          role: 'user',
          keycloak_id: 'keycloak123'
        }
      });
    });

    it('should return 400 if keycloak_id is missing', async () => {
      req.body = {};
      await cloneUserToMongo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Se requiere el keycloak_id" });
    });

    it('should return 404 if user not found in Postgres', async () => {
      req.body = { keycloak_id: 'nonexistent' };
      postgresUserDAO.getUserByKeycloakId.mockResolvedValue(null);
      await cloneUserToMongo(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado en PostgreSQL" });
    });

    it('should handle errors during cloning', async () => {
      req.body = { keycloak_id: 'keycloak123' };
      postgresUserDAO.getUserByKeycloakId.mockRejectedValue(new Error('DB Error'));
      await cloneUserToMongo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      req.body = { username: 'testuser', password: 'testpass' };
      await loginUser(req, res);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://keycloak:8080/realms/test-realm/protocol/openid-connect/token',
        expect.any(URLSearchParams),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      expect(res.json).toHaveBeenCalledWith({
        access_token: 'token123',
        refresh_token: 'refresh123'
      });
    });

    it('should handle login errors with response data', async () => {
      req.body = { username: 'testuser', password: 'wrongpass' };
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { error: 'invalid_grant' } }
      });
      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error de autenticación',
        error: { error: 'invalid_grant' }
      });
    });

    it('should handle login errors without response data', async () => {
      req.body = { username: 'testuser', password: 'any' };
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error de autenticación',
        error: 'Network Error'
      });
    });
    
    it('should return 400 if username is missing', async () => {
      req.body = { password: 'testpass' };
      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Faltan campos obligatorios'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { username: 'testuser' };
      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Faltan campos obligatorios'
      });
    });
  });

  describe('registerUser', () => {
    it('should register user successfully', async () => {
      req.body = {
        username: 'newuser',
        password: '123456',
        email: 'new@mail.com',
        role: 'user'
      };

      // Mock the location header to return consistent keycloak ID
      mockAxios.post.mockResolvedValueOnce({
        headers: { location: '/users/keycloak123' }
      });

      postgresUserDAO.createUser.mockResolvedValue({
        id: 2,
        username: 'newuser',
        email: 'new@mail.com',
        role: 'user',
        keycloak_id: 'keycloak123'
      });

      await registerUser(req, res);

      expect(postgresUserDAO.createUser).toHaveBeenCalledWith(
        'newuser', 'hashedpass', 'new@mail.com', 'user', 'keycloak123'
      );
      expect(mockRedisMethods.del).toHaveBeenCalledWith('user:keycloak123');
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getUser', () => {
    it('should fetch from database and cache when not in cache', async () => {
      req.user = { id: 'dbuser' };
      postgresUserDAO.findUserByKeycloakId.mockResolvedValue({
        id: 3,
        username: 'dbuser',
        email: 'db@mail.com',
        role: 'user',
        keycloak_id: 'dbuser'
      });

      await getUser(req, res);

      expect(postgresUserDAO.findUserByKeycloakId).toHaveBeenCalledWith('dbuser');
      expect(mockRedisMethods.setex).toHaveBeenCalledWith(
        'user:dbuser',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should return 404 if user not found', async () => {
      req.user = { id: 'nonexistent' };
      postgresUserDAO.findUserByKeycloakId.mockResolvedValue(null);
      await getUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      req.params = { id: '1' };
      req.body = { email: 'updated@mail.com', role: 'admin' };
      
      // Mock user lookup
      postgresUserDAO.findUserById.mockResolvedValue({
        id: 1,
        keycloak_id: 'keycloak123',
        email: 'old@mail.com',
        role: 'user'
      });
      
      // Mock update response
      postgresUserDAO.updateUser.mockResolvedValue({
        id: 1,
        email: 'updated@mail.com',
        role: 'admin',
        keycloak_id: 'keycloak123'
      });

      await updateUser(req, res);

      // Get the mocked KeycloakService
      const KeycloakService = require('../KeycloakService');
      expect(KeycloakService.updateKeycloakUser).toHaveBeenCalled();
      expect(KeycloakService.updateKeycloakUser).toHaveBeenCalledWith(
        'keycloak123',
        'updated@mail.com',
        'admin',
        'admintoken'
      );
      expect(mockRedisMethods.del).toHaveBeenCalledWith('user:keycloak123');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      req.params = { id: '1' };
      
      // Mock user lookup
      postgresUserDAO.findUserById.mockResolvedValue({
        id: 1,
        keycloak_id: 'keycloak123'
      });
      
      // Mock delete response
      postgresUserDAO.deleteUser.mockResolvedValue({
        id: 1,
        keycloak_id: 'keycloak123'
      });
      
      await deleteUser(req, res);

      // Get the mocked KeycloakService
      const KeycloakService = require('../KeycloakService');
      expect(KeycloakService.deleteKeycloakUser).toHaveBeenCalled();
      expect(KeycloakService.deleteKeycloakUser).toHaveBeenCalledWith(
        'keycloak123',
        'admintoken'
      );
      expect(mockRedisMethods.del).toHaveBeenCalledWith('user:keycloak123');
    });
  });
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});