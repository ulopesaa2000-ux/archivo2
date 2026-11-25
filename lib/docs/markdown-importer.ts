// c:\Users\uriel\Downloads\enero 26\archivo2\lib\docs\markdown-importer.ts
import { parseEmbedVideoUrl, type DocBlock } from './types'

export interface ParsedMarkdownGuide {
  title: string | null
  duracionEstimada?: string
  requisitosPrevios: string[]
  blocks: DocBlock[]
}

function makeBlockId(prefix: string, index: number): string {
  return `${prefix}-${index}`
}

function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

/**
 * Convierte contenido Markdown (guiones operativos o Markdown estándar)
 * en bloques tipados `DocBlock[]` listos para renderizar o editar en `/docs`.
 */
export function parseMarkdownToGuide(markdown: string): ParsedMarkdownGuide {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')

  let title: string | null = null
  let duracionEstimada: string | undefined
  const requisitosPrevios: string[] = []
  const blocks: DocBlock[] = []

  let currentSection = ''
  let blockCounter = 0

  let paragraphBuffer: string[] = []
  let orderedItems: Array<{ title: string; description: string }> = []
  let bulletItems: string[] = []
  let checklistItems: string[] = []
  let quoteLines: string[] = []

  const nextId = (prefix: string) => {
    blockCounter += 1
    return makeBlockId(prefix, blockCounter)
  }

  const flushParagraph = () => {
    const text = paragraphBuffer.join('\n').trim()
    paragraphBuffer = []
    if (!text) return
    blocks.push({
      id: nextId('p'),
      type: 'paragraph',
      text,
    })
  }

  const flushOrdered = () => {
    if (orderedItems.length === 0) return
    blocks.push({
      id: nextId('steps'),
      type: 'steps',
      items: orderedItems,
    })
    orderedItems = []
  }

  const flushBullets = () => {
    if (bulletItems.length === 0) return
    const sec = currentSection.toLowerCase()
    if (sec.includes('advertencia')) {
      blocks.push({
        id: nextId('callout'),
        type: 'callout',
        variant: 'warning',
        title: 'Advertencias importantes',
        text: bulletItems.map((item) => `• ${item}`).join('\n'),
      })
    } else if (sec.includes('error')) {
      blocks.push({
        id: nextId('callout'),
        type: 'callout',
        variant: 'info',
        title: 'Errores frecuentes a evitar',
        text: bulletItems.map((item) => `• ${item}`).join('\n'),
      })
    } else {
      blocks.push({
        id: nextId('p'),
        type: 'paragraph',
        text: bulletItems.map((item) => `• ${item}`).join('\n'),
      })
    }
    bulletItems = []
  }

  const flushChecklist = () => {
    if (checklistItems.length === 0) return
    blocks.push({
      id: nextId('check'),
      type: 'checklist',
      title: 'Checklist de verificación',
      items: checklistItems,
    })
    checklistItems = []
  }

  const flushQuote = () => {
    const text = quoteLines.join('\n').trim()
    quoteLines = []
    if (!text) return
    blocks.push({
      id: nextId('quote'),
      type: 'callout',
      variant: 'tip',
      text,
    })
  }

  const flushAll = () => {
    flushParagraph()
    flushOrdered()
    flushBullets()
    flushChecklist()
    flushQuote()
  }

  // En guiones técnicos omitimos secciones internas redundantes para la lectura operativa
  const isSkippedSection = (heading: string) => {
    const lower = heading.toLowerCase()
    return (
      lower.startsWith('guion técnico') ||
      lower.startsWith('texto breve en pantalla') ||
      lower.startsWith('capturas o escenas necesarias')
    )
  }

  let skippingSection = false

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Comentarios HTML (ej. <!-- path -->)
    if (line.startsWith('<!--') && line.endsWith('-->')) {
      continue
    }

    // Título principal H1
    if (line.startsWith('# ') && !title) {
      title = cleanMarkdownInline(line.slice(2))
      continue
    }

    // Headings H2 / H3
    if (line.startsWith('## ')) {
      flushAll()
      const headingText = cleanMarkdownInline(line.slice(3))
      currentSection = headingText
      skippingSection = isSkippedSection(headingText)

      if (
        !skippingSection &&
        !headingText.toLowerCase().startsWith('requisitos previos') &&
        !headingText.toLowerCase().startsWith('advertencia') &&
        !headingText.toLowerCase().startsWith('errores frecuentes') &&
        !headingText.toLowerCase().startsWith('checklist')
      ) {
        blocks.push({
          id: nextId('h2'),
          type: 'heading',
          level: 2,
          text: headingText,
        })
      }
      continue
    }

    if (line.startsWith('### ')) {
      flushAll()
      if (!skippingSection) {
        blocks.push({
          id: nextId('h3'),
          type: 'heading',
          level: 3,
          text: cleanMarkdownInline(line.slice(4)),
        })
      }
      continue
    }

    if (skippingSection) {
      continue
    }

    // Metadatos del encabezado de guion antes del primer H2
    if (!currentSection && line.startsWith('- **')) {
      const durMatch = line.match(/Duración estimada:\*\*\s*(.+)$/i)
      if (durMatch) {
        duracionEstimada = cleanMarkdownInline(durMatch[1])
      }
      const objMatch = line.match(/Objetivo:\*\*\s*(.+)$/i)
      if (objMatch) {
        blocks.push({
          id: nextId('obj'),
          type: 'callout',
          variant: 'tip',
          title: 'Objetivo de la guía',
          text: cleanMarkdownInline(objMatch[1]),
        })
      }
      continue
    }

    // Requisitos previos se capturan como metadato estructurado
    if (currentSection.toLowerCase().startsWith('requisitos previos')) {
      if (line.startsWith('- ')) {
        requisitosPrevios.push(cleanMarkdownInline(line.slice(2)))
      }
      continue
    }

    // Línea vacía separa bloques
    if (!line) {
      flushAll()
      continue
    }

    // Saltar tablas Markdown si quedaran fuera de sección omitida
    if (line.startsWith('|')) {
      continue
    }

    // Imágenes Markdown ![alt](src)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushAll()
      blocks.push({
        id: nextId('img'),
        type: 'image',
        alt: imgMatch[1].trim() || 'Captura de guía',
        src: imgMatch[2].trim(),
      })
      continue
    }

    // URL sola de YouTube / Drive / video directo
    if (/^https?:\/\/\S+$/i.test(line)) {
      const parsedVideo = parseEmbedVideoUrl(line)
      if (parsedVideo.provider !== 'unsupported') {
        flushAll()
        blocks.push({
          id: nextId('vid'),
          type: 'video',
          url: line,
        })
        continue
      }
    }

    // Citas > ...
    if (line.startsWith('> ')) {
      flushParagraph()
      flushOrdered()
      flushBullets()
      flushChecklist()
      quoteLines.push(cleanMarkdownInline(line.slice(2)))
      continue
    }

    // Checklist - [ ] o - [x]
    const checkMatch = line.match(/^- \[[ xX]\]\s+(.+)$/)
    if (checkMatch) {
      flushParagraph()
      flushOrdered()
      flushBullets()
      flushQuote()
      checklistItems.push(cleanMarkdownInline(checkMatch[1]))
      continue
    }

    // Lista numerada 1. ...
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      flushBullets()
      flushChecklist()
      flushQuote()

      const rawItem = orderedMatch[1].trim()
      // Formato típico: **Paso / Pantalla**: descripción
      const boldSplit = rawItem.match(/^\*\*(.+?)\*\*\s*[:·-]?\s*(.*)$/)
      if (boldSplit) {
        orderedItems.push({
          title: cleanMarkdownInline(boldSplit[1]),
          description: cleanMarkdownInline(boldSplit[2]) || cleanMarkdownInline(boldSplit[1]),
        })
      } else {
        const bracketSplit = rawItem.match(/^\[(.+?)\]\s*(.+)$/)
        if (bracketSplit) {
          orderedItems.push({
            title: cleanMarkdownInline(bracketSplit[1]),
            description: cleanMarkdownInline(bracketSplit[2]),
          })
        } else {
          orderedItems.push({
            title: `Paso ${orderedItems.length + 1}`,
            description: cleanMarkdownInline(rawItem),
          })
        }
      }
      continue
    }

    // Bullet - ... o * ...
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph()
      flushOrdered()
      flushChecklist()
      flushQuote()
      bulletItems.push(cleanMarkdownInline(line.slice(2)))
      continue
    }

    // Párrafo normal
    flushOrdered()
    flushBullets()
    flushChecklist()
    flushQuote()
    paragraphBuffer.push(cleanMarkdownInline(line))
  }

  flushAll()

  return {
    title,
    duracionEstimada,
    requisitosPrevios,
    blocks,
  }
}

export function parseMarkdownToDocBlocks(markdown: string): DocBlock[] {
  return parseMarkdownToGuide(markdown).blocks
}
