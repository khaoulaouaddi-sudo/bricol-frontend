// components/roles.ts
export type UserRole = "visitor" | "worker" | "company" | "admin";

export const isWorker  = (r?: string | null) => r === "worker";
export const isCompany = (r?: string | null) => r === "company";
export const isAdmin   = (r?: string | null) => r === "admin";
export const isVisitor = (r?: string | null) => r === "visitor";
