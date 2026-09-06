import type {
  AdminProfile,
  AttachRelationType,
  Caste,
  ConnectionRequestSummary,
  DiscoverProfile,
  LocationEvent,
  PathResult,
  Person,
  PersonDetail,
  PersonSummary,
  Profile,
  Relationship,
  Subcaste,
  TreeVisibility,
  Village,
} from "./types";
import { supabase } from "./supabaseClient";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  profile: {
    me: () => req<Profile>("/api/profile/me"),
    update: (data: { displayName?: string; treeVisibility?: TreeVisibility }) =>
      req<Profile>("/api/profile/me", { method: "PATCH", body: JSON.stringify(data) }),
  },
  discover: () => req<DiscoverProfile[]>("/api/discover"),
  users: {
    searchByEmail: (email: string) =>
      req<{ id: string; displayName: string }[]>(`/api/users/search?email=${encodeURIComponent(email)}`),
  },
  connections: {
    list: () => req<ConnectionRequestSummary[]>("/api/connections"),
    create: (toUserId: string, message?: string) =>
      req("/api/connections", { method: "POST", body: JSON.stringify({ toUserId, message }) }),
    accept: (id: string) => req(`/api/connections/${id}/accept`, { method: "POST" }),
    decline: (id: string) => req(`/api/connections/${id}/decline`, { method: "POST" }),
    remove: (id: string) => req(`/api/connections/${id}`, { method: "DELETE" }),
  },
  admin: {
    users: () => req<AdminProfile[]>("/api/admin/users"),
  },
  villages: {
    list: () => req<Village[]>("/api/villages"),
    create: (data: { name: string; type?: string; color: string; region?: string }) =>
      req<Village>("/api/villages", { method: "POST", body: JSON.stringify(data) }),
  },
  castes: {
    list: () => req<Caste[]>("/api/castes"),
    create: (name: string) => req<Caste>("/api/castes", { method: "POST", body: JSON.stringify({ name }) }),
  },
  subcastes: {
    list: () => req<Subcaste[]>("/api/subcastes"),
    create: (name: string) =>
      req<Subcaste>("/api/subcastes", { method: "POST", body: JSON.stringify({ name }) }),
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
      casteId?: string;
      subcasteId?: string;
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
    update: (
      id: string,
      data: Partial<{
        name: string;
        nameLocal: string;
        dob: string;
        isDeceased: boolean;
        casteId: string;
        subcasteId: string;
        verified: boolean;
        nativeVillageId: string;
        currentVillageId: string;
      }>
    ) => req<Person>(`/api/people/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
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
