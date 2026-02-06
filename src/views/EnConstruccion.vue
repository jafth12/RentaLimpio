<template>
    <div class="construccion-container">
        <h1>En Desarrollo</h1>
        <p>Este modulo estara listo pronto</p>
        <h2 class="ruta-actual">{{ $route.name }}</h2>
        <button @click="$router.back()" class="btn-volver">Volver al Menú</button>
    </div>
</template>

<style scoped>
.construccion-container {
  text-align: center;
  padding: 50px;
  color: #666;
}
h1 { color: #55C2B7; }
.btn-volver {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #55C2B7;
  color: white;
  text-decoration: none;
  border-radius: 5px;
}
</style>