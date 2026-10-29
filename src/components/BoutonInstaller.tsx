"use client";

import { useEffect, useState } from "react";
import { MonitorDown } from "lucide-react";

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bouton « Installer l'appli » (Chrome, Edge) : ajoute un raccourci avec le logo
 * sur le bureau et ouvre l'appli dans sa propre fenêtre.
 */
export function BoutonInstaller() {
  const [evt, setEvt] = useState<EvenementInstallation | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const surProposition = (e: Event) => {
      e.preventDefault();
      setEvt(e as EvenementInstallation);
    };
    const surInstallee = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", surProposition);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surProposition);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  if (!evt) return null;
  return (
    <button
      onClick={async () => {
        await evt.prompt();
        await evt.userChoice;
        setEvt(null);
      }}
      className="btn-secondaire py-1.5"
      title="Ajoute l'appli sur votre bureau, avec son logo"
    >
      <MonitorDown className="h-4 w-4" /> <span className="hidden sm:inline">Installer l&apos;appli</span>
    </button>
  );
}
