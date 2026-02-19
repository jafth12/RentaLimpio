<template>
  <div class="reader-container">
    <div class="header-box">
      <h1>🇸🇻 Lector DTE Inteligente</h1>
      <p>Importador de JSON Hacienda y Backups del Sistema</p>
    </div>

    <div class="config-card">
      <label>🏢 Ingresa TU NIT (Obligatorio - El que está en tu Base de Datos):</label>
      <div class="input-group">
        <input 
          v-model="miNit" 
          type="text" 
          placeholder="Ej: 06192901600027" 
          class="nit-input"
        />
      </div>
      
      <label style="margin-top: 15px; display:block; color:#555;">🆔 Ingresa tu DUI o NRC (Opcional - Si tu factura viene con este ID):</label>
      <div class="input-group">
        <input 
          v-model="miAlias" 
          type="text" 
          placeholder="Ej: 024985769 o 52795" 
          class="nit-input alias-input"
        />
        <small style="display:block; margin-top:5px;">Hacienda ahora usa DUI como NIT. Ponlo aquí para que el lector lo reconozca.</small>
      </div>
    </div>

    <div v-if="!datosProcesados" class="upload-area">
      <div 
        class="drop-zone" 
        @dragover.prevent 
        @dragenter.prevent 
        @drop.prevent="cargarArchivo"
      >
        <span class="icon">📂</span>
        <h3>Arrastra tus archivos JSON aquí</h3>
        <p>Compatible con: Backups de RentaLimpio y JSONs de Hacienda</p>
        <input type="file" multiple @change="cargarArchivo" accept=".json" />
      </div>
    </div>

    <div v-else class="preview-area">
      <div class="actions">
        <button @click="limpiar" class="btn-cancel">❌ Cancelar</button>
        <button @click="enviarAlBackend" class="btn-save" :disabled="cargando">
          {{ cargando ? 'Guardando...' : '💾 Confirmar e Importar' }}
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card blue">
          <h3>🛒 Compras</h3>
          <p class="number">{{ payloadFinal?.data?.compras?.length || 0 }}</p>
          <small>Receptor (Gastos)</small>
        </div>
        <div class="stat-card green">
          <h3>📄 Crédito Fiscal</h3>
          <p class="number">{{ payloadFinal?.data?.ventas_ccf?.length || 0 }}</p>
          <small>Ventas (Tipo 03)</small>
        </div>
        <div class="stat-card orange">
          <h3>🧾 Consumidor Final</h3>
          <p class="number">{{ payloadFinal?.data?.ventas_cf?.length || 0 }}</p>
          <small>Ventas (Tipo 01)</small>
        </div>
        <div class="stat-card purple">
          <h3>🚫 Suj. Excluidos</h3>
          <p class="number">{{ payloadFinal?.data?.sujetos_excluidos?.length || 0 }}</p>
          <small>Ventas (Tipo 14)</small>
        </div>
      </div>

      <div v-if="payloadFinal?.data?.compras?.length > 0" class="table-container">
        <h3>🔍 Detalle: Compras Detectadas</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Proveedor</th>
              <th>IVA Extraído</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in payloadFinal?.data?.compras?.slice(0, 10)" :key="idx">
              <td>{{ item.ComFecha || item.fecha }}</td>
              <td>{{ item.ComNumero || item.numero }}</td>
              <td>{{ item.ComNomProve || item.proveedor_nombre }}</td>
              <td style="color:#e65100; font-weight:bold;">${{ (parseFloat(item.ComCredFiscal) || 0).toFixed(2) }}</td>
              <td>${{ (parseFloat(item.ComTotal || item.valores?.total) || 0).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="payloadFinal?.data?.compras?.length > 10" class="more">... y más registros ...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const miNit = ref('');
const miAlias = ref(''); // Para atrapar el DUI o NRC
const datosProcesados = ref(false);
const cargando = ref(false);
const payloadFinal = ref(null);

const limpiarNit = (texto) => texto ? texto.toString().replace(/[^0-9]/g, '') : '';

// --- NORMALIZADOR DE ESTRUCTURA ---
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
      sujetos_excluidos: json.data?.sujetos_excluidos || json.modulos?.sujetos_excluidos || []
    }
  };
};

