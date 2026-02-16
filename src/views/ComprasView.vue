<template>
  <MainLayout> <div class="compras-container">
      <div class="header-section">
        <h1>🛍️ Gestión de Compras</h1>
        <div class="header-buttons">
          <button @click="alternarVista" class="btn-toggle">
            {{ mostrandoLista ? '➕ Nueva Compra' : '📋 Ver Lista Guardada' }}
          </button>
          </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card-form">
          <div class="form-header">
            <h2>{{ modoEdicion ? '✏️ Editando Compra' : '✨ Nueva Compra' }}</h2>
            <p v-if="modoEdicion">Modifique los datos necesarios y guarde los cambios.</p>
            <p v-else>Ingrese los datos obligatorios marcados con asterisco (*).</p>
          </div>

          <form @submit.prevent="guardarCompra">
            
            <div class="seccion-proveedor" :class="{ 'error-borde': errores.declarante }" style="margin-bottom: 15px;">
              <label>Declarante <span class="required">*</span></label>
              <div v-if="!declaranteSeleccionado" class="buscador-wrapper">
                <input type="text" v-model="busquedaDeclarante" placeholder="🔍 Buscar Declarante por Nombre o NIT..." class="input-buscador" @focus="mostrarSugerenciasDeclarante = true">
                <ul v-if="mostrarSugerenciasDeclarante && declarantesFiltrados.length > 0" class="lista-sugerencias">
                  <li v-for="decla in declarantesFiltrados" :key="decla.iddeclaNIT" @click="seleccionarDeclarante(decla)">
                    <strong>{{ decla.declarante }}</strong> <small>{{ decla.iddeclaNIT }}</small>
                  </li>
                </ul>
                <div v-else-if="busquedaDeclarante && declarantesFiltrados.length === 0" class="no-resultados">No se encontraron declarantes.</div>
              </div>
              <div v-else class="proveedor-seleccionado" style="background: #fff8e1; border-color: #ffb74d;">
                <div class="info-prov">
                  <span class="icono">👤</span>
                  <div><strong>{{ declaranteSeleccionado.declarante }}</strong> <small>NIT: {{ declaranteSeleccionado.iddeclaNIT }}</small></div>
                </div>
                <button @click="quitarDeclarante" type="button" class="btn-cambiar" style="color: #e65100;">Cambiar</button>
              </div>
              <small v-if="errores.declarante" class="msg-error">Debe seleccionar un declarante.</small>
            </div>

            <div class="seccion-proveedor" :class="{ 'error-borde': errores.proveedor }">
              <label>Proveedor <span class="required">*</span></label>
              <div v-if="!proveedorSeleccionado" class="buscador-wrapper">
                <input type="text" v-model="busqueda" placeholder="🔍 Buscar Proveedor por Nombre o NIT..." class="input-buscador" @focus="mostrarSugerencias = true">
                <ul v-if="mostrarSugerencias && proveedoresFiltrados.length > 0" class="lista-sugerencias">
                  <li v-for="prov in proveedoresFiltrados" :key="prov.ProvNIT" @click="seleccionarProveedor(prov)">
                    <strong>{{ prov.ProvNombre }}</strong> <small>{{ prov.ProvNIT }}</small>
                  </li>
                </ul>
                <div v-else-if="busqueda && proveedoresFiltrados.length === 0" class="no-resultados-container">
                    <div class="no-resultados">No se encontraron proveedores.</div>
                    <button type="button" class="btn-crear-prov" @click="irAProveedores">
                      ➕ Crear "{{ busqueda }}" en Proveedores
                    </button>
                </div>
              </div>
              <div v-else class="proveedor-seleccionado">
                <div class="info-prov">
                  <span class="icono">🏢</span>
                  <div><strong>{{ proveedorSeleccionado.ProvNombre }}</strong> <small>NIT: {{ proveedorSeleccionado.ProvNIT }}</small></div>
                </div>
                <button @click="quitarProveedor" type="button" class="btn-cambiar">Cambiar</button>
              </div>
              <small v-if="errores.proveedor" class="msg-error">Debe seleccionar un proveedor.</small>
            </div>

            <div class="form-row">
              <div class="form-group">
                  <label>Fecha <span class="required">*</span></label>
                  <input type="date" v-model="formulario.fecha" :class="{ 'input-error': errores.fecha }" required>
                  <small v-if="errores.fecha" class="msg-error">Fecha requerida.</small>
              </div>

              <div class="form-group-duo">
                   <div class="form-group">
                      <label>Mes Decl. <span class="required">*</span></label>
                      <select v-model="formulario.mesDeclarado" required class="select-destacado" style="border-color: #55C2B7;">
                          <option v-for="mes in opcionesMeses" :key="mes" :value="mes">{{ mes }}</option>
                      </select>
                  </div>
                  <div class="form-group">
                      <label>Año <span class="required">*</span></label>
                      <input type="number" v-model="formulario.anioDeclarado" placeholder="2026" required class="select-destacado" style="border-color: #55C2B7;">
                  </div>
              </div>

              <div class="form-group" style="flex: 2;">
              <label>Número (CCF) <span class="required">*</span></label>
              
              <div class="input-ccf-container" :class="{ 'input-error': errores.numero }">
                  <span class="prefix">DTE</span>
                  
                  <input type="text" 
                        :value="ccfParts.part1" 
                        @input="e => handleInputMask(e, 'part1', 2)"
                        class="input-part part-small" 
                        placeholder="00">
                  
                  <input type="text" 
                        :value="ccfParts.letraSerie" 
                        @input="handleLetraInput"
                        @focus="$event.target.select()"
                        class="input-part part-letter" 
                        maxlength="1"
                        placeholder="S">
                  
                  <input type="text" 
                        :value="ccfParts.part2" 
                        @input="e => handleInputMask(e, 'part2', 3)"
                        class="input-part part-medium" 
                        placeholder="000">
                  
                  <span class="prefix">P</span>
                  
                  <input type="text" 
                        :value="ccfParts.part3" 
                        @input="e => handleInputMask(e, 'part3', 3)"
                        class="input-part part-medium" 
                        placeholder="000">
                  
                  <input type="text" 
                        :value="ccfParts.part4" 
                        @input="e => handleInputMask(e, 'part4', 15)"
                        class="input-part part-large" 
                        placeholder="000...">
              </div>
              
              <small class="hint-text">Formato: DTE03 <strong>{{ ccfParts.letraSerie || 'S' }}</strong>001 P003 ...</small>
              <small v-if="errores.numero" class="msg-error">Número requerido.</small>
          </div>
              
              <div class="form-group"><label>DUI Proveedor (Opcional)</label><input type="text" v-model="formulario.duiProveedor" placeholder="00000000-0"></div>
            </div>

            <div class="form-row grid-fiscal">
               <div class="form-group"><label>Clase *</label><select v-model="formulario.claseDocumento" required class="select-destacado"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Tipo Doc *</label><select v-model="formulario.tipoDocumento" required class="select-destacado"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Operación *</label><select v-model="formulario.tipoOperacion" required class="select-destacado"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Clasificación *</label><select v-model="formulario.clasificacion" required class="select-destacado"><option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Sector *</label><select v-model="formulario.sector" required class="select-destacado"><option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Costo/Gasto *</label><select v-model="formulario.tipoCostoGasto" required class="select-destacado"><option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option></select></div>
            </div>

            <hr class="separador">

            <div class="seccion-montos">
              <h3>💰 Detalles Económicos</h3>
              
              <div class="sub-seccion">
                  <label class="sub-label">Compras Gravadas</label>
                  <div class="form-row grid-montos">
                      <div class="form-group">
                          <label>Internas <span class="required">*</span></label>
                          <input type="number" v-model="formulario.internasGravadas" step="0.01" 
                                 class="input-monto principal" 
                                 :class="{ 'input-error': errores.internas }"
                                 @blur="formatearDecimal('internasGravadas')">
                          <small v-if="errores.internas" class="msg-error">Requerido (min 0.00)</small>
                      </div>
                      <div class="form-group"><label>Internac. Bienes</label><input type="number" v-model="formulario.internacionalesGravBienes" step="0.01" class="input-sm" @blur="formatearDecimal('internacionalesGravBienes')"></div>
                      <div class="form-group"><label>Import. Bienes</label><input type="number" v-model="formulario.importacionesGravBienes" step="0.01" class="input-sm" @blur="formatearDecimal('importacionesGravBienes')"></div>
                      <div class="form-group"><label>Import. Servicios</label><input type="number" v-model.number="formulario.importacionesGravServicios" step="0.01" class="input-sm" @blur="formatearDecimal('importacionesGravServicios')"></div>
                  </div>
              </div>

              <div class="sub-seccion">
                  <label class="sub-label">Exentas / No Sujetas</label>
                  <div class="form-row grid-montos">
                      <div class="form-group"><label>Internas Exentas</label><input type="number" v-model="formulario.internasExentas" step="0.01" class="input-sm" @blur="formatearDecimal('internasExentas')"></div>
                      <div class="form-group"><label>Internac. Exentas</label><input type="number" v-model="formulario.internacionalesExentas" step="0.01" class="input-sm" @blur="formatearDecimal('internacionalesExentas')"></div>
                      <div class="form-group"><label>Import. No Sujetas</label><input type="number" v-model="formulario.importacionesNoSujetas" step="0.01" class="input-sm" @blur="formatearDecimal('importacionesNoSujetas')"></div>
                  </div>
              </div>

              <div class="sub-seccion">
                   <div class="form-row grid-montos">
                       <div class="form-group">
                          <label title="Ej: Impuesto a la Gasolina">Impuesto Gasolina (Otro) </label>
                          <input type="number" v-model="formulario.otroAtributo" step="0.01" class="input-sm" style="border-color: #9c27b0; color: #9c27b0; font-weight: bold;" @blur="formatearDecimal('otroAtributo')">
                      </div>
                   </div>
              </div>

              <hr class="separador-sm">

              <div class="resultado-calculo">
                  <div class="fila-res">
                      <span>IVA (Crédito Fiscal):</span> 
                      <input type="number" v-model="formulario.iva" step="0.01" class="input-monto secundario" @blur="formatearDecimal('iva')">
                  </div>
                  <div class="fila-res total">
                      <span>TOTAL COMPRA:</span> 
                      <input type="number" v-model="formulario.total" step="0.01" class="input-total" @blur="formatearDecimal('total')">
                  </div>
              </div>
            </div>

            <div class="actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar Compra' : '💾 Guardar Compra') }}
              </button>
            </div>
            
            <transition name="fade"><div v-if="mensaje" :class="['alert-box', tipoMensaje]"><span>{{ mensaje }}</span></div></transition>
          </form>
        </div>

        <div v-if="mostrandoLista" class="card-lista-full">
          <div class="lista-header"><h3>📄 Historial de Compras</h3><input type="text" v-model="filtroLista" placeholder="🔎 Filtrar..." class="filtro-input"></div>
          <div class="tabla-container">
            <table>
              <thead>
                <tr><th>Fecha/Periodo</th><th>Proveedor / Declarante</th><th>Detalles</th><th>Total</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                <tr v-for="compra in comprasFiltradas" :key="compra.idcompras">
                  <td>
                      {{ formatearFecha(compra.ComFecha) }}
                      <small style="display:block; color:#666;">
                          {{ compra.ComMesDeclarado || '---' }} {{ compra.ComAnioDeclarado ? ` ${compra.ComAnioDeclarado}` : '' }}
                      </small>
                  </td>
                  <td>
                    <div class="prov-nombre">{{ compra.ComNomProve || '---' }}</div> 
                    <small class="nit-sm" style="display:block;">Prov: {{ compra.proveedor_ProvNIT }}</small>
                    <small v-if="compra.iddeclaNIT" class="nit-sm" style="color: #e65100;">Decla: {{ compra.iddeclaNIT }}</small>
                  </td>
                  <td class="detalle-td">
                      <div class="badges-container">
                          <span class="badge badge-tipo">{{ obtenerCodigo(compra.ComTipo) }}</span>
                          <span class="badge badge-op">{{ obtenerCodigo(compra.ComTipoOpeRenta) }}</span>
                      </div>
                      <div class="montos-mini">
                          <span v-if="parseFloat(compra.ComIntGrav)>0" title="Internas Gravadas">G: ${{ parseFloat(compra.ComIntGrav).toFixed(2) }}</span>
                          <span v-if="parseFloat(compra.ComCredFiscal)>0" title="IVA">IVA: ${{ parseFloat(compra.ComCredFiscal).toFixed(2) }}</span>
                          <span v-if="parseFloat(compra.ComOtroAtributo)>0" style="color: #9c27b0; font-weight: bold;">Otro: ${{ parseFloat(compra.ComOtroAtributo).toFixed(2) }}</span>
                      </div>
                  </td>
                  <td class="monto-total">$ {{ parseFloat(compra.ComTotal || 0).toFixed(2) }}</td>
                  <td class="acciones-td">
                    <button @click="prepararEdicion(compra)" class="btn-accion btn-editar" title="Editar">✏️</button>
                    <button v-if="rolActual === 'admin'" @click="eliminarCompra(compra.idcompras)" class="btn-accion btn-borrar" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="comprasFiltradas.length === 0"><td colspan="5" class="vacio">No hay registros que coincidan.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  
  </MainLayout> </template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue'
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; 

