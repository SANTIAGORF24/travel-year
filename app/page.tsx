"use client"
import FloatingBubblesBackground from "@/components/floating-bubbles"
import TravelPlanner from "@/components/travel-planner"

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <FloatingBubblesBackground title="Planificador de Viaje" />
      <div className="absolute inset-0 flex items-center justify-center z-20 pt-32 pb-10 px-4 overflow-auto">
        <TravelPlanner />
      </div>
    </main>
  )
}
