import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js: js
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,  // Añade todas las variables globales de Node.js
        ...globals.jest   // Añade todas las variables globales de Jest
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      // Tus reglas personalizadas aquí
      "no-unused-vars": "warn",
      "no-console": "off"
    }
  },
  {
    // Configuración específica para tests
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
]);