<template>
  <div class="admin-container">
    <div class="header-section">
      <h1>🛡️ Administración del Sistema</h1>
      <div class="header-buttons">
         <button @click="pestanaActiva = 'empleados'" :class="['btn-tab', { active: pestanaActiva === 'empleados' }]">👨‍💼 Empleados</button>
         <button @click="pestanaActiva = 'usuarios'" :class="['btn-tab', { active: pestanaActiva === 'usuarios' }]">🔑 Usuarios</button>
         <button @click="$router.push('/inicio')" class="btn-volver">⬅ Volver</button>
      </div>
    </div>

    <div v-if="pestanaActiva === 'empleados'" class="modulo-content">
       <div class="card-form">
          <h3>{{ modoEdicionEmp ? '✏️ Editar Empleado' : '✨ Nuevo Empleado' }}</h3>
          <form @submit.prevent="guardarEmpleado">
             <div class="form-row">
                <div class="form-group">
                    <label>Nombre Completo *</label>
                    <input v-model="formEmpleado.EmpleNombre" required placeholder="Ej: Juan Antonio Pérez">
                </div>
                <div class="form-group">
                    <label>DUI *</label>
                    <input v-model="formEmpleado.EmpleDUI" required placeholder="00000000-0">
                </div>
             </div>
             <div class="form-row">
                <div class="form-group"><label>Teléfono</label><input v-model="formEmpleado.EmpleaTel" placeholder="0000-0000"></div>
                <div class="form-group"><label>Dirección</label><input v-model="formEmpleado.EmpleDirec" placeholder="Dirección de residencia"></div>
             </div>
             <div class="form-group"><label>Email</label><input type="email" v-model="formEmpleado.EmpleCorreo"></div>
             
             <button type="submit" class="btn-guardar">
                {{ modoEdicionEmp ? 'Actualizar' : 'Guardar y Asignar Usuario ➡' }}
             </button>
             <button v-if="modoEdicionEmp" type="button" @click="resetEmpleado" class="btn-cancelar">Cancelar</button>
          </form>
       </div>

       <div class="lista-items">
          <table>
             <thead><tr><th>Nombre</th><th>Teléfono</th><th>DUI</th><th>Acciones</th></tr></thead>
             <tbody>
                <tr v-for="emp in listaEmpleados" :key="emp.idempleado">
                   <td>{{ emp.EmpleNombre }}</td>
                   <td>{{ emp.EmpleaTel }}</td>
                   <td>{{ emp.EmpleDUI }}</td>
                   <td>
                      <button @click="prepararEdicionEmp(emp)" class="btn-icon">✏️</button>
                      <button @click="eliminarEmpleado(emp.idempleado)" class="btn-icon delete">🗑️</button>
                   </td>
                </tr>
             </tbody>
          </table>
       </div>
    </div>

    <div v-if="pestanaActiva === 'usuarios'" class="modulo-content">
       <div class="card-form user-mode">
          <h3>👤 Crear Usuario para: <span class="resaltado">{{ nombreEmpleadoSeleccionado || 'Seleccione un empleado...' }}</span></h3>
          
          <form @submit.prevent="guardarUsuario">
             <div class="form-row">
                <div class="form-group">
                   <label>Empleado Asociado *</label>
                   <select v-model="formUsuario.empleados_idempleado" @change="actualizarNombreEmpleado" required class="select-destacado">
                      <option v-for="emp in listaEmpleados" :key="emp.idempleado" :value="emp.idempleado">
                         {{ emp.EmpleNombre }}
                      </option>
                   </select>
                </div>
                <div class="form-group">
                   <label>Rol de Sistema *</label>
                   <select v-model="formUsuario.Rol" required>
                      <option value="empleado">👤 Empleado (Limitado)</option>
                      <option value="admin">🛡️ Administrador (Total)</option>
                   </select>
                </div>
             </div>
             
             <div class="form-row">
                <div class="form-group">
                   <label>Usuario Sugerido</label>
                   <div class="input-group">
                      <input v-model="formUsuario.UsuaNombre" required style="font-weight:bold; color: #2c3e50; background-color: #e8f5e9;">
                      <button type="button" @click="generarSugerencia" class="btn-small" title="Re-generar">🔄</button>
                   </div>
                   <small class="hint">Formato: Nombre + 2 letras Apellido</small>
                </div>
                <div class="form-group">
                   <label>Contraseña</label>
                   <input type="password" v-model="formUsuario.UsuarioPassword" required>
                </div>
             </div>

             <button type="submit" class="btn-guardar">💾 Crear Usuario</button>
          </form>
       </div>

       <div class="lista-items">
          <h3>Usuarios Activos</h3>
          <table>
             <thead><tr><th>Usuario</th><th>Empleado Asignado</th><th>Rol</th><th>Acciones</th></tr></thead>
             <tbody>
                <tr v-for="usu in listaUsuarios" :key="usu.idUsuario">
                   <td><strong>{{ usu.UsuaNombre }}</strong></td>
                   <td>{{ usu.EmpleNombre || '---' }}</td>
                   <td>
                      <span :class="['badge-rol', usu.Rol === 'admin' ? 'rol-admin' : 'rol-empleado']">
                         {{ usu.Rol }}
                      </span>
                   </td>
                   <td><button @click="eliminarUsuario(usu.idUsuario)" class="btn-icon delete">🗑️</button></td>
                </tr>
             </tbody>
          </table>
       </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// --- CONFIGURACIÓN API ---
