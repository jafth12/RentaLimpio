<template>
  <MainLayout>
    <div class="admin-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🛡️ Administración del Sistema</h1>
          <p class="subtitle">Gestión de empleados y control de accesos</p>
        </div>
        
        <div class="tabs-container">
          <button @click="pestanaActiva = 'empleados'" :class="['tab-btn', { active: pestanaActiva === 'empleados' }]">👨‍💼 Empleados</button>
          <button @click="pestanaActiva = 'usuarios'" :class="['tab-btn', { active: pestanaActiva === 'usuarios' }]">🔑 Usuarios</button>
        </div>
      </div>

      <div class="main-content">

        <div v-if="pestanaActiva === 'empleados'" class="modulo-content fade-in">
           
           <div class="card mb-4">
              <div class="card-header">
                <h2>{{ modoEdicionEmp ? '✏️ Editar Empleado' : '✨ Nuevo Empleado' }}</h2>
                <span class="badge-info">{{ modoEdicionEmp ? 'Modificando datos' : 'Registrar personal' }}</span>
              </div>
              
              <form @submit.prevent="guardarEmpleado" class="form-body">
                 <div class="form-grid">
                    <div class="form-group">
                       <label class="form-label">Nombre Completo <span class="text-danger">*</span></label>
                       <input v-model="formEmpleado.EmpleNombre" required class="form-control" placeholder="Ej: Juan Antonio Pérez">
                    </div>
                    <div class="form-group">
                       <label class="form-label">DUI <span class="text-danger">*</span></label>
                       <input v-model="formEmpleado.EmpleDUI" required class="form-control" placeholder="00000000-0">
                    </div>
                 </div>
                 
                 <div class="form-grid">
                    <div class="form-group"><label class="form-label">Teléfono</label><input v-model="formEmpleado.EmpleaTel" class="form-control" placeholder="0000-0000"></div>
                    <div class="form-group"><label class="form-label">Dirección</label><input v-model="formEmpleado.EmpleDirec" class="form-control" placeholder="Dirección de residencia"></div>
                 </div>
                 
                 <div class="form-group mt-2">
                    <label class="form-label">Correo Electrónico</label>
                    <input type="email" v-model="formEmpleado.EmpleCorreo" class="form-control" placeholder="empleado@empresa.com">
                 </div>

                 <div class="form-actions">
                    <button v-if="modoEdicionEmp" type="button" @click="resetEmpleado" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success btn-lg">
                       {{ modoEdicionEmp ? 'Actualizar Datos' : 'Guardar y Asignar Usuario ➡' }}
                    </button>
                 </div>
              </form>
           </div>

           <div class="card">
              <div class="card-header"><h3>📋 Nómina de Empleados</h3></div>
              <div class="table-responsive">
                 <table class="table">
                    <thead><tr><th>Nombre</th><th>Contacto</th><th>DUI</th><th class="text-center">Acciones</th></tr></thead>
                    <tbody>
                       <tr v-for="emp in listaEmpleados" :key="emp.idempleado">
                          <td class="fw-bold text-dark">{{ emp.EmpleNombre }}</td>
                          <td class="text-muted">{{ emp.EmpleaTel }}</td>
                          <td><span class="doc-number">{{ emp.EmpleDUI }}</span></td>
                          <td class="text-center">
                             <button @click="prepararEdicionEmp(emp)" class="btn-icon" title="Editar">✏️</button>
                             <button @click="eliminarEmpleado(emp.idempleado)" class="btn-icon text-danger" title="Eliminar">🗑️</button>
                          </td>
                       </tr>
                       <tr v-if="listaEmpleados.length === 0"><td colspan="4" class="text-center py-4 text-muted">No hay empleados registrados.</td></tr>
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div v-if="pestanaActiva === 'usuarios'" class="modulo-content fade-in">
           
           <div class="card mb-4 border-warning">
              <div class="card-header">
                 <h2>👤 Gestión de Acceso</h2>
                 <span class="badge-info warning">Crear credenciales</span>
              </div>
              
              <div class="user-selection-area">
                 <p class="section-subtitle">Asignando usuario para: <span class="highlight-name">{{ nombreEmpleadoSeleccionado || 'Seleccione un empleado abajo 👇' }}</span></p>
              </div>

              <form @submit.prevent="guardarUsuario" class="form-body">
                 <div class="form-grid">
                    <div class="form-group">
                       <label class="form-label">Empleado Asociado <span class="text-danger">*</span></label>
                       <select v-model="formUsuario.empleados_idempleado" @change="actualizarNombreEmpleado" required class="form-control select-highlight">
                          <option :value="null">-- Seleccionar --</option>
                          <option v-for="emp in listaEmpleados" :key="emp.idempleado" :value="emp.idempleado">
                             {{ emp.EmpleNombre }}
                          </option>
                       </select>
                    </div>
                    <div class="form-group">
                       <label class="form-label">Rol de Sistema <span class="text-danger">*</span></label>
                       <select v-model="formUsuario.Rol" required class="form-control">
                          <option value="empleado">👤 Empleado (Limitado)</option>
                          <option value="admin">🛡️ Administrador (Total)</option>
                       </select>
                    </div>
                 </div>

                 <div class="form-grid mt-3">
                    <div class="form-group">
                       <label class="form-label">Nombre de Usuario <span class="text-danger">*</span></label>
                       <div class="input-group">
                          <input 
                            v-model="formUsuario.UsuaNombre" 
                            required 
                            class="form-control fw-bold" 
                            placeholder="Escribe el usuario o usa la sugerencia"
                          >
                          <button type="button" @click="generarSugerencia" class="btn-icon-square" title="Generar Sugerencia Automática">🔄</button>
                       </div>
                       <small class="text-muted text-xs">Puedes escribir uno propio o generar uno automático.</small>
                    </div>
                    <div class="form-group">
                       <label class="form-label">Contraseña <span class="text-danger">*</span></label>
                       <input type="password" v-model="formUsuario.UsuarioPassword" required class="form-control" placeholder="••••••••">
                    </div>
                 </div>

                 <div class="form-actions">
                    <button type="submit" class="btn btn-success btn-lg" :disabled="!formUsuario.empleados_idempleado">💾 Crear Credenciales</button>
                 </div>
              </form>
           </div>

           <div class="card">
              <div class="card-header"><h3>🔑 Usuarios Activos</h3></div>
              <div class="table-responsive">
                 <table class="table">
                    <thead><tr><th>Usuario</th><th>Empleado Asignado</th><th>Rol</th><th class="text-center">Acciones</th></tr></thead>
                    <tbody>
                       <tr v-for="usu in listaUsuarios" :key="usu.idUsuario">
                          <td><span class="user-badge">{{ usu.UsuaNombre }}</span></td>
                          <td class="text-dark">{{ usu.EmpleNombre || '---' }}</td>
                          <td>
                             <span :class="['role-badge', usu.Rol === 'admin' ? 'role-admin' : 'role-user']">
                                {{ usu.Rol ? usu.Rol.toUpperCase() : 'N/A' }}
                             </span>
                          </td>
                          <td class="text-center">
                             <button @click="eliminarUsuario(usu.idUsuario)" class="btn-icon text-danger" title="Eliminar Acceso">🗑️</button>
                          </td>
                       </tr>
                       <tr v-if="listaUsuarios.length === 0"><td colspan="4" class="text-center py-4 text-muted">No hay usuarios activos.</td></tr>
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue';
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
            alert('¡Empleado actualizado correctamente!');
            resetEmpleado();
        } else {
            const res = await axios.post(`${API_ADMIN}/empleados`, formEmpleado.value);
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
    } else {
        nombreEmpleadoSeleccionado.value = '';
        formUsuario.value.UsuaNombre = '';
    }
};

