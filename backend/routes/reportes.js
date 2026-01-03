const express = require('express');
const moment = require('moment');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
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

// Estadísticas generales
router.get('/estadisticas', verifyToken, async (req, res) => {
  try {
    const maestroClase = req.user.clase;
    const maestroId = req.user.id;
    const connection = getConnection();

    // Total de alumnos activos
    const [totalAlumnos] = await connection.execute(
      'SELECT COUNT(*) as total FROM alumnos WHERE clase = ? AND activo = 1',
      [maestroClase]
    );

    // Asistencias del mes actual
    const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
    const finMes = moment().endOf('month').format('YYYY-MM-DD');

    const [asistenciasMes] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
        SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) as faltas
      FROM asistencias a
      JOIN alumnos al ON a.alumno_id = al.id
      WHERE al.clase = ? AND a.fecha BETWEEN ? AND ? AND a.maestro_id = ?
    `, [maestroClase, inicioMes, finMes, maestroId]);

    // Porcentaje de asistencia por alumno (últimos 30 días)
    const hace30Dias = moment().subtract(30, 'days').format('YYYY-MM-DD');
    
    const [porcentajesAsistencia] = await connection.execute(`
      SELECT 
        al.id,
        al.nombre,
        al.apellidos,
        COUNT(a.id) as total_registros,
        SUM(CASE WHEN a.estado IN ('presente', 'tarde') THEN 1 ELSE 0 END) as asistencias,
        ROUND(
          (SUM(CASE WHEN a.estado IN ('presente', 'tarde') THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
          2
        ) as porcentaje_asistencia
      FROM alumnos al
      LEFT JOIN asistencias a ON al.id = a.alumno_id AND a.fecha >= ? AND a.maestro_id = ?
      WHERE al.clase = ? AND al.activo = 1
      GROUP BY al.id, al.nombre, al.apellidos
      ORDER BY porcentaje_asistencia DESC
    `, [hace30Dias, maestroId, maestroClase]);

    res.json({
      success: true,
      estadisticas: {
        totalAlumnos: totalAlumnos[0].total,
        asistenciasMes: asistenciasMes[0],
        porcentajesAsistencia
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reporte de asistencias por rango de fechas
router.get('/asistencias', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, alumnoId } = req.query;
    const maestroClase = req.user.clase;
    const maestroId = req.user.id;
    const connection = getConnection();

    let query = `
      SELECT 
        a.fecha,
        al.id as alumno_id,
        al.nombre,
        al.apellidos,
        a.hora_llegada,
        a.estado,
        a.observaciones
      FROM asistencias a
      JOIN alumnos al ON a.alumno_id = al.id
      WHERE al.clase = ? AND a.maestro_id = ?
    `;
    let params = [maestroClase, maestroId];

    if (fechaInicio) {
      query += ' AND a.fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND a.fecha <= ?';
      params.push(fechaFin);
    }

    if (alumnoId) {
      query += ' AND al.id = ?';
      params.push(alumnoId);
    }

    query += ' ORDER BY a.fecha DESC, al.apellidos, al.nombre';

    const [asistencias] = await connection.execute(query, params);

    res.json({
      success: true,
      asistencias,
      filtros: {
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        alumnoId: alumnoId || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo reporte de asistencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exportar a Excel
router.get('/export/excel', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, alumnoId } = req.query;
    const maestroClase = req.user.clase;
    const maestroId = req.user.id;
    const connection = getConnection();

    let query = `
      SELECT 
        a.fecha,
        al.nombre,
        al.apellidos,
        a.hora_llegada,
        CASE 
          WHEN a.estado = 'presente' THEN 'Presente'
          WHEN a.estado = 'tarde' THEN 'Tarde'
          WHEN a.estado = 'falta' THEN 'Falta'
        END as estado,
        a.observaciones
      FROM asistencias a
      JOIN alumnos al ON a.alumno_id = al.id
      WHERE al.clase = ? AND a.maestro_id = ?
    `;
    let params = [maestroClase, maestroId];

    if (fechaInicio) {
      query += ' AND a.fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND a.fecha <= ?';
      params.push(fechaFin);
    }

    if (alumnoId) {
      query += ' AND al.id = ?';
      params.push(alumnoId);
    }

    query += ' ORDER BY a.fecha DESC, al.apellidos, al.nombre';

    const [asistencias] = await connection.execute(query, params);

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Formatear datos
    const data = asistencias.map(row => ({
      'Fecha': moment(row.fecha).format('DD/MM/YYYY'),
      'Nombre': row.nombre,
      'Apellidos': row.apellidos,
      'Hora de Llegada': row.hora_llegada || '',
      'Estado': row.estado,
      'Observaciones': row.observaciones || ''
    }));

    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

    // Configurar headers para descarga
    const fileName = `asistencias_${maestroClase}_${moment().format('YYYY-MM-DD')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Enviar el archivo
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);

  } catch (error) {
    console.error('Error exportando a Excel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exportar a PDF
router.get('/export/pdf', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, alumnoId } = req.query;
    const maestroClase = req.user.clase;
    const maestroNombre = req.user.nombre;
    const maestroId = req.user.id;
    const connection = getConnection();

    let query = `
      SELECT 
        a.fecha,
        al.nombre,
        al.apellidos,
        a.hora_llegada,
        CASE 
          WHEN a.estado = 'presente' THEN 'Presente'
          WHEN a.estado = 'tarde' THEN 'Tarde'
          WHEN a.estado = 'falta' THEN 'Falta'
        END as estado,
        a.observaciones
      FROM asistencias a
      JOIN alumnos al ON a.alumno_id = al.id
      WHERE al.clase = ? AND a.maestro_id = ?
    `;
    let params = [maestroClase, maestroId];

    if (fechaInicio) {
      query += ' AND a.fecha >= ?';
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ' AND a.fecha <= ?';
      params.push(fechaFin);
    }

    if (alumnoId) {
      query += ' AND al.id = ?';
      params.push(alumnoId);
    }

    query += ' ORDER BY a.fecha DESC, al.apellidos, al.nombre';

    const [asistencias] = await connection.execute(query, params);

    // Crear PDF
    const doc = new PDFDocument();
    
    // Configurar headers para descarga
    const fileName = `asistencias_${maestroClase}_${moment().format('YYYY-MM-DD')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Título
    doc.fontSize(16).text('IEBM - Reporte de Asistencias', { align: 'center' });
    doc.fontSize(12).text(`Clase: ${maestroClase.charAt(0).toUpperCase() + maestroClase.slice(1)}`, { align: 'center' });
    doc.text(`Maestro: ${maestroNombre}`, { align: 'center' });
    doc.text(`Fecha de reporte: ${moment().format('DD/MM/YYYY')}`, { align: 'center' });

    if (fechaInicio || fechaFin) {
      const rangoFechas = `${fechaInicio ? moment(fechaInicio).format('DD/MM/YYYY') : 'Inicio'} - ${fechaFin ? moment(fechaFin).format('DD/MM/YYYY') : 'Actual'}`;
      doc.text(`Período: ${rangoFechas}`, { align: 'center' });
    }

    doc.moveDown(2);

    // Tabla de asistencias
    const startY = doc.y;
    let currentY = startY;

    // Headers
    doc.fontSize(10);
    doc.text('Fecha', 50, currentY);
    doc.text('Nombre', 120, currentY);
    doc.text('Apellidos', 220, currentY);
    doc.text('Hora', 320, currentY);
    doc.text('Estado', 380, currentY);
    doc.text('Observaciones', 450, currentY);

    currentY += 20;

    // Línea separadora
    doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).stroke();

    // Datos
    asistencias.forEach(row => {
      if (currentY > 700) { // Nueva página
        doc.addPage();
        currentY = 50;
      }

      doc.text(moment(row.fecha).format('DD/MM/YYYY'), 50, currentY);
      doc.text(row.nombre, 120, currentY);
      doc.text(row.apellidos, 220, currentY);
      doc.text(row.hora_llegada || '-', 320, currentY);
      doc.text(row.estado, 380, currentY);
      doc.text((row.observaciones || '').substring(0, 20), 450, currentY);

      currentY += 15;
    });

    doc.end();

  } catch (error) {
    console.error('Error exportando a PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;