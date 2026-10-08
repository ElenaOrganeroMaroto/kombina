const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const isRelevantRequest = (method, path) => {
  if (!path.startsWith('/api/')) return false;
  return MUTATING_METHODS.has(method) || (method === 'GET' && path.startsWith('/api/admin/'));
};

const activityLogMiddleware = (req, res, next) => {
  res.on('finish', () => {
    const path = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
    if (!isRelevantRequest(req.method, path)) return;

    const actorId = req.activityActorId || (req.user && req.user._id);
    const actorRole = req.activityActorRole || (req.user && req.user.role);
    const targetId = req.activityTargetId || req.params.userId || req.params.id;
    const record = {
      timestamp: new Date().toISOString(),
      event: 'activity',
      action: `${req.method} ${path}`,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      statusCode: res.statusCode
    };

    if (actorId) record.actorId = String(actorId);
    if (actorRole) record.actorRole = actorRole;
    if (targetId) record.targetId = String(targetId);

    console.log(JSON.stringify(record));
  });

  next();
};

module.exports = activityLogMiddleware;