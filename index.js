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

// Task - Add the API routes here

//Card and Deck Endpoints
// Import Routes
const deckRoutes = require('./routes/decks');
const cardRoutes = require('./routes/cards');
app.use('/decks', deckRoutes);
app.use('/cards', cardRoutes); 

//Middleware
function requireAuth(req,res,next){
    if (req.session && req.session.user){
        next(); //Proceed to route handler once user is authenticated
    }
    else{
        //Redirect to login if user is not authenticated
        return res.status(401).json({message: "Unauthorized User, Please log in."}); 
    }
}

// POST Deck Endpoints
app.post('/decks/create', requireAuth, async(req,res)=>{
    const {title} = req.body;
    const userId = req.session.user.id;

    try{
        const deck = await db.one(
            'INSERT INTO decks (title, user_id) VALUES ($1, $2) RETURNING *',
            [title, userId]
        );

        const card = await db.one(
            'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING *',
            [deck.id, '', '']
        )

        res.redirect(`/decks/edit/${deck.id}/card/${card.id}`);
    }
    catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({message: "Error creating deck"});
    }
});

app.post('/decks/delete/:deck_id', requireAuth, async (req,res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try{
        const result = await db.result(
            'DELETE FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({message: "Deck not found or unauthorized"});
        }
        res.redirect(`/dashboard`);
    }
    catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({message: "Error deleting deck"});
    }
});


app.get('/decks/edit/:deck_id', requireAuth, async (req, res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try {
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if (!deck) {
            return res.status(404).json({ message: "Deck not found or authorized" });
        }
        const card = await db.oneOrNone(
            'SELECT * FROM flashcards WHERE deck_id = $1 ORDER BY id DESC LIMIT 1',
            [deckId]
        );
        if (!card) {
            return res.status(404).json({message: "No cards found for this deck"});
        }
        res.redirect(`/decks/edit/${deckId}/card/${card.id}`);
    }
    catch (error) {
        console.error('Error fetching deck:', error);
        res.status(500).json({message: "Error fetching deck"});
    }
});

app.get('/decks/edit/:deck_id/card/:card_id', requireAuth, async (req,res) => {
    const deckId = req.params.deck_id;
    const cardId = req.params.card_id;
    const userId = req.session.user.id;

    try {
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        )
        if (!deck) {
            return res.status(404).json({ message: "Deck not found or authorized" });
        }
        const card = await db.oneOrNone(
            'SELECT * FROM flashcards WHERE id = $1 AND deck_id = $2',
            [cardId, deckId]
        );
        if (!card) {
            return res.status(404).json({ message: "No cards found for this deck"});
        }
        res.render('pages/edit-deck',{deck,card,nextCardId, prevCardId});
    }
    catch (error) {
        console.error('Error fetching card/deck:', error);
        res.status(404).json({message: 'Error fetching card/deck'});
    }
    
});

// POST Card Endpoints


app.post('/cards/create', requireAuth, async (req, res) => {
    const {deckId, question, answer} = req.body;
    const userId = req.session.user.id;

    try{
        const result = await db.one(
            'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING *',
            [deckId, question, answer]
        );
        res.status(201).json({ message: "Card created successfully", card: result });
    }
    catch(error){
        console.error('Error creating card:', error);
        res.status(500).json({message: 'Error creating card'})
    }
});

app.post('/cards/edit', requireAuth, async (req, res) => {
    const {question, answer, cardId} = req.body;
    const userId = req.session.user.id;

    try {
        const result = await db.oneOrNone(
            'UPDATE flashcards SET question = $1, answer = $2 WHERE id = $3 AND deck_id IN (SELECT id FROM decks WHERE user_id = $4) RETURNING *',
            [question, answer, cardId, userId]
        );
        if (!result) {
            return res.status(404).json({ message: "Card not found or unauthorized" });
        }
        res.status(200).json({ message: "Card updated successfully", card: result });
    }
    catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({message: "Error updating card"});
    }
});

app.post('/cards/delete', requireAuth, async (req, res) => {
    const cardId = req.body.cardId;
    const userId = req.session.user.id;

    try {
        const result = await db.result(
            'DELETE FROM flashcards WHERE id = $1 AND deck_id IN (SELECT id FROM decks WHERE user_id = $2)',
            [cardId, userId]
        )
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Card not found or unauthorized" });
        }
        res.status(200).json({ message: "Card deleted successfully" });
    }
    catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({message: "Error deleting card"});
    }
});



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting server and keep connection open for requests
app.listen(3000);
console.log('Server is listening on port 3000');