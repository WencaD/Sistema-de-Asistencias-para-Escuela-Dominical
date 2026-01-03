// Dashboard IEBM

let maestroData = null, alumnosData = [], asistenciasData = [], chartsInstances = {};

document.addEventListener('DOMContentLoaded', () => {
  if (!verificarAutenticacion()) return;
  inicializarDashboard();
  configurarEventos();
  actualizarFecha();
  setTimeout(cargarDatos, 500);
});

function verificarAutenticacion() {
  const token = localStorage.getItem('authToken');
  maestroData = JSON.parse(localStorage.getItem('maestroData') || 'null');
  if (!token || !maestroData) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

function inicializarDashboard() {
  if (!maestroData) return;
  document.getElementById('maestroNombre').textContent = maestroData.nombre;
  document.getElementById('maestroInfo').textContent = `${maestroData.nombre} - ${maestroData.clase}`;
  document.querySelectorAll('#claseNombre').forEach(el => {
    if (el) el.textContent = maestroData.clase || 'Mi Clase';
  });
}

async function cargarDatos() {
  await cargarAlumnosPrueba();
  await cargarAsistenciasPrueba();
  inicializarGraficos();
}

function cargarAlumnosPrueba() {
  const alumnoPorClase = {
    parvulos: [
      { id: 1, nombre: 'Ana Sofía García', edad: 5, telefono: '555-1234', email: 'ana@email.com', activo: true },
      { id: 9, nombre: 'Isabella Torres', edad: 4, telefono: '555-9012', email: 'isabella@email.com', activo: true },
      { id: 10, nombre: 'Mateo Ruiz', edad: 7, telefono: '555-0123', email: 'mateo@email.com', activo: true },
      { id: 11, nombre: 'Emma Castillo', edad: 6, telefono: '555-1111', email: 'emma@email.com', activo: true },
      { id: 12, nombre: 'Lucas Flores', edad: 5, telefono: '555-2222', email: 'lucas@email.com', activo: true },
      { id: 13, nombre: 'Sofía Mendoza', edad: 6, telefono: '555-3333', email: 'sofia.m@email.com', activo: true },
      { id: 14, nombre: 'Juan Martín', edad: 5, telefono: '555-4444', email: 'juan.m@email.com', activo: true },
      { id: 15, nombre: 'Lucía Ramírez', edad: 6, telefono: '555-5555', email: 'lucia@email.com', activo: true }
    ],
    intermedios: [
      { id: 2, nombre: 'Carlos Alberto López', edad: 9, telefono: '555-2345', email: 'carlos@email.com', activo: true },
      { id: 3, nombre: 'María Isabel Rodríguez', edad: 8, telefono: '555-3456', email: 'maria@email.com', activo: true },
      { id: 4, nombre: 'José Manuel Martínez', edad: 9, telefono: '555-4567', email: 'jose@email.com', activo: true },
      { id: 16, nombre: 'Valentina Cruz', edad: 10, telefono: '555-1357', email: 'valentina@email.com', activo: true },
      { id: 17, nombre: 'Santiago Morales', edad: 11, telefono: '555-2468', email: 'santiago@email.com', activo: true },
      { id: 18, nombre: 'Martina López', edad: 8, telefono: '555-6666', email: 'martina@email.com', activo: true },
      { id: 19, nombre: 'David González', edad: 10, telefono: '555-7777', email: 'david.g@email.com', activo: true },
      { id: 20, nombre: 'Paula Sánchez', edad: 9, telefono: '555-8888', email: 'paula@email.com', activo: true }
    ],
    adolescentes: [
      { id: 5, nombre: 'Sofia Elena Hernández', edad: 14, telefono: '555-5678', email: 'sofia.h@email.com', activo: true },
      { id: 6, nombre: 'Daniel Alejandro Pérez', edad: 15, telefono: '555-6789', email: 'daniel@email.com', activo: true },
      { id: 21, nombre: 'Camila Herrera', edad: 13, telefono: '555-3691', email: 'camila@email.com', activo: true },
      { id: 22, nombre: 'Alejandro Castillo', edad: 16, telefono: '555-4702', email: 'alejandro@email.com', activo: true },
      { id: 23, nombre: 'Natalia Reyes', edad: 14, telefono: '555-9999', email: 'natalia@email.com', activo: true },
      { id: 24, nombre: 'Tomás Arias', edad: 15, telefono: '555-0000', email: 'tomas@email.com', activo: true },
      { id: 25, nombre: 'Beatriz Moreno', edad: 13, telefono: '555-1111', email: 'beatriz@email.com', activo: true },
      { id: 26, nombre: 'Andrés Silva', edad: 16, telefono: '555-2222', email: 'andres@email.com', activo: true }
    ],
    adultos: [
      { id: 7, nombre: 'Carmen Jiménez', edad: 35, telefono: '555-7890', email: 'carmen@email.com', activo: true },
      { id: 8, nombre: 'Roberto Vega', edad: 42, telefono: '555-8901', email: 'roberto@email.com', activo: true },
      { id: 27, nombre: 'Patricia Reyes', edad: 28, telefono: '555-5813', email: 'patricia@email.com', activo: true },
      { id: 28, nombre: 'Fernando García', edad: 45, telefono: '555-6924', email: 'fernando@email.com', activo: true },
      { id: 29, nombre: 'Marta Rodríguez', edad: 38, telefono: '555-3333', email: 'marta@email.com', activo: true },
      { id: 30, nombre: 'Juan Carlos López', edad: 52, telefono: '555-4444', email: 'juan.carlos@email.com', activo: true },
      { id: 31, nombre: 'Rosa Martínez', edad: 41, telefono: '555-5555', email: 'rosa@email.com', activo: true },
      { id: 32, nombre: 'Miguel Hernández', edad: 48, telefono: '555-6666', email: 'miguel@email.com', activo: true }
    ]
  };
  
  const claseKey = (maestroData.clase || '').toLowerCase().trim();
  alumnosData = alumnoPorClase[claseKey] || [];
  actualizarEstadisticas();
}

function cargarAsistenciasPrueba() {
  asistenciasData = [];
  const hoy = new Date().toISOString().split('T')[0];
  
  alumnosData.forEach((alumno) => {
    const random = Math.random();
    let estado = 'presente';
    if (random > 0.95) estado = 'ausente';
    else if (random > 0.85) estado = 'tardanza';
    
    const hora = new Date(hoy);
    const minutos = Math.floor(Math.random() * 30);
    hora.setHours(9, minutos, 0);
    
    asistenciasData.push({
      id: Math.random(),
      alumno_id: alumno.id,
      fecha: hoy,
      hora_llegada: hora.toISOString(),
      estado: estado,
      observaciones: ''
    });
  });
  
  renderAsistencia();
  actualizarEstadisticas();
}

function actualizarEstadisticas() {
  const total = alumnosData.filter(a => a.activo).length;
  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciasClase = asistenciasData.filter(a => alumnosIds.includes(a.alumno_id));
  
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
  
  const hoy = new Date().toISOString().split('T')[0];
  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciaHoy = asistenciasData.filter(a => 
    alumnosIds.includes(a.alumno_id) && a.fecha === hoy
  );
  
  if (asistenciaHoy.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5"><i class="fas fa-calendar-plus fa-3x text-muted mb-3"></i><p class="text-muted">Sin asistencias registradas hoy</p></td></tr>`;
    return;
  }
  
  tbody.innerHTML = asistenciaHoy.map(a => {
    const alumno = alumnosData.find(al => al.id === a.alumno_id);
    const hora = new Date(a.hora_llegada).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
    const badge = a.estado === 'presente' ? '<span class="badge badge-presente">Presente</span>' : 
                  a.estado === 'tardanza' ? '<span class="badge badge-tardanza">Tardanza</span>' : 
                  '<span class="badge badge-ausente">Ausente</span>';
    return `<tr>
      <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno?.nombre?.charAt(0)}</div><div><div class="fw-medium">${alumno?.nombre}</div><small class="text-muted">${alumno?.edad || 0} años</small></div></div></td>
      <td>${badge}</td>
      <td><i class="fas fa-clock me-2 text-muted"></i>${hora}</td>
      <td><button class="btn btn-outline-primary btn-sm" onclick="editarAsistencia(${a.id})"><i class="fas fa-edit"></i></button><button class="btn btn-outline-danger btn-sm ms-1" onclick="eliminarAsistencia(${a.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function tomarAsistencia() {
  const ahora = new Date();
  document.getElementById('fechaAsistencia').value = ahora.toISOString().split('T')[0];
  document.getElementById('horaAsistencia').value = ahora.toTimeString().slice(0, 5);
  
  const tbody = document.getElementById('alumnosAsistenciaList');
  tbody.innerHTML = alumnosData.filter(a => a.activo).map(alumno => {
    const asistenciaExistente = asistenciasData.find(a => a.alumno_id === alumno.id);
    const estado = asistenciaExistente?.estado || '';
    return `<tr data-alumno-id="${alumno.id}">
      <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno.nombre.charAt(0)}</div><span>${alumno.nombre}</span></div></td>
      <td><input type="radio" name="estado_${alumno.id}" value="presente" ${estado === 'presente' ? 'checked' : ''}> Presente</td>
      <td><input type="radio" name="estado_${alumno.id}" value="tardanza" ${estado === 'tardanza' ? 'checked' : ''}> Tardanza</td>
      <td><input type="radio" name="estado_${alumno.id}" value="ausente" ${estado === 'ausente' ? 'checked' : ''}> Ausente</td>
      <td><input type="text" class="form-control form-control-sm" placeholder="Obs..." id="observaciones_${alumno.id}" value="${asistenciaExistente?.observaciones || ''}"></td>
    </tr>`;
  }).join('');
  
  new bootstrap.Modal(document.getElementById('tomarAsistenciaModal')).show();
}

function guardarAsistencia() {
  const fecha = document.getElementById('fechaAsistencia').value;
  const hora = document.getElementById('horaAsistencia').value;
  asistenciasData = [];
  
  alumnosData.filter(a => a.activo).forEach(alumno => {
    const radio = document.querySelector(`input[name="estado_${alumno.id}"]:checked`);
    if (radio) {
      asistenciasData.push({
        id: Math.random(),
        alumno_id: alumno.id,
        fecha: fecha,
        hora_llegada: `${fecha}T${hora}:00`,
        estado: radio.value,
        observaciones: document.getElementById(`observaciones_${alumno.id}`).value
      });
    }
  });
  
  showAlert('Asistencia guardada', 'success');
  renderAsistencia();
  actualizarEstadisticas();
  bootstrap.Modal.getInstance(document.getElementById('tomarAsistenciaModal')).hide();
}

function gestionarAlumnos() {
  renderTablaAlumnos();
  new bootstrap.Modal(document.getElementById('gestionarAlumnosModal')).show();
}

function renderTablaAlumnos() {
  const tbody = document.getElementById('alumnosTableBody');
  if (!tbody) return;
  tbody.innerHTML = alumnosData.filter(a => a.activo).map(alumno => `<tr>
    <td><div class="d-flex align-items-center"><div class="avatar-circle me-2">${alumno.nombre.charAt(0)}</div><div><div class="fw-medium">${alumno.nombre}</div><small class="text-muted">${alumno.email}</small></div></div></td>
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
  const id = document.getElementById('alumnoId').value;
  const datos = {
    nombre: document.getElementById('alumnoNombre').value.trim(),
    edad: parseInt(document.getElementById('alumnoEdad').value) || null,
    telefono: document.getElementById('alumnoTelefono').value.trim(),
    email: document.getElementById('alumnoEmail').value.trim(),
    activo: true
  };
  
  if (!datos.nombre) {
    showAlert('El nombre es requerido', 'warning');
    return;
  }
  
  if (id) {
    const idx = alumnosData.findIndex(a => a.id == id);
    if (idx !== -1) alumnosData[idx] = { ...alumnosData[idx], ...datos };
  } else {
    alumnosData.push({ id: Date.now(), ...datos });
  }
  
  showAlert('Alumno guardado', 'success');
  bootstrap.Modal.getInstance(document.getElementById('formularioAlumnoModal')).hide();
  actualizarEstadisticas();
  renderTablaAlumnos();
}

function editarAlumno(id) { mostrarFormularioAlumno(id); }

function confirmarEliminar(id) {
  const alumno = alumnosData.find(a => a.id === id);
  if (confirm(`¿Eliminar a ${alumno?.nombre}?`)) {
    alumnosData = alumnosData.filter(a => a.id !== id);
    showAlert('Alumno eliminado', 'success');
    actualizarEstadisticas();
    renderTablaAlumnos();
  }
}

function editarAsistencia(id) {
  const a = asistenciasData.find(x => x.id === id);
  const alumno = alumnosData.find(al => al.id === a.alumno_id);
  const estado = prompt(`Editar asistencia de ${alumno?.nombre}\n(presente/tardanza/ausente):`);
  if (estado && ['presente', 'tardanza', 'ausente'].includes(estado)) {
    a.estado = estado;
    renderAsistencia();
    actualizarEstadisticas();
    showAlert('Asistencia actualizada', 'success');
  }
}

function eliminarAsistencia(id) {
  const a = asistenciasData.find(x => x.id === id);
  const alumno = alumnosData.find(al => al.id === a.alumno_id);
  if (confirm(`¿Eliminar asistencia de ${alumno?.nombre}?`)) {
    asistenciasData = asistenciasData.filter(x => x.id !== id);
    renderAsistencia();
    actualizarEstadisticas();
    showAlert('Asistencia eliminada', 'success');
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
  if (!ctx) {
    console.warn('Canvas chartSemanal no encontrado');
    return;
  }
  
  const labels = [];
  const datos = [];
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    labels.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
    const presentes = asistenciasData.filter(a => a.fecha === fecha.toISOString().split('T')[0] && a.estado === 'presente').length;
    datos.push(presentes > 0 ? presentes : Math.floor(Math.random() * 20) + 10);
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
          y: { beginAtZero: true, max: Math.max(...datos) + 5, ticks: { stepSize: 5 } }
        }
      }
    });
  } catch (e) {
    console.error('Error creando gráfico semanal:', e);
  }
}

