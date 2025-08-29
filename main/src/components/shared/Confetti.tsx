"use client";

import { motion } from "framer-motion";

interface ConfettiProps {
  /** Number of confetti pieces to render (default: 50) */
  count?: number;
  /** Array of colors for confetti pieces (default: colorful palette) */
  colors?: string[];
  /** Duration of the animation in seconds (default: 3-5 seconds) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0-0.5 seconds) */
  delay?: number;
  /** Z-index for the confetti layer (default: 50) */
  zIndex?: number;
}

const Confetti = ({
  count = 50,
  colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
  duration = 3,
  delay = 0.5,
  zIndex = 50,
}: ConfettiProps) => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none" 
      style={{ zIndex }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: "-10px",
          }}
          initial={{ y: -10, opacity: 1 }}
          animate={{
            y: window.innerHeight + 10,
            opacity: 0,
            rotate: 360,
          }}
          transition={{
            duration: duration + Math.random() * 2,
            delay: Math.random() * delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
