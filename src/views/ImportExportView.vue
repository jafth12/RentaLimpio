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
               <h3 class="text-hacienda">🏛️ Reportes Legales y PDF</h3>
               <p class="text-sm-hacienda">Genera los archivos oficiales para Hacienda, o Libros Físicos.</p>
               <div class="export-controls mt-2">
                  <button v-if="moduloSeleccionado === 'todo'" @click="descargarAnexosHacienda" class="btn btn-dark-blue btn-block mb-2" :disabled="!nitSeleccionado">
                    📦 Descargar F07 (JSON Consolidado)
                  </button>

                  <div class="flex-buttons gap-2">
                    
                    <button 
                       v-if="moduloSeleccionado !== 'todo'" 
                       @click="descargarAnexoCSV" 
                       class="btn btn-success flex-1" 
                       :disabled="!nitSeleccionado">
                      {{ textoBotonCSV }}
                    </button>
                    
                    <button 
                       v-if="moduloSeleccionado !== 'todo'"
                       @click="generarLibroContablePDF" 
                       class="btn btn-purple flex-1" 
                       :disabled="!nitSeleccionado || cargando">
                      🖨️ Imprimir Libro (PDF)
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
                <button @click="procesarAccion" class="btn btn-primary btn-block" :disabled="cargando || (accion === 'exportar' && !nitSeleccionado)">
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

