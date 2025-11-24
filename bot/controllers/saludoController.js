// /bot/controllers/saludoController.js
import { MENSAJES } from "../utils/messages.js";

const saludoController = {
  saludar() {
    return MENSAJES.saludo_inicial;
  }
};

export default saludoController;

