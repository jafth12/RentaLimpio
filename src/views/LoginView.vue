<template>
    <div class="login-container">
        <div class="login-card">
            <h1>Bienvenido</h1>
            <p>Sistema de Declaracion de Renta</p>

            <form @submit.prevent="iniciarSesion">
                <div class="form-group">
                    <label>Usuario</label>
                    <input 
                    type="text"
                    v-model="UsuaNombre"
                    placeholder="Ingrese su usuario"
                    autocomplete="off"
                    required>
                </div>

                <div class="form-group">
                    <label>Contraseña</label>
                    <input 
                    type="password"
                    v-model="UsuarioPassword"
                    placeholder="Ingrese su Contraseña"
                    autocomplete="off"
                    required>
                </div>

                <button type="submit" :disabled="cargando">
                    {{ cargando ? 'Verificando...' : 'Iniciar Sesion' }}
                </button>

                <p v-if="error" class="error-msg">{{ error }}</p>
            </form>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import axios from 'axios';
    import { useRouter } from 'vue-router';
    import { usuarioAutenticado } from '../auth.js';

    const UsuaNombre = ref('');
    const UsuarioPassword = ref('');
    const error = ref('');
    const cargando = ref(false);
    const router = useRouter();

    const iniciarSesion = async () => {
       cargando.value = true;
       error.value = '';

       try {
        const respuesta = await axios.post(import.meta.env.VITE_API_URL + '/api/login', {
             UsuaNombre: UsuaNombre.value,
            UsuarioPassword: UsuarioPassword.value
        });

        if (respuesta.data.message === 'Login exitoso') {
            usuarioAutenticado.value = true;
            localStorage.setItem('sesionActiva', 'true');
            router.push('/inicio');
        }

       } catch (err) {
        UsuaNombre.value = '';
        UsuarioPassword.value = '';
        
        if (err.response && err.response.status === 401){
            error.value = 'Usuario o contraseñas incorrectos.';
        } else {
            error.value = 'Error de conexion con el servidor.';
        }
       } finally {
        cargando.value = false;
       }
    };
</script>

<style scoped>
/* REGLA DE DISEÑO: Color Celeste #55C2B7 y Blanco */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #55C2B7; /* Fondo Celeste */
}

.login-card {
  background-color: white; /* Tarjeta Blanca */
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  color: #55C2B7;
  margin-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  outline: none;
}

input:focus {
  border-color: #55C2B7;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #55C2B7;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  font-weight: bold;
}

button:hover {
  background-color: #439a91; /* Un poco más oscuro al pasar el mouse */
}

button:disabled {
  background-color: #ccc;
}

.error-msg {
  color: red;
  margin-top: 10px;
  font-size: 0.9rem;
}
</style>