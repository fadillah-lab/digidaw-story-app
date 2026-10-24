export function isServiceWorkerAvailable() {
  return "serviceWorker" in navigator;
}

export async function registerServiceWorker() {
  if (!isServiceWorkerAvailable()) {
    console.log("Service Worker API unsupported");
    return;
  }

  try {
    // Vite menyalin file di public/ ke root hasil build (dist/).
    // BASE_URL menjaga URL tetap sesuai jika aplikasi di-deploy di subpath.
    const baseUrl = import.meta.env.BASE_URL;
    const swUrl = `${baseUrl}sw.js`;

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: baseUrl,
    });

    console.info("Service Worker berhasil didaftarkan:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Gagal mendaftarkan Service Worker:", error);
    throw error;
  }
}

const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function subscribePushNotification(token) {
  if (!("Notification" in window) || !("PushManager" in window)) {
    throw new Error("Browser tidak mendukung Push Notification.");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const response = await fetch(
    "https://story-api.dicoding.dev/v1/notifications/subscribe",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys.p256dh,
          auth: subscription.toJSON().keys.auth,
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.message || "Gagal mendaftarkan notifikasi.");
  }

  return result;
}


/**
 * Menampilkan notifikasi lokal setelah story berhasil dibuat.
 * Ini berbeda dari event push yang dikirim server; fungsi ini berjalan
 * setelah request POST /stories sukses dan tidak boleh menggagalkan story.
 */
export async function showStoryCreatedNotification(description) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Story berhasil dibuat", {
      body: `Anda telah membuat story baru dengan deskripsi: ${description}`,
      tag: "story-created",
      data: { url: `${import.meta.env.BASE_URL}#/stories` },
    });

    return true;
  } catch (error) {
    // Jangan anggap proses membuat story gagal hanya karena notifikasi gagal.
    console.error("Story berhasil dibuat, tetapi notifikasi gagal ditampilkan:", error);
    return false;
  }
}

/** Mengembalikan subscription browser saat ini, atau null jika belum subscribe. */
export async function getCurrentPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Berhenti berlangganan push notification.
 * Server diberi tahu lebih dulu; jika request server gagal, subscription lokal
 * dipertahankan agar status browser dan server tidak langsung berbeda.
 */
export async function unsubscribePushNotification(token) {
  const subscription = await getCurrentPushSubscription();

  if (!subscription) {
    return { message: "Browser ini belum berlangganan notifikasi." };
  }

  const response = await fetch(
    "https://story-api.dicoding.dev/v1/notifications/subscribe",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    },
  );

  // Beberapa endpoint dapat mengembalikan body kosong, jadi parsing dibuat aman.
  let result = {};
  try {
    result = await response.json();
  } catch {
    // Tidak ada JSON body.
  }

  if (!response.ok || result.error) {
    throw new Error(result.message || "Gagal menonaktifkan notifikasi di server.");
  }

  const unsubscribed = await subscription.unsubscribe();
  if (!unsubscribed) {
    throw new Error("Server sudah diperbarui, tetapi browser gagal menghapus subscription.");
  }

  return result;
}
