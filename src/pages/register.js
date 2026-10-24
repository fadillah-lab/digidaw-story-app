import { registerUser } from "../api.js";
import { navigate } from "../router.js";

export function renderRegister(root) {
  root.innerHTML = `
  <section class="auth-layout"><div class="auth-copy"><p class="eyebrow">MOMENMU PANTAS DICERITAKAN</p><h1>Mulai dari<br>cerita sederhana.</h1><p>Temukan cerita dari komunitas, lalu tambahkan ceritamu sendiri.</p><div class="auth-stamp" aria-hidden="true">DIGIDAW<br>COMMUNITY<br><span>✳</span> STORIES</div></div><form class="form-card" id="register-form"><p class="eyebrow">SELAMAT DATANG</p><h2>Buat akun baru</h2><p class="form-intro">Sudah punya akun? <a href="#/login">Masuk di sini</a></p><label for="name">Nama lengkap</label><input id="name" name="name" autocomplete="name" placeholder="Nama kamu" required><label for="email">Alamat email</label><input id="email" name="email" type="email" autocomplete="email" placeholder="nama@email.com" required><label for="password">Kata sandi</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="Minimal 8 karakter" required><p class="form-message" role="status" aria-live="polite"></p><button class="button button-dark" type="submit">Buat akun <span aria-hidden="true">→</span></button></form></section>`;
  root.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const message = form.querySelector(".form-message");
    button.disabled = true;
    button.textContent = "Membuat akun…";
    message.textContent = "";
    try {
      await registerUser(Object.fromEntries(new FormData(form)));
      message.textContent = "Akun berhasil dibuat. Silakan masuk.";
      message.classList.add("success");
      setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
      button.innerHTML = 'Buat akun <span aria-hidden="true">→</span>';
    }
  });
}
