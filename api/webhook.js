import handlerBot from "../bot/controllers/botController.js";

export default function handler(req, res) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  if (req.method === "POST") {
    return handlerBot(req, res);
  }
}
