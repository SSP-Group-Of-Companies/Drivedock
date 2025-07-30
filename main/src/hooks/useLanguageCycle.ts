import { useEffect, useState } from "react";
import useMounted from "./useMounted";

const phrases = [
  { start: "Start Application", resume: "Resume Application" },
  { start: "ਆਵेदਨ ਸ਼ੁਰੂ ਕਰੋ", resume: "ਅਨੁਵਾਦ ਜਾਰੀ ਰੱਖੋ" },
  { start: "Démarrer la candidature", resume: "Reprendre la candidature" },
];

export function useLanguageCycle(interval = 2500) {
  const [index, setIndex] = useState(0);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, mounted]);

  // Return the first phrase during SSR to prevent hydration mismatch
  return mounted ? phrases[index] : phrases[0];
}
