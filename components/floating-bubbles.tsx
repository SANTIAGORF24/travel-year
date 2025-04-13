"use client"

import { motion } from "framer-motion"

interface FloatingBubblesBackgroundProps {
  title: string
}

export default function FloatingBubblesBackground({ title }: FloatingBubblesBackgroundProps) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-70 dark:opacity-80 z-0"
        style={{
          filter: "blur(80px)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.h1
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.2,
            ease: [0, 0.71, 0.2, 1.01],
          }}
          className="text-4xl md:text-6xl lg:text-8xl font-bold text-white drop-shadow-lg"
        >
          {title}
        </motion.h1>
      </div>
    </div>
  )
}
