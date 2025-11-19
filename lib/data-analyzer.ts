/**
 * Data Analysis Library for Soil Statistics
 *
 * This library provides statistical analysis functions for soil data.
 */

// Helper Functions
/**
 * Calculates the sum of an array of numbers.
 * @param arr The input array.
 * @returns The sum of the numbers in the array, or 0 if the array is empty or null.
 */
function sum(arr: number[]): number {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((acc, val) => acc + val, 0)
}

/**
 * Calculates the mean (average) of an array of numbers.
 * @param arr The input array.
 * @returns The mean of the numbers in the array, or null if the array is empty or null.
 */
function mean(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null
  return sum(arr) / arr.length
}

/**
 * Calculates the median of an array of numbers.
 * @param arr The input array.
 * @returns The median of the numbers in the array, or null if the array is empty or null.
 */
function median(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Calculates the variance of an array of numbers.
 * @param arr The input array.
 * @param sample Whether to calculate sample variance (true) or population variance (false).
 * @returns The variance of the numbers in the array, or null if the array is empty or null.
 */
function variance(arr: number[], sample = true): number | null {
  if (!arr || arr.length === 0) return null
  const avg = mean(arr)
  if (avg === null) return null
  const diffs = arr.map((val) => val - avg)
  const squareDiffs = diffs.map((diff) => diff * diff)
  return sum(squareDiffs) / (arr.length - (sample ? 1 : 0))
}

/**
 * Calculates the standard deviation of an array of numbers.
 * @param arr The input array.
 * @param sample Whether to calculate sample standard deviation (true) or population standard deviation (false).
 * @returns The standard deviation of the numbers in the array, or null if the array is empty or null.
 */
function stdDev(arr: number[], sample = true): number | null {
  const varVal = variance(arr, sample)
  return varVal === null ? null : Math.sqrt(varVal)
}

/**
 * Calculates a specific quantile of an array of numbers
 * @param arr The input array
 * @param p The quantile to calculate (between 0 and 1)
 * @returns the quantile value, or null if the array is empty.
 */
function quantile(arr: number[], p: number): number | null {
  if (!arr || arr.length === 0) return null
  if (p <= 0 || p >= 1) {
    throw new Error("Quantile p must be between 0 and 1")
  }
  const sorted = [...arr].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const floor = Math.floor(index)
  const frac = index - floor
  if (floor < 0) return sorted[0]
  if (floor >= sorted.length - 1) return sorted[sorted.length - 1]
  return sorted[floor] + frac * (sorted[floor + 1] - sorted[floor])
}

/**
 * Calculates the skewness of a dataset
 * @param arr The input data array
 * @returns The skewness of the data or null if the array is too short
 */
function skewness(arr: number[]): number | null {
  if (!arr || arr.length < 3) return null
  const avg = mean(arr)
  const s = stdDev(arr)
  if (avg === null || s === null) return null
  const cubedDiffs = arr.map((x) => Math.pow((x - avg) / s, 3))
  return sum(cubedDiffs) / arr.length
}

/**
 * Calculates the kurtosis of a dataset
 * @param arr The input data array
 * @returns The kurtosis of the data or null if the array is too short
 */
function kurtosis(arr: number[]): number | null {
  if (!arr || arr.length < 4) return null
  const avg = mean(arr)
  const s = stdDev(arr)
  if (avg === null || s === null) return null

  const fourthDiffs = arr.map((x) => Math.pow((x - avg) / s, 4))
  return sum(fourthDiffs) / arr.length
}

// Distribution functions
/**
 * Student's t-distribution cumulative distribution function (CDF)
 * @param t The t-value
 * @param df Degrees of freedom
 * @returns The CDF value
 */
function tCDF(t: number, df: number): number {
  if (df <= 0) {
    throw new Error("Degrees of freedom must be greater than 0.")
  }

  const x = df / (df + t * t)
  let result = 1 - 0.5 * incompleteBeta(x, df / 2, 0.5)
  if (t < 0) {
    result = 1 - result
  }
  return result
}

/**
 * Inverse of Student's t-distribution CDF
 * @param p Probability
 * @param df Degrees of freedom
 * @returns The t-value
 */
function tInv(p: number, df: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error("Probability p must be between 0 and 1.")
  }
  if (df <= 0) {
    throw new Error("Degrees of freedom must be greater than 0.")
  }

  let low = -10
  let high = 10
  let t = 0

  for (let i = 0; i < 100; i++) {
    // Increased iterations for better precision
    t = (low + high) / 2
    const cdfValue = tCDF(t, df)
    if (cdfValue < p) {
      low = t
    } else {
      high = t
    }
    if (Math.abs(cdfValue - p) < 1e-7) {
      // Increased precision
      break
    }
  }
  return t
}

