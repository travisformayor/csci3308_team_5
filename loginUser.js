const bcrypt = require('bcryptjs');

async function loginUser(email, password, db, session) {
  const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    session.message = 'Account does not exist, please register.';
    return { redirect: '/register' };
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return { render: 'pages/login', context: { message: 'Incorrect email or password.' } };
  }

  session.user = user;
  session.apiKey = process.env.API_KEY;

  return { redirect: '/dashboard' };
}

module.exports = { loginUser };