const generarUsuarioSugerido = (nombreCompleto) => {
    if(!nombreCompleto) return;
    const partes = nombreCompleto.trim().split(/\s+/);
    let usuarioBase = '';
    
    if (partes.length >= 1) {
        usuarioBase += partes[0].toLowerCase();
        if (partes.length >= 2) {
            usuarioBase += partes[1].substring(0, 2).toLowerCase();
        }
    }
    const random = Math.floor(Math.random() * 100); 
    formUsuario.value.UsuaNombre = `${usuarioBase}${random}`;
};

const generarSugerencia = () => {
    if (nombreEmpleadoSeleccionado.value) generarUsuarioSugerido(nombreEmpleadoSeleccionado.value);
};

const guardarUsuario = async () => {
    try {
        await axios.post(`${API_ADMIN}/usuarios`, formUsuario.value);
        alert('¡Usuario creado con éxito!');
        formUsuario.value = { UsuaNombre: '', UsuarioPassword: '', Rol: 'empleado', empleados_idempleado: null };
        nombreEmpleadoSeleccionado.value = '';
        cargarData();
    } catch (e) { alert('Error al crear usuario'); }
};

const eliminarUsuario = async (id) => {
    if(confirm('¿Eliminar acceso de usuario? El empleado seguirá existiendo.')) {
        try { await axios.delete(`${API_ADMIN}/usuarios/${id}`); cargarData(); }
        catch (e) { alert('Error al eliminar'); }
    }
};

