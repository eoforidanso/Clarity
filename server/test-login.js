import bcrypt from 'bcryptjs';
import db, { initializeDatabase } from './db/database.js';

await initializeDatabase();

const u = db.prepare('SELECT username, password_hash FROM users WHERE username = ?').get('dr.chris');
console.log('User found:', !!u);
if (u) {
  console.log('Hash prefix:', u.password_hash.substring(0, 25));
  const match = bcrypt.compareSync('Pass123!', u.password_hash);
  console.log('Password match:', match);
} else {
  const all = db.prepare('SELECT username FROM users').all();
  console.log('All users:', all.map(u => u.username));
}
