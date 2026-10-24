const BASE_URL = "https://story-api.dicoding.dev/v1";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error(
      "Tidak dapat terhubung. Periksa koneksi internet, lalu coba lagi.",
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Respons server tidak dapat dibaca.");
  }
  if (!response.ok || payload.error)
    throw new Error(payload.message || "Permintaan gagal. Coba lagi.");
  return payload;
}

export function registerUser({ name, email, password }) {
  return request("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}
export function loginUser({ email, password }) {
  return request("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
export function getStories(token) {
  return request("/stories?location=1", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
export function addStory(formData, token) {
  return request("/stories", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}
