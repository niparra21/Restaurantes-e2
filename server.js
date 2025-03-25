const express = require("express");
const cors = require("cors");
const routes = require("./src/apiFiles/Routes");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", routes);

app.get("/", (req, res) => {
    res.send("🚀 API funcionando correctamente!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
