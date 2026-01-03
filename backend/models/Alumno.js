const { getConnection } = require('../config/database');

class Alumno {

  // Obtener todos los alumnos activos
  static async getAll() {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM alumnos WHERE activo = 1 ORDER BY nombre'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener alumnos por clase
  static async getByClase(clase) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM alumnos WHERE clase = ? AND activo = 1 ORDER BY nombre',
        [clase]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Buscar alumno por ID
  static async findById(id) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM alumnos WHERE id = ? AND activo = 1',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar alumno por código
  static async findByCodigo(codigo) {
    try {
      const connection = getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM alumnos WHERE codigo = ? AND activo = 1',
        [codigo]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Crear nuevo alumno
  static async create(alumnoData) {
    try {
      const { nombre, edad, telefono, clase, codigo } = alumnoData;
      const connection = getConnection();
      
      // Verificar que el código no exista
      const existingAlumno = await this.findByCodigo(codigo);
      if (existingAlumno) {
        throw new Error('Ya existe un alumno con ese código');
      }
      
      const [result] = await connection.execute(
        'INSERT INTO alumnos (nombre, edad, telefono, clase, codigo) VALUES (?, ?, ?, ?, ?)',
        [nombre, edad, telefono, clase, codigo]
      );
      
      return {
        id: result.insertId,
        ...alumnoData,
        activo: 1,
        created_at: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar alumno
  static async update(id, alumnoData) {
    try {
      const { nombre, edad, telefono, clase, codigo } = alumnoData;
      const connection = getConnection();
      
      // Verificar que el código no lo use otro alumno
      const [existingRows] = await connection.execute(
        'SELECT id FROM alumnos WHERE codigo = ? AND id != ? AND activo = 1',
        [codigo, id]
      );
      
      if (existingRows.length > 0) {
        throw new Error('Ya existe otro alumno con ese código');
      }
      
      const [result] = await connection.execute(
        'UPDATE alumnos SET nombre = ?, edad = ?, telefono = ?, clase = ?, codigo = ? WHERE id = ? AND activo = 1',
        [nombre, edad, telefono, clase, codigo, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Alumno no encontrado');
      }
      
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Eliminar alumno (marcar como inactivo)
  static async delete(id) {
    try {
      const connection = getConnection();
      const [result] = await connection.execute(
        'UPDATE alumnos SET activo = 0 WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Buscar alumnos
  static async search(searchTerm, clase = null) {
    try {
      const connection = getConnection();
      let query = `
        SELECT * FROM alumnos 
        WHERE activo = 1 
        AND (nombre LIKE ? OR codigo LIKE ?)
      `;
      let params = [`%${searchTerm}%`, `%${searchTerm}%`];
      
      if (clase) {
        query += ' AND clase = ?';
        params.push(clase);
      }
      
      query += ' ORDER BY nombre';
      
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de un alumno
  static async getStats(id, startDate = null, endDate = null) {
    try {
      const connection = getConnection();
      let query = `
        SELECT 
          COUNT(*) as total_registros,
          SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
          SUM(CASE WHEN estado = 'tarde' THEN 1 ELSE 0 END) as tardes,
          SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) as faltas
        FROM asistencias 
        WHERE alumno_id = ?
      `;
      let params = [id];
      
      if (startDate && endDate) {
        query += ' AND fecha BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      
      const [rows] = await connection.execute(query, params);
      const stats = rows[0];
      
      // Calcular porcentajes
      if (stats.total_registros > 0) {
        stats.porcentaje_asistencia = Math.round(
          ((stats.presentes + stats.tardes) / stats.total_registros) * 100
        );
        stats.porcentaje_presentes = Math.round(
          (stats.presentes / stats.total_registros) * 100
        );
        stats.porcentaje_tardes = Math.round(
          (stats.tardes / stats.total_registros) * 100
        );
        stats.porcentaje_faltas = Math.round(
          (stats.faltas / stats.total_registros) * 100
        );
      } else {
        stats.porcentaje_asistencia = 0;
        stats.porcentaje_presentes = 0;
        stats.porcentaje_tardes = 0;
        stats.porcentaje_faltas = 0;
      }
      
      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Verificar si un código está disponible
  static async isCodigoAvailable(codigo, excludeId = null) {
    try {
      const connection = getConnection();
      let query = 'SELECT id FROM alumnos WHERE codigo = ? AND activo = 1';
      let params = [codigo];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const [rows] = await connection.execute(query, params);
      return rows.length === 0;
    } catch (error) {
      throw error;
    }
  }

  // Generar nuevo código único
  static async generateUniqueCode(clase) {
    try {
      const prefijos = {
        'Párvulos': 'PAR',
        'Intermedios': 'INT',
        'Adolescentes': 'ADO',
        'Adultos': 'ADU'
      };
      
      const prefijo = prefijos[clase] || 'GEN';
      let numero = 1;
      let codigo;
      
      do {
        codigo = `${prefijo}${numero.toString().padStart(3, '0')}`;
        numero++;
      } while (!(await this.isCodigoAvailable(codigo)));
      
      return codigo;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Alumno;