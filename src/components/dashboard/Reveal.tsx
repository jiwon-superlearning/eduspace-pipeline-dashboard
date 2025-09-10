'use client';

import { cn } from '@/lib/utils';
import { motion, Variants } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const variants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (custom: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut', delay: custom } }),
};

export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}


