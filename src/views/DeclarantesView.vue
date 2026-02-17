<template>
  <MainLayout>
    <div class="declarantes-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🏢 Empresas Declarantes</h1>
          <p class="subtitle">Gestión de identidades fiscales para facturación</p>
        </div>
        
        <div class="header-actions" v-if="esAdmin">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nueva Empresa' : '📋 Ver Listado' }}
          </button>
        </div>
      </div>

      <div v-if="!esAdmin" class="access-denied">
        <h2>⛔ Acceso Restringido</h2>
        <p>Solo los usuarios con rol de <strong>Administrador</strong> pueden gestionar las empresas declarantes.</p>
        <button @click="$router.push('/inicio')" class="btn btn-secondary">Volver al Inicio</button>
      </div>

      <div v-else class="main-content">
        
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Datos Fiscales' : '🏢 Registrar Nueva Empresa' }}</h2>
            <span class="badge-info">Datos del Contribuyente</span>
          </div>

          <form @submit.prevent="guardarDeclarante" class="form-body">
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">NIT <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  v-model="formulario.nit" 
                  class="form-control" 
                  placeholder="0000-000000-000-0"
                  :disabled="modoEdicion" 
                  required
                >
                <small v-if="modoEdicion" class="text-muted">El NIT no se puede modificar.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Razón Social / Nombre <span class="text-danger">*</span></label>
                <input type="text" v-model="formulario.nombre" class="form-control" placeholder="Ej: IMPORTADORA S.A. DE C.V." required>
              </div>
            </div>

            <div class="form-grid mt-3">
              <div class="form-group">
                <label class="form-label">NRC (Registro)</label>
                <input type="text" v-model="formulario.nrc" class="form-control" placeholder="Ej: 123456-7">
              </div>

              <div class="form-group">
                <label class="form-label">Giro / Actividad</label>
                <input type="text" v-model="formulario.giro" class="form-control" placeholder="Ej: VENTA DE PROD. DIVERSOS">
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Dirección Fiscal</label>
              <textarea v-model="formulario.direccion" class="form-control" rows="2" placeholder="Dirección completa..."></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar Ficha' : '💾 Guardar Empresa') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>

          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between">
             <h3>📋 Listado de Empresas</h3>
             <span class="badge-count">{{ listaDeclarantes.length }} Registros</span>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>NIT</th>
                  <th>Empresa / Razón Social</th>
                  <th>NRC</th>
                  <th>Giro</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="empresa in listaDeclarantes" :key="empresa.nit">
                  <td class="font-mono">{{ empresa.nit }}</td>
                  <td class="fw-bold">{{ empresa.nombre }}</td>
                  <td>{{ empresa.nrc || '-' }}</td>
                  <td class="text-muted text-sm">{{ empresa.giro || 'No registrado' }}</td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(empresa)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarDeclarante(empresa.nit)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="listaDeclarantes.length === 0">
                  <td colspan="5" class="text-center py-4 text-muted">No hay empresas registradas.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

