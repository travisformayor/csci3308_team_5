// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // `req.session` to store or access session
const bcrypt = require('bcryptjs'); // To hash passwords

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************
// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // visible in docker compose logs
        obj.done(); // success, release the connection
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************
// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************


// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};



// Task - Add the API routes here

app.get('/', (req, res) => {
  res.redirect('/login'); //this will call the /anotherRoute route in the API
});

app.get('/login', (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render('pages/login', { message });
});

app.get('/register', (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render('pages/register', { message });
});



app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hash the password
    const hash = await bcrypt.hash(password, 10);

    // Insert email and hashed password into the 'users' table
    await db.none(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, hash]
    );

    // Redirect to login page on success
    req.session.message = 'Successfully registered! You can now log in.';
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);

     if (error.code === '23505') {
      // Unique violation: email already exists
      req.session.message = 'An account with this email already exists.';
    } else {
      req.session.message = 'Registration failed. Please try again.';
    }
    

    // Redirect to register page on failure
    res.redirect('/register');
  }
});



app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.oneOrNone(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      req.session.message = 'Account does not exist, please register.';
      return res.redirect('/register');
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.render('pages/login', {
        message: 'Incorrect email or password.',
      });
    }

    // Save user and API key in session
    req.session.user = user;
    req.session.apiKey = process.env.API_KEY;

    req.session.save(() => {
      res.redirect('/dashboard');
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Server error');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/dashboard'); // fallback if session destruction fails
    }

    // Render logout page with a success message
    res.render('pages/logout', {
      message: 'Logged out successfully.',
    });
  });
});









// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting server and keep connection open for requests
app.listen(3000, '0.0.0.0', () => {
  console.log('Server is listening on port 3000');
});