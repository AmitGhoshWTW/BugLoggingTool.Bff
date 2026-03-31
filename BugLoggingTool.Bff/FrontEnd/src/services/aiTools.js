// src/services/aiTools.js

const AI = {
    async autoCropOrHighlight(blob) {
      // Simulated AI: Convert to canvas, draw yellow box around center region
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
  
          ctx.drawImage(img, 0, 0);
  
          ctx.strokeStyle = "yellow";
          ctx.lineWidth = 6;
          ctx.strokeRect(
            img.width * 0.2,
            img.height * 0.2,
            img.width * 0.6,
            img.height * 0.6
          );
  
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
        };
        img.src = URL.createObjectURL(blob);
      });
    }
  };
  
  export default AI;
  