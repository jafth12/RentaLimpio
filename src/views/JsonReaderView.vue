<template>
  <div class="reader-container">
    <div class="header-box">
      <h1>🇸🇻 Lector DTE Inteligente</h1>
      <p>Importador de JSON Hacienda y Backups del Sistema</p>
    </div>

    <div class="config-card">
      <label>🏢 Ingresa TU NIT (Sin guiones):</label>
      <div class="input-group">
        <input 
          v-model="miNit" 
          type="text" 
          placeholder="Ej: 06140101901234" 
          class="nit-input"
        />
        <small>El sistema usará este NIT para clasificar (Venta vs Compra)</small>
      </div>
    </div>

    <div v-if="!datosProcesados" class="upload-area">
      <div class="drop-zone">
        <span class="icon">📂</span>
        <h3>Arrastra tu archivo JSON aquí</h3>
        <p>Compatible con: Backups de RentaLimpio y JSONs de Hacienda</p>
        <input type="file" @change="cargarArchivo" accept=".json" />
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
          <p class="number">{{ payloadFinal?.modulos?.compras?.length || 0 }}</p>
          <small>Receptor (Gastos)</small>
        </div>
        <div class="stat-card green">
          <h3>📄 Crédito Fiscal</h3>
          <p class="number">{{ payloadFinal?.modulos?.ventas_credito_fiscal?.length || 0 }}</p>
          <small>Ventas (Tipo 03)</small>
        </div>
        <div class="stat-card orange">
          <h3>🧾 Consumidor Final</h3>
          <p class="number">{{ payloadFinal?.modulos?.ventas_consumidor?.length || 0 }}</p>
          <small>Ventas (Tipo 01)</small>
        </div>
        <div class="stat-card purple">
          <h3>🚫 Suj. Excluidos</h3>
          <p class="number">{{ payloadFinal?.modulos?.sujetos_excluidos?.length || 0 }}</p>
          <small>Ventas (Tipo 14)</small>
        </div>
      </div>

      <div v-if="payloadFinal?.modulos?.compras?.length > 0" class="table-container">
        <h3>🔍 Detalle: Compras Detectadas</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Proveedor</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in payloadFinal.modulos.compras.slice(0, 10)" :key="idx">
              <td>{{ item.fecha }}</td>
              <td>{{ item.numero }}</td>
              <td>{{ item.proveedor_nombre || item.proveedor?.nombre }}</td>
              <td>${{ (item.valores?.total || 0).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="payloadFinal.modulos.compras.length > 10" class="more">... y más registros ...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const hostname = window.location.hostname; // Usamos IP dinámica para evitar error de red
const BASE_URL = `http://${hostname}:3000`;

const miNit = ref('');
const datosProcesados = ref(null);
const cargando = ref(false);
const payloadFinal = ref(null);

const limpiarNit = (texto) => texto ? texto.toString().replace(/[^0-9]/g, '') : '';

// --- NORMALIZADOR DE BACKUPS ---
const normalizarPayload = (json) => {
  const normalizado = {
    encabezado: json.encabezado || { 
      nit_declarante: miNit.value, 
      periodo: { mes: 'Importado', anio: new Date().getFullYear() } 
    },
    modulos: {
      compras: [],
      ventas_consumidor: [],
      ventas_credito_fiscal: [],
      sujetos_excluidos: []
    }
  };

  if (json.modulos) {
    normalizado.modulos.compras = json.modulos.compras || [];
    normalizado.modulos.ventas_credito_fiscal = json.modulos.ventas_credito_fiscal || [];
    normalizado.modulos.sujetos_excluidos = json.modulos.sujetos_excluidos || [];
    normalizado.modulos.ventas_consumidor = 
      json.modulos.ventas_consumidor || 
      json.modulos.ventas_consumidor_final || 
      [];
  }
  return normalizado;
};

// --- CLASIFICADOR HACIENDA ---
const clasificarDTE = (dte) => {
  const ident = dte.identificacion || {};
  const emisor = dte.emisor || {};
  const receptor = dte.receptor || {};
  const resumen = dte.resumen || {};

  const tipoDte = ident.tipoDte || '00';
  const numero = ident.numeroControl || 'S/N';
  const fecha = ident.fecEmi || new Date().toISOString().split('T')[0];
  const total = parseFloat(resumen.totalPagar) || 0;
  const iva = parseFloat(resumen.totalIva) || 0;
  const gravado = parseFloat(resumen.totalGravada) || (total - iva);

  const miNitClean = limpiarNit(miNit.value);
  const emisorNit = limpiarNit(emisor.nit);
  const receptorNit = limpiarNit(receptor.nit);

  const resultado = { modulo: null, data: null };

  if (receptorNit === miNitClean) {
    resultado.modulo = 'compras';
    resultado.data = {
      fecha, tipo_doc: tipoDte, numero,
      proveedor_nit: emisor.nit, proveedor_nombre: emisor.nombre,
      valores: { gravado, iva, total }
    };
  } else if (emisorNit === miNitClean) {
    if (tipoDte === '03') {
      resultado.modulo = 'ventas_credito_fiscal';
      resultado.data = {
        fecha, numero, cliente_nit: receptor.nit, cliente_nombre: receptor.nombre,
        valores: { gravado, iva, total }
      };
    } else if (tipoDte === '01') {
      resultado.modulo = 'ventas_consumidor';
      resultado.data = {
        fecha, del: numero, al: numero,
        valores: { gravado, exento: 0, total }
      };
    } else if (tipoDte === '14') {
      resultado.modulo = 'sujetos_excluidos';
      resultado.data = {
        fecha, numero, sujeto_nit: receptor.nit, sujeto_nombre: receptor.nombre,
        valores: { monto: total, retencion: 0 }
      };
    }
  }
  return resultado;
};

// --- CARGAR ARCHIVO ---
const cargarArchivo = (event) => {
  if (!miNit.value || miNit.value.length < 5) {
    alert("⚠️ Por favor, ingresa TU NIT primero para poder clasificar.");
    event.target.value = '';
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonRaw = JSON.parse(e.target.result);
      
      if (jsonRaw.modulos) {
        payloadFinal.value = normalizarPayload(jsonRaw);
      } else {
        const estructura = normalizarPayload({}); 
        const lista = Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];
        
        lista.forEach(doc => {
          const dteReal = doc.dteJson || doc;
          const clasif = clasificarDTE(dteReal);
          if (clasif.modulo) {
            estructura.modulos[clasif.modulo].push(clasif.data);
          }
        });
        payloadFinal.value = estructura;
      }
      datosProcesados.value = true;
    } catch (error) {
      alert("Error: El archivo no es un JSON válido.");
    }
  };
  reader.readAsText(file);
};

