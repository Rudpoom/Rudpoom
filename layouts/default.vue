<template>
  <div>
    <header class="navbar">
      <div class="nav-inner">
        <NuxtLink to="/" class="brand">
        <span>ร้าน</span>
        </NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/" class="nav-link">หน้าหลัก</NuxtLink>
          <ClientOnly>
            <template #default>
              <NuxtLink v-if="isAuthenticated" to="/photos" class="nav-link">เมนู</NuxtLink>
              <NuxtLink v-if="isAuthenticated" to="/history" class="nav-link">ประวัติ</NuxtLink>
              <NuxtLink v-if="isAdmin" to="/admin" class="nav-link">แอดมิน</NuxtLink>
              <span v-if="isAuthenticated" class="nav-link subtle">ยอดเงิน: {{ formatMoney(creditCents) }}</span>
              <NuxtLink v-if="isRider" to="/rider" class="nav-link">ไรเดอร์</NuxtLink>
              <template v-if="!isAuthenticated">
                <NuxtLink to="/login" class="nav-link">เข้าสู่ระบบ</NuxtLink>
                <NuxtLink to="/register" class="nav-link">สมัครสมาชิก</NuxtLink>
              </template>
              <button v-else class="btn btn-outline" @click="logout">ออกจากระบบ</button>
            </template>
          </ClientOnly>
        </nav>
      </div>
    </header>

    <main class="container">
      <slot />
    </main>
  </div>
  </template>

<script setup>
const { isAuthenticated, isAdmin, isRider, creditCents, clearToken, refreshProfile } = useAuth()
onMounted(() => { refreshProfile() })
const router = useRouter()
function logout() {
  clearToken()
  router.push('/')
}
function formatMoney(cents) {
  const v = Number(cents || 0) / 100
  try { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) }
  catch { return `${v.toFixed(2)} THB` }
}
</script>
