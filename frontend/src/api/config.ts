// API base URL - reads from .env VITE_API_URL or defaults to local backend
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
