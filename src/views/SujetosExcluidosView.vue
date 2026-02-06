<template>
  <div class="sujetos-container">
    <div class="header-section">
      <h1>🚫 Compras a Sujetos Excluidos</h1>
      <div class="header-buttons">
        <button @click="alternarVista" class="btn-toggle">
          {{ mostrandoLista ? '➕ Nuevo Registro' : '📋 Ver Lista' }}
        </button>
        <button @click="$router.push('/inicio')" class="btn-volver">⬅ Menú</button>
      </div>
    </div>

    <div class="main-content">
      
      <div v-if="!mostrandoLista" class="card-form">
        <div class="form-header">
          <h2>{{ modoEdicion ? '✏️ Editando Registro' : '✨ Nuevo Ingreso' }}</h2>
          <p>Ingrese los datos de la compra al sujeto excluido.</p>
        </div>

        <form @submit.prevent="guardarSujeto">
          
          <div class="form-row">
             <div class="form-group">
                <label>NIT Sujeto <span class="required">*</span></label>
                <input type="text" v-model="formulario.nit" required placeholder="0000-000000-000-0">
             </div>
             <div class="form-group">
                <label>Nombre <span class="required">*</span></label>
                <input type="text" v-model="formulario.nombre" required>
             </div>
          </div>

          <div class="form-row grid-3">
             <div class="form-group">
               <label>Fecha <span class="required">*</span></label>
               <input type="date" v-model="formulario.fecha" required>
             </div>
             <div class="form-group">
               <label>Serie</label>
               <input type="text" v-model="formulario.serie">
             </div>
             <div class="form-group">
               <label>No. Documento</label>
               <input type="text" v-model="formulario.numeroDoc">
             </div>
          </div>

          <div class="form-row grid-fiscal">
             <div class="form-group"><label>Clase</label><select v-model="formulario.claseDoc" class="select-destacado"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Tipo Doc</label><select v-model="formulario.tipoDoc" class="select-destacado"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Operación</label><select v-model="formulario.tipoOp" class="select-destacado"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Clasificación</label><select v-model="formulario.clasificacion" class="select-destacado"><option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Sector</label><select v-model="formulario.sector" class="select-destacado"><option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option></select></div>
             <div class="form-group"><label>Costo/Gasto</label><select v-model="formulario.costoGasto" class="select-destacado"><option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option></select></div>
          </div>

          <hr class="separador">

          <div class="seccion-montos">
            <h3>💰 Detalle de la Operación</h3>
            <div class="form-row">
                <div class="form-group">
                  <label>Monto Operación ($) <span class="required">*</span></label>
                  <input type="number" 
                         v-model="formulario.monto" 
                         step="0.01" 
                         min="0" 
                         class="input-monto principal" 
                         placeholder="0.00"
                         @blur="formatearDecimal('monto')">
                </div>
                <div class="form-group">
                  <label>Retención IVA (13%)</label>
                  <input type="number" 
                         v-model="formulario.retencion" 
                         step="0.01" 
                         class="input-monto secundario" 
                         placeholder="0.00"
                         @blur="formatearDecimal('retencion')">
                  <small>Calculado automáticamente</small>
                </div>
                <div class="form-group">
                  <label>Anexo</label>
                  <input type="number" v-model="formulario.anexo" class="input-sm" readonly>
                </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn-guardar" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '🔄 Actualizar' : '💾 Guardar Registro') }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="mostrandoLista" class="card-lista-full">
        <h3>📋 Registros de Sujetos Excluidos</h3>
        <div class="tabla-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sujeto (NIT/Nombre)</th>
                <th>Documento</th>
                <th>Monto</th>
                <th>Retención (13%)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in listaSujetos" :key="item.idComSujExclui">
                <td>{{ formatearFecha(item.ComprasSujExcluFecha) }}</td>
                <td>
                    <div class="prov-nombre">{{ item.ComprasSujExcluNom }}</div>
                    <small>{{ item.ComprasSujExcluNIT }}</small>
                </td>
                <td>{{ item.ComprasSujExcluSerieDoc }} - {{ item.ComprasSujExcluNumDoc }}</td>
                <td class="monto-total">$ {{ parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2) }}</td>
                <td class="negativo">$ {{ parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2) }}</td>
                <td class="acciones-td">
                  <button @click="prepararEdicion(item)" class="btn-accion btn-editar">✏️</button>
                  <button @click="eliminarSujeto(item.idComSujExclui)" class="btn-accion btn-borrar">🗑️</button>
                </td>
              </tr>
              <tr v-if="listaSujetos.length === 0">
                <td colspan="6" class="vacio">No hay registros guardados.</td>
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

const API_URL = import.meta.env.VITE_API_URL + '/api/sujetos';

// Listas reutilizadas (Con correcciones ortográficas)
const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO", "12. DECLARACION DE MERCANCIAS", "14. FACTURA DE SUJETO EXCLUIDO"]; 
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES", "0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES"];
const opcionesClasificacion = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. COSTO", "2. GASTO", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesSector = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. INDUSTRIA", "2. COMERCIO", "3. AGROPECUARIA", "4. SERVICIOS PROFESIONES, ARTES Y OFICIOS", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesCostoGasto = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. GASTO DE VENTA SIN DONACION", "2. GASTO DE ADMINISTRACION SIN DONACION", "3. GASTOS FINANCIEROS SIN DONACION", "4. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS/IMPORTACIONES", "5. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS INTERNO", "6. COSTOS INDIRECTOS DE FABRICACION", "7. MANO DE OBRA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];

