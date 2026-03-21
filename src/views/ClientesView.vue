<template>
  <MainLayout>
    <div class="rl-view">
      
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>👥 Gestión de Clientes</h1>
          <p class="rl-view-subtitle">Administra tu cartera de clientes y sus datos fiscales</p>
        </div>
        
        <button @click="alternarVista" class="rl-btn rl-btn-primary">
          {{ mostrandoLista ? '➕ Nuevo Cliente' : '📋 Ver Directorio' }}
        </button>
      </div>

      <div v-if="!mostrandoLista" class="rl-card rl-fade-in">
        <div class="rl-card-header" style="align-items: center;">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Cliente' : '✨ Nuevo Cliente' }}</h2>
            <span class="rl-badge rl-badge-info rl-mt-2">{{ modoEdicion ? 'Actualizando ficha' : 'Complete los datos de facturación' }}</span>
          </div>
        </div>

        <form @submit.prevent="guardarCliente">
          
          <div class="rl-form-section">
            <p class="rl-section-title">Datos de Identificación y Fiscales</p>
            
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Nombre / Razón Social <span class="req">*</span></label>
                <input type="text" v-model="formulario.nombre" class="rl-input" placeholder="Nombre completo del cliente" required>
              </div>
              
              <div class="rl-field">
                <label class="rl-label">Giro / Actividad Económica</label>
                <input type="text" v-model="formulario.giro" class="rl-input" placeholder="Ej: Venta de repuestos...">
              </div>
            </div>

            <div class="rl-grid rl-grid-3 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">NIT / DUI <span class="req">*</span></label>
                <input type="text" v-model="formulario.nit" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>

              <div class="rl-field">
                <label class="rl-label">NRC (Registro)</label>
                <input type="text" v-model="formulario.nrc" class="rl-input" placeholder="Solo si es contribuyente">
              </div>

              <div class="rl-field">
                <label class="rl-label">Categoría</label>
                <select v-model="formulario.categoria" class="rl-select">
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Contribuyente">Contribuyente</option>
                  <option value="Gran Contribuyente">Gran Contribuyente</option>
                </select>
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
                  <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
                </select>
              </div>

              <div class="rl-field">
                <label class="rl-label">Municipio / Ciudad</label>
                <input type="text" v-model="formulario.municipio" class="rl-input">
              </div>
            </div>

            <div class="rl-field rl-mt-3">
              <label class="rl-label">Dirección Completa</label>
              <input type="text" v-model="formulario.direccion" class="rl-input" placeholder="Dirección física del negocio o casa...">
            </div>

            <div class="rl-grid rl-grid-2 rl-mt-3">
               <div class="rl-field">
                  <label class="rl-label">Teléfono</label>
                  <input type="text" v-model="formulario.telefono" class="rl-input" placeholder="0000-0000">
               </div>
               <div class="rl-field">
                  <label class="rl-label">Correo Electrónico</label>
                  <input type="email" v-model="formulario.email" class="rl-input" placeholder="cliente@email.com">
               </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '✔ Actualizar Ficha' : '💾 Guardar Cliente') }}
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
              <h3>📋 Directorio de Clientes</h3>
              <span class="rl-badge rl-badge-count">{{ clientesFiltrados.length }} registrados</span>
           </div>
           <div class="rl-filters">
              <input type="text" v-model="filtro" placeholder="🔍 Buscar por nombre, NIT o NRC..." class="rl-input rl-filter-search">
           </div>
        </div>
        
        <div class="rl-table-wrap">
          <table class="rl-table">
            <thead>
              <tr>
                <th>Nombre / Razón Social</th>
                <th>Documentos</th>
                <th>Giro / Categoría</th>
                <th>Contacto</th>
                <th class="rl-text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cliente in clientesFiltrados" :key="cliente.nit">
                <td>
                  <div class="rl-fw-bold">{{ cliente.nombre }}</div>
                  <div class="rl-text-muted" style="font-size:0.75rem; margin-top:2px">{{ cliente.departamento }}</div>
                </td>
                <td>
                  <div v-if="cliente.nit" class="rl-doc-number">NIT: {{ cliente.nit }}</div>
                  <div v-if="cliente.nrc" class="rl-doc-number rl-mt-2">NRC: {{ cliente.nrc }}</div>
                </td>
                <td>
                  <span class="rl-badge rl-badge-anexo">{{ cliente.categoria || 'N/A' }}</span>
                  <div class="rl-text-muted rl-mt-2" style="font-size:0.8rem">{{ cliente.giro }}</div>
                </td>
                <td>
                   <div v-if="cliente.telefono" style="font-size:0.85rem">📞 {{ cliente.telefono }}</div>
                   <div v-if="cliente.email" class="rl-text-muted rl-mt-2" style="font-size:0.8rem">✉️ {{ cliente.email }}</div>
                </td>
                <td class="rl-text-center">
                  <button class="rl-btn-icon" @click="prepararEdicion(cliente)" title="Editar">✏️</button>
                  <button class="rl-btn-icon rl-text-danger" @click="eliminarCliente(cliente.nit)" title="Eliminar">🗑️</button>
                </td>
              </tr>
              <tr v-if="clientesFiltrados.length === 0">
                <td colspan="5" class="rl-empty-state">No se encontraron clientes registrados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/clientes`;

const departamentos = ["San Salvador", "La Libertad", "Santa Ana", "San Miguel", "Sonsonate", "Usulután", "Ahuachapán", "La Paz", "La Unión", "Cuscatlán", "Chalatenango", "Morazán", "San Vicente", "Cabañas"];

// --- ESTADOS ---
const formulario = ref({
    nombre: '', giro: '', nit: '', nrc: '', 
    categoria: 'Consumidor Final',
    departamento: '', municipio: '', direccion: '',
    telefono: '', email: ''
});

const listaClientes = ref([]);
const mostrandoLista = ref(true); // Lo dejamos en true por defecto para ver la lista al entrar
const modoEdicion = ref(false);
const idEdicion = ref(null); 
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const filtro = ref('');

// --- COMPUTADOS ---
const clientesFiltrados = computed(() => {
    if (!filtro.value) return listaClientes.value;
    const txt = filtro.value.toLowerCase();
    return listaClientes.value.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(txt)) || 
        (c.nit && c.nit.includes(txt)) ||
        (c.nrc && c.nrc.includes(txt))
    );
});

// --- MÉTODOS ---
const cargarClientes = async () => {
    try {
        const res = await axios.get(API_URL);
        listaClientes.value = res.data.map(db => ({
            nit: db.ClienNIT,
            nombre: db.ClienNom,
            direccion: db.ClienDirec,
            departamento: db.ClienDepto,
            giro: db.ClienGiro,
            nrc: db.ClienNumReg,
            telefono: db.ClienTel1, 
            email: db.ClienCorreo,
            observacion: db.ClienObserv,
            categoria: db.ClienObserv || 'Contribuyente' 
        }));
    } catch (error) { 
        console.error("Error cargando clientes", error);
        mensaje.value = 'Error al cargar los clientes del servidor.';
        tipoMensaje.value = 'error';
    }
};

const guardarCliente = async () => {
    const payload = {
        nit: formulario.value.nit.replace(/-/g, '').trim(),
        nombre: formulario.value.nombre.toUpperCase(),
        direccion: formulario.value.direccion,
        departamento: formulario.value.departamento,
        giro: formulario.value.giro,
        registro: formulario.value.nrc,
        tel1: formulario.value.telefono,
        correo: formulario.value.email,
        observacion: formulario.value.categoria
    };

    cargando.value = true;
    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, payload);
            tipoMensaje.value = 'success';
            mensaje.value = '¡Cliente actualizado correctamente!';
        } else {
            await axios.post(API_URL, payload);
            tipoMensaje.value = 'success';
            mensaje.value = '¡Cliente registrado con éxito!';
        }
        
        await cargarClientes();
        setTimeout(() => { 
            resetForm();
            mostrandoLista.value = true; 
        }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error';
        mensaje.value = error.response?.data?.message || 'Error de conexión con el servidor.';
    } finally {
        cargando.value = false;
    }
};

const eliminarCliente = async (nit) => {
    if(!confirm('¿Eliminar este cliente de la base de datos? Esta acción no se puede deshacer.')) return;
    try {
        await axios.delete(`${API_URL}/${nit}`);
        listaClientes.value = listaClientes.value.filter(c => c.nit !== nit);
        alert('Cliente eliminado correctamente.');
    } catch (error) { 
        alert('Error al eliminar: Posiblemente tenga ventas asociadas.'); 
    }
};

const prepararEdicion = (cliente) => {
    formulario.value = { 
        nombre: cliente.nombre, nit: cliente.nit, nrc: cliente.nrc, giro: cliente.giro,
        departamento: cliente.departamento, direccion: cliente.direccion,
        telefono: cliente.telefono, email: cliente.email,
        categoria: cliente.categoria || 'Consumidor Final'
    };
    idEdicion.value = cliente.nit; 
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = {
        nombre: '', giro: '', nit: '', nrc: '', categoria: 'Consumidor Final',
        departamento: '', municipio: '', direccion: '', telefono: '', email: ''
    };
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };

onMounted(cargarClientes);
</script>

<style scoped>
/* No requiere CSS adicional, todo viene de forms.css */
</style>