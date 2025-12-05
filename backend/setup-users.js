// setup-users.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function setupUsers() {
  try {
    console.log('🔐 Setting up user passwords...\n');

    // Generate hash for "Admin123!"
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated password hash:', hash);

    // Update admin
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'admin@infernafitness.com']
    );
    console.log('✅ Updated admin@infernafitness.com');

    // Update instructor
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'instructor@infernafitness.com']
    );
    console.log('✅ Updated instructor@infernafitness.com');

    // Verify
    const result = await pool.query('SELECT email, role FROM users');
    console.log('\n📋 Current users:');
    result.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    console.log('\n✅ Setup complete! Password for all users: Admin123!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupUsers();