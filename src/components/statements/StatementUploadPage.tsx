import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  ArrowRight,
  Brain,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Eye,
  Loader2,
} from "lucide-react"
import { parseFile, ACCEPTED_FILE_TYPES, isSupportedFile } from "@/engine/csv/file-parser"
import { mapToTransactions } from "@/engine/csv/csv-parser"
import { detectColumns } from "@/engine/csv/column-detector"
import {
  categorizeTransactions,
  isInternalTransfer,
  INCOME_CATEGORY_KEYS,
} from "@/engine/csv/categorizer"
import { useExpenses } from "@/hooks/useExpenses"
import { useCategoryRules, normalizeDescription } from "@/hooks/useCategoryRules"
import { formatCHF } from "@/lib/formatters"
import type { ParsedTransaction, ColumnMapping } from "@/engine/csv/types"

type Step = "upload" | "map" | "review" | "done"

/** Group transactions by normalized description for mass categorization. */
interface DescriptionGroup {
  pattern: string // normalized key
  exampleDescription: string // first original description
  indices: number[] // transaction indices in the flat list
  suggestedCategory: string
  confidence: number
  totalAmount: number // sum preserving sign
  isInflow: boolean // majority direction
  hidden: boolean // auto-detected or user-toggled
}

type SortField = "description" | "count" | "amount" | "category" | "confidence"
type FlatSortField = "date" | "description" | "amount" | "category" | "confidence"
type SortDir = "asc" | "desc"

/** All income category keys for the dropdown. */
const INCOME_CATEGORIES_FOR_DROPDOWN = [
  { key: "salary", label: "Salary" },
  { key: "bonus", label: "Bonus" },
  { key: "dividend", label: "Dividend" },
  { key: "investment_return", label: "Investment Return" },
  { key: "rental_income", label: "Rental Income" },
  { key: "refund", label: "Refund" },
  { key: "child_allowance", label: "Child Allowance" },
  { key: "other_income", label: "Other Income" },
]

