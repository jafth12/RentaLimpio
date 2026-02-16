<template>
  <main-layout>
    <div class="terceros-container">
      <div class="header-section">
        <h1>🤝 Ventas a Cuenta de Terceros</h1>
        <div class="header-buttons">
          <button @click="alternarVista" class="btn-toggle">
            {{ mostrandoLista ? '➕ Nuevo Registro' : '📋 Ver Lista' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card-form animate-fade">
          <div class="form-header">
            <h2>{{ modoEdicion ? '✏️ Editando Registro' : '✨ Nuevo Ingreso' }}</h2>
            <p>Seleccione el Mandante (Cliente) y registre la venta realizada por su cuenta.</p>
          </div>

          <form @submit.prevent="guardarVenta">
            
            <div class="seccion-grupo seccion-mandante">
                <h3>👤 Datos del Mandante (Dueño del Bien)</h3>
                
                <div v-if="!mandanteSeleccionado" class="buscador-wrapper">
                    <label>Buscar Mandante por Nombre o NIT *</label>
                    <input type="text" 
                           v-model="busquedaMandante" 
                           placeholder="🔍 Escriba para buscar..." 
                           class="input-buscador" 
                           @focus="mostrarSugerenciasMandante = true">
                    
                    <ul v-if="mostrarSugerenciasMandante && mandantesFiltrados.length > 0" class="lista-sugerencias">
                        <li v-for="cliente in mandantesFiltrados" :key="cliente.ClienNIT" @click="seleccionarMandante(cliente)">
                            <strong>{{ cliente.ClienNom }}</strong>
                            <small>NIT: {{ cliente.ClienNIT }}</small>
                        </li>
                    </ul>
                    
                    <div v-if="busquedaMandante && mandantesFiltrados.length === 0" class="no-resultados">
                        No se encontraron clientes con ese criterio.
                    </div>
                </div>

                <div v-else class="mandante-seleccionado animate-fade">
                    <div class="info-mandante">
                        <span class="icono-user">👤</span>
                        <div class="datos">
                            <strong class="nombre-mandante">{{ mandanteSeleccionado.ClienNom }}</strong>
                            <div class="nit-mandante">NIT: {{ mandanteSeleccionado.ClienNIT }}</div>
                        </div>
                    </div>
                    <button type="button" @click="quitarMandante" class="btn-cambiar">Cambiar Mandante</button>
                </div>
            </div>

            <div class="seccion-grupo">
                <h3>📄 Documento Emitido</h3>
                <div class="form-row grid-3">
                    <div class="form-group">
                        <label>Fecha Emisión *</label>
                        <input type="date" v-model="formulario.VtaGraTerFecha" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo Documento</label>
                        <select v-model="formulario.LisVtaGraTerTipoDoc" class="select-destacado">
                            <option value="03 COMPROBANTE DE CREDITO FISCAL">03 CCF</option>
                            <option value="01 FACTURA">01 FACTURA</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Serie</label>
                        <input type="text" v-model="formulario.VtaGraTerNumSerie">
                    </div>
                </div>
                <div class="form-row grid-3">
                    <div class="form-group"><label>No. Documento *</label><input type="text" v-model="formulario.VtaGraTerNumDoc" required></div>
                    <div class="form-group"><label>Resolución</label><input type="text" v-model="formulario.VtaGraTerNumResolu"></div>
                    <div class="form-group"><label>Anexo</label><input type="text" v-model="formulario.VtaGraTerAnexo"></div>
                </div>
            </div>

            <div class="seccion-montos">
                <h3>💰 Detalles Económicos</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>Monto Operación (Gravado) *</label>
                        <input type="number" step="0.01" v-model="formulario.VtaGraTerMontoOper" class="input-monto principal" required @blur="calcularIVA">
                    </div>
                    <div class="form-group">
                        <label>IVA Débito Fiscal</label>
                        <input type="number" step="0.01" v-model="formulario.VtaGraTerIVAOper" class="input-monto secundario" readonly>
                    </div>
                </div>
            </div>

            <div class="seccion-grupo secundaria">
                <h3 style="color:#666; font-size: 0.9rem;">📑 Comprobante de Liquidación (Opcional)</h3>
                <div class="form-row grid-3">
                    <div class="form-group"><label>Serie Liq.</label><input type="text" v-model="formulario.VtaGraTerSerieCompLiq"></div>
                    <div class="form-group"><label>No. Liq.</label><input type="text" v-model="formulario.VtaGraTerNumCompLiq"></div>
                    <div class="form-group"><label>Fecha Liq.</label><input type="date" v-model="formulario.VtaGraTerFechaCompLiq"></div>
                </div>
            </div>

            <div class="actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar' : '💾 Guardar') }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="mostrandoLista" class="card-lista-full animate-fade">
          <div class="lista-header">
             <h3>📋 Historial Ventas a Terceros</h3>
             <input type="text" v-model="filtro" placeholder="🔎 Buscar por nombre..." class="filtro-input">
          </div>
          <div class="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mandante (NIT/Nom)</th>
                  <th>Documento</th>
                  <th>Monto Oper.</th>
                  <th>IVA</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in listaFiltrada" :key="item.idVtaGravTerDomici">
                  <td>{{ formatearFecha(item.VtaGraTerFecha) }}</td>
                  <td>
                      <div class="prov-nombre">{{ item.VtaGraTerNom }}</div>
                      <small>{{ item.VtaGraTerNit }}</small>
                  </td>
                  <td>{{ item.VtaGraTerNumDoc }}</td>
                  <td class="monto-total">$ {{ parseFloat(item.VtaGraTerMontoOper || 0).toFixed(2) }}</td>
                  <td>$ {{ parseFloat(item.VtaGraTerIVAOper || 0).toFixed(2) }}</td>
                  <td class="acciones-td">
                    <button @click="prepararEdicion(item)" class="btn-accion btn-editar">✏️</button>
                    <button v-if="rolActual === 'admin'" @click="eliminarVenta(item.idVtaGravTerDomici)" class="btn-accion btn-borrar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="listaFiltrada.length === 0"><td colspan="6" class="vacio">No hay registros.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </main-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue';

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000/api/ventas-terceros`;
const API_CLIENTES = `http://${hostname}:3000/api/clientes`;
const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

// --- ESTADO ---
const formulario = ref({
    VtaGraTerNit: '', VtaGraTerNom: '', VtaGraTerFecha: new Date().toISOString().split('T')[0],
    LisVtaGraTerTipoDoc: '03 COMPROBANTE DE CREDITO FISCAL',
    VtaGraTerNumSerie: '', VtaGraTerNumResolu: '', VtaGraTerNumDoc: '',
    VtaGraTerMontoOper: '0.00', VtaGraTerIVAOper: '0.00',
    VtaGraTerSerieCompLiq: '', VtaGraTerNumCompLiq: '', VtaGraTerFechaCompLiq: '', VtaGraTerAnexo: ''
});

const listaVentas = ref([]);
const todosLosClientes = ref([]); // Lista completa de clientes para el buscador
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const filtro = ref('');

// Variables del Buscador
const busquedaMandante = ref('');
const mandanteSeleccionado = ref(null);
const mostrarSugerenciasMandante = ref(false);

// --- LÓGICA DEL BUSCADOR ---
const mandantesFiltrados = computed(() => {
    if (!busquedaMandante.value) return [];
    const term = busquedaMandante.value.toLowerCase();
    return todosLosClientes.value.filter(c => 
        c.ClienNom.toLowerCase().includes(term) || c.ClienNIT.includes(term)
    ).slice(0, 10); // Limitar a 10 resultados para que no sea gigante
});

const seleccionarMandante = (cliente) => {
    mandanteSeleccionado.value = cliente;
    formulario.value.VtaGraTerNit = cliente.ClienNIT;
    formulario.value.VtaGraTerNom = cliente.ClienNom;
    mostrarSugerenciasMandante.value = false;
    busquedaMandante.value = '';
};

const quitarMandante = () => {
    mandanteSeleccionado.value = null;
    formulario.value.VtaGraTerNit = '';
    formulario.value.VtaGraTerNom = '';
};

// --- CÁLCULOS ---
const calcularIVA = () => {
    const monto = parseFloat(formulario.value.VtaGraTerMontoOper) || 0;
    if(formulario.value.LisVtaGraTerTipoDoc.includes('03') || formulario.value.LisVtaGraTerTipoDoc.includes('01')) {
        formulario.value.VtaGraTerIVAOper = (monto * 0.13).toFixed(2);
    }
};

// --- API ---
const cargarDatos = async () => {
    try {
        // Cargar Ventas y Clientes en paralelo
        const [resVentas, resClientes] = await Promise.all([
            axios.get(BASE_URL),
            axios.get(API_CLIENTES)
        ]);
        listaVentas.value = resVentas.data;
        todosLosClientes.value = resClientes.data;
    } catch(e) { console.error("Error cargando datos:", e); }
};

const guardarVenta = async () => {
    if (!formulario.value.VtaGraTerNit) {
        alert("Por favor seleccione un Mandante.");
        return;
    }

    cargando.value = true;
    try {
        if(modoEdicion.value) {
            await axios.put(`${BASE_URL}/${idEdicion.value}`, formulario.value);
        } else {
            await axios.post(BASE_URL, formulario.value);
        }
        await cargarDatos();
        resetForm();
        mostrandoLista.value = true;
    } catch(e) { alert('Error al guardar'); } 
    finally { cargando.value = false; }
};

const eliminarVenta = async (id) => {
    if(!confirm('¿Eliminar registro?')) return;
    try { await axios.delete(`${BASE_URL}/${id}`); cargarDatos(); } catch(e) { alert('Error'); }
};

const prepararEdicion = (item) => {
    formulario.value = { ...item };
    
    // Ajustar fechas
    if(item.VtaGraTerFecha) formulario.value.VtaGraTerFecha = item.VtaGraTerFecha.split('T')[0];
    if(item.VtaGraTerFechaCompLiq) formulario.value.VtaGraTerFechaCompLiq = item.VtaGraTerFechaCompLiq.split('T')[0];
    
    // Configurar el buscador con el mandante actual
    // Buscamos si existe en la lista de clientes para mostrarlo bonito
    const clienteExistente = todosLosClientes.value.find(c => c.ClienNIT === item.VtaGraTerNit);
    if (clienteExistente) {
        mandanteSeleccionado.value = clienteExistente;
    } else {
        // Si no está en la lista (cliente borrado o antiguo), creamos uno temporal para visualizar
        mandanteSeleccionado.value = { ClienNom: item.VtaGraTerNom, ClienNIT: item.VtaGraTerNit };
    }

    idEdicion.value = item.idVtaGravTerDomici;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const resetForm = () => {
    formulario.value = {
        VtaGraTerNit: '', VtaGraTerNom: '', VtaGraTerFecha: new Date().toISOString().split('T')[0],
        LisVtaGraTerTipoDoc: '03 COMPROBANTE DE CREDITO FISCAL',
        VtaGraTerNumSerie: '', VtaGraTerNumResolu: '', VtaGraTerNumDoc: '',
        VtaGraTerMontoOper: '0.00', VtaGraTerIVAOper: '0.00',
        VtaGraTerSerieCompLiq: '', VtaGraTerNumCompLiq: '', VtaGraTerFechaCompLiq: '', VtaGraTerAnexo: ''
    };
    mandanteSeleccionado.value = null;
    modoEdicion.value = false;
    idEdicion.value = null;
};

const alternarVista = () => { if(modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '--';
const listaFiltrada = computed(() => listaVentas.value.filter(x => x.VtaGraTerNom?.toLowerCase().includes(filtro.value.toLowerCase())));

onMounted(cargarDatos);
</script>

<style scoped>
/* Estilos Base */
.terceros-container { padding: 2rem; background: #fff3e0; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
.header-section { display: flex; justify-content: space-between; max-width: 1000px; margin: 0 auto 2rem; }
.btn-toggle { background: #fb8c00; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-toggle:hover { background: #f57c00; }
.card-form, .card-lista-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1000px; margin: 0 auto; border-top: 5px solid #fb8c00; }
.form-row { display: grid; gap: 1rem; margin-top: 1rem; grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; }
label { font-weight: bold; color: #555; font-size: 0.85rem; margin-bottom: 5px; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.select-destacado { border: 2px solid #ffe0b2; background-color: #fff8e1; }
.seccion-montos { background: #fff8e1; padding: 1rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #ffe0b2; }
.input-monto.principal { border-color: #fb8c00; font-weight: bold; font-size: 1.1rem; color: #e65100; }
.input-monto.secundario { background: #eee; }
.actions { display: flex; gap: 10px; margin-top: 1.5rem; }
.btn-guardar { flex: 1; background: #fb8c00; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-cancelar { background: #999; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; }
.tabla-container { margin-top: 1rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px; border-bottom: 2px solid #eee; color: #777; }
td { padding: 10px; border-bottom: 1px solid #eee; }
.monto-total { font-weight: bold; color: #e65100; }
.btn-accion { background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px; }
.animate-fade { animation: fadeIn 0.4s ease-out; }

/* --- ESTILOS DEL BUSCADOR --- */
.seccion-mandante {
    margin-bottom: 20px;
}
.buscador-wrapper {
    position: relative;
}
.input-buscador {
    width: 100%;
    padding: 12px;
    border: 2px solid #fb8c00; /* Borde naranja */
    border-radius: 8px;
    background-color: #fff;
}
.lista-sugerencias {
    position: absolute;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 0 0 8px 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    list-style: none;
    padding: 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.lista-sugerencias li {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
}
.lista-sugerencias li:hover {
    background: #fff3e0;
}
.no-resultados {
    padding: 10px;
    color: #888;
    font-style: italic;
    background: #f9f9f9;
    border: 1px solid #eee;
    margin-top: 5px;
    border-radius: 5px;
}

/* Tarjeta de Seleccionado */
.mandante-seleccionado {
    background: #fff3e0;
    border: 2px solid #fb8c00;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.info-mandante {
    display: flex;
    align-items: center;
    gap: 15px;
}
.icono-user {
    background: #ffe0b2;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}
.nombre-mandante {
    display: block;
    font-size: 1.1rem;
    color: #e65100;
}
.nit-mandante {
    font-size: 0.9rem;
    color: #555;
    font-family: monospace;
}
.btn-cambiar {
    background: white;
    color: #e65100;
    border: 1px solid #fb8c00;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 0.85rem;
}
.btn-cambiar:hover {
    background: #ffe0b2;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>