const { getConnection } = require('../config/database');

class Maestro {
  
  // Buscar maestro por email
  static async findByEmail(email) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM maestros WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar maestro por ID
  static async findById(id) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM maestros WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los maestros
  static async getAll() {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT id, nombre, email, clase, created_at FROM maestros ORDER BY clase'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Verificar credenciales de login
  static async verifyCredentials(email, password) {
    try {
      const maestro = await this.findByEmail(email);
      
      if (!maestro) {
        return null;
      }

      // Verificar contraseña (por ahora sin hash)
      if (password !== maestro.password) {
        return null;
      }

      // Retornar maestro sin la contraseña
      const { password: _, ...maestroSinPassword } = maestro;
      return maestroSinPassword;
    } catch (error) {
      throw error;
    }
  }

  // Cambiar contraseña
  static async changePassword(id, newPassword) {
    try {
      const connection = getConnection();
      const [result] = await connection.execute(
        'UPDATE maestros SET password = ? WHERE id = ?',
        [newPassword, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Crear nuevo maestro
  static async create(maestroData) {
    try {
      const { nombre, email, password, clase } = maestroData;
      const connection = getConnection();
      
      const [result] = await connection.execute(
        'INSERT INTO maestros (nombre, email, password, clase) VALUES (?, ?, ?, ?)',
        [nombre, email, password, clase]
      );
      
      return {
        id: result.insertId,
        ...maestroData
      };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar maestro
  static async update(id, maestroData) {
    try {
      const { nombre, email, clase } = maestroData;
      const connection = getConnection();
      
      const [result] = await connection.execute(
        'UPDATE maestros SET nombre = ?, email = ?, clase = ? WHERE id = ?',
        [nombre, email, clase, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas básicas por clase
  static async getStatsByClase(clase) {
    try {
      const connection = getConnection();
      
      // Total de alumnos
      const [alumnosCount] = await connection.execute(
        'SELECT COUNT(*) as total FROM alumnos WHERE clase = ? AND activo = 1',
        [clase]
      );

      // Asistencias del mes
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      const [asistenciasMes] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM asistencias a
        JOIN alumnos al ON a.alumno_id = al.id
        WHERE al.clase = ? AND a.fecha BETWEEN ? AND ?
      `, [clase, inicioMes.toISOString().split('T')[0], finMes.toISOString().split('T')[0]]);

      return {
        totalAlumnos: alumnosCount[0].total,
        asistenciasMes: asistenciasMes[0]
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Maestro;