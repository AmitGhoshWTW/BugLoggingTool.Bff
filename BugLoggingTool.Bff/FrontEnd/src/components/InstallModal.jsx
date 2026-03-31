import React from "react";

export default function InstallModal({ open, onClose, onInstall, canInstall }) {
  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Install Bug Logging Tool</h3>

        {canInstall ? (
          <>
            <p>You can install this application for offline use.</p>
            <button style={styles.btn} onClick={onInstall}>Install App</button>
          </>
        ) : (
          <>
            <p>
              Your browser did not issue an install prompt.  
              You can still install manually using Chrome:
            </p>

            <ul>
              <li>Click the <b>⋮</b> (Chrome menu)</li>
              <li>Select <b>“Install App”</b> or <b>“Add to Desktop”</b></li>
            </ul>
          </>
        )}

        <button style={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "350px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
  },
  btn: {
    padding: "10px 15px",
    background: "#0078d7",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
    marginTop: "10px"
  },
  closeBtn: {
    marginTop: "15px",
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    cursor: "pointer"
  }
};
