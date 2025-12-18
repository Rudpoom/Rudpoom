<template>
  <div>
    <div class="card">
      <form class="mt-3" @submit.prevent="addPhoto">
        <div class="grid" style="grid-template-columns: 1.5fr .5fr auto; align-items:center; gap:12px">
          <div style="grid-column: 1 / -1">
            <label class="label">แก้ไขสินค้า</label>
          </div>
          <div style="grid-column:1 / -1">
            <label class="label">ชื่อสินค้า</label>
            <input v-model="newName" class="input" placeholder="เช่น ข้าวผัดปู" />
          </div>
          <div>
            <label class="label">ราคา</label>
            <input v-model.number="newPrice" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
          </div>
          <div style="align-self:end; display:flex; gap:8px; align-items:center">
            <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
            <button type="button" class="btn btn-outline" @click="() => (fileInput.click())">เลือกไฟล์</button>
            <button class="btn btn-primary" type="submit">เพิ่มสินค้า</button>
          </div>
          <div v-if="newPreview" style="grid-column:1 / -1; display:flex; gap:12px; align-items:center; margin-top:12px">
            <div class="photo" style="width:160px; flex:0 0 160px"><img :src="newPreview" alt="preview" /></div>
            <div>
              <div class="label">ตัวอย่างไฟล์ใหม่</div>
              <div class="subtle">ชื่อ: {{ newPreviewName }}</div>
              <div style="margin-top:8px; display:flex; gap:8px">
                <button class="btn btn-outline" type="button" @click="() => { newPreview = null; newPreviewName = null }">ยกเลิกตัวอย่าง</button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div class="mt-6 grid photos">
        <div v-for="p in photos" :key="p.id" class="card" style="padding:12px">
          <div class="photo"><img :src="p._preview || p.url" alt="photo" /></div>
          <div v-if="p._preview" class="subtle mt-1">ตัวอย่าง: ยังไม่ได้บันทึก</div>
          <div class="mt-2">
            <label class="label">ชื่อสินค้า</label>
            <input v-model="p.editName" class="input" />
          </div>
          <div class="mt-2">
            <label class="label">ราคา</label>
            <input v-model.number="p.editPrice" type="number" min="0" step="0.01" class="input" />
            <div class="subtle mt-1">ราคา: {{ formatMoney(p.price_cents) }} บาท</div>
          </div>
          <div class="mt-3" style="display:flex; gap:8px">
            <input :id="`file-${p.id}`" type="file" accept="image/*" style="display:none" @change="e => onPhotoFileChange(p, e)" />
            <button class="btn btn-outline" type="button" @click="() => selectPhotoFile(p.id)">เปลี่ยนรูป</button>
            <button v-if="p._preview" class="btn btn-outline" type="button" @click="() => { p._preview = null; p._previewName = null }">ยกเลิกตัวอย่าง</button>
            <button class="btn btn-primary" @click="savePhoto(p)">บันทึก</button>
            <button class="btn btn-outline" @click="removePhoto(p)">ลบ</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-6">
      <div class="card-header">จัดการผู้ใช้งาน</div>
      <div class="mt-3">
        <div v-for="u in users" :key="u.id" class="user-row">
          <div>
            {{ u.id }} · {{ u.username }}
            <span class="subtle">(ระดับ: {{ currentRole(u) }})</span>
            <div class="subtle mt-1">ยอดเงิน: {{ formatMoney(u.credit_cents) }}</div>
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
              <button class="btn btn-primary" @click="addCredit(u)">เพิ่ม</button>
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
  const newName = ref('')
  const newPrice = ref<number | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)
  const newPreview = ref<string | null>(null)
  const newPreviewName = ref<string | null>(null)

function selectPhotoFile(id: number | string) {
  const el = document.getElementById(`file-${id}`) as HTMLInputElement | null
  if (el) el.click()
}

async function onPhotoFileChange(p: any, e: Event) {
  const input = e.target as HTMLInputElement
  if (!input?.files?.length) return
  const f = input.files[0]
  try {
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = rej
      r.readAsDataURL(f)
    })

    p._preview = data
    p._previewName = f.name
  } catch (err: any) {
    alert(err?.message || 'Upload error')
  } finally {
    if (input) input.value = ''
  }
}

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
    editName: p.name || '',
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
  
  let urlToUse = newUrl.value.trim()
  if (newPreview.value) {
    try {
      const r: any = await $fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: { authorization: token.value },
        body: { name: newPreviewName.value || 'upload.png', data: newPreview.value }
      })
      urlToUse = r?.url || urlToUse
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || ''))
      return
    }
  }
  if (!urlToUse) return
  await $fetch('/api/admin/photos', {
    method: 'POST',
    headers: { authorization: token.value },
    body: { url: urlToUse, price: Number(newPrice.value || 0), name: newName.value || '' }
  })
  newUrl.value = ''
  newName.value = ''
  newPrice.value = null
  newPreview.value = null
  newPreviewName.value = null
  await loadPhotos()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input?.files?.length) return
  const f = input.files[0]
  try {
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = rej
      r.readAsDataURL(f)
    })
    
    newPreview.value = data
    newPreviewName.value = f.name
  } catch (err: any) {
    alert(err?.message || 'Upload error')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function savePhoto(p: any) {
  
  if (p._preview) {
    try {
      const r: any = await $fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: { authorization: token.value },
        body: { name: p._previewName || 'upload.png', data: p._preview }
      })
      if (r?.url) {
        p.editUrl = r.url
      } else {
        alert('Upload failed')
        return
      }
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || ''))
      return
    }
  }
  await $fetch(`/api/admin/photos/${p.id}`, {
    method: 'PUT',
    headers: { authorization: token.value },
    body: { url: p.editUrl, price: Number(p.editPrice), name: p.editName }
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
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-width: 160px;
  box-shadow: 0 6px 20px rgba(2,6,23,0.6);
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
.menu-item:hover { background: rgba(255, 255, 255, 0.03); }
.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border, #eee);
}
</style>
