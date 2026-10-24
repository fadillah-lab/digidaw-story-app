import { addStory } from "../api.js";
import { showStoryCreatedNotification } from "../utils/index.js";
import { navigate } from "../router.js";
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

export function renderAddStory(root) {
  const token = localStorage.getItem("story-token");
  if (!token) {
    navigate("/login");
    return;
  }
  root.innerHTML = `<section class="add-page"><div class="page-intro"><p class="eyebrow">TAMBAHKAN KE JURNAL</p><h1>Ada cerita<br><em>di sini.</em></h1><p>Bagikan satu momen yang ingin kamu simpan. Cerita-cerita baik selalu menemukan jalannya.</p><a href="#/stories" class="back-link">← Kembali ke cerita</a></div><form class="add-form" id="story-form"><label for="description">Ceritakan momenmu</label><textarea id="description" name="description" rows="5" maxlength="500" placeholder="Hari ini aku menemukan…" required></textarea><label for="photo">Pilih foto</label><input id="photo" name="photo" type="file" accept="image/*" required><p class="field-hint">Format gambar, maksimal 1 MB.</p><label>Lokasi cerita <span class="optional">(opsional)</span></label><div id="pick-map" class="map pick-map" role="region" aria-label="Peta, klik untuk memilih lokasi"></div><p class="coordinate" id="coordinates">Belum ada lokasi dipilih</p><p class="form-message" role="status" aria-live="polite"></p><button class="button button-dark" type="submit">Terbitkan cerita <span aria-hidden="true">↗</span></button></form></section>`;
  const map = L.map(root.querySelector("#pick-map")).setView([-2.5, 118], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
  let marker;
  let selectedLat = "";
  let selectedLon = "";
  map.on("click", ({ latlng }) => {
    selectedLat = latlng.lat.toFixed(6);
    selectedLon = latlng.lng.toFixed(6);
    root.querySelector("#coordinates").textContent =
      `Lokasi dipilih: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    if (marker) marker.setLatLng(latlng);
    else marker = L.marker(latlng).addTo(map);
  });
  setTimeout(() => map.invalidateSize(), 100);
  root.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.photo.files[0];
    const button = form.querySelector("button");
    const message = form.querySelector(".form-message");
    if (!file || file.size > 1024 * 1024 || !file.type.startsWith("image/")) {
      message.textContent =
        "Pilih gambar yang valid dengan ukuran maksimal 1 MB.";
      return;
    }
    const data = new FormData();
    data.append("description", form.elements.description.value);
    data.append("photo", file);
    if (selectedLat) data.append("lat", selectedLat);
    if (selectedLon) data.append("lon", selectedLon);
    button.disabled = true;
    button.textContent = "Mengirim cerita…";
    message.textContent = "";
    try {
      await addStory(data, token);
      await showStoryCreatedNotification(form.elements.description.value.trim());
      navigate("/stories");
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
      button.innerHTML = 'Terbitkan cerita <span aria-hidden="true">↗</span>';
    }
  });
}
