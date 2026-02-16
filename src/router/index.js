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
            component: HomeView
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
            name: 'Venta consumidor Final',
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
            component: VentasTercerosView
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
            component: JsonReaderView
        },

        // --- PÁGINAS EN CONSTRUCCIÓN ---
        // Se eliminaron las rutas que ya tienen módulos activos arriba

        { path: '/clientes-menu', name: 'Gestion de Clientes', component: EnConstruccion },

        { path: '/retencion-1-declarante', name: 'Retencion 1% al Declarante', component: EnConstruccion },
        { path: '/retencion-13-terceros', name: 'Retencion 13% a Terceros', component: EnConstruccion },
        { path: '/retencion-1-terceros', name: 'Retencion 1% a Terceros', component: EnConstruccion },

        { path: '/anticipo-2-declarante', name: 'Anticipo 2% al Declarante', component: EnConstruccion },
        { path: '/anticipo-2-por-declarante', name: 'Anticipo 2% por el Declarante', component: EnConstruccion },
        { path: '/percepcion-1-por-declarante', name: 'Percepcion 1% al por el Declarante', component: EnConstruccion },
        { path: '/percepcion-1-al-declarante', name: 'Percepcion 1% al Declarante', component: EnConstruccion },

        { path: '/crear-empleado', name: 'CrearEmpleado', component: EnConstruccion },
        { path: '/modificar-empleado', name: 'ModificarEmpleado', component: EnConstruccion },
        { path: '/eliminar-empleado', name: 'EliminarEmpleado', component: EnConstruccion },

        { path: '/crear-usuario', name: 'CrearUsuario', component: EnConstruccion },
        { path: '/eliminar-usuario', name: 'EliminarUsuario', component: EnConstruccion },

        { path: '/crear-empleado', name: 'CrearEmpleado', component: EnConstruccion },
        { path: '/modificar-empleado', name: 'ModificarEmpleado', component: EnConstruccion },
        { path: '/eliminar-empleado', name: 'EliminarEmpleado', component: EnConstruccion },
        { path: '/crear-usuario', name: 'CrearUsuario', component: EnConstruccion },
        { path: '/eliminar-usuario', name: 'EliminarUsuario', component: EnConstruccion },

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