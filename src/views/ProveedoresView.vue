<template>
  <MainLayout>
    <div class="proveedores-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🚚 Gestión de Proveedores</h1>
          <p class="subtitle">Administra tu catálogo de proveedores y acreedores</p>
        </div>
        
        <div class="header-actions">
          <button @click="alternarLista" class="btn btn-primary">
            {{ mostrarLista ? '➕ Nuevo Proveedor' : '📋 Ver Listado' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div v-if="!mostrarLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Proveedor' : '✨ Nuevo Proveedor' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Editando información existente' : 'Complete la ficha del proveedor' }}</span>
          </div>

          <form @submit.prevent="procesarFormulario" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">🏢 Datos de Identificación</h3>
              
              <div class="form-grid">
                <div class="form-group" :class="{ 'has-error': !formulario.nit && intentoGuardar }">
                  <label class="form-label">NIT <span class="text-danger">*</span></label>
                  <input 
                    v-model="formulario.nit" 
                    type="text" 
                    placeholder="0000-000000-000-0" 
                    class="form-control"
                    maxlength="17"
                  >
                  <span v-if="!formulario.nit && intentoGuardar" class="error-msg">El NIT es obligatorio</span>
                </div>

                <div class="form-group" :class="{ 'has-error': !formulario.nombre && intentoGuardar }">
                  <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                  <input 
                    v-model="formulario.nombre" 
                    type="text" 
                    placeholder="Nombre de la empresa o persona" 
                    class="form-control"
                  >
                  <span v-if="!formulario.nombre && intentoGuardar" class="error-msg">El nombre es requerido</span>
                </div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">📍 Ubicación y Contacto</h3>
              
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Departamento</label>
                  <select v-model="formulario.departamento" class="form-control">
                    <option value="">-- Seleccionar --</option>
                    <option v-for="depto in departamentos" :key="depto" :value="depto">{{ depto }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Dirección</label>
                  <input 
                    v-model="formulario.direccion" 
                    type="text" 
                    placeholder="Dirección física del local..." 
                    class="form-control"
                  >
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              
              <button 
                type="button" 
                v-if="modoEdicion && rolActual === 'admin'" 
                @click="eliminarProveedor" 
                class="btn btn-danger mr-auto"
              >
                🗑️ Eliminar
              </button>

              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar Datos' : '💾 Guardar Proveedor') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>

          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between">
             <h3>📋 Directorio de Proveedores</h3>
             <div class="search-wrapper">
               <input type="text" v-model="busqueda" placeholder="🔍 Buscar por nombre o NIT..." class="form-control search-list">
             </div>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>NIT</th>
                  <th>Nombre / Razón Social</th>
                  <th>Ubicación</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prov in proveedoresFiltrados" :key="prov.ProvNIT" :class="{ 'row-active': prov.ProvNIT === ultimoGuardado }">
                  <td><span class="doc-number">{{ prov.ProvNIT }}</span></td>
                  <td>
                    <div class="fw-bold text-dark">{{ prov.ProvNombre }}</div>
                  </td>
                  <td class="text-muted text-sm">
                    {{ prov.ProvDepto ? prov.ProvDepto : 'N/A' }}
                    <div v-if="prov.ProvDirec" class="text-xs">{{ prov.ProvDirec }}</div>
                  </td>
                  <td class="text-center">
                    <button class="btn-icon" @click="seleccionarParaEditar(prov)" title="Editar">✏️</button>
                  </td>
                </tr>
                <tr v-if="proveedoresFiltrados.length === 0">
                  <td colspan="4" class="text-center py-4 text-muted">
                    {{ busqueda ? 'No hay coincidencias.' : 'No hay proveedores registrados.' }}
                  </td>
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
import MainLayout from '../layouts/MainLayout.vue'; // Importación correcta
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

// --- CONFIGURACIÓN API ---
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = BASE_URL + '/api/proveedores';

// --- ESTADOS ---
const formulario = ref({ nit: '', nombre: '', direccion: '', departamento: '' });
const listaProveedores = ref([]);
const mostrarLista = ref(false); // Empezamos en formulario si queremos registrar rápido, o true si prefieres lista
const cargando = ref(false);
const modoEdicion = ref(false);
const nitOriginalEdicion = ref(null);
const ultimoGuardado = ref(null);
const busqueda = ref('');
const mensaje = ref('');
const tipoMensaje = ref('');
const intentoGuardar = ref(false);

const departamentos = ["San Miguel", "San Salvador", "La Unión", "Usulután", "Santa Ana", "La Libertad", "Sonsonate", "La Paz", "Cuscatlán", "Ahuachapán", "Morazán", "San Vicente", "Chalatenango", "Cabañas"];

// --- CARGA DE DATOS ---
const cargarLista = async () => {
  try {
    const res = await axios.get(API_URL);
    listaProveedores.value = res.data;
  } catch (error) {
    console.error("Error al cargar proveedores", error);
  }
};

// --- COMPUTADOS ---
const proveedoresFiltrados = computed(() => {
  if (!busqueda.value) return listaProveedores.value;
  const txt = busqueda.value.toLowerCase();
  return listaProveedores.value.filter(p => 
    (p.ProvNombre && p.ProvNombre.toLowerCase().includes(txt)) || 
    (p.ProvNIT && p.ProvNIT.includes(txt))
  );
});

// --- ACCIONES ---
const alternarLista = () => {
  mostrarLista.value = !mostrarLista.value;
  mensaje.value = '';
  if (mostrarLista.value && listaProveedores.value.length === 0) {
    cargarLista();
  }
};

const cancelarEdicion = () => {
  modoEdicion.value = false;
  nitOriginalEdicion.value = null;
  intentoGuardar.value = false;
  formulario.value = { nit: '', nombre: '', direccion: '', departamento: '' };
  mensaje.value = '';
};

const seleccionarParaEditar = (prov) => {
  modoEdicion.value = true;
  nitOriginalEdicion.value = prov.ProvNIT;
  mensaje.value = '';
  
  formulario.value = {
    nit: prov.ProvNIT,
    nombre: prov.ProvNombre,
    direccion: prov.ProvDirec,
    departamento: prov.ProvDepto
  };
  
  mostrarLista.value = false; // Cambiamos a la vista de formulario
};

const procesarFormulario = async () => {
  intentoGuardar.value = true;
  if (!formulario.value.nit || !formulario.value.nombre) {
    return; // Validación simple
  }

  cargando.value = true;
  mensaje.value = '';

  try {
    if (modoEdicion.value) {
      await axios.put(`${API_URL}/${nitOriginalEdicion.value}`, formulario.value);
      mensaje.value = '¡Proveedor actualizado correctamente!';
      nitOriginalEdicion.value = null;
      modoEdicion.value = false;
    } else {
      await axios.post(API_URL, formulario.value);
      mensaje.value = '¡Proveedor registrado con éxito!';
    }

    ultimoGuardado.value = formulario.value.nit;
    tipoMensaje.value = 'success';
    
    // Limpieza y recarga
    formulario.value = { nit: '', nombre: '', direccion: '', departamento: '' };
    intentoGuardar.value = false;
    await cargarLista();
    
    // Volver a la lista después de guardar con éxito
    setTimeout(() => { 
      mensaje.value = ''; 
      mostrarLista.value = true; 
    }, 1500);

  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = error.response?.data?.message || 'Error en el servidor.';
  } finally {
    cargando.value = false;
  }
};

const eliminarProveedor = async () => {
  if (!confirm(`¿Estás seguro de eliminar a "${formulario.value.nombre}"?`)) return;

  cargando.value = true;
  try {
    await axios.delete(`${API_URL}/${nitOriginalEdicion.value}`);
    mensaje.value = 'Proveedor eliminado.';
    tipoMensaje.value = 'success';
    
    await cargarLista();
    setTimeout(() => { 
      cancelarEdicion(); 
      mostrarLista.value = true; 
    }, 1000);
  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = 'No se pudo eliminar. Verifique si tiene compras asociadas.';
  } finally {
    cargando.value = false;
  }
};

onMounted(cargarLista);
</script>

<style scoped>
/* --- ESTILOS COMPARTIDOS (Material Desvanecido) --- */
.proveedores-container {
  padding: 20px;
  background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%);
  height: 100%;
  overflow-y: auto;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* Cabecera */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

/* Tarjetas */
.card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(85, 194, 183, 0.15);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 20px;
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header {
  border-bottom: 1px solid #f0fdfa;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { 
  font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px;
}

/* Formularios */
.form-section { margin-bottom: 30px; }
.section-title { 
  font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; 
  border-left: 4px solid #55C2B7; padding-left: 12px; 
}

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

.form-control {
  width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937;
  background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem;
  transition: all 0.2s; box-sizing: border-box;
}
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.has-error .form-control { border-color: #ef4444; background-color: #fef2f2; }
.error-msg { font-size: 0.75rem; color: #ef4444; margin-top: 4px; font-weight: 600; display: block; }
.text-danger { color: #ef4444; }

/* Botones */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem;
  border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:active { transform: translateY(1px); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-primary:hover { background-color: #45a89d; }
.btn-success { background-color: #10b981; color: white; }
.btn-success:hover { background-color: #059669; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-secondary:hover { background-color: #f3f4f6; }
.btn-danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; margin-right: auto; }
.btn-danger:hover { background-color: #fecaca; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; }
.btn-icon:hover { background-color: #f9fafb; color: #111827; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mr-auto { margin-right: auto; }

/* Tabla */
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
.row-active td { background-color: #f0fdfa !important; }

/* Alertas */
.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions .btn { width: 100%; }
}
</style>