/**
 * DASHBOARD IEBM - Lógica Principal
 * Maneja todo lo relacionado con:
 * - Visualización de alumnos
 * - Registro de asistencias
 * - Gráficos y estadísticas
 * - Exportación de reportes
 */

// Variables globales para almacenar datos
let maestroData = null;           // Datos del maestro logueado (id, nombre, clase, email)
let alumnosData = [];              // Arreglo de alumnos de la clase del maestro
let asistenciasData = [];          // Arreglo de asistencias registradas
let chartsInstances = {};          // Instancias de gráficos Chart.js (para actualizarlos)

/**
 * Ejecutar al cargar la página HTML
 * 1. Verificar que el maestro está autenticado
 * 2. Cargar datos iniciales
 * 3. Configurar eventos de botones/formularios
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!verificarAutenticacion()) return;
  inicializarDashboard();
  configurarEventos();
  actualizarFecha();
  setTimeout(cargarDatos, 500);

  // Auto-refresco cada 30 segundos para mantener la lista actualizada
  setInterval(() => {
    console.log('🔄 Refrescando datos automáticamente...');
    cargarDatos();
  }, 30000);
});

/**
 * Verifica que el maestro tenga un token JWT válido
 * Si no existe, redirige al login
 */
function verificarAutenticacion() {
  const token = localStorage.getItem('authToken');
  maestroData = JSON.parse(localStorage.getItem('maestroData') || 'null');
  if (!token || !maestroData) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

/**
 * Inicializa el dashboard con datos del maestro logueado
 * Mostra nombre, clase y otros datos en la interfaz
 */
function inicializarDashboard() {
  if (!maestroData) return;
  document.getElementById('maestroNombre').textContent = maestroData.nombre;
  document.getElementById('maestroInfo').textContent = `${maestroData.nombre} - ${maestroData.clase}`;
  document.querySelectorAll('#claseNombre').forEach(el => {
    if (el) el.textContent = maestroData.clase || 'Mi Clase';
  });
}

async function cargarDatos() {
  mostrarSpinner();
  const token = localStorage.getItem('authToken');

  try {
    // Cargar alumnos desde API con timeout
    const resAlumnos = await Promise.race([
      fetch('/api/alumnos', { headers: { 'Authorization': `Bearer ${token}` } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    if (resAlumnos.ok) {
      const data = await resAlumnos.json();
      alumnosData = data.alumnos || [];
      console.log('✅ Alumnos cargados:', alumnosData.length, alumnosData);
    }
  } catch (e) {
    console.warn('No se pudo cargar alumnos desde API:', e.message);
  }

  // Cargar asistencias de hoy
  try {
    const resAsistencias = await Promise.race([
      fetch('/api/asistencias/hoy', { headers: { 'Authorization': `Bearer ${token}` } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    if (resAsistencias.ok) {
      const dataA = await resAsistencias.json();
      console.log('📊 Datos de asistencias crudos:', dataA);
      asistenciasData = (dataA.asistencias || []).map(a => ({ id: a.alumno_id + '_' + a.fecha, ...a }));
      console.log('✅ Asistencias cargadas:', asistenciasData.length, asistenciasData);
    } else {
      console.error('Error en respuesta de asistencias:', resAsistencias.status);
    }
  } catch (e) {
    console.warn('No se pudo cargar asistencias desde API:', e.message);
  }

  renderAsistencia();
  inicializarGraficos();
  actualizarEstadisticas();
}

function mostrarSpinner() {
  const tbody = document.getElementById('asistenciaTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-iebm" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-3 text-muted">Cargando datos de asistencia...</p></td></tr>`;
  }
}

async function cargarAlumnos() {
  const token = localStorage.getItem('authToken');
  try {
    const res = await fetch('/api/alumnos', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      alumnosData = data.alumnos || [];
      return;
    }
  } catch (e) {
    console.warn('Error cargando alumnos desde API', e);
  }
}

function actualizarEstadisticas() {
  // Usar fecha local, no UTC
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const día = String(ahora.getDate()).padStart(2, '0');
  const hoy = `${año}-${mes}-${día}`;

  const total = alumnosData.filter(a => a.activo).length;
  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciasClase = asistenciasData.filter(a =>
    alumnosIds.includes(a.alumno_id) && a.fecha === hoy
  );

  console.log(`📊 Estadísticas - Total alumnos: ${total}, Asistencias hoy: ${asistenciasClase.length}`);

  const presentes = asistenciasClase.filter(a => a.estado === 'presente').length;
  const tardanzas = asistenciasClase.filter(a => a.estado === 'tardanza').length;
  const ausentes = Math.max(0, total - presentes - tardanzas);

  document.getElementById('totalAlumnos').textContent = total;
  document.getElementById('presentesHoy').textContent = presentes;
  document.getElementById('llegadasTarde').textContent = tardanzas;
  document.getElementById('faltasHoy').textContent = ausentes;

  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
  document.getElementById('porcentajeAsistencia').textContent = `${porcentaje}%`;
  document.getElementById('resumenTotal').textContent = total;
}

function renderAsistencia() {
  const tbody = document.getElementById('asistenciaTableBody');

  // Usar fecha local, no UTC
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const día = String(ahora.getDate()).padStart(2, '0');
  const hoy = `${año}-${mes}-${día}`;

  console.log('📅 Fecha de hoy:', hoy);
  console.log('👥 Alumnos:', alumnosData);
  console.log('📋 Asistencias:', asistenciasData);

  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciaHoy = asistenciasData.filter(a => {
    const match = alumnosIds.includes(a.alumno_id) && a.fecha === hoy;
    console.log(`Filtrando: alumno_id=${a.alumno_id}, fecha=${a.fecha}, match=${match}`);
    return match;
  });

  console.log('🎯 Asistencias filtradas para hoy:', asistenciaHoy.length, asistenciaHoy);

  if (asistenciaHoy.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="fas fa-calendar-plus fa-3x text-muted mb-3"></i><p class="text-muted">Sin asistencias registradas hoy</p></td></tr>`;
    return;
  }

  tbody.innerHTML = asistenciaHoy.map(a => {
    const alumno = alumnosData.find(al => al.id === a.alumno_id);
    // Formatear la hora: si es string "HH:MM", mostrar directamente; si es DateTime, extraer hora
    let horaFormato = '--:--';
    if (a.hora_llegada) {
      if (typeof a.hora_llegada === 'string' && a.hora_llegada.includes(':')) {
        // Es un string en formato "HH:MM"
        horaFormato = a.hora_llegada;
      } else {
        // Es un datetime, extraer la hora
        const fecha = new Date(a.hora_llegada);
        if (!isNaN(fecha)) {
          horaFormato = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
      }
    }
    const badge = a.estado === 'presente' ? '<span class="badge badge-presente">Presente</span>' :
      a.estado === 'tardanza' ? '<span class="badge badge-tardanza">Tardanza</span>' :
        '<span class="badge badge-ausente">Ausente</span>';
    return `<tr>
      <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno?.nombre?.charAt(0)}</div><div><div class="fw-medium">${alumno?.nombre}</div><small class="text-muted">${alumno?.edad || 0} años</small></div></div></td>
      <td>${badge}</td>
      <td><i class="fas fa-clock me-2 text-muted"></i>${horaFormato}</td>
      <td><button class="btn btn-outline-primary btn-sm" onclick="editarAsistencia('${a.id}')"><i class="fas fa-edit"></i></button><button class="btn btn-outline-danger btn-sm ms-1" onclick="eliminarAsistencia('${a.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function tomarAsistencia() {
  const ahora = new Date();
  // Usar fecha local, no UTC
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const día = String(ahora.getDate()).padStart(2, '0');
  const fechaLocal = `${año}-${mes}-${día}`;

  document.getElementById('fechaAsistencia').value = fechaLocal;
  document.getElementById('horaAsistencia').value = ahora.toTimeString().slice(0, 5);

  const tbody = document.getElementById('alumnosAsistenciaList');
  tbody.innerHTML = alumnosData.filter(a => a.activo).map(alumno => {
    const asistenciaExistente = asistenciasData.find(a => a.alumno_id === alumno.id);
    const estado = asistenciaExistente?.estado || '';

    // Si ya tiene una hora registrada, usarla. Si no, usar la hora actual del modal.
    const horaAlumno = asistenciaExistente?.hora_llegada ?
      (typeof asistenciaExistente.hora_llegada === 'string' && asistenciaExistente.hora_llegada.includes(':') ?
        asistenciaExistente.hora_llegada :
        new Date(asistenciaExistente.hora_llegada).toTimeString().slice(0, 5)) :
      document.getElementById('horaAsistencia').value;

    return `<tr data-alumno-id="${alumno.id}">
      <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno.nombre.charAt(0)}</div><span>${alumno.nombre}</span></div></td>
      <td class="text-center">
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="estado_${alumno.id}" id="pres_${alumno.id}" value="presente" ${estado === 'presente' ? 'checked' : ''}>
          <label class="btn btn-outline-success btn-sm" for="pres_${alumno.id}">P</label>
          
          <input type="radio" class="btn-check" name="estado_${alumno.id}" id="tard_${alumno.id}" value="tardanza" ${estado === 'tardanza' ? 'checked' : ''}>
          <label class="btn btn-outline-warning btn-sm" for="tard_${alumno.id}">T</label>
          
          <input type="radio" class="btn-check" name="estado_${alumno.id}" id="aus_${alumno.id}" value="ausente" ${estado === 'ausente' ? 'checked' : ''}>
          <label class="btn btn-outline-danger btn-sm" for="aus_${alumno.id}">F</label>
        </div>
      </td>
      <td>
        <input type="time" class="form-control form-control-sm" id="hora_${alumno.id}" value="${horaAlumno}">
      </td>
      <td><input type="text" class="form-control form-control-sm" placeholder="Obs..." id="observaciones_${alumno.id}" value="${asistenciaExistente?.observaciones || ''}"></td>
    </tr>`;
  }).join('');

  new bootstrap.Modal(document.getElementById('tomarAsistenciaModal')).show();
}

function guardarAsistencia() {
  (async () => {
    const fecha = document.getElementById('fechaAsistencia').value;
    const hora = document.getElementById('horaAsistencia').value;
    const token = localStorage.getItem('authToken');

    if (!fecha || !hora) {
      showAlert('Fecha y hora son requeridas', 'warning');
      return;
    }

    const asistenciasAGuardar = [];
    alumnosData.filter(a => a.activo).forEach(alumno => {
      const radio = document.querySelector(`input[name="estado_${alumno.id}"]:checked`);
      const horaAlumno = document.getElementById(`hora_${alumno.id}`).value;
      if (radio) {
        asistenciasAGuardar.push({
          alumno_id: alumno.id,
          hora_llegada: horaAlumno || hora,
          estado: radio.value,
          observaciones: document.getElementById(`observaciones_${alumno.id}`).value || ''
        });
      }
    });

    if (asistenciasAGuardar.length === 0) {
      showAlert('Debes seleccionar al menos un alumno', 'warning');
      return;
    }

    console.log(`📤 Enviando ${asistenciasAGuardar.length} registros de asistencia:`, asistenciasAGuardar);

    try {
      const res = await fetch('/api/asistencias/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fecha, asistencias: asistenciasAGuardar })
      });

      const responseData = await res.json();
      console.log('📥 Respuesta del servidor:', responseData);

      if (!res.ok) {
        throw new Error(responseData.error || 'Error guardando asistencia');
      }

      showAlert('✅ Asistencia guardada correctamente', 'success');

      // Forzar recarga completa de datos y actualizar UI
      await cargarDatos();

      bootstrap.Modal.getInstance(document.getElementById('tomarAsistenciaModal')).hide();
    } catch (e) {
      console.error('❌ Error:', e);
      showAlert('Error: ' + e.message, 'danger');
    }
  })();
}

function gestionarAlumnos() {
  renderTablaAlumnos();
  new bootstrap.Modal(document.getElementById('gestionarAlumnosModal')).show();
}

function renderTablaAlumnos() {
  const tbody = document.getElementById('alumnosTableBody');
  if (!tbody) return;
  tbody.innerHTML = alumnosData.filter(a => a.activo).map(alumno => `<tr>
    <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno.nombre.charAt(0)}</div><div><div class="fw-medium">${alumno.nombre}</div><small class="text-muted">${alumno.email || 'sin email'}</small></div></div></td>
    <td>${alumno.edad || 'N/A'}</td>
    <td>${alumno.telefono || 'Sin teléfono'}</td>
    <td><span class="badge bg-success">Activo</span></td>
    <td><button class="btn btn-outline-primary btn-sm" onclick="editarAlumno(${alumno.id})"><i class="fas fa-edit"></i></button><button class="btn btn-outline-danger btn-sm ms-1" onclick="confirmarEliminar(${alumno.id})"><i class="fas fa-trash"></i></button></td>
  </tr>`).join('');
}

function mostrarFormularioAlumno(id = null) {
  const form = document.getElementById('formularioAlumno');
  form.reset();
  document.getElementById('alumnoId').value = '';
  const title = document.getElementById('formularioAlumnoTitle');

  if (id) {
    const alumno = alumnosData.find(a => a.id === id);
    if (alumno) {
      title.innerHTML = '<i class="fas fa-user-edit me-2"></i>Editar Alumno';
      document.getElementById('alumnoId').value = alumno.id;
      document.getElementById('alumnoNombre').value = alumno.nombre;
      document.getElementById('alumnoEdad').value = alumno.edad || '';
      document.getElementById('alumnoTelefono').value = alumno.telefono || '';
      document.getElementById('alumnoEmail').value = alumno.email || '';
    }
  } else {
    title.innerHTML = '<i class="fas fa-user-plus me-2"></i>Agregar Alumno';
  }
  new bootstrap.Modal(document.getElementById('formularioAlumnoModal')).show();
}

function guardarAlumno() {
  (async () => {
    const id = document.getElementById('alumnoId').value;
    const datos = {
      nombre: document.getElementById('alumnoNombre').value.trim(),
      edad: parseInt(document.getElementById('alumnoEdad').value) || null,
      telefono: document.getElementById('alumnoTelefono').value.trim()
    };

    if (!datos.nombre) {
      showAlert('El nombre es requerido', 'warning');
      return;
    }

    const token = localStorage.getItem('authToken');

    try {
      if (id) {
        const res = await fetch(`/api/alumnos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(datos)
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error actualizando alumno');
        }
        showAlert('Alumno actualizado', 'success');
      } else {
        const res = await fetch('/api/alumnos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(datos)
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creando alumno');
        }
        showAlert('Alumno creado', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('formularioAlumnoModal')).hide();
      await cargarAlumnos();
      renderTablaAlumnos();
      actualizarEstadisticas();
    } catch (e) {
      console.error(e);
      showAlert('Error: ' + e.message, 'danger');
    }
  })();
}

function editarAlumno(id) { mostrarFormularioAlumno(id); }

function confirmarEliminar(id) {
  (async () => {
    const alumno = alumnosData.find(a => a.id === id);
    if (!confirm(`¿Eliminar a ${alumno?.nombre}?`)) return;
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/alumnos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error eliminando alumno');
      }
      showAlert('Alumno eliminado', 'success');
      await cargarAlumnos();
      renderTablaAlumnos();
      actualizarEstadisticas();
    } catch (e) {
      console.error(e);
      showAlert('Error: ' + e.message, 'danger');
    }
  })();
}

async function editarAsistencia(id) {
  const a = asistenciasData.find(x => x.id === id);
  if (!a) return;
  const alumno = alumnosData.find(al => al.id === a.alumno_id);

  const nuevoEstado = prompt(`Editar asistencia de ${alumno?.nombre}\n(presente/tardanza/ausente):`, a.estado);
  if (nuevoEstado && ['presente', 'tardanza', 'ausente'].includes(nuevoEstado)) {
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          alumno_id: a.alumno_id,
          fecha: a.fecha,
          hora_llegada: a.hora_llegada,
          estado: nuevoEstado,
          observaciones: a.observaciones
        })
      });

      if (res.ok) {
        showAlert('✅ Asistencia actualizada correctamente', 'success');
        await cargarDatos();
      } else {
        throw new Error('Error al actualizar en el servidor');
      }
    } catch (e) {
      showAlert('Error: ' + e.message, 'danger');
    }
  }
}

async function eliminarAsistencia(id) {
  const a = asistenciasData.find(x => x.id === id);
  if (!a) return;
  const alumno = alumnosData.find(al => al.id === a.alumno_id);

  if (confirm(`¿Eliminar definitivamente la asistencia de ${alumno?.nombre}?`)) {
    const token = localStorage.getItem('authToken');
    try {
      // Usamos el endpoint de eliminar si existe, o una marca en el POST
      // Dado que no hay endpoint DELETE explícito para asistencia en el backend actual, 
      // pero sí hay un modelo Alumno.js con delete, asumiremos que necesitamos registrarla como 'ausente' o similar,
      // o mejor, crear el endpoint si es necesario. Por ahora, si no hay DELETE, lanzamos alerta.

      showAlert('⚠️ La eliminación directa no está disponible. Cambie el estado a "Ausente" o edítela.', 'warning');

      /* 
      // Si existiera el endpoint:
      const res = await fetch(`/api/asistencias/${a.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showAlert('Asistencia eliminada', 'success');
        await cargarDatos();
      } 
      */
    } catch (e) {
      showAlert('Error: ' + e.message, 'danger');
    }
  }
}

function inicializarGraficos() {
  setTimeout(() => {
    crearGraficoSemanal();
    crearGraficoDistribucion();
  }, 100);
}

function crearGraficoSemanal() {
  const ctx = document.getElementById('chartSemanal');
  if (!ctx) return;

  const labels = [];
  const datos = [];
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    labels.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
    const presentes = asistenciasData.filter(a => a.fecha === fechaStr && a.estado === 'presente').length;
    datos.push(presentes > 0 ? presentes : 0);
  }

  if (chartsInstances.semanal) chartsInstances.semanal.destroy();

  try {
    chartsInstances.semanal = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Presentes',
          data: datos,
          borderColor: '#20B2AA',
          backgroundColor: 'rgba(32, 178, 170, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#20B2AA',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          filler: { propagate: true }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  } catch (e) {
    console.error('Error creando gráfico semanal:', e);
  }
}

function crearGraficoDistribucion() {
  const ctx = document.getElementById('chartDistribucion');
  if (!ctx) return;

  // Usar fecha local, no UTC
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const día = String(ahora.getDate()).padStart(2, '0');
  const hoy = `${año}-${mes}-${día}`;

  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciasClase = asistenciasData.filter(a =>
    alumnosIds.includes(a.alumno_id) && a.fecha === hoy
  );

  const presentes = asistenciasClase.filter(a => a.estado === 'presente').length;
  const tardanzas = asistenciasClase.filter(a => a.estado === 'tardanza').length;
  const ausentes = Math.max(0, alumnosData.length - presentes - tardanzas);

  if (chartsInstances.distribucion) chartsInstances.distribucion.destroy();

  try {
    chartsInstances.distribucion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Presentes', 'Tardanzas', 'Ausentes'],
        datasets: [{
          data: [presentes, tardanzas, ausentes],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 15 } },
          tooltip: { callbacks: { label: (context) => context.label + ': ' + context.parsed } }
        }
      }
    });
  } catch (e) {
    console.error('Error creando gráfico distribución:', e);
  }
}

function verHistorial() {
  const modal = new bootstrap.Modal(document.getElementById('gestionarAlumnosModal'));
  const tbody = document.getElementById('alumnosTableBody');

  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciasClase = asistenciasData.filter(a => alumnosIds.includes(a.alumno_id));

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">
    <div><h5 class="text-muted">Historial de Asistencias</h5><p class="small text-muted">Total registros: ${asistenciasClase.length}</p></div>
    <table class="table table-sm mt-3"><thead><tr><th>Alumno</th><th>Fecha</th><th>Estado</th><th>Hora</th></tr></thead><tbody>
    ${asistenciasClase.map(a => {
    const alumno = alumnosData.find(al => al.id === a.alumno_id);
    const hora = a.hora_llegada ? new Date(a.hora_llegada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    return `<tr><td>${alumno?.nombre}</td><td>${a.fecha}</td><td><span class="badge ${a.estado === 'presente' ? 'bg-success' : a.estado === 'tardanza' ? 'bg-warning' : 'bg-danger'}">${a.estado}</span></td><td>${hora}</td></tr>`;
  }).join('')}
    </tbody></table>
  </td></tr>`;
  modal.show();
}

function exportarExcel() {
  try {
    if (!window.XLSX) {
      showAlert('Error: Librería XLSX no cargada', 'danger');
      return;
    }

    const fechaSeleccionada = document.getElementById('fechaReporte')?.value;
    const alumnosIds = alumnosData.map(a => a.id);
    let asistenciasClase = asistenciasData.filter(a => alumnosIds.includes(a.alumno_id));

    if (fechaSeleccionada) {
      asistenciasClase = asistenciasClase.filter(a => a.fecha === fechaSeleccionada);
    }

    if (asistenciasClase.length === 0) {
      showAlert('No hay datos de asistencia para exportar', 'warning');
      return;
    }

    const datos = asistenciasClase.map(a => {
      const alumno = alumnosData.find(al => al.id === a.alumno_id);
      const hora = a.hora_llegada ? new Date(a.hora_llegada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      return {
        Alumno: alumno?.nombre || 'Desconocido',
        Edad: alumno?.edad || '-',
        Fecha: a.fecha,
        Estado: a.estado.toUpperCase(),
        Hora: hora
      };
    });

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
    const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `asistencias_${maestroData.clase}_${fecha}.xlsx`);
    showAlert('Archivo Excel descargado correctamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('reportesModal')).hide();
  } catch (error) {
    console.error('Error exportar Excel:', error);
    showAlert('Error al exportar Excel: ' + error.message, 'danger');
  }
}

function exportarPDF() {
  try {
    if (!window.jspdf) {
      showAlert('Error: Librería jsPDF no cargada', 'danger');
      return;
    }

    const fechaSeleccionada = document.getElementById('fechaReporte')?.value;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Reporte de Asistencias - IEBM', 20, 20);

    doc.setFontSize(11);
    doc.text(`Clase: ${maestroData.clase}`, 20, 30);
    doc.text(`Maestro: ${maestroData.nombre}`, 20, 38);
    const fechaFormato = fechaSeleccionada ? new Date(fechaSeleccionada).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
    doc.text(`Fecha: ${fechaFormato}`, 20, 46);

    const alumnosIds = alumnosData.map(a => a.id);
    let asistenciasClase = asistenciasData.filter(a => alumnosIds.includes(a.alumno_id));

    if (fechaSeleccionada) {
      asistenciasClase = asistenciasClase.filter(a => a.fecha === fechaSeleccionada);
    }

    if (asistenciasClase.length === 0) {
      showAlert('No hay datos de asistencia para exportar', 'warning');
      return;
    }

    const presentes = asistenciasClase.filter(a => a.estado === 'presente').length;
    const tardanzas = asistenciasClase.filter(a => a.estado === 'tardanza').length;
    const ausentes = asistenciasClase.filter(a => a.estado === 'ausente').length;

    let y = 55;
    doc.setFontSize(12);
    doc.text('Resumen:', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total de Alumnos: ${alumnosData.length}`, 25, y);
    y += 6;
    doc.text(`Presentes: ${presentes}`, 25, y);
    y += 6;
    doc.text(`Tardanzas: ${tardanzas}`, 25, y);
    y += 6;
    doc.text(`Ausentes: ${ausentes}`, 25, y);

    y += 10;
    doc.setFontSize(11);
    doc.text('Detalle de Asistencia:', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Alumno', 25, y);
    doc.text('Estado', 80, y);
    doc.text('Hora', 110, y);
    doc.setFont(undefined, 'normal');
    y += 6;

    asistenciasClase.forEach(a => {
      const alumno = alumnosData.find(al => al.id === a.alumno_id);
      const hora = a.hora_llegada ? new Date(a.hora_llegada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      doc.text(`${alumno?.nombre || 'Desconocido'}`, 25, y);
      doc.text(`${a.estado.toUpperCase()}`, 80, y);
      doc.text(`${hora}`, 110, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
    doc.save(`reporte_${maestroData.clase}_${fecha}.pdf`);
    showAlert('PDF descargado correctamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('reportesModal')).hide();
  } catch (error) {
    console.error('Error exportar PDF:', error);
    showAlert('Error al exportar PDF: ' + error.message, 'danger');
  }
}

function mostrarReportes() {
  new bootstrap.Modal(document.getElementById('reportesModal')).show();
}

function actualizarDatos() {
  cargarDatos();
  showAlert('Datos actualizados', 'info');
}

function cerrarSesion() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('login.html');
}

function actualizarFecha() {
  const ahora = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaFormateada = ahora.toLocaleDateString('es-ES', opciones);
  // Capitalizar primera letra
  const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  document.getElementById('fechaActual').textContent = fechaCapitalizada;
  document.getElementById('fechaResumen').textContent = fechaCapitalizada;
  if (maestroData) {
    document.getElementById('claseResumen').textContent = maestroData.clase;
  }
}

function configurarEventos() {
  const buscador = document.getElementById('buscarAlumno');
  if (buscador) {
    buscador.addEventListener('input', function () {
      const texto = this.value.toLowerCase();
      document.querySelectorAll('#alumnosTableBody tr').forEach(fila => {
        const nombre = fila.querySelector('td')?.textContent.toLowerCase() || '';
        fila.style.display = nombre.includes(texto) ? '' : 'none';
      });
    });
  }
}

function showAlert(message, type = 'info') {
  const container = document.getElementById('alert-container');
  const id = 'alert-' + Date.now();
  const alert = document.createElement('div');
  alert.id = id;
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  container.appendChild(alert);
  setTimeout(() => document.getElementById(id)?.remove(), 5000);
}

// Exportar funciones globales
window.tomarAsistencia = tomarAsistencia;
window.guardarAsistencia = guardarAsistencia;
window.editarAsistencia = editarAsistencia;
window.eliminarAsistencia = eliminarAsistencia;
window.gestionarAlumnos = gestionarAlumnos;
window.mostrarFormularioAlumno = mostrarFormularioAlumno;
window.guardarAlumno = guardarAlumno;
window.editarAlumno = editarAlumno;
window.confirmarEliminar = confirmarEliminar;
window.mostrarReportes = mostrarReportes;
window.actualizarDatos = actualizarDatos;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.cerrarSesion = cerrarSesion;
window.verHistorial = verHistorial;
