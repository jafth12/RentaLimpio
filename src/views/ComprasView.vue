<template>
  <MainLayout>
    <div class="compras-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🛍️ Gestión de Compras</h1>
          <p class="subtitle">Registra y administra tus documentos tributarios</p>
        </div>
        
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nueva Compra' : '📋 Ver Listado' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Compra' : '✨ Nueva Factura / CCF' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Modificando registro existente' : 'Ingresa los datos del documento' }}</span>
          </div>

          <form @submit.prevent="guardarCompra" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">👤 Datos de Identificación</h3>
              
              <div class="form-grid">
                <div class="form-group" :class="{ 'has-error': errores.declarante }">
                  <label class="form-label">Su Empresa (Receptor) <span class="text-danger">*</span></label>
                  
                  <div v-if="!declaranteSeleccionado" class="search-box">
                    <input type="text" v-model="busquedaDeclarante" placeholder="🔍 Buscar empresa..." class="form-control" @focus="mostrarSugerenciasDeclarante = true">
                    <ul v-if="mostrarSugerenciasDeclarante && declarantesFiltrados.length > 0" class="suggestions-list">
                      <li v-for="d in declarantesFiltrados" :key="d.iddeclaNIT" @click="seleccionarDeclarante(d)">
                        <span class="font-bold">{{ d.declarante }}</span>
                        <span class="text-xs text-muted">{{ d.iddeclaNIT }}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div v-else class="selected-item">
                    <div class="selected-info">
                      <span class="icon">🏢</span>
                      <div>
                        <strong>{{ declaranteSeleccionado.declarante }}</strong>
                        <small>{{ declaranteSeleccionado.iddeclaNIT }}</small>
                      </div>
                    </div>
                    <button type="button" @click="quitarDeclarante" class="btn-text text-danger">Cambiar</button>
                  </div>
                  <span v-if="errores.declarante" class="error-msg">Requerido</span>
                </div>

                <div class="form-group" :class="{ 'has-error': errores.proveedor }">
                  <label class="form-label">Proveedor (Emisor) <span class="text-danger">*</span></label>
                  
                  <div v-if="!proveedorSeleccionado" class="search-box">
                    <input type="text" v-model="busqueda" placeholder="🔍 Buscar proveedor..." class="form-control" @focus="mostrarSugerencias = true">
                    <ul v-if="mostrarSugerencias && proveedoresFiltrados.length > 0" class="suggestions-list">
                      <li v-for="p in proveedoresFiltrados" :key="p.ProvNIT" @click="seleccionarProveedor(p)">
                        <span class="font-bold">{{ p.ProvNombre }}</span>
                        <span class="text-xs text-muted">{{ p.ProvNIT }}</span>
                      </li>
                    </ul>
                  </div>

                  <div v-else class="selected-item">
                    <div class="selected-info">
                      <span class="icon">🚚</span>
                      <div>
                        <strong>{{ proveedorSeleccionado.ProvNombre }}</strong>
                        <small>{{ proveedorSeleccionado.ProvNIT }}</small>
                      </div>
                    </div>
                    <button type="button" @click="quitarProveedor" class="btn-text text-danger">Cambiar</button>
                  </div>
                  <span v-if="errores.proveedor" class="error-msg">Requerido</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">📄 Detalles del Documento Recibido</h3>
              
              <div class="form-grid four-cols">
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

                <div class="form-group">
                  <label class="form-label">Código (UUID) <span class="text-danger">*</span></label>
                   <input type="text" v-model="formulario.uuid_dte" class="form-control uuid-input" placeholder="XXXXXXXX-XXXX..." required>
                </div>
              </div>

              <div class="form-group mt-3">
                 <label class="form-label">Número CCF (DTE) <span class="text-danger">*</span></label>
                 <div class="dte-mask-container" :class="{ 'input-error': errores.numero }">
                    <span class="dte-prefix">DTE</span>
                    <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e, 'part1', 2)" class="dte-part w-2ch" placeholder="00">
                    <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="dte-part dte-letter" placeholder="S" @focus="$event.target.select()">
                    <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e, 'part2', 3)" class="dte-part w-3ch" placeholder="000">
                    <span class="dte-sep">P</span>
                    <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e, 'part3', 3)" class="dte-part w-3ch" placeholder="000">
                    <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e, 'part4', 15)" class="dte-part flex-grow" placeholder="Correlativo...">
                 </div>
              </div>

              <div class="form-grid three-cols mt-3">
                 <div class="form-group"><label class="form-label">Clase</label><select v-model="formulario.claseDocumento" class="form-control"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Tipo</label><select v-model="formulario.tipoDocumento" class="form-control"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Operación</label><select v-model="formulario.tipoOperacion" class="form-control"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
                 
                 <div class="form-group"><label class="form-label">Clasificación</label><select v-model="formulario.clasificacion" class="form-control"><option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Sector</label><select v-model="formulario.sector" class="form-control"><option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Costo/Gasto</label><select v-model="formulario.tipoCostoGasto" class="form-control"><option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option></select></div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">💰 Montos y Totales</h3>
              
              <div class="montos-wrapper">
                <div class="monto-group">
                  <label class="monto-label">Compras Gravadas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.internasGravadas" step="0.01" class="form-control monto-input" @blur="formatearDecimal('internasGravadas')">
                  </div>
                </div>

                <div class="monto-group">
                  <label class="monto-label">Compras Exentas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.internasExentas" step="0.01" class="form-control monto-input" @blur="formatearDecimal('internasExentas')">
                  </div>
                </div>

                <div class="monto-group">
                  <label class="monto-label text-success">13% IVA (Créd. Fiscal)</label>
                  <div class="input-wrapper">
                    <span class="currency text-success">+</span>
                    <input type="number" v-model="formulario.iva" step="0.01" class="form-control monto-input text-success" @input="calcularTotalGeneral" @blur="formatearDecimal('iva')">
                  </div>
                </div>

                <div class="monto-group">
                  <label class="monto-label text-warning" title="Ingresa el total de recargo por combustible">Otros Montos (Combustible)</label>
                  <div class="input-wrapper">
                    <span class="currency text-warning">+</span>
                    <input type="number" v-model="formulario.otroAtributo" step="0.01" class="form-control monto-input text-warning" @input="calcularTotalGeneral" @blur="formatearDecimal('otroAtributo')">
                  </div>
                </div>

                <div class="monto-group total-group" style="flex: 100%;">
                  <label class="monto-label" title="Suma Gravadas + Exentas + IVA + Otros Montos">TOTAL FACTURA</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" v-model="formulario.total" step="0.01" class="form-control total-input" readonly>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Compra' : '💾 Guardar Compra') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Compras</h3>
             
             <div class="history-filters">
                <input type="number" v-model="anioFiltro" placeholder="Año" min="2000" class="form-control filter-year" title="Escribe el año">

                <select v-model="mesFiltro" class="form-control filter-month">
                  <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
                </select>

                <input type="text" v-model="declaranteFiltro" list="lista-decla-compras" placeholder="🏢 Empresa..." class="form-control filter-input">
                <datalist id="lista-decla-compras">
                   <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </datalist>

                <input type="text" v-model="filtroLista" placeholder="🔍 DTE / Prov..." class="form-control search-list">
             </div>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Anexo</th>
                  <th>Proveedor</th>
                  <th>Documento CCF</th>
                  <th class="text-right">Total</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in comprasFiltradas" :key="c.idcompras">
                  <td>{{ formatearFecha(c.ComFecha) }}</td>
                  <td><span class="badge-anexo">Anexo 3</span></td>
                  <td>
                    <div class="fw-bold text-dark">{{ c.ComNomProve }}</div>
                    <small class="text-muted">{{ c.proveedor_ProvNIT }}</small>
                  </td>
                  <td>
                    <span class="doc-number">{{ c.ComNumero }}</span>
                  </td>
                  <td class="text-right fw-bold text-success">${{ parseFloat(c.ComTotal || 0).toFixed(2) }}</td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(c)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" v-if="rolActual === 'admin'" @click="eliminarCompra(c.idcompras)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="comprasFiltradas.length === 0">
                  <td colspan="6" class="text-center py-4 text-muted">No se encontraron registros para estos filtros.</td>
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

