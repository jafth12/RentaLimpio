<template>
  <MainLayout>
    <div class="reader-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🇸🇻 Lector DTE Inteligente</h1>
          <p class="subtitle">Importador de JSON de Hacienda y Backups del Sistema</p>
        </div>
        
        <div class="header-actions">
          <button @click="$router.push('/importar-exportar')" class="btn btn-secondary">
            ⬅ Volver al Centro JSON
          </button>
        </div>
      </div>

      <div class="main-content">
        
        <div class="card fade-in">
          <div class="card-header">
            <h2>⚙️ Configuración de Importación</h2>
            <span class="badge-info">Identificación del Contribuyente</span>
          </div>

          <div class="form-body">
            <div class="form-grid">
              
              <div class="form-group">
                <label class="form-label">🏢 Ingresa TU NIT (Principal) <span class="text-danger">*</span></label>
                <input 
                  v-model="miNit" 
                  type="text" 
                  placeholder="Ej: 06192901600027" 
                  class="form-control fw-bold"
                />
                <small class="text-muted text-xs">NIT registrado en tu base de datos local.</small>
              </div>

              <div class="form-group">
                <label class="form-label">🆔 Ingresa tu DUI o NRC (Opcional)</label>
                <input 
                  v-model="miAlias" 
                  type="text" 
                  placeholder="Ej: 024985769 o 52795" 
                  class="form-control select-highlight"
                />
                <small class="text-muted text-xs">Hacienda ahora usa el DUI como NIT. Ponlo aquí para que el lector detecte si la factura fue emitida a este número.</small>
              </div>

            </div>
          </div>
        </div>

        <div v-if="!datosProcesados" class="card fade-in delay-100">
           <div class="upload-area">
            <div 
              class="drop-zone" 
              @dragover.prevent 
              @dragenter.prevent 
              @drop.prevent="cargarArchivo"
              @click="$refs.fileInput.click()"
            >
              <span class="upload-icon">📂</span>
              <h3>Haz clic o arrastra tus archivos JSON aquí</h3>
              <p class="text-muted mt-2">Soporta múltiples archivos a la vez.</p>
              <input type="file" ref="fileInput" multiple @change="cargarArchivo" accept=".json" class="hidden-input" />
            </div>
          </div>
        </div>

        <div v-else class="preview-area fade-in">
          <div class="card border-success">
            
            <div class="card-header flex-between">
              <div>
                <h2>📊 Resumen de Datos Detectados</h2>
                <span class="badge-success">Archivos procesados correctamente</span>
              </div>
              
              <div class="header-actions action-group">
                <button @click="limpiar" class="btn btn-danger">❌ Cancelar</button>
                <button @click="enviarAlBackend" class="btn btn-success" :disabled="cargando">
                  {{ cargando ? 'Importando...' : '💾 Confirmar e Importar' }}
                </button>
              </div>
            </div>

            <div class="stats-grid mt-3">
              <div class="stat-card stat-blue">
                <span class="stat-icon">🛒</span>
                <div class="stat-info">
                  <p class="stat-value">{{ payloadFinal?.data?.compras?.length || 0 }}</p>
                  <p class="stat-label">Compras (Gastos)</p>
                </div>
              </div>
              <div class="stat-card stat-green">
                <span class="stat-icon">📄</span>
                <div class="stat-info">
                  <p class="stat-value">{{ payloadFinal?.data?.ventas_ccf?.length || 0 }}</p>
                  <p class="stat-label">Crédito Fiscal</p>
                </div>
              </div>
              <div class="stat-card stat-orange">
                <span class="stat-icon">🧾</span>
                <div class="stat-info">
                  <p class="stat-value">{{ payloadFinal?.data?.ventas_cf?.length || 0 }}</p>
                  <p class="stat-label">Consumidor Final</p>
                </div>
              </div>
              <div class="stat-card stat-purple">
                <span class="stat-icon">🚫</span>
                <div class="stat-info">
                  <p class="stat-value">{{ payloadFinal?.data?.sujetos_excluidos?.length || 0 }}</p>
                  <p class="stat-label">Suj. Excluidos</p>
                </div>
              </div>
              <div class="stat-card stat-red">
                <span class="stat-icon">🛡️</span>
                <div class="stat-info">
                  <p class="stat-value">{{ payloadFinal?.data?.retenciones?.length || 0 }}</p>
                  <p class="stat-label">1% Retenciones</p>
                </div>
              </div>
            </div>

            <div v-if="payloadFinal?.data?.compras?.length > 0 || payloadFinal?.data?.retenciones?.length > 0" class="mt-4">
              <h3 class="section-title">🔍 Muestra de Documentos Detectados</h3>
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Documento</th>
                      <th>Contraparte</th>
                      <th class="text-right">Total / Retenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in payloadFinal?.data?.compras?.slice(0, 5)" :key="'c'+idx">
                      <td><span class="badge-type blue">Compra</span></td>
                      <td>{{ item.ComFecha || item.fecha }}</td>
                      <td><span class="doc-number">{{ item.ComNumero || item.numero }}</span></td>
                      <td class="fw-bold text-dark">{{ item.ComNomProve || item.proveedor_nombre }}</td>
                      <td class="text-right fw-bold text-dark">${{ (parseFloat(item.ComTotal || item.valores?.total) || 0).toFixed(2) }}</td>
                    </tr>
                    <tr v-for="(item, idx) in payloadFinal?.data?.retenciones?.slice(0, 5)" :key="'r'+idx">
                      <td><span class="badge-type red">Retención 1%</span></td>
                      <td>{{ item.RetenFecha }}</td>
                      <td><span class="doc-number">{{ item.RetenNumDoc }}</span></td>
                      <td class="fw-bold text-danger">Agente: {{ item.RetenNitAgente }}</td>
                      <td class="text-right fw-bold text-danger">-${{ parseFloat(item.RetenMontoDeReten || 0).toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const miNit = ref('');
const miAlias = ref(''); 
const miNrc = ref(''); 
const datosProcesados = ref(false);
const cargando = ref(false);
const payloadFinal = ref(null);

const fileInput = ref(null);
const declarantesDB = ref([]); 

const limpiarNit = (texto) => texto ? texto.toString().replace(/[^0-9]/g, '') : '';

onMounted(async () => {
  try {
    const token = localStorage.getItem('token'); 
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const res = await axios.get(`${BASE_URL}/api/declarantes`, config);
    declarantesDB.value = res.data || [];
  } catch (err) {
    console.warn("Aviso: No se cargaron los declarantes.");
  }
});

// Autocompletar y extraer NRC
watch(miNit, (nuevoValor) => {
  const nitLimpio = limpiarNit(nuevoValor);
  if (nitLimpio.length >= 8 && declarantesDB.value.length > 0) {
    const empresa = declarantesDB.value.find(d => limpiarNit(d.iddeclaNIT) === nitLimpio);
    if (empresa) {
        miAlias.value = empresa.declarante || empresa.declaNRC;
        miNrc.value = limpiarNit(empresa.declaNRC);
    } else {
        miAlias.value = '';
        miNrc.value = '';
    }
  } else {
    miAlias.value = '';
    miNrc.value = '';
  }
});

const obtenerMesNombre = (fechaIso) => {
    if (!fechaIso) return 'Enero';
    const partes = fechaIso.split('T')[0].split('-');
    if (partes.length < 2) return 'Enero';
    const mesNum = parseInt(partes[1], 10);
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return meses[mesNum - 1] || 'Enero';
};

const normalizarPayload = (json) => {
  return {
    backup_info: json.backup_info || json.encabezado || { 
      nit: limpiarNit(miNit.value), 
      empresa: 'Importación Manual',
      periodo: new Date().getFullYear().toString()
    },
    data: {
      compras: json.data?.compras || json.modulos?.compras || [],
      ventas_ccf: json.data?.ventas_ccf || json.modulos?.ventas_credito_fiscal || [],
      ventas_cf: json.data?.ventas_cf || json.modulos?.ventas_consumidor || [],
      sujetos_excluidos: json.data?.sujetos_excluidos || json.modulos?.sujetos_excluidos || [],
      retenciones: json.data?.retenciones || json.modulos?.retenciones || []
    }
  };
};

const clasificarDTE = (dte, nitUsuario, nrcUsuario) => {
  const ident = dte.identificacion || {};
  const emisor = dte.emisor || {};
  const receptor = dte.receptor || {};
  const resumen = dte.resumen || {};

  const tipoDte = ident.tipoDte || '00';
  const numero = ident.numeroControl || 'S/N';
  const fecha = ident.fecEmi || new Date().toISOString().split('T')[0];
  const codGen = ident.codigoGeneracion || null; 
  
  const total = parseFloat(resumen.totalPagar) || 0;
  let iva = parseFloat(resumen.totalIva) || 0;
  let fovial = 0; let cotrans = 0;

  if (resumen.tributos) {
    const tribIva = resumen.tributos.find(t => t.codigo === '20'); if (tribIva) iva = parseFloat(tribIva.valor) || 0;
    const tribFovial = resumen.tributos.find(t => t.codigo === 'D1'); const tribCotrans = resumen.tributos.find(t => t.codigo === 'C8');
    if (tribFovial) fovial = parseFloat(tribFovial.valor) || 0; if (tribCotrans) cotrans = parseFloat(tribCotrans.valor) || 0;
  }
  
  const gravado = parseFloat(resumen.totalGravada) || (total - iva);

  const emisorNit = limpiarNit(emisor.nit || emisor.numDocumento);
  const emisorNrc = limpiarNit(emisor.nrc);
  const receptorNit = limpiarNit(receptor.nit || receptor.numDocumento);
  const receptorNrc = limpiarNit(receptor.nrc);

  const soyReceptor = (receptorNit === nitUsuario) || (nrcUsuario && receptorNrc === nrcUsuario);
  const soyEmisor = (emisorNit === nitUsuario) || (nrcUsuario && emisorNrc === nrcUsuario);

  if (soyReceptor) {
    if (tipoDte === '07') {
      return {
        modulo: 'retenciones',
        data: {
          RetenNitAgente: emisorNit, RetenNomAgente: emisor.nombre?.toUpperCase(), RetenFecha: fecha, RetenListTipoDoc: '07', RetenSerieDoc: '', RetenNumDoc: numero, RetenCodGeneracion: codGen, 
          RetenMontoSujeto: parseFloat(resumen.totalSujetoRetencion) || parseFloat(resumen.totalPagar) || 0,
          RetenMontoDeReten: parseFloat(resumen.totalIVAretenido) || 0, RetenDuiDelAgente: '', RetenNumAnexo: '4', RetenMesDeclarado: obtenerMesNombre(fecha), RetenAnioDeclarado: fecha.split('-')[0]
        }
      };
    } else {
      return {
        modulo: 'compras',
        data: {
          ComFecha: fecha, ComTipo: tipoDte, ComNumero: numero, ComCodGeneracion: codGen, proveedor_ProvNIT: emisorNit, ComNomProve: emisor.nombre?.toUpperCase(), ComIntGrav: gravado, ComCredFiscal: iva, ComTotal: total, ComClase: '4', ComAnexo: '3', ComMesDeclarado: obtenerMesNombre(fecha), ComAnioDeclarado: fecha.split('-')[0], comFovial: fovial, comCotran: cotrans, ComOtroAtributo: parseFloat((fovial + cotrans).toFixed(2)) 
        }
      };
    }
  } else if (soyEmisor) {
    // 🛡️ LÓGICA INTELIGENTE REPARADA PARA SEPARAR NOTAS CF Y CCF
    const esClienteConNRC = receptorNrc && receptorNrc.length > 2;

    if (tipoDte === '03' || ((tipoDte === '05' || tipoDte === '06') && esClienteConNRC)) { 
      return {
        modulo: 'ventas_ccf',
        data: { FiscFecha: fecha, FiscNumDoc: numero, FiscCodGeneracion: codGen, FiscNit: receptorNit, FiscNomRazonDenomi: receptor.nombre?.toUpperCase(), FiscVtaGravLocal: gravado, FiscDebitoFiscal: iva, FiscTotalVtas: total, FisClasDoc: '4', FisTipoDoc: tipoDte, FiscNumAnexo: '2' }
      };
    } else if (tipoDte === '01' || ((tipoDte === '05' || tipoDte === '06') && !esClienteConNRC)) {
      return {
        modulo: 'ventas_cf',
        data: { ConsFecha: fecha, ConsNumDocDEL: numero, ConsNumDocAL: numero, ConsCodGeneracion: codGen, ConsVtaGravLocales: gravado, ConsTotalVta: total, ConsNomRazonCliente: receptor.nombre?.toUpperCase() || 'CLIENTE GENERAL', ConsClaseDoc: '4', ConsTipoDoc: tipoDte, ConsNumAnexo: '1' }
      };
    } else if (tipoDte === '14') { 
      return {
        modulo: 'sujetos_excluidos',
        data: { ComprasSujExcluFecha: fecha, ComprasSujExcluNumDoc: numero, ComprasSujExcluCodGeneracion: codGen, ComprasSujExcluNIT: receptorNit, ComprasSujExcluNom: receptor.nombre?.toUpperCase(), ComprasSujExcluMontoOpera: total, ComprasSujExcluMontoReten: (total * 0.10).toFixed(2), ComprasSujExcluTipoDoc: '14', ComprasSujExcluAnexo: '5' }
      };
    }
  }
  return null; 
};

const cargarArchivo = (event) => {
  if (event.preventDefault) event.preventDefault();

  const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
  if (!files || !files.length) return;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonRaw = JSON.parse(e.target.result);

        // 🛡️ REPARADO: Busca inteligentemente el NIT analizando si eres emisor o receptor (soporta arrays)
        let docPrueba = Array.isArray(jsonRaw) ? jsonRaw[0] : jsonRaw;
        docPrueba = docPrueba.dteJson || docPrueba.dte || docPrueba;

        if (!miNit.value) {
            let emp = null;
            if (docPrueba.emisor) emp = declarantesDB.value.find(d => limpiarNit(d.iddeclaNIT) === limpiarNit(docPrueba.emisor.nit || docPrueba.emisor.numDocumento));
            if (!emp && docPrueba.receptor) {
                emp = declarantesDB.value.find(d => limpiarNit(d.iddeclaNIT) === limpiarNit(docPrueba.receptor.nit || docPrueba.receptor.numDocumento));
                if (!emp && docPrueba.receptor.nrc) emp = declarantesDB.value.find(d => limpiarNit(d.declaNRC) === limpiarNit(docPrueba.receptor.nrc));
            }
            if (emp) miNit.value = limpiarNit(emp.iddeclaNIT); 
        }

        const nitActual = limpiarNit(miNit.value);
        if (!nitActual || nitActual.length < 8) {
            alert("⚠️ Por favor, ingrese su NIT de 14 dígitos en el recuadro superior antes de seleccionar el archivo.");
            if (fileInput.value) fileInput.value.value = '';
            return;
        }

        if (!payloadFinal.value) {
            payloadFinal.value = { 
                backup_info: { nit: nitActual, empresa: miAlias.value || 'Importación', periodo: new Date().getFullYear().toString() }, 
                data: { compras: [], ventas_ccf: [], ventas_cf: [], sujetos_excluidos: [], retenciones: [] } 
            };
        }
        
        if (jsonRaw.identificacion && (jsonRaw.anexo3_compras || jsonRaw.anexo1_consumidor_final || jsonRaw.anexo4_retenciones)) {
          if (jsonRaw.anexo3_compras) {
              jsonRaw.anexo3_compras.forEach(c => payloadFinal.value.data.compras.push({
                  ComFecha: c.fecha.split('T')[0], ComClase: c.clase || '4', ComTipo: c.tipo || '03', 
                  ComNumero: c.numero, ComCodGeneracion: c.numero, proveedor_ProvNIT: c.nit_proveedor, 
                  ComNomProve: c.nombre_proveedor, ComIntExe: parseFloat(c.internas_exentas) || 0, 
                  ComIntGrav: parseFloat(c.internas_gravadas) || 0, ComCredFiscal: parseFloat(c.credito_fiscal) || 0, 
                  ComTotal: parseFloat(c.total) || 0, 
                  ComMesDeclarado: obtenerMesNombre(c.fecha), 
                  ComAnioDeclarado: c.fecha.split('T')[0].split('-')[0]  
              }));
          }
          if (jsonRaw.anexo4_retenciones) {
              jsonRaw.anexo4_retenciones.forEach(r => payloadFinal.value.data.retenciones.push({
                  RetenFecha: r.fecha.split('T')[0], RetenNitAgente: r.nit_agente, RetenNumDoc: r.documento,
                  RetenMontoSujeto: parseFloat(r.monto_sujeto) || 0, RetenMontoDeReten: parseFloat(r.monto_retenido) || 0,
                  RetenMesDeclarado: obtenerMesNombre(r.fecha), RetenAnioDeclarado: r.fecha.split('T')[0].split('-')[0],
                  RetenNumAnexo: '4', RetenListTipoDoc: '07'
              }));
          }
          datosProcesados.value = true;
        } 
        else if (jsonRaw.modulos || jsonRaw.data) { 
          payloadFinal.value = normalizarPayload(jsonRaw);
          datosProcesados.value = true;
        } 
        else { 
          const lista = Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];
          lista.forEach(doc => {
            const dteUnico = doc.dteJson || doc.dte || doc;
            if (dteUnico.identificacion) {
                const clasif = clasificarDTE(dteUnico, nitActual, limpiarNit(miNrc.value));
                if (clasif && clasif.modulo) {
                    if(!payloadFinal.value.data[clasif.modulo]) payloadFinal.value.data[clasif.modulo] = [];
                    payloadFinal.value.data[clasif.modulo].push(clasif.data);
                }
            }
          });
          datosProcesados.value = true;
        }
      } catch (err) { console.error("Error al leer archivo:", err); }
    };
    reader.readAsText(file);
  });
};

