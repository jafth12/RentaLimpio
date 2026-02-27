<template>
  <MainLayout>
    <div class="data-container">
      
      <div class="header-section">
        <div class="title-box">
          <h1>🔄 Centro de Datos JSON y Reportes</h1>
          <p class="subtitle">Gestione la importación y exportación masiva de documentos tributarios.</p>
        </div>
      </div>

      <div class="dashboard-grid">
        
        <div class="left-col">
          
          <div class="card fade-in">
            <div class="card-header">
              <h2>1. Seleccione Contribuyente y Módulo</h2>
              <span class="badge-info">Origen de los datos</span>
            </div>
            
            <div class="form-group mb-3">
               <label class="form-label text-dark fw-bold">🏢 Empresa / Declarante <span class="text-danger">*</span></label>
               <select v-model="nitSeleccionado" class="form-control select-highlight">
                  <option value="" disabled>-- Seleccione una empresa --</option>
                  <option v-for="d in declarantesDB" :key="d.iddeclaNIT" :value="d.iddeclaNIT">
                     {{ d.declarante }} (NIT: {{ d.iddeclaNIT }})
                  </option>
               </select>
            </div>

            <div class="grid-modulos">
              <div 
                v-for="mod in modulos" 
                :key="mod.id" 
                class="modulo-item" 
                :class="{ active: moduloSeleccionado === mod.id }"
                @click="moduloSeleccionado = mod.id"
              >
                <div class="icon-circle">{{ mod.icono }}</div>
                <span class="nombre">{{ mod.nombre }}</span>
                <div class="check-mark" v-if="moduloSeleccionado === mod.id">✔</div>
              </div>
            </div>
          </div>

          <div class="card fade-in delay-100">
            <div class="card-header">
              <h2>2. Configuración</h2>
              <span class="badge-info">Parámetros</span>
            </div>

            <div class="tabs-container">
              <button 
                class="tab-btn" 
                :class="{ active: accion === 'exportar' }" 
                @click="accion = 'exportar'"
              >
                📤 Exportar (Bajar)
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: accion === 'importar' }" 
                @click="accion = 'importar'"
              >
                📥 Importar (Subir)
              </button>
            </div>

            <div v-if="accion === 'exportar'" class="export-card card fade-in mb-3">
               <h3 class="text-hacienda">🏛️ Reportes Legales</h3>
               <p class="text-sm-hacienda">Genera archivos para Hacienda, Libros Físicos o tablas en Excel.</p>
               <div class="export-controls mt-2">
                  <button v-if="moduloSeleccionado === 'todo'" @click="descargarAnexosHacienda" class="btn btn-dark-blue btn-block mb-2" :disabled="!nitSeleccionado">
                    📦 Descargar F07 (JSON Consolidado)
                  </button>

                  <div class="flex-buttons gap-2 mt-2">
                    <button 
                       v-if="moduloSeleccionado !== 'todo'" 
                       @click="descargarAnexoCSV" 
                       class="btn btn-success flex-1" 
                       :disabled="!nitSeleccionado">
                      {{ textoBotonCSV }}
                    </button>

                    <button 
                       v-if="moduloSeleccionado !== 'todo'"
                       @click="generarLibroContableExcel" 
                       class="btn btn-primary flex-1" 
                       :disabled="!nitSeleccionado || cargando">
                      📊 Libro (Excel)
                    </button>
                    
                    <button 
                       v-if="moduloSeleccionado !== 'todo'"
                       @click="generarLibroContablePDF" 
                       class="btn btn-purple flex-1" 
                       :disabled="!nitSeleccionado || cargando">
                      🖨️ Libro (PDF)
                    </button>

                    <button 
                       v-if="moduloSeleccionado === 'todo'"
                       @click="generarPDFMensual" 
                       class="btn btn-danger flex-1" 
                       :disabled="!nitSeleccionado || cargando">
                      📄 Generar Resumen PDF
                    </button>
                  </div>
               </div>
            </div>

            <div class="config-body">
              
              <div v-if="accion === 'exportar'" class="animate-slide">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Mes a Reportar</label>
                    <select v-model="mes" class="form-control">
                      <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Año</label>
                    <input type="number" v-model="anio" class="form-control">
                  </div>
                </div>
                <div class="info-note">
                  <small>📅 Se generará un backup JSON de seguridad de este módulo.</small>
                </div>
              </div>

              <div v-if="accion === 'importar'" class="import-info animate-slide">
                <div class="icon-big">🧐</div>
                <div class="text-content">
                  <h4>Validación Requerida</h4>
                  <p>Para asegurar la integridad de los datos, serás redirigido al <strong>Lector Inteligente</strong>.</p>
                </div>
              </div>

              <div class="action-area mt-3">
                <button @click="procesarAccion" class="btn btn-dark btn-block" :disabled="cargando || (accion === 'exportar' && !nitSeleccionado)">
                  {{ cargando ? 'Procesando...' : (accion === 'exportar' ? '🚀 Generar Backup del Módulo (JSON)' : '🔍 Ir al Lector Inteligente') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="card full-height fade-in delay-200">
            <div class="card-header">
              <h2>📊 Resultado del Backup</h2>
              <span class="badge-info">Vista previa</span>
            </div>

            <div v-if="!resultado" class="empty-state">
              <span class="empty-icon">📄</span>
              <h3>Esperando operación</h3>
              <p>Seleccione un módulo y configure los parámetros para ver el resultado aquí.</p>
            </div>

            <div v-else class="resultado-container">
              
              <div class="status-banner" :class="resultado.tipo">
                <span class="status-icon">{{ resultado.tipo === 'success' ? '✅' : '❌' }}</span>
                <div class="status-text">
                  <h4>{{ resultado.titulo }}</h4>
                  <small>{{ resultado.archivo }}</small>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">Registros</span>
                  <span class="value">{{ resultado.cantidad }}</span>
                </div>
                <div class="stat-item" v-if="resultado.total">
                  <span class="label">Total Operado</span>
                  <span class="value text-success">${{ resultado.total }}</span>
                </div>
              </div>

              <div class="code-preview">
                <div class="code-header">Vista Previa (Snippet)</div>
                <pre class="json-code">{{ resultado.snippet }}</pre>
              </div>

              <div class="download-area" v-if="accion === 'exportar' && resultado.tipo === 'success'">
                <button @click="descargarArchivoReal" class="btn btn-success btn-block btn-download">
                  💾 Descargar Backup Final
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '../layouts/MainLayout.vue';
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style'; 

const router = useRouter(); 
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const moduloSeleccionado = ref('todo'); // 🛡️ Por defecto inicia en Reporte General
const accion = ref('exportar');
const mes = ref('Febrero'); 
const anio = ref(new Date().getFullYear());
const cargando = ref(false);
const resultado = ref(null);
const urlDescargaBlob = ref(null);

const declarantesDB = ref([]);
const nitSeleccionado = ref(''); 

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const modulos = [
  { id: 'todo', nombre: 'Reporte General', icono: '📦' },
  { id: 'compras', nombre: 'Compras', icono: '🛒' },
  { id: 'ventas_cf', nombre: 'Consumidor Final', icono: '🧾' }, 
  { id: 'ventas_ccf', nombre: 'Crédito Fiscal', icono: '💼' }, 
  { id: 'sujetos', nombre: 'Sujetos Excluidos', icono: '🚫' },
];

onMounted(async () => {
    try {
        const res = await axios.get(`${BASE_URL}/api/declarantes`);
        declarantesDB.value = res.data || [];
    } catch (error) {
        console.error("Error cargando declarantes:", error);
    }
});

const textoBotonCSV = computed(() => {
    switch (moduloSeleccionado.value) {
        case 'todo': return '📋 CSV (No disponible en General)';
        case 'compras': return '📋 CSV (Compras)';
        case 'ventas_cf': return '📋 CSV (Cons. Final)';
        case 'ventas_ccf': return '📋 CSV (Crédito Fiscal)';
        case 'sujetos': return '📋 CSV (Sujetos)';
        default: return '📋 CSV';
    }
});

const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '';
    const partes = String(fechaIso).split('T')[0].split('-');
    if (partes.length === 3) {
        const dia = partes[2];
        const mes = partes[1];
        const anioCorto = partes[0].slice(-2); 
        return `${dia}/${mes}/${anioCorto}`;
    }
    return String(fechaIso).split('T')[0];
};

const construirFilaConEstilo = (fila, esCabecera = false, esTotal = false) => {
    return fila.map((celda, index) => {
        let estilo = { font: { name: "Arial" }, alignment: { vertical: "center" } };
        let celdaObj = { v: celda }; 

        if (esCabecera) {
            estilo.font.bold = true;
            estilo.font.color = { rgb: "FFFFFF" };
            estilo.fill = { fgColor: { rgb: "1E3A8A" } };
            estilo.alignment.horizontal = "center";
            estilo.alignment.wrapText = true; 
            estilo.border = { top: { style: "medium", color: { rgb: "1E3A8A" } }, bottom: { style: "medium", color: { rgb: "1E3A8A" } } };
            celdaObj.t = 's'; 
        } else if (esTotal) {
            estilo.font.bold = true;
            estilo.fill = { fgColor: { rgb: "E2E8F0" } };
            estilo.border = { top: { style: "thin", color: { rgb: "94A3B8" } }, bottom: { style: "double", color: { rgb: "64748B" } } };
            
            if (typeof celda === 'number') {
                celdaObj.t = 'n'; 
                estilo.alignment.horizontal = "right";
                if (index > 0) celdaObj.z = '#,##0.00'; 
            } else {
                celdaObj.t = 's'; 
                if (celda === 'TOTALES:') estilo.alignment.horizontal = "right";
            }
        } else {
            estilo.border = { bottom: { style: "thin", color: { rgb: "F1F5F9" } } };
            
            if (typeof celda === 'number') {
                celdaObj.t = 'n'; 
                if (index === 0) {
                    estilo.alignment.horizontal = "center"; 
                    celdaObj.z = '0'; 
                } else {
                    estilo.alignment.horizontal = "right";
                    celdaObj.z = '#,##0.00'; 
                }
            } else {
                celdaObj.t = 's'; 
                estilo.alignment.horizontal = "left";
            }
        }
        
        celdaObj.s = estilo; 
        return celdaObj;
    });
};

// =======================================================
// 🛡️ GENERAR LIBRO CONTABLE EN EXCEL (.XLSX)
// =======================================================
const generarLibroContableExcel = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) {
        alert("Seleccione Empresa, Mes y Año.");
        return;
    }

    // 🛡️ REGLA: Excel no soporta el reporte general (son tablas distintas)
    if (moduloSeleccionado.value === 'todo') {
        alert("📊 Para el Reporte General completo, por favor utilice el botón de 'Resumen PDF' o genere el Backup JSON. Los libros de Excel se descargan seleccionando un módulo individual (Ej. Compras).");
        return;
    }

    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value }
        });
        
        const data = res.data;
        const nombreEmpresa = data.identificacion.razon_social;
        
        const getNum = (val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
        };

        let tituloLibro = "";
        let headTabla = [];
        let bodyTabla = [];
        let totales = {};

        if (moduloSeleccionado.value === 'compras') {
            tituloLibro = "LIBRO DE COMPRAS";
            headTabla = [
                'N°', 'Fecha', 'N° de Documento', 'NIT\nProveedor', 'Nombre del\nProveedor', 
                'Compras\nExentas', 'Importaciones e\nInternaciones Exentas', 'Compras\nGravadas', 
                'Importaciones e\nInternaciones Gravadas', 'Crédito\nFiscal', 'Anticipo a Cuenta\nIVA Percibido', 
                'Compras a\nSujetos Excluidos', 'Total\nCompras'
            ];
            
            const registros = data.anexo3_compras ? data.anexo3_compras.slice() : []; 
            
            bodyTabla = registros.map((c, idx) => {
                const exen = getNum(c.internas_exentas);
                const impExen = getNum(c.importaciones_exentas);
                const grav = getNum(c.internas_gravadas);
                const impGrav = getNum(c.importaciones_gravadas);
                const iva = getNum(c.credito_fiscal);
                const percibido = getNum(c.iva_percibido);
                const sujetos = getNum(c.sujetos_excluidos);
                const total = getNum(c.total);

                totales.exen = getNum((totales.exen || 0) + exen);
                totales.impExen = getNum((totales.impExen || 0) + impExen);
                totales.grav = getNum((totales.grav || 0) + grav);
                totales.impGrav = getNum((totales.impGrav || 0) + impGrav);
                totales.iva = getNum((totales.iva || 0) + iva);
                totales.percibido = getNum((totales.percibido || 0) + percibido);
                totales.sujetos = getNum((totales.sujetos || 0) + sujetos);
                totales.total = getNum((totales.total || 0) + total);

                return [idx + 1, formatearFecha(c.fecha), c.numero, c.nit_proveedor, c.nombre_proveedor, exen, impExen, grav, impGrav, iva, percibido, sujetos, total];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', totales.exen, totales.impExen, totales.grav, totales.impGrav, totales.iva, totales.percibido, totales.sujetos, totales.total]);

        } else if (moduloSeleccionado.value === 'ventas_cf') {
            tituloLibro = "LIBRO DE VENTAS A CONSUMIDOR FINAL";
            headTabla = ['N°', 'Fecha', 'Documentos\n(Del - Al)', 'Ventas\nExentas', 'Ventas\nGravadas Locales', 'Total\nVentas'];
            const registros = data.anexo1_consumidor_final ? data.anexo1_consumidor_final.slice() : [];

            bodyTabla = registros.map((v, idx) => {
                const exen = getNum(v.exentas);
                const grav = getNum(v.gravadas);
                const total = getNum(v.total);

                totales.exen = getNum((totales.exen || 0) + exen);
                totales.grav = getNum((totales.grav || 0) + grav);
                totales.total = getNum((totales.total || 0) + total);

                return [ idx + 1, formatearFecha(v.fecha), `${v.del} - ${v.al}`, exen, grav, total ];
            });
            bodyTabla.push(['', '', 'TOTALES:', totales.exen, totales.grav, totales.total]);

        } else if (moduloSeleccionado.value === 'ventas_ccf') {
            tituloLibro = "LIBRO DE VENTAS A CONTRIBUYENTES (CRÉDITO FISCAL)";
            headTabla = ['N°', 'Fecha', 'N° Comprobante\nCCF', 'NIT\nCliente', 'Razón\nSocial', 'Exentas', 'Gravadas', 'Débito Fiscal\n(IVA)', 'Total'];
            const registros = data.anexo2_credito_fiscal ? data.anexo2_credito_fiscal.slice() : [];

            bodyTabla = registros.map((v, idx) => {
                const exen = getNum(v.exentas);
                const grav = getNum(v.gravadas);
                const iva = getNum(v.debito_fiscal);
                const total = getNum(v.total);

                totales.exen = getNum((totales.exen || 0) + exen);
                totales.grav = getNum((totales.grav || 0) + grav);
                totales.iva = getNum((totales.iva || 0) + iva);
                totales.total = getNum((totales.total || 0) + total);

                return [idx + 1, formatearFecha(v.fecha), v.numero, v.nit_cliente, v.nombre, exen, grav, iva, total];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', totales.exen, totales.grav, totales.iva, totales.total]);

        } else if (moduloSeleccionado.value === 'sujetos') {
            tituloLibro = "LIBRO DE COMPRAS A SUJETOS EXCLUIDOS";
            headTabla = ['N°', 'Fecha', 'N° Documento', 'NIT / DUI', 'Nombre del\nSujeto', 'Monto\nOperación', 'Retención'];
            const registros = data.anexo5_sujetos_excluidos ? data.anexo5_sujetos_excluidos.slice() : [];

            bodyTabla = registros.map((s, idx) => {
                const monto = getNum(s.monto);
                const retencion = getNum(s.retencion);

                totales.monto = getNum((totales.monto || 0) + monto);
                totales.retencion = getNum((totales.retencion || 0) + retencion);

                return [ idx + 1, formatearFecha(s.fecha), s.documento, s.nit, s.nombre, monto, retencion ];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', totales.monto, totales.retencion]);
        }

        const wsData = [
            [{ v: tituloLibro, s: { font: { bold: true, sz: 16, color: { rgb: "1E3A8A" } } } }],
            [{ v: `Contribuyente: ${nombreEmpresa}`, s: { font: { bold: true, sz: 12, color: { rgb: "334155" } } } }],
            [{ v: `NIT: ${nitSeleccionado.value}`, s: { font: { sz: 11, color: { rgb: "334155" } } } }],
            [{ v: `Mes y Año: ${mes.value} de ${anio.value}`, s: { font: { sz: 11, color: { rgb: "334155" } } } }],
            [], 
            construirFilaConEstilo(headTabla, true, false), 
            ...bodyTabla.map((fila, i) => construirFilaConEstilo(fila, false, i === bodyTabla.length - 1)) 
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = headTabla.map((_, i) => ({ wch: i === 4 ? 35 : (i === 2 || i === 3 ? 20 : 12) }));
        ws['!rows'] = [{hpt: 20}, {hpt: 15}, {hpt: 15}, {hpt: 15}, {hpt: 10}, {hpt: 30}]; 
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LibroContable");
        
        XLSX.writeFile(wb, `Libro_${moduloSeleccionado.value}_${nitSeleccionado.value}_${mes.value}_${anio.value}.xlsx`);
        
        axios.post(`${BASE_URL}/api/historial/pdf`, { modulo: 'LIBRO CONTABLE EXCEL', detalles: `Libro Excel exportado: ${tituloLibro}` }).catch(()=>console.log("Auditoria omitida"));

    } catch (error) {
        console.error("Error generando Excel:", error);
        alert("🚨 Ocurrió un error al generar el archivo Excel.");
    } finally {
        cargando.value = false;
    }
};

// =======================================================
// 🛡️ GENERAR LIBRO CONTABLE FÍSICO EN PDF (OFICIO AL LÍMITE + TRUNCADO)
// =======================================================
const generarLibroContablePDF = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) {
        alert("Seleccione Empresa, Mes y Año.");
        return;
    }

    if (moduloSeleccionado.value === 'todo') {
        return generarPDFMensual();
    }

    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value }
        });
        
        const data = res.data;
        const nombreEmpresa = data.identificacion.razon_social;
        
        // 📏 CAMBIO A TAMAÑO OFICIO HORIZONTAL (l = landscape, legal = oficio)
        const doc = new jsPDF('l', 'mm', 'legal'); 
        
        // 📏 MÁRGENES AL LÍMITE DE LA PÁGINA (2mm por lado)
        const margenSup = 19.1;
        const margenInf = 19.1;
        const margenLat = 2.0; 
        const posEncabezado = 7.6; 
        const pageWidth = doc.internal.pageSize.getWidth();
        
        let tituloLibro = "";
        let bodyTabla = [];
        let headTabla = [];
        let totales = {};
        let configColumnas = {};

        const getNum = (val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
        };

        // ✂️ Al ser tamaño Oficio (más ancho), permitimos hasta 45 letras antes de truncar
        const truncarTexto = (texto, max = 45) => {
            if (!texto) return '';
            return texto.length > max ? texto.substring(0, max) + '...' : texto;
        };

        if (moduloSeleccionado.value === 'compras') {
            tituloLibro = "LIBRO DE COMPRAS";
            headTabla = [[
                'N°', 'Fecha\nEmisión', 'N° de\nDocumento', 'NIT\nProveedor', 'Nombre del\nProveedor', 
                'Compras\nExentas', 'Import. e\nInter. Exentas', 'Compras\nGravadas', 
                'Import. e\nInter. Gravadas', 'Crédito\nFiscal', 'Anticipo a\nCta IVA Perc.', 
                'Compras a\nSuj. Excluidos', 'Total\nCompras'
            ]];
            
            // Ajustamos anchos base para aprovechar el extra de Oficio
            configColumnas = { 
                0: { halign: 'center', cellWidth: 9 },  
                1: { halign: 'center', cellWidth: 18 }, 
                2: { halign: 'center', cellWidth: 38, fontSize: 8.5 },
                3: { halign: 'center', cellWidth: 28 }
            };

            const registros = data.anexo3_compras ? data.anexo3_compras.slice() : []; 
            
            bodyTabla = registros.map((c, idx) => {
                const exen = getNum(c.internas_exentas); const impExen = getNum(c.importaciones_exentas);
                const grav = getNum(c.internas_gravadas); const impGrav = getNum(c.importaciones_gravadas);
                const iva = getNum(c.credito_fiscal); const percibido = getNum(c.iva_percibido);
                const sujetos = getNum(c.sujetos_excluidos); const total = getNum(c.total);

                totales.exen = getNum((totales.exen || 0) + exen); totales.impExen = getNum((totales.impExen || 0) + impExen);
                totales.grav = getNum((totales.grav || 0) + grav); totales.impGrav = getNum((totales.impGrav || 0) + impGrav);
                totales.iva = getNum((totales.iva || 0) + iva); totales.percibido = getNum((totales.percibido || 0) + percibido);
                totales.sujetos = getNum((totales.sujetos || 0) + sujetos); totales.total = getNum((totales.total || 0) + total);

                return [
                    idx + 1, formatearFecha(c.fecha), c.numero, c.nit_proveedor, truncarTexto(c.nombre_proveedor, 45), 
                    `$${exen.toFixed(2)}`, `$${impExen.toFixed(2)}`, `$${grav.toFixed(2)}`, 
                    `$${impGrav.toFixed(2)}`, `$${iva.toFixed(2)}`, `$${percibido.toFixed(2)}`, 
                    `$${sujetos.toFixed(2)}`, `$${total.toFixed(2)}`
                ];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', 
                `$${(totales.exen||0).toFixed(2)}`, `$${(totales.impExen||0).toFixed(2)}`, 
                `$${(totales.grav||0).toFixed(2)}`, `$${(totales.impGrav||0).toFixed(2)}`, 
                `$${(totales.iva||0).toFixed(2)}`, `$${(totales.percibido||0).toFixed(2)}`, 
                `$${(totales.sujetos||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`
            ]);

        } else if (moduloSeleccionado.value === 'ventas_cf') {
            tituloLibro = "LIBRO DE VENTAS A CONSUMIDOR FINAL";
            headTabla = [['N°', 'Fecha\nEmisión', 'Documentos\n(Del - Al)', 'Ventas\nExentas', 'Ventas\nGravadas Locales', 'Total\nVentas']];
            const registros = data.anexo1_consumidor_final ? data.anexo1_consumidor_final.slice() : [];

            configColumnas = { 0: { halign: 'center', cellWidth: 15 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 60 } };

            bodyTabla = registros.map((v, idx) => {
                const exen = getNum(v.exentas); const grav = getNum(v.gravadas); const total = getNum(v.total);
                totales.exen = getNum((totales.exen || 0) + exen); totales.grav = getNum((totales.grav || 0) + grav); totales.total = getNum((totales.total || 0) + total);
                return [ idx + 1, formatearFecha(v.fecha), `${v.del} - ${v.al}`, `$${exen.toFixed(2)}`, `$${grav.toFixed(2)}`, `$${total.toFixed(2)}` ];
            });
            bodyTabla.push(['', '', 'TOTALES:', `$${(totales.exen||0).toFixed(2)}`, `$${(totales.grav||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`]);

        } else if (moduloSeleccionado.value === 'ventas_ccf') {
            tituloLibro = "LIBRO DE VENTAS A CONTRIBUYENTES (CRÉDITO FISCAL)";
            headTabla = [['N°', 'Fecha\nEmisión', 'N° Comprobante\nCCF', 'NIT\nCliente', 'Razón\nSocial', 'Exentas', 'Gravadas', 'Débito Fiscal\n(IVA)', 'Total\nVentas']];
            const registros = data.anexo2_credito_fiscal ? data.anexo2_credito_fiscal.slice() : [];

            configColumnas = { 0: { halign: 'center', cellWidth: 15 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 40, fontSize: 8.5 } };

            bodyTabla = registros.map((v, idx) => {
                const exen = getNum(v.exentas); const grav = getNum(v.gravadas); const iva = getNum(v.debito_fiscal); const total = getNum(v.total);
                totales.exen = getNum((totales.exen || 0) + exen); totales.grav = getNum((totales.grav || 0) + grav); totales.iva = getNum((totales.iva || 0) + iva); totales.total = getNum((totales.total || 0) + total);
                return [idx + 1, formatearFecha(v.fecha), v.numero, v.nit_cliente, truncarTexto(v.nombre, 45), 
                `$${exen.toFixed(2)}`, `$${grav.toFixed(2)}`, `$${iva.toFixed(2)}`, `$${total.toFixed(2)}`];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', `$${(totales.exen||0).toFixed(2)}`, `$${(totales.grav||0).toFixed(2)}`, `$${(totales.iva||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`]);

        } else if (moduloSeleccionado.value === 'sujetos') {
            tituloLibro = "LIBRO DE COMPRAS A SUJETOS EXCLUIDOS";
            headTabla = [['N°', 'Fecha\nEmisión', 'N° Documento', 'NIT / DUI', 'Nombre del\nSujeto', 'Monto de\nOperación', 'Retención\nAplicada']];
            const registros = data.anexo5_sujetos_excluidos ? data.anexo5_sujetos_excluidos.slice() : [];

            configColumnas = { 0: { halign: 'center', cellWidth: 15 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 45 } };

            bodyTabla = registros.map((s, idx) => {
                const monto = getNum(s.monto); const retencion = getNum(s.retencion);
                totales.monto = getNum((totales.monto || 0) + monto); totales.retencion = getNum((totales.retencion || 0) + retencion);
                return [ idx + 1, formatearFecha(s.fecha), s.documento, s.nit, truncarTexto(s.nombre, 45), 
                `$${monto.toFixed(2)}`, `$${retencion.toFixed(2)}` ];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', `$${(totales.monto||0).toFixed(2)}`, `$${(totales.retencion||0).toFixed(2)}`]);
        }

        // 📏 ENCABEZADO
        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 58, 138); 
        doc.text(tituloLibro, margenLat, posEncabezado + 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
        doc.text(`Contribuyente: ${nombreEmpresa} | NIT: ${nitSeleccionado.value} | Periodo: ${mes.value} ${anio.value}`, margenLat, posEncabezado + 9);
        
        doc.setLineWidth(0.3); doc.line(margenLat, posEncabezado + 11, pageWidth - margenLat, posEncabezado + 11); 

        // 📏 TABLA
        autoTable(doc, {
            startY: margenSup, 
            margin: { left: margenLat, right: margenLat, top: margenSup, bottom: margenInf }, 
            head: headTabla, body: bodyTabla, theme: 'grid', 
            headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9.5, halign: 'center', cellPadding: 1.5, minCellHeight: 12 },
            bodyStyles: { fontSize: 10, cellPadding: 1.5, textColor: [31, 41, 55], overflow: 'linebreak' }, 
            alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: configColumnas,
            didParseCell: function(data) {
                if (data.cell.text[0] && data.cell.text[0].includes('$')) data.cell.styles.halign = 'right';
                if (data.row.index === bodyTabla.length - 1) {
                    data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [226, 232, 240]; data.cell.styles.textColor = [15, 23, 42];
                    if (data.cell.text[0] && data.cell.text[0].includes('$')) data.cell.styles.halign = 'right';
                }
            },
            didDrawPage: function (data) {
                const str = "Página " + doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.text(str, pageWidth - margenLat, doc.internal.pageSize.getHeight() - 7.6, { align: 'right' });
            }
        });

        doc.save(`Libro_${moduloSeleccionado.value}_${nitSeleccionado.value}_${mes.value}_${anio.value}.pdf`);
        axios.post(`${BASE_URL}/api/historial/pdf`, { modulo: 'LIBRO CONTABLE PDF', detalles: `Libro impreso: ${tituloLibro}` }).catch(()=>console.log("Auditoria omitida"));
    } catch (error) {
        console.error("Error generando Libro Contable:", error);
        alert("🚨 Ocurrió un error al generar el Libro Físico.");
    } finally { cargando.value = false; }
};

// =======================================================
// 🛡️ GENERAR PDF RESUMEN MENSUAL (OFICIO AL LÍMITE + TRUNCADO)
// =======================================================
const generarPDFMensual = async () => {
    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value }
        });
        
        const data = res.data;
        // 📏 CAMBIO A TAMAÑO OFICIO
        const doc = new jsPDF('l', 'mm', 'legal'); 
        
        const margenSup = 19.1;
        const margenInf = 19.1;
        const margenLat = 2.0; 
        const posEncabezado = 7.6; 
        const pageWidth = doc.internal.pageSize.getWidth();

        // ✂️ En oficio podemos permitir hasta 40 letras en el resumen sin problema
        const truncarTexto = (texto, max = 40) => {
            if (!texto) return '';
            return texto.length > max ? texto.substring(0, max) + '...' : texto;
        };

        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 118, 110); 
        doc.text("RentaLimpio - Resumen Tributario", margenLat, posEncabezado + 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(51, 65, 85);
        doc.text(`Empresa: ${data.identificacion.razon_social} | NIT: ${data.identificacion.nit} | Periodo: ${mes.value} / ${anio.value}`, margenLat, posEncabezado + 9);
        doc.setLineWidth(0.3); doc.line(margenLat, posEncabezado + 11, pageWidth - margenLat, posEncabezado + 11); 

        let startY = margenSup;

        if (data.anexo3_compras && data.anexo3_compras.length > 0) {
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("1. Compras (Crédito Fiscal Recibido)", margenLat, startY);
            autoTable(doc, {
                startY: startY + 4, 
                margin: { left: margenLat, right: margenLat, top: margenSup, bottom: margenInf }, 
                head: [['Fecha', 'Proveedor\n/ NIT', 'DTE', 'Exen.\nLoc.', 'Exen.\nImp/Int', 'Grav.\nLoc.', 'Grav.\nImp/Int', 'IVA', 'Perci-\nbido', 'Suj.\nExclu.', 'Total']],
                body: data.anexo3_compras.map(c => {
                    const exen = parseFloat(c.internas_exentas || 0).toFixed(2);
                    const impExen = parseFloat(c.importaciones_exentas || 0).toFixed(2);
                    const grav = parseFloat(c.internas_gravadas || 0).toFixed(2);
                    const impGrav = parseFloat(c.importaciones_gravadas || 0).toFixed(2);
                    const iva = parseFloat(c.credito_fiscal || 0).toFixed(2);
                    const percibido = parseFloat(c.iva_percibido || 0).toFixed(2);
                    const sujetos = parseFloat(c.sujetos_excluidos || 0).toFixed(2);
                    const otros = parseFloat(c.otros_montos || c.otro_atributo || c.ComOtroAtributo || 0);
                    const total = (parseFloat(exen) + parseFloat(grav) + parseFloat(iva) + otros).toFixed(2);
                    
                    return [ 
                        formatearFecha(c.fecha), 
                        `${truncarTexto(c.nombre_proveedor, 40)}\n${c.nit_proveedor}`, 
                        c.numero, `$${exen}`, `$${impExen}`, `$${grav}`, `$${impGrav}`, `$${iva}`, `$${percibido}`, `$${sujetos}`, `$${total}`
                    ]
                }),
                theme: 'striped', headStyles: { fillColor: [15, 118, 110], cellPadding: 1 }, styles: { fontSize: 9.5, cellPadding: 1.5 },
                columnStyles: { 0: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 40 } },
                didDrawPage: function (data) { 
                    doc.setFontSize(8); 
                    doc.text("Página " + doc.internal.getNumberOfPages(), pageWidth - margenLat, doc.internal.pageSize.getHeight() - 7.6, { align: 'right' }); 
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        if (data.anexo2_credito_fiscal && data.anexo2_credito_fiscal.length > 0) {
            if (startY > doc.internal.pageSize.getHeight() - margenInf - 20) { doc.addPage(); startY = margenSup; }
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("2. Ventas a Contribuyentes (CCF Emitidos)", margenLat, startY);
            autoTable(doc, {
                startY: startY + 4, margin: { left: margenLat, right: margenLat, top: margenSup, bottom: margenInf },
                head: [['Fecha', 'Cliente\n/ NIT', 'DTE', 'Gravadas', 'Débito\nFiscal', 'Total']],
                body: data.anexo2_credito_fiscal.map(v => [
                    formatearFecha(v.fecha), 
                    `${truncarTexto(v.nombre, 40)}\n${v.nit_cliente}`, 
                    v.numero, `$${v.gravadas}`, `$${v.debito_fiscal}`, `$${v.total}`
                ]),
                theme: 'striped', headStyles: { fillColor: [3, 105, 161], cellPadding: 1 }, styles: { fontSize: 9.5, cellPadding: 1.5 },
                columnStyles: { 0: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 40 } },
                didDrawPage: function (data) { 
                    doc.setFontSize(8); 
                    doc.text("Página " + doc.internal.getNumberOfPages(), pageWidth - margenLat, doc.internal.pageSize.getHeight() - 7.6, { align: 'right' }); 
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        if (data.anexo1_consumidor_final && data.anexo1_consumidor_final.length > 0) {
            if (startY > doc.internal.pageSize.getHeight() - margenInf - 20) { doc.addPage(); startY = margenSup; }
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("3. Ventas a Consumidor Final", margenLat, startY);
            autoTable(doc, {
                startY: startY + 4, margin: { left: margenLat, right: margenLat, top: margenSup, bottom: margenInf },
                head: [['Fecha', 'DTE\n(Del - Al)', 'Ventas\nExentas', 'Ventas\nGravadas', 'Total\nVenta']],
                body: data.anexo1_consumidor_final.map(v => [formatearFecha(v.fecha), `${v.del} - ${v.al}`, `$${v.exentas}`, `$${v.gravadas}`, `$${v.total}`]),
                theme: 'striped', headStyles: { fillColor: [217, 119, 6], cellPadding: 1 }, styles: { fontSize: 9.5, cellPadding: 1.5 },
                columnStyles: { 0: { halign: 'center', cellWidth: 20 }, 1: { halign: 'center', cellWidth: 45 } },
                didDrawPage: function (data) { 
                    doc.setFontSize(8); 
                    doc.text("Página " + doc.internal.getNumberOfPages(), pageWidth - margenLat, doc.internal.pageSize.getHeight() - 7.6, { align: 'right' }); 
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        if (startY === margenSup) { doc.setFont("helvetica", "italic"); doc.text("No se encontraron registros operados en este periodo.", margenLat, startY); }
        doc.save(`Resumen_Mensual_${nitSeleccionado.value}_${mes.value}_${anio.value}.pdf`);
        axios.post(`${BASE_URL}/api/historial/pdf`, { modulo: 'PDF RESUMEN', detalles: `Generado PDF ${mes.value}/${anio.value}` }).catch(()=>console.log("Auditoria omitida"));
    } catch (error) { 
        console.error("Error generando PDF:", error); 
        alert("🚨 No se pudo generar el documento PDF."); 
    } finally { cargando.value = false; }
};

// =======================================================
// 🛡️ DESCARGAR ANEXO JSON (F-07 HACIENDA)
// =======================================================
const descargarAnexosHacienda = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) { alert("Auditoría: Debe seleccionar Empresa, Mes y Año."); return; }
    try {
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, { params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value } });
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr); 
        downloadAnchorNode.setAttribute("download", `Anexos_Hacienda_${nitSeleccionado.value}_${mes.value}_${anio.value}.json`);
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
        
        alert("✅ Archivo JSON F-07 para Hacienda generado correctamente.");
    } catch (error) { alert(`🚨 Error: ${error.response?.data?.message || "No se pudo generar el reporte JSON."}`); }
};

// =======================================================
// 🛡️ DESCARGAR ANEXO CSV
// =======================================================
const descargarAnexoCSV = async () => {
    const m = mes.value; const a = anio.value; const nitEmpresa = nitSeleccionado.value;
    if (!nitEmpresa || !m || !a) { alert("Auditoría: Debe seleccionar Empresa, Mes y Año."); return; }
    
    // 🛡️ REGLA: CSV no soporta el reporte general
    if (moduloSeleccionado.value === 'todo') {
        alert("⚠️ La exportación a CSV se hace por anexo individual. Por favor, seleccione un módulo específico (ej. Compras) en la lista superior izquierda.");
        return;
    }

    let endpoint = ''; let filename = '';
    switch (moduloSeleccionado.value) {
        case 'compras': endpoint = '/api/reportes/anexo3-csv'; filename = `Anexo3_Compras_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'ventas_cf': endpoint = '/api/reportes/anexo1-csv'; filename = `Anexo1_ConsumidorFinal_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'ventas_ccf': endpoint = '/api/reportes/anexo2-csv'; filename = `Anexo2_CreditoFiscal_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'sujetos': endpoint = '/api/reportes/anexo5-csv'; filename = `Anexo5_SujetosExcluidos_${nitEmpresa}_${m}_${a}.csv`; break;
    }

    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}${endpoint}`, { params: { nit: nitEmpresa, mes: m, anio: a }, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename);
        document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { alert("🚨 No se pudo generar el CSV desde el servidor."); } finally { cargando.value = false; }
};

// =======================================================
// 🛡️ EXPORTAR JSON BACKUP INTERNO DE LA APP
// =======================================================
const procesarAccion = async () => {
    if (accion.value === 'importar') { router.push('/lector-json'); return; }
    if (!nitSeleccionado.value) { alert("Seleccione una empresa."); return; }
    
    cargando.value = true; resultado.value = null;
    try {
        let endpoint = '';
        switch (moduloSeleccionado.value) {
          case 'todo': endpoint = `${BASE_URL}/api/exportar-todo`; break;
          case 'compras': endpoint = `${BASE_URL}/api/compras/exportar`; break;
          case 'ventas_cf': endpoint = `${BASE_URL}/api/ventas-cf/exportar`; break; 
          case 'ventas_ccf': endpoint = `${BASE_URL}/api/ventas-CCF/exportar`; break; 
          case 'sujetos': endpoint = `${BASE_URL}/api/sujetos/exportar`; break; 
          default: endpoint = `${BASE_URL}/api/exportar-todo`;
        }
        
        const params = { mes: mes.value, anio: anio.value, nit: nitSeleccionado.value };
        const response = await axios.get(endpoint, { params, responseType: 'json' });
        const data = response.data;
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        urlDescargaBlob.value = window.URL.createObjectURL(blob);
        
        let totalPreview = '0.00';
        if (data.totales_periodo) totalPreview = data.totales_periodo.gran_total_gravado || data.totales_periodo.total_gravado || '0.00';
        else if (Array.isArray(data) && data.length > 0 && data[0].total) totalPreview = data.reduce((sum, item) => sum + (parseFloat(item.total)||0), 0).toFixed(2);
        
        resultado.value = { 
            tipo: 'success', 
            titulo: 'Backup Generado', 
            archivo: `Backup_${moduloSeleccionado.value}_${nitSeleccionado.value}_${mes.value}_${anio.value}.json`, 
            cantidad: Array.isArray(data) ? data.length : (data.lista_compras ? data.lista_compras.length : 'N/A'), 
            total: totalPreview, 
            snippet: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : '') 
        };
    } catch (error) { 
        resultado.value = { tipo: 'error', titulo: 'Error al Generar', archivo: 'No se pudo crear el archivo', cantidad: 0, total: 0, snippet: error.response?.data?.message || error.message }; 
    } finally { cargando.value = false; }
};

const descargarArchivoReal = () => {
    if (!urlDescargaBlob.value) return;
    const link = document.createElement('a'); link.href = urlDescargaBlob.value; link.setAttribute('download', resultado.value.archivo);
    document.body.appendChild(link); link.click(); link.remove();
};
</script>

<style scoped>
.btn-purple { background: #8b5cf6; color: white; border: none; }
.btn-purple:hover:not(:disabled) { background: #7c3aed; }
.flex-buttons { display: flex; align-items: center; width: 100%; flex-wrap: wrap; }
.flex-1 { flex: 1; min-width: 130px; }
.gap-2 { gap: 8px; }
.btn-danger { background: #ef4444; color: white; border: none; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }

.data-container { padding: 20px; background: linear-gradient(180deg, rgba(85, 194, 183, 0.15) 0%, #f3f4f6 35%); height: 100%; overflow-y: auto; font-family: 'Segoe UI', system-ui, sans-serif; box-sizing: border-box; }
.header-section { margin-bottom: 20px; }
.title-box h1 { font-size: 1.5rem; color: #1f2937; margin: 0; font-weight: 700; }
.subtitle { color: #57606f; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }
.dashboard-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; max-width: 1400px; margin: 0 auto; }
.left-col { display: flex; flex-direction: column; gap: 20px; }
.right-col { display: flex; flex-direction: column; }
.card { background: white; border-radius: 12px; border: 1px solid rgba(85, 194, 183, 0.15); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); padding: 20px; animation: fadeIn 0.4s ease-out; }
.full-height { height: 100%; min-height: 400px; display: flex; flex-direction: column; }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.mb-3 { margin-bottom: 15px; }
.mb-2 { margin-bottom: 10px; }
.mt-2 { margin-top: 10px; }
.mt-3 { margin-top: 15px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.card-header { border-bottom: 1px solid #f0fdfa; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
.card-header h2 { font-size: 1.1rem; color: #111827; margin: 0; font-weight: 700; }
.badge-info { font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: 600; }

.grid-modulos { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.modulo-item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s; background: #f9fafb; position: relative; }
.modulo-item:hover { border-color: #55C2B7; background: #f0fdfa; transform: translateY(-2px); }
.modulo-item.active { border-color: #55C2B7; background: #f0fdfa; box-shadow: 0 0 0 2px rgba(85, 194, 183, 0.2); }
.icon-circle { font-size: 1.5rem; background: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.nombre { font-size: 0.85rem; font-weight: 600; color: #4b5563; text-align: center; }
.modulo-item.active .nombre { color: #0f766e; }
.check-mark { position: absolute; top: 5px; right: 5px; color: #55C2B7; font-size: 0.8rem; }

.tabs-container { display: flex; background: #f3f4f6; padding: 4px; border-radius: 8px; margin-bottom: 20px; }
.tab-btn { flex: 1; padding: 8px; border: none; background: transparent; border-radius: 6px; font-weight: 600; color: #6b7280; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: white; color: #0f766e; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.export-card { background: #f8fafc; border: 1px dashed #94a3b8; }
.text-hacienda { font-size: 1rem; color: #1e3a8a; margin: 0; font-weight: 700; }
.text-sm-hacienda { font-size: 0.85rem; color: #64748b; margin: 5px 0 0 0; }
.btn-dark-blue { background: #1e3a8a; color: white; font-weight: 600; padding: 10px; border-radius: 6px; border:none; cursor: pointer; }
.btn-dark-blue:hover:not(:disabled) { background: #1e40af; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.config-body { display: flex; flex-direction: column; gap: 15px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { display: flex; flex-direction: column; }
.form-label { font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 5px; }
.form-control { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; background: #fff; }
.form-control:focus { border-color: #55C2B7; outline: none; }
.select-highlight { border-color: #55C2B7; border-width: 2px; }
.fw-bold { font-weight: 700; }
.info-note { font-size: 0.8rem; color: #6b7280; margin-top: 5px; background: #f3f4f6; padding: 8px; border-radius: 6px; }

.import-info { background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px; }
.icon-big { font-size: 2rem; }
.text-content h4 { margin: 0 0 2px 0; color: #9a3412; font-size: 0.95rem; }
.text-content p { margin: 0; font-size: 0.85rem; color: #c2410c; }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 15px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; font-size: 0.95rem; }
.btn-block { width: 100%; }
.btn-primary { background: #55C2B7; color: white; }
.btn-primary:hover:not(:disabled) { background: #45a89d; }
.btn-success { background: #10b981; color: white; }
.btn-success:hover:not(:disabled) { background: #059669; }
.btn-dark { background: #374151; color: white; }
.btn-dark:hover:not(:disabled) { background: #1f2937; }

.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; text-align: center; padding: 20px; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

.resultado-container { flex: 1; display: flex; flex-direction: column; gap: 15px; }
.status-banner { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 8px; }
.status-banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
.status-banner.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.status-text h4 { margin: 0; font-size: 0.9rem; }
.status-text small { opacity: 0.8; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-item { background: #f9fafb; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #e5e7eb; }
.stat-item .label { display: block; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; }
.stat-item .value { font-weight: 700; font-size: 1.1rem; color: #1f2937; }
.text-success { color: #10b981; }

.code-preview { flex: 1; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #374151; border-radius: 6px; background: #1f2937; }
.code-header { background: #111827; color: #9ca3af; padding: 5px 10px; font-size: 0.75rem; font-family: monospace; }
.json-code { flex: 1; margin: 0; padding: 10px; color: #a7f3d0; font-family: 'Consolas', monospace; font-size: 0.8rem; overflow: auto; white-space: pre-wrap; }

.download-area { margin-top: auto; }
.animate-slide { animation: slideIn 0.3s ease-out; }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } .flex-buttons { flex-direction: column; } }
</style>