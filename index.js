/******************************************************
 * Section 1 : Import Dependencies
 *****************************************************/
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');

/******************************************************
 * Section 2 : App Config
 *****************************************************/
// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
    // helper for embedding json data in the study mode view
    helpers: {
        json: function (context) {
            return JSON.stringify(context);
        }
    }
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'testsecret',
        saveUninitialized: false,
        resave: false,
    })
);

// Session data available for navbar
app.use((req, res, next) => {
    res.locals.req = req;
    next();
});


//serve static files from public directory
app.use(express.static('public'));


// Test environment
if (process.env.NODE_ENV === 'test') {
    // Make session.save synchronous for tests
    app.use((req, res, next) => {
        req.session.save = (cb) => (typeof cb === 'function' ? cb() : undefined);
        next();
    });

    // Replace res.render with simple HTML response for tests
    app.use((req, res, next) => {
        res.render = (_view, data = {}) => {
            res.status(200).send(`<html><body>${data.message || ''}</body></html>`);
        };
        next();
    });
}

/******************************************************
 * Section 3 : DB Config and Connect
 *****************************************************/
let db;
if (process.env.NODE_ENV === 'test') {
    // Fake DB for test environment
    db = {
        oneOrNone: () => { } // placeholder for sinon to stub
    };
} else {
    const dbConfig = {
        host: 'db',
        port: 5432,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    };

    db = pgp(dbConfig);

    db.connect()
        .then(obj => {
            console.log('Database connection successful');
            obj.done(); // success, release the connection
        })
        .catch(error => {
            console.error('DB ERROR:', error.message || error);
        });
}

/******************************************************
 * Section 4 : API Routes
 *****************************************************/
// Auth Middleware
const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// ==== User Login Endpoints ==== //
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        // User is logged in, redirect to dashboard
        res.redirect('/dashboard');
    } else {
        // User is not logged in, render home page
        res.render('pages/home');
    }
});

app.get('/login', (req, res) => {
    const msg = req.session.message;
    req.session.message = null;
    res.render('pages/login', { message: msg });
});

app.get('/register', (req, res) => {
    const msg = req.session.message;
    req.session.message = null;
    res.render('pages/register', { message: msg });
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.none('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);

        req.session.message = 'Successfully registered! You can now log in.';
        res.redirect('/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.session.message =
            err.code === '23505'
                ? 'An account with this email already exists.'
                : 'Registration failed. Please try again.';
        res.redirect('/register');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

        if (!user) {
            req.session.message = 'Account does not exist, please register.';
            return res.redirect('/register');
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.render('pages/login', { message: 'Incorrect email or password.' });
        }

        req.session.user = user;
        req.session.apiKey = process.env.API_KEY;

        req.session.save(() => res.redirect('/dashboard'));
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        res.render('pages/logout', { message: 'Logged out successfully.' });
    });
});

app.get('/dashboard', auth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Query all the users decks
        const decks = await db.any(
            'SELECT d.id, d.title, COUNT(f.id) as card_count FROM decks d LEFT JOIN flashcards f ON d.id = f.deck_id WHERE d.user_id = $1 GROUP BY d.id, d.title ORDER BY d.id DESC',
            [userId]
        );

        // Format info for dashboard
        const deckInfo = decks.map(deck => ({
            id: deck.id,
            title: deck.title,
            cardCount: parseInt(deck.card_count)
        }));

        res.render('pages/dashboard', {
            decks: deckInfo,
            newDeck: req.query.newDeck === 'true'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('pages/dashboard', {
            decks: [],
            error: 'Error loading decks. Please try again.',
            newDeck: false
        });
    }
});

// ==== Card and Deck Endpoints ==== //
app.post('/decks/create', auth, async (req, res) => {
    const { title } = req.body;
    const userId = req.session.user.id;

    try {
        const deck = await db.one(
            'INSERT INTO decks (title, user_id) VALUES ($1, $2) RETURNING *',
            [title, userId]
        );

        const card = await db.one(
            'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING *',
            [deck.id, '', '']
        );

        res.redirect(`/decks/edit/${deck.id}/card/${card.id}`);
    }
    catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({ message: "Error creating deck" });
    }
});

app.post('/decks/delete/:deck_id', auth, async (req, res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try {
        const cards = await db.none(
            'DELETE FROM flashcards WHERE deck_id = $1',
            [deckId]
        );
        const result = await db.result(
            'DELETE FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Deck not found or unauthorized" });
        }
        res.redirect(`/dashboard`);
    }
    catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({ message: "Error deleting deck" });
    }
});


app.get('/decks/edit/:deck_id', auth, async (req, res) => {
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
            return res.status(404).json({ message: "No cards found for this deck" });
        }
        res.redirect(`/decks/edit/${deckId}/card/${card.id}`);
    }
    catch (error) {
        console.error('Error fetching deck:', error);
        res.status(500).json({ message: "Error fetching deck" });
    }
});

