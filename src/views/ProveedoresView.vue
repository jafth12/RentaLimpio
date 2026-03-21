<template>
  <MainLayout>
    <div class="rl-view">
      
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🚚 Gestión de Proveedores</h1>
          <p class="rl-view-subtitle">Administra tu catálogo de proveedores y acreedores</p>
        </div>
        
        <button @click="alternarLista" class="rl-btn rl-btn-primary">
          {{ mostrarLista ? '➕ Nuevo Proveedor' : '📋 Ver Listado' }}
        </button>
      </div>

      <div v-if="!mostrarLista" class="rl-card rl-fade-in">
        <div class="rl-card-header" style="align-items: center;">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Proveedor' : '✨ Nuevo Proveedor' }}</h2>
            <span class="rl-badge rl-badge-info rl-mt-2">{{ modoEdicion ? 'Editando información existente' : 'Complete la ficha del proveedor' }}</span>
          </div>
        </div>

        <form @submit.prevent="procesarFormulario">
          
          <div class="rl-form-section">
            <p class="rl-section-title">Datos de Identificación y Fiscales</p>
            
            <div class="rl-grid rl-grid-2">
              <div class="rl-field" :class="{ 'has-error': !formulario.nit && intentoGuardar }">
                <label class="rl-label">NIT <span class="req">*</span></label>
                <input v-model="formulario.nit" type="text" placeholder="0000-000000-000-0" class="rl-input" maxlength="17">
                <span v-if="!formulario.nit && intentoGuardar" class="rl-error-msg">⚠ El NIT es obligatorio</span>
              </div>

              <div class="rl-field" :class="{ 'has-error': !formulario.nombre && intentoGuardar }">
                <label class="rl-label">Nombre / Razón Social <span class="req">*</span></label>
                <input v-model="formulario.nombre" type="text" placeholder="Nombre de la empresa o persona" class="rl-input">
                <span v-if="!formulario.nombre && intentoGuardar" class="rl-error-msg">⚠ El nombre es requerido</span>
              </div>
            </div>

            <div class="rl-grid rl-grid-2 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">NRC (Registro)</label>
                <input v-model="formulario.nrc" type="text" placeholder="000000-0" class="rl-input">
              </div>
              <div class="rl-field">
                <label class="rl-label">Giro / Actividad Económica</label>
                <input v-model="formulario.giro" type="text" placeholder="Ej: Venta de Insumos..." class="rl-input">
              </div>
            </div>
          </div>

          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Ubicación y Contacto</p>
            
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Departamento</label>
                <select v-model="formulario.departamento" class="rl-select">
                  <option value="">-- Seleccionar --</option>
                  <option v-for="depto in departamentos" :key="depto" :value="depto">{{ depto }}</option>
                </select>
              </div>

              <div class="rl-field">
                <label class="rl-label">Dirección</label>
                <input v-model="formulario.direccion" type="text" placeholder="Dirección física del local..." class="rl-input">
              </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion && rolActual === 'admin'" @click="eliminarProveedor" class="rl-btn rl-btn-danger" style="margin-right: auto;">
              🗑️ Eliminar
            </button>
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar Datos' : '💾 Guardar Proveedor') }}
            </button>
          </div>

          <div v-if="mensaje" :class="['rl-alert', tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger']">
            {{ mensaje }}
          </div>
        </form>
      </div>

      <div v-else class="rl-card rl-fade-in">
        <div class="rl-card-header">
           <div style="display:flex;align-items:center;gap:10px">
              <h3>📋 Directorio de Proveedores</h3>
              <span class="rl-badge rl-badge-count">{{ proveedoresFiltrados.length }} registrados</span>
           </div>
           <div class="rl-filters">
             <input type="text" v-model="busqueda" placeholder="🔍 Buscar por nombre, NIT o NRC..." class="rl-input rl-filter-search">
           </div>
        </div>
        
        <div class="rl-table-wrap">
          <table class="rl-table">
            <thead>
              <tr>
                <th>NIT / NRC</th>
                <th>Nombre / Razón Social</th>
                <th>Giro / Actividad</th>
                <th>Ubicación</th>
                <th class="rl-text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prov in proveedoresFiltrados" :key="prov.ProvNIT" :class="{ 'is-selected': prov.ProvNIT === ultimoGuardado }">
                <td>
                  <div class="rl-doc-number">{{ prov.ProvNIT }}</div>
                  <small v-if="prov.ProvNRC" class="rl-text-muted rl-mt-2" style="display:block">NRC: <strong class="rl-text-primary">{{ prov.ProvNRC }}</strong></small>
                </td>
                <td>
                  <div class="rl-fw-bold">{{ prov.ProvNombre }}</div>
                </td>
                <td>
                  <span class="rl-text-muted" style="font-size:0.85rem">{{ prov.ProvGiro ? prov.ProvGiro : '---' }}</span>
                </td>
                <td>
                  <div class="rl-text-muted" style="font-size:0.85rem">{{ prov.ProvDepto ? prov.ProvDepto : 'N/A' }}</div>
                  <div v-if="prov.ProvDirec" style="font-size:0.75rem; color:#6b7280; margin-top:4px">{{ prov.ProvDirec }}</div>
                </td>
                <td class="rl-text-center">
                  <button class="rl-btn-icon" @click="seleccionarParaEditar(prov)" title="Editar">✏️</button>
                </td>
              </tr>
              <tr v-if="proveedoresFiltrados.length === 0">
                <td colspan="5" class="rl-empty-state">
                  {{ busqueda ? 'No hay coincidencias.' : 'No hay proveedores registrados.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue'; 
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

// --- CONFIGURACIÓN API ---
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = BASE_URL + '/api/proveedores';

// --- ESTADOS ---
const formulario = ref({ nit: '', nombre: '', direccion: '', departamento: '', nrc: '', giro: '' });
const listaProveedores = ref([]);
const mostrarLista = ref(true); 
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
    (p.ProvNIT && p.ProvNIT.includes(txt)) ||
    (p.ProvNRC && p.ProvNRC.includes(txt))
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
  formulario.value = { nit: '', nombre: '', direccion: '', departamento: '', nrc: '', giro: '' };
  mensaje.value = '';
  mostrarLista.value = true;
};

const seleccionarParaEditar = (prov) => {
  modoEdicion.value = true;
  nitOriginalEdicion.value = prov.ProvNIT;
  mensaje.value = '';
  
  formulario.value = {
    nit: prov.ProvNIT,
    nombre: prov.ProvNombre,
    direccion: prov.ProvDirec,
    departamento: prov.ProvDepto,
    nrc: prov.ProvNRC, 
    giro: prov.ProvGiro 
  };
  
  mostrarLista.value = false; 
};

const procesarFormulario = async () => {
  intentoGuardar.value = true;
  if (!formulario.value.nit || !formulario.value.nombre) return; 

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
    
    formulario.value = { nit: '', nombre: '', direccion: '', departamento: '', nrc: '', giro: '' };
    intentoGuardar.value = false;
    await cargarLista();
    
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
.has-error .rl-input { border-color: var(--red-500) !important; background-color: var(--red-50) !important; }
</style>