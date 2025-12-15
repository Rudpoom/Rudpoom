<template>
  <div>
    <header class="navbar">
      <div class="nav-inner">
        <NuxtLink to="/" class="brand">
          <span class="brand-badge">WP</span>
          <span>WEBPHOTO</span>
        </NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/" class="nav-link">Home</NuxtLink>
          <ClientOnly>
            <template #default>
              <NuxtLink v-if="isAuthenticated" to="/photos" class="nav-link">Menu</NuxtLink>
              <NuxtLink v-if="isAuthenticated" to="/history" class="nav-link">History</NuxtLink>
              <NuxtLink v-if="isAdmin" to="/admin" class="nav-link">Admin</NuxtLink>
              <span v-if="isAuthenticated" class="nav-link subtle">Credit: {{ formatMoney(creditCents) }}</span>
              <NuxtLink v-if="isRider" to="/rider" class="nav-link">Rider</NuxtLink>
              <template v-if="!isAuthenticated">
                <NuxtLink to="/login" class="nav-link">Login</NuxtLink>
                <NuxtLink to="/register" class="nav-link">Register</NuxtLink>
              </template>
              <button v-else class="btn btn-outline" @click="logout">Logout</button>
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
