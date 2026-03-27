import { format, parseISO } from "date-fns"

const chfFormatter = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const chfDetailedFormatter = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat("en-CH", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatCHF(amount: number, detailed = false): string {
  return detailed ? chfDetailedFormatter.format(amount) : chfFormatter.format(amount)
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value)
}

export function formatDate(date: string | Date, pattern = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, pattern)
}

export function formatMonth(date: string | Date): string {
  return formatDate(date, "MMM yyyy")
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`
  }
  return value.toString()
}
