<template>
  <MainLayout>
    <div class="ventas-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🏢 Ventas Crédito Fiscal</h1>
          <p class="subtitle">Emisión de Comprobantes de Crédito Fiscal (CCF)</p>
        </div>
        
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">
            {{ mostrandoLista ? '➕ Nuevo CCF' : '📋 Ver Historial' }}
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar CCF' : '✨ Nuevo Crédito Fiscal' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Modificando registro existente' : 'Documento para Contribuyentes' }}</span>
          </div>

          <form @submit.prevent="guardarVenta" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">📄 Detalles del Documento</h3>
              
              <div class="form-grid three-cols">
                <div class="form-group">
                  <label class="form-label">Fecha Emisión <span class="text-danger">*</span></label>
                  <input type="date" v-model="formulario.fecha" class="form-control" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Número CCF <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.numero" class="form-control" placeholder="0000" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Serie (Opcional)</label>
                  <input type="text" v-model="formulario.serie" class="form-control" placeholder="SERIE">
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">🏢 Cliente (Contribuyente)</h3>
              
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nombre / Razón Social <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.cliente" class="form-control" placeholder="Nombre de la Empresa o Contribuyente" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">NRC (Registro) <span class="text-danger">*</span></label>
                  <input type="text" v-model="formulario.nrc" class="form-control" placeholder="000000-0" required>
                </div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">💰 Montos de la Operación</h3>
              
              <div class="montos-wrapper">
                
                <div class="monto-group">
                  <label class="monto-label">Ventas Gravadas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" 
                           v-model="formulario.gravadas" 
                           step="0.01" 
                           class="form-control monto-input" 
                           placeholder="0.00"
                           @blur="formatearDecimal('gravadas')">
                  </div>
                </div>

                <div class="monto-group">
                  <label class="monto-label text-success">13% Débito Fiscal</label>
                  <div class="input-wrapper">
                    <span class="currency text-success">+</span>
                    <input type="number" 
                           v-model="formulario.debitoFiscal" 
                           step="0.01" 
                           class="form-control monto-input text-success" 
                           placeholder="0.00"
                           @input="recalcularTotal"
                           @blur="formatearDecimal('debitoFiscal')">
                  </div>
                  <small class="text-xs text-muted">Auto-calculado (editable)</small>
                </div>

                <div class="monto-group">
                  <label class="monto-label">Ventas Exentas</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" 
                           v-model="formulario.exentas" 
                           step="0.01" 
                           class="form-control monto-input" 
                           placeholder="0.00"
                           @blur="formatearDecimal('exentas')">
                  </div>
                </div>

                <div class="monto-group total-group">
                  <label class="monto-label">TOTAL A COBRAR</label>
                  <div class="input-wrapper">
                    <span class="currency">$</span>
                    <input v-model="formulario.total" type="text" class="form-control total-input" readonly>
                  </div>
                </div>

              </div>
              
              <details class="advanced-options">
                 <summary>Ver Retenciones y Percepciones</summary>
                 <div class="form-grid four-cols mt-2">
                    <div class="form-group">
                       <label class="form-label text-muted">Ventas No Sujetas</label>
                       <input type="number" v-model="formulario.noSujetas" step="0.01" class="form-control form-control-sm" @blur="formatearDecimal('noSujetas')">
                    </div>
                    <div class="form-group">
                       <label class="form-label text-danger">Retención IVA (1%)</label>
                       <input type="number" v-model="formulario.retencion" step="0.01" class="form-control form-control-sm" @blur="formatearDecimal('retencion')">
                    </div>
                    <div class="form-group">
                       <label class="form-label text-success">Percepción IVA (1%)</label>
                       <input type="number" v-model="formulario.percepcion" step="0.01" class="form-control form-control-sm" @blur="formatearDecimal('percepcion')">
                    </div>
                 </div>
              </details>

            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">
                {{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar CCF' : '💾 Guardar CCF') }}
              </button>
            </div>

            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>

          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between">
             <h3>📋 Historial de Créditos Fiscales</h3>
             <div class="search-wrapper">
                <input type="text" v-model="filtro" placeholder="🔍 Buscar por cliente, NRC o número..." class="form-control search-list">
             </div>
          </div>
          
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente (NRC)</th>
                  <th>N° CCF</th>
                  <th class="text-right">Gravado</th>
                  <th class="text-right text-success">Débito 13%</th>
                  <th class="text-right">Total</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="venta in ventasFiltradas" :key="venta.id">
                  <td>{{ formatearFecha(venta.fecha) }}</td>
                  <td>
                    <div class="fw-bold text-dark">{{ venta.cliente }}</div>
                    <small class="text-muted">{{ venta.nrc }}</small>
                  </td>
                  <td>
                    <span class="doc-number">{{ venta.numero }}</span>
                  </td>
                  <td class="text-right text-muted">${{ parseFloat(venta.gravadas || 0).toFixed(2) }}</td>
                  <td class="text-right fw-bold text-success">+${{ parseFloat(venta.debitoFiscal || 0).toFixed(2) }}</td>
                  <td class="text-right fw-bold text-dark">${{ parseFloat(venta.total || 0).toFixed(2) }}</td>
                  <td class="text-center">
                    <button class="btn-icon" @click="prepararEdicion(venta)" title="Editar">✏️</button>
                    <button class="btn-icon text-danger" @click="eliminarVenta(venta.id)" title="Eliminar">🗑️</button>
                  </td>
                </tr>
                <tr v-if="ventasFiltradas.length === 0">
                  <td colspan="7" class="text-center py-4 text-muted">No se encontraron registros.</td>
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
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/ventas-credito`; // Ajusta según tu backend real

// --- ESTADOS ---
const formulario = ref({
    fecha: new Date().toISOString().split('T')[0],
    numero: '', serie: '', cliente: '', nrc: '',
    gravadas: '0.00', debitoFiscal: '0.00',
    exentas: '0.00', noSujetas: '0.00',
    retencion: '0.00', percepcion: '0.00',
    total: '0.00'
});

const listaVentas = ref([]); 
const mostrandoLista = ref(false);
const modoEdicion = ref(false);
const idEdicion = ref(null);
const cargando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('');
const filtro = ref('');

// --- CÁLCULO AUTOMÁTICO DE DÉBITO FISCAL (IVA 13%) ---
watch(() => formulario.value.gravadas, (val) => {
    const gravado = parseFloat(val) || 0;
    // Calculamos el 13% automáticamente
    formulario.value.debitoFiscal = (gravado * 0.13).toFixed(2);
    calcularTotalGeneral();
});

// Watcher para recalcular total si cambian otros valores
watch(() => [formulario.value.exentas, formulario.value.noSujetas, formulario.value.retencion, formulario.value.percepcion], () => {
    calcularTotalGeneral();
});

const calcularTotalGeneral = () => {
    const g = parseFloat(formulario.value.gravadas) || 0;
    const df = parseFloat(formulario.value.debitoFiscal) || 0;
    const e = parseFloat(formulario.value.exentas) || 0;
    const ns = parseFloat(formulario.value.noSujetas) || 0;
    const ret = parseFloat(formulario.value.retencion) || 0;
    const per = parseFloat(formulario.value.percepcion) || 0;

    // Total = Gravado + Débito Fiscal + Exentas + No Sujetas - Retención + Percepción
    formulario.value.total = (g + df + e + ns - ret + per).toFixed(2);
};

// Función para recalcular si el usuario edita el IVA manualmente
const recalcularTotal = () => {
    calcularTotalGeneral();
};

const ventasFiltradas = computed(() => {
    if (!filtro.value) return listaVentas.value;
    const txt = filtro.value.toLowerCase();
    return listaVentas.value.filter(v => 
        (v.cliente && v.cliente.toLowerCase().includes(txt)) || 
        (v.numero && v.numero.includes(txt)) ||
        (v.nrc && v.nrc.includes(txt))
    );
});

// --- MÉTODOS ---
const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(valor) ? valor.toFixed(2) : '0.00';
};

const cargarVentas = async () => {
    try {
        // Simulación temporal (Descomentar axios cuando tengas API)
        // const res = await axios.get(API_URL);
        // listaVentas.value = res.data;
        
        // Datos dummy de prueba
        if (listaVentas.value.length === 0) {
            listaVentas.value = [
                { id: 1, fecha: '2023-10-27', cliente: 'Distribuidora El Sol', nrc: '123456-7', numero: '0050', gravadas: '100.00', debitoFiscal: '13.00', total: '113.00' }
            ];
        }
    } catch (error) { console.error("Error cargando ventas", error); }
};

const guardarVenta = async () => {
    cargando.value = true;
    calcularTotalGeneral(); // Asegurar cálculo final

    try {
        if(modoEdicion.value) {
            // await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            // Simulación update
            const index = listaVentas.value.findIndex(v => v.id === idEdicion.value);
            if (index !== -1) listaVentas.value[index] = { ...formulario.value, id: idEdicion.value };
            
            tipoMensaje.value = 'success';
            mensaje.value = '¡CCF actualizado correctamente!';
        } else {
            // await axios.post(API_URL, formulario.value);
            // Simulación insert
            listaVentas.value.unshift({ ...formulario.value, id: Date.now() });
            
            tipoMensaje.value = 'success';
            mensaje.value = '¡CCF guardado exitosamente!';
        }
        
        resetForm();
        setTimeout(() => { 
            mensaje.value = ''; 
            mostrandoLista.value = true; 
        }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error';
        mensaje.value = 'Error al procesar la venta.';
    } finally {
        cargando.value = false;
    }
};

const eliminarVenta = async (id) => {
    if(!confirm('¿Eliminar este registro de Crédito Fiscal?')) return;
    try {
        // await axios.delete(`${API_URL}/${id}`);
        listaVentas.value = listaVentas.value.filter(v => v.id !== id);
    } catch (e) { alert('Error'); }
};

const prepararEdicion = (venta) => {
    formulario.value = { ...venta };
    idEdicion.value = venta.id;
    modoEdicion.value = true;
    mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = {
        fecha: new Date().toISOString().split('T')[0],
        numero: '', serie: '', cliente: '', nrc: '',
        gravadas: '0.00', debitoFiscal: '0.00', exentas: '0.00', noSujetas: '0.00',
        retencion: '0.00', percepcion: '0.00', total: '0.00'
    };
    modoEdicion.value = false;
    idEdicion.value = null;
    mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarVentas);
</script>

<style scoped>
/* --- ESTILO MATERIAL DESVANECIDO (Uniforme en toda la app) --- */
.ventas-container {
  padding: 20px;
  background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%);
  height: 100%;
  overflow-y: auto;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* Cabecera */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

/* Tarjetas */
.card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(85, 194, 183, 0.15);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 20px;
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header {
  border-bottom: 1px solid #f0fdfa;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { 
  font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px;
}

/* Formularios */
.form-section { margin-bottom: 30px; }
.section-title { 
  font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; 
  border-left: 4px solid #55C2B7; padding-left: 12px; 
}

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }

.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

/* Inputs Modernos */
.form-control {
  width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937;
  background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem;
  transition: all 0.2s; box-sizing: border-box;
}
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

/* Montos */
.montos-wrapper { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #f3f4f6; }
.monto-group { flex: 1; min-width: 150px; }
.monto-label { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 6px; display: block; text-transform: uppercase; }
.input-wrapper { position: relative; }
.currency { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-weight: 600; font-size: 0.9rem; }
.monto-input { padding-left: 24px; font-weight: 600; text-align: right; color: #1f2937; }
.total-input { padding-left: 24px; font-weight: 800; color: #0d9488; border-color: #55C2B7; text-align: right; font-size: 1.25rem; background: #f0fdfa; }

.advanced-options summary { cursor: pointer; color: #55C2B7; font-size: 0.85rem; font-weight: 600; padding: 12px 0; user-select: none; transition: color 0.2s; }
.advanced-options summary:hover { color: #0d9488; text-decoration: underline; }

/* Botones */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem;
  border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:active { transform: translateY(1px); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-primary:hover { background-color: #45a89d; }
.btn-success { background-color: #10b981; color: white; }
.btn-success:hover { background-color: #059669; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-secondary:hover { background-color: #f3f4f6; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; }
.btn-icon:hover { background-color: #f9fafb; color: #111827; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* Tabla */
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }

/* Alertas */
.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.text-danger { color: #ef4444; }
.text-success { color: #10b981; }
.text-muted { color: #6b7280; }
.mt-2 { margin-top: 10px; }
.mt-3 { margin-top: 15px; }

@media (max-width: 768px) {
  .montos-wrapper { flex-direction: column; }
  .monto-group { width: 100%; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; }
  .header-actions .btn { width: 100%; }
}
</style>