import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import EnConstruccion from '../views/EnConstruccion.vue'
import { usuarioAutenticado } from '../auth.js'

// 1. IMPORTAR LAS VISTAS DE LOS MÓDULOS ACTIVOS
import ComprasView from '../views/ComprasView.vue'
import SujetosExcluidosView from '../views/SujetosExcluidosView.vue'
import ProveedoresView from '../views/ProveedoresView.vue'
import VentasConsumidorView from '../views/VentasConsumidorView.vue'
import VentasCreditoFiscalView from '../views/VentasCreditoFiscalView.vue'
import AdminUsuariosView from '../views/AdminUsuariosView.vue'
import VentasTercerosView from '../views/VentasTercerosView.vue'
import ImportExportView from '../views/ImportExportView.vue';
import JsonReaderView from '../views/JsonReaderView.vue';
import ClientesView from '../views/ClientesView.vue';
import DeclarantesView from '../views/DeclarantesView.vue';
// 🛡️ IMPORTAR LA NUEVA VISTA DE HISTORIAL
import HistorialView from '../views/HistorialView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/inicio',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true } // Añadido para que la vista inicio esté protegida
        },
        {
            path: '',
            redirect: '/login'
        },
        
        // --- MÓDULOS ACTIVOS ---
        {
            path: '/proveedores',
            name: 'proveedores',
            component: ProveedoresView,
            meta: { requiresAuth: true }
        },
        {
            path: '/sujetos-excluidos',
            name: 'sujetos-excluidos',
            component: SujetosExcluidosView,
            meta: { requiresAuth: true }
        },
        {
            path: '/compras',
            name: 'compras',
            component: ComprasView,
            meta: { requiresAuth: true }
        },
        {
            path: '/venta-consumidor',
            name: 'venta-consumidor',
            component: VentasConsumidorView,
            meta: { requiresAuth: true }
        },
        {
            path: '/venta-credito',
            name: 'ventas-CCF',
            component: VentasCreditoFiscalView,
            meta: { requiresAuth: true }
        },
        {
            path: '/admin-usuarios',
            name: 'admin-usuarios',
            component: AdminUsuariosView,
            meta: { requiresAuth: true }
        },
        {
            path: '/ventas-terceros',
            name: 'ventas-terceros',
            component: VentasTercerosView,
            meta: { requiresAuth: true }
        },
        {
          path: '/importar-exportar',
          name: 'importar-exportar',
          component: ImportExportView,
          meta: { requiresAuth: true }
         },
         {
             path: '/lector-json',
             name: 'lector-json',
            component: JsonReaderView,
            meta: { requiresAuth: true }
        },
         { 
            path: '/clientes-menu', 
            name: 'clientes-menu',
            component: ClientesView, 
            meta:{ requiresAuth: true } 
        },
        {
            path: '/declarantes',
            name: 'declarantes',
            component: DeclarantesView,
            meta: { requiresAuth: true }
        },
        
        // 🛡️ RUTA DE HISTORIAL AGREGADA (Oculta para usuarios no admin en el layout)
        {
            path: '/historial',
            name: 'historial',
            component: HistorialView,
            meta: { requiresAuth: true } 
        },

        // --- PÁGINAS EN CONSTRUCCIÓN ---
        { path: '/retencion-1-declarante', name: 'Retencion 1% al Declarante', component: EnConstruccion },
        { path: '/retencion-13-terceros', name: 'Retencion 13% a Terceros', component: EnConstruccion },
        { path: '/retencion-1-terceros', name: 'Retencion 1% a Terceros', component: EnConstruccion },

        { path: '/anticipo-2-declarante', name: 'Anticipo 2% al Declarante', component: EnConstruccion },
        { path: '/anticipo-2-por-declarante', name: 'Anticipo 2% por el Declarante', component: EnConstruccion },
        { path: '/percepcion-1-por-declarante', name: 'Percepcion 1% al por el Declarante', component: EnConstruccion },
        { path: '/percepcion-1-al-declarante', name: 'Percepcion 1% al Declarante', component: EnConstruccion },

        { path: '/documentos-anulados', name: 'Documentos Anulados', component: EnConstruccion },

        // Captura de rutas no encontradas (404)
        { path: '/:pathMatch(.*)*', name: 'not-found', component: EnConstruccion }
    ]
})


router.beforeEach((to, from, next) => {
    if (to.path === '/login' || to.path === '/') {
        usuarioAutenticado.value = false;
    }

    // Verificación de autenticación
    if (to.meta.requiresAuth && !usuarioAutenticado.value) {
        next('/login');
    } else if (to.path === '/inicio' && !usuarioAutenticado.value) {
        next('/login');
    } else {
        next();
    }
});

export default router