DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE decks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  title VARCHAR(50) NOT NULL
);

CREATE TABLE flashcards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER NOT NULL REFERENCES decks (id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL
);

-- Add test user and test deck seed data
ALTER TABLE "flashcards" ADD FOREIGN KEY ("deck_id") REFERENCES "decks" ("id") ON DELETE CASCADE;

-- Create test user (password: 'password')
INSERT INTO users (email, password_hash) VALUES ('test@test.com', '$2a$10$jjyRDeguXO.utnkSYahPeufYRyKnL3dCaSux1f3A0uQH8FyBlrR8u'); 

-- The user above gets id=1
INSERT INTO decks (user_id, title) VALUES (1, 'Capital Cities');

-- The deck above gets id=1
INSERT INTO flashcards (deck_id, question, answer) VALUES
(1, 'What is the capital of France?', 'Paris'),
(1, 'What is the capital of Japan?', 'Tokyo'),
(1, 'What is the capital of Australia?', 'Canberra');
