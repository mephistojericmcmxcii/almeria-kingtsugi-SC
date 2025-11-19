"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Trash2, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ParameterManagementFormProps {
  onClose: () => void
}

interface Parameter {
  id?: string
  tmCode: string // Added TM Code as manual field
  name: string
  method: string
  unit: string
  price: string
  adequateValue: string // Added Adequate Value field
  category: string
  description?: string
}

export default function ParameterManagementForm({ onClose }: ParameterManagementFormProps) {
  const [activeTab, setActiveTab] = useState("macro")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Parameters by category
  const [macroParameters, setMacroParameters] = useState<Parameter[]>([])
  const [microParameters, setMicroParameters] = useState<Parameter[]>([])
  const [specialParameters, setSpecialParameters] = useState<Parameter[]>([])

  // Number of parameters to add
  const [macroCount, setMacroCount] = useState(1)
  const [microCount, setMicroCount] = useState(1)
  const [specialCount, setSpecialCount] = useState(1)

  // Fetch existing parameters on component mount
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        setLoading(true)
        const parametersRef = collection(db!, "parameters")
        const querySnapshot = await getDocs(parametersRef)

        const macro: Parameter[] = []
        const micro: Parameter[] = []
        const special: Parameter[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Parameter
          const parameter = {
            id: doc.id,
            tmCode: data.tmCode || "", // Load TM Code from Firebase
            name: data.name,
            method: data.method || data.code || "",
            unit: data.unit,
            price: data.price,
            adequateValue: data.adequateValue || "", // Load Adequate Value from Firebase
            category: data.category,
            description: data.description || "",
          }

          if (data.category === "macro") {
            macro.push(parameter)
          } else if (data.category === "micro") {
            micro.push(parameter)
          } else if (data.category === "special") {
            special.push(parameter)
          }
        })

        setMacroParameters(macro)
        setMicroParameters(micro)
        setSpecialParameters(special)
      } catch (err) {
        console.error("Error fetching parameters:", err)
        setError("Failed to load parameters. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchParameters()
  }, [])

  // Add new parameter fields
  const addParameterFields = (category: string) => {
    if (category === "macro") {
      const newParams = [...macroParameters]
      for (let i = 0; i < macroCount; i++) {
        newParams.push({
          tmCode: "",
          name: "",
          method: "",
          unit: "",
          price: "",
          adequateValue: "",
          category: "macro",
          description: "",
        })
      }
      setMacroParameters(newParams)
    } else if (category === "micro") {
      const newParams = [...microParameters]
      for (let i = 0; i < microCount; i++) {
        newParams.push({
          tmCode: "",
          name: "",
          method: "",
          unit: "",
          price: "",
          adequateValue: "",
          category: "micro",
          description: "",
        })
      }
      setMicroParameters(newParams)
    } else if (category === "special") {
      const newParams = [...specialParameters]
      for (let i = 0; i < specialCount; i++) {
        newParams.push({
          tmCode: "",
          name: "",
          method: "",
          unit: "",
          price: "",
          adequateValue: "",
          category: "special",
          description: "",
        })
      }
      setSpecialParameters(newParams)
    }
  }

  // Remove parameter field
  const removeParameter = (index: number, category: string) => {
    if (category === "macro") {
      const newParams = [...macroParameters]
      newParams.splice(index, 1)
      setMacroParameters(newParams)
    } else if (category === "micro") {
      const newParams = [...microParameters]
      newParams.splice(index, 1)
      setMicroParameters(newParams)
    } else if (category === "special") {
      const newParams = [...specialParameters]
      newParams.splice(index, 1)
      setSpecialParameters(newParams)
    }
  }

  // Handle parameter field change
  const handleParameterChange = (index: number, field: keyof Parameter, value: string, category: string) => {
    if (category === "macro") {
      const newParams = [...macroParameters]
      newParams[index] = { ...newParams[index], [field]: value }
      setMacroParameters(newParams)
    } else if (category === "micro") {
      const newParams = [...microParameters]
      newParams[index] = { ...newParams[index], [field]: value }
      setMicroParameters(newParams)
    } else if (category === "special") {
      const newParams = [...specialParameters]
      newParams[index] = { ...newParams[index], [field]: value }
      setSpecialParameters(newParams)
    }
  }

  // Save parameters to Firestore
  const saveParameters = async (category: string) => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      let parametersToSave: Parameter[] = []

      if (category === "macro") {
        parametersToSave = macroParameters
      } else if (category === "micro") {
        parametersToSave = microParameters
      } else if (category === "special") {
        parametersToSave = specialParameters
      }

      // Validate parameters - Updated validation to include tmCode and adequateValue
      const invalidParams = parametersToSave.filter(
        (p) => !p.tmCode || !p.name || !p.method || !p.unit || !p.price || !p.adequateValue,
      )

      if (invalidParams.length > 0) {
        setError(`Please fill in all required fields for ${category} parameters.`)
        setSaving(false)
        return
      }

      // Save each parameter
      for (const param of parametersToSave) {
        if (param.id) {
          // Update existing parameter
          await updateDoc(doc(db!, "parameters", param.id), {
            tmCode: param.tmCode, // Save TM Code to Firebase
            name: param.name,
            method: param.method,
            unit: param.unit,
            price: param.price,
            adequateValue: param.adequateValue, // Save Adequate Value to Firebase
            category: param.category,
            description: param.description || "",
            updatedAt: new Date(),
          })
        } else {
          // Add new parameter
          await addDoc(collection(db!, "parameters"), {
            tmCode: param.tmCode, // Save TM Code to Firebase
            name: param.name,
            method: param.method,
            unit: param.unit,
            price: param.price,
            adequateValue: param.adequateValue, // Save Adequate Value to Firebase
            category: param.category,
            description: param.description || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      setSuccess(`${category.charAt(0).toUpperCase() + category.slice(1)} parameters saved successfully!`)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error(`Error saving ${category} parameters:`, err)
      setError(`Failed to save ${category} parameters. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  // Delete parameter from Firestore
  const deleteParameter = async (index: number, category: string) => {
    try {
      let paramToDelete: Parameter | undefined

      if (category === "macro") {
        paramToDelete = macroParameters[index]
      } else if (category === "micro") {
        paramToDelete = microParameters[index]
      } else if (category === "special") {
        paramToDelete = specialParameters[index]
      }

      if (paramToDelete?.id) {
        await deleteDoc(doc(db!, "parameters", paramToDelete.id))
        removeParameter(index, category)
        setSuccess(`Parameter deleted successfully!`)

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccess("")
        }, 3000)
      } else {
        // If it doesn't have an ID, it's not in the database yet
        removeParameter(index, category)
      }
    } catch (err) {
      console.error("Error deleting parameter:", err)
      setError("Failed to delete parameter. Please try again.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Analysis Parameter Management</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md">{error}</div>}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-md">{success}</div>
          )}

          <Tabs defaultValue="macro" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-emerald-700 mb-4">
              <TabsTrigger value="macro" className="data-[state=active]:bg-emerald-600">
                Macro Parameters
              </TabsTrigger>
              <TabsTrigger value="micro" className="data-[state=active]:bg-emerald-600">
                Micro Parameters
              </TabsTrigger>
              <TabsTrigger value="special" className="data-[state=active]:bg-emerald-600">
                Special Parameters
              </TabsTrigger>
            </TabsList>

            {/* Macro Parameters Tab */}
            <TabsContent value="macro" className="space-y-4">
              <div className="flex items-center gap-6 bg-emerald-700/20 p-4 rounded-md">
                <div className="flex-1">
                  <Label htmlFor="macroCount" className="text-white">
                    Number of parameters to add
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="macroCount"
                      type="number"
                      min="1"
                      max="10"
                      value={macroCount}
                      onChange={(e) => setMacroCount(Number.parseInt(e.target.value) || 1)}
                      className="bg-emerald-700 border-emerald-600 text-white w-24 placeholder:text-emerald-300/70"
                    />
                    <Button
                      onClick={() => addParameterFields("macro")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Fields
                    </Button>
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => saveParameters("macro")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Parameters
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Parameter Fields */}
              <div className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : macroParameters.length === 0 ? (
                  <div className="bg-emerald-700/20 p-4 rounded-md text-center text-gray-300">
                    No macro parameters added yet. Use the form above to add parameters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {macroParameters.map((param, index) => (
                      <div
                        key={index}
                        className="relative grid grid-cols-1 md:grid-cols-7 gap-4 p-4 bg-emerald-700/20 rounded-md"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 z-10"
                          onClick={() => deleteParameter(index, "macro")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div>
                          <Label htmlFor={`macro-tmcode-${index}`} className="text-white">
                            TM Code
                          </Label>
                          <Input
                            id={`macro-tmcode-${index}`}
                            value={param.tmCode}
                            onChange={(e) => handleParameterChange(index, "tmCode", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., TM-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-name-${index}`} className="text-white">
                            Parameter Name
                          </Label>
                          <Input
                            id={`macro-name-${index}`}
                            value={param.name}
                            onChange={(e) => handleParameterChange(index, "name", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., Moisture Content"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-method-${index}`} className="text-white">
                            Method
                          </Label>
                          <Input
                            id={`macro-method-${index}`}
                            value={param.method}
                            onChange={(e) => handleParameterChange(index, "method", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., AOAC 934.01"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-unit-${index}`} className="text-white">
                            Unit
                          </Label>
                          <Input
                            id={`macro-unit-${index}`}
                            value={param.unit}
                            onChange={(e) => handleParameterChange(index, "unit", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., %"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-price-${index}`} className="text-white">
                            Price
                          </Label>
                          <Input
                            id={`macro-price-${index}`}
                            type="number"
                            value={param.price}
                            onChange={(e) => handleParameterChange(index, "price", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., 100"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-adequate-${index}`} className="text-white">
                            Adequate Value
                          </Label>
                          <Input
                            id={`macro-adequate-${index}`}
                            value={param.adequateValue}
                            onChange={(e) => handleParameterChange(index, "adequateValue", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., >10"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`macro-description-${index}`} className="text-white">
                            Description
                          </Label>
                          <Textarea
                            id={`macro-description-${index}`}
                            value={param.description || ""}
                            onChange={(e) => handleParameterChange(index, "description", e.target.value, "macro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70 resize-y min-h-[60px]"
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Micro Parameters Tab */}
            <TabsContent value="micro" className="space-y-4">
              <div className="flex items-center gap-6 bg-emerald-700/20 p-4 rounded-md">
                <div className="flex-1">
                  <Label htmlFor="microCount" className="text-white">
                    Number of parameters to add
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="microCount"
                      type="number"
                      min="1"
                      max="10"
                      value={microCount}
                      onChange={(e) => setMicroCount(Number.parseInt(e.target.value) || 1)}
                      className="bg-emerald-700 border-emerald-600 text-white w-24 placeholder:text-emerald-300/70"
                    />
                    <Button
                      onClick={() => addParameterFields("micro")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Fields
                    </Button>
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => saveParameters("micro")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Parameters
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Parameter Fields */}
              <div className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : microParameters.length === 0 ? (
                  <div className="bg-emerald-700/20 p-4 rounded-md text-center text-gray-300">
                    No micro parameters added yet. Use the form above to add parameters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {microParameters.map((param, index) => (
                      <div
                        key={index}
                        className="relative grid grid-cols-1 md:grid-cols-7 gap-4 p-4 bg-emerald-700/20 rounded-md"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 z-10"
                          onClick={() => deleteParameter(index, "micro")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div>
                          <Label htmlFor={`micro-tmcode-${index}`} className="text-white">
                            TM Code
                          </Label>
                          <Input
                            id={`micro-tmcode-${index}`}
                            value={param.tmCode}
                            onChange={(e) => handleParameterChange(index, "tmCode", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., TM-002"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-name-${index}`} className="text-white">
                            Parameter Name
                          </Label>
                          <Input
                            id={`micro-name-${index}`}
                            value={param.name}
                            onChange={(e) => handleParameterChange(index, "name", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., Zinc"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-method-${index}`} className="text-white">
                            Method
                          </Label>
                          <Input
                            id={`micro-method-${index}`}
                            value={param.method}
                            onChange={(e) => handleParameterChange(index, "method", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., AAS-Zn"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-unit-${index}`} className="text-white">
                            Unit
                          </Label>
                          <Input
                            id={`micro-unit-${index}`}
                            value={param.unit}
                            onChange={(e) => handleParameterChange(index, "unit", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., mg/kg"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-price-${index}`} className="text-white">
                            Price
                          </Label>
                          <Input
                            id={`micro-price-${index}`}
                            type="number"
                            value={param.price}
                            onChange={(e) => handleParameterChange(index, "price", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., 150"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-adequate-${index}`} className="text-white">
                            Adequate Value
                          </Label>
                          <Input
                            id={`micro-adequate-${index}`}
                            value={param.adequateValue}
                            onChange={(e) => handleParameterChange(index, "adequateValue", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., 5-20"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`micro-description-${index}`} className="text-white">
                            Description
                          </Label>
                          <Textarea
                            id={`micro-description-${index}`}
                            value={param.description || ""}
                            onChange={(e) => handleParameterChange(index, "description", e.target.value, "micro")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70 resize-y min-h-[60px]"
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Special Parameters Tab */}
            <TabsContent value="special" className="space-y-4">
              <div className="flex items-center gap-6 bg-emerald-700/20 p-4 rounded-md">
                <div className="flex-1">
                  <Label htmlFor="specialCount" className="text-white">
                    Number of parameters to add
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="specialCount"
                      type="number"
                      min="1"
                      max="10"
                      value={specialCount}
                      onChange={(e) => setSpecialCount(Number.parseInt(e.target.value) || 1)}
                      className="bg-emerald-700 border-emerald-600 text-white w-24 placeholder:text-emerald-300/70"
                    />
                    <Button
                      onClick={() => addParameterFields("special")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Fields
                    </Button>
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => saveParameters("special")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Parameters
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Parameter Fields */}
              <div className="space-y-4 mt-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : specialParameters.length === 0 ? (
                  <div className="bg-emerald-700/20 p-4 rounded-md text-center text-gray-300">
                    No special parameters added yet. Use the form above to add parameters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {specialParameters.map((param, index) => (
                      <div
                        key={index}
                        className="relative grid grid-cols-1 md:grid-cols-7 gap-4 p-4 bg-emerald-700/20 rounded-md"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 z-10"
                          onClick={() => deleteParameter(index, "special")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div>
                          <Label htmlFor={`special-tmcode-${index}`} className="text-white">
                            TM Code
                          </Label>
                          <Input
                            id={`special-tmcode-${index}`}
                            value={param.tmCode}
                            onChange={(e) => handleParameterChange(index, "tmCode", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., TM-003"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-name-${index}`} className="text-white">
                            Parameter Name
                          </Label>
                          <Input
                            id={`special-name-${index}`}
                            value={param.name}
                            onChange={(e) => handleParameterChange(index, "name", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., Heavy Metals"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-method-${index}`} className="text-white">
                            Method
                          </Label>
                          <Input
                            id={`special-method-${index}`}
                            value={param.method}
                            onChange={(e) => handleParameterChange(index, "method", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., ICP-MS"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-unit-${index}`} className="text-white">
                            Unit
                          </Label>
                          <Input
                            id={`special-unit-${index}`}
                            value={param.unit}
                            onChange={(e) => handleParameterChange(index, "unit", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., mg/kg"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-price-${index}`} className="text-white">
                            Price
                          </Label>
                          <Input
                            id={`special-price-${index}`}
                            type="number"
                            value={param.price}
                            onChange={(e) => handleParameterChange(index, "price", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., 200"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-adequate-${index}`} className="text-white">
                            Adequate Value
                          </Label>
                          <Input
                            id={`special-adequate-${index}`}
                            value={param.adequateValue}
                            onChange={(e) => handleParameterChange(index, "adequateValue", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                            placeholder="e.g., <0.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`special-description-${index}`} className="text-white">
                            Description
                          </Label>
                          <Textarea
                            id={`special-description-${index}`}
                            value={param.description || ""}
                            onChange={(e) => handleParameterChange(index, "description", e.target.value, "special")}
                            className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70 resize-y min-h-[60px]"
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end p-4 border-t border-emerald-700">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