// --- CLASIFICADOR OFICIAL HACIENDA ---
const clasificarDTE = (dte) => {
  const ident = dte.identificacion || {};
  const emisor = dte.emisor || {};
  const receptor = dte.receptor || {};
  const resumen = dte.resumen || {};

  const tipoDte = ident.tipoDte || '00';
  const numero = ident.numeroControl || 'S/N';
  const fecha = ident.fecEmi || new Date().toISOString().split('T')[0];
  const codGen = ident.codigoGeneracion || null; 
  
  const total = parseFloat(resumen.totalPagar) || 0;
  
  // 🛡️ RECUPERADO: Extracción Inteligente de IVA (Gasolineras)
  let iva = parseFloat(resumen.totalIva) || 0;
  if (iva === 0 && resumen.tributos) {
    const tribIva = resumen.tributos.find(t => t.codigo === '20'); // 20 es el código de IVA
    if (tribIva) iva = parseFloat(tribIva.valor) || 0;
  }
  
  const gravado = parseFloat(resumen.totalGravada) || (total - iva);

  const miNitClean = limpiarNit(miNit.value);
  const miAliasClean = limpiarNit(miAlias.value);
  const emisorNit = limpiarNit(emisor.nit);
  const receptorNit = limpiarNit(receptor.nit);
  const emisorNrc = limpiarNit(emisor.nrc);
  const receptorNrc = limpiarNit(receptor.nrc);

  // 🛡️ RECUPERADO: Comprobación de Alias (Reconoce si te facturaron con DUI)
  const soyReceptor = receptorNit === miNitClean || (miAliasClean && (receptorNit === miAliasClean || receptorNrc === miAliasClean));
  const soyEmisor = emisorNit === miNitClean || (miAliasClean && (emisorNit === miAliasClean || emisorNrc === miAliasClean));

  const resultado = { modulo: null, data: null };

  // 1. COMPRAS (Yo soy el receptor)
  if (soyReceptor) {
    resultado.modulo = 'compras';
    resultado.data = {
      ComFecha: fecha, ComTipo: tipoDte, ComNumero: numero,
      ComCodGeneracion: codGen,
      proveedor_ProvNIT: emisorNit,
      ComNomProve: emisor.nombre?.toUpperCase(),
      ComIntGrav: gravado, ComCredFiscal: iva, ComTotal: total,
      ComClase: '4', ComAnexo: '3'
    };
  } 
  // 2. VENTAS (Yo soy el emisor)
  else if (soyEmisor) {
    if (tipoDte === '03') { // CRÉDITO FISCAL
      resultado.modulo = 'ventas_ccf'; // 🛠️ CORREGIDO (Antes ventas_credito_fiscal)
      resultado.data = {
        FiscFecha: fecha, FiscNumDoc: numero, 
        FiscCodGeneracion: codGen,
        FiscNit: receptorNit,
        FiscNomRazonDenomi: receptor.nombre?.toUpperCase(),
        FiscVtaGravLocal: gravado, FiscDebitoFiscal: iva, FiscTotalVtas: total,
        FisClasDoc: '4', FisTipoDoc: '03', FiscNumAnexo: '2'
      };
    } else if (tipoDte === '01') { // CONSUMIDOR FINAL
      resultado.modulo = 'ventas_cf'; // 🛠️ CORREGIDO (Antes ventas_consumidor)
      resultado.data = {
        ConsFecha: fecha, ConsNumDocDEL: numero, ConsNumDocAL: numero,
        ConsCodGeneracion: codGen,
        ConsVtaGravLocales: gravado, ConsTotalVta: total,
        ConsClaseDoc: 'DTE', ConsTipoDoc: '01. FACTURA', ConsNumAnexo: '1'
      };
    } else if (tipoDte === '14') { // SUJETOS EXCLUIDOS
      resultado.modulo = 'sujetos_excluidos';
      resultado.data = {
        ComprasSujExcluFecha: fecha, ComprasSujExcluNumDoc: numero,
        ComprasSujExcluCodGeneracion: codGen,
        ComprasSujExcluNIT: receptorNit,
        ComprasSujExcluNom: receptor.nombre?.toUpperCase(),
        ComprasSujExcluMontoOpera: total,
        ComprasSujExcluMontoReten: (total * 0.10).toFixed(2),
        ComprasSujExcluAnexo: '5'
      };
    }
  }
  return resultado;
};

