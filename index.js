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


app.get('/logout', requireAuth, (req, res) => {
  req.session.destroy(function(err) {
    res.render('pages/home', {
        message: "Logged out successfully!",
    });
  });
});


app.get('/decks', requireAuth, (req, res) => {
    const query = 'SELECT * FROM decks WHERE decks.user_id = $1';
    const userId = req.session.user.id;
    const values = [userId];
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
            id: userId,
            error: true,
            message: err.message,
        });
    });
});

app.get('/decks/create', requireAuth, (req, res) => {
    const query = 'SELECT * FROM decks WHERE decks.user_id = $1';
    const userId = req.session.user.id;
    const values = [userId];
    db.any(query, values)
    .then(decks => {
        console.log(decks)
        res.render('pages/decks', {
            userId: userId,
            decks,

        });
    })
    .catch(err => {
        res.render('pages/decks', {
            courses: [],
            userId: userId,
            error: true,
            message: err.message,
        });
    });
});

app.post('/decks/create', requireAuth, async(req,res)=>{
    const {title} = req.body;
    const userId = req.session.user.id;

    try{
        const result = await db.one(
            'INSERT INTO decks (title, user_id) VALUES ($1, $2) RETURNING *',
            [title, userId]
        );
        res.status(201).json({ message: "Deck created successfully", deck: result });
    }
    catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({message: "Error creating deck"});
    }
});




// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting server and keep connection open for requests
app.listen(3000);
console.log('Server is listening on port 3000');