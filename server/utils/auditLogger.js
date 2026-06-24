export function logAuditEvent(event) {
  const { userId, action, resourceType, resourceId } = event;
  console.log(`[AUDIT] ${action} by user ${userId} on ${resourceType}/${resourceId}`);
}
