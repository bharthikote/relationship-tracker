export type Gender = "male" | "female" | "other";

export type ColorByMode = "none" | "village" | "location" | "caste" | "subcaste";

export type InfoField = "age" | "currentLocation" | "nativeLocation" | "caste" | "subcaste";

export interface LocationEvent {
  villageId: string;
  fromDate?: string;
  event: "birth" | "marriage" | "moved for work" | "other";
}

export interface Person {
  id: string;
  ownerId: string;
  name: string;
  nameLocal?: string;
  gender: Gender;
  dob?: string;
  isDeceased: boolean;
  deathYear?: string;
  photoUrl?: string;
  casteId?: string;
  subcasteId?: string;
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
  ownerId: string;
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

export interface Caste {
  id: string;
  name: string;
}

export interface Subcaste {
  id: string;
  name: string;
}

export type AttachRelationType = "spouse" | "child" | "parent" | "sibling";

export interface PathResult {
  connected: boolean;
  steps: { personId: string; relationLabel: string }[];
  caption: string;
}

export type UserRole = "user" | "super_admin";
export type TreeVisibility = "open" | "private";

export interface Profile {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  treeVisibility: TreeVisibility;
  createdAt: string;
}

export interface AdminProfile extends Profile {
  personCount: number;
}

export interface DiscoverProfile {
  id: string;
  displayName: string;
  personCount: number;
}

export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface ConnectionRequestSummary {
  id: string;
  status: ConnectionStatus;
  message?: string;
  direction: "incoming" | "outgoing";
  fromUser: { id: string; displayName: string };
  toUser: { id: string; displayName: string };
  createdAt: string;
}
