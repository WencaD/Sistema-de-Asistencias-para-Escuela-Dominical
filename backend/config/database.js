const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iebm_asistencias',
  port: process.env.DB_PORT || 3306
};

let connection;

async function connectDB() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a MySQL establecida correctamente');
    
    // Crear la base de datos si no existe
    await createDatabase();
    await createTables();
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
        apellidos VARCHAR(100) NOT NULL,
        edad INT NOT NULL,
        clase ENUM('parvulos', 'intermedios', 'adolescentes', 'adultos') NOT NULL,
        telefono_contacto VARCHAR(15),
        observaciones TEXT,
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
        estado ENUM('presente', 'tarde', 'falta') NOT NULL,
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

async function insertDefaultData() {
  try {
    // Insertar maestros por defecto
    const maestros = [
      ['Raquel Cubas', 'raquel@iebm.com', '123456', 'parvulos'],
      ['Sahara Homero', 'sahara@iebm.com', '123456', 'intermedios'],
      ['Karen Cuéllar', 'karen@iebm.com', '123456', 'adolescentes'],
      ['Omar Esteban', 'omar@iebm.com', '123456', 'adultos'],
      ['Admin IEBM', 'admin@iebm.com', 'admin123', 'adultos']
    ];

    for (const maestro of maestros) {
      await connection.execute(`
        INSERT IGNORE INTO maestros (nombre, email, password, clase) 
        VALUES (?, ?, ?, ?)
      `, maestro);
    }

    // Insertar algunos alumnos de ejemplo
    const alumnos = [
      ['Ana García López', 5, 'parvulos', '555-1234', 'Alumna muy participativa'],
      ['Luis Rodríguez Silva', 6, 'parvulos', '555-2345', ''],
      ['María Fernández Torres', 8, 'intermedios', '555-3456', ''],
      ['Carlos López Herrera', 9, 'intermedios', '555-4567', 'Necesita ayuda con memorización'],
      ['Sofia Martín Cruz', 14, 'adolescentes', '555-5678', ''],
      ['Diego Sánchez Ruiz', 15, 'adolescentes', '555-6789', 'Líder natural'],
      ['Carmen Jiménez Morales', 35, 'adultos', '555-7890', ''],
      ['Roberto Vega Castillo', 42, 'adultos', '555-8901', 'Nuevo en la iglesia'],
      ['Isabella Torres Reyes', 4, 'parvulos', '555-9012', 'Muy tímida pero inteligente'],
      ['Mateo Ruiz García', 7, 'parvulos', '555-0123', 'Le encanta cantar'],
      ['Valentina Cruz López', 10, 'intermedios', '555-1357', 'Excelente memoria bíblica'],
      ['Santiago Morales Torres', 11, 'intermedios', '555-2468', 'Muy participativo'],
      ['Camila Herrera Silva', 13, 'adolescentes', '555-3691', 'Nueva en la iglesia'],
      ['Alejandro Castillo Ruiz', 16, 'adolescentes', '555-4702', 'Músico de la iglesia'],
      ['Patricia Reyes Morales', 28, 'adultos', '555-5813', 'Maestra de profesión'],
      ['Fernando García Cruz', 45, 'adultos', '555-6924', 'Diácono de la iglesia']
    ];

    for (const alumno of alumnos) {
      await connection.execute(`
        INSERT IGNORE INTO alumnos (nombre, edad, clase, telefono_contacto, observaciones) 
        VALUES (?, ?, ?, ?, ?)
      `, alumno);
    }

    console.log('👥 Datos iniciales insertados');
  } catch (error) {
    console.error('Error insertando datos por defecto:', error);
  }
}

function getConnection() {
  return connection;
}

module.exports = {
  connectDB,
  getConnection,
  dbConfig
};