onMounted(cargarData);
</script>

<style scoped>
/* --- ESTILO MATERIAL DESVANECIDO (Consistente) --- */
.admin-container {
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

/* Tabs */
.tabs-container {
  display: flex;
  background: #fff;
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.tab-btn {
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: #55C2B7;
  color: white;
  box-shadow: 0 2px 4px rgba(85, 194, 183, 0.3);
}

/* Tarjetas */
.card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(85, 194, 183, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 20px;
  animation: fadeIn 0.4s ease-out;
}
.border-warning { border-top: 4px solid #f59e0b; }
.mb-4 { margin-bottom: 1.5rem; }

.card-header {
  border-bottom: 1px solid #f0fdfa;
  padding-bottom: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { 
  font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; 
}
.badge-info.warning { background: #fef3c7; color: #b45309; }

/* Formularios */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

.form-control {
  width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937;
  background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem;
  transition: all 0.2s; box-sizing: border-box;
}
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

/* Ajustes de usuario editable */
.select-highlight { border-color: #f59e0b; background-color: #fffbeb; }
.input-group { display: flex; gap: 8px; }
.btn-icon-square { border: 1px solid #d1d5db; background: white; border-radius: 6px; padding: 0 12px; cursor: pointer; transition: 0.2s; }
.btn-icon-square:hover { background-color: #f0fdfa; border-color: #55C2B7; }
.fw-bold { font-weight: 700; }

/* Acciones */
.form-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 10px; }
.btn { display: inline-flex; align-items: center; padding: 0.6rem 1.2rem; font-weight: 600; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s; }
.btn-success { background-color: #10b981; color: white; }
.btn-success:hover { background-color: #059669; }
.btn-secondary { background-color: #fff; border: 1px solid #d1d5db; color: #374151; }

/* Tabla */
.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 12px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; vertical-align: middle; }
.btn-icon { background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 4px; transition: transform 0.2s; }
.btn-icon:hover { transform: scale(1.1); }

/* Detalles Específicos */
.doc-number { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; color: #374151; }
.user-badge { font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; }
.role-badge { font-size: 0.7rem; padding: 3px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; }
.role-admin { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
.role-user { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

.section-subtitle { margin-bottom: 15px; color: #6b7280; font-size: 0.95rem; }
.highlight-name { color: #059669; font-weight: 800; font-size: 1.1rem; }
.text-danger { color: #ef4444; } .text-muted { color: #6b7280; } .text-xs { font-size: 0.75rem; } .mt-2 { margin-top: 10px; } .mt-3 { margin-top: 15px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .tabs-container { width: 100%; } .tab-btn { flex: 1; }
}
</style>