<template>
  <div class="ventas-container">
    
    <div class="header-section">
      <div>
        <h2 style="color: #1565c0; margin: 0;">Libro de Ventas a Contribuyentes (CCF)</h2>
        <small style="color: #666;">Registro y Control de Documentos Fiscales</small>
      </div>
      <div class="header-buttons">
        <button @click="alternarVista" class="btn-toggle">
          {{ mostrarFormulario ? 'Ver Historial' : 'Nueva Venta' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">
          <i class="bi bi-arrow-left"></i> Volver al Menú
        </button>
      </div>
    </div>

    <div v-if="mostrarFormulario" class="card-form animate-fade">
      <form @submit.prevent="guardarVenta">
        
        <div class="seccion-grupo">
          <h3><i class="bi bi-file-earmark-text"></i> Datos del Documento</h3>
          
          <div class="form-row grid-3">
            <div class="form-group">
              <label>Fecha de Emisión</label>
              <input type="date" v-model="form.fecha" required>
            </div>
            <div class="form-group">
              <label>Clase de Documento</label>
              <select v-model="form.claseDocumento" required>
                <option value="1">1. IMPRESO POR IMPRENTA O TICKET</option>
                <option value="2">2. FORMULARIO ÚNICO</option>
                <option value="4">4. DOCUMENTO TRIBUTARIO DTE</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Documento</label>
              <select v-model="form.tipoDocumento" required>
                <option value="03">03. COMPROBANTE DE CRÉDITO FISCAL</option>
                <option value="04">04. NOTA DE REMISIÓN</option>
                <option value="05">05. NOTA DE CRÉDITO</option>
                <option value="06">06. NOTA DE DÉBITO</option>
                <option value="11">11. FACTURA DE EXPORTACIÓN</option>
              </select>
            </div>
          </div>

          <div class="form-row grid-4">
            <div class="form-group">
              <label>No. Resolución</label>
              <input type="text" v-model="form.numeroResolucion" placeholder="Ej. 12345...">
            </div>
            <div class="form-group">
              <label>Serie</label>
              <input type="text" v-model="form.serieDocumento" placeholder="Ej. A">
            </div>
            <div class="form-group">
              <label>No. Documento</label>
              <input type="text" v-model="form.numeroDocumento" required placeholder="0001" style="border-color: #1976d2;">
            </div>
            <div class="form-group">
              <label>Control Interno</label>
              <input type="text" v-model="form.controlInterno" placeholder="Opcional">
            </div>
          </div>
        </div>

        <div class="seccion-grupo">
          <h3><i class="bi bi-person-badge"></i> Información del Cliente</h3>
          <div class="form-row grid-3">
            <div class="form-group">
              <label>Buscar Cliente (NIT)</label>
              <select v-model="form.nit" @change="buscarCliente" required class="select-cliente">
                <option value="">Seleccione un cliente...</option>
                <option v-for="cliente in clientes" :key="cliente.ClienNIT || cliente.nit" :value="cliente.ClienNIT || cliente.nit">
                  {{ cliente.ClienNIT || cliente.nit }} - {{ cliente.ClienNom || cliente.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Nombre / Razón Social</label>
              <input type="text" v-model="form.nombreCliente" readonly style="background: #f0f0f0;">
            </div>
            <div class="form-group">
              <label>DUI del Cliente</label>
              <input type="text" v-model="form.duiCliente" placeholder="00000000-0">
            </div>
          </div>
        </div>

        <div class="seccion-montos">
          <div class="subtitulo-seccion">Detalle de la Operación</div>
          
          <div class="form-row grid-4">
            <div class="form-group">
              <label>Ventas Exentas</label>
              <div class="input-group">
                <span class="currency">$</span>
                <input type="number" step="0.01" v-model.number="form.ventasExentas">
              </div>
            </div>
            <div class="form-group">
              <label>Ventas No Sujetas</label>
              <div class="input-group">
                <span class="currency">$</span>
                <input type="number" step="0.01" v-model.number="form.ventasNoSujetas">
              </div>
            </div>
            <div class="form-group">
              <label style="color: #1565c0;">Ventas Gravadas</label>
              <div class="input-group">
                <span class="currency blue">$</span>
                <input type="number" step="0.01" v-model.number="form.ventasGravadas" class="input-monto principal">
              </div>
            </div>
            <div class="form-group">
              <label style="color: #d32f2f;">Débito Fiscal (13%)</label>
              <div class="input-group">
                <span class="currency red">$</span>
                <input type="number" step="0.01" v-model.number="form.debitoFiscal" readonly style="background: #ffebee; color: #d32f2f; font-weight: bold;">
              </div>
            </div>
          </div>

          <div class="form-row grid-3" style="margin-top: 20px; align-items: flex-end;">
            <div class="form-group">
              <label>Vtas. Cta. Terceros</label>
              <input type="number" step="0.01" v-model.number="form.ventasTerceros">
            </div>
            <div class="form-group">
              <label>Débito Terceros</label>
              <input type="number" step="0.01" v-model.number="form.debitoTerceros">
            </div>
            <div class="form-group">
               <label style="font-size: 1.1rem; color: #1976d2;">TOTAL A PAGAR</label>
               <input type="text" :value="'$ ' + form.totalVentas.toFixed(2)" class="input-total" readonly>
            </div>
          </div>
        </div>

        <div class="seccion-grupo" style="margin-top: 15px; background: #fff;">
          <div class="form-row grid-3">
             <div class="form-group">
                <label>Tipo Operación</label>
                <select v-model="form.tipoOperacion"><option value="1">1. RENTA</option><option value="2">2. OTRO</option></select>
             </div>
             <div class="form-group">
                <label>Tipo Ingreso</label>
                <select v-model="form.tipoIngreso"><option value="1">1. RENTA</option><option value="2">2. GANANCIA CAP.</option></select>
             </div>
             <div class="form-group">
                <label>Anexo</label>
                <input type="text" v-model="form.numeroAnexo" readonly>
             </div>
          </div>
        </div>

        <div class="actions">
            <button type="submit" class="btn-guardar">
              <i class="bi bi-save"></i> Guardar Comprobante
            </button>
        </div>
      </form>
    </div>

    <div v-else class="card-lista-full animate-fade">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="color: #555; margin: 0;">Historial de Comprobantes Emitidos</h3>
        <button @click="cargarHistorial" class="btn-accion"><i class="bi bi-arrow-clockwise"></i> Actualizar</button>
      </div>

      <div class="tabla-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>No. Doc</th>
              <th>Cliente (NIT)</th>
              <th>Gravado</th>
              <th>Débito</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="venta in historialVentas" :key="venta.idCredFiscal">
              <td>{{ new Date(venta.FiscFecha).toLocaleDateString() }}</td>
              <td style="font-weight: bold;">{{ venta.FiscNumDoc }}</td>
              <td>
                 <div style="font-weight: 500;">{{ venta.FiscNomRazonDenomi }}</div>
                 <small style="color: #888;">{{ venta.FiscNit }}</small>
              </td>
              <td class="monto-gravado">$ {{ Number(venta.FiscVtaGravLocal || 0).toFixed(2) }}</td>
              <td style="color: #d32f2f;">$ {{ Number(venta.FiscDebitoFiscal || 0).toFixed(2) }}</td>
              <td class="monto-total">$ {{ Number(venta.FiscTotalVtas || 0).toFixed(2) }}</td>
              <td>
                <button class="btn-accion text-primary" title="Ver Detalle"><i class="bi bi-eye"></i></button>
              </td>
            </tr>
            <tr v-if="historialVentas.length === 0">
              <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                No hay ventas registradas aún.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import axios from 'axios';

// --- CONFIGURACIÓN ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mostrarFormulario = ref(true);
const clientes = ref([]);
const historialVentas = ref([]);

// --- ESTADO DEL FORMULARIO ---
const form = ref({
  fecha: new Date().toISOString().split('T')[0],
  claseDocumento: '4', 
  tipoDocumento: '03', 
  numeroResolucion: '',
  serieDocumento: '',
  numeroDocumento: '',
  controlInterno: '',
  nit: '',
  nombreCliente: '',
  duiCliente: '',
  ventasExentas: 0,
  ventasNoSujetas: 0,
  ventasGravadas: 0,
  debitoFiscal: 0,
  ventasTerceros: 0,
  debitoTerceros: 0,
  totalVentas: 0,
  tipoOperacion: '1',
  tipoIngreso: '1',
  numeroAnexo: '1'
});

// --- INICIALIZACIÓN ---
onMounted(async () => {
  await cargarClientes();
  await cargarHistorial();
});

const alternarVista = () => {
  mostrarFormulario.value = !mostrarFormulario.value;
  if (!mostrarFormulario.value) {
    cargarHistorial(); 
  }
};

// --- API CLIENTES ---
const cargarClientes = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/clientes`);
    // Verificamos en consola qué nombres trae la BD
    console.log("CLIENTES cargados:", res.data); 
    clientes.value = res.data;
  } catch (error) {
    console.error("Error cargando clientes:", error);
  }
};


const buscarCliente = () => {
  // Buscamos el cliente comparando con cualquiera de las dos posibles llaves
  const clienteEncontrado = clientes.value.find(c => (c.ClienNIT || c.nit) === form.value.nit);
  
  if (clienteEncontrado) {
    // Asignamos el nombre usando cualquiera de las dos opciones
    form.value.nombreCliente = clienteEncontrado.ClienNom || clienteEncontrado.nombre; 
  } else {
    form.value.nombreCliente = '';
  }
};
// --- API HISTORIAL (CORREGIDO) ---
const cargarHistorial = async () => {
  try {
    // CORRECCIÓN: Ahora llama a la ruta de VENTAS, no a clientes
    const res = await axios.get(`${API_URL}/api/ventas-ccf`);
    console.log("HISTORIAL cargado:", res.data);
    historialVentas.value = res.data; 
  } catch (error) {
    console.error("Error cargando historial:", error);
  }
};

// --- CÁLCULOS ---
watch(() => form.value.ventasGravadas, (valor) => {
  form.value.debitoFiscal = parseFloat((valor * 0.13).toFixed(2));
});

watch(
  () => [
    form.value.ventasExentas, 
    form.value.ventasNoSujetas, 
    form.value.ventasGravadas, 
    form.value.debitoFiscal,
    form.value.ventasTerceros,
    form.value.debitoTerceros
  ], 
  () => {
    form.value.totalVentas = 
      (form.value.ventasExentas || 0) +
      (form.value.ventasNoSujetas || 0) +
      (form.value.ventasGravadas || 0) +
      (form.value.debitoFiscal || 0) +
      (form.value.ventasTerceros || 0) +
      (form.value.debitoTerceros || 0);
  }
);

// --- GUARDAR ---
const guardarVenta = async () => {
  if (!form.value.nit) {
    alert("Debe seleccionar un cliente (NIT)");
    return;
  }
  try {
    const respuesta = await axios.post(`${API_URL}/api/ventas-ccf`, form.value);
    alert('Éxito: ' + respuesta.data.message);
    limpiarFormulario(); 
    cargarHistorial(); 
    mostrarFormulario.value = false; // Ir al historial tras guardar
  } catch (error) {
    console.error(error);
    alert('Error al guardar: ' + (error.response?.data?.message || error.message));
  }
};

// --- LIMPIAR ---
const limpiarFormulario = () => {
  form.value.numeroDocumento = '';
  form.value.controlInterno = ''; 
  form.value.nit = '';
  form.value.nombreCliente = '';
  form.value.duiCliente = ''; 

  form.value.ventasGravadas = 0;
  form.value.ventasExentas = 0;
  form.value.ventasNoSujetas = 0;
  form.value.debitoFiscal = 0;
  form.value.ventasTerceros = 0; 
  form.value.debitoTerceros = 0; 
  form.value.totalVentas = 0;
};
</script>

<style scoped>
/* ESTILOS PROPORCIONADOS POR EL USUARIO + AJUSTES */
.ventas-container { padding: 2rem; background: #e3f2fd; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; max-width: 1000px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }

.btn-toggle { background: #1976d2; color: white; padding: 10px 20px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; }
.btn-toggle:hover { background: #1565c0; transform: translateY(-1px); }

.btn-volver { background: #546e7a; color: white; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 5px; }
.btn-volver:hover { background: #455a64; }

.card-form, .card-lista-full { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1000px; margin: 0 auto; border-top: 5px solid #1976d2; }

/* Grid Systems */
.form-row { display: grid; gap: 1.5rem; margin-top: 1rem; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

.form-group { display: flex; flex-direction: column; }
label { font-weight: 600; color: #555; font-size: 0.9rem; margin-bottom: 8px; }
input, select { padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; transition: border 0.3s; }
input:focus, select:focus { outline: none; border-color: #1976d2; }

/* Sections */
.seccion-grupo { background: #fbfbfb; padding: 20px; border-radius: 10px; border: 1px solid #f0f0f0; margin-bottom: 20px; }
.seccion-grupo h3 { margin-top: 0; color: #1976d2; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }

.seccion-montos { background: #fffde7; padding: 20px; border-radius: 10px; margin-top: 1rem; border: 1px solid #fff59d; }
.subtitulo-seccion { margin-top: 0; margin-bottom: 15px; font-size: 0.85rem; color: #fbc02d; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }

/* Inputs Especiales */
.input-group { position: relative; display: flex; align-items: center; }
.currency { position: absolute; left: 10px; color: #777; font-weight: bold; }
.currency.blue { color: #1565c0; }
.currency.red { color: #d32f2f; }
.input-group input { padding-left: 25px; width: 100%; }

.input-monto.principal { border-color: #1976d2; color: #1565c0; font-weight: bold; font-size: 1rem; }
.input-total { border: 2px solid #1976d2; background: white; font-weight: 800; color: #1976d2; text-align: right; font-size: 1.4rem; padding: 10px; }

/* Botones Acción */
.actions { margin-top: 2rem; display: flex; gap: 15px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px; }
.btn-guardar { background: #2e7d32; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; display: flex; gap: 8px; align-items: center; transition: 0.3s; }
.btn-guardar:hover { background: #1b5e20; transform: translateY(-1px); }

/* Tabla */
.tabla-container { margin-top: 1.5rem; overflow-x: auto; border-radius: 8px; border: 1px solid #eee; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 15px; background: #f5f5f5; border-bottom: 2px solid #e0e0e0; color: #555; font-size: 0.9rem; text-transform: uppercase; }
td { padding: 15px; border-bottom: 1px solid #f0f0f0; color: #444; }
tr:hover { background-color: #f9f9f9; }

.monto-gravado { color: #1565c0; font-weight: 600; }
.monto-total { color: #2e7d32; font-weight: bold; font-size: 1.05rem; }
.btn-accion { background: white; border: 1px solid #ddd; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #666; transition: 0.2s; }
.btn-accion:hover { background: #f5f5f5; color: #333; }

/* Animaciones */
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Responsive */
@media (max-width: 768px) {
  .grid-3, .grid-4 { grid-template-columns: 1fr; gap: 10px; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-buttons { width: 100%; justify-content: space-between; }
  .card-form { padding: 1.5rem; }
}
</style>