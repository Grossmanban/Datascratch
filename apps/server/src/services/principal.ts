export interface UserPrincipal {
  kind: 'user';
  userId: string;
  deviceId: string;
}

export interface GuestPrincipal {
  kind: 'guest';
  shareId: string;
  ownerId: string;
  permission: 'view' | 'edit';
  target: { kind: 'note' | 'notebook'; id: string };
  /** Namespaced device id (`guest:<base64url of SHA-256(shareId|hello.deviceId)[0..16]>`); only used to tag updates. */
  deviceId: string;
}

/** Who talks to the REST/sync API. Agents go through the agents plugin (plugins/agents-data.ts). */
export type Principal = UserPrincipal | GuestPrincipal;
