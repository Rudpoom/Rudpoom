<template>
  <div class="card centered">
    <img src="/fire.png" alt="" style="width: 200px; height: 200px; margin-left: 30%;">
    <div class="card-header">เข้าสู่ระบบ</div>
    <form @submit.prevent="login">
      <div class="field">
        <label class="label">ชื่อผู้ใช้</label>
        <input v-model="username" class="input" placeholder="username" />
      </div>
      <div class="field">
        <label class="label">รหัสผ่าน</label>
        <input v-model="password" type="password" class="input" placeholder="password" />
      </div>
      <div class="mt-4 center">
        <button type="submit" class="btn btn-primary">เข้าสู่ระบบ</button>
      </div>
    </form>
  </div>
  </template>

<script setup>
const username = ref("")
const password = ref("")
const router = useRouter()
const { setToken } = useAuth()

async function login() {
  try {
    const res = await $fetch("/api/login", {
      method: "POST",
      body: { username: username.value, password: password.value }
    })

    if (res?.status) {
      setToken(res.token)
      router.push("/photos")
    } else {
      alert("เข้าสู่ระบบไม่สำเร็จ")
    }
  } catch (e) {
    const anyE = e
    alert(anyE?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ')
  }
}
</script>
