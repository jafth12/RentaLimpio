<template>
  <div class="proveedores-container">
    <div class="header-section">
      <h1>Gestión de Proveedores</h1>
      <div class="header-actions">
         <button @click="alternarLista" class="btn-lista">
          {{ mostrarLista ? '🔽 Ocultar Lista' : '📋 Ver Lista de Proveedores' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Volver al Menú</button>
      </div>
    </div>

    <div class="content-wrapper">
      
      <div class="form-section">
        <div class="card-form" :class="{ 'modo-edicion': modoEdicion }">
          <div class="form-header">
            <h2>{{ modoEdicion ? '✏️ Editar Proveedor' : '📝 Registrar Nuevo Proveedor' }}</h2>
            <p v-if="!modoEdicion">Ingrese los datos del nuevo proveedor.</p>
            <p v-else>Modifique los datos y guarde los cambios.</p>
          </div>

          <form @submit.prevent="procesarFormulario">
            <div class="form-row">
              <div class="form-group">
                <label>NIT del Proveedor <span class="required">*</span></label>
                <input 
                  v-model="formulario.nit" 
                  type="text" 
                  placeholder="Ej: 0614-280390-112-1" 
                  maxlength="14"
                  required
                >
              </div>

              <div class="form-group">
                <label>Nombre / Razón Social <span class="required">*</span></label>
                <input 
                  v-model="formulario.nombre" 
                  type="text" 
                  placeholder="Nombre de la empresa" 
                  required
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Dirección (Opcional)</label>
                <input 
                  v-model="formulario.direccion" 
                  type="text" 
                  placeholder="Ubicación del local"
                >
              </div>

              <div class="form-group">
                <label>Departamento (Opcional)</label>
                <select v-model="formulario.departamento">
                  <option value="">Seleccione uno...</option>
                  <option value="San Miguel">San Miguel</option>
                  <option value="San Salvador">San Salvador</option>
                  <option value="La Unión">La Unión</option>
                  <option value="Usulután">Usulután</option>
                  <option value="Santa Ana">Santa Ana</option>
                </select>
              </div>
            </div>

            <div class="actions">
               <button type="submit" class="btn-guardar" :disabled="cargando">
                  {{ cargando ? 'Procesando...' : (modoEdicion ? '🔄 Actualizar Datos' : '💾 Guardar Proveedor') }}
                 </button>
  
                <button v-if="modoEdicion" @click.prevent="cancelarEdicion" class="btn-cancelar">
                    Cancelar
                </button>

                <button v-if="modoEdicion" @click.prevent="eliminarProveedor" class="btn-eliminar">
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
            <h3>📂 Proveedores Registrados</h3>
            <p class="nota-tabla">Clic en un proveedor para editarlo.</p>
            
            <div class="tabla-scroll">
              <table class="tabla-datos">
                <thead>
                  <tr>
                    <th>NIT</th>
                    <th>Nombre</th>
                    <th>Depto.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="prov in listaProveedores" 
                    :key="prov.ProvNIT"
                    @click="seleccionarParaEditar(prov)"
                    :class="{ 'fila-activa': prov.ProvNIT === ultimoGuardado, 'fila-seleccionada': prov.ProvNIT === nitOriginalEdicion }"
                  >
                    <td class="dato-nit">{{ prov.ProvNIT }}</td>
                    <td>{{ prov.ProvNombre }}</td>
                    <td>{{ prov.ProvDepto || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// --- ESTADOS ---
const formulario = ref({ nit: '', nombre: '', direccion: '', departamento: '' });
const listaProveedores = ref([]);
const mostrarLista = ref(false);
const cargando = ref(false);
const modoEdicion = ref(false);
const nitOriginalEdicion = ref(null); // Para saber a cuál hacer UPDATE
const ultimoGuardado = ref(null); // Para resaltar el último creado

// Mensajes
const mensaje = ref('');
const tipoMensaje = ref('');

const API_URL = import.meta.env.VITE_API_URL + '/api/proveedores';

// --- FUNCIONES ---

// 1. Obtener Lista
const cargarLista = async () => {
  try {
    const res = await axios.get(API_URL);
    listaProveedores.value = res.data;
  } catch (error) {
    console.error("Error al cargar lista", error);
  }
};

// 2. Alternar vista de lista
const alternarLista = () => {
  mostrarLista.value = !mostrarLista.value;
  if (mostrarLista.value && listaProveedores.value.length === 0) {
    cargarLista();
  }
};

// 3. Seleccionar para Editar
const seleccionarParaEditar = (prov) => {
  modoEdicion.value = true;
  nitOriginalEdicion.value = prov.ProvNIT; // Guardamos el ID original por si cambia el NIT
  mensaje.value = ''; // Limpiar mensajes previos

  // Llenamos el formulario
  formulario.value = {
    nit: prov.ProvNIT,
    nombre: prov.ProvNombre,
    direccion: prov.ProvDirec,
    departamento: prov.ProvDepto
  };

  // Hacemos scroll suave hacia arriba (útil en móviles)
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 4. Cancelar Edición
const cancelarEdicion = () => {
  modoEdicion.value = false;
  nitOriginalEdicion.value = null;
  formulario.value = { nit: '', nombre: '', direccion: '', departamento: '' };
  mensaje.value = '';
};

// 5. Procesar (Guardar o Actualizar)
const procesarFormulario = async () => {
  cargando.value = true;
  mensaje.value = '';

  try {
    if (modoEdicion.value) {
      // --- MODO ACTUALIZAR ---
      await axios.put(`${API_URL}/${nitOriginalEdicion.value}`, formulario.value);
      
      mensaje.value = '¡Proveedor actualizado correctamente!';
      ultimoGuardado.value = formulario.value.nit; // Marcamos el que acabamos de editar
      modoEdicion.value = false; // Salimos del modo edición
      nitOriginalEdicion.value = null;

    } else {
      // --- MODO CREAR ---
      await axios.post(API_URL, formulario.value);
      
      mensaje.value = '¡Proveedor registrado con éxito!';
      ultimoGuardado.value = formulario.value.nit; // Marcamos el nuevo
    }

    tipoMensaje.value = 'success';
    
    // Limpiamos formulario
    formulario.value = { nit: '', nombre: '', direccion: '', departamento: '' };
    
    // Recargamos la lista para ver cambios y abrimos la lista si estaba cerrada
    await cargarLista();
    mostrarLista.value = true; 

    // Auto-borrado de mensaje
    setTimeout(() => { mensaje.value = ''; }, 4000);

  } catch (error) {
    tipoMensaje.value = 'error';
    if (error.response && error.response.data.message) {
      mensaje.value = error.response.data.message;
    } else {
      mensaje.value = 'Ocurrió un error en el servidor.';
    }
  } finally {
    cargando.value = false;
  }
};

// 6. Función para Eliminar
const eliminarProveedor = async () => {
  // Pregunta de seguridad
  if (!confirm(`¿Estás seguro de eliminar al proveedor "${formulario.value.nombre}"?\nEsta acción no se puede deshacer.`)) {
    return;
  }

  cargando.value = true;
  mensaje.value = '';

  try {
    // Usamos el NIT original por si el usuario lo estaba cambiando en el formulario
    await axios.delete(`${API_URL}/${nitOriginalEdicion.value}`);

    mensaje.value = 'Proveedor eliminado correctamente.';
    tipoMensaje.value = 'success';

    // Limpiamos todo
    modoEdicion.value = false;
    nitOriginalEdicion.value = null;
    formulario.value = { nit: '', nombre: '', direccion: '', departamento: '' };
    
    // Recargamos la lista
    await cargarLista();

  } catch (error) {
    tipoMensaje.value = 'error';
    if (error.response && error.response.data.message) {
      mensaje.value = error.response.data.message;
    } else {
      mensaje.value = 'Error al intentar eliminar.';
    }
  } finally {
    cargando.value = false;
  }
};
</script>

<style scoped>
.proveedores-container {
  padding: 2rem;
  background-color: #f4f4f4;
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

h1 { color: #55C2B7; margin: 0; }

.header-actions {
  display: flex;
  gap: 10px;
}

button {
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-lista { background-color: #007bff; color: white; }
.btn-lista:hover { background-color: #0056b3; }

.btn-volver { background-color: #666; color: white; }
.btn-volver:hover { background-color: #444; }

/* LAYOUT FLEXIBLE */
.content-wrapper {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.form-section { flex: 1; } /* El formulario ocupa lo necesario */

.lista-section { 
  flex: 1; /* La lista ocupa lo necesario */
  min-width: 300px;
}

/* TARJETA FORMULARIO */
.card-form {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border-top: 5px solid #55C2B7;
  transition: border-color 0.3s;
}

.card-form.modo-edicion {
  border-top-color: #ffca28; /* Amarillo cuando edita */
}

.form-header h2 { margin-top: 0; margin-bottom: 5px; color: #333; }
.form-header p { color: #666; margin-bottom: 1.5rem; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
.required { color: red; }

input, select {
  width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;
}
input:focus, select:focus { border-color: #55C2B7; outline: none; }

/* BOTONES FORMULARIO */
.actions { display: flex; gap: 10px; margin-top: 1rem; }

.btn-guardar {
  flex: 1; background-color: #55C2B7; color: white; padding: 12px;
}
.btn-guardar:hover { background-color: #439a91; }
.btn-guardar:disabled { background-color: #ccc; }

.btn-cancelar {
  background-color: #ff6b6b; color: white;
}
.btn-cancelar:hover { background-color: #e55a5a; }

/* ALERTA */
.alert-box {
  margin-top: 1.5rem; padding: 15px; border-radius: 8px; display: flex; align-items: center; font-weight: bold;
}
.success { background-color: #e8f7f5; color: #1e7e75; border: 1px solid #55C2B7; }
.error { background-color: #fdeaea; color: #c0392b; border: 1px solid #e74c3c; }
.icon { margin-right: 10px; font-size: 1.2rem; }

/* TABLA LISTA */
.card-tabla {
  background: white;
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border-top: 5px solid #007bff;
}

.nota-tabla { font-size: 0.85rem; color: #888; margin-bottom: 10px; }

.tabla-scroll {
  max-height: 500px;
  overflow-y: auto;
}

.tabla-datos { width: 100%; border-collapse: collapse; }
.tabla-datos th { position: sticky; top: 0; background: #f1f1f1; padding: 10px; text-align: left; }
.tabla-datos td { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.tabla-datos tr:hover { background-color: #f9f9f9; }

/* ESTILOS DE RESALTADO */
.fila-seleccionada { background-color: #fff8e1 !important; border-left: 4px solid #ffca28; } /* Editando */
.fila-activa { background-color: #e0f7fa !important; border-left: 4px solid #55C2B7; font-weight: bold; } /* Último guardado */

.dato-nit { font-family: monospace; color: #555; }

/* ANIMACIONES */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: all 0.3s ease-out; }
.slide-enter-from, .slide-leave-to { transform: translateX(20px); opacity: 0; }

/* RESPONSIVE */
@media (max-width: 900px) {
  .content-wrapper { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
}

/* ... tus otros estilos ... */

.btn-eliminar {
  background-color: #d9534f; /* Rojo intenso */
  color: white;
  border: none;
  border-radius: 5px;
  padding: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-eliminar:hover {
  background-color: #c9302c;
}
</style>