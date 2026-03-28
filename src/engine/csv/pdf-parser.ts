import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"

// Use the bundled worker from pdfjs-dist
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

/**
 * Parse a PDF bank statement into headers + rows.
 *
 * Strategy:
 * 1. Extract all text content from every page
 * 2. Split into lines, detect tabular structure
 * 3. Find the header row (most tab/space-separated columns)
 * 4. Parse subsequent rows using the same column boundaries
 *
 * Works well with structured PDF statements (UBS, ZKB, PostFinance, etc.)
 * that use consistent column layouts.
 */
export async function parsePDF(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise

  // Extract text lines with their x-positions from all pages
  const allLines: { text: string; items: Array<{ str: string; x: number }> }[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    // Group text items into lines by y-position (items on same baseline = same line)
    const lineMap = new Map<number, Array<{ str: string; x: number }>>()
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue
      // Round y to nearest 2px to merge items on the same visual line
      const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y)!.push({
        str: item.str.trim(),
        x: Math.round((item as { transform: number[] }).transform[4]),
      })
    }

    // Sort lines top-to-bottom (higher y = higher on page in PDF coords → reverse)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x)
      const text = items.map((i) => i.str).join("\t")
      allLines.push({ text, items })
    }
  }

  if (allLines.length === 0) {
    throw new Error("No text content found in PDF")
  }

  // Find the best header candidate: line with 3+ tab-separated segments
  // that contains date/amount/description-like words
  const datePatterns = /\b(date|datum|buchung|valuta|booking)\b/i
  const amountPatterns = /\b(amount|betrag|saldo|balance|chf|eur|usd|belastung|gutschrift)\b/i
  const descPatterns = /\b(description|beschreibung|text|buchungstext|details|bezeichnung)\b/i

  let headerIdx = -1
  let bestHeaderScore = 0

  for (let i = 0; i < Math.min(allLines.length, 30); i++) {
    const { items } = allLines[i]
    if (items.length < 3) continue

    let score = items.length // more columns = better candidate
    const lineText = allLines[i].text
    if (datePatterns.test(lineText)) score += 5
    if (amountPatterns.test(lineText)) score += 5
    if (descPatterns.test(lineText)) score += 5

    if (score > bestHeaderScore) {
      bestHeaderScore = score
      headerIdx = i
    }
  }

  // Fallback: use the first line with 3+ segments
  if (headerIdx === -1) {
    headerIdx = allLines.findIndex((l) => l.items.length >= 3)
  }
  if (headerIdx === -1) {
    // Last resort: treat each line as a single-column row
    return parseFlatPdf(allLines.map((l) => l.text))
  }

  // Build headers from the header line
  const headerItems = allLines[headerIdx].items
  const headers = headerItems.map((h, i) => h.str.trim() || `Column_${i + 1}`)

  // Define column boundaries: midpoint between consecutive header x-positions
  const colBounds: number[] = []
  for (let i = 0; i < headerItems.length - 1; i++) {
    colBounds.push(
      Math.round((headerItems[i].x + headerItems[i + 1].x) / 2)
    )
  }

  // Parse data rows using column boundaries
  const rows: Record<string, string>[] = []

  for (let r = headerIdx + 1; r < allLines.length; r++) {
    const { items } = allLines[r]
    if (items.length === 0) continue

    // Assign each text item to the nearest column
    const cells: string[] = new Array(headers.length).fill("")
    for (const item of items) {
      let colIdx = headers.length - 1 // default to last column
      for (let c = 0; c < colBounds.length; c++) {
        if (item.x < colBounds[c]) {
          colIdx = c
          break
        }
      }
      cells[colIdx] = cells[colIdx]
        ? `${cells[colIdx]} ${item.str}`
        : item.str
    }

    const row: Record<string, string> = {}
    let hasContent = false
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = cells[c].trim()
      if (cells[c].trim()) hasContent = true
    }
    if (hasContent) rows.push(row)
  }

  // Filter out rows that look like page footers / totals
  const dataRows = rows.filter((row) => {
    const values = Object.values(row).join(" ").toLowerCase()
    return (
      !values.includes("seite") &&
      !values.includes("page ") &&
      !values.includes("total ") &&
      !values.includes("übertrag")
    )
  })

  return { headers, rows: dataRows }
}

/**
 * Fallback: treat unstructured PDF text as line-per-transaction.
 * Try to extract date, amount, and description from each line using regex.
 */
function parseFlatPdf(
  lines: string[]
): { headers: string[]; rows: Record<string, string>[] } {
  const headers = ["Date", "Description", "Amount"]
  const rows: Record<string, string>[] = []

  const dateRe = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/
  const amountRe = /(-?\d[\d'''.,]*\d)/

  for (const line of lines) {
    const dateMatch = line.match(dateRe)
    if (!dateMatch) continue

    // Find amounts — take the last number-like token as amount
    const amounts = line.match(new RegExp(amountRe.source, "g"))
    if (!amounts || amounts.length === 0) continue
    const amount = amounts[amounts.length - 1]

    // Everything else is the description
    let desc = line
      .replace(dateMatch[0], "")
      .replace(amount, "")
      .replace(/\t+/g, " ")
      .trim()

    if (desc.length < 2) continue

    rows.push({
      Date: dateMatch[1],
      Description: desc,
      Amount: amount,
    })
  }

  return { headers, rows }
}
