<template>
  <div class="ventas-container">
    <div class="header-section">
      <h1>🧾 Ventas Consumidor Final</h1>
      <div class="header-buttons">
        <button @click="alternarVista" class="btn-toggle">
          {{ mostrandoLista ? '➕ Nuevo Día' : '📋 Ver Historial' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Menú</button>
      </div>
    </div>

    <div class="main-content">
      
      <div v-if="!mostrandoLista" class="card-form">
        <div class="form-header">
          <h2>{{ modoEdicion ? '✏️ Editando Registro' : '✨ Registro Diario' }}</h2>
          <p>Ingrese los datos correspondientes al día de venta.</p>
        </div>

        <form @submit.prevent="guardarVenta">
          
          <div class="seccion-grupo">
            <h3>📅 Datos del Documento</h3>
            <div class="form-row grid-3">
               <div class="form-group"><label>Fecha *</label><input type="date" v-model="formulario.fecha" required></div>
               <div class="form-group"><label>Clase Doc</label><select v-model="formulario.claseDoc"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
               <div class="form-group"><label>Tipo Doc</label><select v-model="formulario.tipoDoc"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
            </div>
            <div class="form-row grid-3">
               <div class="form-group"><label>N° Resolución</label><input type="text" v-model="formulario.resolucion"></div>
               <div class="form-group"><label>Serie Doc</label><input type="text" v-model="formulario.serie"></div>
               <div class="form-group"><label>N° Máquina</label><input type="text" v-model="formulario.maqRegistro"></div>
            </div>
          </div>

          <div class="seccion-grupo">
            <h3>🔢 Control de Correlativos</h3>
            <div class="form-row grid-4">
               <div class="form-group"><label>Control Int. DEL</label><input type="text" v-model="formulario.controlDel"></div>
               <div class="form-group"><label>Control Int. AL</label><input type="text" v-model="formulario.controlAl"></div>
               <div class="form-group"><label>Doc. DEL *</label><input type="text" v-model="formulario.docDel" required></div>
               <div class="form-group"><label>Doc. AL *</label><input type="text" v-model="formulario.docAl" required></div>
            </div>
          </div>

          <hr class="separador">

          <div class="seccion-montos">
            <h3>💵 Detalle de Ventas</h3>
            
            <div class="form-row grid-3">
                <div class="form-group">
                  <label>Ventas Exentas</label>
                  <input type="number" v-model="formulario.exentas" step="0.01" class="input-sm" @blur="formatearDecimal('exentas')">
                </div>
                <div class="form-group">
                  <label>Int. Exentas No Suj. Prop.</label>
                  <input type="number" v-model="formulario.exentasNoSujetasProp" step="0.01" class="input-sm" @blur="formatearDecimal('exentasNoSujetasProp')">
                </div>
                <div class="form-group">
                  <label>Ventas No Sujetas</label>
                  <input type="number" v-model="formulario.noSujetas" step="0.01" class="input-sm" @blur="formatearDecimal('noSujetas')">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                  <label>Ventas Gravadas Locales *</label>
                  <input type="number" v-model="formulario.gravadas" step="0.01" class="input-monto principal" required @blur="formatearDecimal('gravadas')">
                </div>
            </div>

            <h4 class="subtitulo-seccion">🌍 Exportaciones y Otros</h4>
            <div class="form-row grid-3">
                <div class="form-group"><label>Exp. Centroamérica</label><input type="number" v-model="formulario.expCentroAmerica" step="0.01" class="input-sm" @blur="formatearDecimal('expCentroAmerica')"></div>
                <div class="form-group"><label>Exp. Fuera CA</label><input type="number" v-model="formulario.expFueraCentroAmerica" step="0.01" class="input-sm" @blur="formatearDecimal('expFueraCentroAmerica')"></div>
                <div class="form-group"><label>Exp. Servicios</label><input type="number" v-model="formulario.expServicios" step="0.01" class="input-sm" @blur="formatearDecimal('expServicios')"></div>
            </div>
            <div class="form-row grid-2">
                <div class="form-group"><label>Vtas. Zonas Francas / DPA</label><input type="number" v-model="formulario.ventasZonaFranca" step="0.01" class="input-sm" @blur="formatearDecimal('ventasZonaFranca')"></div>
                <div class="form-group"><label>Vtas. Terceros No Domic.</label><input type="number" v-model="formulario.ventasTerceros" step="0.01" class="input-sm" @blur="formatearDecimal('ventasTerceros')"></div>
            </div>
            
            <div class="resultado-calculo">
                <div class="fila-res total">
                    <span>TOTAL VENTAS:</span> 
                    <input type="number" v-model="formulario.total" step="0.01" class="input-total" readonly>
                </div>
            </div>
          </div>

          <div class="seccion-grupo">
             <div class="form-row grid-3">
                <div class="form-group"><label>Tipo Operación</label><select v-model="formulario.tipoOpera"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
                <div class="form-group"><label>Tipo Ingreso</label><select v-model="formulario.tipoIngreso"><option v-for="op in opcionesIngreso" :key="op" :value="op">{{ op }}</option></select></div>
                <div class="form-group"><label>Anexo</label><input type="text" v-model="formulario.anexo"></div>
             </div>
          </div>

          <div class="actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn-guardar" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar' : '💾 Guardar Día') }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="mostrandoLista" class="card-lista-full">
        <h3>📄 Libro de Ventas (Diario)</h3>
        <div class="tabla-container">
          <table>
            <thead>
              <tr>
                  <th>Fecha</th>
                  <th>Del / Al</th>
                  <th>Exentas</th>
                  <th>Gravadas</th>
                  <th>Total</th>
                  <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in listaVentas" :key="item.idconsfinal">
                <td>{{ formatearFecha(item.ConsFecha) }}</td>
                <td>{{ item.ConsNumDocDEL }} - {{ item.ConsNumDocAL }}</td>
                <td>$ {{ parseFloat(item.ConsVtaExentas || 0).toFixed(2) }}</td>
                <td class="monto-gravado">$ {{ parseFloat(item.ConsVtaGravLocales || 0).toFixed(2) }}</td>
                <td class="monto-total">$ {{ parseFloat(item.ConsTotalVta || 0).toFixed(2) }}</td>
                <td class="acciones-td">
                  <button @click="prepararEdicion(item)" class="btn-accion btn-editar">✏️</button>
                  <button @click="eliminarVenta(item.idconsfinal)" class="btn-accion btn-borrar">🗑️</button>
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
import { ref, watch, onMounted } from 'vue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + '/api/ventas-cf';

// LISTAS REUTILIZADAS
const opcionesClase = ["IMPRESO", "DTE", "OTROS"];
const opcionesTipo = ["01 FACTURA", "02 COMPROBANTE", "12 DCL MERCANCIAS", "14 SUJETO EXCLUIDO"];
const opcionesOperacion = ["1. GRAVADA", "2. EXENTA", "3. NO SUJETA", "4. MIXTA"];
const opcionesIngreso = ["1. INGRESO", "2. OTROS", "3. DEVOLUCION"];

const formulario = ref({
    fecha: new Date().toISOString().split('T')[0],
    claseDoc: 'IMPRESO', tipoDoc: '01 FACTURA', resolucion: '', serie: '',
    controlDel: '', controlAl: '', docDel: '', docAl: '', maqRegistro: '',
    exentas: '0.00', exentasNoSujetasProp: '0.00', noSujetas: '0.00', gravadas: '0.00',
    expCentroAmerica: '0.00', expFueraCentroAmerica: '0.00', expServicios: '0.00',
    ventasZonaFranca: '0.00', ventasTerceros: '0.00',
    total: '0.00',
    tipoOpera: '1. GRAVADA', tipoIngreso: '1. INGRESO', anexo: ''
});

const listaVentas = ref([]);
const mostrandoLista = ref(false);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);

// CÁLCULO TOTAL (SUMA DE TODO)
watch(() => [
    formulario.value.exentas, formulario.value.exentasNoSujetasProp, formulario.value.noSujetas, 
    formulario.value.gravadas, 
    formulario.value.expCentroAmerica, formulario.value.expFueraCentroAmerica, formulario.value.expServicios,
    formulario.value.ventasZonaFranca, formulario.value.ventasTerceros
], () => {
    const sum = (parseFloat(formulario.value.exentas)||0) + 
                (parseFloat(formulario.value.exentasNoSujetasProp)||0) +
                (parseFloat(formulario.value.noSujetas)||0) + 
                (parseFloat(formulario.value.gravadas)||0) + 
                (parseFloat(formulario.value.expCentroAmerica)||0) +
                (parseFloat(formulario.value.expFueraCentroAmerica)||0) +
                (parseFloat(formulario.value.expServicios)||0) +
                (parseFloat(formulario.value.ventasZonaFranca)||0) +
                (parseFloat(formulario.value.ventasTerceros)||0);
    formulario.value.total = sum.toFixed(2);
});

const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(valor) ? valor.toFixed(2) : '0.00';
};