/**
 * Chi-square CDF
 * @param x The chi-square value
 * @param df Degrees of freedom
 * @returns The CDF value
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0
  if (df <= 0) {
    throw new Error("Degrees of freedom must be greater than 0.")
  }
  return gammaCDF(x / 2, df / 2)
}

/**
 * F-distribution CDF
 * @param F The F-value
 * @param df1 Degrees of freedom 1
 * @param df2 Degrees of freedom 2
 * @returns The CDF value
 */
function fCDF(F: number, df1: number, df2: number): number {
  if (F <= 0) return 0
  if (df1 <= 0 || df2 <= 0) {
    throw new Error("Degrees of freedom must be greater than 0.")
  }
  const x = (df1 * F) / (df1 * F + df2)
  return incompleteBeta(x, df1 / 2, df2 / 2)
}

/**
 * Incomplete beta function
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0
  if (x === 1) return 1
  if (a <= 0 || b <= 0) {
    throw new Error("Parameters a and b must be greater than 0.")
  }

  // Use series expansion for small values
  if (x < 0.5) {
    const bt = Math.exp(
      Math.log(x) * a + Math.log(1 - x) * b - Math.log(a) + logGamma(a + b) - logGamma(a) - logGamma(b),
    )
    return (bt * betaContinuedFraction(x, a, b)) / a
  } else {
    const bt = Math.exp(
      Math.log(1 - x) * b + Math.log(x) * a - Math.log(b) + logGamma(a + b) - logGamma(a) - logGamma(b),
    )
    return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b
  }
}

/**
 * Continued fraction for the incomplete beta function
 */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const EPSILON = 1e-10
  const MAX_ITERATIONS = 1000 // Increased max iterations

  let am = 1
  let bm = 1
  let az = 1
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let bz = 1 - (qab * x) / qap

  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const tem = 2 * m
    const d = (m * (b - m) * x) / ((qam + tem) * (a + tem))
    const ap = az + d * am
    const bp = bz + d * bm
    const d2 = (-(a + m) * (qab + m) * x) / ((a + tem) * (qap + tem))
    const app = ap + d2 * az
    const bpp = bp + d2 * bz

    am = ap
    bm = bp
    az = app
    bz = bpp

    if (Math.abs(az) < EPSILON) {
      return 0
    }
    if (Math.abs(bz) < EPSILON) {
      return 1
    }
    if (Math.abs(az / bz - am / bm) < EPSILON) {
      return az / bz
    }
  }
  return az / bz
}

/**
 * Gamma CDF
 */
function gammaCDF(x: number, a: number): number {
  if (x <= 0) return 0
  if (a <= 0) {
    throw new Error("Parameter a must be greater than 0.")
  }
  return incompleteGamma(a, x) / gamma(a)
}

/**
 * Incomplete gamma function
 */
function incompleteGamma(a: number, x: number): number {
  if (x < 0) throw new Error("x must be non-negative")
  if (x === 0) return 0
  if (a <= 0) throw new Error("a must be positive")

  const EPSILON = 1e-10
  const MAX_ITERATIONS = 1000 // Increased max iterations

  let sum = 0
  let term = (Math.pow(x, a) * Math.exp(-x)) / a
  for (let n = 0; n < MAX_ITERATIONS; n++) {
    if (Math.abs(term) < EPSILON * Math.abs(sum)) break
    sum += term
    term *= x / (a + n + 1)
  }
  return sum
}

/**
 * Gamma function
 */
function gamma(z: number): number {
  if (z < 0) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  }
  if (z > 100) return Math.sqrt((2 * Math.PI) / z) * Math.pow(z, z) * Math.exp(-z) // Stirling approximation for large z

  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  z -= 1
  let x = 0.99999999999980993
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1)
  }
  const t = z + p.length - 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

/**
 * Log gamma function
 */
