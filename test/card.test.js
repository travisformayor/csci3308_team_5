process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('Card endpoints', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /cards/save/:card_id', () => {
    it('should update card content and redirect back to edit view', (done) => {
      // Mock card data with user ownership check
      const mockCard = {
        id: 123,
        deck_id: 42,
        question: 'Old question',
        answer: 'Old answer',
        user_id: 1
      };

      // Stub the ownership check query
      sandbox.stub(db, 'oneOrNone').resolves(mockCard);
      // Stub the update query
      sandbox.stub(db, 'none').resolves();

      chai.request(app)
        .post('/cards/save/123')
        .send({
          question: 'What is Node.js?',
          answer: 'A JavaScript runtime built on Chrome V8 engine'
        })
        .redirects(0)
        .end((err, res) => {
          expect(res).to.have.status(302);
          expect(res.headers.location).to.equal('/decks/edit/42/card/123');

          // Verify the update was called with correct params
          expect(db.none.calledOnce).to.be.true;
          const updateCall = db.none.firstCall;
          expect(updateCall.args[1]).to.deep.equal([
            'What is Node.js?',
            'A JavaScript runtime built on Chrome V8 engine',
            '123'
          ]);

          done();
        });
    });
  });
}); 