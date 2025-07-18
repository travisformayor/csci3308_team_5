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

        const next = await db.oneOrNone(
            'SELECT id FROM flashcards WHERE deck_id = $1 AND id > $2 ORDER BY ID ASC LIMIT 1',
            [deckId,cardId]
        );

        const prev = await db.oneOrNone(
            'SELECT id FROM flashcards WHERE deck_id = $1 AND id < $2 ORDER BY ID DESC LIMIT 1',
            [deckId,cardId]
        );
        res.render('pages/edit-deck',{deck,card,
            nextCardId: next ? next.id : null, 
            prevCardId: prev ? prev.id : null
        });
    }
    catch (error) {
        console.error('Error fetching card/deck:', error);
        res.status(404).json({message: 'Error fetching card/deck'});
    }
});

app.post('/decks/:deck_id/cards/add', requireAuth, async (req,res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try{
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId,userId]
        );
        if (!deck){
            return res.status(404).json({message: 'Deck not found or authorized'});
        }
        const newCard = await db.one(
            'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING id',
            [deckId,'','']
        );
        res.redirect(`/decks/edit/${deckId}/card/${newCard.id}`);
    }

    catch (error){
        console.error('Error adding card to deck:', error);
        res.redirect(`/decks/edit/${deckId}`);
    }
});


app.post('/cards/save/:card_id', requireAuth, async (req, res) => {
    const cardId = req.params.card_id;
    const {question, answer} = req.body;
    const userId = req.session.user.id;

    try{
        const card = await db.oneOrNone(
            'SELECT flashcards.*, decks.user_id FROM flashcards JOIN decks ON flashcards.deck_id = decks.id WHERE flashcards.id = $1 AND decks.user_id = $2',
            [cardId, userId]
        );
        if(!card){
            return res.status(404).json({message: 'Card not found or authorized'})
        }

        await db.none(
            'UPDATE flashcards SET question = $1, answer = $2 WHERE id = $3',
            [question,answer,cardId]
        )

        const deckId = card.deck_id;
        res.redirect(`/decks/edit/${deckId}/card/${cardId}`);
    }
    catch(error){
        console.error('Error saving card:', error);
        res.render('pages/edit-deck',{
            error: 'Error saving card. Please try again.',
            card: {
                id: cardId,
                question,
                answer,
                deck_id: card?.deck_id || null
            },
            deck: {id: card?.deck_id || null, title: ''},
            nextCardId: null,
            prevCardId: null
        });
    }
});

app.post('/cards/delete/:card_id', requireAuth, async (req, res) => {
    const cardId = req.params.card_id
    const userId = req.session.user.id;

    try {
        const card = await db.oneOrNone(
            'SELECT * FROM flashcards WHERE id = $1', 
            [cardId]
        );
        if(!card){
            return res.status(404).json({message: "Card not found"});
        }

        const deckId = card.deck_id;

        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if(!deck){
            return res.status(404).json({message: "Deck not found"});
        }

        await db.none(
            'DELETE FROM flashcards WHERE id = $1',
            [cardId]
        );

        res.redirect(`/decks/edit/${deckId}`);
    }
    catch (error) {
        console.error('Error deleting card:', error);
        res.redirect(`/decks/edit/unknown/card/${cardId}`);
    }
});


/*
app.GET('/decks/study/:deck_id', requireAuth, async (req, res) => {
    const deckId = req.params.deck_id;
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
    }

    catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({message: "Error updating card"});
    }
});
*/


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting server and keep connection open for requests
app.listen(3000);
console.log('Server is listening on port 3000');