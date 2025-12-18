<template>
  <div class="card centered center index-card">
    <div class="card-header">ยินดีต้อนรับ</div>
    <div class="index-body">
      <div v-if="isAuthenticated" class="user-block">
        <NuxtLink to="/photos" class="username link">สวัสดี, {{ username || 'ผู้ใช้' }}</NuxtLink>
        <div class="balance">ยอดคงเหลือ: <span class="amount">{{ formattedBalance }}</span></div>
        <div style="margin-top:12px">
          <NuxtLink to="/photos" class="btn btn-primary">เลือกซื้ออาหาร</NuxtLink>
        </div>
      </div>
      <div v-else class="auth-buttons">
        <NuxtLink to="/login" class="btn btn-primary large">เข้าสู่ระบบ</NuxtLink>
        <NuxtLink to="/register" class="btn btn-outline large" style="margin-left:12px">ลงทะเบียน</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, token, creditCents, refreshProfile } = useAuth()
const username = ref<string | null>(null)
const formattedBalance = computed(() => {
  try {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format((Number(creditCents.value || 0) / 100))
  } catch {
    return `${(Number(creditCents.value || 0) / 100).toFixed(2)} THB`
  }
})

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const me: any = await $fetch('/api/me', { headers: { authorization: token.value } })
      username.value = me?.username || null
      
      try { await refreshProfile() } catch {}
    } catch {
      username.value = null
    }
  }
})
</script>

<style scoped>
.index-card { max-width:720px; margin: 32px auto; padding: 28px; }
.index-body { display:flex; align-items:center; justify-content:center; gap:20px; flex-direction:column; }
.user-block { text-align:center; }
.username { font-size:28px; font-weight:700; color:var(--color-text); margin-bottom:8px }
.link { text-decoration: none; color: inherit }
.balance { font-size:18px; color:var(--color-text); opacity:0.9 }
.balance .amount { font-weight:700; margin-left:6px }
.auth-buttons .large { padding:12px 18px; font-size:16px }
</style>