const enviarAlBackend = async () => {
  cargando.value = true;
  try {
    const data = payloadFinal.value.data;
    if (data.compras.length === 0 && data.ventas_ccf.length === 0 && data.ventas_cf.length === 0 && data.sujetos_excluidos.length === 0 && data.retenciones?.length === 0) {
        alert("⚠️ El archivo cargado no contiene documentos que le pertenezcan a su empresa (Verifique NIT/DUI/NRC).");
        cargando.value = false;
        return;
    }

    const res = await axios.post(`${BASE_URL}/api/importar-todo`, payloadFinal.value);
    const r = res.data.detalle || {};
    alert(`✅ IMPORTACIÓN EXITOSA\n\n📥 Compras: ${r.compras || 0}\n📥 CCF: ${r.ventas_ccf || 0}\n📥 Consumidor: ${r.ventas_cf || 0}\n📥 Sujetos: ${r.sujetos || 0}\n🛡️ Retenciones: ${r.retenciones || 0}\n\n⚠️ Duplicados Omitidos: ${r.duplicados || 0}`);
    limpiar();
    router.push('/importar-exportar');

  } catch (err) {
    alert("🚨 Error en Servidor: " + (err.response?.data?.message || err.message));
  } finally { 
    cargando.value = false; 
  }
};