const router = useRouter();
const rolActual = sessionStorage.getItem('rolUsuario') || 'empleado';

// --- CONFIGURACIÓN API ---
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_PROVEEDORES = BASE_URL + '/api/proveedores';
const API_COMPRAS = BASE_URL + '/api/compras';
const API_DECLARANTES = BASE_URL + '/api/declarantes'; 

// --- LISTAS OPCIONES ---
const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO", "12. DECLARACION DE MERCANCIAS"];
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES", "0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES"];
const opcionesClasificacion = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. COSTO", "2. GASTO", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesSector = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. INDUSTRIA", "2. COMERCIO", "3. AGROPECURIA", "4. SERVICIOS PROFESIONES, ARTES Y OFICIOS", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXEPCIONES"];
const opcionesCostoGasto = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. GASTO DE VENTA SIN DONACION", "2. GASTO DE ADMINISTRACION SIN DONACION", "3. GASTOS FINANCIEROS SIN DONACION", "4. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS/IMPORTACIONES", "5. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS INTERNO", "6. COSTOS INDIRECTOS DE FABRICACION", "7. MANO DE OBRA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];

const opcionesMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- INPUTS COMPUESTOS PARA CCF (CORREGIDO: Agregado letraSerie) ---
const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });

const formulario = ref({ 
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: opcionesMeses[new Date().getMonth()], 
    anioDeclarado: new Date().getFullYear(),
    numero: '', duiProveedor: '',
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00',
    iva: '0.00', total: '0.00', otroAtributo: '0.00'
});

