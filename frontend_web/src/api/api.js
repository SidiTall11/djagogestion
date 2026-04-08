import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/',
    timeout: 60000, // 60 secondes (le serveur gratuit peut prendre 50s à se réveiller)
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si l'erreur est 401 et que ce n'est pas déjà une tentative de refresh
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    const response = await axios.post(`${api.defaults.baseURL}auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    localStorage.setItem('access_token', access);

                    // Mettre à jour le header de la requête originale et la relancer
                    originalRequest.headers['Authorization'] = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    console.error("Échec du rafraîchissement du token :", refreshError);
                    // Si le refresh échoue, on déconnecte
                }
            }

            // Déconnexion forcée si pas de token ou échec du refresh
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
