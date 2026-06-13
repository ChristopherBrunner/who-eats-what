/** Why a food-love relationship exists (the plan doc's influence categories). */
export type InfluenceReason = 'migration' | 'colonial' | 'proximity' | 'trade' | 'soft-power' | 'tourism'

export interface CuisineRelationship {
  cuisineCountryId: string
  cuisineName: string
  exampleDishes: string[]
  surprisePick: boolean
  /** % of population who like this cuisine (0-100), where survey data exists */
  strength?: number
  /** Short citation for the evidence backing this entry */
  source?: string
  /** Influence category explaining why the relationship exists */
  reason?: InfluenceReason
}

export interface Country {
  name: string
  code: string
  loves: CuisineRelationship[]
}

export type ViewMode = 'loved-by' | 'loves'
