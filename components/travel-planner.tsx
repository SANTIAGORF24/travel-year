"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { PlusCircle, Trash2, RefreshCcw, Share2 } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"

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
  addedBy?: string
  addedAt: number
}

// Define trip data interface
interface TripData {
  tripName: string
  budget: number
  expenses: Expense[]
  lastUpdated: number
  tripId?: string
}

// JSON Bin API endpoints
const JSON_BIN_API = "https://api.jsonbin.io/v3/b"
const JSON_BIN_API_KEY = "$2a$10$o7Bks7j8unujXZQWRQwPVuujBrraUTM12KuVdlfIHAjFbslGzCowe" // Public API key for demo

export default function TravelPlanner() {
  // Default empty trip
  const defaultTrip: TripData = {
    tripName: "Mi Viaje",
    budget: 0,
    expenses: [],
    lastUpdated: Date.now(),
  }

  // State
  const [tripData, setTripData] = useState<TripData>(defaultTrip)
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id" | "completed" | "addedAt">>({
    description: "",
    amount: 0,
    type: "Hotel",
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [userName, setUserName] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Load data from localStorage and check URL for shared trip
  useEffect(() => {
    // Check if there's a trip ID in the URL
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get("trip")

    if (tripId) {
      // If there's a trip ID, fetch that trip
      fetchSharedTrip(tripId)
    } else {
      // Otherwise load from localStorage
      const savedData = localStorage.getItem("tripData")
      if (savedData) {
        try {
          setTripData(JSON.parse(savedData))
        } catch (e) {
          console.error("Error loading saved data:", e)
        }
      }
    }

    // Get or generate user name
    const storedName = localStorage.getItem("userName")
    if (storedName) {
      setUserName(storedName)
    } else {
      const newName = `Usuario${Math.floor(Math.random() * 10000)}`
      localStorage.setItem("userName", newName)
      setUserName(newName)
    }

    setIsFirstLoad(false)
  }, [])

  // Save data to localStorage whenever tripData changes
  useEffect(() => {
    if (isFirstLoad) return

    // Save to localStorage
    localStorage.setItem("tripData", JSON.stringify(tripData))

    // If we have a tripId, sync with the shared storage
    if (tripData.tripId) {
      syncWithSharedStorage()
    }
  }, [tripData, isFirstLoad])

  // Set up polling for updates if we have a tripId
  useEffect(() => {
    if (!tripData.tripId) return

    // Check for updates every 30 seconds
    const intervalId = setInterval(() => {
      checkForUpdates()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [tripData.tripId])

  // Calculate totals
  const totalPlanned = tripData.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalSpent = tripData.expenses
    .filter((expense) => expense.completed)
    .reduce((sum, expense) => sum + expense.amount, 0)
  const remainingBudget = tripData.budget - totalSpent
  const budgetProgress = tripData.budget > 0 ? Math.min(100, (totalSpent / tripData.budget) * 100) : 0

  // Fetch shared trip data
  const fetchSharedTrip = async (tripId: string) => {
    setIsSyncing(true)
    try {
      const response = await fetch(`${JSON_BIN_API}/${tripId}`, {
        headers: {
          "X-Master-Key": JSON_BIN_API_KEY,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch trip data")

      const data = await response.json()
      const fetchedTripData = data.record as TripData

      // Update the URL with the trip ID
      const url = new URL(window.location.href)
      url.searchParams.set("trip", tripId)
      window.history.replaceState({}, "", url.toString())

      // Set the share URL
      setShareUrl(url.toString())

      // Update local state
      setTripData({
        ...fetchedTripData,
        tripId,
      })

      toast({
        title: "Viaje cargado",
        description: `Se ha cargado el viaje "${fetchedTripData.tripName}"`,
      })
    } catch (error) {
      console.error("Error fetching shared trip:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el viaje compartido",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Create a new shared trip
  const createSharedTrip = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch(JSON_BIN_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSON_BIN_API_KEY,
        },
        body: JSON.stringify({
          ...tripData,
          lastUpdated: Date.now(),
        }),
      })

      if (!response.ok) throw new Error("Failed to create shared trip")

      const data = await response.json()
      const tripId = data.metadata.id

      // Update the URL with the trip ID
      const url = new URL(window.location.href)
      url.searchParams.set("trip", tripId)
      window.history.replaceState({}, "", url.toString())

      // Set the share URL
      setShareUrl(url.toString())

      // Update local state with the trip ID
      setTripData((prev) => ({
        ...prev,
        tripId,
        lastUpdated: Date.now(),
      }))

      toast({
        title: "Viaje compartido",
        description: "Ahora puedes compartir la URL con otras personas",
      })
    } catch (error) {
      console.error("Error creating shared trip:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el viaje compartido",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Sync local changes with shared storage
  const syncWithSharedStorage = async () => {
    if (!tripData.tripId || isSyncing) return

    setIsSyncing(true)
    try {
      const response = await fetch(`${JSON_BIN_API}/${tripData.tripId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSON_BIN_API_KEY,
        },
        body: JSON.stringify({
          ...tripData,
          lastUpdated: Date.now(),
        }),
      })

      if (!response.ok) throw new Error("Failed to update shared trip")
    } catch (error) {
      console.error("Error syncing with shared storage:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Check for updates from shared storage
  const checkForUpdates = async () => {
    if (!tripData.tripId || isSyncing) return

    try {
      const response = await fetch(`${JSON_BIN_API}/${tripData.tripId}`, {
        headers: {
          "X-Master-Key": JSON_BIN_API_KEY,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch trip updates")

      const data = await response.json()
      const fetchedTripData = data.record as TripData

      // Only update if the fetched data is newer
      if (fetchedTripData.lastUpdated > tripData.lastUpdated) {
        setTripData(fetchedTripData)
        toast({
          title: "Actualización",
          description: "Se han sincronizado cambios realizados por otros usuarios",
        })
      }
    } catch (error) {
      console.error("Error checking for updates:", error)
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    if (tripData.tripId) {
      checkForUpdates()
    }
  }

  // Share trip
  const handleShare = async () => {
    if (!tripData.tripId) {
      await createSharedTrip()
    } else {
      // Copy the URL to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "URL copiada",
          description: "Enlace copiado al portapapeles",
        })
      } catch (error) {
        console.error("Error copying to clipboard:", error)
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        })
      }
    }
  }

  // Add new expense
  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) return

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: newExpense.amount,
      type: newExpense.type,
      completed: false,
      addedBy: userName,
      addedAt: Date.now(),
    }

    setTripData((prev) => ({
      ...prev,
      expenses: [...prev.expenses, expense],
      lastUpdated: Date.now(),
    }))

    setNewExpense({
      description: "",
      amount: 0,
      type: "Hotel",
    })
  }

  // Toggle expense completion
  const toggleExpenseCompleted = (id: string) => {
    setTripData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((expense) =>
        expense.id === id ? { ...expense, completed: !expense.completed } : expense,
      ),
      lastUpdated: Date.now(),
    }))
  }

  // Delete expense
  const deleteExpense = (id: string) => {
    setTripData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== id),
      lastUpdated: Date.now(),
    }))
  }

  // Update trip name
  const updateTripName = (name: string) => {
    setTripData((prev) => ({
      ...prev,
      tripName: name,
      lastUpdated: Date.now(),
    }))
  }

  // Update budget
  const updateBudget = (budget: number) => {
    setTripData((prev) => ({
      ...prev,
      budget,
      lastUpdated: Date.now(),
    }))
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl"
    >
      <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl border-blue-200/50 dark:border-blue-700/50">
        <CardHeader className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="tripName">Nombre del Viaje</Label>
            <Input
              id="tripName"
              value={tripData.tripName}
              onChange={(e) => updateTripName(e.target.value)}
              className="text-xl font-bold"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="budget">Presupuesto (COP)</Label>
            <Input
              id="budget"
              type="number"
              value={tripData.budget}
              onChange={(e) => updateBudget(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Presupuesto Gastado: {formatCurrency(totalSpent)}</span>
              <span>Restante: {formatCurrency(remainingBudget)}</span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">{userName && `Conectado como: ${userName}`}</div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isSyncing || !tripData.tripId}
                className="flex items-center"
              >
                <RefreshCcw className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                {isMobile ? "" : "Actualizar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isSyncing}
                className="flex items-center"
              >
                <Share2 className="h-4 w-4 mr-1" />
                {isMobile ? "" : "Compartir"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isMobile ? (
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="add">Agregar</TabsTrigger>
                <TabsTrigger value="list">Gastos ({tripData.expenses.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="mt-0">
                {/* Add new expense form */}
                <div className="bg-blue-50/50 dark:bg-blue-950/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Agregar Nuevo Gasto
                  </h3>
                  <div className="space-y-3">
                    <div>
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
                    <div>
                      <Label htmlFor="expenseDescription">Descripción</Label>
                      <Input
                        id="expenseDescription"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Ej: Hotel en Cartagena"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseAmount">Monto (COP)</Label>
                      <Input
                        id="expenseAmount"
                        type="number"
                        value={newExpense.amount || ""}
                        onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <Button
                      onClick={handleAddExpense}
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      Agregar Gasto
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                {/* Expenses list */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
                        className={`flex flex-col p-3 rounded-lg border ${
                          expense.completed
                            ? "bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                            : "bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
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
                        </div>
                        {expense.addedBy && (
                          <div className="text-xs text-gray-500 mt-2">
                            Agregado por {expense.addedBy} • {formatDate(expense.addedAt)}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <>
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
                      className={`flex flex-col p-3 rounded-lg border ${
                        expense.completed
                          ? "bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                          : "bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
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
                      </div>
                      {expense.addedBy && (
                        <div className="text-xs text-gray-500 mt-2">
                          Agregado por {expense.addedBy} • {formatDate(expense.addedAt)}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex flex-col mb-4 sm:mb-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Planificado</div>
            <div className="text-xl font-bold">{formatCurrency(totalPlanned)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Total Gastado</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalSpent)}</div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
