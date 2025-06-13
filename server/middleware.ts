import { Request, Response, NextFunction } from 'express';

// Error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // Default error
  let status = 500;
  let message = 'Internal server error';
  let details = undefined;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    details = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Not found';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
    details = 'Maximum file size is 100MB';
  } else if (err.code === 'ENOENT') {
    status = 404;
    message = 'File not found';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Something went wrong';
    details = undefined;
  }

  res.status(status).json({
    error: true,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    path: req.originalUrl
  });
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Authentication required' 
    });
  }
  next();
}

// Admin authentication middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Authentication required' 
    });
  }
  
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ 
      error: true, 
      message: 'Admin access required' 
    });
  }
  
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    console.log(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
  });
  
  next();
}

// CORS middleware (if needed)
export function corsHandler(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
