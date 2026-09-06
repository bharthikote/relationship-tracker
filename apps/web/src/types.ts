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
  verified: boolean;
}

export interface PersonSummary {
  id: string;
  name: string;
  gender: Gender;
  isDeceased: boolean;
}

export interface PersonDetail extends Person {
  relations: {
    spouses: PersonSummary[];
    parents: PersonSummary[];
    children: PersonSummary[];
    siblings: PersonSummary[];
  };
}

export type RelationshipType = "spouse" | "parent-child" | "sibling";

export interface Relationship {
  id: string;
  type: RelationshipType;
  personAId: string;
  personBId: string;
  marriageDate?: string;
  isConsanguineous?: boolean;
}

export type VillageType = "village" | "town" | "city";

export interface Village {
  id: string;
  name: string;
  type: VillageType;
  color: string;
  region?: string;
}

export type AttachRelationType = "spouse" | "child" | "parent" | "sibling";

export interface PathResult {
  connected: boolean;
  steps: { personId: string; relationLabel: string }[];
  caption: string;
}
