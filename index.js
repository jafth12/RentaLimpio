import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importación de rutas
import clientesRoutes from './src/routes/clientes.routes.js'; 
import authRoutes from './src/routes/auth.routes.js';
import proveedoresRoutes from './src/routes/proveedores.routes.js';
import sujetosRoutes from './src/routes/sujetos.routes.js';
import comprasRoutes from './src/routes/compras.routes.js';
import ventasCCFRoutes from './src/routes/ventasCreditoFiscal.routes.js'

// MÓDULOS DE VENTAS
import ventasCFRoutes from './src/routes/ventasCF.routes.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api', clientesRoutes);
app.use('/api', authRoutes);
app.use('/api', proveedoresRoutes);
app.use('/api', comprasRoutes);
app.use('/api', ventasCFRoutes);
app.use('/api', sujetosRoutes);
app.use('/api', ventasCCFRoutes);

app.get('/', (req, res) => {
    res.send('<h1>¡Sistema de Renta Activo! 🇸🇻</h1>');
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://192.168.1.7:${PORT}`);
});