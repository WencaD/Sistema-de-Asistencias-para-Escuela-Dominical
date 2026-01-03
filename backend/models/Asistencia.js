const { getConnection } = require('../config/database');

class Asistencia {

  // Registrar asistencia
  static async registrar(alumnoId, fecha, estado, maestroId, observaciones = null) {
    try {
      const connection = getConnection();
      
      // Verificar si ya existe un registro para ese alumno y fecha
      const [existing] = await connection.execute(
        'SELECT id FROM asistencias WHERE alumno_id = ? AND fecha = ?',
        [alumnoId, fecha]
      );

      if (existing.length > 0) {
        // Actualizar registro existente
        const [result] = await connection.execute(
          'UPDATE asistencias SET estado = ?, maestro_id = ?, observaciones = ?, updated_at = NOW() WHERE id = ?',
          [estado, maestroId, observaciones, existing[0].id]
        );
        
        return {
          id: existing[0].id,
          alumnoId,
          fecha,
          estado,
          maestroId,
          observaciones,
          updated: true
        };
      } else {
        // Crear nuevo registro
        const [result] = await connection.execute(
          'INSERT INTO asistencias (alumno_id, fecha, estado, maestro_id, observaciones) VALUES (?, ?, ?, ?, ?)',
          [alumnoId, fecha, estado, maestroId, observaciones]
        );
        
        return {
          id: result.insertId,
          alumnoId,
          fecha,
          estado,
          maestroId,
          observaciones,
          created: true
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Obtener asistencias por fecha y clase
  static async getByFechaClase(fecha, clase) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          a.id,
          a.fecha,
          a.estado,
          a.observaciones,
          a.created_at,
          al.id as alumno_id,
          al.nombre as alumno_nombre,
          al.codigo as alumno_codigo,
          al.edad as alumno_edad,
          m.nombre as maestro_nombre
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        LEFT JOIN maestros m ON a.maestro_id = m.id
        WHERE a.fecha = ? AND al.clase = ? AND al.activo = 1
        ORDER BY al.nombre
      `, [fecha, clase]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener asistencias por rango de fechas y clase
  static async getByRangoFechasClase(fechaInicio, fechaFin, clase) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          a.id,
          a.fecha,
          a.estado,
          a.observaciones,
          a.created_at,
          al.id as alumno_id,
          al.nombre as alumno_nombre,
          al.codigo as alumno_codigo,
          al.edad as alumno_edad,
          al.clase,
          m.nombre as maestro_nombre
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        LEFT JOIN maestros m ON a.maestro_id = m.id
        WHERE a.fecha BETWEEN ? AND ? AND al.clase = ? AND al.activo = 1
        ORDER BY a.fecha DESC, al.nombre
      `, [fechaInicio, fechaFin, clase]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener historial de asistencias de un alumno
  static async getHistorialAlumno(alumnoId, limite = 50) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          a.id,
          a.fecha,
          a.estado,
          a.observaciones,
          a.created_at,
          m.nombre as maestro_nombre
        FROM asistencias a
        LEFT JOIN maestros m ON a.maestro_id = m.id
        WHERE a.alumno_id = ?
        ORDER BY a.fecha DESC
        LIMIT ?
      `, [alumnoId, limite]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de asistencia por clase en un período
  static async getEstadisticasClase(clase, fechaInicio, fechaFin) {
    try {
      const connection = getConnection();
      
      // Estadísticas generales
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_registros,
          COUNT(DISTINCT a.alumno_id) as alumnos_con_registro,
          COUNT(DISTINCT a.fecha) as dias_registrados,
          SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN a.estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        WHERE al.clase = ? AND a.fecha BETWEEN ? AND ? AND al.activo = 1
      `, [clase, fechaInicio, fechaFin]);

      // Total de alumnos activos en la clase
      const [totalAlumnos] = await connection.execute(
        'SELECT COUNT(*) as total FROM alumnos WHERE clase = ? AND activo = 1',
        [clase]
      );

      // Estadísticas por alumno
      const [alumnoStats] = await connection.execute(`
        SELECT 
          al.id,
          al.nombre,
          al.codigo,
          COUNT(*) as total_registros,
          SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN a.estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END) as faltas,
          ROUND(((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) + 
                  SUM(CASE WHEN a.estado = 'tarde' THEN 1 ELSE 0 END)) / COUNT(*)) * 100, 2) as porcentaje_asistencia
        FROM alumnos al
        LEFT JOIN asistencias a ON al.id = a.alumno_id AND a.fecha BETWEEN ? AND ?
        WHERE al.clase = ? AND al.activo = 1
        GROUP BY al.id, al.nombre, al.codigo
        ORDER BY al.nombre
      `, [fechaInicio, fechaFin, clase]);

      const resultado = stats[0];
      
      // Calcular porcentajes
      if (resultado.total_registros > 0) {
        resultado.porcentaje_presentes = Math.round((resultado.presentes / resultado.total_registros) * 100);
        resultado.porcentaje_tardes = Math.round((resultado.tardes / resultado.total_registros) * 100);
        resultado.porcentaje_faltas = Math.round((resultado.faltas / resultado.total_registros) * 100);
        resultado.porcentaje_asistencia = Math.round(((resultado.presentes + resultado.tardes) / resultado.total_registros) * 100);
      } else {
        resultado.porcentaje_presentes = 0;
        resultado.porcentaje_tardes = 0;
        resultado.porcentaje_faltas = 0;
        resultado.porcentaje_asistencia = 0;
      }

      resultado.total_alumnos_clase = totalAlumnos[0].total;
      resultado.detalle_alumnos = alumnoStats;

      return resultado;
    } catch (error) {
      throw error;
    }
  }

  // Obtener asistencias por fecha (todas las clases)
  static async getByFecha(fecha) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          a.id,
          a.fecha,
          a.estado,
          a.observaciones,
          a.created_at,
          al.id as alumno_id,
          al.nombre as alumno_nombre,
          al.codigo as alumno_codigo,
          al.edad as alumno_edad,
          al.clase,
          m.nombre as maestro_nombre
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        LEFT JOIN maestros m ON a.maestro_id = m.id
        WHERE a.fecha = ? AND al.activo = 1
        ORDER BY al.clase, al.nombre
      `, [fecha]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Eliminar registro de asistencia
  static async delete(id) {
    try {
      const connection = getConnection();
      const [result] = await connection.execute(
        'DELETE FROM asistencias WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Obtener últimos registros por maestro
  static async getUltimosRegistrosByMaestro(maestroId, limite = 20) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          a.id,
          a.fecha,
          a.estado,
          a.observaciones,
          a.created_at,
          al.nombre as alumno_nombre,
          al.codigo as alumno_codigo,
          al.clase
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        WHERE a.maestro_id = ? AND al.activo = 1
        ORDER BY a.created_at DESC
        LIMIT ?
      `, [maestroId, limite]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Verificar si existe registro de asistencia
  static async existeRegistro(alumnoId, fecha) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT id, estado FROM asistencias WHERE alumno_id = ? AND fecha = ?',
        [alumnoId, fecha]
      );
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener resumen diario por clase
  static async getResumenDiario(fecha, clase = null) {
    try {
      const connection = getConnection();
      let query = `
        SELECT 
          al.clase,
          COUNT(DISTINCT al.id) as total_alumnos,
          COUNT(a.id) as registros_asistencia,
          SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN a.estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM alumnos al
        LEFT JOIN asistencias a ON al.id = a.alumno_id AND a.fecha = ?
        WHERE al.activo = 1
      `;
      
      let params = [fecha];
      
      if (clase) {
        query += ' AND al.clase = ?';
        params.push(clase);
      }
      
      query += ' GROUP BY al.clase ORDER BY al.clase';
      
      const [rows] = await connection.execute(query, params);
      
      // Calcular porcentajes
      rows.forEach(row => {
        if (row.registros_asistencia > 0) {
          row.porcentaje_asistencia = Math.round(((row.presentes + row.tardes) / row.registros_asistencia) * 100);
        } else {
          row.porcentaje_asistencia = 0;
        }
        
        row.sin_registro = row.total_alumnos - row.registros_asistencia;
      });
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Asistencia;