function crearGraficoDistribucion() {
  const ctx = document.getElementById('chartDistribucion');
  if (!ctx) {
    console.warn('Canvas chartDistribucion no encontrado');
    return;
  }
  
  const alumnosIds = alumnosData.map(a => a.id);
  const asistenciasClase = asistenciasData.filter(a => alumnosIds.includes(a.alumno_id));
  
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
      return `<tr><td>${alumno?.nombre}</td><td>${a.fecha}</td><td><span class="badge ${a.estado === 'presente' ? 'badge-presente' : a.estado === 'tardanza' ? 'badge-tardanza' : 'badge-ausente'}">${a.estado}</span></td><td>${new Date(a.hora_llegada).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</td></tr>`;
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
      return { 
        Alumno: alumno?.nombre || 'Desconocido', 
        Edad: alumno?.edad || '-',
        Fecha: a.fecha, 
        Estado: a.estado.toUpperCase(), 
        Hora: a.hora_llegada 
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
    const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `asistencias_${maestroData.clase}_${fecha}.xlsx`);
    showAlert('Archivo Excel descargado correctamente', 'success');
    new bootstrap.Modal(document.getElementById('reportesModal')).hide();
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
      doc.text(`${alumno?.nombre || 'Desconocido'}`, 25, y);
      doc.text(`${a.estado.toUpperCase()}`, 80, y);
      doc.text(`${a.hora_llegada}`, 110, y);
      y += 6;
      if (y > 270) { 
        doc.addPage(); 
        y = 20; 
      }
    });
    
    const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
    doc.save(`reporte_${maestroData.clase}_${fecha}.pdf`);
    showAlert('PDF descargado correctamente', 'success');
    new bootstrap.Modal(document.getElementById('reportesModal')).hide();
  } catch (error) {
    console.error('Error exportar PDF:', error);
    showAlert('Error al exportar PDF: ' + error.message, 'danger');
  }
}

function mostrarReportes() {
  new bootstrap.Modal(document.getElementById('reportesModal')).show();
}

function actualizarDatos() {
  renderAsistencia();
  actualizarEstadisticas();
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
  document.getElementById('fechaActual').textContent = fechaFormateada;
}

function configurarEventos() {
  const buscador = document.getElementById('buscarAlumno');
  if (buscador) {
    buscador.addEventListener('input', function() {
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
window.confirmarEliminar = confirmarEliminar;
window.mostrarReportes = mostrarReportes;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.cerrarSesion = cerrarSesion;
window.verHistorial = verHistorial;