import { getStories } from "../api.js";
import { getSavedStories, isStorySaved, saveStory } from "../db.js";
import {
  getCurrentPushSubscription,
  subscribePushNotification,
  unsubscribePushNotification,
} from "../utils/index.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Tetapkan aset marker secara eksplisit agar jalurnya ikut diproses oleh Vite saat build.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
// import { navigate } from "../router.js";

const dateLabel = (date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
    new Date(date),
  );
const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export function renderStories(root) {
  const token = localStorage.getItem("story-token");
  root.innerHTML = `<section class="stories-page"><div class="hero"><div><p class="eyebrow">CERITA DARI KOMUNITAS</p><h1>Hal-hal kecil,<br><em>cerita yang berarti.</em></h1><p>Potongan hari dari orang-orang yang punya rasa ingin tahu sama.</p><a class="button button-dark" href="${token ? "#/add-story" : "#/login"}">Bagikan ceritamu <span aria-hidden="true">↗</span></a></div><div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="art-note">CATATAN<br>HARI INI</div><div class="art-scribble">a little<br>bit of life</div></div></div><section class="map-section" aria-labelledby="map-title"><div class="section-heading"><div><p class="eyebrow">JEJAK DI PETA</p><h2 id="map-title">Cerita, di mana saja.</h2></div><span class="section-aside">Titik-titik cerita komunitas</span></div><div id="stories-map" class="map" role="region" aria-label="Peta lokasi cerita"></div><p class="map-caption">Setiap titik menyimpan cerita dari suatu tempat.</p></section><section class="feed-section" aria-labelledby="feed-title"><div class="section-heading"><div><p class="eyebrow">JURNAL KOMUNITAS</p><h2 id="feed-title">Cerita terbaru</h2></div><span class="section-aside" id="story-count"></span></div>${token ? '<div class="notification-controls"><button class="button button-dark" id="enable-notifications" type="button">Aktifkan notifikasi</button><p class="form-message" id="notification-message" role="status" aria-live="polite"></p></div>' : ''}<p class="form-message" id="feed-message" role="status" aria-live="polite">Sedang memuat cerita…</p><div id="story-list" class="story-grid"></div></section></section>`;
  if (token) {
    const notificationButton = root.querySelector("#enable-notifications");
    const notificationMessage = root.querySelector("#notification-message");

    let isSubscribed = false;

    const updateNotificationButton = () => {
      notificationButton.textContent = isSubscribed
        ? "Matikan notifikasi"
        : "Aktifkan notifikasi";
      notificationButton.setAttribute("aria-pressed", String(isSubscribed));
      notificationButton.disabled = false;
    };

    // Pulihkan status dari subscription browser ketika halaman Stories dibuka.
    (async () => {
      try {
        const subscription = await getCurrentPushSubscription();
        isSubscribed = Boolean(subscription);
        if (isSubscribed) {
          notificationMessage.textContent =
            "Browser ini sudah memiliki subscription notifikasi.";
        }
      } catch (error) {
        notificationMessage.textContent =
          "Status notifikasi belum dapat diperiksa. " + error.message;
      } finally {
        updateNotificationButton();
      }
    })();

    notificationButton?.addEventListener("click", async () => {
      notificationButton.disabled = true;
      notificationMessage.textContent = isSubscribed
        ? "Menonaktifkan notifikasi…"
        : "Mengaktifkan notifikasi…";

      try {
        if (isSubscribed) {
          await unsubscribePushNotification(token);
          isSubscribed = false;
          notificationMessage.textContent =
            "Notifikasi berhasil dinonaktifkan untuk browser ini.";
        } else {
          await subscribePushNotification(token);
          isSubscribed = true;
          notificationMessage.textContent =
            "Notifikasi berhasil diaktifkan untuk browser ini.";
        }
      } catch (error) {
        notificationMessage.textContent = error.message;
      } finally {
        updateNotificationButton();
      }
    });
  }

  loadStories(root, token);
}

async function loadStories(root, token) {
  const list = root.querySelector("#story-list");
  const message = root.querySelector("#feed-message");
  const map = L.map(root.querySelector("#stories-map")).setView([-2.5, 118], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 10,
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 100);
  if (!token) {
    message.innerHTML = 'Masuk untuk melihat cerita komunitas. <a href="#/login">Masuk ke akun</a> · <a href="#/register">Daftar</a>';
    return;
  }

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-story]");
    if (!button) return;
    const story = displayedStories.find((item) => item.id === button.dataset.saveStory);
    if (!story) return;
    button.disabled = true;
    try {
      await saveStory(story);
      button.textContent = "Tersimpan ✓";
      button.classList.add("saved-success");
    } catch (error) {
      message.textContent = `Cerita belum berhasil disimpan: ${error.message}`;
      button.disabled = false;
    }
  });

  let displayedStories = [];
  try {
    const result = await getStories(token);
    displayedStories = result.listStory || [];
    if (!displayedStories.length) {
      message.textContent = "Belum ada cerita untuk ditampilkan.";
      return;
    }
    message.textContent = "";
    root.querySelector("#story-count").textContent = `${displayedStories.length} cerita`;
    await renderStoryCards(root, displayedStories, list);
    addStoryMarkers(displayedStories, map);
  } catch (error) {
    try {
      displayedStories = await getSavedStories();
      if (displayedStories.length) {
        message.textContent = "Kamu sedang offline. Menampilkan cerita yang tersimpan di perangkat ini.";
        root.querySelector("#story-count").textContent = `${displayedStories.length} tersimpan`;
        await renderStoryCards(root, displayedStories, list, true);
        addStoryMarkers(displayedStories, map);
      } else {
        message.textContent = `${error.message} Belum ada cerita tersimpan untuk dibaca offline.`;
      }
    } catch {
      message.textContent = error.message;
    }
  }
}

async function renderStoryCards(root, stories, list, offline = false) {
  const savedIds = new Set();
  await Promise.all(stories.map(async (story) => {
    try { if (await isStorySaved(story.id)) savedIds.add(story.id); } catch { /* Tampilkan cerita meskipun pemeriksaan simpan gagal. */ }
  }));
  list.innerHTML = stories.map((story) => {
    const saved = savedIds.has(story.id);
    const buttonLabel = saved ? "Tersimpan ✓" : "Simpan offline";
    return `<article class="story-card"><img src="${escapeHtml(story.photoUrl || "")}" alt="Foto cerita oleh ${escapeHtml(story.name || "pengguna")}" loading="lazy"><div class="story-body"><p class="story-meta"><span>${escapeHtml(story.name || "Pengguna")}</span><time datetime="${escapeHtml(story.createdAt || "")}">${dateLabel(story.createdAt)}</time></p><p>${escapeHtml(story.description || "")}</p><button class="button button-dark save-story-button ${saved ? "saved-success" : ""}" type="button" data-save-story="${escapeHtml(story.id)}" ${saved || offline ? "disabled" : ""}>${offline ? "Tersimpan offline" : buttonLabel}</button></div></article>`;
  }).join("");
}

function addStoryMarkers(stories, map) {
  stories.filter((story) => Number.isFinite(Number(story.lat)) && Number.isFinite(Number(story.lon)) && story.lat !== null && story.lon !== null).forEach((story) => {
    const popup = `<strong>${escapeHtml(story.name || "Pengguna")}</strong><br>${escapeHtml((story.description || "").slice(0, 140))}`;
    L.marker([Number(story.lat), Number(story.lon)]).addTo(map).bindPopup(popup);
  });
}
