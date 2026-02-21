<template>
  <MainLayout>
    <div class="sujetos-container">
      <div class="header-section">
        <div class="title-box">
          <h1>🚫 Sujetos Excluidos</h1>
          <p class="subtitle">Registro de compras a proveedores no inscritos en IVA</p>
        </div>
        <div class="header-actions">
          <button @click="alternarVista" class="btn btn-primary">{{ mostrandoLista ? '➕ Nuevo Registro' : '📋 Ver Listado' }}</button>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!mostrandoLista" class="card fade-in">
          <div class="card-header">
            <h2>{{ modoEdicion ? '✏️ Editar Registro' : '✨ Nueva Compra a Sujeto Excluido' }}</h2>
            <span class="badge-info">{{ modoEdicion ? 'Actualizando datos' : 'Documento F-14 o equivalente' }}</span>
          </div>

          <form @submit.prevent="guardarSujeto" class="form-body">
            <div class="form-section">
              <h3 class="section-title">👤 Datos del Sujeto</h3>
              <div class="form-grid">
                <div class="form-group"><label class="form-label">NIT <span class="text-danger">*</span></label><input type="text" v-model="formulario.nit" class="form-control" placeholder="0000-000000-000-0" required></div>
                <div class="form-group"><label class="form-label">Nombre Completo <span class="text-danger">*</span></label><input type="text" v-model="formulario.nombre" class="form-control" required></div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">📄 Detalles del Documento</h3>
              <div class="form-grid three-cols">
                <div class="form-group">
                  <label class="form-label">Fecha Emisión <span class="text-danger">*</span></label>
                  <input type="date" v-model="formulario.fecha" class="form-control" required>
                </div>
                
                <div class="form-group">
                   <label class="form-label">Número DTE <span class="text-danger">*</span></label>
                   <div class="dte-mask-container">
                      <span class="dte-prefix">DTE</span>
                      <input type="text" :value="ccfParts.part1" @input="e => handleInputMask(e, 'part1', 2)" class="dte-part w-2ch" placeholder="00">
                      <input type="text" :value="ccfParts.letraSerie" @input="handleLetraInput" class="dte-part dte-letter" placeholder="S" @focus="$event.target.select()">
                      <input type="text" :value="ccfParts.part2" @input="e => handleInputMask(e, 'part2', 3)" class="dte-part w-3ch" placeholder="000">
                      <span class="dte-sep">P</span>
                      <input type="text" :value="ccfParts.part3" @input="e => handleInputMask(e, 'part3', 3)" class="dte-part w-3ch" placeholder="000">
                      <input type="text" :value="ccfParts.part4" @input="e => handleInputMask(e, 'part4', 15)" class="dte-part flex-grow" placeholder="Correlativo...">
                   </div>
                   <small class="form-text text-muted text-xs">Ej: DTE-14-S-000-P-000...</small>
                </div>

                <div class="form-group"><label class="form-label">Serie</label><input type="text" v-model="formulario.serie" class="form-control" placeholder="SERIE"></div>
              </div>

              <div class="form-grid four-cols mt-3">
                 <div class="form-group"><label class="form-label">Clase</label><select v-model="formulario.claseDoc" class="form-control"><option v-for="op in opcionesClase" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Tipo Doc</label><select v-model="formulario.tipoDoc" class="form-control"><option v-for="op in opcionesTipo" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Operación</label><select v-model="formulario.tipoOp" class="form-control"><option v-for="op in opcionesOperacion" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Clasificación</label><select v-model="formulario.clasificacion" class="form-control"><option v-for="op in opcionesClasificacion" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Sector</label><select v-model="formulario.sector" class="form-control"><option v-for="op in opcionesSector" :key="op" :value="op">{{ op }}</option></select></div>
                 <div class="form-group"><label class="form-label">Costo/Gasto</label><select v-model="formulario.costoGasto" class="form-control"><option v-for="op in opcionesCostoGasto" :key="op" :value="op">{{ op }}</option></select></div>
              </div>
            </div>

            <div class="form-section bg-light">
              <h3 class="section-title">💰 Montos de la Operación</h3>
              <div class="montos-wrapper">
                <div class="monto-group"><label class="monto-label">Monto Operación ($)</label><div class="input-wrapper"><span class="currency">$</span><input type="number" v-model="formulario.monto" step="0.01" class="form-control monto-input" placeholder="0.00" @blur="formatearDecimal('monto')"></div></div>
                <div class="monto-group"><label class="monto-label text-danger">Retención (13%)</label><div class="input-wrapper"><span class="currency text-danger">-</span><input type="number" v-model="formulario.retencion" step="0.01" class="form-control monto-input text-danger" placeholder="0.00" @blur="formatearDecimal('retencion')"></div><small class="text-xs text-muted">Calculado auto.</small></div>
                <div class="monto-group total-group"><label class="monto-label">TOTAL A PAGAR</label><div class="input-wrapper"><span class="currency">$</span><input :value="totalNeto" type="text" class="form-control total-input" readonly></div></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" v-if="modoEdicion" @click="cancelarEdicion" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success btn-lg" :disabled="cargando">{{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Registro' : '💾 Guardar Registro') }}</button>
            </div>
          </form>
        </div>

        <div v-else class="card fade-in">
          <div class="card-header flex-between flex-wrap gap-3">
             <h3>📋 Historial de Sujetos Excluidos</h3>
             <div class="history-filters">
                <input type="text" v-model="declaranteFiltro" list="lista-decla-sujetos" placeholder="🏢 Filtrar por NIT de Declarante..." class="form-control filter-input">
                <datalist id="lista-decla-sujetos"><option v-for="d in todosLosDeclarantes" :key="d.iddeclaNIT" :value="d.iddeclaNIT">{{ d.declarante }}</option></datalist>
                <input type="text" v-model="filtro" placeholder="🔍 Buscar por sujeto o documento..." class="form-control search-list">
             </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>Fecha</th><th>Anexo</th> <th>Sujeto (NIT / Nombre)</th><th>Documento</th><th class="text-right">Monto</th><th class="text-right text-danger">Ret. 13%</th><th class="text-center">Acciones</th></tr></thead>
              <tbody>
                <tr v-for="item in sujetosFiltrados" :key="item.idComSujExclui">
                  <td>{{ formatearFecha(item.ComprasSujExcluFecha) }}</td><td><span class="badge-anexo">Anexo 5</span></td> <td><div class="fw-bold text-dark">{{ item.ComprasSujExcluNom }}</div><small class="text-muted">{{ item.ComprasSujExcluNIT }}</small></td>
                  <td><span class="doc-number">{{ item.ComprasSujExcluNumDoc }}</span></td>
                  <td class="text-right fw-bold">${{ parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2) }}</td><td class="text-right fw-bold text-danger">-${{ parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2) }}</td>
                  <td class="text-center"><button class="btn-icon" @click="prepararEdicion(item)" title="Editar">✏️</button><button class="btn-icon text-danger" @click="eliminarSujeto(item.idComSujExclui)" title="Eliminar">🗑️</button></td>
                </tr>
                <tr v-if="sujetosFiltrados.length === 0"><td colspan="7" class="text-center py-4 text-muted">No se encontraron registros para estos filtros.</td> </tr>
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