const hostname = window.location.hostname;
const API_ADMIN = `http://${hostname}:3000/api/admin`;

const pestanaActiva = ref('empleados');
const listaEmpleados = ref([]);
const listaUsuarios = ref([]);
const nombreEmpleadoSeleccionado = ref('');

// --- EMPLEADOS ---
const formEmpleado = ref({ EmpleNombre: '', EmpleDUI: '', EmpleCorreo: '', EmpleaTel: '', EmpleDirec: '' });
const modoEdicionEmp = ref(false);
const idEmpEdicion = ref(null);

const cargarData = async () => {
    try {
        const [resEmp, resUsu] = await Promise.all([
            axios.get(API_ADMIN + '/empleados'), 
            axios.get(API_ADMIN + '/usuarios')
        ]);
        listaEmpleados.value = resEmp.data;
        listaUsuarios.value = resUsu.data;
    } catch (e) { console.error(e); }
};

const guardarEmpleado = async () => {
    try {
        if (modoEdicionEmp.value) {
            await axios.put(`${API_ADMIN}/empleados/${idEmpEdicion.value}`, formEmpleado.value);
            alert('Empleado actualizado');
            resetEmpleado();
        } else {
            const res = await axios.post(`${API_ADMIN}/empleados`, formEmpleado.value);
            // ALERTA INTELIGENTE: Pasa a crear usuario inmediatamente
            if(confirm(`Empleado "${res.data.nombre}" creado. ¿Desea crearle un usuario ahora?`)) {
                prepararUsuarioNuevo(res.data.id, res.data.nombre);
            }
        }
        cargarData();
    } catch (e) { alert('Error al guardar empleado'); }
};

const eliminarEmpleado = async (id) => {
    if(confirm('¿Eliminar empleado? Si tiene usuario asignado, no se podrá eliminar.')) {
        try { await axios.delete(`${API_ADMIN}/empleados/${id}`); cargarData(); }
        catch (e) { alert(e.response?.data?.message || 'Error al eliminar'); }
    }
};

const prepararEdicionEmp = (emp) => {
    formEmpleado.value = { ...emp };
    modoEdicionEmp.value = true;
    idEmpEdicion.value = emp.idempleado;
};

const resetEmpleado = () => {
    formEmpleado.value = { EmpleNombre: '', EmpleDUI: '', EmpleCorreo: '', EmpleaTel: '', EmpleDirec: '' };
    modoEdicionEmp.value = false;
    idEmpEdicion.value = null;
};

// --- USUARIOS ---
const formUsuario = ref({ UsuaNombre: '', UsuarioPassword: '', Rol: 'empleado', empleados_idempleado: null });

