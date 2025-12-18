<template>
  <div class="card centered">
    <div class="card-header">สมัครสมาชิก</div>
    <form @submit.prevent="register">
      <div class="field">
        <label class="label">ชื่อผู้ใช้</label>
        <input v-model="username" class="input" placeholder="username" />
      </div>
      <div class="field">
        <label class="label">รหัสผ่าน</label>
        <input v-model="password" type="password" class="input" placeholder="password" />
      </div>
      <div class="mt-4 center">
        <button type="submit" class="btn btn-primary">สมัครสมาชิก</button>
      </div>
    </form>
    <div v-if="errorMsg" class="error" style="margin-top:12px;color:#d33">{{ errorMsg }}</div>
    <div v-if="okMsg" class="ok" style="margin-top:12px;color:#090">{{ okMsg }}</div>
  </div>
  </template>

<script setup>
const username = ref("")
const password = ref("")
const errorMsg = ref("")
const okMsg = ref("")

async function register() {
  errorMsg.value = ""
  okMsg.value = ""
  try {
    const res = await $fetch("/api/register", {
      method: "POST",
      body: { username: username.value, password: password.value }
    })
    if (res?.status) {
      okMsg.value = "สมัครสมาชิกสำเร็จ"
      username.value = ""
      password.value = ""
    }
  } catch (e) {
    const anyE = e
    const msg = anyE?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
    errorMsg.value = msg
  }
}
</script>