// Inicialización como strings '0.00' para visualización
const formulario = ref({
    fecha: new Date().toISOString().split('T')[0],
    tipoDoc: '4. DOCUMENTO TRIBUTARIO DTE',
    nit: '', nombre: '', serie: '', numeroDoc: '',
    monto: '0.00', retencion: '0.00',
    tipoOp: '1. GRAVADA', clasificacion: '2. GASTO', sector: '4. SERVICIOS PROFESIONES, ARTES Y OFICIOS',
    costoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION',
    anexo: 5 
});

const listaSujetos = ref([]);
const mostrandoLista = ref(false);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);

// CÁLCULO AUTOMÁTICO DE RETENCIÓN 13%
watch(() => formulario.value.monto, (val) => {
    const monto = parseFloat(val) || 0;
    // Solo calculamos si el usuario está escribiendo el monto base
    formulario.value.retencion = (monto * 0.13).toFixed(2);
});

// Función de formateo visual (igual que en ComprasView)
const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    if (!isNaN(valor)) {
        formulario.value[campo] = valor.toFixed(2);
    } else {
        formulario.value[campo] = '0.00';
    }
};

const cargarDatos = async () => {
    try {
        const res = await axios.get(API_URL);
        listaSujetos.value = res.data;
    } catch (error) { console.error(error); }
};

const guardarSujeto = async () => {
    cargando.value = true;
    
    // Convertimos a números limpios antes de enviar
    const payload = {
        ...formulario.value,
        monto: parseFloat(formulario.value.monto) || 0,
        retencion: parseFloat(formulario.value.retencion) || 0
    };

    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, payload);
            alert('Actualizado correctamente');
        } else {
            await axios.post(API_URL, payload);
            alert('Guardado correctamente');
        }
        await cargarDatos();
        resetForm();
        mostrandoLista.value = true;
    } catch (error) {
        alert('Error al guardar');
        console.error(error);
    } finally {
        cargando.value = false;
    }
};

const eliminarSujeto = async (id) => {
    if(!confirm('¿Eliminar registro?')) return;
    try {
        await axios.delete(`${API_URL}/${id}`);
        cargarDatos();
    } catch(e) { alert('Error al eliminar'); }
};

const prepararEdicion = (item) => {
    let fechaSegura = item.ComprasSujExcluFecha ? new Date(item.ComprasSujExcluFecha).toISOString().split('T')[0] : '';
    
    formulario.value = {
        fecha: fechaSegura,
        tipoDoc: item.ComprasSujExcluTipoDoc,
        nit: item.ComprasSujExcluNIT,
        nombre: item.ComprasSujExcluNom,
        serie: item.ComprasSujExcluSerieDoc,
        numeroDoc: item.ComprasSujExcluNumDoc, 
        // Cargamos como string fixed(2)
        monto: parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2),
        retencion: parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2),
        tipoOp: item.ComprasSujExcluTipoOpera,
        clasificacion: item.ComprasSujExcluClasificacion,
        sector: item.ComprasSujExclusector,
        costoGasto: item.ComprasSujExcluTipoCostoGast,
        anexo: 5
    };
    idEdicion.value = item.idComSujExclui;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const resetForm = () => {
    formulario.value = {
        fecha: new Date().toISOString().split('T')[0],
        tipoDoc: '4. DOCUMENTO TRIBUTARIO DTE', nit: '', nombre: '', serie: '', numeroDoc: '',
        monto: '0.00', retencion: '0.00',
        tipoOp: '1. GRAVADA', clasificacion: '2. GASTO', sector: '4. SERVICIOS PROFESIONES, ARTES Y OFICIOS',
        costoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION', anexo: 5
    };
    modoEdicion.value = false;
    idEdicion.value = null;
};

const alternarVista = () => {
    if (modoEdicion) resetForm();
    mostrandoLista.value = !mostrandoLista.value;
};

const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

<style scoped>
/* Reutilizando estilos de ComprasView con toque morado */
.sujetos-container { padding: 2rem; background: #f0f2f5; min-height: 100vh; }
.header-section { display: flex; justify-content: space-between; margin-bottom: 2rem; max-width: 1000px; margin: 0 auto; }
.header-buttons { display: flex; gap: 10px; }
.btn-toggle { background: #673ab7; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; } 
.btn-toggle:hover { background: #5e35b1; }
.btn-volver { background: #666; color: white; padding: 10px; border-radius: 8px; border: none; cursor: pointer; }

.card-form, .card-lista-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 1000px; margin: 0 auto; border-top: 5px solid #673ab7; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-fiscal { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.form-group { display: flex; flex-direction: column; }

label { font-weight: bold; color: #555; font-size: 0.85rem; margin-bottom: 5px; }
input, select { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.select-destacado { border: 2px solid #d1c4e9; background-color: #f3e5f5; }

/* Montos */
.seccion-montos { background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid #eee; }
.input-monto.principal { border-color: #673ab7; font-weight: bold; font-size: 1.1rem; color: #333; }
.input-monto.secundario { background: #eee; color: #d32f2f; font-weight: bold; font-size: 1.1rem; }
.input-sm { width: 80px; text-align: center; }

.actions { margin-top: 1.5rem; display: flex; gap: 10px; }
.btn-guardar { flex: 1; background: #673ab7; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-guardar:disabled { background: #ccc; }
.btn-cancelar { background: #999; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; }

/* Tabla */
.tabla-container { margin-top: 1rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px; border-bottom: 2px solid #eee; color: #777; }
td { padding: 10px; border-bottom: 1px solid #eee; }
.monto-total { color: #673ab7; font-weight: bold; }
.negativo { color: #d32f2f; font-weight: bold; }
.btn-accion { background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px; }
.btn-accion:hover { background: #e0e0e0; }
.vacio { text-align: center; color: #999; font-style: italic; padding: 20px; }
</style>