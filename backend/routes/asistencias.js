const express = require('express');
const moment = require('moment');
const { getConnection } = require('../config/database');
const Asistencia = require('../models/Asistencia');
const Alumno = require('../models/Alumno');

const router = express.Router();

// Middleware para verificar token
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

// Obtener asistencias de una fecha específica
router.get('/fecha/:fecha', verifyToken, async (req, res) => {
  try {
    const { fecha } = req.params;
    const maestroClase = req.user.clase;
    const connection = getConnection();
    
    const [rows] = await connection.execute(`
      SELECT 
        a.id,
        al.id as alumno_id,
        al.nombre,
        al.apellidos,
        a.fecha,
        a.hora_llegada,
        a.estado,
        a.observaciones
      FROM asistencias a
      JOIN alumnos al ON a.alumno_id = al.id
      WHERE a.fecha = ? AND al.clase = ?
      ORDER BY al.apellidos, al.nombre
    `, [fecha, maestroClase]);

    res.json({ success: true, asistencias: rows });

  } catch (error) {
    console.error('Error obteniendo asistencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener asistencias de hoy
router.get('/hoy', verifyToken, async (req, res) => {
  try {
    const hoy = moment().format('YYYY-MM-DD');
    const maestroClase = req.user.clase;
    const maestroId = req.user.id;
    const connection = getConnection();
    
    // Obtener todos los alumnos de la clase
    const [alumnos] = await connection.execute(
      'SELECT id, nombre, apellidos FROM alumnos WHERE clase = ? AND activo = 1 ORDER BY apellidos, nombre',
      [maestroClase]
    );

    // Obtener las asistencias de hoy
    const [asistencias] = await connection.execute(`
      SELECT 
        alumno_id,
        fecha,
        hora_llegada,
        estado,
        observaciones
      FROM asistencias 
      WHERE fecha = ? AND maestro_id = ?
    `, [hoy, maestroId]);

    // Combinar datos
    const resultado = alumnos.map(alumno => {
      const asistencia = asistencias.find(a => a.alumno_id === alumno.id);
      return {
        alumno_id: alumno.id,
        nombre: alumno.nombre,
        apellidos: alumno.apellidos,
        fecha: hoy,
        hora_llegada: asistencia ? asistencia.hora_llegada : null,
        estado: asistencia ? asistencia.estado : null,
        observaciones: asistencia ? asistencia.observaciones : ''
      };
    });

    res.json({ success: true, fecha: hoy, asistencias: resultado });

  } catch (error) {
    console.error('Error obteniendo asistencias de hoy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar asistencia
router.post('/', verifyToken, async (req, res) => {
  try {
    const { alumno_id, fecha, hora_llegada, estado, observaciones } = req.body;
    const maestro_id = req.user.id;
    const maestroClase = req.user.clase;

    if (!alumno_id || !fecha || !estado) {
      return res.status(400).json({ error: 'Alumno, fecha y estado son requeridos' });
    }

    // Validar que el estado sea válido
    if (!['presente', 'tarde', 'falta'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const connection = getConnection();

    // Verificar que el alumno pertenece a la clase del maestro
    const [alumnoRows] = await connection.execute(
      'SELECT id FROM alumnos WHERE id = ? AND clase = ? AND activo = 1',
      [alumno_id, maestroClase]
    );

    if (alumnoRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado en su clase' });
    }

    // Determinar el estado basado en la hora de llegada si está presente
    let estadoFinal = estado;
    if (estado === 'presente' && hora_llegada) {
      const horaClase = moment('10:00', 'HH:mm');
      const horaLlegada = moment(hora_llegada, 'HH:mm');
      const tolerancia = 8; // minutos

      if (horaLlegada.isAfter(horaClase.add(tolerancia, 'minutes'))) {
        estadoFinal = 'tarde';
      }
    }

    // Insertar o actualizar asistencia
    const [result] = await connection.execute(`
      INSERT INTO asistencias (alumno_id, fecha, hora_llegada, estado, observaciones, maestro_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        hora_llegada = VALUES(hora_llegada),
        estado = VALUES(estado),
        observaciones = VALUES(observaciones)
    `, [alumno_id, fecha, hora_llegada || null, estadoFinal, observaciones || '', maestro_id]);

    res.json({
      success: true,
      message: 'Asistencia registrada correctamente',
      estado: estadoFinal
    });

  } catch (error) {
    console.error('Error registrando asistencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar múltiples asistencias
router.post('/multiple', verifyToken, async (req, res) => {
  try {
    const { fecha, asistencias } = req.body;
    const maestro_id = req.user.id;
    const maestroClase = req.user.clase;

    if (!fecha || !Array.isArray(asistencias)) {
      return res.status(400).json({ error: 'Fecha y asistencias son requeridos' });
    }

    const connection = getConnection();

    const resultados = [];
    
    for (const asistencia of asistencias) {
      const { alumno_id, hora_llegada, estado, observaciones } = asistencia;

      if (!alumno_id || !estado) {
        continue;
      }

      // Verificar que el alumno pertenece a la clase del maestro
      const [alumnoRows] = await connection.execute(
        'SELECT id FROM alumnos WHERE id = ? AND clase = ? AND activo = 1',
        [alumno_id, maestroClase]
      );

      if (alumnoRows.length === 0) {
        continue;
      }

      // Determinar el estado basado en la hora de llegada
      let estadoFinal = estado;
      if (estado === 'presente' && hora_llegada) {
        const horaClase = moment('10:00', 'HH:mm');
        const horaLlegada = moment(hora_llegada, 'HH:mm');
        const tolerancia = 8; // minutos

        if (horaLlegada.isAfter(horaClase.clone().add(tolerancia, 'minutes'))) {
          estadoFinal = 'tarde';
        }
      }

      try {
        await connection.execute(`
          INSERT INTO asistencias (alumno_id, fecha, hora_llegada, estado, observaciones, maestro_id)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            hora_llegada = VALUES(hora_llegada),
            estado = VALUES(estado),
            observaciones = VALUES(observaciones)
        `, [alumno_id, fecha, hora_llegada || null, estadoFinal, observaciones || '', maestro_id]);

        resultados.push({ alumno_id, estado: estadoFinal, success: true });
      } catch (error) {
        resultados.push({ alumno_id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Asistencias procesadas',
      resultados
    });

  } catch (error) {
    console.error('Error registrando asistencias múltiples:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de asistencias de un alumno
router.get('/alumno/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const maestroClase = req.user.clase;
    const connection = getConnection();

    // Verificar que el alumno pertenece a la clase del maestro
    const [alumnoRows] = await connection.execute(
      'SELECT nombre, apellidos FROM alumnos WHERE id = ? AND clase = ? AND activo = 1',
      [id, maestroClase]
    );

    if (alumnoRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado en su clase' });
    }

    const [asistencias] = await connection.execute(`
      SELECT 
        fecha,
        hora_llegada,
        estado,
        observaciones,
        created_at
      FROM asistencias 
      WHERE alumno_id = ?
      ORDER BY fecha DESC
      LIMIT 50
    `, [id]);

    res.json({
      success: true,
      alumno: alumnoRows[0],
      asistencias
    });

  } catch (error) {
    console.error('Error obteniendo historial de asistencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;