const errores = ref({ proveedor: false, declarante: false, fecha: false, numero: false, internas: false });
const todosLosProveedores = ref([]);
const todosLosDeclarantes = ref([]);
const listaCompras = ref([]);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const mostrandoLista = ref(false); 
const modoEdicion = ref(false);    
const idEdicion = ref(null);       
const filtroLista = ref(''); 
const busqueda = ref('');
const proveedorSeleccionado = ref(null);
const mostrarSugerencias = ref(false);
const busquedaDeclarante = ref('');
const declaranteSeleccionado = ref(null);
const mostrarSugerenciasDeclarante = ref(false);

// --- LÓGICA DE LETRA VARIABLE (S, A, B...) ---
const handleLetraInput = (e) => {
    let val = e.target.value.toUpperCase(); // Forzar mayúscula
    val = val.replace(/[^A-Z0-9]/g, ''); // Solo letras y números
    ccfParts.value.letraSerie = val;
    e.target.value = val;
    actualizarNumeroCompleto();
};

// --- LÓGICA DE INPUT MÁSCARA (DERECHA A IZQUIERDA) ---
const handleInputMask = (e, partName, maxLength) => {
    let raw = e.target.value.replace(/\D/g, ''); 
    if (raw.length > maxLength) {
        raw = raw.slice(-maxLength);
    }
    const padded = raw.padStart(maxLength, '0');
    ccfParts.value[partName] = padded;
    e.target.value = padded;
    actualizarNumeroCompleto();
};

