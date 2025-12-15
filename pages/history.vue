<template>
  <div class="card">
    <div class="card-header">Order History</div>
    <div v-if="loading" class="subtle mt-3">Loading...</div>
    <div v-else>
      <div v-if="orders.length === 0" class="subtle mt-3">No orders yet</div>
      <div v-else class="mt-3">
        <div v-for="o in orders" :key="o.id" class="order-row">
          <img :src="o.photo_url" alt="thumb" />
          <div class="meta">
            <div>Menu #{{ o.photo_id }}</div>
            <div class="subtle">Qty: {{ o.quantity }}</div>
            <div class="subtle">Status: {{ o.status }}</div>
            <div class="subtle">Time: {{ formatDate(o.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const orders = ref([] as any[]);
const loading = ref(true);

onMounted(async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }
  try {
    orders.value = await $fetch("/api/history", {
      headers: { authorization: token },
    });
  } finally {
    loading.value = false;
  }
});

function formatDate(d: any) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}
</script>

<style scoped>
.order-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border, #eee);
}
.order-row img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border, #eee);
}
.order-row .meta {
  display: flex;
  flex-direction: column;
}
</style>
