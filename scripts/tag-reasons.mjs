// Tag relationships with influence reasons inferred from their source prose.
// Keyword rules (most-specific first) + manual overrides for famous cases.
// Survey/platform/OSM-only evidence stays untagged: it proves THAT people
// love a cuisine, not WHY. Idempotent: re-running re-derives all tags.
// Run: node scripts/tag-reasons.mjs
import { readData, writeData } from './format-data.mjs'

const RULES = [
  ['colonial', /colonial|protectorate|mandate|indenture|occupation|conquistador|settler|qajar-era|french indochina|british raj|colonis|coloniz/],
  ['migration', /diaspora|immigr|emigr|community|migrat|refugee|resettled|exile|koryo-saram|wives of|laborers|labourers/],
  ['proximity', /shared|border|kinship|neighbour|neighbor|cross-border|senegambia|czechoslovak|one nation|nile valley|riviera|steppe|surrounded by|enclave|closest capitals|levantine/],
  ['trade', /trade|spice route|trading|indian ocean|export|project japan|causeway|imports/],
  ['tourism', /tourist|tourism|resort|ferry to|food trips|vacation/],
  ['soft-power', /k-wave|k-pop|drama|celebrity|chefs|boom|trend|wave|viral|media|world.s best|prized|winning/],
]
const SURVEY_ONLY = /^(yougov|openstreetmap|statista|glovo|rappi|foodpanda|yemeksepeti|foodora|just eat|deliveroo|pedidosya|talabat|wolt|menulog|jumia|mintel|restaurant association|verdict|irish online)/i

const OVERRIDES = {
  'mexico>lebanon': 'migration',        // al pastor via Lebanese immigrants
  'japan>norway': 'trade',              // Project Japan salmon campaign
  'uk>india': 'colonial',
  'france>algeria': 'migration',        // couscous via Maghrebi communities
  'russia>japan': 'soft-power',         // the "sushi years"
  'south-korea>vietnam': 'soft-power',
  'germany>israel': 'soft-power',       // Berlin restaurant wave
  'peru>china': 'migration',            // chifa
  'peru>japan': 'migration',            // nikkei
  'thailand>laos': 'proximity',         // Isan food is ethnically Lao
  'vietnam>cambodia': 'proximity',
  'finland>estonia': 'tourism',
  'denmark>iceland': 'trade',           // skyr export
  'kenya>ethiopia': 'soft-power',
  'australia>malaysia': 'migration',
}

const data = readData()
const counts = {}
for (const [slug, c] of Object.entries(data.countries)) {
  for (const l of c.loves) {
    delete l.reason
    let reason = OVERRIDES[`${slug}>${l.cuisineCountryId}`]
    if (!reason) {
      const src = l.source
      if (!src || SURVEY_ONLY.test(src)) continue
      const low = src.toLowerCase()
      for (const [r, pat] of RULES) {
        if (pat.test(low)) { reason = r; break }
      }
    }
    if (reason) {
      l.reason = reason
      counts[reason] = (counts[reason] ?? 0) + 1
    }
  }
}

writeData(data)
const total = Object.values(counts).reduce((a, b) => a + b, 0)
console.log(`tagged ${total}:`, counts)
