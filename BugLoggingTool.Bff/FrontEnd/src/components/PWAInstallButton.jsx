import React, { useEffect, useState } from "react";
import InstallModal from "./InstallModal";

export default function PWAInstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      console.log("beforeinstallprompt captured");
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const openModal = () => setShowModal(true);

  const handleInstall = async () => {
    if (!prompt) {
      alert("Manual install required. Use Chrome menu → Install.");
      return;
    }

    prompt.prompt();
    const result = await prompt.userChoice;
    console.log("install prompt result:", result);

    setPrompt(null);
    setShowModal(false);
  };

  return (
    <>
      <button onClick={openModal} style={styles.btn}>Install App</button>

      <InstallModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onInstall={handleInstall}
        canInstall={!!prompt}
      />
    </>
  );
}

const styles = {
  btn: {
    padding: "8px 12px",
    background: "#0078d7",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};