const actualizarNumeroCompleto = () => {
    // Unimos todo usando la letra variable
    const letra = ccfParts.value.letraSerie || 'S';
    formulario.value.numero = `DTE${ccfParts.value.part1}${letra}${ccfParts.value.part2}P${ccfParts.value.part3}${ccfParts.value.part4}`;
};

// --- WATCHERS Y HELPERS ---
const extraerSoloCodigo = (texto) => texto ? texto.split(/[\.\s]+/)[0] : '';
const recuperarOpcionCompleta = (codigo, lista) => {
    if (!codigo) return lista[0];
    const enc = lista.find(op => op.split(/[\.\s]+/)[0] == String(codigo).trim());
    return enc || codigo; 
};

watch(() => [
    formulario.value.internasGravadas, formulario.value.internacionalesGravBienes,
    formulario.value.importacionesGravBienes, formulario.value.importacionesGravServicios,
    formulario.value.internasExentas, formulario.value.internacionalesExentas,
    formulario.value.importacionesNoSujetas, formulario.value.otroAtributo 
], ([intG, intlG, impG, impS, intE, intlE, impNS, otroAttr]) => {
    const baseGravada = (parseFloat(intG)||0) + (parseFloat(intlG)||0) + (parseFloat(impG)||0) + (parseFloat(impS)||0);
    formulario.value.iva = (baseGravada * 0.13).toFixed(2);
    const sumExentas = (parseFloat(intE)||0) + (parseFloat(intlE)||0) + (parseFloat(impNS)||0);
    formulario.value.total = (baseGravada + parseFloat(formulario.value.iva) + sumExentas + (parseFloat(otroAttr)||0)).toFixed(2);
    if(parseFloat(intG) > 0 || intG !== '') errores.value.internas = false;
});

