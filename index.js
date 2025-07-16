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


const user = {
    username: undefined,
    user_id: undefined,
};


// Task - Add the API routes here

app.get('/login', (req, res) => {
  res.render('pages/login');
});

// Login submission
app.post('/login', async (req, res) => {
    const email = req.body.email;
    const query = 'select * from users where users.email = $1 LIMIT 1';
    const values = [email];

    try {
        let userLogin = await db.one(query, values);
        // check if password from request matches with password in DB
        const match = await bcrypt.compare(req.body.password, userLogin.password);
        if (match == false){
            res.render('pages/login', {
                message: "Incorrect username or password.",
            });
        } 
        else {
            user.username = data.username;
            user.user_id = data.id;

            req.session.user = user;
            req.session.save();

            res.redirect('/');
        }
    }
    catch (err) {
        res.render('/login', {
            message: "Could not find user. Check your spelling or register a new account."
        });
        console.log(err);
    };
});


app.get('/register', (req, res) => {
    res.render('pages/register')
});

app.post('/register', async (req, res) => {
    //check if account w email already exists
    const email = req.body.email;
    const query = 'select * from users where users.email = $1 LIMIT 1';
    const values = [email];
    const exists = 0;

    db.one(query, values)
    .then(data => {
      res.render('/register', {
        message: `An account already exists with the email '${email}'. Try again with a different email.`
      })
      exists = 1;
    })
    .catch(err => {
      console.log(err);
      exists = 0; 
    });

    if (exists == 0) {
        //hash the password using bcrypt library
        const hash = await bcrypt.hash(req.body.password, 10);
        try {
            await db.none(
                `INSERT INTO users (username, email, password_hash) VALUES ('${req.body.username}', '${req.body.email}', '${hash}');`
            );
            res.redirect('/login');
        }
        catch (err) {
            console.log(err);
            res.render('/register', {
                message: "An error occured. Your account has not been registered.",
            });
        }
    }
});


app.get('/', (req,res) => {
    res.render('pages/home');
});


app.get('/logout', (req, res) => {
  req.session.destroy(function(err) {
    res.render('pages/logout', {
        message: "Logged out successfully!",
    });
  });
});


app.get('/decks', (req, res) => {
    const query = 'select * from decks where decks.user_id = $1';
    const values = [user.user_id];
    db.any(query, values)
    .then(decks => {
        console.log(decks)
        res.render('pages/decks', {
            email: user.username,
            decks,
        });
    })
    .catch(err => {
        res.render('pages/decks', {
            courses: [],
            username: user.username,
            error: true,
            message: err.message,
        });
    });
});


app.post('/decks/add', (req, res) => {
    const query = 'select * from decks where decks.user_id = $1';
    const values = [user.user_id];
    db.any(query, values)
    .then(decks => {
        console.log(decks)
        res.render('pages/decks', {
            email: user.username,
            decks,
            new: 1,
        });
    })
    .catch(err => {
        res.render('pages/decks', {
            courses: [],
            username: user.username,
            error: true,
            message: err.message,
        });
    });
});

app.post('/decks/add/confirm', (req, res) => {
    const addquery = 'INSERT INTO decks (name, user_id) VALUES ($1, $2)';
    const addvalues = [req.body.newName, user.user_id];
    try{
        db.none(addquery, addvalues)

        const query = 'select * from decks where decks.user_id = $1';
        const values = [user.user_id];
        db.any(query, values)
        .then(decks => {
            console.log(decks)
            res.render('pages/decks', {
                email: user.username,
                decks,
                message: `${req.body.newName} has been added.`
            });
        })
        .catch(err => {
            res.render('pages/decks', {
                courses: [],
                username: user.username,
                error: true,
                message: err.message,
            });
        });
    }
    catch(err) {
        res.render('pages/decks', {
            courses: [],
            username: user.username,
            error: true,
            message: err.message,
        });
    }
});

app.post('/decks/add/cancel', (req, res) => {
    res.redirect('/decks');
});



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting server and keep connection open for requests
app.listen(3000);
console.log('Server is listening on port 3000');