// --- CARGAR ARCHIVOS ---
const cargarArchivo = (event) => {
  // Prevenir que el navegador abra el JSON en otra pestaña al soltarlo
  if (event.preventDefault) event.preventDefault();

  if (!miNit.value || miNit.value.length < 5) {
    alert("⚠️ Por favor, ingresa TU NIT principal primero.");
    if (event.target) event.target.value = '';
    return;
  }
  const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
  
  if (!files || files.length === 0) return;

  if (!payloadFinal.value) payloadFinal.value = normalizarPayload({});

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonRaw = JSON.parse(e.target.result);
        
        let dteReal = jsonRaw.dte || jsonRaw.dteJson || jsonRaw;
        
        if (jsonRaw.modulos || jsonRaw.data) { 
          payloadFinal.value = normalizarPayload(jsonRaw);
          datosProcesados.value = true;
        } else { 
          const lista = Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];
          lista.forEach(doc => {
            const dteUnico = doc.dteJson || doc.dte || doc;
            const clasif = clasificarDTE(dteUnico);
            if (clasif.modulo && payloadFinal.value.data[clasif.modulo]) {
              payloadFinal.value.data[clasif.modulo].push(clasif.data);
            }
          });
          datosProcesados.value = true;
        }
      } catch (err) { console.error("Error en archivo:", err); }
    };
    reader.readAsText(file);
  });
};

const enviarAlBackend = async () => {
  cargando.value = true;
  try {
    const res = await axios.post(`${BASE_URL}/api/importar-todo`, payloadFinal.value);
    const r = res.data.detalle || {};
    alert(`✅ PROCESO EXITOSO\n\n📥 Compras: ${r.compras || 0}\n📥 CCF: ${r.ventas_ccf || 0}\n📥 Consumidor: ${r.ventas_cf || 0}\n📥 Sujetos: ${r.sujetos || 0}\n\n⚠️ Duplicados: ${r.duplicados || 0}`);
    limpiar();
  } catch (err) {
    alert("🚨 Error: " + (err.response?.data?.message || err.message));
  } finally { cargando.value = false; }
};

const limpiar = () => {
  datosProcesados.value = false;
  payloadFinal.value = null;
};
</script>

<style scoped>
.reader-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.header-box { text-align: center; margin-bottom: 30px; }
.config-card { background: #e3f2fd; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #90caf9; margin-bottom: 20px; }
.nit-input { padding: 10px; font-size: 18px; text-align: center; border-radius: 5px; border: 1px solid #ccc; width: 250px; margin-top: 10px; }
.alias-input { background-color: #fff9c4; border-color: #ffb300; }
.upload-area { display: flex; justify-content: center; margin-top: 20px; }
.drop-zone { border: 3px dashed #ccc; padding: 50px; border-radius: 15px; text-align: center; cursor: pointer; width: 100%; background: #fafafa; }
.drop-zone:hover { border-color: #2196f3; background: #e3f2fd; }
.icon { font-size: 3rem; display: block; margin-bottom: 10px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 20px 0; }
.stat-card { padding: 15px; border-radius: 10px; color: white; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.number { font-size: 2.2rem; font-weight: bold; margin: 5px 0; }
.blue { background: #2196f3; } .green { background: #4caf50; } .orange { background: #ff9800; } .purple { background: #9c27b0; }
.table-container { margin-top: 20px; overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 15px; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #eee; padding: 10px; text-align: left; }
th { background: #f5f5f5; color: #666; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 15px; }
.btn-save { background: #2e7d32; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
.btn-save:hover { background: #1b5e20; }
.btn-save:disabled { background: #a5d6a7; cursor: not-allowed; }
.btn-cancel { background: #d32f2f; color: white; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; }
.btn-cancel:hover { background: #b71c1c; }
</style>