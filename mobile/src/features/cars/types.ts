/** The fields of a car document (cars/{id}) this build reads. The full domain
 *  model moves into a shared/ module used by both the web app and this one in
 *  milestone M3; until then this mirrors src/types/index.ts of the web app. */
export interface Car {
  id: string
  ownerId: string
  nickname?: string
  make: string
  model: string
  year?: number
  plate: string
  imageUrl?: string
  /** ISO yyyy-mm-dd */
  testExpiry?: string
  sharedWith: string[]
  createdAt: number
  updatedAt: number
}

export function carDisplayName(car: Car): string {
  return car.nickname || `${car.make} ${car.model}`.trim() || car.plate
}
