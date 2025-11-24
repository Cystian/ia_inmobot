// /bot/controllers/ayudaController.js
import { MENSAJES } from "../utils/messages.js";

const ayudaController = {
  generica(contexto = {}) {
    const raw = contexto.rawMessage;

    return (
      "Te ayudo con mucho gusto 😊.\n\n" +
      MENSAJES.ayuda_generica +
      (raw
        ? `\n\nSobre lo que me comentas: "${raw}", dime si buscas *casa, departamento o terreno* ` +
          "y en qué zona para ofrecerte opciones aterrizadas a tu necesidad. 🏡💬"
        : "")
    );
  }
};

export default ayudaController;

