<template>
  <div class="compras-container">
    <div class="header-section">
      <h1>💳 Ventas Crédito Fiscal</h1>
      <div class="header-buttons">
        <button @click="alternarVista" class="btn-toggle">
          {{ mostrandoLista ? '➕ Nueva Venta' : '📋 Ver Historial' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Menú</button>
      </div>
    </div>

    <div class="main-content">
      
      <div v-if="!mostrandoLista" class="card-form animate-fade">
        <div class="form-header">
          <h2>{{ modoEdicion ? '✏️ Editando Venta' : '✨ Nueva Venta CCF' }}</h2>
          <p>Ingrese los datos de la venta a Contribuyente.</p>
        </div>

        <form @submit.prevent="guardarVenta">
          
          <div class="seccion-proveedor" style="margin-bottom: 20px; background: #fff8e1; border-color: #ffb74d;">
            <label><strong>👤 Cliente que Declara (Empresa) *</strong></label>
            <div v-if="!declaranteSeleccionado" class="buscador-wrapper">
              <input type="text" v-model="busquedaDeclarante" placeholder="🔍 Buscar Declarante por Nombre o NIT..." class="input-buscador" @focus="mostrarSugerenciasDeclarante = true">
              <ul v-if="mostrarSugerenciasDeclarante && declarantesFiltrados.length > 0" class="lista-sugerencias">
                <li v-for="decla in declarantesFiltrados" :key="decla.iddeclaNIT" @click="seleccionarDeclarante(decla)">
                  <strong>{{ decla.declarante }}</strong> <small>{{ decla.iddeclaNIT }}</small>
                </li>
              </ul>
            </div>
            <div v-else class="proveedor-seleccionado" style="background: white; border-color: #ffb74d;">
              <div class="info-prov">
                <span>🏢</span>
                <div><strong>{{ declaranteSeleccionado.declarante }}</strong> <small>NIT: {{ declaranteSeleccionado.iddeclaNIT }}</small></div>
              </div>
              <button @click="quitarDeclarante" type="button" class="btn-cambiar" style="color: #e65100;">Cambiar</button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
                <label>Fecha Emisión <span class="required">*</span></label>
                <input type="date" v-model="formulario.FiscFecha" required class="input-fecha">
            </div>
            
            <div class="form-group" style="flex: 2;">
                <label>Número Documento <span class="required">*</span></label>
                <div class="input-ccf-container">
                    <span class="prefix">DTE</span>
                    <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e, 'part1', 2)" class="input-part part-small" placeholder="00">
                    <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="input-part part-letter" maxlength="1" placeholder="S">
                    <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e, 'part2', 3)" class="input-part part-medium" placeholder="000">
                    <span class="prefix">P</span>
                    <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e, 'part3', 3)" class="input-part part-medium" placeholder="000">
                    <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e, 'part4', 15)" class="input-part part-large" placeholder="000...">
                </div>
            </div>
          </div>

          <div class="seccion-proveedor">
             <h3>👥 Datos del Cliente (Comprador)</h3>
             <div v-if="!clienteSeleccionado" class="buscador-wrapper">
                <input type="text" v-model="busquedaCliente" placeholder="🔍 Buscar Cliente por Nombre o NIT..." class="input-buscador" @focus="mostrarSugerenciasCliente = true">
                <ul v-if="mostrarSugerenciasCliente && clientesFiltrados.length > 0" class="lista-sugerencias">
                  <li v-for="clie in clientesFiltrados" :key="clie.ClienNIT" @click="seleccionarCliente(clie)">
                    <strong>{{ clie.ClienNom }}</strong> <small>{{ clie.ClienNIT }}</small>
                  </li>
                </ul>
             </div>
             <div v-else class="proveedor-seleccionado">
                <div class="info-prov">
                  <span>👤</span>
                  <div><strong>{{ clienteSeleccionado.ClienNom }}</strong> <small>NIT: {{ clienteSeleccionado.ClienNIT }}</small></div>
                </div>
                <button @click="quitarCliente" type="button" class="btn-cambiar">Cambiar Cliente</button>
             </div>

             <div class="form-row" v-if="clienteSeleccionado">
                 <div class="form-group"><label>NRC</label><input :value="clienteSeleccionado.ClienNumReg" readonly style="background: #f5f5f5;"></div>
                 <div class="form-group"><label>Giro</label><input :value="clienteSeleccionado.ClienGiro" readonly style="background: #f5f5f5;"></div>
             </div>
          </div>

          <div class="form-row grid-fiscal">
             <div class="form-group"><label>Clase *</label><select v-model="formulario.FisClasDoc" class="select-destacado"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Tipo Doc *</label><select v-model="formulario.FisTipoDoc" class="select-destacado"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Operación *</label><select v-model="formulario.BusFiscTipoOperaRenta" class="select-destacado"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Ingreso *</label><select v-model="formulario.BusFiscTipoIngresoRenta" class="select-destacado"><option v-for="op in opcionesIngreso" :key="op" :value="op">{{ op }}</option></select></div>
          </div>

          <div class="form-row">
              <div class="form-group"><label>No. Resolución</label><input v-model="formulario.FiscNumResol" placeholder="Resolución MH"></div>
              <div class="form-group"><label>Serie Doc.</label><input v-model="formulario.FiscSerieDoc" placeholder="Serie"></div>
              <div class="form-group"><label>No. Anexo</label><input v-model="formulario.FiscNumAnexo" placeholder="Anexo"></div>
          </div>

          <div class="seccion-montos">
            <h3>💰 Detalles Económicos</h3>
            <div class="form-row grid-montos">
                <div class="form-group">
                    <label>Gravadas Locales *</label>
                    <input type="number" v-model="formulario.FiscVtaGravLocal" step="0.01" class="input-monto principal" @blur="calculosAutomaticos">
                </div>
                <div class="form-group">
                    <label>Exentas</label>
                    <input type="number" v-model="formulario.FiscVtaExen" step="0.01" class="input-sm" @blur="calculosAutomaticos">
                </div>
                 <div class="form-group">
                    <label>No Sujetas</label>
                    <input type="number" v-model="formulario.FiscVtaNoSujetas" step="0.01" class="input-sm" @blur="calculosAutomaticos">
                </div>
            </div>
             <div class="form-row grid-montos" style="margin-top: 10px;">
                <div class="form-group"><label>Vta. Terceros</label><input type="number" v-model="formulario.FiscVtaCtaTercNoDomici" step="0.01" class="input-sm" @blur="calculosAutomaticos"></div>
                <div class="form-group"><label>Débito Terceros</label><input type="number" v-model="formulario.FiscDebFiscVtaCtaTerceros" step="0.01" class="input-sm" @blur="calculosAutomaticos"></div>
            </div>

            <hr class="separador-sm">

            <div class="resultado-calculo">
                <div class="fila-res">
                    <span>IVA (13%):</span> 
                    <input type="number" v-model="formulario.FiscDebitoFiscal" readonly class="input-monto secundario">
                </div>
                <div class="fila-res total">
                    <span>TOTAL VENTA:</span> 
                    <input type="number" v-model="formulario.FiscTotalVtas" readonly class="input-total">
                </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn-guardar" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar' : '💾 Guardar Venta') }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="mostrandoLista" class="card-lista-full animate-fade">
        <div class="lista-header">
            <h3>📄 Historial de Crédito Fiscal</h3>
            <input type="text" v-model="filtroLista" placeholder="🔎 Filtrar..." class="filtro-input">
        </div>
        <div class="tabla-container">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Documento</th><th>Cliente</th><th>Total</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="venta in ventasFiltradas" :key="venta.idCredFiscal">
                <td>{{ formatearFecha(venta.FiscFecha) }}</td>
                <td style="font-family: monospace; font-weight: bold;">{{ venta.FiscNumDoc }}</td>
                <td>{{ venta.FiscNomRazonDenomi }}</td>
                <td class="monto-total">$ {{ parseFloat(venta.FiscTotalVtas || 0).toFixed(2) }}</td>
                <td class="acciones-td">
                  <button @click="prepararEdicion(venta)" class="btn-accion btn-editar">✏️</button>
                  <button v-if="rolActual === 'admin'" @click="eliminarVenta(venta.idCredFiscal)" class="btn-accion btn-borrar">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000/api`;

// --- VARIABLES DE DATOS ---
const todosLosClientes = ref([]);
const todosLosDeclarantes = ref([]);
const listaVentas = ref([]);
const cargando = ref(false);
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const filtroLista = ref('');

// --- BUSCADORES ---
const busquedaCliente = ref('');
const clienteSeleccionado = ref(null);
const mostrarSugerenciasCliente = ref(false);

const busquedaDeclarante = ref('');
const declaranteSeleccionado = ref(null);
const mostrarSugerenciasDeclarante = ref(false);

const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });

const formulario = ref({
    FiscFecha: new Date().toISOString().split('T')[0],
    FisClasDoc: '4. DOCUMENTO TRIBUTARIO DTE',
    FisTipoDoc: '03 COMPROBANTE DE CREDITO FISCAL',
    FiscNumDoc: '', FiscNit: '', FiscNomRazonDenomi: '',
    FiscNumResol: '', FiscSerieDoc: '', FiscNumAnexo: '',
    FiscVtaExen: '0.00', FiscVtaGravLocal: '0.00', FiscVtaNoSujetas: '0.00',
    FiscVtaCtaTercNoDomici: '0.00', FiscDebFiscVtaCtaTerceros: '0.00',
    FiscDebitoFiscal: '0.00', FiscTotalVtas: '0.00',
    BusFiscTipoOperaRenta: '1. GRAVADA', BusFiscTipoIngresoRenta: '1. INGRESO GRAVADO'
});

const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO", "11. FACTURA DE EXPORTACION"];
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA"];
const opcionesIngreso = ["1. INGRESO GRAVADO", "2. INGRESO NO GRAVADO", "3. RENTA NO GRAVADA"];

// --- CARGA INICIAL ---
const cargarDatos = async () => {
    try {
        const [resC, resD, resV] = await Promise.all([
            axios.get(`${BASE_URL}/clientes`),
            axios.get(`${BASE_URL}/declarantes`),
            axios.get(`${BASE_URL}/ventas-ccf`)
        ]);
        todosLosClientes.value = resC.data;
        todosLosDeclarantes.value = resD.data;
        listaVentas.value = resV.data;
    } catch (e) { console.error(e); }
};

// --- HELPERS PARA CÓDIGOS ---
const extraerSoloCodigo = (texto) => texto ? texto.split(/[\.\s]+/)[0] : '';
const recuperarOpcionCompleta = (codigo, lista) => {
    if (!codigo) return lista[0];
    const enc = lista.find(op => op.split(/[\.\s]+/)[0] == String(codigo).trim());
    return enc || codigo; 
};

// --- LÓGICA DE SELECCIÓN ---
const seleccionarCliente = (clie) => {
    clienteSeleccionado.value = clie;
    formulario.value.FiscNit = clie.ClienNIT;
    formulario.value.FiscNomRazonDenomi = clie.ClienNom;
    mostrarSugerenciasCliente.value = false;
    busquedaCliente.value = '';
};
const quitarCliente = () => { clienteSeleccionado.value = null; formulario.value.FiscNit = ''; };

const seleccionarDeclarante = (decla) => {
    declaranteSeleccionado.value = decla;
    mostrarSugerenciasDeclarante.value = false;
};
const quitarDeclarante = () => declaranteSeleccionado.value = null;

// --- FILTROS COMPUTADOS ---
const clientesFiltrados = computed(() => todosLosClientes.value.filter(c => 
    c.ClienNom.toLowerCase().includes(busquedaCliente.value.toLowerCase()) || c.ClienNIT.includes(busquedaCliente.value)
));

const declarantesFiltrados = computed(() => todosLosDeclarantes.value.filter(d => 
    d.declarante.toLowerCase().includes(busquedaDeclarante.value.toLowerCase()) || d.iddeclaNIT.includes(busquedaDeclarante.value)
));

const ventasFiltradas = computed(() => listaVentas.value.filter(v => 
    v.FiscNomRazonDenomi?.toLowerCase().includes(filtroLista.value.toLowerCase())
));

// --- MÁSCARA CCF ---
const handleLetraInput = (e) => {
    ccfParts.value.letraSerie = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    actualizarNumeroCompleto();
};
const handleInputMask = (e, p, m) => {
    let raw = e.target.value.replace(/\D/g, '');
    ccfParts.value[p] = raw.slice(-m).padStart(m, '0');
    actualizarNumeroCompleto();
};
const actualizarNumeroCompleto = () => {
    formulario.value.FiscNumDoc = `DTE${ccfParts.value.part1}${ccfParts.value.letraSerie || 'S'}${ccfParts.value.part2}P${ccfParts.value.part3}${ccfParts.value.part4}`;
};

// --- CÁLCULOS ---
const calculosAutomaticos = () => {
    const grav = parseFloat(formulario.value.FiscVtaGravLocal) || 0;
    const exe = parseFloat(formulario.value.FiscVtaExen) || 0;
    const nosuj = parseFloat(formulario.value.FiscVtaNoSujetas) || 0;
    const terc = parseFloat(formulario.value.FiscVtaCtaTercNoDomici) || 0;
    const debTerc = parseFloat(formulario.value.FiscDebFiscVtaCtaTerceros) || 0;

    const debitoCalc = grav * 0.13;

    formulario.value.FiscDebitoFiscal = debitoCalc.toFixed(2);
    formulario.value.FiscTotalVtas = (grav + exe + nosuj + terc + debTerc + debitoCalc).toFixed(2);
};

// --- PREPARAR EDICIÓN (AQUÍ ESTÁ LA FUNCIÓN QUE FALTABA) ---
const prepararEdicion = async (venta) => {
    const fSegura = venta.FiscFecha ? new Date(venta.FiscFecha).toISOString().split('T')[0] : '';
    
    formulario.value = {
        FiscFecha: fSegura,
        FisClasDoc: recuperarOpcionCompleta(venta.FisClasDoc, opcionesClase),
        FisTipoDoc: recuperarOpcionCompleta(venta.FisTipoDoc, opcionesTipo),
        FiscNumResol: venta.FiscNumResol || '',
        FiscSerieDoc: venta.FiscSerieDoc || '',
        FiscNumAnexo: venta.FiscNumAnexo || '',
        FiscNumDoc: venta.FiscNumDoc || '',
        FiscNit: venta.FiscNit || '',
        FiscNomRazonDenomi: venta.FiscNomRazonDenomi || '',
        FiscVtaExen: parseFloat(venta.FiscVtaExen || 0).toFixed(2),
        FiscVtaGravLocal: parseFloat(venta.FiscVtaGravLocal || 0).toFixed(2),
        FiscVtaNoSujetas: parseFloat(venta.FiscVtaNoSujetas || 0).toFixed(2),
        FiscVtaCtaTercNoDomici: parseFloat(venta.FiscVtaCtaTercNoDomici || 0).toFixed(2),
        FiscDebFiscVtaCtaTerceros: parseFloat(venta.FiscDebFiscVtaCtaTerceros || 0).toFixed(2),
        FiscDebitoFiscal: parseFloat(venta.FiscDebitoFiscal || 0).toFixed(2),
        FiscTotalVtas: parseFloat(venta.FiscTotalVtas || 0).toFixed(2),
        BusFiscTipoOperaRenta: recuperarOpcionCompleta(venta.BusFiscTipoOperaRenta, opcionesOperacion),
        BusFiscTipoIngresoRenta: recuperarOpcionCompleta(venta.BusFiscTipoIngresoRenta, opcionesIngreso),
    };

    const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
    const match = venta.FiscNumDoc ? venta.FiscNumDoc.match(regex) : null;
    if (match) {
        ccfParts.value = { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] };
    } else {
        ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    }

    if (venta.FiscNit) {
        clienteSeleccionado.value = todosLosClientes.value.find(c => c.ClienNIT === venta.FiscNit) || null;
    }
    
    // NOTA: Debes seleccionar el declarante manualmente al editar si no se guardó el ID específico
    
    modoEdicion.value = true;
    idEdicion.value = venta.idCredFiscal;
    mostrandoLista.value = false;
};

// --- GUARDAR ---
const guardarVenta = async () => {
    actualizarNumeroCompleto();
    if(!clienteSeleccionado.value) return alert("Seleccione un Cliente");
    if(!declaranteSeleccionado.value) return alert("Seleccione el Cliente que Declara");
    
    cargando.value = true;

    const payload = {
        ...formulario.value,
        FisClasDoc: extraerSoloCodigo(formulario.value.FisClasDoc),
        FisTipoDoc: extraerSoloCodigo(formulario.value.FisTipoDoc),
        BusFiscTipoOperaRenta: extraerSoloCodigo(formulario.value.BusFiscTipoOperaRenta),
        BusFiscTipoIngresoRenta: extraerSoloCodigo(formulario.value.BusFiscTipoIngresoRenta),
        
        // Conversión estricta a Float para evitar error 400
        FiscVtaExen: parseFloat(formulario.value.FiscVtaExen) || 0,
        FiscVtaGravLocal: parseFloat(formulario.value.FiscVtaGravLocal) || 0,
        FiscVtaNoSujetas: parseFloat(formulario.value.FiscVtaNoSujetas) || 0,
        FiscVtaCtaTercNoDomici: parseFloat(formulario.value.FiscVtaCtaTercNoDomici) || 0,
        FiscDebFiscVtaCtaTerceros: parseFloat(formulario.value.FiscDebFiscVtaCtaTerceros) || 0,
        FiscDebitoFiscal: parseFloat(formulario.value.FiscDebitoFiscal) || 0,
        FiscTotalVtas: parseFloat(formulario.value.FiscTotalVtas) || 0,
    };

    try {
        if (modoEdicion.value) await axios.put(`${BASE_URL}/ventas-CCF/${idEdicion.value}`, payload);
        else await axios.post(`${BASE_URL}/ventas-CCF`, payload);
        
        cargarDatos();
        mostrandoLista.value = true;
        resetForm();
    } catch (e) { 
        alert("Error al guardar: " + (e.response?.data?.message || e.message)); 
    }
    finally { cargando.value = false; }
};

const eliminarVenta = async (id) => {
    if(confirm("¿Eliminar esta venta permanentemente?")) {
        try {
            await axios.delete(`${BASE_URL}/ventas-CCF/${id}`);
            cargarDatos();
        } catch(e) {
            alert("Error al eliminar (Posiblemente permisos)");
        }
    }
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };
const alternarVista = () => { if(modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };

const resetForm = () => {
    formulario.value = { 
        FiscFecha: new Date().toISOString().split('T')[0], 
        FisClasDoc: '4. DOCUMENTO TRIBUTARIO DTE', 
        FisTipoDoc: '03 COMPROBANTE DE CREDITO FISCAL', 
        FiscNumDoc: '', FiscNit: '', FiscNomRazonDenomi: '',
        FiscNumResol: '', FiscSerieDoc: '', FiscNumAnexo: '',
        FiscVtaExen: '0.00', FiscVtaGravLocal: '0.00', FiscVtaNoSujetas: '0.00',
        FiscVtaCtaTercNoDomici: '0.00', FiscDebFiscVtaCtaTerceros: '0.00',
        FiscDebitoFiscal: '0.00', FiscTotalVtas: '0.00',
        BusFiscTipoOperaRenta: '1. GRAVADA', BusFiscTipoIngresoRenta: '1. INGRESO GRAVADO'
    };
    ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    clienteSeleccionado.value = null; 
    declaranteSeleccionado.value = null; 
    modoEdicion.value = false;
    idEdicion.value = null;
};
const formatearFecha = (f) => f ? new Date(f).toISOString().split('T')[0] : '--';

onMounted(cargarDatos);
</script>

<style scoped>
/* --- CONTENEDOR PRINCIPAL --- */
.compras-container {
  padding: 2rem;
  background: #f0f2f5;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* --- HEADER --- */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.btn-toggle {
  background: #1976d2; /* Azul Ventas */
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-toggle:hover { background: #1565c0; }

.btn-volver {
  background: #666;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* --- TARJETAS --- */
.card-form, .card-lista-full {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  max-width: 1200px;
  margin: 0 auto;
  border-top: 5px solid #1976d2; /* Azul */
}

/* --- GRID Y FORMULARIO --- */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.grid-fiscal {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.grid-montos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
  font-size: 0.85rem;
}

input, select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}

input:focus, select:focus {
  outline: none;
  border-color: #1976d2;
}

.select-destacado {
  border: 2px solid #bbdefb;
  background-color: #e3f2fd;
  font-weight: 500;
}

/* --- BUSCADOR DESPLEGABLE (IMPORTANTE PARA QUE SE VEA BIEN) --- */
.buscador-wrapper {
  position: relative;
  width: 100%;
}

.input-buscador {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
}

.lista-sugerencias {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0 0 8px 8px;
  z-index: 100;
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
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
  background: #e3f2fd;
}

.proveedor-seleccionado {
  background: #e3f2fd;
  padding: 10px;
  border: 1px solid #1976d2;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-prov {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-cambiar {
  background: none;
  border: none;
  color: #d32f2f;
  text-decoration: underline;
  cursor: pointer;
  font-weight: bold;
}

/* --- INPUT CCF (DTE COMPUESTO) --- */
.input-ccf-container {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 2px;
  background-color: white;
  gap: 2px;
  width: 100%;
}

.prefix {
  font-weight: bold;
  color: #1565c0;
  background: #e3f2fd;
  padding: 6px 4px;
  border-radius: 4px;
  font-size: 0.85rem;
  user-select: none;
}

.input-part {
  border: none;
  outline: none;
  text-align: center;
  font-family: monospace;
  font-size: 0.95rem;
  padding: 6px 2px;
  background: transparent;
  color: #333;
  font-weight: bold;
}

.input-part:focus {
  background-color: #e3f2fd;
  border-radius: 4px;
}

.part-small { width: 30px; }
.part-medium { width: 40px; }
.part-large { flex: 1; text-align: right; letter-spacing: 1px; }

.part-letter {
  width: 25px;
  text-align: center;
  font-weight: bold;
  color: #e65100;
  background: #fff3e0;
  border-radius: 4px;
  margin: 0 2px;
}

.hint-text {
  font-size: 0.7rem;
  color: #999;
  margin-top: 2px;
  display: block;
}

/* --- SECCIÓN MONTOS --- */
.seccion-montos {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border: 1px solid #eee;
}

.input-monto {
  font-size: 1rem;
  font-weight: bold;
}

.input-monto.principal { border-color: #1976d2; color: #333; }
.input-monto.secundario { border-color: #d32f2f; color: #333; }

.input-sm { font-size: 0.9rem; padding: 8px; }

.input-total {
  font-size: 1.3rem;
  font-weight: bold;
  color: #1976d2;
  border: 2px solid #1976d2;
  width: 160px;
  text-align: right;
  padding: 5px;
}

.resultado-calculo {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
}

.fila-res {
  display: flex;
  align-items: center;
  gap: 10px;
}

.separador-sm {
  margin: 15px 0;
  border: 0;
  border-top: 1px dashed #ccc;
}

/* --- BOTONES ACCIÓN --- */
.actions {
  display: flex;
  gap: 10px;
  margin-top: 1.5rem;
}

.btn-guardar {
  flex: 1;
  background: #1976d2;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.btn-guardar:hover { background: #1565c0; }

.btn-cancelar {
  background: #999;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

/* --- TABLA --- */
.tabla-container {
  overflow-x: auto;
  margin-top: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 10px;
  border-bottom: 2px solid #eee;
  color: #777;
  font-size: 0.9rem;
}

td {
  padding: 8px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
  font-size: 0.9rem;
}

.monto-total { font-weight: bold; color: #1976d2; }

.btn-accion {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  margin-right: 5px;
}

.btn-editar { color: #fbc02d; }
.btn-borrar { color: #d32f2f; }

.vacio {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}

/* --- ANIMACIÓN --- */
.animate-fade {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- RESPONSIVE --- */
@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .grid-fiscal, .grid-montos { grid-template-columns: 1fr 1fr; }
  .resultado-calculo { flex-direction: column; align-items: stretch; }
  .fila-res { justify-content: space-between; }
}
</style>