const cargarDatos = async () => {
    try {
        const res = await axios.get(API_URL);
        listaVentas.value = res.data;
    } catch (e) { console.error(e); }
};

const guardarVenta = async () => {
    cargando.value = true;
    const payload = {
        ...formulario.value,
        // Convertir a números
        exentas: parseFloat(formulario.value.exentas) || 0,
        exentasNoSujetasProp: parseFloat(formulario.value.exentasNoSujetasProp) || 0,
        noSujetas: parseFloat(formulario.value.noSujetas) || 0,
        gravadas: parseFloat(formulario.value.gravadas) || 0,
        expCentroAmerica: parseFloat(formulario.value.expCentroAmerica) || 0,
        expFueraCentroAmerica: parseFloat(formulario.value.expFueraCentroAmerica) || 0,
        expServicios: parseFloat(formulario.value.expServicios) || 0,
        ventasZonaFranca: parseFloat(formulario.value.ventasZonaFranca) || 0,
        ventasTerceros: parseFloat(formulario.value.ventasTerceros) || 0,
        total: parseFloat(formulario.value.total) || 0
    };

    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, payload);
            alert('Actualizado');
        } else {
            await axios.post(API_URL, payload);
            alert('Guardado');
        }
        await cargarDatos();
        resetForm();
        mostrandoLista.value = true;
    } catch (e) { alert('Error'); console.error(e); } 
    finally { cargando.value = false; }
};

