import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ SSR guard — localStorage doesn't exist on server
const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

const setToken = (token: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('accessToken', token)
}

const clearToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
}

// Request interceptor — attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // ✅ Handle both 401 (no token) and 403 (expired/invalid token)
    const shouldRetry =
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry

    if (shouldRetry) {
      originalRequest._retry = true

      try {
        const response = await api.post('/auth/refresh-token')
        const { accessToken } = response.data

        if (accessToken) {
          setToken(accessToken)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch {
        clearToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api