import { ref } from 'vue';

const estadoInicial = sessionStorage.getItem('sesionActiva') === 'true';

export const usuarioAutenticado = ref(estadoInicial);