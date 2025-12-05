const { pool } = require('../config/database');

async function auditLogger(req, res, next) {
  const shouldLog = req.user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  
  if (shouldLog) {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        setImmediate(async () => {
          try {
            const action = `${req.method} ${req.path}`;
            const resourceType = req.path.split('/')[2] || 'unknown';
            
            await pool.query(
              `INSERT INTO audit_logs 
               (user_id, action, resource_type, details, ip_address, user_agent) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                req.user.id,
                action,
                resourceType,
                JSON.stringify({ body: req.body, params: req.params }),
                req.ip,
                req.get('user-agent')
              ]
            );
          } catch (error) {
            console.error('Audit log error:', error);
          }
        });
      }
      
      originalSend.call(this, data);
    };
  }
  
  next();
}

module.exports = { auditLogger };