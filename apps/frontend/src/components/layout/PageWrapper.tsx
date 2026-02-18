"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

export function PageWrapper({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-7xl space-y-6 p-6"
    >
      <motion.h1
        variants={itemVariants}
        className="text-2xl font-bold tracking-tight text-text"
      >
        {title}
      </motion.h1>
      {children}
    </motion.main>
  );
}
