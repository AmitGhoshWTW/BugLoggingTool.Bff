// src/hooks/useSyncStatus.js
import { useEffect, useState } from "react";
import { startSync, stopSync } from "../services/syncManager";
import { configureRemote } from "../services/syncManager";

export function useSync(remoteUrl, credentials) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    configureRemote(remoteUrl, credentials?.username, credentials?.password);
    const rep = startSync(
      () => setStatus("syncing"),
      (err) => setStatus("error"),
      () => setStatus("paused"),
      () => setStatus("active")
    );
    return () => {
      rep && rep.cancel();
      stopSync();
    };
  }, []);

  return status;
}
