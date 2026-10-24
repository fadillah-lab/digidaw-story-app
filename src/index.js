import { startRouter } from "./router.js";
import { registerServiceWorker } from "./utils/index.js";

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker().catch((error) => {
    // Aplikasi tetap bisa digunakan meskipun Service Worker gagal terpasang.
    console.error("Service Worker tidak aktif:", error);
  });
});

document.querySelector("[data-logout]").addEventListener("click", () => {
  localStorage.removeItem("story-token");
  localStorage.removeItem("story-name");
  location.hash = "#/stories";
  startRouterRefresh();
});

function startRouterRefresh() {
  document.dispatchEvent(new HashChangeEvent("hashchange"));
}

startRouter();

// Tampilkan tombol instal saat browser menyatakan aplikasi memenuhi syarat.
let deferredInstallPrompt = null;
const installButton = document.querySelector("[data-install-app]");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
  console.info("Story App berhasil dipasang.");
});