// --- CONFIGURACIÓN ---
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/declarantes`;

// --- ESTADOS ---
const esAdmin = ref(false); // Control de acceso
const formulario = ref({ nit: '', nombre: '', nrc: '', giro: '', direccion: '' });
const listaDeclarantes = ref([]);
const mostrandoLista = ref(true); // Empezamos mostrando la lista
const modoEdicion = ref(false);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// --- VERIFICAR ROL AL INICIAR ---
onMounted(() => {
    // Verificar si el usuario es administrador
    // Asumimos que guardas el rol en sessionStorage como 'rolUsuario' o similar
    const rol = sessionStorage.getItem('rolUsuario'); 
    
    if (rol === 'admin') {
        esAdmin.value = true;
        cargarDeclarantes();
    } else {
        esAdmin.value = false;
        // Opcional: Redirigir automáticamente
        // window.location.href = '/inicio'; 
    }
});

// --- MÉTODOS ---

// 1. OBTENER DATOS (GET)
const cargarDeclarantes = async () => {
    try {
        const res = await axios.get(API_URL);
        // Mapeamos los campos de la BD a nuestro formulario
        // BD: iddeclaNIT, declarante, declaNRC, declaGiro, declaDireccion
        listaDeclarantes.value = res.data.map(db => ({
            nit: db.iddeclaNIT,
            nombre: db.declarante,
            nrc: db.declaNRC,
            giro: db.declaGiro,
            direccion: db.declaDireccion
        }));
    } catch (error) {
        console.error("Error cargando declarantes:", error);
        mostrarAlerta('Error de conexión al cargar empresas', 'error');
    }
};

// 2. GUARDAR (POST / PUT)
const guardarDeclarante = async () => {
    cargando.value = true;
    mensaje.value = '';

    try {
        if (modoEdicion.value) {
            // ACTUALIZAR
            await axios.put(`${API_URL}/${formulario.value.nit}`, formulario.value);
            mostrarAlerta('Empresa actualizada correctamente', 'success');
        } else {
            // CREAR
            await axios.post(API_URL, formulario.value);
            mostrarAlerta('Empresa registrada con éxito', 'success');
        }

        await cargarDeclarantes();
        setTimeout(() => { 
            cancelarEdicion();
        }, 1500);

    } catch (error) {
        const txt = error.response?.data?.message || 'Error al guardar datos';
        mostrarAlerta(txt, 'error');
    } finally {
        cargando.value = false;
    }
};

// 3. ELIMINAR (DELETE)
const eliminarDeclarante = async (nit) => {
    if(!confirm('¿Estás seguro de eliminar esta empresa?\nEsta acción podría afectar documentos asociados.')) return;

    try {
        await axios.delete(`${API_URL}/${nit}`);
        listaDeclarantes.value = listaDeclarantes.value.filter(d => d.nit !== nit);
        alert('Empresa eliminada correctamente.');
    } catch (error) {
        console.error(error);
        alert('Error al eliminar: Verifica si la empresa tiene registros asociados.');
    }
};

// --- AYUDAS VISUALES ---
const prepararEdicion = (item) => {
    formulario.value = { ...item }; // Copia de datos
    modoEdicion.value = true;
    mostrandoLista.value = false;
    mensaje.value = '';
};

const cancelarEdicion = () => {
    formulario.value = { nit: '', nombre: '', nrc: '', giro: '', direccion: '' };
    modoEdicion.value = false;
    mostrandoLista.value = true;
    mensaje.value = '';
};

const alternarVista = () => {
    if (mostrandoLista.value) {
        // Caso 1: Estamos en la Lista y queremos ir a "Crear Nuevo"
        formulario.value = { nit: '', nombre: '', nrc: '', giro: '', direccion: '' }; // Limpiamos formulario
        modoEdicion.value = false;
        mostrandoLista.value = false; // Ocultamos lista para mostrar form
        mensaje.value = '';
    } else {
        // Caso 2: Estamos en el Formulario y queremos "Ver Listado"
        cancelarEdicion(); // Esta función ya se encarga de mostrar la lista y limpiar
    }
};

const mostrarAlerta = (txt, tipo) => {
    mensaje.value = txt;
    tipoMensaje.value = tipo;
};
</script>

<style scoped>
/* Estilos consistentes con tu App */
.declarantes-container {
  padding: 20px;
  background: linear-gradient(180deg, #eef2ff 0%, #f3f4f6 100%);
  min-height: 100vh;
  font-family: 'Segoe UI', sans-serif;
}

/* Acceso Denegado */
.access-denied {
  text-align: center; margin-top: 50px; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.access-denied h2 { color: #dc2626; margin-bottom: 15px; }

/* Cabecera */
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.6rem; color: #1e3a8a; margin: 0; font-weight: 700; }
.subtitle { color: #64748b; font-size: 0.95rem; }

/* Tarjetas */
.card {
  background: white; border-radius: 12px; padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 5px solid #1e3a8a;
}
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #0f172a; margin: 0; }
.badge-info { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }

/* Formularios */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.mt-3 { margin-top: 15px; }
.form-group label { display: block; font-weight: 600; color: #475569; margin-bottom: 6px; font-size: 0.85rem; }
.form-control {
  width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;
}
.form-control:focus { border-color: #1e3a8a; outline: none; ring: 2px solid #93c5fd; }

/* Botones */
.btn { padding: 10px 16px; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; }
.btn-primary { background: #1e3a8a; color: white; }
.btn-success { background: #10b981; color: white; }
.btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; margin-right: 10px; }
.btn-icon { background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 5px; }
.text-danger { color: #ef4444; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 25px; border-top: 1px dashed #e2e8f0; padding-top: 20px; }

/* Tabla */
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 12px; background: #f8fafc; color: #64748b; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.font-mono { font-family: monospace; color: #0f172a; font-weight: 600; }

/* Alertas */
.alert { padding: 12px; margin-top: 20px; border-radius: 6px; text-align: center; font-weight: 500; }
.alert-success { background: #dcfce7; color: #166534; }
.alert-danger { background: #fee2e2; color: #991b1b; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease-out; }
</style>