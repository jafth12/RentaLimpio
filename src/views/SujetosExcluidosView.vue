<template>
  <MainLayout>
    <div class="rl-view">
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🚫 Sujetos Excluidos</h1>
          <p class="rl-view-subtitle">Compras a proveedores no inscritos en IVA · Anexo 5</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">{{ mostrandoLista ? '➕ Nuevo Registro' : '📋 Ver Listado' }}</button>
      </div>

      <div v-if="!mostrandoLista" class="rl-card">
        <div class="rl-card-header">
          <div><h2>{{ modoEdicion ? '✏️ Editar Registro' : '✨ Nueva Compra a Sujeto Excluido' }}</h2></div>
          <span class="rl-badge rl-badge-info">{{ modoEdicion ? 'Modificando registro' : 'Documento F-14E o equivalente' }}</span>
        </div>
        <form @submit.prevent="guardarSujeto">
          <!-- Sección: Documento -->
          <div class="rl-form-section">
            <p class="rl-section-title">Detalles del Documento</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Empresa / Declarante <span class="req">*</span></label>
                <select v-model="formulario.iddeclaNIT" class="rl-select" required>
                  <option value="" disabled>-- Seleccione Empresa --</option>
                  <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </select>
              </div>
              <div class="rl-field" style="display:flex;gap:10px;flex-direction:column">
                <label class="rl-label">Mes y Año a Declarar <span class="req">*</span></label>
                <div style="display:flex;gap:10px">
                  <select v-model="formulario.mesDeclarado" class="rl-select" required>
                    <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                  <input type="number" v-model="formulario.anioDeclarado" class="rl-input" style="width:90px" min="2000" required>
                </div>
              </div>
            </div>
            <div class="rl-grid rl-grid-3 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Fecha Emisión <span class="req">*</span></label>
                <input type="date" v-model="formulario.fecha" class="rl-input" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Serie (Opcional)</label>
                <input type="text" v-model="formulario.serie" class="rl-input" placeholder="SERIE">
              </div>
            </div>
            <!-- UUID + Sello + DTE -->
            <div class="rl-dte-group rl-mt-3">
              <div class="rl-field" style="grid-column:1/-1">
                <label class="rl-label" style="color:#0369a1">🔑 Código de Generación (UUID) <span class="req">*</span></label>
                <input type="text" v-model="formulario.uuid_dte" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número DTE-14 <span class="req">*</span></label>
                <div class="rl-dte-wrap">
                  <span class="rl-dte-prefix">DTE</span>
                  <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e,'part1',2)" class="rl-dte-part w2" placeholder="14">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="rl-dte-part letter" placeholder="S" @focus="$event.target.select()">
                  <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e,'part2',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">P</span>
                  <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e,'part3',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e,'part4',15)" class="rl-dte-part grow" placeholder="Correlativo...">
                </div>
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción (solo DTE)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 202542266B0EFC5743...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos</span>
              </div>
            </div>
          </div>

          <!-- Sección: Sujeto -->
          <div class="rl-form-section">
            <p class="rl-section-title">Datos del Sujeto</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">NIT / DUI <span class="req">*</span></label>
                <input type="text" v-model="formulario.nit" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Nombre Completo <span class="req">*</span></label>
                <input type="text" v-model="formulario.nombre" class="rl-input" required>
              </div>
            </div>
          </div>

          <!-- Sección: Montos -->
          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Clasificación y Montos</p>
            <div class="rl-grid rl-grid-4" style="margin-bottom:16px">
              <div class="rl-field">
                <label class="rl-label">Tipo de Operación</label>
                <select v-model="formulario.tipoOp" class="rl-select">
                  <option value="1">1. GRAVADA</option><option value="2">2. NO GRAVADA O EXENTA</option>
                  <option value="3">3. EXCLUIDO O NO CONSTITUYE RENTA</option><option value="4">4. MIXTA</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Clasificación</label>
                <select v-model="formulario.clasificacion" class="rl-select">
                  <option value="1">1. COSTO</option><option value="2">2. GASTO</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Sector</label>
                <select v-model="formulario.sector" class="rl-select">
                  <option value="1">1. INDUSTRIA</option><option value="2">2. COMERCIO</option>
                  <option value="3">3. AGROPECUARIA</option><option value="4">4. SERVICIOS</option>
                </select>
              </div>
              <div class="rl-field">
                <label class="rl-label">Costo / Gasto</label>
                <select v-model="formulario.costoGasto" class="rl-select">
                  <option value="1">1. GASTO DE VENTA</option><option value="2">2. GASTO ADMINISTRACIÓN</option>
                  <option value="3">3. GASTOS FINANCIEROS</option><option value="4">4. COSTO ARTÍCULOS</option>
                  <option value="7">7. MANO DE OBRA</option>
                </select>
              </div>
            </div>
            <div class="rl-montos">
              <div class="rl-monto-item">
                <span class="rl-monto-label">Monto Operación</span>
                <div class="rl-monto-wrap"><span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.monto" step="0.01" class="rl-input rl-input-monto" placeholder="0.00" @blur="formatearDecimal('monto')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label" style="color:#ef4444">Retención Renta (10%)</span>
                <div class="rl-monto-wrap"><span class="rl-monto-currency" style="color:#ef4444">-</span>
                  <input type="number" v-model="formulario.retencion" step="0.01" class="rl-input rl-input-monto" style="color:#ef4444" placeholder="0.00" @blur="formatearDecimal('retencion')">
                </div>
                <span class="rl-sello-hint">Calculado automático</span>
              </div>
              <div class="rl-monto-item is-total">
                <span class="rl-monto-label">TOTAL A PAGAR</span>
                <div class="rl-monto-wrap"><span class="rl-monto-currency" style="color:#0d9488">$</span>
                  <input :value="totalNeto" type="text" class="rl-input rl-input-total" readonly>
                </div>
              </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Guardando...' : (modoEdicion ? '✔ Actualizar Registro' : '💾 Guardar en BD') }}
            </button>
          </div>
          <div v-if="mensaje" class="rl-alert" :class="tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger'">{{ mensaje }}</div>
        </form>
      </div>

      <!-- LISTADO -->
      <div v-else class="rl-card">
        <div class="rl-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <h3>📋 Historial de Sujetos Excluidos</h3>
            <span class="rl-badge rl-badge-count">{{ sujetosFiltrados.length }} documentos</span>
          </div>
          <div class="rl-filters">
            <input type="number" v-model="anioFiltro" placeholder="Año" class="rl-input rl-filter-sm">
            <select v-model="mesFiltro" class="rl-select rl-filter-md">
              <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
            </select>
            <select v-model="declaranteFiltro" class="rl-select rl-filter-md">
              <option value="">🏢 Todas las Empresas</option>
              <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
            </select>
            <input type="text" v-model="filtro" placeholder="🔍 Sujeto o documento..." class="rl-input rl-filter-search">
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
                  <input type="checkbox" @change="toggleAll" :checked="sujetosFiltrados.length > 0 && seleccionados.length === sujetosFiltrados.length" class="rl-checkbox">
                </th>
                <th>Fecha</th><th>Anexo</th><th>Sujeto</th><th>Documento</th>
                <th style="text-align:right">Monto</th><th style="text-align:right;color:#ef4444">Ret. 10%</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sujetosFiltrados" :key="item.idComSujExclui"
                  :class="{ 'is-selected': seleccionados.includes(item.idComSujExclui) }">
                <td style="text-align:center">
                  <input type="checkbox" :value="item.idComSujExclui" v-model="seleccionados" class="rl-checkbox">
                </td>
                <td>
                  <div style="font-weight:700">{{ formatearFecha(item.ComprasSujExcluFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong style="color:#0d9488">{{ item.ComprasSujExcluMesDeclarado || 'N/A' }}</strong></small>
                </td>
                <td><span class="rl-badge rl-badge-anexo">Anexo 5</span></td>
                <td>
                  <div style="font-weight:700">{{ item.ComprasSujExcluNom }}</div>
                  <small class="rl-text-muted">{{ item.ComprasSujExcluNIT }}</small>
                </td>
                <td><span class="rl-doc-number">{{ item.ComprasSujExcluNumDoc }}</span></td>
                <td style="text-align:right;font-weight:700">${{ parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2) }}</td>
                <td style="text-align:right;font-weight:700;color:#ef4444">-${{ parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2) }}</td>
                <td style="text-align:center">
                  <button class="rl-btn-icon" @click="prepararEdicion(item)" title="Editar">✏️</button>
                  <button class="rl-btn-icon" @click="eliminarSujeto(item.idComSujExclui)" title="Eliminar" style="color:#ef4444">🗑️</button>
                </td>
              </tr>
              <tr v-if="sujetosFiltrados.length === 0">
                <td colspan="8" class="rl-empty-state">No se encontraron registros para estos filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout.vue'; 

const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;
const API_URL = `${BASE_URL}/api/sujetos`; 

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- LÓGICA DE MÁSCARA DTE ---
const ccfParts = ref({ part1: '14', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => { let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); ccfParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto(); };
const handleInputMask = (e, partName, maxLength) => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > maxLength) raw = raw.slice(-maxLength); const padded = raw.padStart(maxLength, '0'); ccfParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto(); };
const actualizarNumeroCompleto = () => { const letra = ccfParts.value.letraSerie || 'S'; formulario.value.numero_control = `DTE-${ccfParts.value.part1}-${letra}${ccfParts.value.part2}P${ccfParts.value.part3}-${ccfParts.value.part4}`; };

