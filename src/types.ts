export interface CuisineRelationship {
  cuisineCountryId: string
  cuisineName: string
  exampleDishes: string[]
  surprisePick: boolean
}

export interface Country {
  name: string
  code: string
  loves: CuisineRelationship[]
}

export type ViewMode = 'loved-by' | 'loves'
