/** Who is calling and what they may touch. */
import type { AgentGrant, Permission } from "../context.js";
import { AgentError } from "../errors.js";

export interface Principal {
  grant: AgentGrant;
  /** Display name of the agent (token name or OAuth client name). */
  agentName: string;
  via: "mcp" | "rest";
}

export function requireWrite(p: Principal): void {
  if (p.grant.permission !== "read_write")
    throw new AgentError("forbidden", "This connection has read-only access. Ask the user to grant read & write access to the notebook in Datascratch settings.");
}

export function canWrite(permission: Permission): boolean {
  return permission === "read_write";
}
