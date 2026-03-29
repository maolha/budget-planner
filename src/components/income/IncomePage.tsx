import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Wallet, Briefcase, TrendingUp, Pencil } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useIncome } from "@/hooks/useIncome"
import { useFamily } from "@/hooks/useFamily"
import { calculateSocialDeductions, calculateTotalSocialDeductions } from "@/engine/social/swiss-social-deductions"
import { calculateTaxSimple } from "@/engine/tax/tax-engine"
import { formatCHF, formatDate, formatPercent } from "@/lib/formatters"
import type { IncomeType, BonusFrequency } from "@/types"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getDefaultPayoutMonths(freq: BonusFrequency): number[] {
  switch (freq) {
    case "monthly": return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    case "quarterly": return [3, 6, 9, 12]
    case "semi-annual": return [6, 12]
    case "annual": return [12]
    default: return []
  }
}

export function IncomePage() {
  const { incomes, loading, error, addIncome, updateIncome, deleteIncome, totalAnnualGross, totalAnnualBase, totalAnnualBonus, totalMonthlyGross } =
    useIncome()
  const { family } = useFamily()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [memberId, setMemberId] = useState(family?.adults[0]?.id ?? "")
  const [employer, setEmployer] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [incomeType, setIncomeType] = useState<IncomeType>("salary")
  const [annualGross, setAnnualGross] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [bonusFrequency, setBonusFrequency] = useState<BonusFrequency>("annual")
  const [bonusPayoutMonths, setBonusPayoutMonths] = useState<number[]>([12])
  const [bvgEmployeeSplit, setBvgEmployeeSplit] = useState<number | null>(null)
  const [bvgMonthly, setBvgMonthly] = useState<number | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const resetForm = () => {
    setEditingId(null)
    setMemberId(family?.adults[0]?.id ?? "")
    setEmployer("")
    setJobTitle("")
    setIncomeType("salary")
    setAnnualGross(0)
    setBonus(0)
    setBonusFrequency("annual")
    setBonusPayoutMonths([12])
    setBvgEmployeeSplit(null)
    setBvgMonthly(null)
    setStartDate("")
    setEndDate("")
  }

  const openEdit = (incId: string) => {
    const inc = incomes.find((i) => i.id === incId)
    if (!inc) return
    setEditingId(incId)
    setMemberId(inc.memberId)
    setEmployer(inc.employer)
    setJobTitle(inc.jobTitle ?? "")
    setIncomeType(inc.type)
    setAnnualGross(Number(inc.annualGross))
    setBonus(Number(inc.bonus ?? 0))
    setBonusFrequency(inc.bonusFrequency ?? "annual")
    setBonusPayoutMonths(inc.bonusPayoutMonths ?? getDefaultPayoutMonths(inc.bonusFrequency ?? "annual"))
    setBvgEmployeeSplit(inc.bvgEmployeeSplit ?? null)
    setBvgMonthly(inc.bvgMonthly ?? null)
    setStartDate(inc.startDate ?? "")
    setEndDate(inc.endDate ?? "")
    setDialogOpen(true)
  }

  const handleFrequencyChange = (freq: BonusFrequency) => {
    setBonusFrequency(freq)
    setBonusPayoutMonths(getDefaultPayoutMonths(freq))
  }

  const togglePayoutMonth = (month: number) => {
    setBonusPayoutMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    )
  }

  const handleSave = async () => {
    const effectiveMemberId = memberId || family?.adults[0]?.id || ""
    if (!effectiveMemberId || !annualGross) return
    try {
      const incomeData = {
        memberId: effectiveMemberId,
        employer,
        jobTitle,
        type: incomeType,
        annualGross,
        bonus,
        bonusFrequency: bonus > 0 ? bonusFrequency : ("none" as BonusFrequency),
        bonusPayoutMonths: bonus > 0 ? bonusPayoutMonths : [],
        bvgEmployeeSplit: bvgEmployeeSplit ?? null,
        bvgMonthly: bvgMonthly ?? null,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || null,
      }
      if (editingId) {
        await updateIncome(editingId, incomeData)
      } else {
        await addIncome({ ...incomeData, isProjection: false })
      }
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Failed to save income:", err)
    }
  }

  // Per-income social deductions (for columnar payslip)
  const now = new Date()
  const activeIncomes = incomes.filter((i) => {
    if (i.isProjection) return false
    if (!i.endDate) return true
    return i.endDate >= now.toISOString().split("T")[0]
  })

  const perIncomeBreakdowns = activeIncomes.map((inc) => {
    const member = family?.adults.find((a) => a.id === inc.memberId)
    let age = 35
    if (member?.dateOfBirth) {
      const born = new Date(member.dateOfBirth)
      age = now.getFullYear() - born.getFullYear()
      if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--
    }
    const social = calculateSocialDeductions({
      annualGross: Number(inc.annualGross || 0),
      age,
      bvgEmployeeSplit: inc.bvgEmployeeSplit ?? undefined,
      bvgMonthlyOverride: inc.bvgMonthly,
    })
    return { income: inc, social, memberName: member?.name ?? "Unknown" }
  })

  const socialDeductions = calculateTotalSocialDeductions(
    activeIncomes.map((inc) => {
      const member = family?.adults.find((a) => a.id === inc.memberId)
      let age = 35
      if (member?.dateOfBirth) {
        const born = new Date(member.dateOfBirth)
        age = now.getFullYear() - born.getFullYear()
        if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--
      }
      return { annualGross: Number(inc.annualGross || 0), age, bvgEmployeeSplit: inc.bvgEmployeeSplit ?? undefined, bvgMonthlyOverride: inc.bvgMonthly }
    })
  )

  const numChildren = family?.children?.filter((c) => !c.isPlanned).length ?? 0
  const numAdults = family?.adults?.length ?? 2
  const filingStatus = numAdults >= 2 ? ("married" as const) : ("single" as const)
  const taxableGross = Math.max(0, totalAnnualGross - socialDeductions.total)
  const taxResult = calculateTaxSimple(taxableGross, filingStatus, numChildren, {
    municipality: family?.municipality ?? "Zürich",
    churchTax: family?.churchTax ?? false,
  })
  const annualNet = totalAnnualGross - socialDeductions.total - taxResult.total
  const monthlyNet = Math.round(annualNet / 12)

  const hasMultipleIncomes = activeIncomes.length > 1

  // Chart data — split base vs bonus
  const chartData = (() => {
    const years: Record<string, { base: number; bonus: number }> = {}
    for (const inc of incomes) {
      if (inc.isProjection) continue
      const start = new Date(inc.startDate).getFullYear()
      const end = inc.endDate
        ? new Date(inc.endDate).getFullYear()
        : new Date().getFullYear()
      for (let y = start; y <= end; y++) {
        if (!years[y]) years[y] = { base: 0, bonus: 0 }
        years[y].base += Number(inc.annualGross || 0)
        years[y].bonus += Number(inc.bonus || 0)
      }
    }
    return Object.entries(years)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, data]) => ({ year, base: data.base, bonus: data.bonus }))
  })()

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4">
        <p className="font-medium text-destructive">Failed to load income data</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground">
            Track employment history and income for all family members.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Income Source" : "Add Income Source"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Family Member</Label>
                <Select value={memberId || undefined} onValueChange={setMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {family?.adults.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name || "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Employer</Label>
                  <Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={incomeType} onValueChange={(v) => setIncomeType(v as IncomeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="investment">Investment Income</SelectItem>
                      <SelectItem value="rental">Rental Income</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Annual Gross (CHF)</Label>
                  <Input type="number" value={annualGross || ""} onChange={(e) => setAnnualGross(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Annual Bonus (CHF)</Label>
                <Input type="number" value={bonus || ""} onChange={(e) => setBonus(Number(e.target.value))} />
              </div>
              {bonus > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Bonus Frequency</Label>
                    <Select value={bonusFrequency} onValueChange={(v) => handleFrequencyChange(v as BonusFrequency)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payout Months</Label>
                    <div className="flex flex-wrap gap-1">
                      {MONTH_LABELS.map((label, idx) => {
                        const month = idx + 1
                        const selected = bonusPayoutMonths.includes(month)
                        return (
                          <Button
                            key={month}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            className="h-7 w-10 px-0 text-xs"
                            onClick={() => togglePayoutMonth(month)}
                          >
                            {label}
                          </Button>
                        )
                      })}
                    </div>
                    {bonusPayoutMonths.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCHF(Math.round(bonus / bonusPayoutMonths.length))} per payout
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>BVG Employee Split (%)</Label>
                  <Input
                    type="number"
                    value={bvgEmployeeSplit ?? ""}
                    onChange={(e) => setBvgEmployeeSplit(e.target.value ? Number(e.target.value) : null)}
                    placeholder="50"
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Employee share of total BVG contribution. Default 50%.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>BVG Employee Amount (CHF/mo)</Label>
                  <Input
                    type="number"
                    value={bvgMonthly ?? ""}
                    onChange={(e) => setBvgMonthly(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Auto from age & split"
                  />
                  <p className="text-xs text-muted-foreground">
                    Override with exact amount from payslip.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date (empty = current)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingId ? "Save Changes" : "Add Income Source"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Annual Gross</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalAnnualGross)}</div>
            <p className="text-xs text-muted-foreground">{formatCHF(totalMonthlyGross)}/mo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Base Salary</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalAnnualBase)}</div>
            <p className="text-xs text-muted-foreground">{formatCHF(Math.round(totalAnnualBase / 12))}/mo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bonus</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalAnnualBonus)}</div>
            <p className="text-xs text-muted-foreground">
              {totalAnnualGross > 0 ? `${Math.round((totalAnnualBonus / totalAnnualGross) * 100)}% of total` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Gross</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalMonthlyGross)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCHF(Math.round(totalAnnualBase / 12))} + {formatCHF(Math.round(totalAnnualBonus / 12))} bonus
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incomes.filter((i) => {
                if (i.isProjection) return false
                if (!i.endDate) return true
                return i.endDate >= new Date().toISOString().split("T")[0]
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payslip deductions breakdown — columnar */}
      {totalAnnualGross > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payslip Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium"></th>
                    {perIncomeBreakdowns.map(({ income }) => (
                      <th key={income.id} className="pb-2 font-medium text-right pl-4">
                        {income.employer || "Income"}
                      </th>
                    ))}
                    {hasMultipleIncomes && (
                      <th className="pb-2 font-semibold text-right pl-4 border-l">Total</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Gross */}
                  <tr className="border-b">
                    <td className="py-1.5 font-medium">Gross Salary</td>
                    {perIncomeBreakdowns.map(({ income }) => (
                      <td key={income.id} className="py-1.5 text-right pl-4 font-semibold">
                        {formatCHF(Math.round(Number(income.annualGross || 0) / 12))}
                      </td>
                    ))}
                    {hasMultipleIncomes && (
                      <td className="py-1.5 text-right pl-4 font-semibold border-l">{formatCHF(totalMonthlyGross)}</td>
                    )}
                  </tr>

                  {/* Social deductions header */}
                  <tr>
                    <td colSpan={perIncomeBreakdowns.length + (hasMultipleIncomes ? 2 : 1)} className="pt-3 pb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Social Deductions (Employee Share)</span>
                    </td>
                  </tr>

                  {/* Social deduction rows */}
                  {[
                    { label: "AHV / IV / EO", key: "ahvIvEo" as const },
                    { label: "ALV (Unemployment)", key: "alv" as const },
                    ...(socialDeductions.alvSolidarity > 0
                      ? [{ label: "ALV Solidarity", key: "alvSolidarity" as const }]
                      : []),
                    { label: "BVG (Pension 2nd Pillar)", key: "bvg" as const },
                    { label: "NBU (Accident Ins.)", key: "nbu" as const },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-dashed">
                      <td className="py-1 text-muted-foreground">{row.label}</td>
                      {perIncomeBreakdowns.map(({ income, social }) => (
                        <td key={income.id} className="py-1 text-right pl-4 text-red-600">
                          -{formatCHF(Math.round(social[row.key] / 12))}
                        </td>
                      ))}
                      {hasMultipleIncomes && (
                        <td className="py-1 text-right pl-4 text-red-600 border-l">
                          -{formatCHF(Math.round(socialDeductions[row.key] / 12))}
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Social total */}
                  <tr className="border-b">
                    <td className="py-1.5 font-medium">Total Social</td>
                    {perIncomeBreakdowns.map(({ income, social }) => (
                      <td key={income.id} className="py-1.5 text-right pl-4 text-red-600 font-medium">
                        -{formatCHF(Math.round(social.total / 12))}
                      </td>
                    ))}
                    {hasMultipleIncomes && (
                      <td className="py-1.5 text-right pl-4 text-red-600 font-medium border-l">
                        -{formatCHF(Math.round(socialDeductions.total / 12))}
                      </td>
                    )}
                  </tr>

                  {/* Tax header */}
                  <tr>
                    <td colSpan={perIncomeBreakdowns.length + (hasMultipleIncomes ? 2 : 1)} className="pt-3 pb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax (combined household)</span>
                    </td>
                  </tr>

                  {/* Tax rows — only in total column since tax is household-level */}
                  {[
                    { label: "Federal Tax", value: taxResult.federal },
                    { label: "Cantonal Tax", value: taxResult.cantonal },
                    { label: "Municipal Tax", value: taxResult.municipal },
                    ...(taxResult.church > 0 ? [{ label: "Church Tax", value: taxResult.church }] : []),
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-dashed">
                      <td className="py-1 text-muted-foreground">{row.label}</td>
                      {hasMultipleIncomes ? (
                        <>
                          {perIncomeBreakdowns.map(({ income }) => (
                            <td key={income.id} className="py-1 text-right pl-4 text-muted-foreground">—</td>
                          ))}
                          <td className="py-1 text-right pl-4 text-red-600 border-l">
                            -{formatCHF(Math.round(row.value / 12))}
                          </td>
                        </>
                      ) : (
                        <td className="py-1 text-right pl-4 text-red-600">
                          -{formatCHF(Math.round(row.value / 12))}
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Tax total */}
                  <tr className="border-b">
                    <td className="py-1.5 font-medium">Total Tax</td>
                    {hasMultipleIncomes ? (
                      <>
                        {perIncomeBreakdowns.map(({ income }) => (
                          <td key={income.id} className="py-1.5 text-right pl-4 text-muted-foreground">—</td>
                        ))}
                        <td className="py-1.5 text-right pl-4 text-red-600 font-medium border-l">
                          -{formatCHF(taxResult.monthlyTax)}
                        </td>
                      </>
                    ) : (
                      <td className="py-1.5 text-right pl-4 text-red-600 font-medium">
                        -{formatCHF(taxResult.monthlyTax)}
                      </td>
                    )}
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="pt-3 font-semibold text-lg">Net Income</td>
                    {hasMultipleIncomes ? (
                      <>
                        {perIncomeBreakdowns.map(({ income, social }) => {
                          const gross = Number(income.annualGross || 0)
                          const perIncomeNet = Math.round((gross - social.total) / 12)
                          return (
                            <td key={income.id} className="pt-3 text-right pl-4 font-semibold text-green-600">
                              {formatCHF(perIncomeNet)}
                              <span className="block text-xs font-normal text-muted-foreground">before tax</span>
                            </td>
                          )
                        })}
                        <td className="pt-3 text-right pl-4 font-bold text-lg text-green-600 border-l">
                          {formatCHF(monthlyNet)}
                        </td>
                      </>
                    ) : (
                      <td className="pt-3 text-right pl-4 font-bold text-lg text-green-600">
                        {formatCHF(monthlyNet)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Effective deduction rate: {formatPercent(totalAnnualGross > 0 ? (socialDeductions.total + taxResult.total) / totalAnnualGross : 0)}
              {" "}(social {formatPercent(socialDeductions.rates.effective)} + tax {formatPercent(taxResult.effectiveRate)})
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Annual Income Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCHF(Number(v))} />
                  <Legend />
                  <Bar dataKey="base" name="Base Salary" fill="#22c55e" stackId="income" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bonus" name="Bonus" fill="#f59e0b" stackId="income" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment list */}
      <Card>
        <CardHeader>
          <CardTitle>Employment History</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-muted-foreground">No income records yet. Click &quot;Add Income&quot; to get started.</p>
          ) : (
            <div className="space-y-2">
              {incomes.map((inc) => {
                const memberName = family?.adults.find((a) => a.id === inc.memberId)?.name ?? "Unknown"
                return (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => openEdit(inc.id)}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inc.employer}</span>
                        {(!inc.endDate || inc.endDate >= new Date().toISOString().split("T")[0]) && !inc.isProjection && <Badge variant="secondary" className="text-xs">Current</Badge>}
                        {inc.isProjection && <Badge className="text-xs bg-blue-100 text-blue-700">Projected</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inc.jobTitle && `${inc.jobTitle} · `}
                        {memberName}
                        {inc.startDate && ` · ${formatDate(inc.startDate, "MMM yyyy")} — ${inc.endDate ? formatDate(inc.endDate, "MMM yyyy") : "Present"}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-medium">{formatCHF(Number(inc.annualGross))}</div>
                        {Number(inc.bonus) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {formatCHF(Number(inc.bonus))} bonus
                            {inc.bonusFrequency && inc.bonusFrequency !== "none" && ` (${inc.bonusFrequency}${inc.bonusPayoutMonths?.length ? `: ${inc.bonusPayoutMonths.map((m) => MONTH_LABELS[m - 1]).join(", ")}` : ""})`}
                          </p>
                        )}
                      </div>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); deleteIncome(inc.id) }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
