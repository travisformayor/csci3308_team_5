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
-- Create test user with test decks (password: 'password')
INSERT INTO users (email, password_hash) VALUES ('test@test.com', '$2a$10$jjyRDeguXO.utnkSYahPeufYRyKnL3dCaSux1f3A0uQH8FyBlrR8u'); 

-- The user above gets id=1
INSERT INTO decks (user_id, title) VALUES (1, 'Capital Cities');

-- The deck above gets id=1
INSERT INTO flashcards (deck_id, question, answer) VALUES
(1, 'What is the capital of France?', 'Paris'),
(1, 'What is the capital of Japan?', 'Tokyo'),
(1, 'What is the capital of Australia?', 'Canberra'),
(1, 'What is the capital of Canada?', 'Ottawa'),
(1, 'What is the capital of Egypt?', 'Cairo'),
(1, 'What is the capital of Germany?', 'Berlin');

-- Add a second deck with longer text to test text wrapping
INSERT INTO decks (user_id, title) VALUES (1, 'General Science');

-- The deck above gets id=2
INSERT INTO flashcards (deck_id, question, answer) VALUES
(2, 'What was the name of the mission that first landed humans on the Moon?', 'Apollo 11'),
(2, 'What is photosynthesis?', 'The process by which plants use sunlight to make food and produce oxygen.'),
(2, 'What is the boiling point of water at sea level in Celsius?', '100°C'),
(2, 'Who developed the theory of general relativity?', 'Albert Einstein'),
(2, 'What does the Pythagorean theorem state?', 'a² + b² = c² for right triangles.');