function logGamma(z: number): number {
  if (z <= 0) throw new Error("z must be positive")
  if (z > 100) return Math.log(Math.sqrt((2 * Math.PI) / z)) + z * Math.log(z) - z // Stirling approximation

  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]

  let x = 0.99999999999980993
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1)
  }
  const t = z + p.length - 0.5
  return Math.log(Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x)
}

/**
 * Inverse of standard normal CDF
 */
function normalInv(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error("p must be between 0 and 1")
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1,
    2.506628277459239,
  ]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968,
    2.938163982698783,
  ]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]

  let q, r
  if (p < 0.02425) {
    q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  } else if (p < 0.97575) {
    q = p - 0.5
    r = q * q
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    )
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }
}

// Main statistical functions

/**
 * Calculate descriptive statistics for a dataset
 */
export function calculateDescriptiveStats(data: number[]) {
  if (!data || data.length === 0) {
    return {
      n: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      range: null,
      variance: null,
      stdDev: null,
      q1: null,
      q3: null,
      iqr: null,
      skewness: null,
      kurtosis: null,
    }
  }

  try {
    const n = data.length
    const avg = mean(data)
    const med = median(data)
    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const rangeVal = maxVal - minVal
    const varVal = variance(data)
    const stdDevVal = stdDev(data)
    const q1Val = quantile(data, 0.25)
    const q3Val = quantile(data, 0.75)
    const iqrVal = q3Val === null || q1Val === null ? null : q3Val - q1Val
    const skewnessVal = skewness(data)
    const kurtosisVal = kurtosis(data)

    return {
      n,
      mean: avg,
      median: med,
      min: minVal,
      max: maxVal,
      range: rangeVal,
      variance: varVal,
      stdDev: stdDevVal,
      q1: q1Val,
      q3: q3Val,
      iqr: iqrVal,
      skewness: skewnessVal,
      kurtosis: kurtosisVal,
    }
  } catch (error) {
    console.error("Error in calculateDescriptiveStats:", error)
    return {
      n: data.length,
      mean: null,
      median: null,
      min: null,
      max: null,
      range: null,
      variance: null,
      stdDev: null,
      q1: null,
      q3: null,
      iqr: null,
      skewness: null,
      kurtosis: null,
    }
  }
}

/**
 * Perform linear regression analysis
 */
export function linearRegression(x: number[], y: number[]) {
  if (!x || !y || x.length === 0 || y.length === 0 || x.length !== y.length) {
    return {
      slope: null,
      intercept: null,
      rSquared: null,
      adjustedRSquared: null,
      standardError: null,
      tStatSlope: null,
      pValue: null,
      n: 0,
    }
  }

  try {
    const n = x.length
    const xMean = mean(x)
    const yMean = mean(y)
    if (xMean === null || yMean === null) {
      return {
        slope: null,
        intercept: null,
        rSquared: null,
        adjustedRSquared: null,
        standardError: null,
        tStatSlope: null,
        pValue: null,
        n: 0,
      }
    }

    let ssxy = 0
    let ssxx = 0
    let ssyy = 0

    for (let i = 0; i < n; i++) {
      ssxy += (x[i] - xMean) * (y[i] - yMean)
      ssxx += Math.pow(x[i] - xMean, 2)
      ssyy += Math.pow(y[i] - yMean, 2)
    }

    const slope = ssxy / ssxx
    const intercept = yMean - slope * xMean
    const rSquared = Math.pow(ssxy, 2) / (ssxx * ssyy)
    const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - 2)

    let sumSquaredResiduals = 0
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept
      sumSquaredResiduals += Math.pow(y[i] - predicted, 2)
    }
    const standardError = Math.sqrt(sumSquaredResiduals / (n - 2)) / Math.sqrt(ssxx)
    const tStatSlope = slope / standardError
    const pValue = 2 * (1 - tCDF(Math.abs(tStatSlope), n - 2))

    return {
      slope,
      intercept,
      rSquared,
      adjustedRSquared,
      standardError,
      tStatSlope,
      pValue,
      n,
    }
  } catch (error) {
    console.error("Error in linearRegression:", error)
    return {
      slope: null,
      intercept: null,
      rSquared: null,
      adjustedRSquared: null,
      standardError: null,
      tStatSlope: null,
      pValue: null,
      n: 0,
    }
  }
}

