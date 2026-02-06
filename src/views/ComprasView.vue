<template>
  <div class="compras-container">
    <div class="header-section">
      <h1>🛍️ Gestión de Compras</h1>
      <div class="header-buttons">
        <button @click="alternarVista" class="btn-toggle">
          {{ mostrandoLista ? '➕ Nueva Compra' : '📋 Ver Lista Guardada' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Menú</button>
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
          
          <div class="seccion-proveedor" :class="{ 'error-borde': errores.proveedor }">
            <label>Proveedor <span class="required">*</span></label>
            <div v-if="!proveedorSeleccionado" class="buscador-wrapper">
              <input type="text" v-model="busqueda" placeholder="🔍 Buscar por Nombre o NIT..." class="input-buscador" @focus="mostrarSugerencias = true">
              <ul v-if="mostrarSugerencias && proveedoresFiltrados.length > 0" class="lista-sugerencias">
                <li v-for="prov in proveedoresFiltrados" :key="prov.ProvNIT" @click="seleccionarProveedor(prov)">
                  <strong>{{ prov.ProvNombre }}</strong> <small>{{ prov.ProvNIT }}</small>
                </li>
              </ul>
              <div v-else-if="busqueda && proveedoresFiltrados.length === 0" class="no-resultados">No se encontraron proveedores.</div>
            </div>
            <div v-else class="proveedor-seleccionado">
              <div class="info-prov">
                <span class="icono">🏢</span>
                <div><strong>{{ proveedorSeleccionado.ProvNombre }}</strong> <small>NIT: {{ proveedorSeleccionado.ProvNIT }}</small></div>
              </div>
              <button @click="quitarProveedor" type="button" class="btn-cambiar">Cambiar</button>
            </div>
            <small v-if="errores.proveedor" class="msg-error">Debe seleccionar un proveedor (NIT).</small>
          </div>

          <div class="form-row grid-fiscal">
             <div class="form-group"><label>Clase *</label><select v-model="formulario.claseDocumento" required class="select-destacado"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Tipo Doc *</label><select v-model="formulario.tipoDocumento" required class="select-destacado"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Operación *</label><select v-model="formulario.tipoOperacion" required class="select-destacado"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Clasificación *</label><select v-model="formulario.clasificacion" required class="select-destacado"><option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Sector *</label><select v-model="formulario.sector" required class="select-destacado"><option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Costo/Gasto *</label><select v-model="formulario.tipoCostoGasto" required class="select-destacado"><option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option></select></div>
          </div>

          <div class="form-row">
            <div class="form-group">
                <label>Fecha <span class="required">*</span></label>
                <input type="date" v-model="formulario.fecha" :class="{ 'input-error': errores.fecha }" required>
                <small v-if="errores.fecha" class="msg-error">Fecha requerida.</small>
            </div>
            <div class="form-group">
                <label>Número (CCF) <span class="required">*</span></label>
                <input type="text" v-model="formulario.numero" :class="{ 'input-error': errores.numero }" required placeholder="Ej: 12345">
                <small v-if="errores.numero" class="msg-error">Número requerido.</small>
            </div>
            <div class="form-group"><label>DUI Proveedor (Opcional)</label><input type="text" v-model="formulario.duiProveedor" placeholder="00000000-0"></div>
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
              <tr><th>Fecha</th><th>Proveedor</th><th>Detalles</th><th>Total</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="compra in comprasFiltradas" :key="compra.idcompras">
                <td>{{ formatearFecha(compra.CompFecha) }}</td>
                <td>
                  <div class="prov-nombre">{{ compra.ComNomProve || '---' }}</div> 
                  <small class="nit-sm">{{ compra.proveedor_ProvNIT }}</small>
                </td>
                <td class="detalle-td">
                    <div class="badges-container">
                        <span class="badge badge-tipo">{{ obtenerCodigo(compra.ComTipo) }}</span>
                        <span class="badge badge-op">{{ obtenerCodigo(compra.ComTipoOpeRenta) }}</span>
                    </div>
                    <div class="montos-mini">
                        <span v-if="parseFloat(compra.ComIntGrav)>0" title="Internas Gravadas">G: ${{ parseFloat(compra.ComIntGrav).toFixed(2) }}</span>
                        <span v-if="parseFloat(compra.ComCredFiscal)>0" title="IVA">IVA: ${{ parseFloat(compra.ComCredFiscal).toFixed(2) }}</span>
                    </div>
                </td>
                <td class="monto-total">$ {{ parseFloat(compra.ComTotal || 0).toFixed(2) }}</td>
                <td class="acciones-td">
                  <button @click="prepararEdicion(compra)" class="btn-accion btn-editar" title="Editar">✏️</button>
                  <button @click="eliminarCompra(compra.idcompras)" class="btn-accion btn-borrar" title="Eliminar">🗑️</button>
                </td>
              </tr>
              <tr v-if="comprasFiltradas.length === 0"><td colspan="5" class="vacio">No hay registros que coincidan.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

const API_PROVEEDORES = import.meta.env.VITE_API_URL + '/api/proveedores';
const API_COMPRAS = import.meta.env.VITE_API_URL + '/api/compras';

// --- LISTAS DE OPCIONES ---
const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO", "12. DECLARACION DE MERCANCIAS"];
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES", "0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES"];
const opcionesClasificacion = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. COSTO", "2. GASTO", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesSector = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. INDUSTRIA", "2. COMERCIO", "3. AGROPECURIA", "4. SERVICIOS PROFESIONES, ARTES Y OFICIOS", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXEPCIONES"];
const opcionesCostoGasto = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. GASTO DE VENTA SIN DONACION", "2. GASTO DE ADMINISTRACION SIN DONACION", "3. GASTOS FINANCIEROS SIN DONACION", "4. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS/IMPORTACIONES", "5. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS INTERNO", "6. COSTOS INDIRECTOS DE FABRICACION", "7. MANO DE OBRA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];

const formulario = ref({ 
    fecha: new Date().toISOString().split('T')[0], numero: '', duiProveedor: '',
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    // Montos
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00',
    iva: '0.00', total: '0.00'
});

const errores = ref({ proveedor: false, fecha: false, numero: false, internas: false });

const todosLosProveedores = ref([]);
const listaCompras = ref([]);
const busqueda = ref('');
const filtroLista = ref(''); 
const proveedorSeleccionado = ref(null);
const mostrarSugerencias = ref(false);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const mostrandoLista = ref(false); 
const modoEdicion = ref(false);    
const idEdicion = ref(null);       

// --- CÁLCULOS INTELIGENTES ---
watch(() => [
    formulario.value.internasGravadas, 
    formulario.value.internacionalesGravBienes,
    formulario.value.importacionesGravBienes,
    formulario.value.importacionesGravServicios,
    formulario.value.internasExentas,
    formulario.value.internacionalesExentas,
    formulario.value.importacionesNoSujetas
], ([intG, intlG, impG, impS, intE, intlE, impNS]) => {
    const baseGravada = (parseFloat(intG)||0) + (parseFloat(intlG)||0) + (parseFloat(impG)||0) + (parseFloat(impS)||0);
    formulario.value.iva = (baseGravada * 0.13).toFixed(2);
    const sumExentas = (parseFloat(intE)||0) + (parseFloat(intlE)||0) + (parseFloat(impNS)||0);
    const ivaNum = parseFloat(formulario.value.iva);
    formulario.value.total = (baseGravada + ivaNum + sumExentas).toFixed(2);
    
    // Limpiamos error de internas si ya escribió algo
    if(parseFloat(intG) > 0 || intG !== '') errores.value.internas = false;
});

const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(valor) ? valor.toFixed(2) : '0.00';
};

