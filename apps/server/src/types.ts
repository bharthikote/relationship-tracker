export type Gender = "male" | "female" | "other";

export interface LocationEvent {
  villageId: string;
  fromDate?: string;
  event: "birth" | "marriage" | "moved for work" | "other";
}

export interface Person {
  id: string;
  name: string;
  nameLocal?: string;
  gender: Gender;
  dob?: string;
  isDeceased: boolean;
  photoUrl?: string;
  nativeVillageId?: string;
  currentVillageId?: string;
  locationHistory: LocationEvent[];
  addedBy?: string;
  lastEditedBy?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType = "spouse" | "parent-child" | "sibling";

export interface Relationship {
  id: string;
  type: RelationshipType;
  personAId: string;
  personBId: string;
  marriageDate?: string;
  isConsanguineous?: boolean;
  createdAt: string;
}

export type VillageType = "village" | "town" | "city";

export interface Village {
  id: string;
  name: string;
  type: VillageType;
  color: string;
  region?: string;
}

export interface DbSchema {
  people: Person[];
  relationships: Relationship[];
  villages: Village[];
}
