import React from "react";
import "./BubblesBackground.css";

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const BubblesBackground = ({ count = 70 }) => {
  // Genera propiedades aleatorias para cada burbuja
  const bubbles = Array.from({ length: count }).map((_, i) => {
    const size = random(5, 100);
    const left = random(1, 100);
    const duration = random(3, 15);
    const delay = random(0, 10);
    const bgpos = i % 2 === 0 ? "top right" : "center";
    const moveY = random(0, 100);
    const moveX = random(-100, 200);
    return {
      key: i,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}vw`,
        bottom: `-100px`,
        opacity: 0.8,
        animation: `move${i} ${duration}s infinite`,
        animationDelay: `${delay}s`,
        background: `radial-gradient(ellipse at ${bgpos}, var(--color-surface) 0%, var(--color-surface-container-low) 46%, var(--color-surface-container-highest) 100%)`,
      },
      moveY,
      moveX,
    };
  });

  React.useEffect(() => {
    let keyframes = "";
    bubbles.forEach((b, i) => {
      keyframes += `@keyframes move${i} {\n`;
      keyframes += `  0% { bottom: -100px; opacity: 0.8; }\n`;
      keyframes += `  100% { bottom: ${b.moveY}vh; transform: translate(${b.moveX}px, 0); opacity: 0; }\n`;
      keyframes += `}\n`;
    });
    let styleSheet = document.getElementById("bubbles-keyframes");
    if (!styleSheet) {
      styleSheet = document.createElement("style");
      styleSheet.id = "bubbles-keyframes";
      document.head.appendChild(styleSheet);
    }
    styleSheet.innerHTML = keyframes;
    return () => {
      if (styleSheet) styleSheet.innerHTML = "";
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="canvas pointer-events-none" style={{position: 'absolute', inset: 0, zIndex: 10}}>
      {bubbles.map((b) => (
        <span className="bubble" key={b.key} style={b.style} />
      ))}
    </div>
  );
};

export default BubblesBackground;
