// Tag relationships with influence reasons inferred from their source prose.
// Keyword rules (most-specific first) + manual overrides for famous cases.
// Survey/platform/OSM-only evidence stays untagged: it proves THAT people
// love a cuisine, not WHY. Idempotent: re-running re-derives all tags.
// Run: node scripts/tag-reasons.mjs
import { readData, writeData } from './format-data.mjs'

const RULES = [
  ['colonial', /colonial|protectorate|mandate|indenture|occupation|conquistador|settler|qajar-era|french indochina|british raj|colonis|coloniz/],
  ['migration', /diaspora|immigr|emigr|communit|migrat|refugee|resettled|exile|koryo-saram|wives of|laborers|labourers|ancestry|minority|heritage/],
  ['proximity', /shared|border|kinship|neighbour|neighbor|cross-border|senegambia|czechoslovak|one nation|nile valley|riviera|steppe|surrounded by|enclave|closest capitals|levantine/],
  ['trade', /trade|spice route|trading|indian ocean|export|project japan|causeway|imports|importer|imported/],
  ['tourism', /tourist|tourism|resort|ferry to|food trips|vacation/],
  ['soft-power', /k-wave|k-pop|drama|celebrity|chefs|boom|trend|wave|viral|media|world.s best|prized|winning|soft.power|gastrodiplomacy/],
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
  'usa>ireland': 'migration',           // Irish pubs / diaspora
  'usa>cuba': 'migration',              // Cuban exiles in Miami
  'usa>canada': 'proximity',            // poutine across the northern border
  'canada>lebanon': 'migration',        // Ottawa "Shawarma Capital"
  'algeria>france': 'colonial',         // baguette as colonial legacy
  'india>bangladesh': 'proximity',      // shared Bengal / Padma hilsa
  'india>myanmar': 'migration',         // Burmese-Indian khow suey in Kolkata
  'south-korea>north-korea': 'proximity',
  'argentina>paraguay': 'proximity',    // chipá across the border
  'colombia>peru': 'soft-power',        // Peruvian dining boom in Bogotá
  'chile>peru': 'soft-power',           // Peruvian boom in Santiago
  'pakistan>afghanistan': 'proximity',  // Kabuli pulao across the border
  'kenya>tanzania': 'proximity',        // Zanzibar / East African coast
  'kenya>eritrea': 'migration',         // habesha restaurants in Nairobi
  'serbia>north-macedonia': 'proximity',
  'lithuania>georgia': 'soft-power',    // Georgian-food trend in Vilnius
  'venezuela>lebanon': 'migration',
  'ecuador>china': 'migration',         // chifa
  'madagascar>china': 'migration',      // soupe chinoise / misao
  'sri-lanka>china': 'migration',
  'iran>italy': 'soft-power',           // pizza trend among Iranian youth
  'iran>usa': 'soft-power',             // bootleg American fast food
  'israel>japan': 'soft-power',         // sushi-per-capita boom
  'israel>georgia': 'migration',        // Georgian Jews
  'tunisia>italy': 'proximity',         // Mediterranean pasta culture
  'cuba>italy': 'soft-power',           // crisis-born Cuban street pizza
  'austria>vietnam': 'migration',       // Vietnamese phở houses in Vienna
  'ireland>india': 'migration',
  'russia>georgia': 'soft-power',       // Georgian-chain boom in Russia
  'russia>armenia': 'migration',        // Armenian community in Russia
  'south-africa>portugal': 'migration', // Mozambican-Portuguese peri-peri
  'sri-lanka>maldives': 'trade',        // dried Maldive fish
  'jordan>palestine': 'migration',      // majority-Palestinian population
  'belarus>georgia': 'soft-power',      // Georgian-food trend in Minsk
  'jamaica>china': 'migration',         // Chinese-Jamaican since 1854
  'trinidad>guyana': 'proximity',
  'rwanda>india': 'migration',          // Indian community in Kigali
  'iceland>japan': 'soft-power',        // Reykjavik sushi trend
  'iceland>denmark': 'colonial',        // Danish rule legacy (pylsur)
  'malta>italy': 'proximity',           // Sicilian influence
  'angola>brazil': 'soft-power',        // Brazilian cultural ties / churrasco
  'angola>sao-tome': 'proximity',       // Lusophone African table
  'botswana>south-africa': 'proximity',
  'eritrea>italy': 'colonial',          // Italian Eritrea ("Piccola Roma")
  'samoa>new-zealand': 'migration',     // deep NZ-Samoa ties (pisupo)
  'samoa>china': 'migration',           // Samoan chop suey (sapasui)
  'suriname>india': 'migration',        // Indo-Surinamese indenture
  'guyana>india': 'migration',          // Indo-Guyanese indenture
  'guyana>china': 'migration',          // Caribbean-Chinese
  'equatorial-guinea>spain': 'colonial',
  'eswatini>south-africa': 'proximity',
  'vanuatu>france': 'colonial',         // Franco-British condominium
  'north-korea>china': 'proximity',
  'north-korea>italy': 'soft-power',    // Pyongyang state pizzeria
  'djibouti>yemen': 'proximity',        // Red Sea / Yemeni community
  'andorra>portugal': 'migration',      // Portuguese residents in Andorra
  'monaco>italy': 'proximity',          // Ligurian-Italian Monégasque food
  'barbados>india': 'migration',        // Indo-Caribbean roti
  'tonga>china': 'migration',
  'nauru>china': 'migration',
  'kosovo>usa': 'soft-power',           // post-1999 Americophilia
  'netherlands>suriname': 'migration',  // Surinamese-Dutch diaspora
  'mozambique>brazil': 'soft-power',    // Brazilian cultural reach in Lusophone Africa
  'sao-tome>brazil': 'soft-power',
  'guinea-bissau>brazil': 'soft-power',
  'cape-verde>brazil': 'soft-power',
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
