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
  /** Client-supplied device id (hello.deviceId); only used to tag updates. */
  deviceId: string;
}

export interface AgentPrincipal {
  kind: 'agent';
  tokenId: string;
  userId: string;
  permission: 'read' | 'read_write';
  notebookIds: string[];
}

export type Principal = UserPrincipal | GuestPrincipal | AgentPrincipal;

/** The deviceId recorded for updates made by a principal. */
export function principalDeviceId(p: Principal): string {
  switch (p.kind) {
    case 'user':
    case 'guest':
      return p.deviceId;
    case 'agent':
      return `agent:${p.tokenId}`;
  }
}
