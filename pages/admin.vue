<template>
  <div>
    <div class="card">
      <div class="card-header">Manage Photos</div>
      <form class="mt-3" @submit.prevent="addPhoto">
        <div class="grid" style="grid-template-columns: 1.5fr .5fr auto; align-items:center; gap:12px">
          <div>
            <label class="label">Photo URL (https://...)</label>
            <input v-model="newUrl" class="input" placeholder="https://...jpg" />
          </div>
          <div>
            <label class="label">Price</label>
            <input v-model.number="newPrice" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
          </div>
          <div style="align-self:end">
            <button class="btn btn-primary" type="submit">Add Photo</button>
          </div>
        </div>
      </form>

      <div class="mt-6 grid photos">
        <div v-for="p in photos" :key="p.id" class="card" style="padding:12px">
          <div class="photo"><img :src="p.url" alt="photo" /></div>
          <div class="mt-3">
            <label class="label">URL</label>
            <input v-model="p.editUrl" class="input" />
          </div>
          <div class="mt-2">
            <label class="label">Price</label>
            <input v-model.number="p.editPrice" type="number" min="0" step="0.01" class="input" />
            <div class="subtle mt-1">Current: {{ formatMoney(p.price_cents) }}</div>
          </div>
          <div class="mt-3" style="display:flex; gap:8px">
            <button class="btn btn-primary" @click="savePhoto(p)">Save</button>
            <button class="btn btn-outline" @click="removePhoto(p)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-6">
      <div class="card-header">Manage Users</div>
      <div class="mt-3">
        <div v-for="u in users" :key="u.id" class="user-row">
          <div>
            {{ u.id }} · {{ u.username }}
            <span class="subtle">(role: {{ currentRole(u) }})</span>
            <div class="subtle mt-1">Credit: {{ formatMoney(u.credit_cents) }}</div>
          </div>
          <div class="user-actions">
            <div class="role-selector">
              <button class="btn btn-outline" @click="toggleRoleMenu(u)">{{ currentRole(u) }}</button>
              <div v-if="u._open" class="menu">
                <button v-for="r in otherRoles(u)" :key="r" class="menu-item" @click="chooseRole(u, r)">{{ r }}</button>
              </div>
            </div>
            <div class="credit-add">
              <input v-model.number="u._addCredit" type="number" min="0" step="0.01" class="input" placeholder="Add credit" />
              <button class="btn btn-primary" @click="addCredit(u)">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </template>

<script setup lang="ts">
const { isAdmin, token, refreshProfile } = useAuth()
const router = useRouter()

const photos = ref([] as any[])
const users = ref([] as any[])
const newUrl = ref('')
const newPrice = ref<number | null>(null)

onMounted(async () => {
  if (!isAdmin.value) {
    router.push('/')
    return
  }
  await refreshAll()
})

async function refreshAll() {
  await Promise.all([loadPhotos(), loadUsers()])
}

async function loadPhotos() {
  const list = await $fetch('/api/photo', {
    headers: { authorization: token.value }
  })
  photos.value = list.map((p: any) => ({
    ...p,
    editUrl: p.url,
    editPrice: typeof p.price_cents === 'number' ? (p.price_cents / 100) : 0
  }))
}

async function loadUsers() {
  const list = await $fetch('/api/admin/users', {
    headers: { authorization: token.value }
  })
  users.value = list.map((u: any) => ({ ...u, _open: false, _addCredit: null }))
}

async function addPhoto() {
  if (!newUrl.value.trim()) return
  await $fetch('/api/admin/photos', {
    method: 'POST',
    headers: { authorization: token.value },
    body: { url: newUrl.value.trim(), price: Number(newPrice.value || 0) }
  })
  newUrl.value = ''
  newPrice.value = null
  await loadPhotos()
}

async function savePhoto(p: any) {
  await $fetch(`/api/admin/photos/${p.id}`, {
    method: 'PUT',
    headers: { authorization: token.value },
    body: { url: p.editUrl, price: Number(p.editPrice) }
  })
  await loadPhotos()
}

async function removePhoto(p: any) {
  await $fetch(`/api/admin/photos/${p.id}`, {
    method: 'DELETE',
    headers: { authorization: token.value }
  })
  await loadPhotos()
}

async function setRole(u: any, role: string) {
  try {
    await $fetch(`/api/admin/users/role`, {
      method: 'PUT',
      headers: { authorization: token.value },
      body: { id: u.id, role }
    })
    await loadUsers()
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to update role')
  }
}

function currentRole(u: any): string {
  return u.role || (u.is_admin ? 'ADMIN' : (u.is_rider ? 'RIDER' : 'USER'))
}
function otherRoles(u: any): string[] {
  const all = ['USER','RIDER','ADMIN']
  const cur = currentRole(u)
  return all.filter(r => r !== cur)
}
function toggleRoleMenu(u: any) {
  u._open = !u._open
}
async function chooseRole(u: any, role: string) {
  u._open = false
  await setRole(u, role)
}

function formatMoney(cents: number | null | undefined) {
  const v = Number(cents || 0) / 100
  try {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
  } catch {
    return `${v.toFixed(2)} THB`
  }
}

async function addCredit(u: any) {
  const amt = Number(u._addCredit || 0)
  if (!Number.isFinite(amt) || amt <= 0) return
  await $fetch(`/api/admin/users/credit`, {
    method: 'POST',
    headers: { authorization: token.value },
    body: { id: u.id, amount: amt }
  })
  u._addCredit = null
  await loadUsers()
  // Update navbar credit if admin topped up own account
  try { await refreshProfile() } catch {}
}
</script>

<style scoped>
.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}
.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.credit-add {
  display: flex;
  gap: 8px;
  align-items: center;
}
.role-selector { position: relative; }
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: 8px;
  min-width: 160px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  padding: 6px;
  z-index: 50;
}
.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: transparent;
  border: none;
  cursor: pointer;
}
.menu-item:hover { background: rgba(0,0,0,0.04); }
.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.photo img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border, #eee);
}
</style>
