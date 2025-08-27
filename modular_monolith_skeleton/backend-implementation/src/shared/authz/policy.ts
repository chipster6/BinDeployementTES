import { Forbidden } from "../errors";
export type Subject = { id: string; roles: string[]; tenantId?: string };
export function enforce(subject: Subject, action: string, _resource: any) {
  // Replace with ABAC/OPA later. For now: require any role.
  if (!subject || !subject.roles || subject.roles.length === 0) throw new Forbidden(`Missing permission for ${action}`);
}
