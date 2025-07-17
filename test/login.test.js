// test/login.test.js

const { expect } = require('chai');
const bcrypt = require('bcryptjs');
const { loginUser } = require('../loginUser'); // adjust path

describe('loginUser()', () => {
  it('should redirect to /dashboard on successful login', async () => {
    const password = 'testpass';
    const hash = await bcrypt.hash(password, 10);
    
    const mockDb = {
      oneOrNone: async () => ({ email: 'test@example.com', password_hash: hash })
    };
    const session = {};

    const result = await loginUser('test@example.com', password, mockDb, session);

    expect(result.redirect).to.equal('/dashboard');
    expect(session.user.email).to.equal('test@example.com');
  });

  it('should redirect to /register if account does not exist', async () => {
    const mockDb = {
      oneOrNone: async () => null
    };
    const session = {};

    const result = await loginUser('noone@example.com', 'whatever', mockDb, session);

    expect(result.redirect).to.equal('/register');
    expect(session.message).to.equal('Account does not exist, please register.');
  });

  it('should render login page if password is incorrect', async () => {
    const correctHash = await bcrypt.hash('rightpass', 10);

    const mockDb = {
      oneOrNone: async () => ({ email: 'test@example.com', password_hash: correctHash })
    };
    const session = {};

    const result = await loginUser('test@example.com', 'wrongpass', mockDb, session);

    expect(result.render).to.equal('pages/login');
    expect(result.context.message).to.equal('Incorrect email or password.');
  });





  it('should fail if email is empty', async () => {
    const mockDb = {
      oneOrNone: async () => null
    };
    const session = {};

    const result = await loginUser('', 'somepass', mockDb, session);

    expect(result.redirect).to.equal('/register');
    expect(session.message).to.equal('Account does not exist, please register.');
  });

  it('should render login page if password is empty', async () => {
    const passwordHash = await bcrypt.hash('nonempty', 10);

    const mockDb = {
      oneOrNone: async () => ({ email: 'test@example.com', password_hash: passwordHash })
    };
    const session = {};

    const result = await loginUser('test@example.com', '', mockDb, session);

    expect(result.render).to.equal('pages/login');
    expect(result.context.message).to.equal('Incorrect email or password.');
  });

  it('should reject invalid email formats if validated', async () => {
    const session = {};
    const mockDb = {
      oneOrNone: async () => null
    };

    const result = await loginUser('not-an-email', 'password123', mockDb, session);

    expect(result.redirect).to.equal('/register');
  });


  


});

