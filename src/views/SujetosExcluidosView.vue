<template>
  <MainLayout>
    <div class="sujetos-container">
      <div class="header-section">
        <div class="title-box">
          <h1>🚫 Sujetos Excluidos</h1>
          <p class="subtitle">Registro de compras a proveedores no inscritos en IVA (Anexo 5)</p>
        </div>
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">{{ mostrandoLista ? '➕ Nuevo Registro' : '📋 Ver Listado' }}</button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Registro' : '✨ Nueva Compra a Sujeto Excluido' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Modificando registro en Base de Datos' : 'Documento F-14E o equivalente' }}</span>
          </div>

          <form @submit.prevent="guardarSujeto" class="form-body">
            
            <div class="form-section">
              <h3 class="section-title">📄 Detalles del Documento</h3>
              <div class="form-grid four-cols">
                
                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label text-dark fw-bold">🏢 Empresa / Declarante <span class="text-danger">*</span></label>
                   <select v-model="formulario.iddeclaNIT" class="form-control" required>
                      <option value="" disabled>-- Seleccione Empresa --</option>
                      <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">
                         {{ d.declarante }}
                      </option>
                   </select>
                </div>

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

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Código de Generación (UUID) <span class="text-danger">*</span></label>
                   <input type="text" v-model="formulario.uuid_dte" class="form-control uuid-input" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" required>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                   <label class="form-label">Número DTE (14) <span class="text-danger">*</span></label>
                   <div class="dte-mask-container">
                      <span class="dte-prefix">DTE</span>
                      <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e, 'part1', 2)" class="dte-part w-2ch" placeholder="14">
                      <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="dte-part dte-letter" placeholder="S" @focus="$event.target.select()">
                      <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e, 'part2', 3)" class="dte-part w-3ch" placeholder="000">
                      <span class="dte-sep">P</span>
                      <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e, 'part3', 3)" class="dte-part w-3ch" placeholder="000">
                      <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e, 'part4', 15)" class="dte-part flex-grow" placeholder="Correlativo...">
                   </div>
                </div>

                <div class="form-group"><label class="form-label">Serie (Opcional)</label><input type="text" v-model="formulario.serie" class="form-control" placeholder="SERIE"></div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">👤 Datos del Sujeto</h3>
              <div class="form-grid">
                <div class="form-group"><label class="form-label">NIT / DUI <span class="text-danger">*</span></label><input type="text" v-model="formulario.nit" class="form-control" placeholder="0000-000000-000-0" required></div>
                <div class="form-group"><label class="form-label">Nombre Completo <span class="text-danger">*</span></label><input type="text" v-model="formulario.nombre" class="form-control" required></div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">💰 Clasificación y Montos</h3>
              
              <div class="form-grid mt-2 mb-3">
                 <div class="form-group"><label class="form-label text-dark">Tipo de Operación</label><select v-model="formulario.tipoOp" class="form-control select-catalogo"><option value="1">1. GRAVADA</option><option value="2">2. NO GRAVADA O EXENTA</option><option value="3">3. EXCLUIDO O NO CONSTITUYE RENTA</option><option value="4">4. MIXTA</option></select></div>
                 <div class="form-group"><label class="form-label text-dark">Clasificación</label><select v-model="formulario.clasificacion" class="form-control select-catalogo"><option value="1">1. COSTO</option><option value="2">2. GASTO</option></select></div>
                 <div class="form-group"><label class="form-label text-dark">Sector</label><select v-model="formulario.sector" class="form-control select-catalogo"><option value="1">1. INDUSTRIA</option><option value="2">2. COMERCIO</option><option value="3">3. AGROPECUARIA</option><option value="4">4. SERVICIOS PROFESIONES, ARTES Y OFICIOS</option></select></div>
                 <div class="form-group"><label class="form-label text-dark">Costo/Gasto</label><select v-model="formulario.costoGasto" class="form-control select-catalogo"><option value="1">1. GASTO DE VENTA</option><option value="2">2. GASTO DE ADMINISTRACION</option><option value="3">3. GASTOS FINANCIEROS</option><option value="4">4. COSTO DE ARTICULOS/COMPRAS</option><option value="7">7. MANO DE OBRA</option></select></div>
              </div>

              <div class="montos-wrapper">
                <div class="monto-group"><label class="monto-label">Monto Operación ($)</label><div class="input-wrapper"><span class="currency">$</span><input type="number" v-model="formulario.monto" step="0.01" class="form-control monto-input" placeholder="0.00" @blur="formatearDecimal('monto')"></div></div>
                <div class="monto-group"><label class="monto-label text-danger">Retención Renta (10%)</label><div class="input-wrapper"><span class="currency text-danger">-</span><input type="number" v-model="formulario.retencion" step="0.01" class="form-control monto-input text-danger" placeholder="0.00" @blur="formatearDecimal('retencion')"></div><small class="text-xs text-muted">Calculado auto.</small></div>
                <div class="monto-group total-group"><label class="monto-label">TOTAL A PAGAR</label><div class="input-wrapper"><span class="currency">$</span><input :value="totalNeto" type="text" class="form-control total-input" readonly></div></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">{{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Registro' : '💾 Guardar en BD') }}</button>
            </div>
            
            <div v-if="mensaje" :class="['alert', tipoMensaje === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mensaje }}
            </div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Sujetos Excluidos</h3>
             
             <div class="history-filters">
                <input type="number" v-model="anioFiltro" placeholder="Año" class="form-control filter-year">
                <select v-model="mesFiltro" class="form-control filter-month">
                  <option v-for="m in mesesFiltroOptions" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
                </select>
                <select v-model="declaranteFiltro" class="form-control filter-input">
                    <option value="">🏢 Todas las Empresas</option>
                    <option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option>
                </select>
                <input type="text" v-model="filtro" placeholder="🔍 Sujeto o documento..." class="form-control search-list">
             </div>
          </div>

          <div v-if="seleccionados.length > 0" class="bulk-action-bar fade-in">
             <div class="bulk-info">
                <span class="badge-success">{{ seleccionados.length }} seleccionados</span>
                <span class="bulk-text">Asignar para declarar en:</span>
             </div>
             <div class="bulk-controls">
                <select v-model="bulkMes" class="form-control form-control-sm w-auto d-inline">
                   <option v-for="m in mesesOptions" :key="m" :value="m">{{ m }}</option>
                </select>
                <input type="number" v-model="bulkAnio" class="form-control form-control-sm w-auto d-inline" style="width: 80px;">
                <button class="btn btn-primary btn-sm" @click="aplicarCambioMasivo" :disabled="cargandoMasivo">
                   {{ cargandoMasivo ? 'Aplicando...' : '💾 Mover Facturas' }}
                </button>
             </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" @change="toggleAll" :checked="sujetosFiltrados.length > 0 && seleccionados.length === sujetosFiltrados.length" class="row-checkbox" title="Seleccionar todo">
                  </th>
                  <th>Fecha</th><th>Anexo</th> <th>Sujeto (NIT / Nombre)</th><th>Documento</th><th class="text-right">Monto</th><th class="text-right text-danger">Ret. 10%</th><th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in sujetosFiltrados" :key="item.idComSujExclui" :class="{'selected-row': seleccionados.includes(item.idComSujExclui)}">
                  <td class="text-center">
                     <input type="checkbox" :value="item.idComSujExclui" v-model="seleccionados" class="row-checkbox">
                  </td>
                  <td>
                    <div class="fw-bold text-dark">{{ formatearFecha(item.ComprasSujExcluFecha) }}</div>
                    <small class="text-muted">Declarado: <strong class="text-primary">{{ item.ComprasSujExcluMesDeclarado || 'N/A' }}</strong></small>
                  </td>
                  <td><span class="badge-anexo">Anexo 5</span></td> 
                  <td><div class="fw-bold text-dark">{{ item.ComprasSujExcluNom }}</div><small class="text-muted">{{ item.ComprasSujExcluNIT }}</small></td>
                  <td><span class="doc-number">{{ item.ComprasSujExcluNumDoc }}</span></td>
                  <td class="text-right fw-bold text-dark">${{ parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2) }}</td>
                  <td class="text-right fw-bold text-danger">-${{ parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2) }}</td>
                  <td class="text-center"><button class="btn-icon" @click="prepararEdicion(item)" title="Editar">✏️</button><button class="btn-icon text-danger" @click="eliminarSujeto(item.idComSujExclui)" title="Eliminar">🗑️</button></td>
                </tr>
                <tr v-if="sujetosFiltrados.length === 0"><td colspan="8" class="text-center py-4 text-muted">No se encontraron registros para estos filtros.</td> </tr>
              </tbody>
            </table>
          </div>
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
    tipoDoc: '14', nit: '', nombre: '', serie: '', numero_control: '', uuid_dte: '',
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
    formulario.value = { iddeclaNIT: '', fecha: new Date().toISOString().split('T')[0], mesDeclarado: mesesOptions[new Date().getMonth()], anioDeclarado: new Date().getFullYear().toString(), tipoDoc: '14', nit: '', nombre: '', serie: '', numero_control: '', uuid_dte: '', monto: '0.00', retencion: '0.00', tipoOp: '1', clasificacion: '2', sector: '4', costoGasto: '2', anexo: 5 }; 
    ccfParts.value = { part1: '14', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' }; 
    modoEdicion.value = false; idEdicion.value = null; mensaje.value = '';
};

