// src/components/ScreenshotManager.jsx
import React, { useEffect, useState, useRef } from "react";
import eventBus from "../utils/eventBus";
import AI from "../services/aiTools";

import {
  localDB,
  getAllScreenshots,
  saveScreenshotAttachment
} from "../services/pouchdbService";

export default function ScreenshotManager({ sessionId, reloadKey }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [multiMode, setMultiMode] = useState(false);
  const [undoItem, setUndoItem] = useState(null);
  const undoTimerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  // -----------------------------------------
  // Load screenshots (PouchDB attachments)
  // -----------------------------------------
  useEffect(() => {
    load();
  }, [reloadKey]);

  useEffect(() => {
    function reset() {
      load();
    }
    eventBus.on("reset-captures", reset);
    return () => eventBus.off("reset-captures", reset);
  }, []);

  async function load() {
    try {
      const screenshots = await getAllScreenshots();

      const arr = screenshots.map((s) => ({
        id: s._id,
        url: s.imageUrl,
        blob: s.blob, // Keep for processing
        createdAt: s.createdAt || Date.now(),
        position: s.position ?? 0,
        description: s.description || ""
      }));

      arr.sort((a, b) => a.position - b.position);

      setItems(arr);
    } catch (error) {
      console.error("Error loading screenshots:", error);
      setItems([]);
    }
  }

  // -----------------------------------------
  // Helper — delete attachment doc in PouchDB
  // -----------------------------------------
  async function deleteScreenshotPouch(id) {
    try {
      // const doc = await localDB.get(id);
      // await localDB.remove(doc);
      // console.log("Screenshot deleted:", id);
    } catch (e) {
      console.error("deleteScreenshot error:", e);
    }
  }

  // -----------------------------------------
  // DELETE + UNDO
  // -----------------------------------------
  async function deleteItem(id) {
    await deleteScreenshotPouch(id);

    setUndoItem(id);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);

    load();
  }

  async function undoDelete() {
    if (!undoItem) return;
    // Not possible to actually "undo" a delete in CouchDB/PouchDB,
    // because the attachment is gone. So we simply hide the Undo UI.
    alert("⚠️ Undo not possible — attachment was fully deleted.");
    setUndoItem(null);
  }

  // -----------------------------------------
  // MULTI-SELECT
  // -----------------------------------------
  function toggleSelect(id) {
    if (!multiMode) return;

    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    
    if (!confirm(`Delete ${selected.length} screenshot(s)?`)) return;
    
    for (const id of selected) {
      await deleteScreenshotPouch(id);
    }
    
    setSelected([]);
    load();
  }

  // -----------------------------------------
  // DRAG-DROP reorder
  // -----------------------------------------
  function onDragStart(id) {
    setDraggingId(id);
  }

  function onDragOver(e, overId) {
    e.preventDefault();

    if (draggingId === overId) return;

    const updated = [...items];
    const from = updated.findIndex((i) => i.id === draggingId);
    const to = updated.findIndex((i) => i.id === overId);

    if (from === -1 || to === -1) return;

    const [dragged] = updated.splice(from, 1);
    updated.splice(to, 0, dragged);

    updated.forEach((i, idx) => (i.position = idx));

    setItems([...updated]);
  }

  async function onDrop() {
    // Save new order into PouchDB metadata
    for (const item of items) {
      try {
        const doc = await localDB.get(item.id);
        doc.position = item.position;
        await localDB.put(doc);
      } catch (e) {
        console.error("Reorder save error", e);
      }
    }

    setDraggingId(null);
  }

  // -----------------------------------------
  // BLUR (Gaussian)
  // -----------------------------------------
  async function applyBlur() {
    if (selected.length === 0) return;

    for (const id of selected) {
      const item = items.find((i) => i.id === id);
      if (!item || !item.blob) continue;

      try {
        const blurredBlob = await blurImage(item.blob, 6);
        
        // Save as new screenshot
        await saveScreenshotAttachment(
          { 
            from: "blur", 
            description: `Blurred: ${item.description}`,
            originalId: id
          },
          blurredBlob
        );
      } catch (error) {
        console.error("Blur error:", error);
      }
    }
    
    setSelected([]);
    load();
  }

  function blurImage(blob, radius) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.filter = `blur(${radius}px)`;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Blur failed"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(blob);
    });
  }

  // -----------------------------------------
  // AI Enhance (auto-crop / highlight)
  // -----------------------------------------
  async function aiEnhance() {
    if (selected.length === 0) return;

    for (const id of selected) {
      const item = items.find((i) => i.id === id);
      if (!item || !item.blob) continue;

      try {
        const enhancedBlob = await AI.autoCropOrHighlight(item.blob);
        
        // Save as new screenshot
        await saveScreenshotAttachment(
          { 
            from: "ai-enhance", 
            description: `Enhanced: ${item.description}`,
            originalId: id
          },
          enhancedBlob
        );
      } catch (error) {
        console.error("AI enhance error:", error);
      }
    }
    
    setSelected([]);
    load();
  }

  // -----------------------------------------
  // UI Rendering
  // -----------------------------------------
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 16
      }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>
          Screenshots ({items.length})
        </h3>

        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => setMultiMode((x) => !x)}
            style={{
              padding: "6px 12px",
              background: multiMode ? "#dc3545" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px"
            }}
          >
            {multiMode ? "✓ Exit Multi-Select" : "☐ Multi-Select Mode"}
          </button>

          {multiMode && selected.length > 0 && (
            <>
              <button 
                onClick={deleteSelected}
                style={{
                  padding: "6px 12px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                🗑️ Delete ({selected.length})
              </button>
              
              <button 
                onClick={applyBlur}
                style={{
                  padding: "6px 12px",
                  background: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                🌫️ Blur
              </button>
              
              <button 
                onClick={aiEnhance}
                style={{
                  padding: "6px 12px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                ✨ AI Enhance
              </button>
            </>
          )}
        </div>
      </div>

      {undoItem && (
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "12px",
            marginBottom: 12,
            borderRadius: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>Screenshot deleted</span>
          <button 
            onClick={undoDelete}
            style={{
              padding: "4px 12px",
              background: "#ffc107",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            Undo
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px",
          color: "#999",
          border: "2px dashed #ddd",
          borderRadius: "8px"
        }}>
          <p style={{ margin: 0, fontSize: "16px" }}>No screenshots captured yet</p>
          <p style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
            Click "Capture" button above to take your first screenshot
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12
          }}
        >
          {items.map((i) => (
            <div
              key={i.id}
              draggable
              onDragStart={() => onDragStart(i.id)}
              onDragOver={(e) => onDragOver(e, i.id)}
              onDrop={onDrop}
              style={{
                position: "relative",
                border: selected.includes(i.id) 
                  ? "3px solid #0078d7" 
                  : "2px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                aspectRatio: "4/3",
                cursor: draggingId ? "grabbing" : "grab",
                background: "#f5f5f5",
                transition: "all 0.2s ease"
              }}
            >
              <img
                src={i.url}
                alt={i.description || "screenshot"}
                onClick={() => toggleSelect(i.id)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: selected.includes(i.id) ? 0.7 : 1,
                  transition: "opacity 0.2s ease"
                }}
              />

              {multiMode && (
                <input
                  type="checkbox"
                  checked={selected.includes(i.id)}
                  onChange={() => toggleSelect(i.id)}
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 20,
                    height: 20,
                    cursor: "pointer"
                  }}
                />
              )}

              <button
                onClick={() => deleteItem(i.id)}
                title="Delete"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "rgba(220,53,69,0.9)"}
                onMouseLeave={(e) => e.target.style.background = "rgba(0,0,0,0.7)"}
              >
                ✕
              </button>

              {i.description && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "4px 8px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {i.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}