/**
 * Perform correlation analysis between two datasets
 */
export function correlationAnalysis(x: number[], y: number[]) {
  if (!x || !y || x.length === 0 || y.length === 0 || x.length !== y.length) {
    return {
      r: null,
      rSquared: null,
      tStat: null,
      pValue: null,
      n: 0,
    }
  }

  try {
    const n = x.length
    const xMean = mean(x)
    const yMean = mean(y)
    if (xMean === null || yMean === null) {
      return {
        r: null,
        rSquared: null,
        tStat: null,
        pValue: null,
        n: 0,
      }
    }

    let ssxy = 0
    let ssxx = 0
    let ssyy = 0

    for (let i = 0; i < n; i++) {
      ssxy += (x[i] - xMean) * (y[i] - yMean)
      ssxx += Math.pow(x[i] - xMean, 2)
      ssyy += Math.pow(y[i] - yMean, 2)
    }

    const r = ssxy / Math.sqrt(ssxx * ssyy)
    const rSquared = r * r
    const tStat = r * Math.sqrt((n - 2) / (1 - rSquared))
    const pValue = 2 * (1 - tCDF(Math.abs(tStat), n - 2))

    return {
      r,
      rSquared,
      tStat,
      pValue,
      n,
    }
  } catch (error) {
    console.error("Error in correlationAnalysis:", error)
    return {
      r: null,
      rSquared: null,
      tStat: null,
      pValue: null,
      n: 0,
    }
  }
}

/**
 * Detect outliers in a dataset using multiple methods
 */
export function detectOutliers(data: number[]) {
  if (!data || data.length === 0) {
    return { outliers: [] }
  }

  try {
    const stats = calculateDescriptiveStats(data)
    const outliers = []

    if (stats.mean === null || stats.stdDev === null || stats.q1 === null || stats.q3 === null || stats.iqr === null) {
      return { outliers: [] }
    }
    // Z-score method (|z| > 3)
    const zScoreOutliers = data
      .map((value, index) => {
        const zScore = (value - stats.mean!) / stats.stdDev!
        return { index, value, zScore, isOutlier: Math.abs(zScore) > 3 }
      })
      .filter((item) => item.isOutlier)

    // IQR method (< Q1 - 1.5*IQR or > Q3 + 1.5*IQR)
    const lowerBound = stats.q1! - 1.5 * stats.iqr!
    const upperBound = stats.q3! + 1.5 * stats.iqr!

    const iqrOutliers = data
      .map((value, index) => {
        return { index, value, isOutlier: value < lowerBound || value > upperBound }
      })
      .filter((item) => item.isOutlier)

    // Combine results
    const allOutlierIndices = new Set([...zScoreOutliers.map((o) => o.index), ...iqrOutliers.map((o) => o.index)])

    allOutlierIndices.forEach((index) => {
      const value = data[index]
      const isZScoreOutlier = zScoreOutliers.some((o) => o.index === index)
      const isIQROutlier = iqrOutliers.some((o) => o.index === index)

      outliers.push({
        index,
        value,
        methods: {
          zScore: isZScoreOutlier,
          iqr: isIQROutlier,
        },
      })
    })
    return { outliers }
  } catch (error) {
    console.error("Error in detectOutliers:", error)
    return { outliers: [] }
  }
}

/**
 * Test for normality using multiple methods
 */