const alternarVista = () => { if (modoEdicion.value) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';

onMounted(cargarDatos);
</script>

<style scoped>
/* LOS MISMOS ESTILOS QUE YA TIENES FUNCIONAN PERFECTO AQUÍ */
.sujetos-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }
.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }
.badge-anexo { font-size: 0.75rem; background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #e2e8f0; white-space: nowrap; }
.form-section { margin-bottom: 30px; }
.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }
.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }

.uuid-input { font-family: 'Consolas', monospace; font-size: 0.85rem; background-color: #f8fafc; color: #1e3a8a; }
.select-catalogo { background-color: #f0fdfa; border-color: #99f6e4; color: #0f766e; font-weight: 600; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-success { background-color: #10b981; color: white; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; margin: 0 2px; }

.montos-wrapper { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #f3f4f6; }
.monto-group { flex: 1; min-width: 150px; }
.monto-label { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 6px; display: block; text-transform: uppercase; }
.input-wrapper { position: relative; }
.currency { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-weight: 600; font-size: 0.9rem; }
.monto-input { padding-left: 24px; font-weight: 600; text-align: right; color: #1f2937; }
.total-input { padding-left: 24px; font-weight: 800; color: #0d9488; border-color: #55C2B7; text-align: right; font-size: 1.25rem; background: #f0fdfa; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; gap: 12px; }
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
.alert { padding: 12px; border-radius: 6px; margin-top: 20px; font-weight: 500; text-align: center; }
.alert-success { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.text-danger { color: #ef4444; } .text-muted { color: #6b7280; } .text-primary { color: #55C2B7; }
.mt-3 { margin-top: 15px; } .text-xs { font-size: 0.75rem; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* Asignación Masiva y Filtros */
.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; max-width: 650px; }
.filter-input { max-width: 200px; background-color: #f0fdfa; border-color: #55C2B7; font-weight: 600; color: #0f766e; }
.filter-year { max-width: 100px; font-weight: 600; }
.filter-month { max-width: 140px; font-weight: 600; }
.search-list { flex: 1; min-width: 150px; max-width: 250px; }

.bulk-action-bar { display: flex; justify-content: space-between; align-items: center; background-color: #f0fdfa; border: 1px solid #55C2B7; padding: 12px 20px; border-radius: 8px; margin-bottom: 15px; flex-wrap: wrap; gap: 15px; }
.bulk-info { display: flex; align-items: center; gap: 10px; }
.bulk-text { font-weight: 600; color: #0f766e; font-size: 0.95rem; }
.badge-success { background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; }
.bulk-controls { display: flex; align-items: center; gap: 10px; }
.form-control-sm { padding: 0.4rem 0.6rem; font-size: 0.9rem; height: auto; }
.btn-sm { padding: 0.5rem 1rem; font-size: 0.9rem; }
.d-inline { display: inline-block; }
.w-auto { width: auto; }
.row-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #55C2B7; }
.selected-row td { background-color: #f0fdfa !important; border-bottom-color: #ccfbf1; }

.dte-mask-container { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f9fafb; overflow: hidden; transition: all 0.2s; }
.dte-mask-container:focus-within { border-color: #55C2B7; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); background: white; }
.dte-prefix { background: #f3f4f6; padding: 0.6rem 0.8rem; font-size: 0.8rem; font-weight: 700; color: #55C2B7; border-right: 1px solid #e5e7eb; }
.dte-sep { padding: 0 5px; color: #9ca3af; font-weight: bold; }
.dte-part { border: none; text-align: center; padding: 0.6rem 2px; font-family: 'Courier New', monospace; font-size: 0.95rem; outline: none; background: transparent; color: #1f2937; font-weight: 600; }
.w-2ch { width: 32px; } .w-3ch { width: 44px; } .flex-grow { flex: 1; text-align: left; padding-left: 8px; }
.dte-letter { width: 30px; color: #d97706; font-weight: 800; background: #fffbeb; border-radius: 4px; margin: 2px; }

@media (max-width: 768px) {
  .montos-wrapper { flex-direction: column; }
  .monto-group { width: 100%; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; }
  .history-filters { flex-direction: column; max-width: 100%; }
  .filter-input { max-width: 100%; }
  .bulk-action-bar { flex-direction: column; align-items: flex-start; }
}
</style>