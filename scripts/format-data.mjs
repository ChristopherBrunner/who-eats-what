// Shared reader/writer for src/data/cuisines.json in the repo's canonical
// format: 2-space indent, one line per loves entry, fixed key order.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'cuisines.json')

export function readData() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8'))
}

function loveLine(l) {
  const parts = [
    `"cuisineCountryId": ${JSON.stringify(l.cuisineCountryId)}`,
    `"cuisineName": ${JSON.stringify(l.cuisineName)}`,
    `"exampleDishes": ${JSON.stringify(l.exampleDishes)}`,
    `"surprisePick": ${JSON.stringify(l.surprisePick)}`,
  ]
  if (l.strength !== undefined) parts.push(`"strength": ${l.strength}`)
  if (l.source !== undefined) parts.push(`"source": ${JSON.stringify(l.source)}`)
  if (l.reason !== undefined) parts.push(`"reason": ${JSON.stringify(l.reason)}`)
  return '{ ' + parts.join(', ') + ' }'
}

export function writeData(data) {
  const C = data.countries
  const slugs = Object.keys(C)
  const lines = ['{', '  "countries": {']
  slugs.forEach((slug, i) => {
    const c = C[slug]
    lines.push(`    ${JSON.stringify(slug)}: {`)
    lines.push(`      "name": ${JSON.stringify(c.name)},`)
    lines.push(`      "code": ${JSON.stringify(c.code)},`)
    lines.push('      "loves": [')
    c.loves.forEach((l, j) => {
      lines.push(`        ${loveLine(l)}${j < c.loves.length - 1 ? ',' : ''}`)
    })
    lines.push('      ]')
    lines.push('    }' + (i < slugs.length - 1 ? ',' : ''))
  })
  lines.push('  }', '}')
  writeFileSync(DATA_PATH, lines.join('\n') + '\n')
}