const formatearDecimal = (c) => { 
    const v = parseFloat(formulario.value[c]); 
    formulario.value[c] = !isNaN(v) ? v.toFixed(2) : '0.00'; 
};

const proveedoresFiltrados = computed(() => {
  if (!busqueda.value) return [];
  return todosLosProveedores.value.filter(p => p.ProvNombre.toLowerCase().includes(busqueda.value.toLowerCase()) || p.ProvNIT.includes(busqueda.value));
});

const declarantesFiltrados = computed(() => { 
  if (!busquedaDeclarante.value) return [];
  return todosLosDeclarantes.value.filter(d => d.declarante.toLowerCase().includes(busquedaDeclarante.value.toLowerCase()) || d.iddeclaNIT.includes(busquedaDeclarante.value));
});

const comprasFiltradas = computed(() => {
  if (!filtroLista.value) return listaCompras.value;
  const txt = filtroLista.value.toLowerCase();
  return listaCompras.value.filter(c => (c.ComNomProve && c.ComNomProve.toLowerCase().includes(txt)) || (c.CompNumero && c.CompNumero.includes(txt)));
});

const alternarVista = () => { if (modoEdicion) cancelarEdicion(); mostrandoLista.value = !mostrandoLista.value; };
const seleccionarProveedor = (p) => { proveedorSeleccionado.value = p; mostrarSugerencias.value = false; busqueda.value = ''; errores.value.proveedor = false; };
const quitarProveedor = () => proveedorSeleccionado.value = null;
const irAProveedores = () => router.push('/proveedores');
const seleccionarDeclarante = (d) => { declaranteSeleccionado.value = d; mostrarSugerenciasDeclarante.value = false; busquedaDeclarante.value = ''; errores.value.declarante = false; };
const quitarDeclarante = () => declaranteSeleccionado.value = null;

