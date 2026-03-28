import { useState, useCallback } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, FileSpreadsheet, AlertTriangle, Check, ArrowRight } from "lucide-react"
import { parseCSV, mapToTransactions } from "@/engine/csv/csv-parser"
import { detectColumns } from "@/engine/csv/column-detector"
import { categorizeTransactions } from "@/engine/csv/categorizer"
import { useExpenses } from "@/hooks/useExpenses"
import { formatCHF } from "@/lib/formatters"
import type { ParsedTransaction, ColumnMapping } from "@/engine/csv/types"

type Step = "upload" | "map" | "review" | "done"

export function StatementUploadPage() {
  const { categories, addExpense } = useExpenses()
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
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setFileName(file.name)
      const { headers: h, rows } = await parseCSV(file)
      setHeaders(h)
      setRawRows(rows)

      // Auto-detect columns
      const { mapping: detected } = detectColumns(h)
      setMapping({
        date: detected.date ?? "",
        amount: detected.amount ?? "",
        description: detected.description ?? "",
        balance: detected.balance,
        category: detected.category,
      })

      setStep("map")
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file || !file.name.endsWith(".csv")) return

      // Create a synthetic event-like flow
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

  const handleMapConfirm = () => {
    if (!mapping.date || !mapping.amount || !mapping.description) return
    const mapped = mapToTransactions(rawRows, mapping)
    const categorized = categorizeTransactions(mapped)
    setTransactions(categorized)
    setStep("review")
  }

  const handleImport = async () => {
    setImporting(true)
    let count = 0

    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i]
      const catKey = categoryOverrides[i] ?? txn.suggestedCategory ?? "other"
      const cat = categories.find(
        (c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(catKey)
      )

      await addExpense({
        categoryId: cat?.id ?? categories[categories.length - 1]?.id ?? "",
        amount: Math.abs(txn.amount),
        date: txn.date,
        description: txn.description,
        isRecurring: false,
        source: "csv_import",
      })
      count++
    }

    setImportedCount(count)
    setImporting(false)
    setStep("done")
  }

  return (
    <div className="space-y-6">
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
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <Input
                type="file"
                accept=".csv"
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
                <Select value={mapping.date} onValueChange={(v) => setMapping({ ...mapping, date: v })}>
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
                <Select value={mapping.amount} onValueChange={(v) => setMapping({ ...mapping, amount: v })}>
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
                  value={mapping.description}
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
            <p className="text-sm text-muted-foreground">
              Verify the auto-assigned categories. Change any that look wrong before importing.
            </p>

            <div className="max-h-96 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{txn.date}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs">
                        {txn.description}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCHF(Math.abs(txn.amount))}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={categoryOverrides[i] ?? txn.suggestedCategory ?? "other"}
                          onValueChange={(v) =>
                            setCategoryOverrides({ ...categoryOverrides, [i]: v })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem
                                key={c.id}
                                value={c.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}
                              >
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={txn.categoryConfidence > 0.5 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {Math.round(txn.categoryConfidence * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${transactions.length} Transactions`}
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
            <p className="text-muted-foreground">
              Successfully imported {importedCount} transactions from {fileName}.
            </p>
            <Button
              onClick={() => {
                setStep("upload")
                setTransactions([])
                setFileName("")
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
