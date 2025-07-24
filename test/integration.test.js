process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('Integration: Complete Deck To Study Flow', () => {
    let sandbox;
    let deckId = 1;
    let cardId = 1;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        deckId = 1;
        cardId = 1;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should create a deck, add cards, and study them', (done) => {
        // Step 1: Create a new deck
        const mockDeck = { id: deckId++, title: 'Integration Test Deck', user_id: 1 };
        const mockInitialCard = { id: cardId++, deck_id: 1, question: '', answer: '' };

        sandbox.stub(db, 'one')
            .onCall(0).resolves(mockDeck)
            .onCall(1).resolves(mockInitialCard);

        chai.request(app)
            .post('/decks/create')
            .send({ title: 'Integration Test Deck' })
            .redirects(0)
            .end((err, res) => {
                expect(res).to.have.status(302);
                expect(res.headers.location).to.equal('/decks/edit/1/card/1');

                // Step 2: Save content to the first card
                const cardToUpdate = {
                    id: 1,
                    deck_id: 1,
                    question: 'What is integration testing?',
                    answer: 'Testing complete user workflows',
                    user_id: 1
                };

                db.one.restore();
                sandbox.stub(db, 'oneOrNone')
                    .onCall(0).resolves(cardToUpdate)
                    .onCall(1).resolves(mockDeck);
                sandbox.stub(db, 'none').resolves();

                chai.request(app)
                    .post('/cards/save/1')
                    .send({
                        question: 'What is integration testing?',
                        answer: 'Testing complete user workflows'
                    })
                    .redirects(0)
                    .end((err, res) => {
                        expect(res).to.have.status(302);

                        // Step 3: Add another card
                        const mockNewCard = { id: cardId++, deck_id: 1, question: '', answer: '' };
                        db.oneOrNone.restore();
                        sandbox.stub(db, 'oneOrNone').resolves(mockDeck);
                        sandbox.stub(db, 'one').resolves(mockNewCard);

                        chai.request(app)
                            .post('/decks/1/cards/add')
                            .redirects(0)
                            .end((err, res) => {
                                expect(res).to.have.status(302);
                                expect(res.headers.location).to.equal('/decks/edit/1/card/2');

                                // Step 4: Study the deck with multiple cards
                                const studyCards = [
                                    { id: 1, deck_id: 1, question: 'What is integration testing?', answer: 'Testing complete user workflows' },
                                    { id: 2, deck_id: 1, question: 'Why use integration tests?', answer: 'To verify features work together' }
                                ];

                                db.oneOrNone.restore();
                                db.one.restore();
                                sandbox.stub(db, 'oneOrNone').resolves(mockDeck);
                                sandbox.stub(db, 'any').resolves(studyCards);

                                chai.request(app)
                                    .get('/decks/study/1')
                                    .end((err, res) => {
                                        expect(res).to.have.status(200);
                                        expect(res.text).to.include('Integration Test Deck');
                                        expect(res.text).to.include('const cards =');
                                        expect(res.text).to.include('What is integration testing?');
                                        expect(res.text).to.include('Testing complete user workflows');
                                        done();
                                    });
                            });
                    });
            });
    });
}); 