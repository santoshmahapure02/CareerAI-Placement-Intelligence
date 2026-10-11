// utils/asyncHandler.js
// Express 4 does not automatically catch rejected promises thrown inside
// async route handlers - an unhandled rejection there crashes the entire
// Node process (we hit this for real: a bad MySQL datetime format took the
// whole server down instead of returning a 500 to just that one request).
// Wrapping every async handler with this forwards errors to the centralized
// error middleware in server.js instead.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
