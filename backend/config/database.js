const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iebm_asistencias',
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  }
};

let connection;

async function connectDB() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a MySQL establecida correctamente');

    // Crear la base de datos si no existe
    await createDatabase();
    await createTables();
    await ensureAlumnoColumns();
    await insertDefaultData();

    return connection;
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a MySQL:', error.message);
    console.warn('La aplicación funcionará en modo demo sin persistencia de datos');
    return null;
  }
}

async function createDatabase() {
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    console.log('📁 Base de datos creada/verificada');
  } catch (error) {
    console.error('Error creando base de datos:', error);
  }
}

async function createTables() {
  try {
    // Tabla de maestros
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maestros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        clase ENUM('parvulos', 'intermedios', 'adolescentes', 'adultos') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de alumnos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alumnos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100),
        edad INT NOT NULL,
        clase ENUM('parvulos', 'intermedios', 'adolescentes', 'adultos') NOT NULL,
        telefono VARCHAR(15),
        observaciones TEXT,
        codigo VARCHAR(50) DEFAULT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de asistencias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS asistencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alumno_id INT NOT NULL,
        fecha DATE NOT NULL,
        hora_llegada TIME,
        estado ENUM('presente', 'tardanza', 'ausente') NOT NULL,
        observaciones TEXT,
        maestro_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
        FOREIGN KEY (maestro_id) REFERENCES maestros(id),
        UNIQUE KEY unique_asistencia (alumno_id, fecha)
      )
    `);

    console.log('📋 Tablas creadas correctamente');
  } catch (error) {
    console.error('Error creando tablas:', error);
  }
}

async function ensureAlumnoColumns() {
  try {
    // Verificar y añadir columna 'telefono' si no existe
    const [telRows] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumnos' AND COLUMN_NAME = 'telefono'`,
      [dbConfig.database]
    );
    if (telRows.length === 0) {
      await connection.execute(`ALTER TABLE alumnos ADD COLUMN telefono VARCHAR(15)`);
      console.log('➕ Columna "telefono" agregada a tabla alumnos');
    }

    // Verificar y añadir columna 'codigo' si no existe
    const [codRows] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumnos' AND COLUMN_NAME = 'codigo'`,
      [dbConfig.database]
    );
    if (codRows.length === 0) {
      await connection.execute(`ALTER TABLE alumnos ADD COLUMN codigo VARCHAR(50) DEFAULT NULL`);
      console.log('➕ Columna "codigo" agregada a tabla alumnos');
    }
  } catch (error) {
    console.error('Error asegurando columnas en alumnos:', error.message || error);
  }
}

async function insertDefaultData() {
  try {
    const bcrypt = require('bcryptjs');

    // Insertar maestros por defecto con contraseñas hasheadas
    const maestros = [
      ['Raquel Cubas', 'raquel@iebm.com', '123456', 'parvulos'],
      ['Sahara Gomero', 'sahara@iebm.com', '123456', 'intermedios'],
      ['Karen Cuéllar', 'karen@iebm.com', '123456', 'adolescentes'],
      ['Esteban Cuéllar', 'omar@iebm.com', '123456', 'adultos'],
      ['Admin IEBM', 'admin@iebm.com', 'admin123', 'adultos']
    ];

    // Insertar o actualizar maestros por defecto
    for (const [nombre, email, password, clase] of maestros) {
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash(password, 10);
      await connection.execute(`
        INSERT INTO maestros (nombre, email, password, clase)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          clase = VALUES(clase)
      `, [nombre, email, hashedPw, clase]);
    }

    // NO insertar alumnos de ejemplo - solo los que el usuario cree
    console.log('📋 Se crearán alumnos solo desde la interfaz');

    console.log('👥 Datos iniciales insertados');
  } catch (error) {
    console.error('Error insertando datos por defecto:', error);
  }
}

function getConnection() {
  if (!connection) {
    throw new Error('Database no conectado. Verifique la configuración de MySQL y .env');
  }
  return connection;
}

module.exports = {
  connectDB,
  getConnection,
  dbConfig
};