const ccfParts = ref({ part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' });
const handleLetraInput = (e) => { let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); ccfParts.value.letraSerie = val; e.target.value = val; actualizarNumeroCompleto(); };
const handleInputMask = (e, partName, maxLength) => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > maxLength) raw = raw.slice(-maxLength); const padded = raw.padStart(maxLength, '0'); ccfParts.value[partName] = padded; e.target.value = padded; actualizarNumeroCompleto(); };
const actualizarNumeroCompleto = () => { const letra = ccfParts.value.letraSerie || 'S'; formulario.value.numeroDoc = `DTE-${ccfParts.value.part1}-${letra}${ccfParts.value.part2}P${ccfParts.value.part3}-${ccfParts.value.part4}`; };

const opcionesClase = ["1. IMPRESO POR IMPRENTA O TIQUETES", "2. FORMULARIO UNICO", "3. OTROS", "4. DOCUMENTO TRIBUTARIO DTE"];
const opcionesTipo = ["14. FACTURA DE SUJETO EXCLUIDO", "03 COMPROBANTE DE CREDITO FISCAL", "05.NOTA DE CREDITO", "06.NOTA DE DEBITO"]; 
const opcionesOperacion = ["1. GRAVADA", "2. NO GRAVADA O EXENTA", "3. EXCLUIDO O NO CONSTITUYE RENTA", "4. MIXTA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES", "0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES"];
const opcionesClasificacion = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. COSTO", "2. GASTO", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesSector = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. INDUSTRIA", "2. COMERCIO", "3. AGROPECUARIA", "4. SERVICIOS PROFESIONES, ARTES Y OFICIOS", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];
const opcionesCostoGasto = ["0. CUANDO SE TRATE DE PERIODOS TRIBUTARIOS ANTERIORES", "1. GASTO DE VENTA SIN DONACION", "2. GASTO DE ADMINISTRACION SIN DONACION", "3. GASTOS FINANCIEROS SIN DONACION", "4. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS/IMPORTACIONES", "5. COSTO DE ARTICULOS PRODUCIDOS/COMPRADOS INTERNO", "6. COSTOS INDIRECTOS DE FABRICACION", "7. MANO DE OBRA", "8. OPERACIONES INFORMADAS EN MAS DE 1 ANEXO", "9. EXCEPCIONES"];

