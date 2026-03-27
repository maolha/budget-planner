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
import { Plus, Trash2, Wallet, Briefcase, TrendingUp } from "lucide-react"
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
import { formatCHF, formatDate } from "@/lib/formatters"
import type { IncomeType } from "@/types"

export function IncomePage() {
  const { incomes, loading, addIncome, deleteIncome, totalAnnualGross, totalMonthlyGross } =
    useIncome()
  const { family } = useFamily()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [memberId, setMemberId] = useState(family?.adults[0]?.id ?? "")
  const [employer, setEmployer] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [incomeType, setIncomeType] = useState<IncomeType>("salary")
  const [annualGross, setAnnualGross] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const resetForm = () => {
    setMemberId(family?.adults[0]?.id ?? "")
    setEmployer("")
    setJobTitle("")
    setIncomeType("salary")
    setAnnualGross(0)
    setBonus(0)
    setStartDate("")
    setEndDate("")
  }

  const handleAdd = async () => {
    const effectiveMemberId = memberId || family?.adults[0]?.id || ""
    if (!effectiveMemberId || !annualGross) return
    try {
      await addIncome({
        memberId: effectiveMemberId,
        employer,
        jobTitle,
        type: incomeType,
        annualGross,
        bonus,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || undefined,
        isProjection: false,
      })
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Failed to add income:", err)
    }
  }

  // Build chart data: annual income by year
  const chartData = (() => {
    const years: Record<string, number> = {}
    for (const inc of incomes) {
      if (inc.isProjection) continue
      const start = new Date(inc.startDate).getFullYear()
      const end = inc.endDate
        ? new Date(inc.endDate).getFullYear()
        : new Date().getFullYear()
      for (let y = start; y <= end; y++) {
        years[y] = (years[y] ?? 0) + inc.annualGross + (inc.bonus ?? 0)
      }
    }
    return Object.entries(years)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, total]) => ({ year, total }))
  })()

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground">
            Track employment history and income for all family members.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Income Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Family Member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
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
                  <Input
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={incomeType}
                    onValueChange={(v) => setIncomeType(v as IncomeType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    type="number"
                    value={annualGross || ""}
                    onChange={(e) => setAnnualGross(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Annual Bonus (CHF)</Label>
                <Input
                  type="number"
                  value={bonus || ""}
                  onChange={(e) => setBonus(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (empty = current)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add Income Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Annual Gross
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalAnnualGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Gross
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCHF(totalMonthlyGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Positions
            </CardTitle>
            <Briefcase className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incomes.filter((i) => !i.endDate && !i.isProjection).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income history chart */}
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
                  <Bar
                    dataKey="total"
                    name="Total Income (CHF)"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job history list */}
      <Card>
        <CardHeader>
          <CardTitle>Employment History</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-muted-foreground">
              No income records yet. Click &quot;Add Income&quot; to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {incomes.map((inc) => {
                const memberName =
                  family?.adults.find((a) => a.id === inc.memberId)?.name ?? "Unknown"
                return (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inc.employer}</span>
                        {!inc.endDate && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                        {inc.isProjection && (
                          <Badge className="text-xs bg-blue-100 text-blue-700">
                            Projected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inc.jobTitle && `${inc.jobTitle} · `}
                        {memberName} ·{" "}
                        {inc.startDate && formatDate(inc.startDate, "MMM yyyy")}
                        {inc.endDate && ` — ${formatDate(inc.endDate, "MMM yyyy")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{formatCHF(inc.annualGross)}</div>
                        {inc.bonus ? (
                          <p className="text-xs text-muted-foreground">
                            + {formatCHF(inc.bonus)} bonus
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteIncome(inc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