const proveedoresFiltrados = computed(() => {
  if (!busqueda.value) return [];
  const txt = busqueda.value.toLowerCase();
  return todosLosProveedores.value.filter(p => p.ProvNombre.toLowerCase().includes(txt) || p.ProvNIT.includes(txt));
});

const comprasFiltradas = computed(() => {
  if (!filtroLista.value) return listaCompras.value;
  const txt = filtroLista.value.toLowerCase();
  return listaCompras.value.filter(c => 
    (c.ComNomProve && c.ComNomProve.toLowerCase().includes(txt)) || (c.CompNumero && c.CompNumero.includes(txt))
  );
});

const alternarVista = () => { if (modoEdicion) cancelarEdicion(); mostrandoLista.value = !mostrandoLista.value; };
const seleccionarProveedor = (prov) => { 
    proveedorSeleccionado.value = prov; mostrarSugerencias.value = false; busqueda.value = ''; 
    errores.value.proveedor = false; 
};
const quitarProveedor = () => proveedorSeleccionado.value = null;

const prepararEdicion = (compra) => {
  let fechaSegura = new Date().toISOString().split('T')[0];
  if (compra.ComFecha) fechaSegura = new Date(compra.ComFecha).toISOString().split('T')[0];

  formulario.value = {
    fecha: fechaSegura, numero: compra.ComNumero || '', duiProveedor: compra.ComDuiProve || '',
    claseDocumento: compra.ComClase || '4. DOCUMENTO TRIBUTARIO DTE',
    tipoDocumento: compra.ComTipo || '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: compra.ComTipoOpeRenta || '1. GRAVADA',
    clasificacion: compra.ComClasiRenta || '2. GASTO',
    sector: compra.ComSecNum || '2. COMERCIO',
    tipoCostoGasto: compra.ComTipoCostoGasto || '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: parseFloat(compra.ComIntGrav || 0).toFixed(2),
    internacionalesGravBienes: parseFloat(compra.ComInternacGravBienes || 0).toFixed(2),
    importacionesGravBienes: parseFloat(compra.ComImportGravBienes || 0).toFixed(2),
    importacionesGravServicios: parseFloat(compra.ComImportGravServicios || 0).toFixed(2),
    internasExentas: parseFloat(compra.ComIntExe || 0).toFixed(2),
    internacionalesExentas: parseFloat(compra.ComInternacioExe || 0).toFixed(2),
    importacionesNoSujetas: parseFloat(compra.ComImpExeNoSujetas || 0).toFixed(2),
    iva: parseFloat(compra.ComCredFiscal || 0).toFixed(2),
    total: parseFloat(compra.ComTotal || 0).toFixed(2)
  };
  
  const provEncontrado = todosLosProveedores.value.find(p => p.ProvNIT === compra.proveedor_ProvNIT);
  proveedorSeleccionado.value = provEncontrado || { ProvNIT: compra.proveedor_ProvNIT, ProvNombre: compra.ComNomProve || 'Proveedor Histórico' };
  
  errores.value = { proveedor: false, fecha: false, numero: false, internas: false };
  modoEdicion.value = true;
  idEdicion.value = compra.idcompras;
  mostrandoLista.value = false; 
};