const formulario = ref({ fecha: new Date().toISOString().split('T')[0], tipoDoc: '14. FACTURA DE SUJETO EXCLUIDO', nit: '', nombre: '', serie: '', numeroDoc: '', monto: '0.00', retencion: '0.00', tipoOp: '1. GRAVADA', clasificacion: '2. GASTO', sector: '4. SERVICIOS PROFESIONES, ARTES Y OFICIOS', costoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION', anexo: 5 });
const listaSujetos = ref([]); const todosLosDeclarantes = ref([]); const declaranteFiltro = ref(''); const filtro = ref(''); const mostrandoLista = ref(false); const modoEdicion = ref(false); const idEdicion = ref(null); const cargando = ref(false);

watch(() => formulario.value.monto, (val) => { formulario.value.retencion = ((parseFloat(val) || 0) * 0.13).toFixed(2); });
const totalNeto = computed(() => { const m = parseFloat(formulario.value.monto) || 0; const r = parseFloat(formulario.value.retencion) || 0; return (m - r).toFixed(2); });
const sujetosFiltrados = computed(() => { let filtrado = listaSujetos.value || []; if (declaranteFiltro.value) filtrado = filtrado.filter(item => item.iddeclaNIT === declaranteFiltro.value); if (filtro.value) { const txt = filtro.value.toLowerCase(); filtrado = filtrado.filter(item => (item.ComprasSujExcluNom && item.ComprasSujExcluNom.toLowerCase().includes(txt)) || (item.ComprasSujExcluNIT && item.ComprasSujExcluNIT.includes(txt)) || (item.ComprasSujExcluNumDoc && item.ComprasSujExcluNumDoc.includes(txt))); } return filtrado; });
const formatearDecimal = (campo) => { formulario.value[campo] = !isNaN(parseFloat(formulario.value[campo])) ? parseFloat(formulario.value[campo]).toFixed(2) : '0.00'; };

const cargarDatos = async () => { try { const resD = await axios.get(`${BASE_URL}/api/declarantes`); todosLosDeclarantes.value = resD.data || []; if (listaSujetos.value.length === 0) listaSujetos.value = [{ idComSujExclui: 1, iddeclaNIT: '06192901600027', ComprasSujExcluFecha: '2023-10-25', ComprasSujExcluNom: 'María Gómez', ComprasSujExcluNIT: '1234-567890-123-4', ComprasSujExcluSerieDoc: 'S-A', ComprasSujExcluNumDoc: 'DTE-14-S005P004-000000000141739', ComprasSujExcluMontoOpera: '100.00', ComprasSujExcluMontoReten: '13.00' }]; } catch (error) { console.error(error); } };

const guardarSujeto = async () => { actualizarNumeroCompleto(); cargando.value = true; /* Guardar BD */ modoEdicion.value = false; mostrandoLista.value = true; cargando.value = false; };
const eliminarSujeto = async (id) => { if(confirm('¿Eliminar?')) listaSujetos.value = listaSujetos.value.filter(v => v.idComSujExclui !== id); };

const prepararEdicion = (item) => {
    let fechaSegura = item.ComprasSujExcluFecha ? new Date(item.ComprasSujExcluFecha).toISOString().split('T')[0] : '';
    const cleanNumero = item.ComprasSujExcluNumDoc ? item.ComprasSujExcluNumDoc.replace(/-/g, '') : '';
    const regex = /^DTE(\d{2})([A-Z0-9])(\d{3})P(\d{3})(\d{15})$/; const match = cleanNumero.match(regex);
    ccfParts.value = match ? { part1: match[1], letraSerie: match[2], part2: match[3], part3: match[4], part4: match[5] } : { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' };

    formulario.value = { fecha: fechaSegura, tipoDoc: item.ComprasSujExcluTipoDoc || '14. FACTURA DE SUJETO EXCLUIDO', nit: item.ComprasSujExcluNIT, nombre: item.ComprasSujExcluNom, serie: item.ComprasSujExcluSerieDoc, numeroDoc: item.ComprasSujExcluNumDoc, monto: parseFloat(item.ComprasSujExcluMontoOpera || 0).toFixed(2), retencion: parseFloat(item.ComprasSujExcluMontoReten || 0).toFixed(2), tipoOp: item.ComprasSujExcluTipoOpera || '1. GRAVADA', clasificacion: item.ComprasSujExcluClasificacion || '2. GASTO', sector: item.ComprasSujExclusector || '4. SERVICIOS PROFESIONES, ARTES Y OFICIOS', costoGasto: item.ComprasSujExcluTipoCostoGast || '2. GASTO DE ADMINISTRACION SIN DONACION', anexo: 5 };
    idEdicion.value = item.idComSujExclui; modoEdicion.value = true; mostrandoLista.value = false;
};
const cancelarEdicion = () => { resetForm(); mostrandoLista.value = true; };
const resetForm = () => { formulario.value = { fecha: new Date().toISOString().split('T')[0], tipoDoc: '14. FACTURA DE SUJETO EXCLUIDO', nit: '', nombre: '', serie: '', numeroDoc: '', monto: '0.00', retencion: '0.00', tipoOp: '1. GRAVADA', clasificacion: '2. GASTO', sector: '4. SERVICIOS PROFESIONES, ARTES Y OFICIOS', costoGasto: '2. GASTO DE ADMINISTRACION SIN DONACION', anexo: 5 }; ccfParts.value = { part1: '00', letraSerie: 'S', part2: '000', part3: '000', part4: '000000000000000' }; modoEdicion.value = false; idEdicion.value = null; };
const alternarVista = () => { if (modoEdicion) resetForm(); mostrandoLista.value = !mostrandoLista.value; };
const formatearFecha = (f) => f ? f.split('T')[0] : '';
onMounted(cargarDatos);
</script>

<style scoped>
/* --- ESTILO MATERIAL DESVANECIDO --- */
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
.three-cols { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.four-cols { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }
.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn-primary { background-color: #55C2B7; color: white; }
.btn-success { background-color: #10b981; color: white; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; margin-right: 10px; }
.btn-icon { background: white; border: 1px solid #e5e7eb; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 6px; color: #6b7280; }
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
.text-danger { color: #ef4444; } .text-muted { color: #6b7280; }
.mt-3 { margin-top: 15px; } .text-xs { font-size: 0.75rem; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }

/* 🛡️ ESTILOS DEL FILTRO DE HISTORIAL */
.history-filters { display: flex; gap: 10px; flex: 1; justify-content: flex-end; max-width: 600px; }
.filter-input { max-width: 280px; background-color: #f0fdfa; border-color: #55C2B7; font-weight: 600; color: #0f766e; }

/* 🛡️ ESTILOS DE LA MÁSCARA DTE (NUEVO Y NECESARIO) */
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
}
</style>