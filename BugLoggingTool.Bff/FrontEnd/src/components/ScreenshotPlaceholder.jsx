// src/components/ScreenshotPlaceholder.jsx
import React, { useState, useEffect, useRef } from "react";
import eventBus from "../utils/eventBus";
import { screenshotStore } from "../stores/screenshotStore";

export default function ScreenshotPlaceholder() {
  const [screenshots, setScreenshots] = useState([]);
  const [selected, setSelected] = useState([]);
  const [blurred, setBlurred] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotating, setAnnotating] = useState(false);
  const canvasRef = useRef(null);
  const drawingRef = useRef({ drawing: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    // Load initial screenshots
    setScreenshots(screenshotStore.getAll());

    // Listen for changes
    const handleChange = (updatedScreenshots) => {
      setScreenshots(updatedScreenshots);
      
      // Clear selections if screenshots were removed
      setSelected(prev => prev.filter(id => 
        updatedScreenshots.some(s => s.id === id)
      ));
    };

    eventBus.on('temp-screenshots-changed', handleChange);

    return () => {
      eventBus.off('temp-screenshots-changed', handleChange);
    };
  }, []);

  // Select/deselect individual screenshot
  function toggleSelect(id) {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  }

  // Select all / deselect all
  function toggleSelectAll() {
    if (selected.length === screenshots.length) {
      setSelected([]);
    } else {
      setSelected(screenshots.map(s => s.id));
    }
  }

  // Delete single screenshot
  function handleDelete(id) {
    if (confirm('Remove this screenshot from current session?')) {
      screenshotStore.remove(id);
    }
  }

  // Delete selected screenshots
  function deleteSelected() {
    if (selected.length === 0) return;
    
    if (confirm(`Remove ${selected.length} screenshot${selected.length !== 1 ? 's' : ''} from current session?`)) {
      selected.forEach(id => screenshotStore.remove(id));
      setSelected([]);
    }
  }

  // Toggle blur for single screenshot
  function toggleBlur(id) {
    setBlurred(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  // Toggle blur for selected screenshots
  function toggleBlurSelected() {
    if (selected.length === 0) return;
    
    const allBlurred = selected.every(id => blurred.has(id));
    
    setBlurred(prev => {
      const newSet = new Set(prev);
      selected.forEach(id => {
        if (allBlurred) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      });
      return newSet;
    });
  }

  // Open modal for full-screen view
  function openModal(index) {
    setCurrentIndex(index);
    setModalOpen(true);
    setAnnotating(false);
  }

  function closeModal() {
    setModalOpen(false);
    setAnnotating(false);
  }

  function prevImage() {
    setCurrentIndex(prev => (prev - 1 + screenshots.length) % screenshots.length);
  }

  function nextImage() {
    setCurrentIndex(prev => (prev + 1) % screenshots.length);
  }

  // Annotation functions
  function startDrawing(e) {
    if (!annotating) return;
    drawingRef.current.drawing = true;
    const rect = canvasRef.current.getBoundingClientRect();
    drawingRef.current.lastX = e.clientX - rect.left;
    drawingRef.current.lastY = e.clientY - rect.top;
  }

  function stopDrawing() {
    drawingRef.current.drawing = false;
  }

  function draw(e) {
    if (!annotating || !drawingRef.current.drawing) return;
    
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    drawingRef.current.lastX = x;
    drawingRef.current.lastY = y;
  }

  function enableAnnotation() {
    setAnnotating(true);
    
    setTimeout(() => {
      const currentScreenshot = screenshots[currentIndex];
      const canvas = canvasRef.current;
      if (!canvas || !currentScreenshot) return;
      
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.style.cursor = "crosshair";
      };
      
      img.crossOrigin = "anonymous";
      img.src = currentScreenshot.url;
    }, 50);
  }

  function saveAnnotation() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Failed to create annotation');
        return;
      }
      
      try {
        // Add annotated screenshot to store
        const currentScreenshot = screenshots[currentIndex];
        screenshotStore.add(blob, {
          from: "annotation",
          description: "Annotated screenshot",
          timestamp: Date.now(),
          originalId: currentScreenshot.id
        });
        
        setAnnotating(false);
        closeModal();
        alert("Annotated image added to session!");
      } catch (error) {
        console.error('Error saving annotation:', error);
        alert('Failed to save annotation: ' + error.message);
      }
    }, "image/png");
  }

  function clearAnnotation() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const currentScreenshot = screenshots[currentIndex];
    const img = new Image();
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    
    img.crossOrigin = "anonymous";
    img.src = currentScreenshot.url;
  }

  if (screenshots.length === 0) {
    return (
      <div className="dashboard-box">
        <h3>Current Session Screenshots (0)</h3>
        <div style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          color: '#999'
        }}>
          <p style={{ margin: 0, fontSize: '16px' }}>📷 No screenshots in current session</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
            Screenshots captured will appear here until you save the report
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Current Session Screenshots ({screenshots.length})</h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
              ⚠️ These will be attached when you submit the report below
            </p>
          </div>
          
          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={toggleBlurSelected}
                style={{
                  padding: '6px 12px',
                  background: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                👁️ {selected.every(id => blurred.has(id)) ? 'Unblur' : 'Blur'} ({selected.length})
              </button>
              
              <button 
                onClick={deleteSelected}
                style={{
                  padding: '6px 12px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                🗑️ Delete ({selected.length})
              </button>
            </div>
          )}
        </div>

        {/* Select All Checkbox */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={selected.length === screenshots.length && screenshots.length > 0}
              onChange={toggleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              Select All ({selected.length}/{screenshots.length})
            </span>
          </label>
        </div>

        {/* Screenshot Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {screenshots.map((screenshot, index) => (
            <div 
              key={screenshot.id}
              style={{
                position: 'relative',
                border: selected.includes(screenshot.id) ? '3px solid #0078d7' : '2px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#f9f9f9',
                transition: 'all 0.2s'
              }}
            >
              {/* Checkbox */}
              <input 
                type="checkbox"
                checked={selected.includes(screenshot.id)}
                onChange={() => toggleSelect(screenshot.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              />

              {/* Image */}
              <img 
                src={screenshot.url} 
                alt={`Screenshot ${index + 1}`}
                onClick={() => openModal(index)}
                style={{
                  width: '100%',
                  height: '140px',
                  objectFit: 'cover',
                  display: 'block',
                  cursor: 'pointer',
                  filter: blurred.has(screenshot.id) ? 'blur(10px)' : 'none',
                  transition: 'filter 0.3s'
                }}
              />
              
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,120,215,0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                NEW #{index + 1}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px',
                background: 'white',
                borderTop: '1px solid #ddd'
              }}>
                <button
                  onClick={() => toggleBlur(screenshot.id)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: blurred.has(screenshot.id) ? '#6f42c1' : '#e9ecef',
                    color: blurred.has(screenshot.id) ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  {blurred.has(screenshot.id) ? '👁️ Unblur' : '🙈 Blur'}
                </button>

                <button
                  onClick={() => handleDelete(screenshot.id)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Timestamp */}
              <div style={{
                padding: '6px 8px',
                fontSize: '11px',
                color: '#666',
                borderTop: '1px solid #eee',
                textAlign: 'center'
              }}>
                {new Date(screenshot.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-Screen Modal */}
      {modalOpen && screenshots[currentIndex] && (
        <div 
          className="modal-backdrop" 
          onClick={() => { if (!annotating) closeModal(); }} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.9)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: "#fff", 
              padding: 20, 
              borderRadius: 12, 
              width: "95%", 
              maxWidth: 1200,
              maxHeight: '95vh',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: 16, 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '2px solid #eee'
            }}>
              <div>
                <strong style={{ fontSize: '18px' }}>
                  Screenshot {currentIndex + 1} of {screenshots.length}
                </strong>
                {blurred.has(screenshots[currentIndex].id) && (
                  <span style={{
                    marginLeft: '12px',
                    background: '#6f42c1',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    🙈 Blurred
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                {!annotating ? (
                  <>
                    <button 
                      onClick={() => toggleBlur(screenshots[currentIndex].id)}
                      style={{
                        padding: '8px 16px',
                        background: blurred.has(screenshots[currentIndex].id) ? '#6f42c1' : '#e9ecef',
                        color: blurred.has(screenshots[currentIndex].id) ? 'white' : '#495057',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {blurred.has(screenshots[currentIndex].id) ? '👁️ Unblur' : '🙈 Blur'}
                    </button>
                    <button 
                      onClick={enableAnnotation}
                      style={{
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      ✏️ Annotate
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={saveAnnotation}
                      style={{
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      💾 Save Annotation
                    </button>
                    <button 
                      onClick={clearAnnotation}
                      style={{
                        padding: '8px 16px',
                        background: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      🔄 Clear
                    </button>
                    <button 
                      onClick={() => setAnnotating(false)}
                      style={{
                        padding: '8px 16px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      ✗ Exit
                    </button>
                  </>
                )}
                <button 
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Image Viewer */}
            <div style={{ 
              display: "flex", 
              gap: 16, 
              alignItems: "center", 
              justifyContent: 'center',
              minHeight: '400px'
            }}>
              <button 
                onClick={prevImage} 
                disabled={screenshots.length <= 1}
                style={{
                  padding: '12px 20px',
                  background: screenshots.length <= 1 ? '#ccc' : '#0078d7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: screenshots.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}
              >
                ◀
              </button>
              
              <div style={{ 
                flex: 1, 
                textAlign: "center", 
                position: "relative", 
                maxWidth: '900px'
              }}>
                {!annotating ? (
                  <img 
                    src={screenshots[currentIndex].url} 
                    alt={`Screenshot ${currentIndex + 1}`}
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "70vh", 
                      borderRadius: 8,
                      filter: blurred.has(screenshots[currentIndex].id) ? 'blur(20px)' : 'none',
                      transition: 'filter 0.3s'
                    }}
                  />
                ) : (
                  <canvas 
                    ref={canvasRef} 
                    onMouseDown={startDrawing} 
                    onMouseUp={stopDrawing} 
                    onMouseMove={draw} 
                    onMouseOut={stopDrawing} 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "70vh", 
                      borderRadius: 8, 
                      border: "3px solid #6f42c1", 
                      cursor: 'crosshair',
                      background: 'white'
                    }}
                  />
                )}
              </div>
              
              <button 
                onClick={nextImage} 
                disabled={screenshots.length <= 1}
                style={{
                  padding: '12px 20px',
                  background: screenshots.length <= 1 ? '#ccc' : '#0078d7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: screenshots.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}
              >
                ▶
              </button>
            </div>

            {/* Info Footer */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#666'
            }}>
              <div><strong>Source:</strong> {screenshots[currentIndex].metadata.from}</div>
              <div><strong>Captured:</strong> {new Date(screenshots[currentIndex].createdAt).toLocaleString()}</div>
              {annotating && (
                <div style={{ marginTop: '8px', color: '#6f42c1', fontWeight: '500' }}>
                  💡 Draw on the image to add annotations
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}