// --- ESTADOS DEL FORMULARIO ---
const formulario = ref({ 
    iddeclaNIT: '',
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    tipoDoc: '14', nit: '', nombre: '', serie: '', numero_control: '', 
    uuid_dte: '', sello_recepcion: '', // 🛡️ CAMBIO: Campo de Sello Integrado
    monto: '0.00', retencion: '0.00', tipoOp: '1', clasificacion: '2', sector: '4', costoGasto: '2', anexo: 5 
});

const listaSujetos = ref([]); 
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
    if (e.target.checked) { seleccionados.value = sujetosFiltrados.value.map(s => s.idComSujExclui); } 
    else { seleccionados.value = []; }
};

const aplicarCambioMasivo = async () => {
    if (!confirm(`¿Mover ${seleccionados.value.length} documentos al mes de ${bulkMes.value} ${bulkAnio.value}?`)) return;
    cargandoMasivo.value = true;
    try {
        const promesas = seleccionados.value.map(id => {
            const sujetoOri = listaSujetos.value.find(s => s.idComSujExclui === id);
            if (!sujetoOri) return Promise.resolve();

            const payload = {
                iddeclaNIT: sujetoOri.iddeclaNIT,
                fecha: sujetoOri.ComprasSujExcluFecha ? sujetoOri.ComprasSujExcluFecha.split('T')[0] : null,
                mesDeclarado: bulkMes.value,
                anioDeclarado: bulkAnio.value,
                tipoDoc: sujetoOri.ComprasSujExcluTipoDoc,
                nit: sujetoOri.ComprasSujExcluNIT,
                nombre: sujetoOri.ComprasSujExcluNom,
                serie: sujetoOri.ComprasSujExcluSerieDoc,
                numero_control: sujetoOri.ComprasSujExcluNumDoc,
                uuid_dte: sujetoOri.ComprasSujExcluCodGeneracion,
                sello_recepcion: sujetoOri.ComprasSujExcluSelloRecepcion, // 🛡️ Mantiene el sello en cambios masivos
                monto: sujetoOri.ComprasSujExcluMontoOpera,
                retencion: sujetoOri.ComprasSujExcluMontoReten,
                tipoOp: sujetoOri.ComprasSujExcluTipoOpera,
                clasificacion: sujetoOri.ComprasSujExcluClasificacion,
                sector: sujetoOri.ComprasSujExclusector,
                costoGasto: sujetoOri.ComprasSujExcluTipoCostoGast,
                anexo: 5
            };
            return axios.put(`${API_URL}/${id}`, payload);
        });
        await Promise.all(promesas);
        alert(`✅ ${seleccionados.value.length} documentos actualizados.`);
        seleccionados.value = [];
        await cargarDatos();
    } catch (error) { alert("🚨 Error al mover los documentos."); } 
    finally { cargandoMasivo.value = false; }
};

