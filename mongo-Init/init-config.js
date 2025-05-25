// This script initializes a MongoDB config server replica set.
rs.initiate({
    _id: "configReplSet",
    configsvr: true,
    members: [
      { _id: 0, host: "mongo-config1:27017" },
      { _id: 1, host: "mongo-config2:27017" },
      { _id: 2, host: "mongo-config3:27017" }
    ]
  });