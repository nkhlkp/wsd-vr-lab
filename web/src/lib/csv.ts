// Minimal CSV helpers for roll-number uploads and credential downloads.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim())) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim())) rows.push(row)
  return rows.map((r) => r.map((f) => f.trim()))
}

/** Reads `roll_no,name` rows. A header row is detected if it mentions "roll". */
export function parseStudentCsv(text: string): { roll_no: string; name: string }[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  let rollCol = 0
  let nameCol = 1
  const header = rows[0].map((h) => h.toLowerCase())
  if (header.some((h) => h.includes('roll'))) {
    rollCol = header.findIndex((h) => h.includes('roll'))
    const n = header.findIndex((h) => h.includes('name'))
    nameCol = n === -1 ? -1 : n
    rows.shift()
  }
  return rows
    .map((r) => ({ roll_no: r[rollCol] ?? '', name: nameCol >= 0 ? r[nameCol] ?? '' : '' }))
    .filter((s) => s.roll_no)
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((v) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
    .join('\n')
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
