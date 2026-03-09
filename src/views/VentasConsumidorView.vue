<template>
  <MainLayout>
    <div class="rl-view">

      <!-- Encabezado -->
      <div class="rl-view-header">
        <div class="rl-view-title">
          <h1>🧾 Ventas Consumidor Final (y Notas)</h1>
          <p class="rl-view-subtitle">Facturas, Notas de Crédito y Débito · Anexo 1</p>
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
              {{ modoEdicion ? 'Modificando registro en Base de Datos' : 'Documento para Clientes Finales' }}
            </span>
          </div>
          <!-- Toggle DTE / Físico -->
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

          <!-- Alertas NC / ND -->
          <div v-if="formulario.tipoDocumento === '05'" class="rl-alert" style="background:#fffbeb;color:#92400e;border-color:#fde68a;margin-bottom:16px">
            <strong>💡 Nota de Crédito:</strong> Ingrese el monto que está devolviendo o descontando de la factura original <em>(valores en positivo, Hacienda los restará)</em>.
          </div>
          <div v-if="formulario.tipoDocumento === '06'" class="rl-alert rl-alert-info" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;margin-bottom:16px">
            <strong>💡 Nota de Débito:</strong> Ingrese el cargo extra o excedente a cobrar que no se incluyó en la Factura original.
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
                  <option value="01">01 - Factura (Consumidor Final)</option>
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
              <div class="rl-field rl-col-full" style="grid-column:1/-1">
                <label class="rl-label" style="color:#0369a1">🔑 Código de Generación (UUID) <span class="req">*</span></label>
                <input type="text" v-model="formulario.uuid_dte" class="rl-input rl-input-uuid" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Número Control (DTE) <span class="req">*</span></label>
                <div class="rl-dte-wrap">
                  <span class="rl-dte-prefix">DTE</span>
                  <input type="text" :value="dteParts.part1" class="rl-dte-part w2" readonly style="background:#f3f4f6">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="dteParts.letraSerie" @input="handleLetraInput" class="rl-dte-part letter" placeholder="S" @focus="$event.target.select()">
                  <input type="text" :value="dteParts.part2" @input="e => handleInputMask(e,'part2',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">P</span>
                  <input type="text" :value="dteParts.part3" @input="e => handleInputMask(e,'part3',3)" class="rl-dte-part w3" placeholder="000">
                  <span class="rl-dte-sep">–</span>
                  <input type="text" :value="dteParts.part4" @input="e => handleInputMask(e,'part4',15)" class="rl-dte-part grow" placeholder="Correlativo...">
                </div>
              </div>
              <div class="rl-field rl-field-sello">
                <label class="rl-label" style="color:#065f46">🛡️ Sello de Recepción (Opcional)</label>
                <div class="rl-sello-wrap">
                  <span class="rl-sello-icon">✅</span>
                  <input type="text" v-model="formulario.sello_recepcion" class="rl-input rl-input-sello" placeholder="Ej: 2025095CA9E1B...">
                </div>
                <span class="rl-sello-hint">40 caracteres · Solo aplica para DTE</span>
              </div>
            </div>

            <!-- Campos Físico -->
            <div v-if="formulario.modoIngreso === 'fisico'" class="rl-grid rl-grid-2 rl-mt-3">
              <div class="rl-field">
                <label class="rl-label">Número de Resolución <span class="req">*</span></label>
                <input type="text" v-model="formulario.resolucion" class="rl-input" placeholder="15042-RES-CR-..." required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Máquina Registradora (si es tiquete)</label>
                <input type="text" v-model="formulario.maquina" class="rl-input" placeholder="Opcional">
              </div>
              <div class="rl-field">
                <label class="rl-label">Correlativo DEL <span class="req">*</span></label>
                <input type="text" v-model="formulario.desde" class="rl-input" style="font-weight:700" placeholder="Ej: 1" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">Correlativo AL <span class="req">*</span></label>
                <input type="text" v-model="formulario.hasta" class="rl-input" style="font-weight:700" placeholder="Ej: 100" required>
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
            <p class="rl-section-title">Cliente (Opcional)</p>
            <div class="rl-grid rl-grid-2">
              <div class="rl-field">
                <label class="rl-label">Nombre Cliente <span class="req">*</span></label>
                <input type="text" v-model="formulario.cliente" class="rl-input" placeholder="Nombre o Razón Social" required>
              </div>
              <div class="rl-field">
                <label class="rl-label">DUI / NIT del Cliente</label>
                <input type="text" v-model="formulario.documentoCliente" class="rl-input" placeholder="00000000-0">
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
                <span class="rl-monto-label">{{ formulario.tipoDocumento === '05' ? 'Devolución / Descuento' : formulario.tipoDocumento === '06' ? 'Cargo Extra' : 'Ventas Gravadas' }}</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.gravadas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('gravadas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label">Ventas Exentas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.exentas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('exentas')">
                </div>
              </div>
              <div class="rl-monto-item">
                <span class="rl-monto-label">Ventas No Sujetas</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency">$</span>
                  <input type="number" v-model="formulario.noSujetas" step="0.01" class="rl-input rl-input-monto" @blur="formatearDecimal('noSujetas')">
                </div>
              </div>
              <div class="rl-monto-item is-total">
                <span class="rl-monto-label">{{ formulario.tipoDocumento === '05' ? 'TOTAL NC' : formulario.tipoDocumento === '06' ? 'TOTAL ND' : 'TOTAL FACTURA' }}</span>
                <div class="rl-monto-wrap">
                  <span class="rl-monto-currency" style="color:#0d9488">$</span>
                  <input :value="totalCalculado" type="text" class="rl-input rl-input-total" readonly>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
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
            <h3>📋 Historial de Ventas (Anexo 1)</h3>
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

        <!-- Bulk -->
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
                <th>Fecha</th><th>Tipo</th><th>Clase</th><th>Cliente</th><th>Doc / Rango</th>
                <th style="text-align:right">Gravadas</th><th style="text-align:right">Total</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="venta in ventasFiltradas" :key="venta.idconsfinal"
                  :class="{ 'is-selected': seleccionados.includes(venta.idconsfinal), 'is-anulado': esAnulado(venta) }">
                <td style="text-align:center">
                  <input type="checkbox" :value="venta.idconsfinal" v-model="seleccionados" class="rl-checkbox">
                </td>
                <td>
                  <div style="font-weight:700">{{ formatearFecha(venta.ConsFecha) }}</div>
                  <small class="rl-text-muted">Declarado: <strong style="color:#0d9488">{{ venta.ConsMesDeclarado || 'N/A' }}</strong></small>
                </td>
                <td>
                  <span class="tipo-badge" :class="venta.ConsTipoDoc === '01' ? 'tipo-blue' : venta.ConsTipoDoc === '05' ? 'tipo-orange' : 'tipo-purple'">
                    {{ venta.ConsTipoDoc === '05' ? 'NC (05)' : venta.ConsTipoDoc === '06' ? 'ND (06)' : 'Factura (01)' }}
                  </span>
                </td>
                <td>
                  <span class="tipo-badge" :class="venta.ConsClaseDoc === '4' ? 'tipo-blue' : 'tipo-green'">
                    {{ venta.ConsClaseDoc === '4' ? 'DTE' : 'Físico' }}
                  </span>
                </td>
                <td style="font-weight:700">{{ truncarTexto(venta.ConsNomRazonCliente) || 'Cliente General' }}</td>
                <td>
                  <span class="rl-doc-number" :title="'UUID: ' + (venta.ConsCodGeneracion || 'N/A')">
                    {{ venta.ConsClaseDoc === '4' ? venta.ConsNumDocAL : `Del: ${venta.ConsNumDocDEL} Al: ${venta.ConsNumDocAL}` }}
                  </span>
                  <div v-if="venta.ConsSelloRecepcion" style="margin-top:3px">
                    <span class="rl-badge" style="background:#d1fae5;color:#065f46;font-size:.65rem">✔ Sello MH</span>
                  </div>
                </td>
                <td style="text-align:right;color:#6b7280">
                  <span v-if="venta.ConsTipoDoc === '05'" style="color:#ef4444">-</span>${{ parseFloat(venta.ConsVtaGravLocales || 0).toFixed(2) }}
                </td>
                <td style="text-align:right;font-weight:700">
                  <span v-if="venta.ConsTipoDoc === '05'" style="color:#ef4444">-</span>${{ parseFloat(venta.ConsTotalVta || 0).toFixed(2) }}
                </td>
                <td style="text-align:center">
                  <button class="rl-btn-icon" @click="prepararEdicion(venta)" title="Editar">✏️</button>
                  <button class="rl-btn-icon" @click="eliminarVenta(venta)" title="Eliminar" style="color:#ef4444">🗑️</button>
                  <button v-if="!esAnulado(venta)" class="rl-btn-icon" @click="anularDocumento(venta)" title="Anular" style="color:#d97706">🚫</button>
                </td>
              </tr>
              <tr v-if="ventasFiltradas.length === 0">
                <td colspan="9" class="rl-empty-state">No se encontraron registros para estos filtros.</td>
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
const API_URL = `${BASE_URL}/api/ventas-cf`; 

const mesesOptions = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- LÓGICA DE MÁSCARA DTE ---
const dteParts = ref({ part1: '01', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => { 
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    dteParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto(); 
};
const handleInputMask = (e, partName, maxLength) => { 
    let raw = e.target.value.replace(/\D/g, ''); 
    if (raw.length > maxLength) raw = raw.slice(-maxLength); 
    const padded = raw.padStart(maxLength, '0'); 
    dteParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto(); 
};
const actualizarNumeroCompleto = () => { 
    const letra = dteParts.value.letraSerie || 'S'; 
    formulario.value.numero_control = `DTE-${dteParts.value.part1}-${letra}${dteParts.value.part2}P${dteParts.value.part3}-${dteParts.value.part4}`; 
};

// --- ESTADOS DEL FORMULARIO ---
const formulario = ref({
    modoIngreso: 'dte', 
    iddeclaNIT: '', 
    fecha: new Date().toISOString().split('T')[0], 
    mesDeclarado: mesesOptions[new Date().getMonth()],
    anioDeclarado: new Date().getFullYear().toString(),
    tipoDocumento: '01', 
    numero_control: '', uuid_dte: '', serie: '', 
    sello_recepcion: '', // 🛡️ NUEVO CAMPO AÑADIDO
    resolucion: '', maquina: '', desde: '', hasta: '', 
    cliente: 'Cliente General', documentoCliente: '', 
    tipo_operacion: '1', tipo_ingreso: '3', 
    gravadas: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00',
    origenTabla: 'consumidorfinal'
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

            const esFisico = ventaOri.ConsClaseDoc !== '4';

            const payload = {
                modoIngreso: esFisico ? 'fisico' : 'dte',
                iddeclaNIT: ventaOri.iddeclaNIT,
                fecha: ventaOri.ConsFecha ? ventaOri.ConsFecha.split('T')[0] : null,
                mesDeclarado: bulkMes.value,
                anioDeclarado: bulkAnio.value,
                tipoDocumento: ventaOri.ConsTipoDoc || '01', 
                serie: ventaOri.ConsSerieDoc,
                resolucion: ventaOri.ConsNumResolu,
                maquina: ventaOri.ConsNumMaqRegistro,
                desde: ventaOri.ConsNumDocDEL,
                hasta: ventaOri.ConsNumDocAL,
                numero_control: ventaOri.ConsNumDocAL,
                uuid_dte: ventaOri.ConsCodGeneracion,
                sello_recepcion: ventaOri.ConsSelloRecepcion, // 🛡️ VIAJA CON EL CAMBIO
                cliente: ventaOri.ConsNomRazonCliente,
                documentoCliente: ventaOri.ConsNumDocIdentCliente,
                exentas: ventaOri.ConsVtaExentas,
                noSujetas: ventaOri.ConsVtaNoSujetas,
                gravadas: ventaOri.ConsVtaGravLocales,
                total: ventaOri.ConsTotalVta,
                tipo_operacion: ventaOri.ConsTipoOpera,
                tipo_ingreso: ventaOri.ConsTipoIngreso
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

// --- CÁLCULOS Y WATCHERS ---
watch(() => formulario.value.fecha, (nuevaFecha) => {
    if (nuevaFecha && !modoEdicion.value) {
        const mesIdx = parseInt(nuevaFecha.split('-')[1], 10) - 1;
        formulario.value.mesDeclarado = mesesOptions[mesIdx];
        formulario.value.anioDeclarado = nuevaFecha.split('-')[0];
    }
});

watch(() => formulario.value.tipoDocumento, (val) => {
    if(val) {
        dteParts.value.part1 = val;
        actualizarNumeroCompleto();
    }
});

const calcularTotalGeneral = () => {
    const g = parseFloat(formulario.value.gravadas) || 0; 
    const e = parseFloat(formulario.value.exentas) || 0;
    const n = parseFloat(formulario.value.noSujetas) || 0; 
    formulario.value.total = (g + e + n).toFixed(2);
};

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
const cargarDatos = async () => {
    try {
        const resD = await axios.get(`${BASE_URL}/api/declarantes`);
        todosLosDeclarantes.value = resD.data || [];
        
        const resV = await axios.get(API_URL);
        listaVentas.value = resV.data || [];

        const resA = await axios.get(`${BASE_URL}/api/anulados`);
        listaAnuladosGlobal.value = resA.data || [];
    } catch (error) { console.error("Error cargando base de datos:", error); }
};

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
        await cargarDatos(); 
        setTimeout(() => { resetForm(); mostrandoLista.value = true; }, 1500);
    } catch (error) { 
        tipoMensaje.value = 'error'; 
        mensaje.value = error.response?.data?.message || 'Error del servidor.'; 
    } finally { 
        cargando.value = false; 
    }
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
    let fSegura = venta.ConsFecha ? venta.ConsFecha.split('T')[0] : new Date().toISOString().split('T')[0];
    const rawNum = venta.ConsNumDocAL || '';
    const esDTE = venta.ConsClaseDoc === '4';

    if (esDTE) {
        const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/;
        const match = rawNum.replace(/-/g, '').match(regex);
        dteParts.value = match ? { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : { part1: venta.ConsTipoDoc || '01', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    } else {
        dteParts.value = { part1: '01', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    }

    const limpiarCodigoCat = (txt) => { const m = (txt||'').toString().match(/\d+/); return m ? m[0] : '1'; };

    formulario.value = { 
        modoIngreso: esDTE ? 'dte' : 'fisico',
        iddeclaNIT: venta.iddeclaNIT,
        fecha: fSegura,
        mesDeclarado: venta.ConsMesDeclarado || mesesOptions[new Date(fSegura).getMonth()],
        anioDeclarado: venta.ConsAnioDeclarado || fSegura.substring(0,4),
        tipoDocumento: venta.ConsTipoDoc || '01', 
        numero_control: rawNum,
        uuid_dte: venta.ConsCodGeneracion || '',
        serie: venta.ConsSerieDoc || '',
        resolucion: venta.ConsNumResolu || '',
        sello_recepcion: venta.ConsSelloRecepcion || '', // 🛡️ CARGAMOS EL SELLO AL EDITAR
        maquina: venta.ConsNumMaqRegistro || '',
        desde: venta.ConsNumDocDEL || '',
        hasta: venta.ConsNumDocAL || '',
        cliente: venta.ConsNomRazonCliente || '',
        documentoCliente: venta.ConsNumDocIdentCliente || '',
        tipo_operacion: limpiarCodigoCat(venta.ConsTipoOpera), 
        tipo_ingreso: limpiarCodigoCat(venta.ConsTipoIngreso), 
        gravadas: parseFloat(venta.ConsVtaGravLocales || 0).toFixed(2),
        exentas: parseFloat(venta.ConsVtaExentas || 0).toFixed(2),
        noSujetas: parseFloat(venta.ConsVtaNoSujetas || 0).toFixed(2),
        total: parseFloat(venta.ConsTotalVta || 0).toFixed(2),
        origenTabla: venta.OrigenTabla 
    }; 
    idEdicion.value = venta.idconsfinal; modoEdicion.value = true; mostrandoLista.value = false;
};

const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };

const resetForm = () => {
    formulario.value = { modoIngreso: 'dte', iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), tipoDocumento: '01', numero_control: '', uuid_dte: '', serie: '', sello_recepcion: '', resolucion: '', maquina: '', desde: '', hasta: '', cliente: 'Cliente General', documentoCliente: '', tipo_operacion: '1', tipo_ingreso: '1', gravadas: '0.00', exentas: '0.00', noSujetas: '0.00', total: '0.00', origenTabla: 'consumidorfinal' };
    dteParts.value = { part1: '01', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const anularDocumento = async (ventaOriginal) => {
    if(esAnulado(ventaOriginal)) { alert("Este documento ya se encuentra anulado en el sistema."); return; }
    if(!confirm('⚠️ ¿Está seguro que desea ANULAR este documento?...')) return;
    
    try {
        const payloadAnulado = {
            iddeclaNIT: ventaOriginal.iddeclaNIT,
            fecha: ventaOriginal.ConsFecha ? ventaOriginal.ConsFecha.split('T')[0] : new Date().toISOString().split('T')[0],
            mesDeclarado: ventaOriginal.ConsMesDeclarado,
            anioDeclarado: ventaOriginal.ConsAnioDeclarado,
            tipoDeta: '1', 
            tipoDoc: ventaOriginal.ConsTipoDoc || '01', 
            uuid_dte: ventaOriginal.ConsCodGeneracion || '',
            sello_recepcion: ventaOriginal.ConsSelloRecepcion || '', // 🛡️ ¡AQUÍ ESTÁ! Ahora el sello viaja
            desde: ventaOriginal.ConsNumDocDEL || ventaOriginal.ConsNumDocAL || '', 
            hasta: ventaOriginal.ConsNumDocAL || '', 
            serie: ventaOriginal.ConsSerieDoc || '',
            resolucion: ventaOriginal.ConsNumResolu || '',
            anexo: '7'
        };

        await axios.post(`${BASE_URL}/api/anulados`, payloadAnulado);
        alert("✅ Documento Anulado exitosamente. Ya no sumará en los reportes.");
        await cargarDatos(); 
    } catch (error) { alert("🚨 No se pudo completar la anulación: " + (error.response?.data?.message || error.message)); }
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';
const truncarTexto = (t) => t && t.length > 20 ? t.substring(0, 20) + '...' : t;

onMounted(cargarDatos);
</script>


<style scoped>
/* VentasConsumidorView — estilos base en assets/forms.css */
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
