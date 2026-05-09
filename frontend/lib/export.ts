export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, content: string) {
  downloadBlob(filename, new Blob([content], { type: 'text/plain;charset=utf-8' }))
}

export function downloadJsonFile(filename: string, data: unknown) {
  downloadBlob(
    filename,
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  )
}

export function downloadCsvFile(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    downloadTextFile(filename.replace(/\.csv$/i, '.txt'), 'No rows available for export.')
    return
  }

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          const text = value == null ? '' : String(value)
          return `"${text.replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ].join('\n')

  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

export function downloadPageSummary(filename: string, title: string, lines: string[]) {
  const content = [title, `Generated: ${new Date().toLocaleString('en-GB')}`, '', ...lines].join('\n')
  downloadTextFile(filename, content)
}
