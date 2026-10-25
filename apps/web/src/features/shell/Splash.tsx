import { motion } from "motion/react";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--ds-bg-surface)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="var(--ds-line-separator)" />
      <path
        d="M18 44c6-2 10-14 16-20s10-4 8 2-10 14-4 16 10-8 12-10"
        fill="none"
        stroke="var(--ds-accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Splash() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <Logo size={56} />
      </motion.div>
    </div>
  );
}
