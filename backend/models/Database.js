const { getConnection } = require('../config/database');

class Database {
  
  // Verificar conexión a la base de datos
  static async checkConnection() {
    try {
      const connection = getConnection();
      await connection.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Obtener estadísticas generales del sistema
  static async getSystemStats() {
    try {
      const connection = getConnection();
      
      // Contar maestros
      const [maestros] = await connection.execute('SELECT COUNT(*) as total FROM maestros');
      
      // Contar alumnos activos por clase
      const [alumnos] = await connection.execute(`
        SELECT 
          clase,
          COUNT(*) as total
        FROM alumnos 
        WHERE activo = 1 
        GROUP BY clase
        ORDER BY clase
      `);
      
      // Asistencias del día
      const hoy = new Date().toISOString().split('T')[0];
      const [asistenciasHoy] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM asistencias 
        WHERE fecha = ?
      `, [hoy]);
      
      // Asistencias del mes actual
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      const [asistenciasMes] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM asistencias 
        WHERE fecha BETWEEN ? AND ?
      `, [inicioMes.toISOString().split('T')[0], finMes.toISOString().split('T')[0]]);

      return {
        maestros: maestros[0].total,
        alumnos: alumnos,
        asistenciasHoy: asistenciasHoy[0],
        asistenciasMes: asistenciasMes[0],
        fechaConsulta: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  // Limpiar datos antiguos (función de mantenimiento)
  static async cleanOldData(diasAtras = 365) {
    try {
      const connection = getConnection();
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAtras);
      
      const [result] = await connection.execute(
        'DELETE FROM asistencias WHERE fecha < ?',
        [fechaLimite.toISOString().split('T')[0]]
      );
      
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }

  // Backup de datos en formato JSON
  static async backupData() {
    try {
      const connection = getConnection();
      
      const [maestros] = await connection.execute('SELECT * FROM maestros');
      const [alumnos] = await connection.execute('SELECT * FROM alumnos');
      const [asistencias] = await connection.execute('SELECT * FROM asistencias');
      
      return {
        fecha_backup: new Date().toISOString(),
        maestros,
        alumnos,
        asistencias
      };
    } catch (error) {
      throw error;
    }
  }

  // Ejecutar consulta personalizada (para administradores)
  static async executeCustomQuery(query, params = []) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener información de la base de datos
  static async getDatabaseInfo() {
    try {
      const connection = getConnection();
      
      const [tables] = await connection.execute(`
        SELECT 
          TABLE_NAME as tabla,
          TABLE_ROWS as filas,
          DATA_LENGTH as tamaño_bytes
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'iebm_asistencias'
        ORDER BY TABLE_NAME
      `);
      
      return tables;
    } catch (error) {
      throw error;
    }
  }

  // Verificar integridad de datos
  static async checkDataIntegrity() {
    try {
      const connection = getConnection();
      const issues = [];
      
      // Verificar asistencias sin alumnos
      const [orphanAsistencias] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM asistencias a 
        LEFT JOIN alumnos al ON a.alumno_id = al.id 
        WHERE al.id IS NULL
      `);
      
      if (orphanAsistencias[0].count > 0) {
        issues.push(`${orphanAsistencias[0].count} asistencias sin alumno asociado`);
      }
      
      // Verificar asistencias sin maestros
      const [orphanAsistenciasMaestros] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM asistencias a 
        LEFT JOIN maestros m ON a.maestro_id = m.id 
        WHERE m.id IS NULL
      `);
      
      if (orphanAsistenciasMaestros[0].count > 0) {
        issues.push(`${orphanAsistenciasMaestros[0].count} asistencias sin maestro asociado`);
      }
      
      // Verificar códigos duplicados de alumnos
      const [duplicateCodes] = await connection.execute(`
        SELECT codigo, COUNT(*) as count 
        FROM alumnos 
        WHERE activo = 1 
        GROUP BY codigo 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicateCodes.length > 0) {
        issues.push(`${duplicateCodes.length} códigos de alumno duplicados`);
      }

      return {
        isValid: issues.length === 0,
        issues: issues,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Database;