app.get('/decks/edit/:deck_id/card/:card_id', auth, async (req, res) => {
    const deckId = req.params.deck_id;
    const cardId = req.params.card_id;
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
            'SELECT * FROM flashcards WHERE id = $1 AND deck_id = $2',
            [cardId, deckId]
        );
        if (!card) {
            return res.status(404).json({ message: "No cards found for this deck" });
        }

        const next = await db.oneOrNone(
            'SELECT id FROM flashcards WHERE deck_id = $1 AND id > $2 ORDER BY ID ASC LIMIT 1',
            [deckId, cardId]
        );

        const prev = await db.oneOrNone(
            'SELECT id FROM flashcards WHERE deck_id = $1 AND id < $2 ORDER BY ID DESC LIMIT 1',
            [deckId, cardId]
        );
        res.render('pages/edit-deck', {
            deck, card,
            nextCardId: next ? next.id : null,
            prevCardId: prev ? prev.id : null
        });
    }
    catch (error) {
        console.error('Error fetching card/deck:', error);
        res.status(404).json({ message: 'Error fetching card/deck' });
    }
});

app.post('/decks/:deck_id/cards/add', auth, async (req, res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try {
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if (!deck) {
            return res.status(404).json({ message: 'Deck not found or authorized' });
        }
        const newCard = await db.one(
            'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING id',
            [deckId, '', '']
        );
        res.redirect(`/decks/edit/${deckId}/card/${newCard.id}`);
    }

    catch (error) {
        console.error('Error adding card to deck:', error);
        res.redirect(`/decks/edit/${deckId}`);
    }
});

app.post('/cards/save/:card_id', auth, async (req, res) => {
    const cardId = req.params.card_id;
    var { question, answer } = req.body;
    const userId = req.session.user.id;
    
    if (answer == null) answer = '';
    if (question == null) question = '';

    try {
        const card = await db.oneOrNone(
            'SELECT flashcards.*, decks.user_id FROM flashcards JOIN decks ON flashcards.deck_id = decks.id WHERE flashcards.id = $1 AND decks.user_id = $2',
            [cardId, userId]
        );
        if (!card) {
            return res.status(404).json({ message: 'Card not found or authorized' });
        }

        await db.none(
            'UPDATE flashcards SET question = $1, answer = $2 WHERE id = $3',
            [question, answer, cardId]
        );

        const deckId = card.deck_id;
        res.redirect(`/decks/edit/${deckId}/card/${cardId}`);
    }
    catch (error) {
        console.error('Error saving card:', error);
        res.render('pages/edit-deck', {
            error: 'Error saving card. Please try again.',
            card: {
                id: cardId,
                question,
                answer,
                deck_id: card?.deck_id || null
            },
            deck: { id: card?.deck_id || null, title: '' },
            nextCardId: null,
            prevCardId: null
        });
    }
});

app.post('/cards/delete/:card_id', auth, async (req, res) => {
    const cardId = req.params.card_id;
    const userId = req.session.user.id;

    try {
        const card = await db.oneOrNone(
            'SELECT * FROM flashcards WHERE id = $1',
            [cardId]
        );
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }

        const deckId = card.deck_id;

        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );
        if (!deck) {
            return res.status(404).json({ message: "Deck not found" });
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

// ==== Study Mode Endpoint ==== //
app.get('/decks/study/:deck_id', auth, async (req, res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try {
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );

        if (!deck) {
            return res.status(404).json({ message: "Deck not found or not authorized to view" });
        }

        const cards = await db.any(
            'SELECT * FROM flashcards WHERE deck_id = $1',
            [deckId]
        );

        if (cards.length === 0) {
            return res.status(404).json({ message: "No cards found for this deck" });
        }

        // Shuffle the cards
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }

        res.render('pages/study-mode', { deck, cards });
    }
    catch (error) {
        console.error('Error loading study mode:', error);
        res.status(500).json({ message: "Error loading study mode." });
    }
});


// ==== Edit Mode Endpoint ==== //
app.get('/decks/edit/:deck_id', auth, async (req, res) => {
    const deckId = req.params.deck_id;
    const userId = req.session.user.id;

    try {
        const deck = await db.oneOrNone(
            'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, userId]
        );

        if (!deck) {
            return res.status(404).json({ message: "Deck not found or not authorized to view" });
        }

        const cards = await db.any(
            'SELECT * FROM flashcards WHERE deck_id = $1',
            [deckId]
        );

        if (cards.length === 0) {
            try {
                const newCard = await db.one(
                    'INSERT INTO flashcards (deck_id, question, answer) VALUES ($1, $2, $3) RETURNING id',
                    [deckId, '', '']
                );
                res.redirect(`/decks/edit/${deckId}/card/${newCard.id}`);
            }

            catch (error) {
                console.error('Error adding card to deck:', error);
                return res.status(404).json({ message: "Error creating initial card" });
            }
        
        }

        res.render('pages/study-mode', { deck, cards });
    }
    catch (error) {
        console.error('Error loading study mode:', error);
        res.status(500).json({ message: "Error loading study mode." });
    }
});


/******************************************************
 * Section 5 : Exports & Server Start
 *****************************************************/
module.exports = { app, db };

if (require.main === module) {
    app.listen(3000, '0.0.0.0', () => console.log('Server listening on port 3000'));
}
