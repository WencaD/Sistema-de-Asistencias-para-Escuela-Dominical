/**
 * IEBM - SERVIDOR PRINCIPAL
 * Inicializa el servidor Express y configura todas las rutas de la API
 * Puerto: 3000
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');

// Importar rutas de la API
const authRoutes = require('./routes/auth');        // Rutas de login/logout
const alumnosRoutes = require('./routes/alumnos');   // CRUD de estudiantes
const asistenciasRoutes = require('./routes/asistencias'); // Registro de asistencia
const reportesRoutes = require('./routes/reportes');  // Exportación de reportes

const app = express();
const PORT = process.env.PORT || 3000;

// Validar que JWT_SECRET esté configurado correctamente
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production-use-long-random-string') {
  console.error('❌ ERROR: JWT_SECRET no está configurado o usa el valor por defecto');
  console.error('Por favor, configura JWT_SECRET en tu archivo .env con un valor seguro');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // Detener en producción
  } else {
    console.warn('⚠️ ADVERTENCIA: Continuando en modo desarrollo con JWT_SECRET inseguro');
  }
}

// Configurar CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parsear JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones de usuario (mantiene el login activo)
app.use(session({
  secret: process.env.SESSION_SECRET || 'iebm_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // cambiar a true en producción con HTTPS
    maxAge: 24 * 60 * 60 * 1000 // Sesión válida por 24 horas
  }
}));

// Servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/img', express.static(path.join(__dirname, '../img')));

// Registrar todas las rutas de la API
app.use('/api/auth', authRoutes);        // POST /api/auth/login, /api/auth/logout
app.use('/api/alumnos', alumnosRoutes);   // GET/POST/PUT/DELETE /api/alumnos
app.use('/api/asistencias', asistenciasRoutes); // POST /api/asistencias/multiple
app.use('/api/reportes', reportesRoutes);  // GET /api/reportes

// Rutas de páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Manejo de errores global - captura cualquier error en la API
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Iniciar servidor Express
async function startServer() {
  try {
    // Conectar a MySQL y crear tablas
    await connectDB();
    console.log('✅ Conectado a MySQL');
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a MySQL. Ejecutando en modo demo.');
    console.warn('Detalles:', error.message);
  }

  // Escuchar en el puerto especificado
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Dashboard principal: http://localhost:${PORT}`);
    console.log(`🔐 Login de maestros: http://localhost:${PORT}/login`);
    console.log(`👩‍🏫 Dashboard maestros: http://localhost:${PORT}/dashboard`);
  });
}

startServer();