const cancelarEdicion = () => { resetForm(); modoEdicion.value = false; idEdicion.value = null; };
const resetForm = () => {
  formulario.value = { 
    fecha: new Date().toISOString().split('T')[0], numero: '', duiProveedor: '',
    claseDocumento: '4. DOCUMENTO TRIBUTARIO DTE', tipoDocumento: '03 COMPROBANTE DE CREDITO FISCAL',
    tipoOperacion: '1. GRAVADA', clasificacion: '2. GASTO', sector: '2. COMERCIO', tipoCostoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    internasGravadas: '0.00', internacionalesGravBienes: '0.00', importacionesGravBienes: '0.00', importacionesGravServicios: '0.00',
    internasExentas: '0.00', internacionalesExentas: '0.00', importacionesNoSujetas: '0.00', iva: '0.00', total: '0.00'
  };
  proveedorSeleccionado.value = null;
  errores.value = { proveedor: false, fecha: false, numero: false, internas: false };
};

const cargarDatos = async () => {
  try {
    const [resProv, resCompras] = await Promise.all([axios.get(API_PROVEEDORES), axios.get(API_COMPRAS)]);
    todosLosProveedores.value = resProv.data;
    listaCompras.value = resCompras.data;
  } catch (error) { console.error("Error cargando datos", error); }
};