// Se eliminaron las variables fovial y cotrans del formulario
const formulario = ref({ 
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    numero_control: '', 
    uuid_dte: '',
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00',
    iva: '0.00', otroAtributo: '0.00', total: '0.00'
});

const errores = ref({ proveedor: false, declarante: false, fecha: false, numero: false, internas: false });
const todosLosProveedores = ref([]);
const todosLosDeclarantes = ref([]);
const listaCompras = ref([]);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const mostrandoLista = ref(true); 
const modoEdicion = ref(false);    
const idEdicion = ref(null);       

const mesesFiltroOptions = [
  { nombre: 'Todos los Meses', valor: '' },
  { nombre: 'Enero', valor: '01' }, { nombre: 'Febrero', valor: '02' }, { nombre: 'Marzo', valor: '03' },
  { nombre: 'Abril', valor: '04' }, { nombre: 'Mayo', valor: '05' }, { nombre: 'Junio', valor: '06' },
  { nombre: 'Julio', valor: '07' }, { nombre: 'Agosto', valor: '08' }, { nombre: 'Septiembre', valor: '09' },
  { nombre: 'Octubre', valor: '10' }, { nombre: 'Noviembre', valor: '11' }, { nombre: 'Diciembre', valor: '12' }
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

// 🎯 Calcula el TOTAL sumando TODAS las partes (Gravadas + Exentas + IVA + Otros Montos)
const calcularTotalGeneral = () => {
    const baseGravada = (parseFloat(formulario.value.internasGravadas) || 0) + (parseFloat(formulario.value.internacionalesGravBienes) || 0) + (parseFloat(formulario.value.importacionesGravBienes) || 0) + (parseFloat(formulario.value.importacionesGravServicios) || 0);
    const sumExentas = (parseFloat(formulario.value.internasExentas) || 0) + (parseFloat(formulario.value.internacionalesExentas) || 0) + (parseFloat(formulario.value.importacionesNoSujetas) || 0);
    const iva = parseFloat(formulario.value.iva) || 0;
    const otrosMontos = parseFloat(formulario.value.otroAtributo) || 0;
    
    formulario.value.total = (baseGravada + sumExentas + iva + otrosMontos).toFixed(2);
};

// Al cambiar las compras gravadas: Calcula IVA y recalcula el Total
watch(() => [formulario.value.internasGravadas, formulario.value.internacionalesGravBienes, formulario.value.importacionesGravBienes, formulario.value.importacionesGravServicios], (vals) => {
    const [intG, intlG, impG, impS] = vals.map(v => parseFloat(v) || 0);
    const baseGravada = intG + intlG + impG + impS;
    
    formulario.value.iva = (baseGravada * 0.13).toFixed(2);
    
    if(intG > 0) errores.value.internas = false;
    calcularTotalGeneral();
});

// Observador general para actualizar el total al cambiar exentas o el monto de combustible
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
  if (declaranteFiltro.value) { filtrado = filtrado.filter(c => c.iddeclaNIT === declaranteFiltro.value); }
  if (anioFiltro.value) { const anioStr = anioFiltro.value.toString(); filtrado = filtrado.filter(c => c.ComFecha && c.ComFecha.startsWith(anioStr)); }
  if (mesFiltro.value) { filtrado = filtrado.filter(c => { if (!c.ComFecha) return false; const partes = c.ComFecha.split('-'); return partes.length >= 2 && partes[1] === mesFiltro.value; }); }
  if (filtroLista.value) { const txt = filtroLista.value.toLowerCase().trim(); filtrado = filtrado.filter(c => c && (String(c.ComNomProve || '').toLowerCase().includes(txt) || String(c.ComNumero || '').toLowerCase().includes(txt))); }
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
  const cleanNumero = rawNum.replace(/-/g, '');
  const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
  const match = cleanNumero.match(regex);
  ccfParts.value = match ? { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };

  formulario.value = {
    fecha: fSegura, 
    mesDeclarado: compra.ComMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
    anioDeclarado: compra.ComAnioDeclarado || fSegura.substring(0,4),
    numero_control: rawNum, 
    uuid_dte: compra.ComCodGeneracion || '',
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
  formulario.value.fecha = new Date().toISOString().split('T')[0];
  formulario.value.mesDeclarado = mesesOptions[new Date().getMonth()];
  formulario.value.anioDeclarado = new Date().getFullYear().toString();
  formulario.value.numero_control = ''; formulario.value.uuid_dte = '';
  formulario.value.internasGravadas = '0.00'; formulario.value.total = '0.00'; 
  formulario.value.iva = '0.00'; formulario.value.internasExentas = '0.00'; formulario.value.otroAtributo = '0.00';
  ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
  proveedorSeleccionado.value = null; declaranteSeleccionado.value = null;
  errores.value = { proveedor: false, declarante: false, fecha: false, numero: false, internas: false };
};

const cargarDatos = async () => {
  try {
    const [resP, resD, resC] = await Promise.all([axios.get(API_PROVEEDORES), axios.get(API_DECLARANTES), axios.get(API_COMPRAS)]);
    todosLosProveedores.value = resP.data; todosLosDeclarantes.value = resD.data; listaCompras.value = resC.data;
  } catch (error) { console.error("Error", error); }
};

const guardarCompra = async () => {
  actualizarNumeroCompleto(); 
  errores.value.proveedor = !proveedorSeleccionado.value;
  errores.value.declarante = !declaranteSeleccionado.value;
  errores.value.fecha = !formulario.value.fecha;
  errores.value.numero = !formulario.value.numero_control; 
  errores.value.internas = formulario.value.internasGravadas === '' || parseFloat(formulario.value.internasGravadas) < 0;

  if (Object.values(errores.value).some(v => v)) { alert("Complete los campos obligatorios."); return; }

  cargando.value = true;

  // Solo se manda ComOtroAtributo. El backend lo recibe y se encarga de separar el Fovial y Cotrans.
  const payload = { 
      ComFecha: formulario.value.fecha,
      ComMesDeclarado: formulario.value.mesDeclarado,
      ComAnioDeclarado: formulario.value.anioDeclarado,
      ComNumero: formulario.value.numero_control,
      ComCodGeneracion: formulario.value.uuid_dte,
      ComClase: extraerSoloCodigo(formulario.value.claseDocumento),
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

onMounted(cargarDatos);
</script>

<style scoped>
.compras-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }
.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.card-header h3 { font-size: 1.1rem; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }
.badge-anexo { font-size: 0.75rem; background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #e2e8f0; }
.form-section { margin-bottom: 30px; }
.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }
.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; line-height: 1.5; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s ease-in-out; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.input-error .form-control, .has-error .form-control { border-color: #ef4444; background-color: #fef2f2; }
.error-msg { font-size: 0.75rem; color: #ef4444; margin-top: 4px; font-weight: 600; display: block; }
.text-danger { color: #ef4444; }
.text-warning { color: #d97706; }

.uuid-input { font-family: 'Consolas', monospace; font-size: 0.85rem; background-color: #f8fafc; color: #1e3a8a; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn-primary { background-color: #55C2B7; color: white; } 
.btn-success { background-color: #10b981; color: white; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; transition: all 0.2s; color: #6b7280; }
.dte-mask-container { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f9fafb; overflow: hidden; transition: all 0.2s; }
.dte-mask-container:focus-within { border-color: #55C2B7; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); background: white; }
.dte-prefix { background: #f3f4f6; padding: 0.6rem 0.8rem; font-size: 0.8rem; font-weight: 700; color: #55C2B7; border-right: 1px solid #e5e7eb; }
.dte-sep { padding: 0 5px; color: #9ca3af; font-weight: bold; }
.dte-part { border: none; text-align: center; padding: 0.6rem 2px; font-family: 'Courier New', monospace; font-size: 0.95rem; outline: none; background: transparent; color: #1f2937; font-weight: 600; }
.w-2ch { width: 32px; } .w-3ch { width: 44px; } .flex-grow { flex: 1; text-align: left; padding-left: 8px; }
.dte-letter { width: 30px; color: #d97706; font-weight: 800; background: #fffbeb; border-radius: 4px; margin: 2px; }
.search-box { position: relative; }
.suggestions-list { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 50; max-height: 220px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px; }
.suggestions-list li { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
.selected-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 0.5rem; }
.selected-info { display: flex; gap: 12px; align-items: center; }
.icon { font-size: 1.2rem; background: white; padding: 6px; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-text { background: none; border: none; cursor: pointer; text-decoration: none; font-size: 0.8rem; font-weight: 600; border-bottom: 1px dashed #ef4444; padding: 0; }
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
.montos-wrapper { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #f3f4f6; }
.monto-group { flex: 1; min-width: 150px; }
.monto-label { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 6px; display: block; text-transform: uppercase; }
.input-wrapper { position: relative; }
.currency { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-weight: 600; font-size: 0.9rem; }
.monto-input { padding-left: 24px; font-weight: 600; text-align: right; color: #1f2937; }
.total-group .monto-label { color: #0d9488; }
.total-input { padding-left: 24px; font-weight: 800; color: #0d9488; border-color: #55C2B7; text-align: right; font-size: 1.25rem; background: #f0fdfa; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.alert { padding: 12px 16px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
.filter-year { max-width: 140px; font-weight: 600; color: #1f2937; background-color: #f9fafb; border-color: #d1d5db; }
.filter-year:focus { border-color: #55C2B7; background-color: #fff; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.filter-month { max-width: 160px; font-weight: 600; color: #374151; background-color: #f9fafb; border-color: #d1d5db; }
.filter-month:focus { border-color: #55C2B7; background-color: #fff; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.filter-input, .search-list { flex: 1; min-width: 150px; max-width: 280px; }
.filter-input { background-color: #f0fdfa; border-color: #99f6e4; color: #0f766e; }

@media (max-width: 768px) {
  .montos-wrapper { flex-direction: column; }
  .monto-group { width: 100%; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; }
  .header-actions .btn { width: 100%; }
  .history-filters { flex-direction: column; width: 100%; }
  .filter-year, .filter-month, .filter-input, .search-list { max-width: 100%; width: 100%; }
}
</style>