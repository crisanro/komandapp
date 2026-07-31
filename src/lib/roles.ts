// Roles del sistema
export const ROLES = ["ADMIN", "MESERO", "COCINA", "CAJERO"] as const;
export type Rol = typeof ROLES[number];

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN:  "Administrador",
  MESERO: "Mesero",
  COCINA: "Cocina",
  CAJERO: "Cajero",
};

export const ROL_COLOR: Record<Rol, string> = {
  ADMIN:  "bg-orange-100 text-orange-600",
  MESERO: "bg-blue-100 text-blue-600",
  COCINA: "bg-purple-100 text-purple-600",
  CAJERO: "bg-green-100 text-green-600",
};

// Qué ve cada rol después de login
export const ROL_REDIRECT: Record<Rol, string> = {
  ADMIN:  "/dashboard",
  MESERO: "/mesas",
  COCINA: "/kds",
  CAJERO: "/caja",
};

// Roles operativos (no admin)
export const ROLES_OPERATIVOS = ["MESERO", "COCINA", "CAJERO"] as const;
export type RolOperativo = typeof ROLES_OPERATIVOS[number];