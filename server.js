/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

/**
 * this code is the main entry point for a Node.js application that uses Express.js to create a 
 * RESTful API. 
 */
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const routes = require("./src/apiFiles/Routes");
const { keycloak, memoryStore } = require("./src/apiFiles/keycloak");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

//sesión para Keycloak
app.use(session({
    secret: "some-secret", 
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

app.use(keycloak.middleware()); 

app.use("/api", routes);


app.get("/", (req, res) => {
    res.send("API funcionando correctamente!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
