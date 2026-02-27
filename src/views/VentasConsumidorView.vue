<template>
  <MainLayout>
    <div class="ventas-container">
      <div class="header-section">
        <div class="title-box">
          <h1>🧾 Ventas Consumidor Final</h1>
          <p class="subtitle">Emisión de facturas para clientes finales (Anexo 1)</p>
        </div>
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nueva Venta' : '📋 Ver Historial' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Factura' : '✨ Nueva Venta' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Modificando registro en Base de Datos' : 'Ingreso de Documento Tributario' }}</span>
          </div>

          <form @submit.prevent="guardarVenta" class="form-body">
            <div class="form-section">
              <h3 class="section-title">📄 Detalles del Documento</h3>
              <div class="form-grid four-cols">
                
                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label text-dark fw-bold">🏢 Empresa / Declarante <span class="text-danger">*</span></label>
                   <select v-model="formulario.iddeclaNIT" class="form-control" required>
                      <option value="" disabled>-- Seleccione Empresa --</option>
                      <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">
                         {{ d.declarante }}
                      </option>
                   </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Fecha Emisión <span class="text-danger">*</span></label>
                  <input type="date" v-model="formulario.fecha" class="form-control" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Mes a Declarar <span class="text-danger">*</span></label>
                  <select v-model="formulario.mesDeclarado" class="form-control" required>
                    <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Año a Declarar <span class="text-danger">*</span></label>
                  <input type="number" v-model="formulario.anioDeclarado" class="form-control" min="2000" required>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Código de Generación (UUID) <span class="text-danger">*</span></label>
                   <input type="text" v-model="formulario.uuid_dte" class="form-control uuid-input" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label">Número DTE (Factura) <span class="text-danger">*</span></label>
                   <div class="dte-mask-container">
                      <span class="dte-prefix">DTE</span>
                      <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e, 'part1', 2)" class="dte-part w-2ch" placeholder="00">
                      <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="dte-part dte-letter" placeholder="S" @focus="$event.target.select()">
                      <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e, 'part2', 3)" class="dte-part w-3ch" placeholder="000">
                      <span class="dte-sep">P</span>
                      <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e, 'part3', 3)" class="dte-part w-3ch" placeholder="000">
                      <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e, 'part4', 15)" class="dte-part flex-grow" placeholder="Correlativo...">
                   </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Serie (Opcional)</label>
                  <input type="text" v-model="formulario.serie" class="form-control" placeholder="SERIE">
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">👤 Cliente</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nombre Cliente <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.cliente" class="form-control" placeholder="Nombre o Razón Social" required>
                </div>
                <div class="form-group">
                  <label class="form-label">DUI / NIT del Cliente</label>
                  <input type="text" v-model="formulario.documentoCliente" class="form-control" placeholder="00000000-0">
                </div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">💰 Clasificación y Montos</h3>
              
              <div class="form-grid mt-2 mb-3">
                 <div class="form-group">
                    <label class="form-label text-dark">Tipo de Operación</label>
                    <select v-model="formulario.tipo_operacion" class="form-control select-catalogo">
                       <option value="1">1 - Ventas Gravadas Local</option>
                       <option value="2">2 - Ventas Exentas Local</option>
                       <option value="3">3 - Ventas No Sujetas Local</option>
                       <option value="4">4 - Exportaciones CA</option>
                       <option value="5">5 - Exportaciones Fuera CA</option>
                       <option value="6">6 - Exportaciones de Servicios</option>
                       <option value="7">7 - Zonas Francas y DPA</option>
                       <option value="8">8 - Ventas a Cuenta de Terceros</option>
                    </select>
                 </div>
                 <div class="form-group">
                    <label class="form-label text-dark">Tipo de Ingreso</label>
                    <select v-model="formulario.tipo_ingreso" class="form-control select-catalogo">
                       <option value="1">1 - Ingresos de Actividades Ordinarias</option>
                       <option value="2">2 - Ingresos Financieros</option>
                       <option value="3">3 - Otros Ingresos y/o Ganancias</option>
                    </select>
                 </div>
              </div>

              <div class="montos-wrapper">
                <div class="monto-group">
                  <label class="monto-label">Ventas Gravadas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.gravadas" step="0.01" class="form-control monto-input" @blur="formatearDecimal('gravadas')">
                  </div>
                </div>
                <div class="monto-group">
                  <label class="monto-label">Ventas Exentas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.exentas" step="0.01" class="form-control monto-input" @blur="formatearDecimal('exentas')">
                  </div>
                </div>
                <div class="monto-group">
                  <label class="monto-label">Ventas No Sujetas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.noSujetas" step="0.01" class="form-control monto-input" @blur="formatearDecimal('noSujetas')">
                  </div>
                </div>
                <div class="monto-group total-group">
                  <label class="monto-label">TOTAL FACTURA</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input :value="totalCalculado" type="text" class="form-control total-input" readonly>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Procesando...' : (modoEdicion ? 'Actualizar Registro' : '💾 Guardar en DB') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Ventas Consumidor</h3>
             
             <div class="history-filters">
                <input type="number" v-model="anioFiltro" placeholder="Año" class="form-control filter-year">
                <select v-model="mesFiltro" class="form-control filter-month">
                  <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
                </select>
                <select v-model="declaranteFiltro" class="form-control filter-input">
                    <option value="">🏢 Todas las Empresas</option>
                    <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </select>
                <input type="text" v-model="filtro" placeholder="🔍 Buscar por cliente o DTE..." class="form-control search-list">
             </div>
          </div>
          
          <div v-if="seleccionados.length > 0" class="bulk-action-bar fade-in">
             <div class="bulk-info">
                <span class="badge-success">{{ seleccionados.length }} seleccionados</span>
                <span class="bulk-text">Asignar para declarar en:</span>
             </div>
             <div class="bulk-controls">
                <select v-model="bulkMes" class="form-control form-control-sm w-auto d-inline">
                   <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                </select>
                <input type="number" v-model="bulkAnio" class="form-control form-control-sm w-auto d-inline" style="width: 80px;">
                <button class="btn btn-primary btn-sm" @click="aplicarCambioMasivo" :disabled="cargandoMasivo">
                   {{ cargandoMasivo ? 'Aplicando...' : '💾 Mover Facturas' }}
                </button>
             </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" @change="toggleAll" :checked="ventasFiltradas.length > 0 && seleccionados.length === ventasFiltradas.length" class="row-checkbox" title="Seleccionar todo">
                  </th>
                  <th>Fecha</th><th>Cliente</th><th>Número de Control</th>
                  <th class="text-right">Gravadas</th><th class="text-right">Total</th><th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="venta in ventasFiltradas" :key="venta.idconsfinal" :class="{'selected-row': seleccionados.includes(venta.idconsfinal), 'is-anulado': esAnulado(venta)}">
                  <td class="text-center">
                     <input type="checkbox" :value="venta.idconsfinal" v-model="seleccionados" class="row-checkbox">
                  </td>
                  <td>
                    <div class="fw-bold text-dark">{{ formatearFecha(venta.ConsFecha) }}</div>
                    <small class="text-muted">Declarado: <strong class="text-primary">{{ venta.ConsMesDeclarado || 'N/A' }}</strong></small>
                  </td>
                  <td><div class="fw-bold text-dark">{{ venta.ConsNomRazonCliente || 'Cliente General' }}</div></td>
                  <td><span class="doc-number">{{ venta.ConsNumDocAL || 'N/A' }}</span></td>
                  <td class="text-right text-muted">${{ parseFloat(venta.ConsVtaGravLocales || 0).toFixed(2) }}</td>
                  <td class="text-right fw-bold text-success">${{ parseFloat(venta.ConsTotalVta || 0).toFixed(2) }}</td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(venta)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarVenta(venta.idconsfinal)" title="Eliminar">🗑️</button>
                    <button class="btn-icon text-warning" @click="anularDocumento(venta)" title="Anular Documento">🚫</button>
                  </td>
                </tr>
                <tr v-if="ventasFiltradas.length === 0"><td colspan="7" class="text-center py-4 text-muted">No hay registros que coincidan con la búsqueda.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/ventas-cf`; 

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- LÓGICA DE MÁSCARA DTE ---
const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    ccfParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto();
};
const handleInputMask = (e, partName, maxLength) => {
    let raw = e.target.value.replace(/\D/g, ''); 
    if (raw.length > maxLength) raw = raw.slice(-maxLength);
    const padded = raw.padStart(maxLength, '0');
    ccfParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto();
};
const actualizarNumeroCompleto = () => {
    const letra = ccfParts.value.letraSerie || 'S';
    formulario.value.numero_control = `DTE-${ccfParts.value.part1}-${letra}${ccfParts.value.part2}P${ccfParts.value.part3}-${ccfParts.value.part4}`;
};

// --- ESTADOS DEL FORMULARIO ---
const formulario = ref({
    iddeclaNIT: '', 
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    numero_control: '', uuid_dte: '', serie: '', 
    cliente: 'Cliente General', documentoCliente: '', 
    tipo_operacion: '1', tipo_ingreso: '1', 
    gravadas: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00'
});

const listaVentas = ref([]); 
const listaAnuladosGlobal = ref([]); // 🛡️ NUEVO: Lista de anulados
const todosLosDeclarantes = ref([]);
const mostrandoLista = ref(true);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');

// --- ASIGNACIÓN MASIVA ---
const seleccionados = ref([]);
const bulkMes = ref(mesesOptions[new Date().getMonth()]);
const bulkAnio = ref(new Date().getFullYear().toString());
const cargandoMasivo = ref(false);

const toggleAll = (e) => {
    if (e.target.checked) { seleccionados.value = ventasFiltradas.value.map(v => v.idconsfinal); } 
    else { seleccionados.value = []; }
};

const aplicarCambioMasivo = async () => {
    if (!confirm(`¿Mover ${seleccionados.value.length} documentos al mes de ${bulkMes.value} ${bulkAnio.value}?`)) return;
    cargandoMasivo.value = true;
    try {
        const promesas = seleccionados.value.map(id => {
            const ventaOri = listaVentas.value.find(v => v.idconsfinal === id);
            if (!ventaOri) return Promise.resolve();

            const payload = {
                iddeclaNIT: ventaOri.iddeclaNIT,
                fecha: ventaOri.ConsFecha ? ventaOri.ConsFecha.split('T')[0] : null,
                mesDeclarado: bulkMes.value,
                anioDeclarado: bulkAnio.value,
                serie: ventaOri.ConsSerieDoc,
                numero_control: ventaOri.ConsNumDocAL,
                uuid_dte: ventaOri.ConsCodGeneracion,
                cliente: ventaOri.ConsNomRazonCliente,
                documentoCliente: ventaOri.ConsNumDocIdentCliente,
                exentas: ventaOri.ConsVtaExentas,
                noSujetas: ventaOri.ConsVtaNoSujetas,
                gravadas: ventaOri.ConsVtaGravLocales,
                total: ventaOri.ConsTotalVta,
                tipo_operacion: ventaOri.ConsTipoOpera,
                tipo_ingreso: ventaOri.ConsTipoIngreso
            };
            return axios.put(`${API_URL}/${id}`, payload);
        });
        await Promise.all(promesas);
        alert(`✅ ${seleccionados.value.length} documentos actualizados.`);
        seleccionados.value = [];
        await cargarVentas();
    } catch (error) { alert("🚨 Error al mover los documentos."); } 
    finally { cargandoMasivo.value = false; }
};

// --- CÁLCULOS Y WATCHERS ---
watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

const totalCalculado = computed(() => {
    const g = parseFloat(formulario.value.gravadas) || 0; 
    const e = parseFloat(formulario.value.exentas) || 0;
    const n = parseFloat(formulario.value.noSujetas) || 0; 
    return (g + e + n).toFixed(2);
});

// --- FILTROS ---
const mesesFiltroOptions = [
  { nombre: 'Todos los Meses', valor: '' },
  { nombre: 'Enero', valor: 'Enero' }, { nombre: 'Febrero', valor: 'Febrero' }, { nombre: 'Marzo', valor: 'Marzo' },
  { nombre: 'Abril', valor: 'Abril' }, { nombre: 'Mayo', valor: 'Mayo' }, { nombre: 'Junio', valor: 'Junio' },
  { nombre: 'Julio', valor: 'Julio' }, { nombre: 'Agosto', valor: 'Agosto' }, { nombre: 'Septiembre', valor: 'Septiembre' },
  { nombre: 'Octubre', valor: 'Octubre' }, { nombre: 'Noviembre', valor: 'Noviembre' }, { nombre: 'Diciembre', valor: 'Diciembre' }
];

const anioFiltro = ref(new Date().getFullYear().toString());
const mesFiltro = ref(''); 
const declaranteFiltro = ref('');
const filtro = ref('');

const ventasFiltradas = computed(() => {
    let filtrado = listaVentas.value || [];
    if (declaranteFiltro.value) filtrado = filtrado.filter(v => v.iddeclaNIT === declaranteFiltro.value);
    if (mesFiltro.value) filtrado = filtrado.filter(v => v.ConsMesDeclarado === mesFiltro.value);
    if (anioFiltro.value) filtrado = filtrado.filter(v => String(v.ConsAnioDeclarado) === String(anioFiltro.value) || (v.ConsFecha && v.ConsFecha.startsWith(anioFiltro.value)));
    if (filtro.value) {
        const txt = filtro.value.toLowerCase();
        filtrado = filtrado.filter(v => {
            const cliente = (v.ConsNomRazonCliente || '').toLowerCase();
            const num = (v.ConsNumDocAL || '').toLowerCase();
            return cliente.includes(txt) || num.includes(txt);
        });
    }
    return filtrado;
});

const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(valor) ? valor.toFixed(2) : '0.00';
};

// --- OPERACIONES DE API ---
const cargarVentas = async () => {
    try {
        const resD = await axios.get(`${BASE_URL}/api/declarantes`);
        todosLosDeclarantes.value = resD.data || [];
        
        const resV = await axios.get(API_URL);
        listaVentas.value = resV.data || [];

        // 🛡️ CARGAMOS ANULADOS PARA EL CRUCE VISUAL
        const resA = await axios.get(`${BASE_URL}/api/anulados`);
        listaAnuladosGlobal.value = resA.data || [];
    } catch (error) { console.error("Error cargando base de datos:", error); }
};

// 🛡️ FUNCIÓN DE VERIFICACIÓN DE ANULADOS (Específica para Consumidor Final)
const esAnulado = (doc) => {
    const dte = doc.ConsNumDocAL;
    const uuid = doc.ConsCodGeneracion;
    return listaAnuladosGlobal.value.some(a => 
        a.iddeclaNIT === doc.iddeclaNIT && 
        (a.DetaDocDesde === dte || a.DetaDocCodGeneracion === (uuid ? uuid.replace(/-/g, '') : ''))
    );
};

const guardarVenta = async () => {
    if (!formulario.value.iddeclaNIT) { tipoMensaje.value = 'error'; mensaje.value = 'Seleccione una Empresa.'; return; }
    actualizarNumeroCompleto(); 
    cargando.value = true;
    formulario.value.total = totalCalculado.value; 

    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Registro actualizado exitosamente!';
        } else {
            await axios.post(API_URL, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Venta guardada en Base de Datos!';
        }
        await cargarVentas(); 
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) { 
        tipoMensaje.value = 'error'; 
        mensaje.value = error.response?.data?.message || 'Error de conexión con el servidor.'; 
    } finally { cargando.value = false; }
};

const eliminarVenta = async (id) => {
    if(!confirm('¿Eliminar esta venta permanentemente de la Base de Datos?')) return;
    try { await axios.delete(`${API_URL}/${id}`); await cargarVentas(); } catch (e) { alert('No se pudo eliminar el registro.'); }
};

const prepararEdicion = (venta) => {
    let fSegura = venta.ConsFecha ? venta.ConsFecha.split('T')[0] : new Date().toISOString().split('T')[0];
    const rawNum = venta.ConsNumDocAL || '';
    const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
    const match = rawNum.replace(/-/g, '').match(regex);
    
    ccfParts.value = match ? 
        { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : 
        { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };

    const limpiarCodigoCat = (txt) => { const m = (txt||'').toString().match(/\d+/); return m ? m[0] : '1'; };

    formulario.value = { 
        iddeclaNIT: venta.iddeclaNIT,
        fecha: fSegura,
        mesDeclarado: venta.ConsMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
        anioDeclarado: venta.ConsAnioDeclarado || fSegura.substring(0,4),
        numero_control: rawNum,
        uuid_dte: venta.ConsCodGeneracion || '',
        serie: venta.ConsSerieDoc || '',
        cliente: venta.ConsNomRazonCliente || '',
        documentoCliente: venta.ConsNumDocIdentCliente || '',
        tipo_operacion: limpiarCodigoCat(venta.ConsTipoOpera), 
        tipo_ingreso: limpiarCodigoCat(venta.ConsTipoIngreso), 
        gravadas: parseFloat(venta.ConsVtaGravLocales || 0).toFixed(2),
        exentas: parseFloat(venta.ConsVtaExentas || 0).toFixed(2),
        noSujetas: parseFloat(venta.ConsVtaNoSujetas || 0).toFixed(2),
        total: parseFloat(venta.ConsTotalVta || 0).toFixed(2)
    }; 
    idEdicion.value = venta.idconsfinal; modoEdicion.value = true; mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = { iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), numero_control: '', uuid_dte: '', serie: '', cliente: 'Cliente General', documentoCliente: '', tipo_operacion: '1', tipo_ingreso: '1', gravadas: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00' };
    ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

// 🛡️ LÓGICA DE ANULACIÓN (MANTIENE LA VENTA, SOLO LA MARCA)
const anularDocumento = async (ventaOriginal) => {
    if(esAnulado(ventaOriginal)) {
        alert("Este documento ya se encuentra anulado en el sistema.");
        return;
    }

    if(!confirm('⚠️ ¿Está seguro que desea ANULAR este documento?...')) return;
    
    try {
        const payloadAnulado = {
            iddeclaNIT: ventaOriginal.iddeclaNIT,
            // 🛡️ AQUÍ CORTAMOS LA FECHA PARA QUE VAYA LIMPIA
            fecha: ventaOriginal.FiscFecha ? ventaOriginal.FiscFecha.split('T')[0] : new Date().toISOString().split('T')[0],
            mesDeclarado: ventaOriginal.FiscMesDeclarado,
            anioDeclarado: ventaOriginal.FiscAnioDeclarado,
            tipoDeta: '1', 
            tipoDoc: ventaOriginal.FisTipoDoc || '03',
            uuid_dte: ventaOriginal.FiscCodGeneracion,
            desde: ventaOriginal.FiscNumDoc, 
            hasta: ventaOriginal.FiscNumDoc, 
            serie: ventaOriginal.FiscSerieDoc || '',
            resolucion: '',
            anexo: '7'
        };

        await axios.post(`${BASE_URL}/api/anulados`, payloadAnulado);
        
        // ❌ ELIMINADO EL AXIOS DELETE PARA CONSERVAR LA SECUENCIA
        alert("✅ Documento Anulado exitosamente. Ya no sumará en los reportes.");
        await cargarVentas(); 
    } catch (error) {
        alert("🚨 No se pudo completar la anulación: " + (error.response?.data?.message || error.message));
    }
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarVentas);
</script>

<style scoped>
/* ESTILOS EXACTOS Y PROBADOS */
.ventas-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }
.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }
.badge-anexo { font-size: 0.75rem; background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #e2e8f0; white-space: nowrap; }
.form-section { margin-bottom: 30px; }
.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }
.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

.uuid-input { font-family: 'Consolas', monospace; font-size: 0.85rem; background-color: #f8fafc; color: #1e3a8a; }
.select-catalogo { background-color: #f0fdfa; border-color: #99f6e4; color: #0f766e; font-weight: 600; }

.montos-wrapper { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #f3f4f6; }
.monto-group { flex: 1; min-width: 150px; }
.monto-label { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 6px; display: block; text-transform: uppercase; }
.input-wrapper { position: relative; }
.currency { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-weight: 600; font-size: 0.9rem; }
.monto-input { padding-left: 24px; font-weight: 600; text-align: right; color: #1f2937; }
.total-input { padding-left: 24px; font-weight: 800; color: #0d9488; border-color: #55C2B7; text-align: right; font-size: 1.25rem; background: #f0fdfa; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-success { background-color: #10b981; color: white; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; margin: 0 2px; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.text-danger { color: #ef4444; } .text-success { color: #10b981; } .text-primary { color: #55C2B7; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* Asignación Masiva y Filtros */
.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.filter-input { max-width: 200px; background-color: #f0fdfa; border-color: #55C2B7; font-weight: 600; color: #0f766e; }
.filter-year { max-width: 100px; font-weight: 600; }
.filter-month { max-width: 140px; font-weight: 600; }
.search-list { flex: 1; min-width: 150px; max-width: 250px; }

.bulk-action-bar { display: flex; justify-content: space-between; align-items: center; background-color: #f0fdfa; border: 1px solid #55C2B7; padding: 12px 20px; border-radius: 8px; margin-bottom: 15px; flex-wrap: wrap; gap: 15px; }
.bulk-info { display: flex; align-items: center; gap: 10px; }
.bulk-text { font-weight: 600; color: #0f766e; font-size: 0.95rem; }
.badge-success { background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; }
.bulk-controls { display: flex; align-items: center; gap: 10px; }
.form-control-sm { padding: 0.4rem 0.6rem; font-size: 0.9rem; height: auto; }
.btn-sm { padding: 0.5rem 1rem; font-size: 0.9rem; }
.d-inline { display: inline-block; }
.w-auto { width: auto; }
.row-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #55C2B7; }
.selected-row td { background-color: #f0fdfa !important; border-bottom-color: #ccfbf1; }

.dte-mask-container { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f9fafb; overflow: hidden; transition: all 0.2s; }
.dte-mask-container:focus-within { border-color: #55C2B7; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); background: white; }
.dte-prefix { background: #f3f4f6; padding: 0.6rem 0.8rem; font-size: 0.8rem; font-weight: 700; color: #55C2B7; border-right: 1px solid #e5e7eb; }
.dte-sep { padding: 0 5px; color: #9ca3af; font-weight: bold; }
.dte-part { border: none; text-align: center; padding: 0.6rem 2px; font-family: 'Courier New', monospace; font-size: 0.95rem; outline: none; background: transparent; color: #1f2937; font-weight: 600; }
.w-2ch { width: 32px; } .w-3ch { width: 44px; } .flex-grow { flex: 1; text-align: left; padding-left: 8px; }
.dte-letter { width: 30px; color: #d97706; font-weight: 800; background: #fffbeb; border-radius: 4px; margin: 2px; }
.text-xs { font-size: 0.75rem; }

/* 🛡️ NUEVO CSS PARA FILAS ANULADAS */
.is-anulado td {
    background-color: #fee2e2 !important;
    color: #991b1b !important;
    text-decoration: line-through;
    opacity: 0.7;
}
.is-anulado .doc-number::after {
    content: " (ANULADO)";
    color: #dc2626;
    font-size: 0.7rem;
    font-weight: 800;
    text-decoration: none !important;
    display: inline-block;
    margin-left: 5px;
}

@media (max-width: 768px) {
  .montos-wrapper { flex-direction: column; }
  .monto-group { width: 100%; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; }
  .history-filters { flex-direction: column; max-width: 100%; }
  .bulk-action-bar { flex-direction: column; align-items: flex-start; }
}
</style>