const router = useRouter(); 
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:3000`;

const moduloSeleccionado = ref('compras');
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
        case 'compras': return '📊 Descargar CSV (Compras)';
        case 'ventas_cf': return '📊 Descargar CSV (Cons. Final)';
        case 'ventas_ccf': return '📊 Descargar CSV (Crédito Fiscal)';
        case 'sujetos': return '📊 Descargar CSV (Suj. Excluidos)';
        default: return '📊 Descargar CSV';
    }
});

// =======================================================
// 🛡️ NUEVA FUNCIÓN: GENERAR LIBRO CONTABLE FÍSICO (HORIZONTAL)
// =======================================================
const generarLibroContablePDF = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) {
        alert("Seleccione Empresa, Mes y Año.");
        return;
    }

    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value }
        });
        
        const data = res.data;
        const nombreEmpresa = data.identificacion.razon_social;
        
        const doc = new jsPDF('l', 'mm', 'a4'); // Formato apaisado para los libros
        
        let tituloLibro = "";
        let bodyTabla = [];
        let headTabla = [];
        let totales = {};

        if (moduloSeleccionado.value === 'compras') {
            tituloLibro = "LIBRO DE COMPRAS";
            // Agregamos la columna 'Otros Montos'
            headTabla = [['N°', 'Fecha', 'N° Comprobante DTE', 'NIT Proveedor', 'Nombre del Proveedor', 'Exentas', 'Gravadas', 'IVA', 'Otros Montos', 'Total']];
            
            const registros = data.anexo3_compras ? data.anexo3_compras.slice().reverse() : []; 
            
            bodyTabla = registros.map((c, idx) => {
                const exen = parseFloat(c.internas_exentas || 0);
                const grav = parseFloat(c.internas_gravadas || 0);
                const iva = parseFloat(c.credito_fiscal || 0);
                const otros = parseFloat(c.otros_montos || c.otro_atributo || c.ComOtroAtributo || 0); 
                // 🛡️ ASEGURAMOS QUE LA SUMA MATEMÁTICA SEA PERFECTA PARA EL PDF
                const total = exen + grav + iva + otros;

                totales.exen = (totales.exen || 0) + exen;
                totales.grav = (totales.grav || 0) + grav;
                totales.iva = (totales.iva || 0) + iva;
                totales.otros = (totales.otros || 0) + otros;
                totales.total = (totales.total || 0) + total;

                return [idx + 1, c.fecha, c.numero, c.nit_proveedor, c.nombre_proveedor, `$${exen.toFixed(2)}`, `$${grav.toFixed(2)}`, `$${iva.toFixed(2)}`, `$${otros.toFixed(2)}`, `$${total.toFixed(2)}`];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', `$${(totales.exen||0).toFixed(2)}`, `$${(totales.grav||0).toFixed(2)}`, `$${(totales.iva||0).toFixed(2)}`, `$${(totales.otros||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`]);

        } else if (moduloSeleccionado.value === 'ventas_cf') {
            tituloLibro = "LIBRO DE VENTAS A CONSUMIDOR FINAL";
            headTabla = [['N°', 'Fecha', 'Documentos (Del - Al)', 'Ventas Exentas', 'Ventas Gravadas Locales', 'Total Ventas']];
            
            const registros = data.anexo1_consumidor_final ? data.anexo1_consumidor_final.slice().reverse() : [];

            bodyTabla = registros.map((v, idx) => {
                const exen = parseFloat(v.exentas || 0);
                const grav = parseFloat(v.gravadas || 0);
                const total = parseFloat(v.total || 0);

                totales.exen = (totales.exen || 0) + exen;
                totales.grav = (totales.grav || 0) + grav;
                totales.total = (totales.total || 0) + total;

                return [ idx + 1, v.fecha, `${v.del} - ${v.al}`, `$${exen.toFixed(2)}`, `$${grav.toFixed(2)}`, `$${total.toFixed(2)}` ];
            });
            bodyTabla.push(['', '', 'TOTALES:', `$${(totales.exen||0).toFixed(2)}`, `$${(totales.grav||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`]);

        } else if (moduloSeleccionado.value === 'ventas_ccf') {
            tituloLibro = "LIBRO DE VENTAS A CONTRIBUYENTES (CRÉDITO FISCAL)";
            headTabla = [['N°', 'Fecha', 'N° Comprobante CCF', 'NIT Cliente', 'Razón Social', 'Exentas', 'Gravadas', 'Débito Fiscal (IVA)', 'Total']];
            
            const registros = data.anexo2_credito_fiscal ? data.anexo2_credito_fiscal.slice().reverse() : [];

            bodyTabla = registros.map((v, idx) => {
                const exen = parseFloat(v.exentas || 0);
                const grav = parseFloat(v.gravadas || 0);
                const iva = parseFloat(v.debito_fiscal || 0);
                const total = parseFloat(v.total || 0);

                totales.exen = (totales.exen || 0) + exen;
                totales.grav = (totales.grav || 0) + grav;
                totales.iva = (totales.iva || 0) + iva;
                totales.total = (totales.total || 0) + total;

                return [idx + 1, v.fecha, v.numero, v.nit_cliente, v.nombre, `$${exen.toFixed(2)}`, `$${grav.toFixed(2)}`, `$${iva.toFixed(2)}`, `$${total.toFixed(2)}`];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', `$${(totales.exen||0).toFixed(2)}`, `$${(totales.grav||0).toFixed(2)}`, `$${(totales.iva||0).toFixed(2)}`, `$${(totales.total||0).toFixed(2)}`]);

        } else if (moduloSeleccionado.value === 'sujetos') {
            tituloLibro = "LIBRO DE COMPRAS A SUJETOS EXCLUIDOS";
            headTabla = [['N°', 'Fecha', 'N° Documento', 'NIT / DUI', 'Nombre del Sujeto', 'Monto Operación', 'Retención']];
            
            const registros = data.anexo5_sujetos_excluidos ? data.anexo5_sujetos_excluidos.slice().reverse() : [];

            bodyTabla = registros.map((s, idx) => {
                const monto = parseFloat(s.monto || 0);
                const retencion = parseFloat(s.retencion || 0);

                totales.monto = (totales.monto || 0) + monto;
                totales.retencion = (totales.retencion || 0) + retencion;

                return [ idx + 1, s.fecha, s.documento, s.nit, s.nombre, `$${monto.toFixed(2)}`, `$${retencion.toFixed(2)}` ];
            });
            bodyTabla.push(['', '', '', '', 'TOTALES:', `$${(totales.monto||0).toFixed(2)}`, `$${(totales.retencion||0).toFixed(2)}`]);
        }

        // Diseño del Encabezado
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138); 
        doc.text(tituloLibro, 14, 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`Contribuyente: ${nombreEmpresa}`, 14, 26);
        doc.text(`NIT: ${nitSeleccionado.value}`, 14, 32);
        doc.text(`Mes y Año: ${mes.value} de ${anio.value}`, 14, 38);
        
        doc.setLineWidth(0.5);
        doc.line(14, 42, 283, 42); 

        // Generar Tabla
        autoTable(doc, {
            startY: 46,
            head: headTabla,
            body: bodyTabla,
            theme: 'grid', 
            headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, halign: 'center', cellPadding: 2 },
            bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [31, 41, 55] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 22 } },
            didParseCell: function(data) {
                if (data.column.index > 2 && data.cell.text[0] && data.cell.text[0].includes('$')) data.cell.styles.halign = 'right';
                if (data.row.index === bodyTabla.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [226, 232, 240];
                    data.cell.styles.textColor = [15, 23, 42];
                    if (data.column.index > 2) data.cell.styles.halign = 'right';
                }
            }
        });

        doc.save(`Libro_${moduloSeleccionado.value}_${nitSeleccionado.value}_${mes.value}_${anio.value}.pdf`);
        axios.post(`${BASE_URL}/api/historial/pdf`, { modulo: 'LIBRO CONTABLE PDF', detalles: `Libro impreso: ${tituloLibro}` }).catch(()=>console.log("Auditoria omitida"));

    } catch (error) {
        console.error("Error generando Libro Contable:", error);
        alert("🚨 Ocurrió un error al generar el Libro Físico.");
    } finally {
        cargando.value = false;
    }
};

const generarPDFMensual = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) {
        alert("Auditoría: Debe seleccionar Empresa, Mes y Año.");
        return;
    }

    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, {
            params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value }
        });
        
        const data = res.data;
        const doc = new jsPDF();
        let startY = 50;

        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(15, 118, 110); 
        doc.text("RentaLimpio - Resumen Tributario", 14, 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(51, 65, 85);
        doc.text(`Empresa (Declarante): ${data.identificacion.razon_social}`, 14, 30);
        doc.text(`NIT: ${data.identificacion.nit}`, 14, 36);
        doc.text(`Periodo Fiscal: ${mes.value} / ${anio.value}`, 14, 42);
        doc.setLineWidth(0.5); doc.line(14, 45, 196, 45); 

        if (data.anexo3_compras && data.anexo3_compras.length > 0) {
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("1. Compras (Crédito Fiscal Recibido)", 14, startY);
            autoTable(doc, {
                // Agregamos 'Otros' a las cabeceras
                startY: startY + 5, head: [['Fecha', 'Proveedor / NIT', 'DTE', 'Gravadas', 'IVA', 'Otros', 'Total']],
                body: data.anexo3_compras.map(c => {
                    const exen = parseFloat(c.internas_exentas || 0);
                    const grav = parseFloat(c.internas_gravadas || 0);
                    const iva = parseFloat(c.credito_fiscal || 0);
                    const otros = parseFloat(c.otros_montos || c.otro_atributo || c.ComOtroAtributo || 0);
                    // 🛡️ Forzamos la suma matemática perfecta
                    const sumaTotal = (exen + grav + iva + otros).toFixed(2);
                    
                    return [c.fecha, `${c.nombre_proveedor}\n${c.nit_proveedor}`, c.numero, `$${grav.toFixed(2)}`, `$${iva.toFixed(2)}`, `$${otros.toFixed(2)}`, `$${sumaTotal}`]
                }),
                theme: 'striped', headStyles: { fillColor: [15, 118, 110] }, styles: { fontSize: 8, cellPadding: 3 },
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        if (data.anexo2_credito_fiscal && data.anexo2_credito_fiscal.length > 0) {
            if (startY > 250) { doc.addPage(); startY = 20; }
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("2. Ventas a Contribuyentes (CCF Emitidos)", 14, startY);
            autoTable(doc, {
                startY: startY + 5, head: [['Fecha', 'Cliente / NIT', 'DTE', 'Gravadas', 'Débito Fiscal', 'Total']],
                body: data.anexo2_credito_fiscal.map(v => [v.fecha, `${v.nombre}\n${v.nit_cliente}`, v.numero, `$${v.gravadas}`, `$${v.debito_fiscal}`, `$${v.total}`]),
                theme: 'striped', headStyles: { fillColor: [3, 105, 161] }, styles: { fontSize: 8, cellPadding: 3 },
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        if (data.anexo1_consumidor_final && data.anexo1_consumidor_final.length > 0) {
            if (startY > 250) { doc.addPage(); startY = 20; }
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("3. Ventas a Consumidor Final", 14, startY);
            autoTable(doc, {
                startY: startY + 5, head: [['Fecha', 'DTE (Del - Al)', 'Ventas Exentas', 'Ventas Gravadas', 'Total Venta']],
                body: data.anexo1_consumidor_final.map(v => [v.fecha, `${v.del} - ${v.al}`, `$${v.exentas}`, `$${v.gravadas}`, `$${v.total}`]),
                theme: 'striped', headStyles: { fillColor: [217, 119, 6] }, styles: { fontSize: 8, cellPadding: 3 },
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        if (startY === 50) { doc.setFont("helvetica", "italic"); doc.text("No se encontraron registros operados en este periodo.", 14, startY); }
        doc.save(`Resumen_Mensual_${nitSeleccionado.value}_${mes.value}_${anio.value}.pdf`);
        axios.post(`${BASE_URL}/api/historial/pdf`, { modulo: 'PDF RESUMEN', detalles: `Generado PDF ${mes.value}/${anio.value}` }).catch(()=>console.log("Auditoria omitida"));
    } catch (error) { console.error("Error generando PDF:", error); alert("🚨 No se pudo generar el documento PDF."); } 
    finally { cargando.value = false; }
};

const descargarAnexosHacienda = async () => {
    if (!nitSeleccionado.value || !mes.value || !anio.value) { alert("Auditoría: Debe seleccionar Empresa, Mes y Año."); return; }
    try {
        const res = await axios.get(`${BASE_URL}/api/reportes/anexos-hacienda`, { params: { nit: nitSeleccionado.value, mes: mes.value, anio: anio.value } });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `Anexos_Hacienda_${nitSeleccionado.value}_${mes.value}_${anio.value}.json`);
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
        alert("✅ Archivo JSON para Hacienda generado correctamente.");
    } catch (error) { alert(`🚨 Error: ${error.response?.data?.message || "No se pudo generar el reporte."}`); }
};

const descargarAnexoCSV = async () => {
    const m = mes.value; const a = anio.value; const nitEmpresa = nitSeleccionado.value;
    if (!nitEmpresa || !m || !a) { alert("Auditoría: Debe seleccionar Empresa, Mes y Año."); return; }
    let endpoint = ''; let filename = '';
    switch (moduloSeleccionado.value) {
        case 'compras': endpoint = '/api/reportes/anexo3-csv'; filename = `Anexo3_Compras_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'ventas_cf': endpoint = '/api/reportes/anexo1-csv'; filename = `Anexo1_ConsumidorFinal_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'ventas_ccf': endpoint = '/api/reportes/anexo2-csv'; filename = `Anexo2_CreditoFiscal_${nitEmpresa}_${m}_${a}.csv`; break;
        case 'sujetos': endpoint = '/api/reportes/anexo5-csv'; filename = `Anexo5_SujetosExcluidos_${nitEmpresa}_${m}_${a}.csv`; break;
        default: return;
    }
    try {
        cargando.value = true;
        const res = await axios.get(`${BASE_URL}${endpoint}`, { params: { nit: nitEmpresa, mes: m, anio: a }, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename);
        document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { alert("🚨 No se pudo generar el CSV."); } finally { cargando.value = false; }
};

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
        resultado.value = { tipo: 'success', titulo: 'Backup Generado', archivo: `Backup_${moduloSeleccionado.value}_${nitSeleccionado.value}_${mes.value}_${anio.value}.json`, cantidad: Array.isArray(data) ? data.length : (data.lista_compras ? data.lista_compras.length : 'N/A'), total: totalPreview, snippet: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : '') };
    } catch (error) { resultado.value = { tipo: 'error', titulo: 'Error al Generar', archivo: 'No se pudo crear el archivo', cantidad: 0, total: 0, snippet: error.response?.data?.message || error.message }; } 
    finally { cargando.value = false; }
};

const descargarArchivoReal = () => {
    if (!urlDescargaBlob.value) return;
    const link = document.createElement('a'); link.href = urlDescargaBlob.value; link.setAttribute('download', resultado.value.archivo);
    document.body.appendChild(link); link.click(); link.remove();
};
</script>

<style scoped>
/* ESTILO DEL NUEVO BOTON MORADO */
.btn-purple { background: #8b5cf6; color: white; border: none; }
.btn-purple:hover:not(:disabled) { background: #7c3aed; }
.flex-buttons { display: flex; align-items: center; width: 100%; }
.flex-1 { flex: 1; }
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
.btn-success:hover { background: #059669; }

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