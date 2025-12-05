function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };