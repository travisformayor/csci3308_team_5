process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const { app, db } = require('../index');

const { expect } = chai;
chai.use(chaiHttp);

describe('POST /login', () => {
  let dbStub;
  let bcryptStub;

  afterEach(() => {
    if (dbStub) dbStub.restore();
    if (bcryptStub) bcryptStub.restore();
  });

  it('should redirect to /register if user does not exist', (done) => {
    dbStub = sinon.stub(db, 'oneOrNone').resolves(null);

    chai.request(app)
      .post('/login')
      .redirects(0)
      .send({ email: 'fake@example.com', password: 'password' })
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.headers).to.have.property('location');
        expect(res.headers.location).to.match(/\/register$/);
        done();
      });
  });

  it('should redirect to login page if password is incorrect', (done) => {
    const fakeUser = {
      email: 'test@example.com',
      password_hash: bcrypt.hashSync('correctpass', 10)
    };

    dbStub = sinon.stub(db, 'oneOrNone').resolves(fakeUser);
    bcryptStub = sinon.stub(bcrypt, 'compare').resolves(false);

    chai.request(app)
      .post('/login')
      .redirects(0)
      .send({ email: 'test@example.com', password: 'wrongpass' })
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.headers).to.have.property('location');
        expect(res.headers.location).to.match(/\/login$/);
        done();
      });
  });

  it('should redirect to /dashboard on successful login', (done) => {
    const fakeUser = {
      id: 1,
      email: 'user@example.com',
      password_hash: bcrypt.hashSync('correct', 10)
    };

    dbStub = sinon.stub(db, 'oneOrNone').resolves(fakeUser);
    bcryptStub = sinon.stub(bcrypt, 'compare').resolves(true);

    chai.request(app)
      .post('/login')
      .redirects(0)
      .send({ email: 'user@example.com', password: 'correct' })
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.headers).to.have.property('location');
        expect(res.headers.location).to.match(/\/dashboard$/);
        done();
      });
  });
});
