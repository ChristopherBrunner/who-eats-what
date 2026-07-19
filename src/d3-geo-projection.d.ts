// Minimal typing for the one export we use (package ships no types and
// @types/d3-geo-projection does not exist).
declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo'
  export function geoRobinson(): GeoProjection
}