const limpiar = () => {
  datosProcesados.value = false;
  payloadFinal.value = null;
  if (fileInput.value) fileInput.value.value = '';
};
</script>

<style scoped>
.reader-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px; animation: fadeIn 0.4s ease-out; }
.border-success { border-top: 4px solid #10b981; }
.delay-100 { animation-delay: 0.1s; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 16px; margin-bottom: 20px; }
.card-header h2 { font-size: 1.25rem; color: #111827; margin: 0; font-weight: 700; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }
.badge-success { font-size: 0.75rem; background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 5px; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.form-group { margin-bottom: 5px; }
.form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.025em; }

.form-control { width: 100%; padding: 0.6rem 0.85rem; font-size: 0.95rem; color: #1f2937; background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { background-color: #fff; border-color: #55C2B7; outline: 0; box-shadow: 0 0 0 3px rgba(85, 194, 183, 0.2); }
.select-highlight { border-color: #f59e0b; background-color: #fffbeb; }
.fw-bold { font-weight: 700; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-success { background-color: #10b981; color: white; } .btn-success:hover:not(:disabled) { background-color: #059669; }
.btn-danger { background-color: #ef4444; color: white; } .btn-danger:hover { background-color: #dc2626; }
.btn-secondary { background-color: #fff; color: #4b5563; border: 1px solid #d1d5db; } .btn-secondary:hover { background-color: #f3f4f6; }
.action-group { display: flex; gap: 10px; }

.upload-area { margin-top: 10px; }
.drop-zone { border: 2px dashed #d1d5db; border-radius: 12px; padding: 50px 20px; text-align: center; cursor: pointer; background-color: #f9fafb; transition: all 0.3s; }
.drop-zone:hover { border-color: #55C2B7; background-color: #f0fdfa; }
.upload-icon { font-size: 3rem; display: block; margin-bottom: 15px; opacity: 0.7; }
.drop-zone h3 { font-size: 1.2rem; color: #374151; margin-bottom: 5px; }
.hidden-input { display: none; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
.stat-card { display: flex; align-items: center; gap: 15px; padding: 20px; border-radius: 12px; background: white; border: 1px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.stat-icon { font-size: 2rem; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 1.8rem; font-weight: 800; margin: 0; line-height: 1; }
.stat-label { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin: 5px 0 0 0; }

.stat-blue { border-left: 5px solid #3b82f6; } .stat-blue .stat-value { color: #1d4ed8; } .stat-blue .stat-label { color: #60a5fa; }
.stat-green { border-left: 5px solid #10b981; } .stat-green .stat-value { color: #047857; } .stat-green .stat-label { color: #34d399; }
.stat-orange { border-left: 5px solid #f59e0b; } .stat-orange .stat-value { color: #b45309; } .stat-orange .stat-label { color: #fbbf24; }
.stat-purple { border-left: 5px solid #8b5cf6; } .stat-purple .stat-value { color: #6d28d9; } .stat-purple .stat-label { color: #a78bfa; }
.stat-red { border-left: 5px solid #ef4444; } .stat-red .stat-value { color: #b91c1c; } .stat-red .stat-label { color: #f87171; }

.section-title { font-size: 1rem; color: #374151; font-weight: 700; margin-bottom: 15px; border-left: 4px solid #55C2B7; padding-left: 12px; }
.table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; background: white; }
.table th { text-align: left; padding: 14px 18px; background-color: #f8fafc; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e5e7eb; }
.table td { padding: 14px 18px; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; color: #374151; vertical-align: middle; }
.table tr:hover td { background-color: #f9fafb; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-warning { color: #d97706; } .text-dark { color: #1f2937; } .text-danger { color: #ef4444; } .text-muted { color: #6b7280; } .text-secondary { color: #6b7280; }
.text-sm { font-size: 0.85rem; } .text-xs { font-size: 0.75rem; }
.doc-number { font-family: monospace; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
.badge-type { padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.badge-type.blue { background: #dbeafe; color: #1e40af; }
.badge-type.red { background: #fee2e2; color: #b91c1c; }
.mt-2 { margin-top: 10px; } .mt-3 { margin-top: 15px; } .mt-4 { margin-top: 25px; }

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; }
  .card-header.flex-between { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; display: flex; flex-direction: column; gap: 10px;}
  .header-actions .btn { width: 100%; }
}
</style>