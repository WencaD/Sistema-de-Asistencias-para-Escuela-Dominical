// Exportación centralizada de todos los modelos
const Maestro = require('./Maestro');
const Alumno = require('./Alumno');
const Asistencia = require('./Asistencia');
const Database = require('./Database');

module.exports = {
  Maestro,
  Alumno,
  Asistencia,
  Database
};