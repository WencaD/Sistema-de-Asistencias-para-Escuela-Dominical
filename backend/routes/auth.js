/**
 * RUTAS DE AUTENTICACIÓN
 * Maneja login y logout de maestros
 * Genera tokens JWT para mantener sesiones seguras
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const Maestro = require('../models/Maestro');

const router = express.Router();

/**
 * Middleware para verificar token JWT
 * Extrae el token del header Authorization y lo valida
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrae el token del formato "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  // Validar que el token sea válido y no esté expirado
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user; // Agregar datos del usuario al request
    next();
  });
}

/**
 * POST /api/auth/login
 * Autentica un maestro con email y contraseña
 * Devuelve un JWT token válido por 24 horas
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    console.log('Intento de login para:', email);

    // Verificar credenciales en la BD
    const maestro = await Maestro.verifyCredentials(email, password);

    if (!maestro) {
      console.warn('Login fallido: Credenciales inválidas para', email);
      return res.status(401).json({ error: 'Credenciales inválidas', message: 'Email o contraseña incorrectos' });
    }

    console.log('Login exitoso para:', email);

    // Generar token JWT con datos del maestro
    const token = jwt.sign(
      {
        id: maestro.id,
        nombre: maestro.nombre,
        email: maestro.email,
        clase: maestro.clase // Importante: almacena la clase para filtrar alumnos/asistencias
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Guardar en sesión del servidor también
    req.session.maestro = {
      id: maestro.id,
      nombre: maestro.nombre,
      email: maestro.email,
      clase: maestro.clase
    };

    // Responder con token y datos del maestro
    res.json({
      success: true,
      token,
      maestro: {
        id: maestro.id,
        nombre: maestro.nombre,
        email: maestro.email,
        clase: maestro.clase
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error cerrando sesión' });
    }
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  });
});

// Verificar sesión actual
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    maestro: req.user
  });
});

// Cambiar contraseña
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const maestroId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT password FROM maestros WHERE id = ?',
      [maestroId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Maestro no encontrado' });
    }

    // Verificar contraseña actual usando bcrypt
    const isValidPassword = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear la nueva contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await connection.execute(
      'UPDATE maestros SET password = ? WHERE id = ?',
      [hashedPassword, maestroId]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token válido'
  });
});

module.exports = router;