export function testNormality(data: number[]) {
  if (!data || data.length < 3) {
    return {
      shapiroWilk: { W: null, pValue: null },
      jarqueBera: { JB: null, pValue: null },
      dAgostinoPearson: { DP: null, pValue: null },
      skewness: null,
      kurtosis: null,
      isNormal: null,
    }
  }

  try {
    const stats = calculateDescriptiveStats(data)
    const n = data.length

    if (stats.mean === null || stats.stdDev === null) {
      return {
        shapiroWilk: { W: null, pValue: null },
        jarqueBera: { JB: null, pValue: null },
        dAgostinoPearson: { DP: null, pValue: null },
        skewness: null,
        kurtosis: null,
        isNormal: null,
      }
    }
    // Shapiro-Wilk test (approximation)
    const sortedData = [...data].sort((a, b) => a - b)
    let W = 0
    const a: number[] = []

    for (let i = 0; i < n / 2; i++) {
      a[i] = 1 / Math.sqrt(n)
    }

    let numerator = 0
    for (let i = 0; i < Math.floor(n / 2); i++) {
      numerator += a[i] * (sortedData[n - 1 - i] - sortedData[i])
    }
    numerator = numerator * numerator

    let denominator = 0
    for (let i = 0; i < n; i++) {
      denominator += Math.pow(sortedData[i] - stats.mean!, 2)
    }
    W = numerator / denominator
    const swPValue = 1 - Math.exp(-Math.pow((1 - W) * (n - 0.5), 0.7))

    // Jarque-Bera test
    const JB = (n / 6) * (Math.pow(stats.skewness!, 2) + Math.pow(stats.kurtosis! - 3, 2) / 4)
    const jbPValue = 1 - chiSquareCDF(JB, 2)

    // D'Agostino-Pearson test
    const DP = Math.pow(stats.skewness!, 2) + Math.pow((stats.kurtosis! - 3) / 2, 2)
    const dpPValue = 1 - chiSquareCDF(DP, 2)

    const isNormal = swPValue > 0.05 && jbPValue > 0.05 && dpPValue > 0.05

    return {
      shapiroWilk: { W, pValue: swPValue },
      jarqueBera: { JB, pValue: jbPValue },
      dAgostinoPearson: { DP, pValue: dpPValue },
      skewness: stats.skewness,
      kurtosis: stats.kurtosis,
      isNormal,
    }
  } catch (error) {
    console.error("Error in testNormality:", error)
    return {
      shapiroWilk: { W: null, pValue: null },
      jarqueBera: { JB: null, pValue: null },
      dAgostinoPearson: { DP: null, pValue: null },
      skewness: null,
      kurtosis: null,
      isNormal: null,
    }
  }
}

/**
 * Perform t-test (one-sample or two-sample)
 */
export function tTest(
  sample1: number[],
  sample2?: number[],
  options: { type?: "one-sample" | "two-sample"; mu?: number; alpha?: number } = {},
) {
  const { type = sample2 ? "two-sample" : "one-sample", mu = 0, alpha = 0.05 } = options

  if (!sample1 || sample1.length === 0) {
    return {
      type,
      t: null,
      df: null,
      pValue: null,
      mean: null,
      mean1: null,
      mean2: null,
      meanDifference: null,
      se: null,
      confidenceInterval: [null, null],
      mu,
      alpha,
    }
  }

  try {
    if (type === "one-sample") {
      const n = sample1.length
      const sampleMean = mean(sample1)
      const sampleStdDev = stdDev(sample1)
      if (sampleMean === null || sampleStdDev === null) {
        return {
          type,
          t: null,
          df: null,
          pValue: null,
          mean: null,
          mean1: null,
          mean2: null,
          meanDifference: null,
          se: null,
          confidenceInterval: [null, null],
          mu,
          alpha,
        }
      }
      const se = sampleStdDev / Math.sqrt(n)
      const t = (sampleMean - mu) / se
      const df = n - 1
      const pValue = 2 * (1 - tCDF(Math.abs(t), df))
      const criticalT = tInv(1 - alpha / 2, df)
      const margin = criticalT * se
      const confidenceInterval = [sampleMean - margin, sampleMean + margin]

      return {
        type,
        t,
        df,
        pValue,
        mean: sampleMean,
        se,
        confidenceInterval,
        mu,
        alpha,
      }
    } else {
      if (!sample2 || sample2.length === 0) {
        return {
          type,
          t: null,
          df: null,
          pValue: null,
          mean1: null,
          mean2: null,
          meanDifference: null,
          se: null,
          confidenceInterval: [null, null],
          alpha,
        }
      }
      const n1 = sample1.length
      const n2 = sample2.length
      const mean1 = mean(sample1)
      const mean2 = mean(sample2)
      if (mean1 === null || mean2 === null) {
        return {
          type,
          t: null,
          df: null,
          pValue: null,
          mean1: null,
          mean2: null,
          meanDifference: null,
          se: null,
          confidenceInterval: [null, null],
          alpha,
        }
      }
      const meanDifference = mean1 - mean2
      const var1 = variance(sample1)
      const var2 = variance(sample2)
      if (var1 === null || var2 === null) {
        return {
          type,
          t: null,
          df: null,
          pValue: null,
          mean1: null,
          mean2: null,
          meanDifference: null,
          se: null,
          confidenceInterval: [null, null],
          alpha,
        }
      }
      const se = Math.sqrt(var1 / n1 + var2 / n2)
      const t = meanDifference / se
      const df = n1 + n2 - 2
      const pValue = 2 * (1 - tCDF(Math.abs(t), df))
      const criticalT = tInv(1 - alpha / 2, df)
      const margin = criticalT * se
      const confidenceInterval = [meanDifference - margin, meanDifference + margin]

      return {
        type,
        t,
        df,
        pValue,
        mean1,
        mean2,
        meanDifference,
        se,
        confidenceInterval,
        alpha,
      }
    }
  } catch (error) {
    console.error("Error in tTest:", error)
    return {
      type,
      t: null,
      df: null,
      pValue: null,
      mean: null,
      mean1: null,
      mean2: null,
      meanDifference: null,
      se: null,
      confidenceInterval: [null, null],
      mu,
      alpha,
    }
  }
}

