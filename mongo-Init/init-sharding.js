const admin = db.getSiblingDB("admin");

admin.runCommand({ addShard: "mongors1/mongors1n1:27017,mongors1n2:27017,mongors1n3:27017" });
admin.runCommand({ enableSharding: "Restaurante" });

db = db.getSiblingDB("Restaurante");
db.createCollection("products");
db.createCollection("reservations");

admin.runCommand({ shardCollection: "Restaurante.products", key: { product_id: 1 } });
admin.runCommand({ shardCollection: "Restaurante.reservations", key: { reservation_id: 1 } });
