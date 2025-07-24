process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('GET /dashboard', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should fetch and display user decks with card counts', (done) => {
        // Mock decks data from database
        const mockDecks = [
            { id: 1, title: 'JavaScript Basics', card_count: '5' },
            { id: 2, title: 'Node.js Advanced', card_count: '10' },
            { id: 3, title: 'Empty Deck', card_count: '0' }
        ];

        sandbox.stub(db, 'any').resolves(mockDecks);

        chai.request(app)
            .get('/dashboard')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.text).to.include('JavaScript Basics (5 cards)');
                expect(res.text).to.include('Node.js Advanced (10 cards)');
                expect(res.text).to.include('Empty Deck (0 cards)');
                done();
            });
    });
}); 