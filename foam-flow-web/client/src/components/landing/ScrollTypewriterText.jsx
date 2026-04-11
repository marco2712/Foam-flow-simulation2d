import React, { useEffect, useMemo, useRef, useState } from 'react';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function ScrollTypewriterText({
  text,
  importantTerms = [],
  speed = 12,
  threshold = 0.35,
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (!isVisible) return;

    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [isVisible, speed, text]);

  const highlightedChunks = useMemo(() => {
    if (!importantTerms.length) return [displayed];
    const regex = new RegExp(`(${importantTerms.map(escapeRegExp).join('|')})`, 'gi');
    return displayed.split(regex);
  }, [displayed, importantTerms]);

  return (
    <p
      ref={containerRef}
      className="font-sans text-[16px] md:text-lg leading-8 text-[var(--color-on-surface-variant)]"
    >
      {highlightedChunks.map((chunk, index) => {
        const isImportant = importantTerms.some(
          (term) => term.toLowerCase() === chunk.toLowerCase()
        );

        if (!isImportant) {
          return <React.Fragment key={`${chunk}-${index}`}>{chunk}</React.Fragment>;
        }

        return (
          <strong key={`${chunk}-${index}`} className="font-extrabold text-[var(--color-on-surface)]">
            {chunk}
          </strong>
        );
      })}
      {isVisible && displayed.length < text.length ? (
        <span className="inline-block w-[2px] h-5 bg-[var(--color-primary)] ml-1 align-middle animate-pulse" />
      ) : null}
    </p>
  );
}
