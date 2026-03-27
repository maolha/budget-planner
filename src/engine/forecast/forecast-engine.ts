import type { ForecastInput, ForecastResult, ForecastMonth } from "./types"
import type { LifeEvent } from "@/types"

/**
 * Month-by-month financial forecast engine.
 *
 * Simulates income, expenses, and net worth forward in time,
 * applying life events at their scheduled dates.
 */
export function runForecast(input: ForecastInput): ForecastResult {
  const { startDate, endDate, lifeEvents, investmentReturnRate } = input

  let currentIncome = input.monthlyIncome
  let currentExpenses = input.monthlyExpenses
  let netWorth = input.initialNetWorth
  let totalIncome = 0
  let totalExpenses = 0

  const months: ForecastMonth[] = []
  const monthlyReturnRate = Math.pow(1 + investmentReturnRate, 1 / 12) - 1

  let current = startDate
  while (current <= endDate) {
    // Check for life events this month
    const monthEvents = lifeEvents.filter((e) => e.date.substring(0, 7) === current)
    const eventLabels: string[] = []

    for (const event of monthEvents) {
      const result = applyLifeEvent(event, currentIncome, currentExpenses)
      currentIncome = result.income
      currentExpenses = result.expenses
      netWorth += result.oneTimeImpact
      eventLabels.push(event.label)
    }

    // Calculate monthly savings
    const savings = currentIncome - currentExpenses

    // Apply investment returns to net worth (only on positive net worth)
    if (netWorth > 0) {
      netWorth += netWorth * monthlyReturnRate
    }

    // Add monthly savings to net worth
    netWorth += savings

    totalIncome += currentIncome
    totalExpenses += currentExpenses

    months.push({
      date: current,
      income: Math.round(currentIncome),
      expenses: Math.round(currentExpenses),
      savings: Math.round(savings),
      netWorth: Math.round(netWorth),
      events: eventLabels,
    })

    // Advance to next month
    current = nextMonth(current)
  }

  return {
    months,
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    finalNetWorth: Math.round(netWorth),
  }
}

/**
 * Apply a life event's impact on income and expenses.
 */
function applyLifeEvent(
  event: LifeEvent,
  currentIncome: number,
  currentExpenses: number
): { income: number; expenses: number; oneTimeImpact: number } {
  const p = event.params as Record<string, number | string | undefined>
  let income = currentIncome
  let expenses = currentExpenses
  let oneTimeImpact = 0

  switch (event.type) {
    case "new_child":
      // Add childcare + child-related expenses
      expenses += (p.monthlyChildcareCost as number) ?? 2400
      expenses += (p.monthlyOtherChildCost as number) ?? 500
      break

    case "salary_change":
      // Replace income (assume monthly)
      income += ((p.newAnnualSalary as number) ?? 0) / 12 - ((p.oldAnnualSalary as number) ?? 0) / 12
      break

    case "job_change":
      income += ((p.newAnnualSalary as number) ?? 0) / 12 - ((p.oldAnnualSalary as number) ?? 0) / 12
      break

    case "apartment_change":
      expenses += ((p.newRent as number) ?? 0) - ((p.oldRent as number) ?? 0)
      oneTimeImpact -= (p.movingCost as number) ?? 5000
      break

    case "retirement":
      // Significant income reduction, expense reduction
      income *= 0.6 // rough AHV/pension replacement ratio
      expenses *= 0.85
      break

    case "mortgage_change":
      expenses += ((p.newMonthlyPayment as number) ?? 0) - ((p.oldMonthlyPayment as number) ?? 0)
      break

    case "large_purchase":
      oneTimeImpact -= (p.amount as number) ?? 0
      break

    case "education_start":
      expenses += (p.monthlyTuition as number) ?? 500
      break

    case "custom":
      income += (p.monthlyIncomeChange as number) ?? 0
      expenses += (p.monthlyExpenseChange as number) ?? 0
      oneTimeImpact += (p.oneTimeImpact as number) ?? 0
      break
  }

  return { income: Math.max(0, income), expenses: Math.max(0, expenses), oneTimeImpact }
}

function nextMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-").map(Number)
  if (month === 12) return `${year + 1}-01`
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

/**
 * Compare two forecast results and return the differences.
 */
export function compareForcasts(
  base: ForecastResult,
  scenario: ForecastResult
): {
  netWorthDiff: number
  totalIncomeDiff: number
  totalExpensesDiff: number
  months: Array<{
    date: string
    incomeDiff: number
    expensesDiff: number
    netWorthDiff: number
  }>
} {
  const months = base.months.map((baseMonth, i) => {
    const scenarioMonth = scenario.months[i]
    return {
      date: baseMonth.date,
      incomeDiff: (scenarioMonth?.income ?? 0) - baseMonth.income,
      expensesDiff: (scenarioMonth?.expenses ?? 0) - baseMonth.expenses,
      netWorthDiff: (scenarioMonth?.netWorth ?? 0) - baseMonth.netWorth,
    }
  })

  return {
    netWorthDiff: scenario.finalNetWorth - base.finalNetWorth,
    totalIncomeDiff: scenario.totalIncome - base.totalIncome,
    totalExpensesDiff: scenario.totalExpenses - base.totalExpenses,
    months,
  }
}
