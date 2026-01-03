const express = require('express');
const { getConnection } = require('../config/database');
const Alumno = require('../models/Alumno');

const router = express.Router();

// Middleware para verificar token (importar del auth.js)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// Obtener todos los alumnos de la clase del maestro
router.get('/', verifyToken, async (req, res) => {
  try {
    const maestroClase = req.user.clase;
    
    const alumnos = await Alumno.getByClase(maestroClase);
    res.json({ success: true, alumnos });

  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un alumno específico
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const maestroClase = req.user.clase;
    
    const alumno = await Alumno.findById(id);
    
    if (!alumno || alumno.clase !== maestroClase) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ success: true, alumno });

  } catch (error) {
    console.error('Error obteniendo alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo alumno
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nombre, edad, telefono, codigo } = req.body;
    const maestroClase = req.user.clase;

    if (!nombre || !edad) {
      return res.status(400).json({ error: 'Nombre y edad son requeridos' });
    }

    // Generar código si no se proporciona
    const codigoFinal = codigo || await Alumno.generateUniqueCode(maestroClase);

    const alumno = await Alumno.create({
      nombre,
      edad,
      telefono: telefono || '',
      clase: maestroClase,
      codigo: codigoFinal
    });

    res.json({
      success: true,
      message: 'Alumno creado correctamente',
      alumno
    });

  } catch (error) {
    console.error('Error creando alumno:', error);
    if (error.message.includes('código')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Actualizar alumno
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, edad, telefono, codigo } = req.body;
    const maestroClase = req.user.clase;

    if (!nombre || !edad || !codigo) {
      return res.status(400).json({ error: 'Nombre, edad y código son requeridos' });
    }

    const alumno = await Alumno.update(id, {
      nombre,
      edad,
      telefono: telefono || '',
      clase: maestroClase,
      codigo
    });

    if (!alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ success: true, message: 'Alumno actualizado correctamente', alumno });

  } catch (error) {
    console.error('Error actualizando alumno:', error);
    if (error.message.includes('código')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Eliminar alumno (marcar como inactivo)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await Alumno.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ success: true, message: 'Alumno eliminado correctamente' });

  } catch (error) {
    console.error('Error eliminando alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;