export function StatementUploadPage() {
  const { categories, addExpense } = useExpenses()
  const { ruleMap, addRule, saveColumnMapping, loadColumnMapping } = useCategoryRules()
  const [step, setStep] = useState<Step>("upload")
  const [accountType, setAccountType] = useState<"bank" | "credit_card">("bank")
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    amount: "",
    description: "",
  })
  const [currency, setCurrency] = useState("CHF")
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [rememberRules, setRememberRules] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [savedRulesCount, setSavedRulesCount] = useState(0)
  const [viewMode, setViewMode] = useState<"grouped" | "all">("grouped")
  const [showHidden, setShowHidden] = useState(false)
  const [flipSign, setFlipSign] = useState(false)

  // Sort state for grouped view
  const [groupSort, setGroupSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "amount",
    dir: "desc",
  })
  // Sort state for flat view
  const [flatSort, setFlatSort] = useState<{ field: FlatSortField; dir: SortDir }>({
    field: "amount",
    dir: "desc",
  })

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setProcessing(true)
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "csv"
      const typeLabel = ext === "pdf" ? "PDF" : ext === "xlsx" || ext === "xls" ? "Excel" : "CSV"
      setProcessingMessage(`Parsing ${typeLabel} file...`)
      setFileName(file.name)

      try {
        const { headers: h, rows } = await parseFile(file)
        setHeaders(h)
        setRawRows(rows)

        // Try to load a saved mapping for these headers first
        setProcessingMessage("Loading saved mapping...")
        const saved = await loadColumnMapping(h)

        if (saved && saved.date && saved.amount && saved.description) {
          setMapping(saved)
        } else {
          setProcessingMessage("Detecting columns...")
          const { mapping: detected } = detectColumns(h)
          setMapping({
            date: detected.date ?? "",
            amount: detected.amount ?? "",
            description: detected.description ?? "",
            balance: detected.balance,
            category: detected.category,
          })
        }

        setStep("map")
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file || !isSupportedFile(file.name)) return

      const input = document.createElement("input")
      input.type = "file"
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files

      handleFileUpload({
        target: input,
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    },
    [handleFileUpload]
  )

  const handleMapConfirm = async () => {
    if (!mapping.date || !mapping.amount || !mapping.description) return

    setProcessing(true)
    setProcessingMessage("Saving column mapping...")

    // Save mapping for future uploads with same headers
    await saveColumnMapping(headers, mapping)

    setProcessingMessage("Mapping transactions...")
    // Yield to let the overlay render before heavy computation
    await new Promise((r) => setTimeout(r, 50))

    try {
      const mapped = mapToTransactions(rawRows, mapping)

      setProcessingMessage(`Categorizing ${mapped.length} transactions...`)
      await new Promise((r) => setTimeout(r, 50))

      const categorized = categorizeTransactions(mapped, ruleMap)
      setTransactions(categorized)
      setRememberRules({})

      // Auto-assign categories only for high-confidence matches (≥ 0.5)
      // Low-confidence suggestions stay as clickable hints
      const autoOverrides: Record<number, string> = {}
      categorized.forEach((txn, i) => {
        if (txn.suggestedCategory && txn.categoryConfidence >= 0.5) {
          autoOverrides[i] = txn.suggestedCategory
        }
      })
      setCategoryOverrides(autoOverrides)

      setProcessingMessage("Detecting internal transfers...")
      const autoHidden = new Set<number>()
      categorized.forEach((txn, i) => {
        if (isInternalTransfer(txn.description)) {
          autoHidden.add(i)
        }
      })
      setHiddenIndices(autoHidden)

      setStep("review")
    } finally {
      setProcessing(false)
    }
  }

  // ── Grouping logic ──────────────────────────────────────────────────────

  const descriptionGroups = useMemo(() => {
    const groups = new Map<string, DescriptionGroup>()
    transactions.forEach((txn, i) => {
      const pattern = normalizeDescription(txn.description)
      const existing = groups.get(pattern)
      const a = amt(txn)
      if (existing) {
        existing.indices.push(i)
        existing.totalAmount += a
        // hidden if ALL indices are hidden
        existing.hidden = existing.hidden && hiddenIndices.has(i)
      } else {
        groups.set(pattern, {
          pattern,
          exampleDescription: txn.description,
          indices: [i],
          suggestedCategory: txn.suggestedCategory ?? "",
          confidence: txn.categoryConfidence,
          totalAmount: a,
          isInflow: a > 0,
          hidden: hiddenIndices.has(i),
        })
      }
    })
    // Finalize isInflow based on majority
    for (const group of groups.values()) {
      const positiveCount = group.indices.filter((i) => amt(transactions[i]) > 0).length
      group.isInflow = positiveCount > group.indices.length / 2
    }
    return Array.from(groups.values())
  }, [transactions, hiddenIndices, flipSign])

  // ── Sorted groups ───────────────────────────────────────────────────────

  const sortedGroups = useMemo(() => {
    const filtered = showHidden
      ? descriptionGroups
      : descriptionGroups.filter((g) => !g.hidden)

    return [...filtered].sort((a, b) => {
      const dir = groupSort.dir === "asc" ? 1 : -1
      switch (groupSort.field) {
        case "description":
          return dir * a.exampleDescription.localeCompare(b.exampleDescription)
        case "count":
          return dir * (a.indices.length - b.indices.length)
        case "amount":
          return dir * (Math.abs(a.totalAmount) - Math.abs(b.totalAmount))
        case "category":
          return dir * getGroupCategory(a).localeCompare(getGroupCategory(b))
        case "confidence":
          return dir * (a.confidence - b.confidence)
        default:
          return 0
      }
    })
  }, [descriptionGroups, groupSort, showHidden])

  // ── Sorted flat transactions ────────────────────────────────────────────

  const sortedTransactions = useMemo(() => {
    const indexed = transactions.map((txn, i) => ({ txn, i }))
    const filtered = showHidden ? indexed : indexed.filter(({ i }) => !hiddenIndices.has(i))

    return [...filtered].sort((a, b) => {
      const dir = flatSort.dir === "asc" ? 1 : -1
      switch (flatSort.field) {
        case "date":
          return dir * a.txn.date.localeCompare(b.txn.date)
        case "description":
          return dir * a.txn.description.localeCompare(b.txn.description)
        case "amount":
          return dir * (Math.abs(amt(a.txn)) - Math.abs(amt(b.txn)))
        case "category": {
          const catA = categoryOverrides[a.i] ?? ""
          const catB = categoryOverrides[b.i] ?? ""
          return dir * catA.localeCompare(catB)
        }
        case "confidence":
          return dir * (a.txn.categoryConfidence - b.txn.categoryConfidence)
        default:
          return 0
      }
    })
  }, [transactions, flatSort, hiddenIndices, showHidden, categoryOverrides])

  // ── Helper functions ────────────────────────────────────────────────────

  /** Apply a category to all transactions in a group. */
  const massCategorize = (group: DescriptionGroup, categoryKey: string) => {
    const newOverrides = { ...categoryOverrides }
    for (const idx of group.indices) {
      newOverrides[idx] = categoryKey
    }
    setCategoryOverrides(newOverrides)
  }

  /** Get effective category for a group (first override or suggested). */
  function getGroupCategory(group: DescriptionGroup): string {
    for (const idx of group.indices) {
      if (categoryOverrides[idx]) return categoryOverrides[idx]
    }
    return group.suggestedCategory
  }

  /**
   * Convert numeric confidence into a human-readable status.
   * 1.0 = learned rule, 0.9 = from CSV column, 0.8 = keyword match, anything else = needs review.
   */
  function confidenceLabel(confidence: number): {
    text: string
    variant: "default" | "secondary" | "outline" | "destructive"
  } {
    if (confidence >= 1.0) return { text: "Learned", variant: "default" }
    if (confidence >= 0.85) return { text: "From CSV", variant: "outline" }
    if (confidence >= 0.5) return { text: "Matched", variant: "default" }
    if (confidence > 0) return { text: "Guess", variant: "secondary" }
    return { text: "No match", variant: "destructive" }
  }

  /** Toggle hide for all transactions in a group. */
  const toggleGroupHidden = (group: DescriptionGroup) => {
    const newHidden = new Set(hiddenIndices)
    const shouldHide = !group.hidden
    for (const idx of group.indices) {
      if (shouldHide) {
        newHidden.add(idx)
      } else {
        newHidden.delete(idx)
      }
    }
    setHiddenIndices(newHidden)
  }

  /** Toggle hide for a single transaction. */
  const toggleTxnHidden = (idx: number) => {
    const newHidden = new Set(hiddenIndices)
    if (newHidden.has(idx)) {
      newHidden.delete(idx)
    } else {
      newHidden.add(idx)
    }
    setHiddenIndices(newHidden)
  }

  /** Sort header click handler for grouped view. */
  const toggleGroupSort = (field: SortField) => {
    setGroupSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "desc" }
    )
  }

  /** Sort header click handler for flat view. */
  const toggleFlatSort = (field: FlatSortField) => {
    setFlatSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "desc" }
    )
  }

  /** Render sort icon for a column header. */
  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    return dir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
  }



  /** Get the effective amount for a transaction, respecting the flip toggle. */
  const amt = (txn: ParsedTransaction) => (flipSign ? -txn.amount : txn.amount)

  // ── Stats ───────────────────────────────────────────────────────────────

  const visibleCount = transactions.length - hiddenIndices.size
  const categorizedCount = transactions.filter(
    (_, i) => !hiddenIndices.has(i) && categoryOverrides[i]
  ).length
  const uncategorizedCount = visibleCount - categorizedCount
  const inflowTotal = transactions
    .filter((_, i) => !hiddenIndices.has(i) && amt(transactions[i]) > 0)
    .reduce((s, t) => s + amt(t), 0)
  const outflowTotal = transactions
    .filter((_, i) => !hiddenIndices.has(i) && amt(transactions[i]) < 0)
    .reduce((s, t) => s + Math.abs(amt(t)), 0)

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true)
    setProcessing(true)
    setProcessingMessage("Saving category rules...")
    let count = 0
    let rulesCount = 0

    // Save remembered rules first
    for (const group of descriptionGroups) {
      if (rememberRules[group.pattern]) {
        const catKey = getGroupCategory(group)
        const cat = categories.find(
          (c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(catKey)
        )
        await addRule({
          pattern: group.pattern,
          categoryId: cat?.id ?? "",
          categoryKey: catKey,
          exampleDescription: group.exampleDescription,
        })
        rulesCount++
      }
    }

    // Import non-hidden transactions
    setProcessingMessage(`Importing 0 / ${visibleCount} transactions...`)

    for (let i = 0; i < transactions.length; i++) {
      if (hiddenIndices.has(i)) continue

      const txn = transactions[i]
      const effectiveAmount = amt(txn)
      const catKey = categoryOverrides[i] ?? ""
      if (!catKey) continue // skip uncategorized transactions
      const isIncome = INCOME_CATEGORY_KEYS.includes(catKey) || catKey === "other_income"

      const cat = categories.find(
        (c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(catKey)
      )
      await addExpense({
        categoryId: cat?.id ?? categories[categories.length - 1]?.id ?? "",
        amount: isIncome ? -Math.abs(effectiveAmount) : Math.abs(effectiveAmount),
        date: txn.date,
        description: txn.description,
        isRecurring: false,
        source: "csv_import",
      })
      count++

      // Update progress every 5 transactions to avoid excessive re-renders
      if (count % 5 === 0 || count === visibleCount) {
        setProcessingMessage(`Importing ${count} / ${visibleCount} transactions...`)
      }
    }

    setImportedCount(count)
    setHiddenCount(hiddenIndices.size)
    setSavedRulesCount(rulesCount)
    setProcessing(false)
    setImporting(false)
    setStep("done")
  }

  return (
    <div className="relative space-y-6">
      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{processingMessage}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statement Upload</h1>
        <p className="text-muted-foreground">
          Upload bank or credit card CSV statements to automatically import and categorize
          transactions.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload", "Map Columns", "Review", "Done"].map((label, i) => {
          const steps: Step[] = ["upload", "map", "review", "done"]
          const isActive = steps.indexOf(step) >= i
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              <Badge variant={isActive ? "default" : "secondary"}>{label}</Badge>
            </div>
          )
        })}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as "bank" | "credit_card")}
              >
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tagging the account type helps detect double-counting between bank and CC
                statements.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applied to all transactions in this file.
              </p>
            </div>

            <div
              className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  CSV, Excel (.xlsx), or PDF — supports German umlauts
                </p>
              </div>
              <Input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileUpload}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column mapping step */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Map Columns — {fileName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We detected {rawRows.length} rows. Map CSV columns to transaction fields:
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Date Column *</Label>
                <Select value={mapping.date || undefined} onValueChange={(v) => setMapping({ ...mapping, date: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount Column *</Label>
                <Select value={mapping.amount || undefined} onValueChange={(v) => setMapping({ ...mapping, amount: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description Column *</Label>
                <Select
                  value={mapping.description || undefined}
                  onValueChange={(v) => setMapping({ ...mapping, description: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category Column (optional)</Label>
                <Select
                  value={mapping.category ?? "none"}
                  onValueChange={(v) => setMapping({ ...mapping, category: v === "none" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {rawRows.length > 0 && (
              <div className="max-h-48 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHead key={h} className="text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h} className="text-xs">{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleMapConfirm}
                disabled={!mapping.date || !mapping.amount || !mapping.description}
              >
                Map & Categorize
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review step */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Review {transactions.length} Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline" className="gap-1">
                <ArrowDown className="h-3 w-3 text-red-500" />
                Outflow: {formatCHF(outflowTotal)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ArrowUp className="h-3 w-3 text-green-500" />
                Inflow: {formatCHF(inflowTotal)}
              </Badge>
              <Button
                variant={flipSign ? "default" : "outline"}
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setFlipSign(!flipSign)}
              >
                <ArrowUpDown className="h-3 w-3" />
                {flipSign ? "Signs flipped" : "Flip in/out"}
              </Button>
              {hiddenIndices.size > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <EyeOff className="h-3 w-3" />
                  {hiddenIndices.size} hidden
                </Badge>
              )}
              <span className="text-muted-foreground">
                {categorizedCount} categorized
              </span>
              {uncategorizedCount > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  {uncategorizedCount} uncategorized
                </Badge>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {viewMode === "grouped"
                  ? `${sortedGroups.length} unique descriptions. Change a category to apply it to all matching transactions.`
                  : "Click column headers to sort. Use hide to exclude internal transfers."}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHidden(!showHidden)}
                  className="gap-1 text-xs"
                >
                  {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showHidden ? "Showing hidden" : "Hidden filtered"}
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === "grouped" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grouped")}
                  >
                    Grouped
                  </Button>
                  <Button
                    variant={viewMode === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("all")}
                  >
                    All
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Grouped view ────────────────────────────────────────── */}
            {viewMode === "grouped" && (
              <div className="max-h-[32rem] overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleGroupSort("description")}
                      >
                        Description
                        <SortIcon
                          active={groupSort.field === "description"}
                          dir={groupSort.dir}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-center"
                        onClick={() => toggleGroupSort("count")}
                      >
                        Count
                        <SortIcon active={groupSort.field === "count"} dir={groupSort.dir} />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => toggleGroupSort("amount")}
                      >
                        Total
                        <SortIcon active={groupSort.field === "amount"} dir={groupSort.dir} />
                      </TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleGroupSort("category")}
                      >
                        Category
                        <SortIcon
                          active={groupSort.field === "category"}
                          dir={groupSort.dir}
                        />
                      </TableHead>
                      <TableHead>Suggestion</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleGroupSort("confidence")}
                      >
                        Status
                        <SortIcon
                          active={groupSort.field === "confidence"}
                          dir={groupSort.dir}
                        />
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Brain className="h-3 w-3" /> Remember
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedGroups.map((group) => {
                      const effectiveCat = getGroupCategory(group)
                      const hasSuggestion =
                        !effectiveCat && group.suggestedCategory
                      const isLearned = ruleMap.has(group.pattern)
                      return (
                        <TableRow
                          key={group.pattern}
                          className={group.hidden ? "opacity-40" : undefined}
                        >
                          {/* Hide toggle */}
                          <TableCell className="px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleGroupHidden(group)}
                              title={group.hidden ? "Show" : "Hide"}
                            >
                              {group.hidden ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3 opacity-30 hover:opacity-100" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="max-w-64">
                            <div className="truncate text-xs font-medium">
                              {group.exampleDescription}
                            </div>
                            {group.indices.length > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {group.indices.length} transactions
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">
                              {group.indices.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {formatCHF(Math.abs(group.totalAmount))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                group.isInflow
                                  ? "border-green-300 text-green-700 text-xs"
                                  : "border-red-300 text-red-700 text-xs"
                              }
                            >
                              {group.isInflow ? "In" : "Out"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={effectiveCat}
                              onValueChange={(v) => massCategorize(group, v)}
                            >
                              <SelectTrigger
                                className={`h-7 text-xs ${!effectiveCat ? "text-muted-foreground italic" : ""}`}
                              >
                                <SelectValue placeholder="— select —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__separator_expenses"
                                  disabled
                                  className="text-xs font-semibold text-muted-foreground"
                                >
                                  — Expenses —
                                </SelectItem>
                                {categories.map((c) => (
                                  <SelectItem
                                    key={c.id}
                                    value={c.name
                                      .toLowerCase()
                                      .replace(/[^a-z0-9]+/g, "_")}
                                  >
                                    {c.name}
                                  </SelectItem>
                                ))}
                                <SelectItem
                                  value="__separator_income"
                                  disabled
                                  className="text-xs font-semibold text-muted-foreground"
                                >
                                  — Income —
                                </SelectItem>
                                {INCOME_CATEGORIES_FOR_DROPDOWN.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {hasSuggestion ? (
                              <button
                                type="button"
                                className="inline-flex items-center rounded border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                onClick={() =>
                                  massCategorize(group, group.suggestedCategory)
                                }
                                title="Click to accept this suggestion"
                              >
                                {group.suggestedCategory}
                              </button>
                            ) : effectiveCat ? (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const label = isLearned
                                ? { text: "Learned", variant: "default" as const }
                                : confidenceLabel(group.confidence)
                              return (
                                <Badge variant={label.variant} className="text-xs">
                                  {label.text}
                                </Badge>
                              )
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLearned ? (
                              <Badge variant="outline" className="text-xs">
                                Saved
                              </Badge>
                            ) : (
                              <Checkbox
                                checked={rememberRules[group.pattern] ?? false}
                                onCheckedChange={(checked) =>
                                  setRememberRules({
                                    ...rememberRules,
                                    [group.pattern]: !!checked,
                                  })
                                }
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ── Flat view ───────────────────────────────────────────── */}
            {viewMode === "all" && (
              <div className="max-h-[32rem] overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleFlatSort("date")}
                      >
                        Date
                        <SortIcon active={flatSort.field === "date"} dir={flatSort.dir} />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleFlatSort("description")}
                      >
                        Description
                        <SortIcon
                          active={flatSort.field === "description"}
                          dir={flatSort.dir}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => toggleFlatSort("amount")}
                      >
                        Amount
                        <SortIcon active={flatSort.field === "amount"} dir={flatSort.dir} />
                      </TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleFlatSort("category")}
                      >
                        Category
                        <SortIcon
                          active={flatSort.field === "category"}
                          dir={flatSort.dir}
                        />
                      </TableHead>
                      <TableHead>Suggestion</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleFlatSort("confidence")}
                      >
                        Status
                        <SortIcon
                          active={flatSort.field === "confidence"}
                          dir={flatSort.dir}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map(({ txn, i }) => {
                      const flatCat = categoryOverrides[i] ?? ""
                      const flatSuggestion =
                        !flatCat && txn.suggestedCategory
                          ? txn.suggestedCategory
                          : ""
                      return (
                      <TableRow
                        key={i}
                        className={hiddenIndices.has(i) ? "opacity-40" : undefined}
                      >
                        <TableCell className="px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleTxnHidden(i)}
                            title={hiddenIndices.has(i) ? "Show" : "Hide"}
                          >
                            {hiddenIndices.has(i) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3 opacity-30 hover:opacity-100" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs">{txn.date}</TableCell>
                        <TableCell className="max-w-48 truncate text-xs">
                          {txn.description}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatCHF(Math.abs(amt(txn)))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              amt(txn) > 0
                                ? "border-green-300 text-green-700 text-xs"
                                : "border-red-300 text-red-700 text-xs"
                            }
                          >
                            {amt(txn) > 0 ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={flatCat}
                            onValueChange={(v) =>
                              setCategoryOverrides({ ...categoryOverrides, [i]: v })
                            }
                          >
                            <SelectTrigger
                              className={`h-7 text-xs ${!flatCat ? "text-muted-foreground italic" : ""}`}
                            >
                              <SelectValue placeholder="— select —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__separator_expenses"
                                disabled
                                className="text-xs font-semibold text-muted-foreground"
                              >
                                — Expenses —
                              </SelectItem>
                              {categories.map((c) => (
                                <SelectItem
                                  key={c.id}
                                  value={c.name
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "_")}
                                >
                                  {c.name}
                                </SelectItem>
                              ))}
                              <SelectItem
                                value="__separator_income"
                                disabled
                                className="text-xs font-semibold text-muted-foreground"
                              >
                                — Income —
                              </SelectItem>
                              {INCOME_CATEGORIES_FOR_DROPDOWN.map((c) => (
                                <SelectItem key={c.key} value={c.key}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {flatSuggestion ? (
                            <button
                              type="button"
                              className="inline-flex items-center rounded border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                              onClick={() =>
                                setCategoryOverrides({
                                  ...categoryOverrides,
                                  [i]: flatSuggestion,
                                })
                              }
                              title="Click to accept this suggestion"
                            >
                              {flatSuggestion}
                            </button>
                          ) : flatCat ? (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const label = confidenceLabel(txn.categoryConfidence)
                            return (
                              <Badge variant={label.variant} className="text-xs">
                                {label.text}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {Object.values(rememberRules).some(Boolean) && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Brain className="h-3 w-3" />
                {Object.values(rememberRules).filter(Boolean).length} rule(s) will be saved
                for future imports.
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing
                  ? "Importing..."
                  : `Import ${categorizedCount} Transactions${uncategorizedCount > 0 ? ` (${uncategorizedCount} skipped)` : ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done step */}
      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Import Complete</h2>
            <p className="text-center text-muted-foreground">
              Successfully imported {importedCount} transactions from {fileName}.
              {hiddenCount > 0 && <> {hiddenCount} internal transfers were skipped.</>}
              {savedRulesCount > 0 && (
                <>
                  {" "}
                  Saved {savedRulesCount} category rule
                  {savedRulesCount > 1 ? "s" : ""} for future imports.
                </>
              )}
            </p>
            <Button
              onClick={() => {
                setStep("upload")
                setTransactions([])
                setFileName("")
                setHiddenIndices(new Set())
              }}
            >
              Upload Another Statement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
