import { ref } from 'vue';

const estadoInicial = localStorage.getItem('sesionActiva') === 'true';

export const usuarioAutenticado = ref(estadoInicial);