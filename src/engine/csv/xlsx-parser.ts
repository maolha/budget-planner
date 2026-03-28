import * as XLSX from "xlsx"

/**
 * Parse an XLSX/XLS file into headers + rows (same shape as CSV parser output).
 * Uses the first sheet by default. Skips preamble rows the same way we do for CSV.
 */
export function parseXLSX(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array", codepage: 65001 })

        // Use the first sheet
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error("No sheets found in the Excel file"))
          return
        }
        const sheet = workbook.Sheets[sheetName]

        // Convert to array-of-arrays first to detect the real header row
        const aoa: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        })

        if (aoa.length === 0) {
          reject(new Error("Empty spreadsheet"))
          return
        }

        // Find header row: the row with the most non-empty cells (within first 15 rows)
        let headerIdx = 0
        let maxNonEmpty = 0
        for (let i = 0; i < Math.min(aoa.length, 15); i++) {
          const nonEmpty = aoa[i].filter((c) => c !== "").length
          if (nonEmpty > maxNonEmpty) {
            maxNonEmpty = nonEmpty
            headerIdx = i
          }
        }

        const headers = aoa[headerIdx].map((h, i) =>
          String(h).trim() || `Column_${i + 1}`
        )

        // Build row objects from headerIdx+1 onward
        const rows: Record<string, string>[] = []
        for (let r = headerIdx + 1; r < aoa.length; r++) {
          const row: Record<string, string> = {}
          let hasContent = false
          for (let c = 0; c < headers.length; c++) {
            const val = String(aoa[r]?.[c] ?? "").trim()
            row[headers[c]] = val
            if (val) hasContent = true
          }
          if (hasContent) rows.push(row)
        }

        // UBS debit/credit merge (same logic as CSV parser)
        let finalHeaders = headers
        let finalRows = rows
        const debitCol = headers.find((h) => h.toLowerCase().includes("belastung"))
        const creditCol = headers.find((h) => h.toLowerCase().includes("gutschrift"))
        if (debitCol && creditCol && !headers.some((h) => h.toLowerCase() === "amount")) {
          finalHeaders = [...headers, "Amount"]
          finalRows = rows.map((row) => {
            const debit = (row[debitCol] ?? "").trim()
            const credit = (row[creditCol] ?? "").trim()
            if (debit) return { ...row, Amount: `-${debit.replace(/^-/, "")}` }
            if (credit) return { ...row, Amount: credit.replace(/^-/, "") }
            return { ...row, Amount: "0" }
          })
        }

        resolve({ headers: finalHeaders, rows: finalRows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
