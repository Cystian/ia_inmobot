import express from "express";
import interpretar from "./api/ia/interpretar.js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Ruta principal de IA
app.post("/ia/interpretar", interpretar);

app.get("/", (req, res) => {
  res.send("API IA funcionando correctamente");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor IA listo en puerto " + PORT));

