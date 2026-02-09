<template>
  <div class="container mt-4">
    <div class="card shadow-sm">
      <div class="card-header bg-primary text-white">
        <h3 class="mb-0">Emisión de Comprobante de Crédito Fiscal (CCF)</h3>
      </div>
      <div class="card-body">
        
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label">Cliente (Contribuyente)</label>
            <select v-model="form.clienteId" class="form-select">
              <option value="">Seleccione un cliente...</option>
              <option v-for="cliente in clientes" :key="cliente.ClienNIT" :value="cliente.ClienNIT">
                {{ cliente.ClienNom }} (NIT: {{ cliente.ClienNIT }})
              </option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Fecha</label>
            <input type="date" v-model="form.fecha" class="form-control">
          </div>
          <div class="col-md-3">
            <label class="form-label">No. Correlativo</label>
            <input type="text" v-model="form.numeroComprobante" class="form-control" placeholder="00001">
          </div>
        </div>

        <hr>

        <h5 class="mb-3">Detalle de la Venta</h5>
        <div class="row g-2 align-items-end mb-3">
          <div class="col-md-4">
            <label>Descripción / Producto</label>
            <input type="text" v-model="itemActual.descripcion" class="form-control" placeholder="Ej. Computadora Dell">
          </div>
          <div class="col-md-2">
            <label>Cantidad</label>
            <input type="number" v-model.number="itemActual.cantidad" class="form-control" min="1">
          </div>
          <div class="col-md-2">
            <label>Precio Unitario (Sin IVA)</label>
            <input type="number" v-model.number="itemActual.precio" class="form-control" min="0.01" step="0.01">
          </div>
          <div class="col-md-2">
             <label>Ventas Gravadas</label>
             <input type="text" :value="(itemActual.cantidad * itemActual.precio).toFixed(2)" class="form-control" disabled>
          </div>
          <div class="col-md-2">
            <button @click="agregarItem" class="btn btn-success w-100">Agregar</button>
          </div>
        </div>

        <div class="table-responsive mb-4">
          <table class="table table-bordered table-striped">
            <thead class="table-light">
              <tr>
                <th>Cant.</th>
                <th>Descripción</th>
                <th>Precio Unit.</th>
                <th>Ventas Exentas</th>
                <th>Ventas Gravadas</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in form.items" :key="index">
                <td>{{ item.cantidad }}</td>
                <td>{{ item.descripcion }}</td>
                <td>${{ item.precio.toFixed(2) }}</td>
                <td>$0.00</td>
                <td>${{ (item.cantidad * item.precio).toFixed(2) }}</td>
                <td>
                  <button @click="eliminarItem(index)" class="btn btn-sm btn-danger">X</button>
                </td>
              </tr>
              <tr v-if="form.items.length === 0">
                <td colspan="6" class="text-center text-muted">No hay items agregados aún.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="row justify-content-end">
          <div class="col-md-4">
            <table class="table table-sm table-borderless">
              <tbody> <tr>
                    <td class="text-end fw-bold">Sumas (Neto):</td>
                    <td class="text-end">${{ form.sumas.toFixed(2) }}</td>
                  </tr>
                  <tr>
                    <td class="text-end fw-bold">13% IVA:</td>
                    <td class="text-end">${{ form.iva.toFixed(2) }}</td>
                  </tr>
                  <tr>
                    <td class="text-end fw-bold">Sub-Total:</td>
                    <td class="text-end">${{ form.subtotal.toFixed(2) }}</td>
                  </tr>
                  <tr>
                    <td class="text-end text-danger">(-) IVA Retenido 1%:</td>
                    <td><input type="number" v-model.number="form.ivaRetenido" class="form-control form-control-sm text-end"></td>
                  </tr>
                  <tr>
                    <td class="text-end fw-bold fs-5">VENTA TOTAL:</td>
                    <td class="text-end fw-bold fs-5">${{ form.totalVenta.toFixed(2) }}</td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
            <button class="btn btn-secondary me-md-2">Cancelar</button>
            <button @click="guardarVenta" class="btn btn-primary" :disabled="form.items.length === 0 || !form.clienteId">
                Guardar Comprobante
            </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import axios from 'axios';

// URL base de la API (toma la del .env o usa localhost por defecto)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Estado para la lista de clientes
const clientes = ref([]);

// Estado del formulario principal
const form = ref({
  clienteId: '',
  fecha: new Date().toISOString().split('T')[0],
  numeroComprobante: '',
  items: [],
  sumas: 0,
  iva: 0,
  subtotal: 0,
  ivaRetenido: 0,
  totalVenta: 0
});

// Estado para el item que se está escribiendo
const itemActual = ref({
  descripcion: '',
  cantidad: 1,
  precio: 0
});

// --- CARGAR CLIENTES AL INICIAR ---
onMounted(async () => {
    try {
        // Asumiendo que tienes una ruta GET /api/clientes
        const respuesta = await axios.get(`${API_URL}/api/clientes`);
        clientes.value = respuesta.data;
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        // Si falla, podrías mostrar una alerta o dejar la lista vacía
    }
});

// Función para agregar item a la lista
const agregarItem = () => {
  if (itemActual.value.descripcion && itemActual.value.precio > 0) {
    form.value.items.push({ ...itemActual.value });
    // Limpiar campos
    itemActual.value.descripcion = '';
    itemActual.value.cantidad = 1;
    itemActual.value.precio = 0;
  } else {
    alert("Por favor ingrese descripción y precio válido.");
  }
};

const eliminarItem = (index) => {
  form.value.items.splice(index, 1);
};

// CÁLCULOS AUTOMÁTICOS
watch(() => form.value.items, (nuevosItems) => {
  let sumaGravada = 0;
  nuevosItems.forEach(item => {
    sumaGravada += (item.cantidad * item.precio);
  });

  form.value.sumas = sumaGravada;
  form.value.iva = sumaGravada * 0.13; // 13% IVA El Salvador
  form.value.subtotal = form.value.sumas + form.value.iva;
  calcularTotalFinal();
}, { deep: true });

watch(() => form.value.ivaRetenido, () => {
  calcularTotalFinal();
});

const calcularTotalFinal = () => {
  form.value.totalVenta = form.value.subtotal - form.value.ivaRetenido;
};

// Guardar en Backend
const guardarVenta = async () => {
  if (!form.value.clienteId) {
      alert("Por favor seleccione un cliente.");
      return;
  }

  try {
    const respuesta = await axios.post(`${API_URL}/api/ventas-ccf`, form.value);
    alert('Éxito: ' + respuesta.data.message);
    
    // Opcional: Limpiar formulario tras guardar
    form.value.items = [];
    form.value.numeroComprobante = '';
    
  } catch (error) {
    console.error(error);
    alert('Error al guardar: ' + (error.response?.data?.message || error.message));
  }
};
</script>

<style scoped>
.form-label {
    font-weight: 500;
}
</style>