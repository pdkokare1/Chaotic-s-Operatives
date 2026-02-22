// apps/web/app/components/DecipherText.tsx
"use client";

import { useState, useEffect } from "react";

interface DecipherTextProps {
  text: string;
  speed?: number;
  delay?: number;
}

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export default function DecipherText({ text, speed = 30, delay = 0 }: DecipherTextProps) {
  const [displayText, setDisplayText] = useState(text.replace(/./g, " ")); // Start blank or scrambled
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;
    
    const startAnimation = () => {
      setIsAnimating(true);
      interval = setInterval(() => {
        setDisplayText((current) =>
          text
            .split("")
            .map((letter, index) => {
              if (index < iteration || letter === " ") return text[index];
              return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          clearInterval(interval);
          setIsAnimating(false);
        }
        iteration += 1 / 3; // Controls how fast the real letters lock in
      }, speed);
    };

    const timeout = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, delay]);

  return <span style={{ fontFamily: "monospace", display: "inline-block" }}>{displayText}</span>;
}
