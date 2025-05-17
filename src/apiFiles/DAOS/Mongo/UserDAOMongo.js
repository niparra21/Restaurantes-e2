/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/*
This code is a MongoDB Data Access Object (DAO) for managing users in a restaurant application.
it provides methods to create, retrieve, update, and delete users from the MongoDB database.
*/ 

const { ObjectId } = require('mongodb');

class UserDAOMongo {
    constructor(db) {
        this.collection = db.collection('users');
    }

    async findUserByEmailOrUsername(email, username) {
        try {
            return await this.collection.findOne({
                $or: [{ email }, { username }]
            });
        } catch (error) {
            console.error("Error al buscar usuario en MongoDB:", error);
            throw error;
        }
    }

    async createUser(username, hashedPassword, email, role, keycloakId) {
        try {
            const result = await this.collection.insertOne({
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
            return await this.collection.findOne({ _id: new ObjectId(userId) });
        } catch (error) {
            console.error("Error al buscar usuario por ID en MongoDB:", error);
            throw error;
        }
    }

    async updateUser(userId, email, role) {
        try {
            const result = await this.collection.updateOne(
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
            const result = await this.collection.deleteOne({ _id: new ObjectId(userId) });
            if (result.deletedCount === 0) {
                throw new Error("Usuario no encontrado");
            }
        } catch (error) {
            console.error("Error al eliminar usuario en MongoDB:", error);
            throw error;
        }
    }
}

module.exports = UserDAOMongo;
