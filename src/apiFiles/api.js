import axios from 'axios';

const API_URL = 'http://localhost:5173/api';

const api = axios.create({
    baseURL: API_URL,
});

export const registerUser  = (userData) => api.post('/auth/register', userData);
export const loginUser  = (credentials) => api.post('/auth/login', credentials);
export const fetchRestaurants = () => api.get('/restaurants');
export const fetchMenus = (restaurantId) => api.get(`/menus?restaurantId=${restaurantId}`);
export const createReservation = (reservationData) => api.post('/reservations', reservationData);
export const createOrder = (orderData) => api.post('/orders', orderData);