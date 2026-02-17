<template>
  <MainLayout>
    <div class="clientes-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>👥 Gestión de Clientes</h1>
          <p class="subtitle">Administra tu cartera de clientes y sus datos fiscales</p>
        </div>
        
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nuevo Cliente' : '📋 Ver Directorio' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Cliente' : '✨ Nuevo Cliente' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Actualizando ficha' : 'Complete los datos de facturación' }}</span>
          </div>

          <form @submit.prevent="guardarCliente" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">🏢 Datos de Identificación y Fiscales</h3>
              
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.nombre" class="form-control" placeholder="Nombre completo del cliente" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Giro / Actividad Económica</label>
                  <input type="text" v-model="formulario.giro" class="form-control" placeholder="Ej: Venta de repuestos...">
                </div>
              </div>

              <div class="form-grid three-cols mt-3">
                <div class="form-group">
                  <label class="form-label">NIT / DUI <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.nit" class="form-control" placeholder="0000-000000-000-0" required>
                </div>

                <div class="form-group">
                  <label class="form-label">NRC (Registro)</label>
                  <input type="text" v-model="formulario.nrc" class="form-control" placeholder="Solo si es contribuyente">
                </div>

                <div class="form-group">
                  <label class="form-label">Categoría</label>
                  <select v-model="formulario.categoria" class="form-control">
                    <option value="Consumidor Final">Consumidor Final</option>
                    <option value="Contribuyente">Contribuyente</option>
                    <option value="Gran Contribuyente">Gran Contribuyente</option>
                  </select>
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
                    <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Municipio / Ciudad</label>
                  <input type="text" v-model="formulario.municipio" class="form-control">
                </div>
              </div>

              <div class="form-group mt-2">
                <label class="form-label">Dirección Completa</label>
                <input type="text" v-model="formulario.direccion" class="form-control" placeholder="Dirección física del negocio o casa...">
              </div>

              <div class="form-grid three-cols mt-2">
                 <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="text" v-model="formulario.telefono" class="form-control" placeholder="0000-0000">
                 </div>
                 <div class="form-group">
                    <label class="form-label">Correo Electrónico</label>
                    <input type="email" v-model="formulario.email" class="form-control" placeholder="cliente@email.com">
                 </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Ficha' : '💾 Guardar Cliente') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>

          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between">
             <h3>📋 Directorio de Clientes</h3>
             <div class="search-wrapper">
                <input type="text" v-model="filtro" placeholder="🔍 Buscar por nombre, NIT o NRC..." class="form-control search-list">
             </div>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Nombre / Razón Social</th>
                  <th>Documentos</th>
                  <th>Giro / Categoría</th>
                  <th>Contacto</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cliente in clientesFiltrados" :key="cliente.id">
                  <td>
                    <div class="fw-bold text-dark">{{ cliente.nombre }}</div>
                    <div class="text-xs text-muted">{{ cliente.departamento }}</div>
                  </td>
                  <td>
                    <div v-if="cliente.nit" class="doc-item">NIT: {{ cliente.nit }}</div>
                    <div v-if="cliente.nrc" class="doc-item">NRC: <span class="fw-bold">{{ cliente.nrc }}</span></div>
                  </td>
                  <td>
                    <span class="badge badge-light">{{ cliente.categoria }}</span>
                    <div class="text-xs mt-1">{{ cliente.giro }}</div>
                  </td>
                  <td>
                     <div v-if="cliente.telefono">📞 {{ cliente.telefono }}</div>
                     <div v-if="cliente.email" class="text-xs">✉️ {{ cliente.email }}</div>
                  </td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(cliente)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarCliente(cliente.id)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="clientesFiltrados.length === 0">
                  <td colspan="5" class="text-center py-4 text-muted">No se encontraron clientes registrados.</td>
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
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/clientes`; // Ajusta según tu backend

const departamentos = ["San Salvador", "La Libertad", "Santa Ana", "San Miguel", "Sonsonate", "Usulután", "Ahuachapán", "La Paz", "La Unión", "Cuscatlán", "Chalatenango", "Morazán", "San Vicente", "Cabañas"];

// --- ESTADOS ---
const formulario = ref({
    nombre: '', giro: '', nit: '', nrc: '', 
    categoria: 'Consumidor Final',
    departamento: '', municipio: '', direccion: '',
    telefono: '', email: ''
});

const listaClientes = ref([]);
const mostrandoLista = ref(false);
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
        // const res = await axios.get(API_URL);
        // listaClientes.value = res.data;
        
        // Dummy data
        if (listaClientes.value.length === 0) {
            listaClientes.value = [
                { id: 1, nombre: 'Empresa Ejemplo S.A. de C.V.', giro: 'Venta de Insumos', nit: '0614-010190-102-1', nrc: '12345-6', categoria: 'Contribuyente', departamento: 'San Salvador', telefono: '2222-0000' }
            ];
        }
    } catch (error) { console.error("Error cargando clientes", error); }
};

const guardarCliente = async () => {
    cargando.value = true;
    try {
        if(modoEdicion.value) {
            // await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            // Simulación update
            const index = listaClientes.value.findIndex(c => c.id === idEdicion.value);
            if (index !== -1) listaClientes.value[index] = { ...formulario.value, id: idEdicion.value };
            
            tipoMensaje.value = 'success';
            mensaje.value = '¡Cliente actualizado!';
        } else {
            // await axios.post(API_URL, formulario.value);
            // Simulación insert
            listaClientes.value.unshift({ ...formulario.value, id: Date.now() });
            
            tipoMensaje.value = 'success';
            mensaje.value = '¡Cliente registrado con éxito!';
        }
        
        resetForm();
        setTimeout(() => { 
            mensaje.value = ''; 
            mostrandoLista.value = true; 
        }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error';
        mensaje.value = 'Error al guardar cliente.';
    } finally {
        cargando.value = false;
    }
};

const eliminarCliente = async (id) => {
    if(!confirm('¿Eliminar este cliente de la base de datos?')) return;
    try {
        // await axios.delete(`${API_URL}/${id}`);
        listaClientes.value = listaClientes.value.filter(c => c.id !== id);
    } catch (e) { alert('Error'); }
};

const prepararEdicion = (cliente) => {
    formulario.value = { ...cliente };
    idEdicion.value = cliente.id;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = {
        nombre: '', giro: '', nit: '', nrc: '', 
        categoria: 'Consumidor Final',
        departamento: '', municipio: '', direccion: '',
        telefono: '', email: ''
    };
    modoEdicion.value = false;
    idEdicion.value = null;
    mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };

onMounted(cargarClientes);
</script>

<style scoped>
/* --- ESTILO MATERIAL DESVANECIDO (Consistente) --- */
.clientes-container {
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

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.mt-3 { margin-top: 15px; } .mt-2 { margin-top: 10px; }

.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

/* Inputs Modernos */
.form-control {
  width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937;
  background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem;
  transition: all 0.2s; box-sizing: border-box;
}
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

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
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; }
.btn-icon:hover { background-color: #f9fafb; color: #111827; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* Tabla */
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.badge-light { font-size: 0.75rem; background: #f3f4f6; color: #1f2937; padding: 2px 8px; border-radius: 12px; border: 1px solid #e5e7eb; font-weight: 600; }
.doc-item { font-family: monospace; font-size: 0.85rem; color: #4b5563; }

/* Alertas */
.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.text-danger { color: #ef4444; }
.text-muted { color: #6b7280; }
.text-xs { font-size: 0.8rem; }

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; }
  .header-actions .btn { width: 100%; }
}
</style>