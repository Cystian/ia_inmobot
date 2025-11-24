// /bot/services/apiClient.js
import axios from "axios";

const apiClient = axios.create({
  timeout: 8000
});

export default apiClient;