// --- ENVIAR (AQUÍ ESTÁ LA CORRECCIÓN) ---
const enviarAlBackend = async () => {
  cargando.value = true;
  try {
    const response = await axios.post(`${BASE_URL}/api/importar-todo`, payloadFinal.value);
    
    // El backend ahora devuelve una estructura simple (números), no objetos complejos
    const reporte = response.data.detalle || {};
    
    // Usamos ?. para evitar errores si algo viene undefined
    const compras = reporte.compras || 0;
    const ventasCCF = reporte.ventas_ccf || reporte.ventas_credito_fiscal || 0;
    const ventasCF = reporte.ventas_cf || reporte.ventas_consumidor || 0;
    const errores = reporte.errores || 0;

    alert(`
      ✅ PROCESO FINALIZADO
      
      📥 Compras Guardadas: ${compras}
      📥 Ventas CCF Guardadas: ${ventasCCF}
      📥 Ventas Consumidor: ${ventasCF}
      
      ⚠️ Errores/Omitidos: ${errores}
    `);
    
    limpiar();
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    alert("⛔ Ocurrió un error: " + msg);
  } finally {
    cargando.value = false;
  }
};

const limpiar = () => {
  datosProcesados.value = null;
  payloadFinal.value = null;
};
</script>

<style scoped>
.reader-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.header-box { text-align: center; margin-bottom: 30px; }
.config-card { background: #e3f2fd; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #90caf9; margin-bottom: 20px; }
.nit-input { padding: 10px; font-size: 18px; text-align: center; border-radius: 5px; border: 1px solid #ccc; width: 250px; margin-top: 10px; }
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