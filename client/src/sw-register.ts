// Service Worker Registration
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New content is available, show update prompt
                  if (confirm("New version available! Reload to update?")) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    });
  }
}

// Check if app can be installed
export function checkInstallable(): Promise<boolean> {
  return new Promise((resolve) => {
    if ("serviceWorker" in navigator) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

// Handle install prompt
let deferredPrompt: any;

export function setInstallPrompt(prompt: any) {
  deferredPrompt = prompt;
}

export async function showInstallPrompt(): Promise<boolean> {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === "accepted";
  }
  return false;
}

// Listen for beforeinstallprompt event
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setInstallPrompt(e);
  });
}
