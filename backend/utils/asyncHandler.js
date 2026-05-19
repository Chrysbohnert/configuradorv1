/**
 * Wrapper para async route handlers.
 * Evita try/catch repetitivo em cada controller.
 * Qualquer erro rejeitado cai no errorHandler global.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
