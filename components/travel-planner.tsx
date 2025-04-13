"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, PlusCircle, Trash2, Save } from "lucide-react"
import { motion } from "framer-motion"

// Define expense types
const EXPENSE_TYPES = [
  "Hotel",
  "Desayuno",
  "Almuerzo",
  "Cena",
  "Entradas",
  "Gasolina",
  "Peajes",
  "Transporte",
  "Compras",
  "Otros",
]

// Define expense interface
interface Expense {
  id: string
  description: string
  amount: number
  type: string
  completed: boolean
}

// Define trip data interface
interface TripData {
  tripName: string
  budget: number
  expenses: Expense[]
}

export default function TravelPlanner() {
  // Default empty trip
  const defaultTrip: TripData = {
    tripName: "Mi Viaje",
    budget: 0,
    expenses: [],
  }

  // State
  const [tripData, setTripData] = useState<TripData>(defaultTrip)
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id" | "completed">>({
    description: "",
    amount: 0,
    type: "Hotel",
  })
  const [isSaved, setIsSaved] = useState(true)

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("tripData")
    if (savedData) {
      try {
        setTripData(JSON.parse(savedData))
      } catch (e) {
        console.error("Error loading saved data:", e)
      }
    }
  }, [])

  // Save data to localStorage whenever tripData changes
  useEffect(() => {
    if (isSaved) return

    const saveTimeout = setTimeout(() => {
      localStorage.setItem("tripData", JSON.stringify(tripData))
      setIsSaved(true)
    }, 1000)

    return () => clearTimeout(saveTimeout)
  }, [tripData, isSaved])

  // Calculate totals
  const totalPlanned = tripData.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalSpent = tripData.expenses
    .filter((expense) => expense.completed)
    .reduce((sum, expense) => sum + expense.amount, 0)
  const remainingBudget = tripData.budget - totalSpent
  const budgetProgress = tripData.budget > 0 ? Math.min(100, (totalSpent / tripData.budget) * 100) : 0

  // Add new expense
  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) return

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: newExpense.amount,
      type: newExpense.type,
      completed: false,
    }

    setTripData((prev) => ({
      ...prev,
      expenses: [...prev.expenses, expense],
    }))

    setNewExpense({
      description: "",
      amount: 0,
      type: "Hotel",
    })

    setIsSaved(false)
  }

  // Toggle expense completion
  const toggleExpenseCompleted = (id: string) => {
    setTripData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((expense) =>
        expense.id === id ? { ...expense, completed: !expense.completed } : expense,
      ),
    }))
    setIsSaved(false)
  }

  // Delete expense
  const deleteExpense = (id: string) => {
    setTripData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== id),
    }))
    setIsSaved(false)
  }

  // Update trip name
  const updateTripName = (name: string) => {
    setTripData((prev) => ({ ...prev, tripName: name }))
    setIsSaved(false)
  }

  // Update budget
  const updateBudget = (budget: number) => {
    setTripData((prev) => ({ ...prev, budget }))
    setIsSaved(false)
  }

  // Export data as JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(tripData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `${tripData.tripName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  // Import data from JSON file
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    if (!event.target.files?.[0]) return

    fileReader.readAsText(event.target.files[0], "UTF-8")
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsedData = JSON.parse(content) as TripData
        setTripData(parsedData)
        setIsSaved(false)
      } catch (e) {
        console.error("Error importing data:", e)
        alert("Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.")
      }
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl"
    >
      <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl border-blue-200/50 dark:border-blue-700/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="tripName">Nombre del Viaje</Label>
              <Input
                id="tripName"
                value={tripData.tripName}
                onChange={(e) => updateTripName(e.target.value)}
                className="text-xl font-bold mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="budget">Presupuesto (COP)</Label>
              <Input
                id="budget"
                type="number"
                value={tripData.budget}
                onChange={(e) => updateBudget(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Presupuesto Gastado: {formatCurrency(totalSpent)}</span>
              <span>Restante: {formatCurrency(remainingBudget)}</span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add new expense form */}
          <div className="bg-blue-50/50 dark:bg-blue-950/50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" />
              Agregar Nuevo Gasto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label htmlFor="expenseType">Tipo</Label>
                <Select
                  value={newExpense.type}
                  onValueChange={(value) => setNewExpense((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label htmlFor="expenseDescription">Descripción</Label>
                <Input
                  id="expenseDescription"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Hotel en Cartagena"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="expenseAmount">Monto (COP)</Label>
                <div className="flex">
                  <Input
                    id="expenseAmount"
                    type="number"
                    value={newExpense.amount || ""}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddExpense}
                    className="ml-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {tripData.expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No hay gastos agregados aún. Comienza agregando tu primer gasto.
              </div>
            ) : (
              tripData.expenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    expense.completed
                      ? "bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                      : "bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <Checkbox
                      id={`check-${expense.id}`}
                      checked={expense.completed}
                      onCheckedChange={() => toggleExpenseCompleted(expense.id)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{expense.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-semibold mr-3">{formatCurrency(expense.amount)}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteExpense(expense.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex flex-col mb-4 sm:mb-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Planificado</div>
            <div className="text-xl font-bold">{formatCurrency(totalPlanned)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Total Gastado</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalSpent)}</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={exportData} className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="flex items-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <input id="file-upload" type="file" accept=".json" onChange={importData} className="hidden" />
            </div>

            <Button
              variant={isSaved ? "outline" : "default"}
              disabled={isSaved}
              onClick={() => {
                localStorage.setItem("tripData", JSON.stringify(tripData))
                setIsSaved(true)
              }}
              className="flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaved ? "Guardado" : "Guardar"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
