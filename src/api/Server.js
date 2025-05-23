/* Tecnologico de Costa Rica | IC-4302 Bases de Datos II | Escuela de Computacion
 * Mariann Marin Barquero    | Nicole Parra Valverde     | Stephanie Sandoval Camacho
 * I Semestre - 2025
 */

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const routes = require("./Routes");
const { keycloak, memoryStore } = require("./shared/keycloak");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Sesión para Keycloak
app.use(session({
    secret: "some-secret", 
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

app.use(keycloak.middleware());

app.use("/api", routes);

app.get("/", (req, res) => {
    res.send("API principal funcionando correctamente!");
});

const PORT = process.env.API_PORT || 5000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🔸 API principal corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('🔸 Error iniciando API principal:', error.message);
    process.exit(1);
  }
};

startServer();