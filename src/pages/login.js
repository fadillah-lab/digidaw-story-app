import { loginUser } from "../api.js";
import { navigate } from "../router.js";

export function renderLogin(root) {
  root.innerHTML = `<section class="auth-layout"><div class="auth-copy"><p class="eyebrow">SENANG BERTEMU LAGI</p><h1>Setiap cerita<br>punya tempatnya.</h1><p>Masuk untuk berbagi momen kecil yang mungkin berarti besar bagi orang lain.</p><div class="auth-stamp" aria-hidden="true">DIGIDAW<br>COMMUNITY<br><span>✳</span> STORIES</div></div><form class="form-card" id="login-form"><p class="eyebrow">AKUN KAMU</p><h2>Masuk ke Story</h2><p class="form-intro">Belum punya akun? <a href="#/register">Daftar gratis</a></p><label for="email">Alamat email</label><input id="email" name="email" type="email" autocomplete="email" placeholder="nama@email.com" required><label for="password">Kata sandi</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="8" placeholder="Minimal 8 karakter" required><p class="form-message" role="status" aria-live="polite"></p><button class="button button-dark" type="submit">Masuk <span aria-hidden="true">→</span></button></form></section>`;
  root.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const message = form.querySelector(".form-message");
    button.disabled = true;
    button.textContent = "Memeriksa…";
    message.textContent = "";
    try {
      const result = await loginUser(Object.fromEntries(new FormData(form)));
      localStorage.setItem("story-token", result.loginResult.token);
      localStorage.setItem("story-name", result.loginResult.name);
      navigate("/stories");
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
      button.innerHTML = 'Masuk <span aria-hidden="true">→</span>';
    }
  });
}
