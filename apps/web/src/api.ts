import type {
  AttachRelationType,
  LocationEvent,
  PathResult,
  Person,
  PersonDetail,
  PersonSummary,
  Relationship,
  Village,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  villages: {
    list: () => req<Village[]>("/api/villages"),
    create: (data: { name: string; type?: string; color: string; region?: string }) =>
      req<Village>("/api/villages", { method: "POST", body: JSON.stringify(data) }),
  },
  people: {
    list: (params?: { q?: string; villageId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return req<Person[]>(`/api/people${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => req<PersonDetail>(`/api/people/${id}`),
    create: (data: {
      name: string;
      nameLocal?: string;
      gender: string;
      dob?: string;
      isDeceased?: boolean;
      nativeVillageId?: string;
      currentVillageId?: string;
      locationHistory?: LocationEvent[];
      attachTo?: { personId: string; relationType: AttachRelationType };
      marriageDate?: string;
      isConsanguineous?: boolean;
    }) =>
      req<{ person: Person; relationship: Relationship | null }>("/api/people", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    duplicates: (name: string) => req<PersonSummary[]>(`/api/duplicates?name=${encodeURIComponent(name)}`),
  },
  relationships: {
    list: () => req<Relationship[]>("/api/relationships"),
    create: (data: {
      type: string;
      personAId: string;
      personBId: string;
      marriageDate?: string;
      isConsanguineous?: boolean;
    }) => req<Relationship>("/api/relationships", { method: "POST", body: JSON.stringify(data) }),
  },
  path: (from: string, to: string) => req<PathResult>(`/api/path?from=${from}&to=${to}`),
};
