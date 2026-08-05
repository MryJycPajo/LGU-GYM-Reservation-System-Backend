const rateLimit = require('express-rate-limit');

function jsonRateLimitHandler(req, res, _next, options) {
    const retryAfter = Math.ceil((options.windowMs || 0) / 1000);
    res.status(options.statusCode || 429).json({
        message: options.message || 'Too many requests, please try again later.',
        retryAfterSeconds: retryAfter || undefined
    });
}

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many API requests, please try again later.',
    handler: jsonRateLimitHandler
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts, please try again later.',
    handler: jsonRateLimitHandler
});

const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many chat requests, please try again later.',
    handler: jsonRateLimitHandler
});

module.exports = {
    apiLimiter,
    authLimiter,
    chatLimiter
};