import { useEffect, useState } from "react";

const phrases = [
  { start: "Start Application", resume: "Resume Application" },
  { start: "ਆਵेदन ਸ਼ੁਰੂ ਕਰੋ", resume: "ਅਨੁਵਾਦ ਜਾਰੀ ਰੱਖੋ" },
  { start: "Démarrer la candidature", resume: "Reprendre la candidature" },
];

export function useLanguageCycle(interval = 2500) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return phrases[index];
}
