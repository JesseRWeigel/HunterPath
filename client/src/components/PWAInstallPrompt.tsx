import React, { useEffect, useState } from "react";
import {
  checkInstallable,
  setInstallPrompt,
  showInstallPrompt,
} from "../sw-register";

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
      setShowPrompt(true);
    };

    const checkInstallability = async () => {
      const installable = await checkInstallable();
      if (installable) {
        window.addEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
      }
    };

    checkInstallability();

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !canInstall) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-purple-500 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Install Hunter's Path</h3>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <p className="text-zinc-300 text-sm mb-3">
        Install this app on your device for quick and easy access when you're on
        the go.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
