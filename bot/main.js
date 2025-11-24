// /bot/main.js
// -------------------------------------------------------
// Servidor Express local para pruebas del webhook.
// -------------------------------------------------------

import express from "express";
import bodyParser from "body-parser";
import webhook from "./webhook.js";

const app = express();
app.use(bodyParser.json());

// Rutas del webhook oficial
app.get("/webhook", webhook);
app.post("/webhook", webhook);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Bot Inmobiliario escuchando en puerto ${PORT}`);
});

