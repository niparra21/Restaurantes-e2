const { ObjectId } = require('mongodb');

class MenuDAOMongo {
    constructor(db) {
        this.collection = db.collection('menus');
    }

    async registerMenu(restaurantID, name, description) {
        try {
            const result = await this.collection.insertOne({
                restaurant_id: new ObjectId(restaurantID),
                name,
                description,
                created_at: new Date(),
                updated_at: new Date()
            });

            return await this.collection.findOne({ _id: result.insertedId });
        } catch (error) {
            console.error("Error al registrar menú en MongoDB:", error);
            throw error;
        }
    }

    async getMenu(id) {
        try {
            return await this.collection.findOne(
                { _id: new ObjectId(id) },
                {
                    projection: {
                        _id: 1,
                        restaurant_id: 1,
                        name: 1,
                        description: 1
                    }
                }
            );
        } catch (error) {
            console.error("Error al obtener menú en MongoDB:", error);
            throw error;
        }
    }

    async updateMenu(id, restaurantID, name, description) {
        try {
            const result = await this.collection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        restaurant_id: new ObjectId(restaurantID),
                        name,
                        description,
                        updated_at: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                throw new Error("Menú no encontrado");
            }

            return await this.getMenu(id);
        } catch (error) {
            console.error("Error al actualizar menú en MongoDB:", error);
            throw error;
        }
    }

    async deleteMenu(id) {
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                throw new Error("Menú no encontrado");
            }

            return { _id: id }; 
        } catch (error) {
            console.error("Error al eliminar menú en MongoDB:", error);
            throw error;
        }
    }
}

module.exports = MenuDAOMongo;
