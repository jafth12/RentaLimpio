<template>
  <MainLayout>
    <div class="rl-view">

      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🏢 Ventas Crédito Fiscal (y Notas)</h1>
          <p class="rl-view-subtitle">CCF, Notas de Crédito y Débito a Contribuyentes · Anexo 2</p>
        </div>
        <button @click="alternarVista" class="rl-btn rl-btn-primary">
          {{ mostrandoLista ? '➕ Nuevo Documento' : '📋 Ver Historial' }}
        </button>
      </div>

      <!-- FORMULARIO -->
      <div v-if="!mostrandoLista" class="rl-card">
        <div class="rl-card-header">
          <div>
            <h2>{{ modoEdicion ? '✏️ Editar Documento' : '✨ Nuevo Documento' }}</h2>
            <span class="rl-badge rl-badge-info" style="margin-top:4px;display:inline-block">
              {{ modoEdicion ? 'Modificando registro en Base de Datos' : 'Documento para Contribuyentes' }}
            </span>
          </div>
          <div class="modo-toggle">
            <label :class="{ active: formulario.modoIngreso === 'dte' }">
              <input type="radio" v-model="formulario.modoIngreso" value="dte" class="sr-only"> 🌐 DTE
            </label>
            <label :class="{ active: formulario.modoIngreso === 'fisico' }">
              <input type="radio" v-model="formulario.modoIngreso" value="fisico" class="sr-only"> 🖨️ Físico
            </label>
          </div>
        </div>

        <form @submit.prevent="guardarVenta">

          <div v-if="formulario.tipoDocumento === '05'" class="rl-alert" style="background:#fffbeb;color:#92400e;border-color:#fde68a;margin-bottom:16px">
            <strong>💡 Nota de Crédito:</strong> Ingrese los montos que está devolviendo o descontando <em>(en positivo, Hacienda los restará)</em>.
          </div>
          <div v-if="formulario.tipoDocumento === '06'" class="rl-alert" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;margin-bottom:16px">
            <strong>💡 Nota de Débito:</strong> Ingrese el cargo extra que no se incluyó en el CCF original.
          </div>

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
              <div class="rl-field">
                <label class="rl-label">Tipo de Documento <span class="req">*</span></label>
                <select v-model="formulario.tipoDocumento" class="rl-select" style="font-weight:700" required>
                  <option value="03">03 - Comprobante de Crédito Fiscal (CCF)</option>
                  <option value="05">05 - Nota de Crédito (NC)</option>
                  <option value="06">06 - Nota de Débito (ND)</option>
                </select>
              </div>
            </div>
            <div class="rl-grid rl-grid-3 rl-mt-3">
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

            <!-- Campos DTE -->
            <div v-if="formulario.modoIngreso === 'dte'" class="rl-dte-group rl-mt-3">
              <div class="rl-field" style="grid-column:1/-1">
                <label class="rl-label" style="color:#0369a1">🔑 Código de Generación (UUID) <span class="req">*</span></label>
                <input type="text" v-model="formulario.uuid_dte" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número Control (DTE) <span class="req">*</span></label>
                <div class="rl-dte-wrap">
                  <span class="rl-dte-prefix">DTE</span>
                  <input type="text" :value="ccfParts.part1" class="rl-dte-part w2" readonly style="background:#f3f4f6">
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
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción MH (Opcional)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Pegue los 40 caracteres del Sello MH...">
                </div>
                <span class="rl-sello-hint">40 caracteres alfanuméricos · Solo aplica para DTE</span>
              </div>
            </div>

            <!-- Campos Físico -->
            <div v-if="formulario.modoIngreso === 'fisico'" class="rl-grid rl-grid-2 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Número de Resolución <span class="req">*</span></label>
                <input type="text" v-model="formulario.resolucion" class="rl-input" placeholder="15042-RES-CR-..." required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número Correlativo CCF <span class="req">*</span></label>
                <input type="text" v-model="formulario.numero_fisico" class="rl-input" style="font-weight:700" placeholder="Ej: 12345" required>
              </div>
            </div>

            <div class="rl-grid rl-grid-2 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Serie (Opcional)</label>
                <input type="text" v-model="formulario.serie" class="rl-input" placeholder="SERIE">
              </div>
            </div>
          </div>

          <!-- Sección: Cliente -->
          <div class="rl-form-section">
            <p class="rl-section-title">Cliente (Contribuyente)</p>
            <div class="rl-grid rl-grid-3">
              <div class="rl-field">
                <label class="rl-label">Nombre / Razón Social <span class="req">*</span></label>
                <input type="text" v-model="formulario.cliente" class="rl-input" placeholder="Empresa o Contribuyente" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">NIT del Cliente <span class="req">*</span></label>
                <input type="text" v-model="formulario.nit" class="rl-input" placeholder="0000-000000-000-0" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">NRC (Registro) <span class="req">*</span></label>
                <input type="text" v-model="formulario.nrc" class="rl-input" placeholder="000000-0" required>
              </div>
            </div>
          </div>

          <!-- Sección: Montos -->
          <div class="rl-form-section rl-bg-soft">
            <p class="rl-section-title">Clasificación y Montos</p>
            <div class="rl-grid rl-grid-2" style="margin-bottom:16px">
              <div class="rl-field">
                <label class="rl-label">Tipo de Operación</label>
                <select v-model="formulario.tipo_operacion" class="rl-select">
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
              <div class="rl-field">
                <label class="rl-label">Tipo de Ingreso</label>
                <select v-model="formulario.tipo_ingreso" class="rl-select">
                  <option value="1">1 - Ingresos de Actividades Ordinarias</option>
                  <option value="2">2 - Ingresos Financieros</option>
                  <option value="3">3 - Otros Ingresos y/o Ganancias</option>
                </select>
              </div>
            </div>
            <div class="rl-montos">
              <div class="rl-monto-item">
                <span class="rl-monto-label">{{ formulario.tipoDocumento === '05' ? 'Devolución / Descuento (Base)' : formulario.tipoDocumento === '06' ? 'Cargo Extra (Base)' : 'Base Gravada' }}</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.gravadas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('gravadas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label" style="color:#059669">{{ formulario.tipoDocumento === '05' ? 'IVA a Revertir (13%)' : formulario.tipoDocumento === '06' ? 'IVA Adicional (13%)' : '13% IVA (Débito)' }}</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#059669">{{ formulario.tipoDocumento === '05' ? '-' : '+' }}</span>
                  <input type="number" v-model="formulario.debitoFiscal" step="0.01" class="rl-input rl-input-monto" style="color:#059669" @input="recalcularTotal" @blur="formatearDecimal('debitoFiscal')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label">Exentas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.exentas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('exentas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label">No Sujetas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.noSujetas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('noSujetas')">
                </div>
              </div>
              <div class="rl-monto-item is-total">
                <span class="rl-monto-label">{{ formulario.tipoDocumento === '05' ? 'TOTAL NC' : formulario.tipoDocumento === '06' ? 'TOTAL ND' : 'TOTAL DOCUMENTO' }}</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#0d9488">$</span>
                  <input v-model="formulario.total" type="text" class="rl-input rl-input-total" readonly>
                </div>
              </div>
            </div>
          </div>

          <div class="rl-form-actions">
            <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="rl-btn rl-btn-secondary">Cancelar</button>
            <button type="submit" class="rl-btn rl-btn-success rl-btn-lg" :disabled="cargando">
              {{ cargando ? 'Procesando...' : (modoEdicion ? '✔ Actualizar Registro' : '💾 Guardar en BD') }}
            </button>
          </div>
          <div v-if="mensaje" class="rl-alert" :class="tipoMensaje === 'success' ? 'rl-alert-success' : 'rl-alert-danger'">
            {{ mensaje }}
          </div>
        </form>
      </div>

      <!-- LISTADO -->
      <div v-else class="rl-card">
        <div class="rl-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <h3>📋 Historial de Documentos (Anexo 2)</h3>
            <span class="rl-badge rl-badge-count">{{ ventasFiltradas.length }} documentos</span>
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
            <input type="text" v-model="filtro" placeholder="🔍 DTE / Cliente..." class="rl-input rl-filter-search">
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
                  <input type="checkbox" @change="toggleAll" :checked="ventasFiltradas.length > 0 && seleccionados.length === ventasFiltradas.length" class="rl-checkbox">
                </th>
                <th>Fecha</th><th>Tipo</th><th>Clase</th><th>Cliente</th><th>N° Documento</th>
                <th style="text-align:right">Base</th>
                <th style="text-align:right;color:#059669">IVA 13%</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="venta in ventasFiltradas" :key="venta.idCredFiscal"
                  :class="{ 'is-selected': seleccionados.includes(venta.idCredFiscal), 'is-anulado': esAnulado(venta) }">
                <td style="text-align:center">
                  <input type="checkbox" :value="venta.idCredFiscal" v-model="seleccionados" class="rl-checkbox">
                </td>
                <td>
                  <div style="font-weight:700">{{ formatearFecha(venta.FiscFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong style="color:#0d9488">{{ venta.FiscMesDeclarado || 'N/A' }}</strong></small>
                </td>
                <td>
                  <span class="tipo-badge" :class="venta.FisTipoDoc === '03' ? 'tipo-blue' : venta.FisTipoDoc === '05' ? 'tipo-orange' : 'tipo-purple'">
                    {{ venta.FisTipoDoc === '05' ? 'NC (05)' : venta.FisTipoDoc === '06' ? 'ND (06)' : 'CCF (03)' }}
                  </span>
                </td>
                <td>
                  <span class="tipo-badge" :class="venta.FisClasDoc === '4' ? 'tipo-blue' : 'tipo-green'">
                    {{ venta.FisClasDoc === '4' ? 'DTE' : 'Físico' }}
                  </span>
                </td>
                <td>
                  <div style="font-weight:700">{{ venta.FiscNomRazonDenomi || 'Desconocido' }}</div>
                  <small class="rl-text-muted">{{ venta.FiscNit || 'N/A' }}</small>
                </td>
                <td>
                  <span class="rl-doc-number" :title="venta.FiscCodGeneracion || venta.FiscNumResol">{{ venta.FiscNumDoc || 'N/A' }}</span>
                  <div v-if="venta.FiscSelloRecepcion" style="margin-top:3px">
                    <span class="rl-badge" style="background:#d1fae5;color:#065f46;font-size:.65rem" :title="venta.FiscSelloRecepcion">✔ Sello MH</span>
                  </div>
                </td>
                <td style="text-align:right;color:#6b7280">
                  <span v-if="venta.FisTipoDoc === '05'" style="color:#ef4444">-</span>${{ formatoMoneda(venta.FiscVtaGravLocal) }}
                </td>
                <td style="text-align:right;font-weight:700" :style="venta.FisTipoDoc === '05' ? 'color:#ef4444' : 'color:#059669'">
                  {{ venta.FisTipoDoc === '05' ? '-' : '+' }}${{ formatoMoneda(venta.FiscDebitoFiscal) }}
                </td>
                <td style="text-align:right;font-weight:700">${{ formatoMoneda(venta.FiscTotalVtas) }}</td>
                <td style="text-align:center">
                  <button class="rl-btn-icon" @click="prepararEdicion(venta)" title="Editar">✏️</button>
                  <button class="rl-btn-icon" @click="eliminarVenta(venta)" title="Eliminar" style="color:#ef4444">🗑️</button>
                  <button class="rl-btn-icon" @click="anularDocumento(venta)" title="Anular" style="color:#d97706">🚫</button>
                </td>
              </tr>
              <tr v-if="ventasFiltradas.length === 0">
                <td colspan="10" class="rl-empty-state">No se encontraron registros para estos filtros.</td>
              </tr>
            </tbody>
          </table>
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
const API_URL = `${BASE_URL}/api/ventas-CCF`; 

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- FUNCIÓN ANTI-NAN ---
const formatoMoneda = (valor) => {
    const num = Number(valor);
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

// --- LÓGICA DE LA MÁSCARA DTE ---
const ccfParts = ref({ part1: '03', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
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
    modoIngreso: 'dte', 
    iddeclaNIT: '',
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    tipoDocumento: '03',
    numero_control: '', 
    uuid_dte: '', 
    sello_recepcion: '', // 🛡️ NUEVO: Atrapa el sello MH
    serie: '', 
    resolucion: '', 
    numero_fisico: '', 
    cliente: '', 
    nrc: '',
    tipo_operacion: '1', 
    tipo_ingreso: '3',
    gravadas: '0.00', debitoFiscal: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00',
    origenTabla: 'credfiscal'
});

const listaVentas = ref([]); 
const listaAnuladosGlobal = ref([]); 
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
    if (e.target.checked) { seleccionados.value = ventasFiltradas.value.map(v => v.idCredFiscal); } 
    else { seleccionados.value = []; }
};

const aplicarCambioMasivo = async () => {
    if (!confirm(`¿Mover ${seleccionados.value.length} documentos al mes de ${bulkMes.value} ${bulkAnio.value}?`)) return;
    cargandoMasivo.value = true;
    try {
        const promesas = seleccionados.value.map(id => {
            const ventaOri = listaVentas.value.find(v => v.idCredFiscal === id);
            if (!ventaOri) return Promise.resolve();

            const esFisico = ventaOri.FisClasDoc !== '4';

            const payload = {
                modoIngreso: esFisico ? 'fisico' : 'dte',
                iddeclaNIT: ventaOri.iddeclaNIT,
                fecha: ventaOri.FiscFecha ? ventaOri.FiscFecha.split('T')[0] : null,
                mesDeclarado: bulkMes.value,
                anioDeclarado: bulkAnio.value,
                tipoDocumento: ventaOri.FisTipoDoc || '03',
                serie: ventaOri.FiscSerieDoc,
                resolucion: ventaOri.FiscNumResol,
                numero_fisico: ventaOri.FiscNumDoc,
                numero_control: ventaOri.FiscNumDoc,
                uuid_dte: ventaOri.FiscCodGeneracion,
                sello_recepcion: ventaOri.FiscSelloRecepcion, // 🛡️ Evitamos que se borre en envíos masivos
                nrc: ventaOri.FiscNit,
                cliente: ventaOri.FiscNomRazonDenomi,
                exentas: ventaOri.FiscVtaExen,
                noSujetas: ventaOri.FiscVtaNoSujetas,
                gravadas: ventaOri.FiscVtaGravLocal,
                debitoFiscal: ventaOri.FiscDebitoFiscal,
                total: ventaOri.FiscTotalVtas,
                tipo_operacion: ventaOri.BusFiscTipoOperaRenta,
                tipo_ingreso: ventaOri.BusFiscTipoIngresoRenta
            };
            return axios.put(`${API_URL}/${id}?origen=${ventaOri.OrigenTabla}`, payload);
        });
        await Promise.all(promesas);
        alert(`✅ ${seleccionados.value.length} documentos actualizados.`);
        seleccionados.value = [];
        await cargarDatos();
    } catch (error) { alert("🚨 Error al mover los documentos."); } 
    finally { cargandoMasivo.value = false; }
};

// --- CÁLCULOS DINÁMICOS Y WATCHERS ---
watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

watch(() => formulario.value.tipoDocumento, (val) => {
    if(val) {
        ccfParts.value.part1 = val;
        if(formulario.value.modoIngreso === 'dte') actualizarNumeroCompleto();
    }
});

watch(() => formulario.value.gravadas, (val) => {
    const gravado = parseFloat(val) || 0;
    formulario.value.debitoFiscal = (gravado * 0.13).toFixed(2);
    calcularTotalGeneral();
});

watch(() => [formulario.value.exentas, formulario.value.noSujetas], () => { calcularTotalGeneral(); });

const calcularTotalGeneral = () => {
    const g = parseFloat(formulario.value.gravadas) || 0;
    const df = parseFloat(formulario.value.debitoFiscal) || 0;
    const e = parseFloat(formulario.value.exentas) || 0;
    const ns = parseFloat(formulario.value.noSujetas) || 0;
    formulario.value.total = (g + df + e + ns).toFixed(2);
};

const recalcularTotal = () => { calcularTotalGeneral(); };

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
    if (mesFiltro.value) filtrado = filtrado.filter(v => v.FiscMesDeclarado === mesFiltro.value);
    if (anioFiltro.value) filtrado = filtrado.filter(v => String(v.FiscAnioDeclarado) === String(anioFiltro.value) || (v.FiscFecha && v.FiscFecha.startsWith(anioFiltro.value)));
    if (filtro.value) {
        const txt = filtro.value.toLowerCase();
        filtrado = filtrado.filter(v => (v.FiscNomRazonDenomi && v.FiscNomRazonDenomi.toLowerCase().includes(txt)) || (v.FiscNumDoc && v.FiscNumDoc.toLowerCase().includes(txt)) || (v.FiscNit && v.FiscNit.includes(txt)));
    }
    return filtrado;
});

const formatearDecimal = (campo) => {
    const valor = parseFloat(formulario.value[campo]);
    formulario.value[campo] = !isNaN(valor) ? valor.toFixed(2) : '0.00';
};

// --- OPERACIONES CON DB (AXIOS) ---
const cargarDatos = async () => {
    try {
        const resD = await axios.get(`${BASE_URL}/api/declarantes`);
        todosLosDeclarantes.value = resD.data || [];
        
        const resV = await axios.get(API_URL);
        listaVentas.value = resV.data || [];

        const resA = await axios.get(`${BASE_URL}/api/anulados`);
        listaAnuladosGlobal.value = resA.data || [];
    } catch (error) { console.error("Error cargando BD", error); }
};

const esAnulado = (doc) => {
    const dte = doc.FiscNumDoc;
    const uuid = doc.FiscCodGeneracion;
    return listaAnuladosGlobal.value.some(a => 
        a.iddeclaNIT === doc.iddeclaNIT && 
        (a.DetaDocDesde === dte || a.DetaDocCodGeneracion === (uuid ? uuid.replace(/-/g, '') : ''))
    );
};

const guardarVenta = async () => { 
    if (!formulario.value.iddeclaNIT) { tipoMensaje.value = 'error'; mensaje.value = 'Seleccione una Empresa.'; return; }
    
    if (formulario.value.modoIngreso === 'dte') actualizarNumeroCompleto(); 
    calcularTotalGeneral(); 
    
    cargando.value = true; 
    try {
        if(modoEdicion.value) {
            await axios.put(`${API_URL}/${idEdicion.value}?origen=${formulario.value.origenTabla}`, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Actualizado en BD!';
        } else {
            await axios.post(API_URL, formulario.value);
            tipoMensaje.value = 'success'; mensaje.value = '¡Guardado en BD!';
        }
        await cargarDatos(); setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) { 
        tipoMensaje.value = 'error'; mensaje.value = error.response?.data?.message || 'Error del servidor.'; 
    } finally { cargando.value = false; }
};

const eliminarVenta = async (venta) => { 
    if(!confirm('¿Eliminar permanentemente de la Base de Datos?')) return;
    try { 
        const idBorrar = venta.idCredFiscal || venta.idconsfinal;
        await axios.delete(`${API_URL}/${idBorrar}?origen=${venta.OrigenTabla}`); 
        await cargarDatos(); 
    } catch (e) { alert('Error.'); }
};

const prepararEdicion = (venta) => { 
    let fSegura = venta.FiscFecha ? venta.FiscFecha.split('T')[0] : new Date().toISOString().split('T')[0];
    const rawNum = venta.FiscNumDoc || '';
    const esDTE = venta.FisClasDoc === '4';
    
    if (esDTE) {
        const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
        const match = rawNum.replace(/-/g, '').match(regex);
        ccfParts.value = match ? { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : { part1: venta.FisTipoDoc || '03', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    } else {
        ccfParts.value = { part1: '03', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    }

    const limpiarCodigoCat = (txt) => { const m = (txt||'').toString().match(/\d+/); return m ? m[0] : '1'; };

    formulario.value = { 
        modoIngreso: esDTE ? 'dte' : 'fisico',
        iddeclaNIT: venta.iddeclaNIT,
        fecha: fSegura,
        mesDeclarado: venta.FiscMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
        anioDeclarado: venta.FiscAnioDeclarado || fSegura.substring(0,4),
        tipoDocumento: venta.FisTipoDoc || '03',
        numero_control: esDTE ? rawNum : '',
        numero_fisico: esDTE ? '' : rawNum,
        uuid_dte: venta.FiscCodGeneracion || '',
        sello_recepcion: venta.FiscSelloRecepcion || '', // 🛡️ Atrapa el sello al editar
        serie: venta.FiscSerieDoc || '',
        resolucion: venta.FiscNumResol || '',
        cliente: venta.FiscNomRazonDenomi || '',
        nrc: venta.FiscNit || '',
        tipo_operacion: limpiarCodigoCat(venta.BusFiscTipoOperaRenta) || '1',
        tipo_ingreso: limpiarCodigoCat(venta.BusFiscTipoIngresoRenta) || '1',
        gravadas: parseFloat(venta.FiscVtaGravLocal || 0).toFixed(2),
        debitoFiscal: parseFloat(venta.FiscDebitoFiscal || 0).toFixed(2),
        exentas: parseFloat(venta.FiscVtaExen || 0).toFixed(2),
        noSujetas: parseFloat(venta.FiscVtaNoSujetas || 0).toFixed(2),
        total: parseFloat(venta.FiscTotalVtas || 0).toFixed(2),
        origenTabla: venta.OrigenTabla
    }; 
    idEdicion.value = venta.idCredFiscal; modoEdicion.value = true; mostrandoLista.value = false; 
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => { 
    // 🛡️ REINICIO SEGURO Y FORZADO DE SELECTORES
    formulario.value = { 
        modoIngreso: 'dte', 
        iddeclaNIT: '', 
        fecha: new Date().toISOString().split('T')[0], 
        mesDeclarado: mesesOptions[new Date().getMonth()], 
        anioDeclarado: new Date().getFullYear().toString(), 
        tipoDocumento: '03', 
        numero_control: '', 
        uuid_dte: '', 
        sello_recepcion: '', // Limpiamos el sello
        serie: '', 
        resolucion: '', 
        numero_fisico: '', 
        cliente: '', 
        nrc: '', 
        tipo_operacion: '1', 
        tipo_ingreso: '1', 
        gravadas: '0.00', debitoFiscal: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00', 
        origenTabla: 'credfiscal' 
    };
    ccfParts.value = { part1: '03', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const anularDocumento = async (ventaOriginal) => {
    if(esAnulado(ventaOriginal)) { alert("Este documento ya se encuentra anulado en el sistema."); return; }
    if(!confirm('⚠️ ¿Está seguro que desea ANULAR este documento?\nSe marcará como inoperante en pantalla y se excluirá de los reportes a Hacienda.')) return;
    
    try {
        const payloadAnulado = {
            iddeclaNIT: ventaOriginal.iddeclaNIT,
            fecha: ventaOriginal.FiscFecha ? ventaOriginal.FiscFecha.split('T')[0] : new Date().toISOString().split('T')[0],
            mesDeclarado: ventaOriginal.FiscMesDeclarado,
            anioDeclarado: ventaOriginal.FiscAnioDeclarado,
            tipoDeta: '1', 
            tipoDoc: ventaOriginal.FisTipoDoc || '03', 
            uuid_dte: ventaOriginal.FiscCodGeneracion,
            sello_recepcion: ventaOriginal.FiscSelloRecepcion || '', // 🛡️ ¡AQUÍ ESTÁ! Sello de CCF asegurado
            desde: ventaOriginal.FiscNumDoc, 
            hasta: ventaOriginal.FiscNumDoc, 
            serie: ventaOriginal.FiscSerieDoc || '',
            resolucion: ventaOriginal.FiscNumResol || '',
            anexo: '7'
        };

        await axios.post(`${BASE_URL}/api/anulados`, payloadAnulado);
        alert("✅ Documento Anulado exitosamente. Ya no sumará en los reportes.");
        await cargarDatos(); 
    } catch (error) { alert("🚨 No se pudo completar la anulación: " + (error.response?.data?.message || error.message)); }
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>


<style scoped>
/* VentasCreditoFiscalView — estilos base en assets/forms.css */
.modo-toggle { display:flex; gap:4px; background:#f3f4f6; border-radius:8px; padding:4px; }
.modo-toggle label { padding:6px 14px; border-radius:6px; font-size:.85rem; font-weight:600; color:#6b7280; cursor:pointer; transition:all .15s; }
.modo-toggle label.active { background:white; color:#0d9488; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.sr-only { display:none; }
.tipo-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:12px; font-size:.72rem; font-weight:700; }
.tipo-blue   { background:#dbeafe; color:#1e40af; }
.tipo-green  { background:#d1fae5; color:#065f46; }
.tipo-orange { background:#fef3c7; color:#92400e; }
.tipo-purple { background:#ede9fe; color:#5b21b6; }
</style>
