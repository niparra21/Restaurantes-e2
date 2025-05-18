const dbPromise = require('../../db');
const { ObjectId } = require('mongodb');

class UserDAOMongo {
  
  async findUserByEmailOrUsername(email, username) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      return await collection.findOne({
        $or: [{ email }, { username }]
      });
    } catch (error) {
      console.error("Error al buscar usuario en MongoDB:", error);
      throw error;
    }
  }
  
  async createUser(username, hashedPassword, email, role, keycloakId) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      const result = await collection.insertOne({
        username,
        password: hashedPassword,
        email,
        role,
        keycloak_id: keycloakId,
        created_at: new Date(),
        updated_at: new Date()
      });
      return await this.findUserById(result.insertedId);
    } catch (error) {
      console.error("Error al crear usuario en MongoDB:", error);
      throw error;
    }
  }
  
  async findUserById(userId) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      return await collection.findOne({ _id: new ObjectId(userId) });
    } catch (error) {
      console.error("Error al buscar usuario por ID en MongoDB:", error);
      throw error;
    }
  }

  async findUserByKeycloakId(keycloakId) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      return await collection.findOne({ keycloak_id: keycloakId });
    } catch (error) {
      console.error("Error al buscar usuario por Keycloak ID en MongoDB:", error);
      throw error;
    }
  }
  
  async updateUser(userId, email, role) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { email, role, updated_at: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new Error("Usuario no encontrado");
      }
      return await this.findUserById(userId);
    } catch (error) {
      console.error("Error al actualizar usuario en MongoDB:", error);
      throw error;
    }
  }
  
  async deleteUser(userId) {
    try {
      const db = await dbPromise;
      const collection = db.collection('users');
      const result = await collection.findOneAndDelete({ _id: new ObjectId(userId) });
      if (!result) {
        throw new Error("Usuario no encontrado");
      }
      return result;
    } catch (error) {
      console.error("Error al eliminar usuario en MongoDB:", error);
      throw error;
    }
  }
}

module.exports = UserDAOMongo;
