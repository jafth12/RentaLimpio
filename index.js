import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireSession } from './src/middlewares/Sessionauth.js';

// Importación de rutas generales
import clientesRoutes from './src/routes/clientes.routes.js'; 
import authRoutes from './src/routes/auth.routes.js';
import proveedoresRoutes from './src/routes/proveedores.routes.js';
import sujetosRoutes from './src/routes/sujetos.routes.js';
import comprasRoutes from './src/routes/compras.routes.js';
import adminRoutes from './src/routes/admin.routes.js'
import declarantesRoutes from './src/routes/declarantes.routes.js';
import dataRoutes from './src/routes/data.routes.js';
import reportesRoutes from './src/routes/reportes.routes.js';
import historialRoutes from './src/routes/historial.routes.js';
import anuladosRoutes from './src/routes/anulados.routes.js';
import busquedaRoutes from './src/routes/busqueda.routes.js';
import retencionesRoutes from './src/routes/retenciones.routes.js';

// MÓDULOS DE VENTAS Y DASHBOARD
import ventasCFRoutes from './src/routes/ventasCF.routes.js'; 
import ventasCCFRoutes from './src/routes/ventasCreditoFiscal.routes.js';
import ventasTercerosRoutes from './src/routes/ventasTerceros.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🛡️ MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// Protege todas las rutas excepto /api/login
app.use(requireSession);

// 🛡️ REGISTRO DE RUTAS (CORREGIDO)
// 1. Rutas que ya traen su nombre internamente
app.use('/api', clientesRoutes);
app.use('/api', authRoutes);
app.use('/api', proveedoresRoutes);
app.use('/api', comprasRoutes);
app.use('/api', ventasCFRoutes);
app.use('/api', sujetosRoutes);
app.use('/api', ventasCCFRoutes);
app.use('/api', declarantesRoutes);
app.use('/api', ventasTercerosRoutes);
app.use('/api', dataRoutes);
app.use('/api', retencionesRoutes);

// 2. Rutas que necesitan su prefijo explícito aquí
app.use('/api/admin', adminRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/anulados', anuladosRoutes);      // ✅ Restaurado correctamente
app.use('/api/documentos', busquedaRoutes);    // ✅ Restaurado para el Lector DTE
app.use('/api/dashboard', dashboardRoutes);    // ✅ Nuevo Dashboard

app.get('/', (req, res) => {
    res.send('<h1>¡Sistema de Renta Activo! 🇸🇻</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en http://190.62.2.18:${PORT}`);
});