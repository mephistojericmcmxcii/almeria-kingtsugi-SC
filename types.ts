// types.ts

export interface Sample {
  id: string
  lsrfNo: string
  dateReceived: Date
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  customerBirthday?: string
  customerOrganization?: string
  isRSBSA?: string // This will now consistently be "Yes" or "No" string
  rsbsaIdNo?: string
  clientType?: string
  sampleType: string
  serviceType?:
    | "testing"
    | "non-testing"
    | "stk"
    | "soil_inoculant"
    | "mushroom_spawn"
    | "geotagging"
    | "fertilizer_recommendation"
  status: string
  samples: Array<{
    sampleCode: string
    description: string
    laboratorySampleCode?: string
    sampleID?: string
    samplingSite?: string
  }>
  soilType?: string
  soilLocation?: string
  soilDepth?: string
  plantType?: string
  plantPart?: string
  plantAge?: string
  fertilizerType?: string
  fertilizerBrand?: string
  fertilizerComposition?: string
  otherDescription?: string
  requestedTests?: string[]
  notes?: string
  requestedParameter?: string
  parameters?: string[]
  amountDue?: number
  amountPaid?: number
  paymentStatus?: string
  discountApplied?: number
  dueDate?: Date
  analysisCompleted?: Date
  // Non-testing specific fields
  productType?: string
  productionBatchNo?: string
  mushroomVariety?: string
  harvestDate?: Date
  quantity?: number
  quantityUnit?: string
  purposeOfSample?: string
  storageConditions?: string
  // STK specific
  soilSampleLocation?: string
  cropType?: string // Added missing cropType for STK
  // Soil Inoculant specific
  inoculantType?: string
  targetCrop?: string
  applicationMethod?: string
  inoculantQuantity?: number
  inoculantUnit?: string
  // Mushroom Spawn specific
  spawnType?: string
  substrateType?: string
  spawnQuantity?: number
  spawnUnit?: string
  // Geotagging specific
  farmLocation?: string
  farmSize?: number
  gpsCoordinates?: string
  mappingPurpose?: string
  // Fertilizer Recommendation specific
  targetCropFertilizer?: string
  growthStage?: string
  soilTestResults?: string
  farmingSystem?: string
  specificConcerns?: string
  // Analysis results
  results?: any
  // Additional fields from SampleEntryForm (testing)
  numberOfSamples?: number
  analysisStarted?: Date
  tags?: string[] // Field for tags
  releasedAt?: Date // Add releasedAt to the Sample interface
}
