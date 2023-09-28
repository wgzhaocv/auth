if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker Registered:", registration);
      })
      .catch((error) => {
        console.error("Registration Failed:", error);
      });
  });
}
