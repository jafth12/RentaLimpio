<template>
  <main-layout>
  <div class="clientes-container">
    <div class="header-section">
      <h1>Gestión de Clientes</h1>
      <div class="header-actions">
         <button @click="alternarLista" class="btn-lista">
          {{ mostrarLista ? '🔽 Ocultar Lista' : '📋 Ver Lista de Clientes' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Volver al Menú</button>
      </div>
    </div>

    <div class="content-wrapper">
      
      <div class="form-section">
        <div class="card-form" :class="{ 'modo-edicion': modoEdicion }">
          <div class="form-header">
            <h2>{{ modoEdicion ? '✏️ Editar Cliente' : '👤 Registrar Nuevo Cliente' }}</h2>
            <p v-if="!modoEdicion">Complete la información del cliente.</p>
            <p v-else>Modifique los datos y guarde los cambios.</p>
          </div>

          <form @submit.prevent="procesarFormulario">
            
            <div class="form-row">
              <div class="form-group">
                <label>NIT del Cliente <span class="required">*</span></label>
                <input 
                  v-model="formulario.nit" 
                  type="text" 
                  placeholder="Ej: 0614-280390-112-1" 
                  maxlength="14"
                  required
                >
              </div>

              <div class="form-group">
                <label>Nombre Empresa / Cliente <span class="required">*</span></label>
                <input 
                  v-model="formulario.nombre" 
                  type="text" 
                  placeholder="Nombre completo o Razón Social" 
                  required
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Dirección</label>
                <input 
                  v-model="formulario.direccion" 
                  type="text" 
                  placeholder="Dirección física"
                >
              </div>

              <div class="form-group">
                <label>Departamento</label>
                <select v-model="formulario.departamento">
                  <option value="">Seleccione...</option>
                  <option value="San Miguel">San Miguel</option>
                  <option value="San Salvador">San Salvador</option>
                  <option value="La Unión">La Unión</option>
                  <option value="Usulután">Usulután</option>
                  <option value="Santa Ana">Santa Ana</option>
                  <option value="La Libertad">La Libertad</option>
                  <option value="Sonsonate">Sonsonate</option>
                  <option value="La Paz">La Paz</option>
                  <option value="Ahuachapán">Ahuachapán</option>
                  <option value="Cuscatlán">Cuscatlán</option>
                  <option value="Chalatenango">Chalatenango</option>
                  <option value="Cabañas">Cabañas</option>
                  <option value="Morazán">Morazán</option>
                  <option value="San Vicente">San Vicente</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Giro / Actividad Económica</label>
                <input 
                  v-model="formulario.giro" 
                  type="text" 
                  placeholder="Ej: Venta de Repuestos"
                >
              </div>
              <div class="form-group">
                <label>No. Registro (NRC)</label>
                <input 
                  v-model="formulario.registro" 
                  type="text" 
                  placeholder="Ej: 123456-7"
                >
              </div>
            </div>

            <div class="form-row tres-columnas">
              <div class="form-group">
                <label>Tel. Empresa</label>
                <input v-model="formulario.tel1" type="text" placeholder="2222-2222">
              </div>
              <div class="form-group">
                <label>Tel. Contacto</label>
                <input v-model="formulario.tel2" type="text" placeholder="7777-7777">
              </div>
              <div class="form-group">
                <label>Correo Electrónico</label>
                <input v-model="formulario.correo" type="email" placeholder="cliente@email.com">
              </div>
            </div>

            <div class="form-group">
                <label>Observación (Opcional)</label>
                <textarea 
                  v-model="formulario.observacion" 
                  placeholder="Notas adicionales sobre el cliente..."
                  rows="2"
                  class="input-area"
                ></textarea>
            </div>

            <div class="actions">
               <button type="submit" class="btn-guardar" :disabled="cargando">
                  {{ cargando ? 'Procesando...' : (modoEdicion ? '🔄 Actualizar Cliente' : '💾 Guardar Cliente') }}
                 </button>
  
                <button v-if="modoEdicion" @click.prevent="cancelarEdicion" class="btn-cancelar">
                    Cancelar
                </button>

                <button v-if="modoEdicion && rolActual === 'admin'" @click.prevent="eliminarCliente" class="btn-eliminar">
                   🗑️ Eliminar
                 </button>
              </div>
            
            <transition name="fade">
              <div v-if="mensaje" :class="['alert-box', tipoMensaje]">
                <span class="icon">{{ tipoMensaje === 'success' ? '✅' : '⚠️' }}</span>
                <span>{{ mensaje }}</span>
              </div>
            </transition>
          </form>
        </div>
      </div>

      <transition name="slide">
        <div v-if="mostrarLista" class="lista-section">
          <div class="card-tabla">
            <h3>📂 Cartera de Clientes</h3>
            <p class="nota-tabla">Clic en un cliente para editar.</p>
            
            <div class="tabla-scroll">
              <table class="tabla-datos">
                <thead>
                  <tr>
                    <th>NIT</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="cli in listaClientes" 
                    :key="cli.ClienNIT"
                    @click="seleccionarParaEditar(cli)"
                    :class="{ 'fila-activa': cli.ClienNIT === ultimoGuardado, 'fila-seleccionada': cli.ClienNIT === nitOriginalEdicion }"
                  >
                    <td class="dato-nit">{{ cli.ClienNIT }}</td>
                    <td class="dato-nombre">{{ cli.ClienNom }}</td>
                    <td>{{ cli.ClienTel1 || cli.ClienTel2 || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </transition>

    </div>
  </div>
  </main-layout>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import MainLayout from '@/layouts/MainLayout.vue';

const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

// --- ESTADOS ---
const formulario = ref({ 
  nit: '', nombre: '', direccion: '', departamento: '', 
  giro: '', registro: '', tel1: '', tel2: '', correo: '', observacion: '' 
});

const listaClientes = ref([]);
const mostrarLista = ref(false);
const cargando = ref(false);
const modoEdicion = ref(false);
const nitOriginalEdicion = ref(null); 
const ultimoGuardado = ref(null); 
const mensaje = ref('');
const tipoMensaje = ref('');

// --- CONF RED ---
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = BASE_URL + '/api/clientes';

// --- FUNCIONES ---

// 1. Cargar Lista
const cargarLista = async () => {
  try {
    const res = await axios.get(API_URL);
    listaClientes.value = res.data;
  } catch (error) {
    console.error("Error al cargar clientes", error);
  }
};

// 2. Alternar Lista
const alternarLista = () => {
  mostrarLista.value = !mostrarLista.value;
  if (mostrarLista.value && listaClientes.value.length === 0) {
    cargarLista();
  }
};

// 3. Seleccionar para Editar
const seleccionarParaEditar = (cli) => {
  modoEdicion.value = true;
  nitOriginalEdicion.value = cli.ClienNIT;
  mensaje.value = '';

  // Mapeamos los datos de la BD al formulario
  formulario.value = {
    nit: cli.ClienNIT,
    nombre: cli.ClienNom,
    direccion: cli.ClienDirec,
    departamento: cli.ClienDepto,
    giro: cli.ClienGiro,
    registro: cli.ClienNumReg,
    tel1: cli.ClienTel1,
    tel2: cli.ClienTel2,
    correo: cli.ClienCorreo,
    observacion: cli.ClienObserv
  };

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 4. Cancelar
const cancelarEdicion = () => {
  modoEdicion.value = false;
  nitOriginalEdicion.value = null;
  limpiarFormulario();
  mensaje.value = '';
};

const limpiarFormulario = () => {
  formulario.value = { 
    nit: '', nombre: '', direccion: '', departamento: '', 
    giro: '', registro: '', tel1: '', tel2: '', correo: '', observacion: '' 
  };
};

// 5. Guardar / Actualizar
const procesarFormulario = async () => {
  cargando.value = true;
  mensaje.value = '';

  try {
    if (modoEdicion.value) {
      // ACTUALIZAR
      await axios.put(`${API_URL}/${nitOriginalEdicion.value}`, formulario.value);
      mensaje.value = '¡Cliente actualizado correctamente!';
      modoEdicion.value = false;
      nitOriginalEdicion.value = null;
    } else {
      // CREAR
      await axios.post(API_URL, formulario.value);
      mensaje.value = '¡Cliente registrado con éxito!';
    }

    ultimoGuardado.value = formulario.value.nit;
    tipoMensaje.value = 'success';
    limpiarFormulario();
    await cargarLista();
    mostrarLista.value = true;

    setTimeout(() => { mensaje.value = ''; }, 4000);

  } catch (error) {
    tipoMensaje.value = 'error';
    if (error.response && error.response.data.message) {
      mensaje.value = error.response.data.message;
    } else {
      mensaje.value = 'Error en el servidor.';
    }
  } finally {
    cargando.value = false;
  }
};

// 6. Eliminar
const eliminarCliente = async () => {
  if (!confirm(`¿Eliminar al cliente "${formulario.value.nombre}"?\nEsta acción es irreversible.`)) {
    return;
  }

  cargando.value = true;
  try {
    await axios.delete(`${API_URL}/${nitOriginalEdicion.value}`);
    mensaje.value = 'Cliente eliminado.';
    tipoMensaje.value = 'success';
    modoEdicion.value = false;
    nitOriginalEdicion.value = null;
    limpiarFormulario();
    await cargarLista();
  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = 'Error al eliminar (posiblemente tiene ventas asociadas).';
  } finally {
    cargando.value = false;
  }
};
</script>

<style scoped>
/* Estilos base iguales al de Proveedores para consistencia */
.clientes-container { padding: 2rem; background-color: #f4f4f4; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
h1 { color: #55C2B7; margin: 0; }
.header-actions { display: flex; gap: 10px; }
button { border: none; padding: 10px 15px; border-radius: 5px; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.btn-lista { background-color: #007bff; color: white; }
.btn-volver { background-color: #666; color: white; }
.content-wrapper { display: flex; gap: 2rem; align-items: flex-start; }
.form-section { flex: 1; }
.lista-section { flex: 1; min-width: 300px; }
.card-form { background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #55C2B7; transition: border-color 0.3s; }
.card-form.modo-edicion { border-top-color: #ffca28; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem; }
.tres-columnas { grid-template-columns: 1fr 1fr 1fr; } /* Nueva clase para 3 columnas */
label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
.required { color: red; }
input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
input:focus, select:focus, textarea:focus { border-color: #55C2B7; outline: none; }
.input-area { resize: vertical; }
.actions { display: flex; gap: 10px; margin-top: 1rem; }
.btn-guardar { flex: 1; background-color: #55C2B7; color: white; padding: 12px; }
.btn-cancelar { background-color: #ff6b6b; color: white; }
.btn-eliminar { background-color: #d9534f; color: white; }
.alert-box { margin-top: 1.5rem; padding: 15px; border-radius: 8px; display: flex; align-items: center; font-weight: bold; }
.success { background-color: #e8f7f5; color: #1e7e75; border: 1px solid #55C2B7; }
.error { background-color: #fdeaea; color: #c0392b; border: 1px solid #e74c3c; }
.card-tabla { background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #007bff; }
.tabla-scroll { max-height: 500px; overflow-y: auto; }
.tabla-datos { width: 100%; border-collapse: collapse; }
.tabla-datos th { position: sticky; top: 0; background: #f1f1f1; padding: 10px; text-align: left; }
.tabla-datos td { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.tabla-datos tr:hover { background-color: #f9f9f9; }
.fila-seleccionada { background-color: #fff8e1 !important; border-left: 4px solid #ffca28; }
.fila-activa { background-color: #e0f7fa !important; border-left: 4px solid #55C2B7; }
.dato-nit { font-family: monospace; color: #555; font-size: 0.9em; }
.dato-nombre { font-weight: 500; }

@media (max-width: 900px) {
  .content-wrapper { flex-direction: column; }
  .form-row, .tres-columnas { grid-template-columns: 1fr; }
}
</style>