const eliminarVenta = async (id) => {
    if(!confirm('¿Eliminar?')) return;
    try { await axios.delete(`${API_URL}/${id}`); cargarDatos(); } catch(e) { alert('Error'); }
};

const prepararEdicion = (item) => {
    let fechaSegura = item.ConsFecha ? new Date(item.ConsFecha).toISOString().split('T')[0] : '';
    formulario.value = {
        fecha: fechaSegura,
        claseDoc: item.ConsClaseDoc, tipoDoc: item.ConsTipoDoc, resolucion: item.ConsNumResolu, serie: item.ConsSerieDoc,
        controlDel: item.ConsNumContIntDEL, controlAl: item.ConsNumContIntAL,
        docDel: item.ConsNumDocDEL, docAl: item.ConsNumDocAL, maqRegistro: item.ConsNumMaqRegistro,
        
        exentas: parseFloat(item.ConsVtaExentas || 0).toFixed(2),
        exentasNoSujetasProp: parseFloat(item.ConsVtaIntExenNoSujProporcio || 0).toFixed(2),
        noSujetas: parseFloat(item.ConsVtaNoSujetas || 0).toFixed(2),
        gravadas: parseFloat(item.ConsVtaGravLocales || 0).toFixed(2),
        expCentroAmerica: parseFloat(item.ConsExpDentAreaCA || 0).toFixed(2),
        expFueraCentroAmerica: parseFloat(item.ConsExpFueraAreaCA || 0).toFixed(2),
        expServicios: parseFloat(item.ConsExpServicios || 0).toFixed(2),
        ventasZonaFranca: parseFloat(item.ConsVtaZonaFrancasDPA || 0).toFixed(2),
        ventasTerceros: parseFloat(item.ConsVtaCtaTercNoDomici || 0).toFixed(2),
        total: parseFloat(item.ConsTotalVta || 0).toFixed(2),
        
        tipoOpera: item.ConsTipoOpera, tipoIngreso: item.ConsTipoIngreso, anexo: item.ConsNumAnexo
    };
    idEdicion.value = item.idconsfinal;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const resetForm = () => {
    formulario.value = {
        fecha: new Date().toISOString().split('T')[0], claseDoc: 'IMPRESO', tipoDoc: '01 FACTURA',
        exentas: '0.00', exentasNoSujetasProp: '0.00', noSujetas: '0.00', gravadas: '0.00',
        expCentroAmerica: '0.00', expFueraCentroAmerica: '0.00', expServicios: '0.00',
        ventasZonaFranca: '0.00', ventasTerceros: '0.00', total: '0.00',
        tipoOpera: '1. GRAVADA', tipoIngreso: '1. INGRESO', anexo: ''
    };
    modoEdicion.value = false;
    idEdicion.value = null;
};

const alternarVista = () => { if(modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

<style scoped>
.ventas-container { padding: 2rem; background: #e3f2fd; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; margin-bottom: 2rem; max-width: 1000px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }
.btn-toggle { background: #1976d2; color: white; padding: 10px 20px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; }
.btn-volver { background: #666; color: white; padding: 10px; border-radius: 8px; border: none; cursor: pointer; }
.card-form, .card-lista-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1000px; margin: 0 auto; border-top: 5px solid #1976d2; }

/* Grid Systems */
.form-row { display: grid; gap: 1rem; margin-top: 1rem; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

.form-group { display: flex; flex-direction: column; }
label { font-weight: bold; color: #555; font-size: 0.85rem; margin-bottom: 5px; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }

/* Sections */
.seccion-grupo { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; }
.seccion-grupo h3 { margin-top: 0; color: #1976d2; font-size: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }

.seccion-montos { background: #fffde7; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid #fff59d; }
.subtitulo-seccion { margin-top: 15px; margin-bottom: 5px; font-size: 0.9rem; color: #666; text-transform: uppercase; letter-spacing: 1px; }

.input-monto.principal { border-color: #1976d2; font-weight: bold; color: #1976d2; }
.input-total { border: 2px solid #1976d2; font-weight: bold; color: #1976d2; text-align: right; font-size: 1.2rem; }

.actions { margin-top: 1.5rem; display: flex; gap: 10px; }
.btn-guardar { flex: 1; background: #1976d2; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-cancelar { background: #999; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; }

/* Tabla */
.tabla-container { margin-top: 1rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px; border-bottom: 2px solid #eee; color: #777; }
td { padding: 10px; border-bottom: 1px solid #eee; }
.monto-gravado { color: #1565c0; font-weight: bold; }
.monto-total { color: #1976d2; font-weight: bold; font-size: 1.05rem; }
.btn-accion { background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px; }
</style>