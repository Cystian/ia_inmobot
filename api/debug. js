export default async function handler(req, res) {
  return res.status(200).json({
    mensaje: "Debug activo",
    GROQ_API_KEY: process.env.GROQ_API_KEY ? "SI" : "NO",
    DB_HOST: process.env.DB_HOST || "NO DETECTADO",
    entorno: process.env.VERCEL_ENV || "SIN_ENV"
  });
}