const prepararEdicion = (compra) => {
  let fSegura = new Date().toISOString().split('T')[0];
  if (compra.ComFecha) fSegura = new Date(compra.ComFecha).toISOString().split('T')[0];

  formulario.value = {
    fecha: fSegura,
    mesDeclarado: compra.ComMesDeclarado || opcionesMeses[new Date().getMonth()],
    anioDeclarado: compra.ComAnioDeclarado || new Date().getFullYear(),
    numero: compra.ComNumero || '', 
    duiProveedor: compra.ComDuiProve || '',
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
    total: parseFloat(compra.ComTotal || 0).toFixed(2),
    otroAtributo: parseFloat(compra.ComOtroAtributo || 0).toFixed(2)
  };
  
  // --- PARSEO DEL NÚMERO CCF (CORREGIDO PARA LETRA) ---
  const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/; // Captura letra en grupo 2
  const match = compra.ComNumero ? compra.ComNumero.match(regex) : null;
  if (match) {
      ccfParts.value = { 
          part1: match[1], 
          letraSerie: match[2], 
          part2: match[3], 
          part3: match[4], 
          part4: match[5] 
      };
  } else {
      ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
  }

  const prov = todosLosProveedores.value.find(p => p.ProvNIT === compra.proveedor_ProvNIT);
  proveedorSeleccionado.value = prov || { ProvNIT: compra.proveedor_ProvNIT, ProvNombre: compra.ComNomProve || 'Histórico' };
  
  if (compra.iddeclaNIT) {
      const dec = todosLosDeclarantes.value.find(d => d.iddeclaNIT === compra.iddeclaNIT);
      declaranteSeleccionado.value = dec || { iddeclaNIT: compra.iddeclaNIT, declarante: 'Histórico' };
  } else declaranteSeleccionado.value = null;

  errores.value = { proveedor: false, declarante: false, fecha: false, numero: false, internas: false };
  modoEdicion.value = true;
  idEdicion.value = compra.idcompras;
  mostrandoLista.value = false; 
};

