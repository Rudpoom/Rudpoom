<template>
  <div>
    <div class="card">
      <div class="card-header">Menu</div>
      <div class="grid photos mt-3">
        <div v-for="p in photos" :key="p.id" class="photo" @click="openOrder(p)">
          <img :src="p.url" alt="photo" />
          <div class="price-badge">{{ formatMoney(p.price_cents) }}</div>
        </div>
      </div>
    </div>

    <div class="card mt-6 center">
      <div class="subtle">ALL MENU IS THE BEST!</div>
      <div class="mt-3" style="display:inline-block; border-radius:16px; overflow:hidden; border:1px solid var(--color-border)"></div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="modal-header">Order Details</div>
          <div class="modal-body">
            <img v-if="selected" :src="selected.url" alt="selected" />
            <div class="qty">
              <label for="qty">Quantity</label>
              <input id="qty" type="number" min="1" v-model.number="quantity" class="input" />
            </div>
            <div class="field mt-2">
              <label class="label" for="addr">Delivery Address</label>
              <input id="addr" v-model="address" class="input" placeholder="House no., street, district" />
            </div>
            <div class="field mt-2">
              <label class="label" for="phone">Phone</label>
              <input id="phone" v-model="phone" class="input" placeholder="08x-xxx-xxxx" />
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-outline" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" @click="confirmOrder">Confirm</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
  </template>

<script setup lang="ts">
const router = useRouter();
const { refreshProfile } = useAuth();
const photos = ref([] as any[]);
const showModal = ref(false);
const selected = ref<any>(null);
const quantity = ref(1);
const address = ref("");
const phone = ref("");
const ordering = ref(false);

onMounted(async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  photos.value = await $fetch("/api/photo", {
    headers: { authorization: token }
  });
});

function openOrder(p: any) {
  selected.value = p;
  quantity.value = 1;
  address.value = "";
  phone.value = "";
  showModal.value = true;
}

async function confirmOrder() {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }
  if (!selected.value) return;
  const qty = Number(quantity.value || 1);
  if (!Number.isFinite(qty) || qty < 1) {
    alert("Please enter a valid quantity (>=1)");
    return;
  }
  if (!address.value || address.value.trim().length < 5) {
    alert("Please enter a delivery address");
    return;
  }
  if (!phone.value || phone.value.trim().length < 6) {
    alert("Please enter a valid phone number");
    return;
  }
  try {
    ordering.value = true;
    await $fetch("/api/order", {
      method: "POST",
      body: { photo_id: selected.value.id, quantity: qty, address: address.value.trim(), phone: phone.value.trim() },
      headers: { authorization: token },
    });
    // reflect credit deduction immediately in navbar
    try { await refreshProfile() } catch {}
    showModal.value = false;
    selected.value = null;
    router.push("/history");
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || "Failed to place order";
    alert(`Order failed: ${msg}\nPlease ensure DB migrations ran.`);
  } finally {
    ordering.value = false;
  }
}

function formatMoney(cents: number | null | undefined) {
  const v = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v);
  } catch {
    return `${v.toFixed(2)} THB`;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  padding: 16px;
}
.modal-header {
  font-weight: 600;
  margin-bottom: 8px;
}
.modal-body img {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 12px;
}
.qty {
  display: flex;
  gap: 8px;
  align-items: center;
}
.qty input {
  width: 80px;
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.photo {
  cursor: pointer;
}
.photo {
  position: relative;
}
.price-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}
</style>
