// /bot/utils/sendMessage.js
import axios from "axios";
import {
  META_ACCESS_TOKEN,
  META_PHONE_NUMBER_ID
} from "../config/env.js";
import { logError, logInfo } from "./log.js";

export default async function sendMessage(to, message) {
  try {
    const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;

    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    logInfo("sendMessage", { to, status: "enviado" });
  } catch (err) {
    logError("sendMessage", err.response?.data || err.message);
  }
}

