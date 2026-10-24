import { deleteSavedStory, getSavedStories } from "../db.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const dateLabel = (date) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(parsed);
};

export async function renderSavedStories(root) {
  root.innerHTML = `<section class="stories-page saved-page"><div class="page-intro"><p class="eyebrow">TERSIMPAN DI PERANGKAT</p><h1>Cerita <em>favoritmu.</em></h1><p>Cerita disimpan di perangkat ini menggunakan IndexedDB, jadi tetap bisa dibuka tanpa koneksi internet.</p><a class="button button-dark" href="#/stories">Kembali jelajahi cerita</a></div><section class="feed-section"><div class="section-heading"><div><p class="eyebrow">KOLEKSI PRIBADI</p><h2>Cerita tersimpan</h2></div><span class="section-aside" id="saved-count"></span></div><p class="form-message" id="saved-message" role="status" aria-live="polite">Memuat cerita tersimpan…</p><div class="story-grid" id="saved-story-list"></div></section></section>`;
  root.querySelector("#saved-story-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-story]");
    if (!button) return;
    button.disabled = true;
    const message = root.querySelector("#saved-message");
    try {
      await deleteSavedStory(button.dataset.deleteStory);
      await loadSavedStories(root);
    } catch (error) {
      message.textContent = `Cerita belum berhasil dihapus: ${error.message}`;
      button.disabled = false;
    }
  });
  await loadSavedStories(root);
}

async function loadSavedStories(root) {
  const list = root.querySelector("#saved-story-list");
  const message = root.querySelector("#saved-message");
  try {
    const stories = await getSavedStories();
    root.querySelector("#saved-count").textContent = `${stories.length} cerita`;
    if (!stories.length) {
      message.textContent = "Belum ada cerita tersimpan. Buka halaman Jelajahi, lalu pilih Simpan offline pada cerita yang kamu inginkan.";
      return;
    }
    message.textContent = "";
    list.innerHTML = stories.map((story) => `<article class="story-card"><img src="${escapeHtml(story.photoUrl || "")}" alt="Foto cerita oleh ${escapeHtml(story.name || "pengguna")}" loading="lazy"><div class="story-body"><p class="story-meta"><span>${escapeHtml(story.name || "Pengguna")}</span><time datetime="${escapeHtml(story.createdAt || "")}">${dateLabel(story.createdAt)}</time></p><p>${escapeHtml(story.description || "")}</p><button class="button button-dark saved-delete" type="button" data-delete-story="${escapeHtml(story.id)}">Hapus dari tersimpan</button></div></article>`).join("");
  } catch (error) {
    message.textContent = `IndexedDB tidak dapat diakses: ${error.message}`;
  }
}
