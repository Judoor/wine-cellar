"use client";

import { useEffect } from "react";

/** Registers the service worker (only works over HTTPS or on localhost). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