// --- CÁLCULOS ---
watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

watch(() => formulario.value.monto, (val) => { 
    formulario.value.retencion = ((parseFloat(val) || 0) * 0.10).toFixed(2); 
});

const totalNeto = computed(() => { 
    const m = parseFloat(formulario.value.monto) || 0; 
    const r = parseFloat(formulario.value.retencion) || 0; 
    return (m - r).toFixed(2); 
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

const sujetosFiltrados = computed(() => { 
    let filtrado = listaSujetos.value || []; 
    if (declaranteFiltro.value) filtrado = filtrado.filter(item => item.iddeclaNIT === declaranteFiltro.value); 
    if (mesFiltro.value) filtrado = filtrado.filter(item => item.ComprasSujExcluMesDeclarado === mesFiltro.value);
    if (anioFiltro.value) filtrado = filtrado.filter(item => String(item.ComprasSujExcluAnioDeclarado) === String(anioFiltro.value) || (item.ComprasSujExcluFecha && item.ComprasSujExcluFecha.startsWith(anioFiltro.value)));
    
    if (filtro.value) { 
        const txt = filtro.value.toLowerCase(); 
        filtrado = filtrado.filter(item => 
            (item.ComprasSujExcluNom && item.ComprasSujExcluNom.toLowerCase().includes(txt)) || 
            (item.ComprasSujExcluNIT && item.ComprasSujExcluNIT.includes(txt)) || 
            (item.ComprasSujExcluNumDoc && item.ComprasSujExcluNumDoc.includes(txt))
        ); 
    } 
    return filtrado; 
});

const formatearDecimal = (campo) => { formulario.value[campo] = !isNaN(parseFloat(formulario.value[campo])) ? parseFloat(formulario.value[campo]).toFixed(2) : '0.00'; };

// --- OPERACIONES DB ---
const cargarDatos = async () => { 
    try { 
        const resD = await axios.get(`${BASE_URL}/api/declarantes`); 
        todosLosDeclarantes.value = resD.data || []; 
        const resV = await axios.get(API_URL);
        listaSujetos.value = resV.data || [];
    } catch (error) { console.error("Error cargando DB:", error); } 
};

const guardarSujeto = async () => { 
    if (!formulario.value.iddeclaNIT) { tipoMensaje.value = 'error'; mensaje.value = 'Seleccione una Empresa.'; return; }
    actualizarNumeroCompleto(); 
    cargando.value = true; 
    
    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}`, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Registro actualizado exitosamente!';
        } else {
            await axios.post(API_URL, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Registro guardado en BD!';
        }
        await cargarDatos();
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) {
        tipoMensaje.value = 'error'; 
        mensaje.value = error.response?.data?.message || 'Error del servidor.'; 
    } finally { cargando.value = false; }
};

const eliminarSujeto = async (id) => { 
    if(!confirm('¿Eliminar este registro permanentemente de la BD?')) return;
    try { await axios.delete(`${API_URL}/${id}`); await cargarDatos(); } catch (e) { alert('No se pudo eliminar el registro.'); }
};

const prepararEdicion = (item) => {
    let fechaSegura = item.ComprasSujExcluFecha ? new Date(item.ComprasSujExcluFecha).toISOString().split('T')[0] : '';
    const rawNum = item.ComprasSujExcluNumDoc || '';
    const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/; 
    const match = rawNum.replace(/-/g, '').match(regex);
    
    ccfParts.value = match ? 
        { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : 
        { part1: '14', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };

    const limpiarCodigoCat = (txt) => { const m = (txt||'').toString().match(/\d+/); return m ? m[0] : '1'; };

    formulario.value = { 
        iddeclaNIT: item.iddeclaNIT,
        fecha: fechaSegura, 
        mesDeclarado: item.ComprasSujExcluMesDeclarado || mesesOptions[new Date(fechaSegura).getMonth()],
        anioDeclarado: item.ComprasSujExcluAnioDeclarado || fechaSegura.substring(0,4),
        tipoDoc: item.ComprasSujExcluTipoDoc || '14', 
        nit: item.ComprasSujExcluNIT, 
        nombre: item.ComprasSujExcluNom, 
        serie: item.ComprasSujExcluSerieDoc, 
        numero_control: rawNum, 
        uuid_dte: item.ComprasSujExcluCodGeneracion || '',
        sello_recepcion: item.ComprasSujExcluSelloRecepcion || '', // 🛡️ CAMBIO: Sello integrado al editar
        monto: parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2), 
        retencion: parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2), 
        tipoOp: limpiarCodigoCat(item.ComprasSujExcluTipoOpera), 
        clasificacion: limpiarCodigoCat(item.ComprasSujExcluClasificacion), 
        sector: limpiarCodigoCat(item.ComprasSujExclusector) || '4', 
        costoGasto: limpiarCodigoCat(item.ComprasSujExcluTipoCostoGast) || '2', 
        anexo: 5 
    };
    idEdicion.value = item.idComSujExclui; modoEdicion.value = true; mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => { 
    formulario.value = { 
      iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], 
      anioDeclarado: new Date().getFullYear().toString(), tipoDoc: '14', nit: '', nombre: '', serie: '', 
      numero_control: '', uuid_dte: '', sello_recepcion: '', // 🛡️ CAMBIO: Resetear Sello
      monto: '0.00', retencion: '0.00', tipoOp: '1', clasificacion: '2', sector: '4', costoGasto: '2', anexo: 5 
    }; 
    ccfParts.value = { part1: '14', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' }; 
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

-e 
<style scoped>
/* SujetosExcluidosView — estilos base en assets/forms.css */
</style>