const guardarCompra = async () => {
  // VALIDACIÓN MANUAL ANTES DE ENVIAR
  errores.value.proveedor = !proveedorSeleccionado.value;
  errores.value.fecha = !formulario.value.fecha;
  errores.value.numero = !formulario.value.numero;
  // Validamos que Internas Gravadas no esté vacío (puede ser 0 si es exenta, pero debe tener formato)
  errores.value.internas = formulario.value.internasGravadas === '';

  if (errores.value.proveedor || errores.value.fecha || errores.value.numero || errores.value.internas) {
      alert("Por favor complete los campos obligatorios marcados en rojo.");
      return;
  }

  cargando.value = true;
  const payload = { 
      ...formulario.value, 
      nitProveedor: proveedorSeleccionado.value.ProvNIT, 
      nombreProveedor: proveedorSeleccionado.value.ProvNombre,
      // Conversión a números para la BD
      internasGravadas: parseFloat(formulario.value.internasGravadas) || 0,
      internacionalesGravBienes: parseFloat(formulario.value.internacionalesGravBienes) || 0,
      importacionesGravBienes: parseFloat(formulario.value.importacionesGravBienes) || 0,
      importacionesGravServicios: parseFloat(formulario.value.importacionesGravServicios) || 0,
      internasExentas: parseFloat(formulario.value.internasExentas) || 0,
      internacionalesExentas: parseFloat(formulario.value.internacionalesExentas) || 0,
      importacionesNoSujetas: parseFloat(formulario.value.importacionesNoSujetas) || 0,
      iva: parseFloat(formulario.value.iva) || 0,
      total: parseFloat(formulario.value.total) || 0
  };

  try {
    if (modoEdicion.value) await axios.put(`${API_COMPRAS}/${idEdicion.value}`, payload);
    else await axios.post(API_COMPRAS, payload);
    mensaje.value = modoEdicion.value ? '¡Actualizado!' : '¡Guardado!';
    tipoMensaje.value = 'success';
    await cargarDatos(); 
    setTimeout(() => { mensaje.value = ''; if (modoEdicion.value) cancelarEdicion(); else resetForm(); mostrandoLista.value = true; }, 1500);
  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = error.response?.data?.message || 'Error en el servidor';
  } finally { cargando.value = false; }
};

const eliminarCompra = async (id) => { if(confirm('¿Eliminar?')) { try { await axios.delete(`${API_COMPRAS}/${id}`); await cargarDatos(); } catch (e) { alert('Error'); } } };
const formatearFecha = (f) => f ? (new Date(f).toISOString().split('T')[0]) : '---';
const obtenerCodigo = (t) => t ? t.split('.')[0].split(' ')[0] : '??';

onMounted(cargarDatos);
</script>

<style scoped>
.compras-container { padding: 2rem; background: #f0f2f5; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; max-width: 1000px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }
.btn-toggle { background: #55C2B7; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-volver { background: #666; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; }

/* Formulario */
.card-form, .card-lista-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1200px; margin: 0 auto; border-top: 5px solid #55C2B7; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.grid-fiscal { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.grid-montos { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.form-group { display: flex; flex-direction: column; }
label { font-weight: bold; margin-bottom: 5px; color: #555; font-size: 0.85rem; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.select-destacado { border: 2px solid #b2dfdb; background-color: #fafdff; font-weight: 500; font-size: 0.8rem;}

/* Estilos de Error */
.required { color: #d32f2f; margin-left: 3px; }
.input-error { border: 2px solid #d32f2f !important; background-color: #ffebee; }
.error-borde { border: 2px solid #d32f2f; border-radius: 8px; padding: 10px; background-color: #ffebee; }
.msg-error { color: #d32f2f; font-size: 0.75rem; margin-top: 3px; font-weight: bold; }

/* Estilos de Montos */
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
.nota-edit { color: #f57c00; font-size: 0.8rem; display: block; width: 100%; margin-top: 5px; }

/* Buscador y Tabla */
.buscador-wrapper { position: relative; }
.input-buscador { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; }
.lista-sugerencias { position: absolute; background: white; width: 100%; border: 1px solid #ddd; z-index: 10; list-style: none; padding: 0; max-height: 200px; overflow-y: auto; }
.lista-sugerencias li { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
.lista-sugerencias li:hover { background: #e0f7fa; }
.proveedor-seleccionado { background: #e0f7fa; padding: 10px; border: 1px solid #55C2B7; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
.btn-cambiar { background: none; border: none; color: #d32f2f; text-decoration: underline; cursor: pointer; }

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
</style>