/**
 * Perform ANOVA (Analysis of Variance)
 */
export function anovaAnalysis(groups: number[][]) {
  if (!groups || groups.length < 2 || groups.some((group) => !group || group.length === 0)) {
    return {
      fStat: null,
      pValue: null,
      groups: 0,
      totalObservations: 0,
      dfBetween: null,
      dfWithin: null,
      ssBetween: null,
      ssWithin: null,
      msBetween: null,
      msWithin: null,
    }
  }

  try {
    const k = groups.length
    const n = groups.reduce((acc, group) => acc + group.length, 0)
    const groupMeans = groups.map((group) => mean(group))
    const grandMean = mean(groups.flat())

    if (grandMean === null) {
      return {
        fStat: null,
        pValue: null,
        groups: 0,
        totalObservations: 0,
        dfBetween: null,
        dfWithin: null,
        ssBetween: null,
        ssWithin: null,
        msBetween: null,
        msWithin: null,
      }
    }
    let ssBetween = 0
    for (let i = 0; i < k; i++) {
      ssBetween += groups[i].length * Math.pow(groupMeans[i]! - grandMean, 2)
    }

    let ssWithin = 0
    for (let i = 0; i < k; i++) {
      const groupMean = mean(groups[i])
      if (groupMean !== null) {
        for (let j = 0; j < groups[i].length; j++) {
          ssWithin += Math.pow(groups[i][j] - groupMean, 2)
        }
      }
    }

    const dfBetween = k - 1
    const dfWithin = n - k
    const msBetween = ssBetween / dfBetween
    const msWithin = ssWithin / dfWithin
    const fStat = msBetween / msWithin
    const pValue = 1 - fCDF(fStat, dfBetween, dfWithin)

    return {
      fStat,
      pValue,
      groups: k,
      totalObservations: n,
      dfBetween,
      dfWithin,
      ssBetween,
      ssWithin,
      msBetween,
      msWithin,
    }
  } catch (error) {
    console.error("Error in anovaAnalysis:", error)
    return {
      fStat: null,
      pValue: null,
      groups: 0,
      totalObservations: 0,
      dfBetween: null,
      dfWithin: null,
      ssBetween: null,
      ssWithin: null,
      msBetween: null,
      msWithin: null,
    }
  }
}

/**
 * Perform time series analysis
 */
export function timeSeriesAnalysis(timePoints: number[], values: number[]) {
  if (!timePoints || !values || timePoints.length === 0 || values.length === 0 || timePoints.length !== values.length) {
    return {
      n: 0,
      autocorrelation: null,
      trend: null,
    }
  }

  try {
    const n = values.length
    const avg = mean(values)
    if (avg === null) {
      return {
        n: 0,
        autocorrelation: null,
        trend: null,
      }
    }
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n - 1; i++) {
      numerator += (values[i] - avg) * (values[i + 1] - avg)
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(values[i] - avg, 2)
    }

    const autocorrelation = numerator / denominator
    const trend = linearRegression(timePoints, values)

    return {
      n,
      autocorrelation,
      trend,
    }
  } catch (error) {
    console.error("Error in timeSeriesAnalysis:", error)
    return {
      n: 0,
      autocorrelation: null,
      trend: null,
    }
  }
}