const cancelarEdicion = () => { resetForm(); modoEdicion.value = false; idEdicion.value = null; };
const resetForm = () => {
  formulario.value = { 
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: opcionesMeses[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear(),
    numero: '', duiProveedor: '',
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00', iva: '0.00', total: '0.00', otroAtributo: '0.00'
  };
  ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' }; // Reset completo
  proveedorSeleccionado.value = null;
  declaranteSeleccionado.value = null;
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
  errores.value.numero = !formulario.value.numero; 
  errores.value.internas = formulario.value.internasGravadas === '';

  if (errores.value.proveedor || errores.value.declarante || errores.value.fecha || errores.value.numero || errores.value.internas) {
      alert("Por favor complete los campos obligatorios.");
      return;
  }

  cargando.value = true;
  const payload = { 
      ...formulario.value, 
      claseDocumento: extraerSoloCodigo(formulario.value.claseDocumento),
      tipoDocumento: extraerSoloCodigo(formulario.value.tipoDocumento),
      tipoOperacion: extraerSoloCodigo(formulario.value.tipoOperacion),
      clasificacion: extraerSoloCodigo(formulario.value.clasificacion),
      sector: extraerSoloCodigo(formulario.value.sector),
      tipoCostoGasto: extraerSoloCodigo(formulario.value.tipoCostoGasto),
      nitProveedor: proveedorSeleccionado.value.ProvNIT, 
      nombreProveedor: proveedorSeleccionado.value.ProvNombre,
      iddeclaNIT: declaranteSeleccionado.value.iddeclaNIT,
      internasGravadas: parseFloat(formulario.value.internasGravadas)||0,
      internacionalesGravBienes: parseFloat(formulario.value.internacionalesGravBienes)||0,
      importacionesGravBienes: parseFloat(formulario.value.importacionesGravBienes)||0,
      importacionesGravServicios: parseFloat(formulario.value.importacionesGravServicios)||0,
      internasExentas: parseFloat(formulario.value.internasExentas)||0,
      internacionalesExentas: parseFloat(formulario.value.internacionalesExentas)||0,
      importacionesNoSujetas: parseFloat(formulario.value.importacionesNoSujetas)||0,
      iva: parseFloat(formulario.value.iva)||0,
      total: parseFloat(formulario.value.total)||0,
      otroAtributo: parseFloat(formulario.value.otroAtributo)||0
  };

  try {
    if (modoEdicion.value) await axios.put(`${API_COMPRAS}/${idEdicion.value}`, payload);
    else await axios.post(API_COMPRAS, payload);
    mensaje.value = modoEdicion.value ? '¡Actualizado!' : '¡Guardado!';
    tipoMensaje.value = 'success';
    await cargarDatos(); 
    setTimeout(() => { mensaje.value = ''; if (modoEdicion.value) cancelarEdicion(); else resetForm(); mostrandoLista.value = true; }, 1500);
  } catch (error) { tipoMensaje.value = 'error'; mensaje.value = error.response?.data?.message || 'Error'; } 
  finally { cargando.value = false; }
};

// Dentro de tu lógica de Vue
const exportarAJSON = async () => {
  try {
    // Estos valores deben venir de tus modelos v-model (ej: filtros de búsqueda)
    const params = {
      mes: mesSeleccionado.value, 
      anio: anioSeleccionado.value,
      nit: '06192901600027' // NIT del declarante
    };

    const response = await axios.get('http://190.62.2.18:3000/api/compras/exportar', { 
      params,
      responseType: 'json' 
    });

    // Crear el archivo para descargar
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Reporte_Compras_${params.mes}_${params.anio}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

  } catch (error) {
    console.error("Error al exportar:", error);
    alert("No se pudo generar el archivo. Revisa que existan datos para ese mes/año.");
  }
};

const eliminarCompra = async (id) => { if(confirm('¿Eliminar?')) { try { await axios.delete(`${API_COMPRAS}/${id}`); await cargarDatos(); } catch (e) { alert('Error'); } } };
const formatearFecha = (f) => f ? (new Date(f).toISOString().split('T')[0]) : '---';
const obtenerCodigo = (t) => t ? t.split('.')[0].split(' ')[0] : '??';
onMounted(cargarDatos);
</script>

<style scoped>
/* Estilos generales existentes */
.compras-container { padding: 2rem; background: #f0f2f5; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; max-width: 1000px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }
.btn-toggle { background: #55C2B7; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-volver { background: #666; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; }
.card-form, .card-lista-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1200px; margin: 0 auto; border-top: 5px solid #55C2B7; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.grid-fiscal { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.grid-montos { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.form-group { display: flex; flex-direction: column; }
.form-group-duo { display: flex; gap: 10px; }
.form-group-duo .form-group { flex: 1; }
label { font-weight: bold; margin-bottom: 5px; color: #555; font-size: 0.85rem; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.select-destacado { border: 2px solid #b2dfdb; background-color: #fafdff; font-weight: 500; font-size: 0.8rem;}
.required { color: #d32f2f; margin-left: 3px; }
.input-error { border: 2px solid #d32f2f !important; background-color: #ffebee; }
.error-borde { border: 2px solid #d32f2f; border-radius: 8px; padding: 10px; background-color: #ffebee; }
.msg-error { color: #d32f2f; font-size: 0.75rem; margin-top: 3px; font-weight: bold; }
.seccion-montos { background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid #eee; }
.sub-seccion { margin-bottom: 1rem; border-bottom: 1px dashed #ddd; padding-bottom: 1rem; }
.sub-label { display: block; font-weight: bold; color: #55C2B7; margin-bottom: 5px; font-size: 0.9rem; }
.input-monto { font-size: 1rem; font-weight: bold; }
.input-monto.principal { border-color: #55C2B7; color: #333; }
.input-monto.secundario { border-color: #ff9800; color: #333; }
.input-sm { font-size: 0.9rem; padding: 8px; }
.input-total { font-size: 1.3rem; font-weight: bold; color: #55C2B7; border: 2px solid #55C2B7; width: 160px; text-align: right; }
.resultado-calculo { margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.fila-res { display: flex; align-items: center; gap: 10px; }
.fila-res span { font-weight: bold; color: #666; }
.fila-res.total span { color: #55C2B7; font-size: 1.1rem; }
.buscador-wrapper { position: relative; }
.input-buscador { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; }
.lista-sugerencias { position: absolute; background: white; width: 100%; border: 1px solid #ddd; z-index: 10; list-style: none; padding: 0; max-height: 200px; overflow-y: auto; }
.lista-sugerencias li { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
.lista-sugerencias li:hover { background: #e0f7fa; }
.proveedor-seleccionado { background: #e0f7fa; padding: 10px; border: 1px solid #55C2B7; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
.btn-cambiar { background: none; border: none; color: #d32f2f; text-decoration: underline; cursor: pointer; }
.no-resultados-container { margin-top: 5px; }
.no-resultados { color: #666; font-size: 0.9rem; margin-bottom: 5px; }
.btn-crear-prov { background: #2196f3; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
.tabla-container { overflow-x: auto; margin-top: 1rem; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px; border-bottom: 2px solid #eee; color: #777; font-size: 0.9rem; }
td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: middle; font-size: 0.9rem; }
.badges-container { display: flex; gap: 3px; margin-bottom: 2px; flex-wrap: wrap; }
.badge { font-size: 0.7rem; font-weight: bold; padding: 1px 4px; border-radius: 3px; }
.badge-tipo { background: #e3f2fd; color: #1565c0; }
.badge-op { background: #fff3e0; color: #e65100; }
.montos-mini { font-size: 0.8rem; color: #555; display: flex; flex-direction: column; }
.monto-total { font-weight: bold; color: #55C2B7; }
.actions { display: flex; gap: 10px; margin-top: 1.5rem; }
.btn-guardar { flex: 1; background: #55C2B7; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-cancelar { background: #999; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.alert-box { margin-top: 1rem; padding: 10px; text-align: center; border-radius: 5px; font-weight: bold; }
.alert-box.success { background: #e8f7f5; color: #00695c; }
.alert-box.error { background: #ffebee; color: #c62828; }

/* --- ESTILOS INPUT CCF (COMPUESTO) --- */
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
.input-ccf-container.input-error {
    border: 2px solid #d32f2f;
    background-color: #ffebee;
}
.prefix {
    font-weight: bold;
    color: #55C2B7;
    background: #f0fdfc;
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
    background-color: #e0f7fa;
    border-radius: 4px;
}
/* Tamaños específicos */
.part-small { width: 30px; }
.part-medium { width: 40px; }
.part-large { flex: 1; text-align: right; letter-spacing: 1px; } 
.hint-text {
    font-size: 0.7rem;
    color: #999;
    margin-top: 2px;
}

/* --- ESTILO FALTANTE: LETRA SERIE (S) --- */
.part-letter {
    width: 25px; /* Ancho pequeño */
    text-align: center;
    font-weight: bold;
    color: #e65100; /* Naranja para destacar */
    background-color: #fff3e0;
    border-radius: 4px;
    margin: 0 2px;
}
.part-letter:focus {
    background-color: #ffe0b2;
    outline: none;
}
</style>