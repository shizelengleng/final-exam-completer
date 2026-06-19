import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx'

function parseMarkdown(md: string): { type: string; text: string; level?: number; runs?: { text: string; bold?: boolean; italic?: boolean }[] }[] {
  const lines = md.split('\n')
  const blocks: { type: string; text: string; level?: number; runs?: { text: string; bold?: boolean; italic?: boolean }[] }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      blocks.push({ type: 'empty', text: '' })
      continue
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', text: headingMatch[2], level: headingMatch[1].length })
      continue
    }

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Skip separator rows like |---|---|
      if (/^\|[\s-:|]+\|$/.test(trimmed)) continue
      const cells = trimmed.split('|').filter((c) => c.trim() !== '').map((c) => c.trim())
      blocks.push({ type: 'table_row', text: cells.join('\t') })
      continue
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'blockquote', text: trimmed.replace(/^>\s*/, '') })
      continue
    }

    // Checkbox
    if (/^- \[[ x]\]\s/.test(trimmed)) {
      const checked = trimmed[2] === 'x'
      blocks.push({ type: 'checkbox', text: trimmed.replace(/^- \[[ x]\]\s/, ''), runs: [{ text: checked ? '[x] ' : '[ ] ' }, { text: trimmed.replace(/^- \[[ x]\]\s/, '') }] })
      continue
    }

    // List items
    if (/^[-*+]\s/.test(trimmed)) {
      blocks.push({ type: 'list', text: trimmed.replace(/^[-*+]\s/, '') })
      continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({ type: 'list', text: trimmed.replace(/^\d+\.\s/, '') })
      continue
    }

    // Regular paragraph
    blocks.push({ type: 'paragraph', text: trimmed })
  }

  return blocks
}

function parseInlineFormatting(text: string): { text: string; bold?: boolean; italic?: boolean }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean }[] = []
  // Simple regex-based inline formatting
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.substring(lastIndex, match.index) })
    }
    if (match[2]) {
      runs.push({ text: match[2], bold: true })
    } else if (match[3]) {
      runs.push({ text: match[3], italic: true })
    } else if (match[4]) {
      runs.push({ text: match[4] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.substring(lastIndex) })
  }

  return runs.length > 0 ? runs : [{ text }]
}

function getHeadingLevel(level: number) {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1
    case 2: return HeadingLevel.HEADING_2
    case 3: return HeadingLevel.HEADING_3
    case 4: return HeadingLevel.HEADING_4
    default: return HeadingLevel.HEADING_5
  }
}

export async function convertMdToDocx(md: string): Promise<Buffer> {
  const blocks = parseMarkdown(md)
  const children: (Paragraph | Table)[] = []

  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === 'empty') {
      children.push(new Paragraph({ children: [] }))
      i++
      continue
    }

    if (block.type === 'heading') {
      const runs = parseInlineFormatting(block.text)
      children.push(new Paragraph({
        heading: getHeadingLevel(block.level || 1),
        children: runs.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic })),
      }))
      i++
      continue
    }

    // Collect consecutive table rows
    if (block.type === 'table_row') {
      const tableRows: string[][] = []
      while (i < blocks.length && blocks[i].type === 'table_row') {
        tableRows.push(blocks[i].text.split('\t'))
        i++
      }

      if (tableRows.length > 0) {
        const colCount = Math.max(...tableRows.map((r) => r.length))
        const table = new Table({
          rows: tableRows.map((row) =>
            new TableRow({
              children: row.map((cell) =>
                new TableCell({
                  children: [new Paragraph({
                    children: parseInlineFormatting(cell).map((r) =>
                      new TextRun({ text: r.text, bold: r.bold, italics: r.italic, size: 20 })
                    ),
                  })],
                  width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
                })
              ),
            })
          ),
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
        children.push(table)
        children.push(new Paragraph({ children: [] }))
      }
      continue
    }

    if (block.type === 'blockquote') {
      const runs = parseInlineFormatting(block.text)
      children.push(new Paragraph({
        indent: { left: 720 },
        children: [
          new TextRun({ text: '  ', font: 'Segoe UI Emoji' }),
          ...runs.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic, color: '666666' })),
        ],
      }))
      i++
      continue
    }

    if (block.type === 'checkbox') {
      const runs = block.runs || [{ text: block.text }]
      children.push(new Paragraph({
        indent: { left: 360 },
        children: runs.map((r) => new TextRun({ text: r.text, bold: r.bold })),
      }))
      i++
      continue
    }

    if (block.type === 'list') {
      const runs = parseInlineFormatting(block.text)
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: runs.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic })),
      }))
      i++
      continue
    }

    // Regular paragraph
    const runs = parseInlineFormatting(block.text)
    children.push(new Paragraph({
      spacing: { after: 120 },
      children: runs.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic, size: 22 })),
    }))
    i++
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
