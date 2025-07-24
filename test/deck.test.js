process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('Deck endpoints', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('POST /decks/create', () => {
        it('should create a new deck with initial card and redirect to edit page', (done) => {
            // Stub the deck creation
            const mockDeck = { id: 42, title: 'New Test Deck', user_id: 1 };
            const mockCard = { id: 99, deck_id: 42, question: '', answer: '' };

            sandbox.stub(db, 'one')
                .onFirstCall().resolves(mockDeck)  // INSERT deck
                .onSecondCall().resolves(mockCard); // INSERT initial card

            chai.request(app)
                .post('/decks/create')
                .send({ title: 'New Test Deck' })
                .redirects(0)
                .end((err, res) => {
                    expect(res).to.have.status(302);
                    expect(res.headers.location).to.equal('/decks/edit/42/card/99');
                    done();
                });
        });
    });
}); 