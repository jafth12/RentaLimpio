<template>
  <MainLayout>
    <div class="rl-view">

      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🛍️ Gestión de Compras</h1>
          <p class="rl-view-subtitle">Registra y administra tus documentos tributarios · Anexo 3</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">
          {{ mostrandoLista ? '➕ Nueva Compra' : '📋 Ver Listado' }}
        </button>
      </div>

      <div v-if="!mostrandoLista" class="rl-card rl-fade-in">

        <div class="rl-card-header" style="align-items: center;">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Compra' : '✨ Nueva Factura / CCF' }}</h2>
            <span class="rl-badge rl-badge-info rl-mt-2">
              {{ modoEdicion ? 'Modificando registro existente' : 'Ingresa los datos del documento' }}
            </span>
          </div>
          <div class="rl-toggle-switch">
             <label :class="{ 'active': formulario.modoIngreso === 'dte' }">
                <input type="radio" v-model="formulario.modoIngreso" value="dte" class="d-none"> 🌐 Electrónico
             </label>
             <label :class="{ 'active': formulario.modoIngreso === 'fisico' }">
                <input type="radio" v-model="formulario.modoIngreso" value="fisico" class="d-none"> 🖨️ Físico
             </label>
          </div>
        </div>

        <form @submit.prevent="guardarCompra">

          <div class="rl-form-section">
            <p class="rl-section-title">Datos de Identificación</p>
            <div class="rl-grid rl-grid-2">

              <div class="rl-field" :class="{ 'has-error': errores.declarante }">
                <label class="rl-label">Su Empresa (Receptor) <span class="req">*</span></label>
                <div v-if="!declaranteSeleccionado" class="rl-search-box">
                  <input type="text" v-model="busquedaDeclarante" placeholder="Buscar empresa..." class="rl-input" @focus="mostrarSugerenciasDeclarante = true">
                  <ul v-if="mostrarSugerenciasDeclarante && declarantesFiltrados.length > 0" class="rl-suggestions">
                    <li v-for="d in declarantesFiltrados" :key="d.iddeclaNIT" @click="seleccionarDeclarante(d)">
                      <span class="rl-fw-bold">{{ d.declarante }}</span>
                      <span class="rl-text-muted" style="font-size:0.75rem">{{ d.iddeclaNIT }}</span>
                    </li>
                  </ul>
                </div>
                <div v-else class="rl-selected-item">
                  <div class="rl-selected-info">
                    <span class="rl-selected-icon">🏢</span>
                    <div>
                      <div class="rl-fw-bold" style="font-size:.9rem">{{ declaranteSeleccionado.declarante }}</div>
                      <div class="rl-text-muted" style="font-size:0.75rem">{{ declaranteSeleccionado.iddeclaNIT }}</div>
                    </div>
                  </div>
                  <button type="button" @click="quitarDeclarante" class="rl-btn-text">Cambiar</button>
                </div>
                <span v-if="errores.declarante" class="rl-error-msg">⚠ Requerido</span>
              </div>

              <div class="rl-field" :class="{ 'has-error': errores.proveedor }">
                <label class="rl-label">Proveedor (Emisor) <span class="req">*</span></label>
                <div v-if="!proveedorSeleccionado" class="rl-search-box">
                  <input type="text" v-model="busqueda" placeholder="Buscar proveedor..." class="rl-input" @focus="mostrarSugerencias = true">
                  <ul v-if="mostrarSugerencias && proveedoresFiltrados.length > 0" class="rl-suggestions">
                    <li v-for="p in proveedoresFiltrados" :key="p.ProvNIT" @click="seleccionarProveedor(p)">
                      <span class="rl-fw-bold">{{ p.ProvNombre }}</span>
                      <span class="rl-text-muted" style="font-size:0.75rem">{{ p.ProvNIT }}</span>
                    </li>
                  </ul>
                </div>
                <div v-else class="rl-selected-item">
                  <div class="rl-selected-info">
                    <span class="rl-selected-icon">🚚</span>
                    <div>
                      <div class="rl-fw-bold" style="font-size:.9rem">{{ proveedorSeleccionado.ProvNombre }}</div>
                      <div class="rl-text-muted" style="font-size:0.75rem">{{ proveedorSeleccionado.ProvNIT }}</div>
                    </div>
                  </div>
                  <button type="button" @click="quitarProveedor" class="rl-btn-text">Cambiar</button>
                </div>
                <span v-if="errores.proveedor" class="rl-error-msg">⚠ Requerido</span>
              </div>

            </div>
          </div>

          <div class="rl-form-section">
            <p class="rl-section-title">Detalles del Documento Recibido</p>

            <div class="rl-grid rl-grid-3">
              <div class="rl-field">
                <label class="rl-label">Fecha Emisión <span class="req">*</span></label>
                <input type="date" v-model="formulario.fecha" class="rl-input" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Mes a Declarar <span class="req">*</span></label>
                <select v-model="formulario.mesDeclarado" class="rl-select" required>
                  <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Año <span class="req">*</span></label>
                <input type="number" v-model="formulario.anioDeclarado" class="rl-input" min="2000" required>
              </div>
            </div>

            <div class="rl-field rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'dte'">
              <label class="rl-label">Número DTE <span class="req">*</span></label>
              <div class="rl-dte-wrap" :class="{ 'has-error': errores.numero }">
                <span class="rl-dte-prefix">DTE</span>
                <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e,'part1',2)" class="rl-dte-part w2" placeholder="00">
                <span class="rl-dte-sep">–</span>
                <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="rl-dte-part letter" placeholder="S" @focus="$event.target.select()">
                <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e,'part2',3)" class="rl-dte-part w3" placeholder="000">
                <span class="rl-dte-sep">P</span>
                <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e,'part3',3)" class="rl-dte-part w3" placeholder="000">
                <span class="rl-dte-sep">–</span>
                <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e,'part4',15)" class="rl-dte-part grow" placeholder="Correlativo...">
              </div>
            </div>

            <div class="rl-grid rl-grid-2 rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'fisico'">
               <div class="rl-field" :class="{ 'has-error': errores.numero }">
                 <label class="rl-label">Número de Documento (Físico) <span class="req">*</span></label>
                 <input type="text" v-model="formulario.numero_fisico" class="rl-input" placeholder="Ej: 123456" :required="formulario.modoIngreso === 'fisico'">
               </div>
            </div>

            <div class="rl-dte-group rl-mt-3 rl-fade-in" v-if="formulario.modoIngreso === 'dte'">
              <div class="rl-field">
                <label class="rl-label" style="color:#0369a1">🔑 Código UUID (con guiones)</label>
                <input type="text" v-model="formulario.uuid_dte" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX">
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 202542266B0EFC5743...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos</span>
              </div>
            </div>

            <div class="rl-grid rl-grid-3 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Clase</label>
                <select v-model="formulario.claseDocumento" class="rl-select">
                  <option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Tipo</label>
                <select v-model="formulario.tipoDocumento" class="rl-select">
                  <option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Operación</label>
                <select v-model="formulario.tipoOperacion" class="rl-select">
                  <option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Clasificación</label>
                <select v-model="formulario.clasificacion" class="rl-select">
                  <option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Sector</label>
                <select v-model="formulario.sector" class="rl-select">
                  <option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Costo / Gasto</label>
                <select v-model="formulario.tipoCostoGasto" class="rl-select">
                  <option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Montos y Totales</p>
            <div class="rl-montos">
              <div class="rl-monto-item">
                <span class="rl-monto-label">Compras Gravadas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.internasGravadas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('internasGravadas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label">Compras Exentas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.internasExentas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('internasExentas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label" style="color:#059669">13% IVA · Créd. Fiscal</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#059669">+</span>
                  <input type="number" v-model="formulario.iva" step="0.01" class="rl-input rl-input-monto" style="color:#059669" @input="calcularTotalGeneral" @blur="formatearDecimal('iva')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label" style="color:#d97706" title="Recargo por combustible u otros">Otros Montos (Comb.)</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#d97706">+</span>
                  <input type="number" v-model="formulario.otroAtributo" step="0.01" class="rl-input rl-input-monto" style="color:#d97706" @input="calcularTotalGeneral" @blur="formatearDecimal('otroAtributo')">
                </div>
              </div>
              <div class="rl-monto-item is-total">
                <span class="rl-monto-label" title="Gravadas + Exentas + IVA + Otros">TOTAL FACTURA</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#0d9488">$</span>
                  <input type="number" v-model="formulario.total" step="0.01" class="rl-input rl-input-total" readonly>
                </div>
              </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '✔ Actualizar Compra' : '💾 Guardar Compra') }}
            </button>
          </div>

          <div v-if="mensaje" class="rl-alert" :class="tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger'">
            {{ mensaje }}
          </div>

        </form>
      </div>

      <div v-else class="rl-card rl-fade-in">

        <div class="rl-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <h3>📋 Historial de Compras</h3>
            <span class="rl-badge rl-badge-count">{{ comprasFiltradas.length }} documentos</span>
          </div>
          <div class="rl-filters">
            <input type="number" v-model="anioFiltro" placeholder="Año" min="2000" class="rl-input rl-filter-sm" title="Filtrar por año">
            <select v-model="mesFiltro" class="rl-select rl-filter-md">
              <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
            </select>
            <input type="text" v-model="declaranteFiltro" list="lista-decla-compras" placeholder="🏢 Empresa..." class="rl-input rl-filter-md">
            <datalist id="lista-decla-compras">
              <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
            </datalist>
            <input type="text" v-model="filtroLista" placeholder="🔍 DTE / Proveedor..." class="rl-input rl-filter-search">
          </div>
        </div>

        <div v-if="seleccionados.length > 0" class="rl-bulk-bar">
          <div class="rl-bulk-info">
            <span class="rl-badge rl-badge-success">{{ seleccionados.length }} seleccionados</span>
            Asignar para declarar en:
          </div>
          <div class="rl-bulk-controls">
            <select v-model="bulkMes" class="rl-select" style="width:auto">
              <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
            </select>
            <input type="number" v-model="bulkAnio" class="rl-input" style="width:80px">
            <button class="rl-btn rl-btn-primary rl-btn-sm" @click="aplicarCambioMasivo" :disabled="cargandoMasivo">
              {{ cargandoMasivo ? 'Aplicando...' : '💾 Mover Facturas' }}
            </button>
          </div>
        </div>

        <div class="rl-table-wrap">
          <table class="rl-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">
                  <input type="checkbox" @change="toggleAll" :checked="comprasFiltradas.length > 0 && seleccionados.length === comprasFiltradas.length" class="rl-checkbox">
                </th>
                <th>Fecha</th>
                <th>Clase</th>
                <th>Proveedor</th>
                <th>Documento CCF</th>
                <th class="rl-text-right">Total</th>
                <th class="rl-text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in comprasFiltradas" :key="c.idcompras"
                  :class="{ 'is-selected': seleccionados.includes(c.idcompras), 'is-anulado': esAnulado(c) }">
                <td class="rl-text-center">
                  <input type="checkbox" :value="c.idcompras" v-model="seleccionados" class="rl-checkbox">
                </td>
                <td>
                  <div class="rl-fw-bold">{{ formatearFecha(c.ComFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong class="rl-text-primary">{{ c.ComMesDeclarado }}</strong></small>
                </td>
                <td>
                  <span class="rl-badge rl-badge-type" :class="c.ComClase === '4' ? 'blue' : 'orange'">
                    {{ c.ComClase === '4' ? 'DTE' : 'Físico' }}
                  </span>
                </td>
                <td>
                  <div class="rl-fw-bold">{{ c.ComNomProve }}</div>
                  <small class="rl-text-muted">{{ c.proveedor_ProvNIT }}</small>
                </td>
                <td>
                  <span class="rl-doc-number" :title="c.ComCodGeneracion || 'N/A'">{{ c.ComNumero }}</span>
                  <div v-if="c.ComSelloRecepcion" class="rl-badge-sello-mh" :title="c.ComSelloRecepcion">✔️ Sello MH</div>
                </td>
                <td class="rl-text-right rl-fw-bold rl-text-success">${{ parseFloat(c.ComTotal || 0).toFixed(2) }}</td>
                <td class="rl-text-center">
                  <button class="rl-btn-icon" @click="prepararEdicion(c)" title="Editar">✏️</button>
                  <button class="rl-btn-icon rl-text-danger" v-if="rolActual === 'admin'" @click="eliminarCompra(c.idcompras)" title="Eliminar">🗑️</button>
                  <button class="rl-btn-icon" @click="anularDocumento(c)" title="Anular Documento" style="color:#d97706">🚫</button>
                </td>
              </tr>
              <tr v-if="comprasFiltradas.length === 0">
                <td colspan="7" class="rl-empty-state">No se encontraron registros para estos filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue'
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; 

const router = useRouter();
const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_PROVEEDORES = BASE_URL + '/api/proveedores';
const API_COMPRAS = BASE_URL + '/api/compras';
const API_DECLARANTES = BASE_URL + '/api/declarantes'; 

const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO", "12. DECLARACION DE MERCANCIAS"];
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES", "0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES"];
const opcionesClasificacion = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. COSTO", "2. GASTO", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesSector = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. INDUSTRIA", "2. COMERCIO", "3. AGROPECURIA", "4. SERVICIOS PROFESIONES, ARTES Y OFICIOS", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXEPCIONES"];
const opcionesCostoGasto = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. GASTO DE VENTA SIN DONACION", "2. GASTO DE ADMINISTRACION SIN DONACION", "3. GASTOS FINANCIEROS SIN DONACION", "4. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS/IMPORTACIONES", "5. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS INTERNO", "6. COSTOS INDIRECTOS DE FABRICACION", "7. MANO DE OBRA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });

const formulario = ref({ 
    modoIngreso: 'dte', // 🛡️ Controla el Switch
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    numero_control: '', 
    numero_fisico: '', // 🛡️ Almacena el número físico
    uuid_dte: '',
    sello_recepcion: '', 
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', 
    tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00',
    iva: '0.00', otroAtributo: '0.00', total: '0.00'
});

const errores = ref({ proveedor: false, declarante: false, fecha: false, numero: false, internas: false });
const todosLosProveedores = ref([]);
const todosLosDeclarantes = ref([]);
const listaCompras = ref([]);
const listaAnuladosGlobal = ref([]); 
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const mostrandoLista = ref(true); 
const modoEdicion = ref(false);    
const idEdicion = ref(null);       

// 🛡️ WATCHER: Ajusta la clase de documento al cambiar el switch
watch(() => formulario.value.modoIngreso, (newVal) => {
    if (newVal === 'dte') {
        formulario.value.claseDocumento = "4. DOCUMENTO TRIBUTARIO DTE";
    } else {
        if (formulario.value.claseDocumento.startsWith('4')) {
            formulario.value.claseDocumento = "1. IMPRESO POR IMPRENTA O TIQUETES";
        }
    }
});

watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

const seleccionados = ref([]);
const bulkMes = ref(mesesOptions[new Date().getMonth()]);
const bulkAnio = ref(new Date().getFullYear().toString());
const cargandoMasivo = ref(false);

const toggleAll = (e) => {
    if (e.target.checked) {
        seleccionados.value = comprasFiltradas.value.map(c => c.idcompras);
    } else {
        seleccionados.value = [];
    }
};

const aplicarCambioMasivo = async () => {
    if (!confirm(`¿Mover ${seleccionados.value.length} documentos al libro de ${bulkMes.value} ${bulkAnio.value}?`)) return;

    cargandoMasivo.value = true;
    try {
        const promesas = seleccionados.value.map(id => {
            const compraOri = listaCompras.value.find(c => c.idcompras === id);
            if (!compraOri) return Promise.resolve();

            const payload = {
                iddeclaNIT: compraOri.iddeclaNIT,
                ComFecha: compraOri.ComFecha ? compraOri.ComFecha.split('T')[0] : null,
                ComMesDeclarado: bulkMes.value,
                ComAnioDeclarado: bulkAnio.value,
                ComClase: compraOri.ComClase,
                ComTipo: compraOri.ComTipo,
                ComNumero: compraOri.ComNumero,
                ComCodGeneracion: compraOri.ComCodGeneracion,
                ComSelloRecepcion: compraOri.ComSelloRecepcion, 
                proveedor_ProvNIT: compraOri.proveedor_ProvNIT,
                ComNomProve: compraOri.ComNomProve,
                ComIntExe: compraOri.ComIntExe,
                ComInternacioExe: compraOri.ComInternacioExe,
                ComImpExeNoSujetas: compraOri.ComImpExeNoSujetas,
                ComIntGrav: compraOri.ComIntGrav,
                ComInternacGravBienes: compraOri.ComInternacGravBienes,
                ComImportGravBienes: compraOri.ComImportGravBienes,
                ComImportGravServicios: compraOri.ComImportGravServicios,
                ComCredFiscal: compraOri.ComCredFiscal,
                ComOtroAtributo: compraOri.ComOtroAtributo,
                ComTotal: compraOri.ComTotal,
                ComClasiRenta: compraOri.ComClasiRenta,
                ComTipoCostoGasto: compraOri.ComTipoCostoGasto,
                ComTipoOpeRenta: compraOri.ComTipoOpeRenta,
                ComSecNum: compraOri.ComSecNum
            };
            return axios.put(`${API_COMPRAS}/${id}`, payload);
        });

        await Promise.all(promesas);
        alert(`✅ ${seleccionados.value.length} documentos asignados a ${bulkMes.value} ${bulkAnio.value}`);
        seleccionados.value = [];
        await cargarDatos();
    } catch (error) {
        console.error("Error masivo:", error);
        alert("🚨 Ocurrió un error al mover los documentos. Recargue la página e intente de nuevo.");
    } finally {
        cargandoMasivo.value = false;
    }
};

const mesesFiltroOptions = [
  { nombre: 'Todos los Meses', valor: '' },
  { nombre: 'Enero', valor: 'Enero' }, { nombre: 'Febrero', valor: 'Febrero' }, { nombre: 'Marzo', valor: 'Marzo' },
  { nombre: 'Abril', valor: 'Abril' }, { nombre: 'Mayo', valor: 'Mayo' }, { nombre: 'Junio', valor: 'Junio' },
  { nombre: 'Julio', valor: 'Julio' }, { nombre: 'Agosto', valor: 'Agosto' }, { nombre: 'Septiembre', valor: 'Septiembre' },
  { nombre: 'Octubre', valor: 'Octubre' }, { nombre: 'Noviembre', valor: 'Noviembre' }, { nombre: 'Diciembre', valor: 'Diciembre' }
];

const anioFiltro = ref(new Date().getFullYear().toString());
const mesFiltro = ref(''); 
const filtroLista = ref(''); 
const declaranteFiltro = ref(''); 

const busqueda = ref('');
const proveedorSeleccionado = ref(null);
const mostrarSugerencias = ref(false);
const busquedaDeclarante = ref('');
const declaranteSeleccionado = ref(null);
const mostrarSugerenciasDeclarante = ref(false);

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

const extraerSoloCodigo = (t) => t ? t.split(/[\.\s]+/)[0] : '';
const recuperarOpcionCompleta = (c, l) => { if (!c) return l[0]; const enc = l.find(op => op.split(/[\.\s]+/)[0] == String(c).trim()); return enc || c; };

const calcularTotalGeneral = () => {
    const baseGravada = (parseFloat(formulario.value.internasGravadas) || 0) + (parseFloat(formulario.value.internacionalesGravBienes) || 0) + (parseFloat(formulario.value.importacionesGravBienes) || 0) + (parseFloat(formulario.value.importacionesGravServicios) || 0);
    const sumExentas = (parseFloat(formulario.value.internasExentas) || 0) + (parseFloat(formulario.value.internacionalesExentas) || 0) + (parseFloat(formulario.value.importacionesNoSujetas) || 0);
    const iva = parseFloat(formulario.value.iva) || 0;
    const otrosMontos = parseFloat(formulario.value.otroAtributo) || 0;
    
    formulario.value.total = (baseGravada + sumExentas + iva + otrosMontos).toFixed(2);
};

watch(() => [formulario.value.internasGravadas, formulario.value.internacionalesGravBienes, formulario.value.importacionesGravBienes, formulario.value.importacionesGravServicios], (vals) => {
    const [intG, intlG, impG, impS] = vals.map(v => parseFloat(v) || 0);
    const baseGravada = intG + intlG + impG + impS;
    
    formulario.value.iva = (baseGravada * 0.13).toFixed(2);
    
    if(intG > 0) errores.value.internas = false;
    calcularTotalGeneral();
});

watch(() => [formulario.value.internasExentas, formulario.value.internacionalesExentas, formulario.value.importacionesNoSujetas, formulario.value.otroAtributo], () => { 
    calcularTotalGeneral(); 
});

const formatearDecimal = (c) => { const v = parseFloat(formulario.value[c]); formulario.value[c] = !isNaN(v) ? v.toFixed(2) : '0.00'; };

const proveedoresFiltrados = computed(() => {
  if (!busqueda.value || !todosLosProveedores.value) return [];
  const txt = busqueda.value.toLowerCase().trim();
  return todosLosProveedores.value.filter(p => p && (String(p.ProvNombre || '').toLowerCase().includes(txt) || String(p.ProvNIT || '').includes(txt)));
});

const declarantesFiltrados = computed(() => { 
  if (!busquedaDeclarante.value || !todosLosDeclarantes.value) return [];
  const txt = busquedaDeclarante.value.toLowerCase().trim();
  return todosLosDeclarantes.value.filter(d => d && (String(d.declarante || '').toLowerCase().includes(txt) || String(d.iddeclaNIT || '').includes(txt)));
});

const comprasFiltradas = computed(() => {
  let filtrado = listaCompras.value || [];
  
  if (declaranteFiltro.value) { 
      filtrado = filtrado.filter(c => c.iddeclaNIT === declaranteFiltro.value); 
  }
  
  if (anioFiltro.value) { 
      const anioStr = anioFiltro.value.toString(); 
      filtrado = filtrado.filter(c => String(c.ComAnioDeclarado) === anioStr || (c.ComFecha && c.ComFecha.startsWith(anioStr))); 
  }
  
  if (mesFiltro.value) { 
      filtrado = filtrado.filter(c => c.ComMesDeclarado === mesFiltro.value); 
  }
  
  if (filtroLista.value) { 
      const txt = filtroLista.value.toLowerCase().trim(); 
      filtrado = filtrado.filter(c => c && (String(c.ComNomProve || '').toLowerCase().includes(txt) || String(c.ComNumero || '').toLowerCase().includes(txt))); 
  }
  return filtrado;
});

const alternarVista = () => { if (modoEdicion.value) { cancelarEdicion(); } else { resetForm(); mostrandoLista.value = !mostrandoLista.value; } };

const seleccionarProveedor = (p) => { proveedorSeleccionado.value = p; mostrarSugerencias.value = false; busqueda.value = ''; errores.value.proveedor = false; };
const quitarProveedor = () => proveedorSeleccionado.value = null;
const seleccionarDeclarante = (d) => { declaranteSeleccionado.value = d; mostrarSugerenciasDeclarante.value = false; busquedaDeclarante.value = ''; errores.value.declarante = false; };
const quitarDeclarante = () => declaranteSeleccionado.value = null;

const prepararEdicion = (compra) => {
  let fSegura = compra.ComFecha ? new Date(compra.ComFecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const rawNum = compra.ComNumero || '';
  const esDTE = compra.ComClase === '4';

  if (esDTE) {
      const cleanNumero = rawNum.replace(/-/g, '');
      const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
      const match = cleanNumero.match(regex);
      ccfParts.value = match ? { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
  } else {
      ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
  }

  formulario.value = {
    modoIngreso: esDTE ? 'dte' : 'fisico', // 🛡️ Asigna Switch
    fecha: fSegura, 
    mesDeclarado: compra.ComMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
    anioDeclarado: compra.ComAnioDeclarado || fSegura.substring(0,4),
    numero_control: esDTE ? rawNum : '', 
    numero_fisico: esDTE ? '' : rawNum, // 🛡️ Asigna número al campo correspondiente
    uuid_dte: compra.ComCodGeneracion || '',
    sello_recepcion: compra.ComSelloRecepcion || '', 
    claseDocumento: recuperarOpcionCompleta(compra.ComClase, opcionesClase), 
    tipoDocumento: recuperarOpcionCompleta(compra.ComTipo, opcionesTipo),
    tipoOperacion: recuperarOpcionCompleta(compra.ComTipoOpeRenta, opcionesOperacion), 
    clasificacion: recuperarOpcionCompleta(compra.ComClasiRenta, opcionesClasificacion), 
    sector: recuperarOpcionCompleta(compra.ComSecNum, opcionesSector), 
    tipoCostoGasto: recuperarOpcionCompleta(compra.ComTipoCostoGasto, opcionesCostoGasto),
    internasGravadas: parseFloat(compra.ComIntGrav || 0).toFixed(2), 
    internacionalesGravBienes: parseFloat(compra.ComInternacGravBienes || 0).toFixed(2), 
    importacionesGravBienes: parseFloat(compra.ComImportGravBienes || 0).toFixed(2), 
    importacionesGravServicios: parseFloat(compra.ComImportGravServicios || 0).toFixed(2),
    internasExentas: parseFloat(compra.ComIntExe || 0).toFixed(2), 
    internacionalesExentas: parseFloat(compra.ComInternacioExe || 0).toFixed(2), 
    importacionesNoSujetas: parseFloat(compra.ComImpExeNoSujetas || 0).toFixed(2),
    iva: parseFloat(compra.ComCredFiscal || 0).toFixed(2), 
    otroAtributo: parseFloat(compra.ComOtroAtributo || 0).toFixed(2), 
    total: parseFloat(compra.ComTotal || 0).toFixed(2)
  };
  
  const prov = todosLosProveedores.value.find(p => p.ProvNIT === compra.proveedor_ProvNIT);
  proveedorSeleccionado.value = prov || { ProvNIT: compra.proveedor_ProvNIT, ProvNombre: compra.ComNomProve || 'Histórico' };
  
  if (compra.iddeclaNIT) {
      const dec = todosLosDeclarantes.value.find(d => d.iddeclaNIT === compra.iddeclaNIT);
      declaranteSeleccionado.value = dec || { iddeclaNIT: compra.iddeclaNIT, declarante: 'Histórico' };
  } else declaranteSeleccionado.value = null;

  errores.value = { proveedor: false, declarante: false, fecha: false, numero: false, internas: false };
  idEdicion.value = compra.idcompras; 
  modoEdicion.value = true; 
  mostrandoLista.value = false; 
};

const cancelarEdicion = () => { resetForm(); modoEdicion.value = false; idEdicion.value = null; mostrandoLista.value = true; };

const resetForm = () => {
  formulario.value.modoIngreso = 'dte'; 
  formulario.value.fecha = new Date().toISOString().split('T')[0];
  formulario.value.mesDeclarado = mesesOptions[new Date().getMonth()];
  formulario.value.anioDeclarado = new Date().getFullYear().toString();
  formulario.value.numero_control = ''; 
  formulario.value.numero_fisico = '';
  formulario.value.uuid_dte = '';
  formulario.value.sello_recepcion = ''; 
  
  formulario.value.claseDocumento = '4. DOCUMENTO TRIBUTARIO DTE';
  formulario.value.tipoDocumento = '03 COMPROBANTE DE CREDITO FISCAL';
  formulario.value.tipoOperacion = '1. GRAVADA';
  formulario.value.clasificacion = '2. GASTO';
  formulario.value.sector = '2. COMERCIO';
  formulario.value.tipoCostoGasto = '2. GASTO DE ADMINISTRACION SIN DONACION';

  formulario.value.internasGravadas = '0.00'; 
  formulario.value.total = '0.00'; 
  formulario.value.iva = '0.00'; 
  formulario.value.internasExentas = '0.00'; 
  formulario.value.otroAtributo = '0.00';
  
  ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
  proveedorSeleccionado.value = null; 
  declaranteSeleccionado.value = null;
  errores.value = { proveedor: false, declarante: false, fecha: false, numero: false, internas: false };
};

const cargarDatos = async () => {
  try {
    const [resP, resD, resC, resA] = await Promise.all([
        axios.get(API_PROVEEDORES), 
        axios.get(API_DECLARANTES), 
        axios.get(API_COMPRAS, { params: { nit: declaranteFiltro.value || undefined, mes: mesFiltro.value || undefined, anio: anioFiltro.value || undefined } }),
        axios.get(`${BASE_URL}/api/anulados`)
    ]);
    todosLosProveedores.value = resP.data; 
    todosLosDeclarantes.value = resD.data; 
    listaCompras.value = resC.data;
    listaAnuladosGlobal.value = resA.data || [];
  } catch (error) { console.error("Error", error); }
};

const esAnulado = (doc) => {
    const dte = doc.ComNumero;
    const uuid = doc.ComCodGeneracion;
    return listaAnuladosGlobal.value.some(a => 
        a.iddeclaNIT === doc.iddeclaNIT && 
        (a.DetaDocDesde === dte || a.DetaDocCodGeneracion === (uuid ? uuid.replace(/-/g, '') : ''))
    );
};

const anularDocumento = async (compraOriginal) => {
    if(esAnulado(compraOriginal)) {
        alert("Este documento ya se encuentra anulado en el sistema.");
        return;
    }

    if(!confirm('⚠️ ¿Está seguro que desea ANULAR esta compra?\nSe marcará como inoperante en pantalla y se excluirá de los reportes a Hacienda.')) return;
    
    try {
        const payloadAnulado = {
            iddeclaNIT: compraOriginal.iddeclaNIT,
            fecha: compraOriginal.ComFecha ? compraOriginal.ComFecha.split('T')[0] : new Date().toISOString().split('T')[0],
            mesDeclarado: compraOriginal.ComMesDeclarado,
            anioDeclarado: compraOriginal.ComAnioDeclarado,
            tipoDeta: '1', 
            tipoDoc: '03',
            uuid_dte: compraOriginal.ComCodGeneracion || '',
            sello_recepcion: compraOriginal.ComSelloRecepcion || '', 
            desde: compraOriginal.ComNumero || '', 
            hasta: compraOriginal.ComNumero || '', 
            serie: '',
            resolucion: '',
            anexo: '7'
        };

        await axios.post(`${BASE_URL}/api/anulados`, payloadAnulado);
        
        alert("✅ Documento de Compra Anulado exitosamente.");
        await cargarDatos(); 
    } catch (error) {
        alert("🚨 No se pudo completar la anulación: " + (error.response?.data?.message || error.message));
    }
};

const guardarCompra = async () => {
  if (formulario.value.modoIngreso === 'dte') actualizarNumeroCompleto(); 
  
  // 🛡️ Determina qué número usar
  const numeroFinal = formulario.value.modoIngreso === 'dte' ? formulario.value.numero_control : formulario.value.numero_fisico;

  errores.value.proveedor = !proveedorSeleccionado.value;
  errores.value.declarante = !declaranteSeleccionado.value;
  errores.value.fecha = !formulario.value.fecha;
  errores.value.numero = !numeroFinal; 
  errores.value.internas = formulario.value.internasGravadas === '' || parseFloat(formulario.value.internasGravadas) < 0;

  if (Object.values(errores.value).some(v => v)) { alert("Complete los campos obligatorios."); return; }

  cargando.value = true;

  // 🛡️ Asegura que la clase se envía correctamente al backend
  const claseDocFinal = formulario.value.modoIngreso === 'dte' ? '4' : (extraerSoloCodigo(formulario.value.claseDocumento) === '4' ? '1' : extraerSoloCodigo(formulario.value.claseDocumento));

  const payload = { 
      ComFecha: formulario.value.fecha,
      ComMesDeclarado: formulario.value.mesDeclarado,
      ComAnioDeclarado: formulario.value.anioDeclarado,
      ComNumero: numeroFinal, // Guarda el número según modo
      ComCodGeneracion: formulario.value.modoIngreso === 'dte' ? formulario.value.uuid_dte : null,
      ComSelloRecepcion: formulario.value.modoIngreso === 'dte' ? formulario.value.sello_recepcion : null, 
      ComClase: claseDocFinal,
      ComTipo: extraerSoloCodigo(formulario.value.tipoDocumento),
      ComTipoOpeRenta: extraerSoloCodigo(formulario.value.tipoOperacion),
      ComClasiRenta: extraerSoloCodigo(formulario.value.clasificacion),
      ComSecNum: extraerSoloCodigo(formulario.value.sector),
      ComTipoCostoGasto: extraerSoloCodigo(formulario.value.tipoCostoGasto),
      proveedor_ProvNIT: proveedorSeleccionado.value.ProvNIT,
      ComNomProve: proveedorSeleccionado.value.ProvNombre,
      iddeclaNIT: declaranteSeleccionado.value.iddeclaNIT,
      ComIntGrav: parseFloat(formulario.value.internasGravadas) || 0,
      ComInternacGravBienes: parseFloat(formulario.value.internacionalesGravBienes) || 0,
      ComImportGravBienes: parseFloat(formulario.value.importacionesGravBienes) || 0,
      ComImportGravServicios: parseFloat(formulario.value.importacionesGravServicios) || 0,
      ComIntExe: parseFloat(formulario.value.internasExentas) || 0,
      ComInternacioExe: parseFloat(formulario.value.internacionalesExentas) || 0,
      ComImpExeNoSujetas: parseFloat(formulario.value.importacionesNoSujetas) || 0,
      ComCredFiscal: parseFloat(formulario.value.iva) || 0,
      ComOtroAtributo: parseFloat(formulario.value.otroAtributo) || 0, 
      ComTotal: parseFloat(formulario.value.total) || 0,
      ComAnexo: '3'
  };

  try {
    if (modoEdicion.value) await axios.put(`${API_COMPRAS}/${idEdicion.value}`, payload);
    else await axios.post(API_COMPRAS, payload);
    mensaje.value = modoEdicion.value ? '¡Actualizado!' : '¡Guardado con éxito!'; tipoMensaje.value = 'success';
    await cargarDatos(); 
    setTimeout(() => { mensaje.value = ''; resetForm(); mostrandoLista.value = true; }, 1500);
  } catch (error) { tipoMensaje.value = 'error'; mensaje.value = error.response?.data?.message || 'Error al guardar'; } 
  finally { cargando.value = false; }
};

const eliminarCompra = async (id) => { if(confirm('¿Eliminar registro?')) { try { await axios.delete(`${API_COMPRAS}/${id}`); await cargarDatos(); } catch (e) { alert('Error'); } } };
const formatearFecha = (f) => f ? new Date(f).toLocaleDateString('es-SV', { timeZone: 'UTC' }) : '---';


// 🛡️ Recargar datos del backend cuando cambian los filtros principales
watch([declaranteFiltro, mesFiltro, anioFiltro], () => {
    cargarDatos();
});

onMounted(cargarDatos);
</script>

<style scoped>
/* Estilos específicos de ComprasView — la base viene de assets/forms.css */
.error-border { border-color: var(--red-500) !important; }
</style>