<template>
  <div>
    <div class="card">
      <div class="card-header">คำสั่งซื้อที่พร้อม</div>
      <div v-if="loadingAvail" class="subtle mt-3">กำลังโหลด...</div>
      <div v-else>
        <div v-if="available.length === 0" class="subtle mt-3">ไม่มีคำสั่งซื้อที่รอ</div>
        <div v-else class="mt-3 list">
          <div v-for="o in available" :key="o.id" class="card-row">
            <div class="info">
              <div class="title">#{{ o.id }} • จำนวน {{ o.quantity }} • ผู้ใช้ {{ o.user_id }}</div>
              <div class="subtle">ที่อยู่: {{ o.address || '-' }} • เบอร์โทรศัพท์: {{ o.phone || '-' }}</div>
              <div class="subtle">{{ formatDate(o.created_at) }}</div>
            </div>
            <div class="actions">
              <button class="btn btn-primary" @click="accept(o)" :disabled="busy">รับงาน</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-6">
      <div class="card-header">คำสั่งซื้อที่กำลังดำเนินการ</div>
      <div v-if="loadingMine" class="subtle mt-3">กำลังโหลด...</div>
      <div v-else>
        <div v-if="mine.length === 0" class="subtle mt-3">ไม่มีคำสั่งซื้อที่กำลังดำเนินการ</div>
        <div v-else class="mt-3 list">
          <div v-for="o in mine" :key="o.id" class="card-row">
            <div class="info">
              <div class="title">#{{ o.id }} • Status: {{ o.status }} • จำนวน {{ o.quantity }}</div>
              <div class="subtle">ที่อยู่: {{ o.address || '-' }} • เบอร์โทรศัพท์: {{ o.phone || '-' }}</div>
              <div class="subtle">{{ formatDate(o.created_at) }}</div>
            </div>
            <div class="actions">
              <button v-if="nextStatus(o.status)" class="btn btn-primary" @click="advance(o)" :disabled="busy">
                {{ actionLabel(o.status) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { token, isAuthenticated, isRider } = useAuth()

const available = ref([] as any[])
const mine = ref([] as any[])
const loadingAvail = ref(false)
const loadingMine = ref(false)
const busy = ref(false)
let es: EventSource | null = null

onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }
  if (!isRider.value) {
    alert('Rider only')
    router.push('/')
    return
  }
  await Promise.all([loadAvailable(), loadMine()])
 
  try {
    es = new EventSource(`/api/rider/stream?token=${encodeURIComponent(token.value)}`)
    es.addEventListener('new_order', () => loadAvailable())
  } catch {}
})

onBeforeUnmount(() => {
  if (es) es.close()
})

async function loadAvailable() {
  loadingAvail.value = true
  try {
    available.value = await $fetch('/api/rider/available', { headers: { authorization: token.value } })
  } finally {
    loadingAvail.value = false
  }
}

async function loadMine() {
  loadingMine.value = true
  try {
    mine.value = await $fetch('/api/rider/orders', { headers: { authorization: token.value } })
  } finally {
    loadingMine.value = false
  }
}

async function accept(o: any) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch('/api/rider/accept', {
      method: 'POST',
      headers: { authorization: token.value },
      body: { order_id: o.id }
    })
    await Promise.all([loadAvailable(), loadMine()])
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to accept')
  } finally {
    busy.value = false
  }
}

function nextStatus(status: string): string | null {
  const map: Record<string, string> = {
    ASSIGNED: 'PICKING_UP',
    PICKING_UP: 'DELIVERING',
    DELIVERING: 'COMPLETED',
  }
  return map[status] || null
}

function actionLabel(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: 'Start Pickup',
    PICKING_UP: 'Start Delivery',
    DELIVERING: 'Complete',
  }
  return map[status] || 'Update'
}

async function advance(o: any) {
  const ns = nextStatus(o.status)
  if (!ns) return
  if (busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/orders/${o.id}/status`, {
      method: 'PATCH',
      headers: { authorization: token.value },
      body: { status: ns }
    })
    await loadMine()
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to update status')
  } finally {
    busy.value = false
  }
}

function formatDate(d: any) {
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}
.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border, #eee);
}
.info .title {
  font-weight: 600;
}
.actions {
  display: flex;
}
</style>
