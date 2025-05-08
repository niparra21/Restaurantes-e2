//initiate a shard replica set
rs.initiate({
    _id: "mongors1",
    members: [
      { _id: 0, host: "mongors1n1:27017" },
      { _id: 1, host: "mongors1n2:27017" },
      { _id: 2, host: "mongors1n3:27017" }
    ]
  });
  