const prepararUsuarioNuevo = (idEmp, nombreCompleto) => {
    pestanaActiva.value = 'usuarios';
    formUsuario.value.empleados_idempleado = idEmp;
    nombreEmpleadoSeleccionado.value = nombreCompleto;
    generarUsuarioSugerido(nombreCompleto);
};

const actualizarNombreEmpleado = () => {
    const emp = listaEmpleados.value.find(e => e.idempleado === formUsuario.value.empleados_idempleado);
    if(emp) {
        nombreEmpleadoSeleccionado.value = emp.EmpleNombre;
        generarUsuarioSugerido(emp.EmpleNombre);
    }
};

// LÓGICA DE SUGERENCIA DE USUARIO
// Regla: Primer nombre + 2 primeras letras del segundo bloque (apellido)
const generarUsuarioSugerido = (nombreCompleto) => {
    if(!nombreCompleto) return;
    
    // Separamos por espacios
    const partes = nombreCompleto.trim().split(/\s+/);
    
    let usuarioBase = '';
    
    if (partes.length >= 1) {
        // Tomamos el primer nombre
        usuarioBase += partes[0].toLowerCase();
        
        if (partes.length >= 2) {
            // Tomamos las primeras 2 letras de la segunda palabra (asumimos apellido)
            usuarioBase += partes[1].substring(0, 2).toLowerCase();
        }
    }
    
    // Agregamos un número aleatorio para evitar duplicados
    const random = Math.floor(Math.random() * 100); 
    formUsuario.value.UsuaNombre = `${usuarioBase}${random}`;
};

const generarSugerencia = () => actualizarNombreEmpleado(); // Re-trigger manual

const guardarUsuario = async () => {
    try {
        await axios.post(`${API_ADMIN}/usuarios`, formUsuario.value);
        alert('Usuario creado con éxito');
        formUsuario.value = { UsuaNombre: '', UsuarioPassword: '', Rol: 'empleado', empleados_idempleado: null };
        nombreEmpleadoSeleccionado.value = '';
        cargarData();
    } catch (e) { alert('Error al crear usuario'); }
};

const eliminarUsuario = async (id) => {
    if(confirm('¿Eliminar usuario? El empleado seguirá existiendo, pero perderá acceso al sistema.')) {
        try { await axios.delete(`${API_ADMIN}/usuarios/${id}`); cargarData(); }
        catch (e) { alert('Error al eliminar'); }
    }
};

onMounted(cargarData);
</script>

<style scoped>
.admin-container { padding: 2rem; background: #f0f2f5; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; max-width: 1200px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }

/* Botones Pestaña */
.btn-tab { padding: 10px 20px; border: none; background: #e0e0e0; cursor: pointer; border-radius: 8px; font-weight: bold; color: #666; transition: 0.3s; }
.btn-tab.active { background: #55C2B7; color: white; transform: scale(1.05); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.btn-volver { background: #666; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; }

/* Contenido */
.modulo-content { animation: fadeIn 0.4s ease-out; max-width: 1200px; margin: 0 auto; }
.card-form { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 2rem; border-top: 5px solid #55C2B7; }
.user-mode { border-top-color: #ff9800; } 

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.form-group { display: flex; flex-direction: column; }
label { font-weight: bold; color: #555; margin-bottom: 5px; font-size: 0.9rem; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
.input-group { display: flex; gap: 5px; }
.btn-small { padding: 0 10px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 4px; }

.btn-guardar { background: #55C2B7; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; font-size: 1rem; }
.btn-cancelar { background: #999; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; width: 100%; }

/* Tabla */
.lista-items table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
th { background: #f4f6f8; padding: 12px; text-align: left; font-weight: bold; color: #555; border-bottom: 2px solid #e0e0e0; }
td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 1.2rem; margin-right: 8px; transition: transform 0.2s; }
.btn-icon:hover { transform: scale(1.2); }
.btn-icon.delete:hover { filter: drop-shadow(0 0 2px red); }

.resaltado { color: #55C2B7; font-weight: bold; text-decoration: underline; }
.badge-rol { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
.rol-admin { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.rol-empleado { background: #f5f5f5; color: #616161; border: 1px solid #bdbdbd; }
.hint { font-size: 0.75rem; color: #888; margin-top: 3px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>