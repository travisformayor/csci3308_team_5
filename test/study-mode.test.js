process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('GET /decks/study/:deck_id', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should load and shuffle cards for study mode', (done) => {
        // Mock deck data
        const mockDeck = {
            id: 42,
            title: 'JavaScript Basics',
            user_id: 1
        };

        // Mock cards data
        const mockCards = [
            { id: 1, deck_id: 42, question: 'What is a variable?', answer: 'A container for data' },
            { id: 2, deck_id: 42, question: 'What is a function?', answer: 'A reusable block of code' },
            { id: 3, deck_id: 42, question: 'What is an array?', answer: 'An ordered list of values' }
        ];

        // Stub the deck ownership check
        sandbox.stub(db, 'oneOrNone').resolves(mockDeck);
        // Stub the cards fetch
        sandbox.stub(db, 'any').resolves(mockCards);

        chai.request(app)
            .get('/decks/study/42')
            .end((err, res) => {
                expect(res).to.have.status(200);

                // Check that deck title is rendered
                expect(res.text).to.include('JavaScript Basics');

                // Check that cards data is embedded as JSON
                expect(res.text).to.include('const cards =');
                expect(res.text).to.include('What is a variable?');
                expect(res.text).to.include('A container for data');
                expect(res.text).to.include('What is a function?');
                expect(res.text).to.include('A reusable block of code');

                done();
            });
    });

    it('should redirect to dashboard if deck has no cards', (done) => {
        const mockDeck = { id: 42, title: 'Empty Deck', user_id: 1 };

        sandbox.stub(db, 'oneOrNone').resolves(mockDeck);
        sandbox.stub(db, 'any').resolves([]); // No cards

        chai.request(app)
            .get('/decks/study/42')
            .redirects(0)
            .end((err, res) => {
                expect(res).to.have.status(302);
                expect(res.headers.location).to.match(/\/dashboard$/);

                done();
            });
    });
}); 