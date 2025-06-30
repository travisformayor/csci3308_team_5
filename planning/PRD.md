# Flash Card App: Product Requirements Document

**Authors:** Team 5

## 1. Introduction

*   **Goal**: Build a flashcard web app that meets the CSCI 3308 project requirements.
*   **Target Audience**: Students.

## 2. MVP Features
This section outlines the planned features that will be turned in.

### 2.1 User Authentication
*   Registration page for new accounts.
*   Login page for existing users.
*   Hash passwords before database storage.
*   Maintain user sessions after login.
*   Provide an option for users to sign out (end their session).

### 2.2 Core Application Functionality
*   Post-login Dashboard/home page.
*   CRUD (Create, Read, Update, Delete) operations for Decks and Cards.
*   Each Card belongs to one Deck.
*   Study Mode with random Card shuffling for a selected Deck.
*   In Study Mode, user moves through each Card until they exit.

## 3. Glossary

| Term | Definition |
| :--- | :--- |
| **Deck** | A user-created collection of flashcards. |
| **Card** | A flashcard with a question on top and answer on bottom. Belongs to one Deck. |
| **Session** | Authenticated user state, maintained via cookie. |
| **Study Mode**| Interface for Card review with shuffled cards. |

## 4. Database Overview

Three tables currently planned:
*   Users
*   Decks
*   Cards

## 5. API Endpoints

| Method | Endpoint | Auth Required? | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | No | Process new user registration. |
| `POST` | `/login` | No | Process user login. |
| `GET` | `/logout` | Yes | Process user logout. |
| `POST`| `/decks/create`| Yes | Create a new Deck. |
| `POST`| `/decks/edit` | Yes | Update a Deck's name. |
| `POST`| `/decks/delete`| Yes | Delete a Deck and all of its associated Cards. |
| `POST`| `/cards/create`| Yes | Create a new Card in a Deck. |
| `POST`| `/cards/edit`  | Yes | Update a Card. |
| `POST`| `/cards/delete`| Yes | Delete a Card. |

## 6. Views

| Page Name | Route | Auth Required? | Description |
| :--- | :--- | :--- | :--- |
| **Login** | `/login` | No | Login form. Default for unauthenticated users. |
| **Register** | `/register` | No | Registration form. |
| **Dashboard** | `/` | Yes | Dashboard. Lists user's Decks. Allows users to create a new Deck. |
| **Deck View** | `/decks/:id` | Yes | View Cards in a Deck. Options to study, edit Deck, and manage Cards. |
| **New Card** | `/decks/:id/cards/new` | Yes | Form to create a new Card in a Deck. |
| **Edit Card** | `/cards/:card_id/edit` | Yes | Form to edit an existing Card. |
| **Study Mode** | `/decks/:id/study`| Yes | Study interface for a Deck. |

## 7. User Flows

### User Registration and Login
Home page when not logged in: A dedicated login page that has options for login or register. Register is a different page. Once you register, it redirects to the login page. Login page redirects you to the dashboard (if auth is successful). Dashboard page (and view deck, study deck, and create card pages) all have a nav bar at the top with a Dashboard redirect button and a logout button.

### Create a New Deck
On the dashboard, when logged in, there is a button that says Create Deck. Redirects to a create deck page where the user puts in a name for the deck. Once created, it shows up on the dashboard as empty. Each deck on the dashboard is displayed as a list of Deck names and has a “view” and “study” button. If a Deck is empty, the study button is disabled.

### Delete a Deck
On the dashboard, when logged in, there is a trash can button next to each deck. Clicking it deletes the deck and all of its cards. (Stretch goal: confirmation dialog before deck deletes.)

### Viewing a Deck
On the dashboard, the user clicks the view deck button. Opening the Deck page sends a request for the cards in that Deck. This takes the user to the Deck page. Deck page at the top shows the deck name, the number of cards, and an “Add Card” button. Below that, shows a vertical display of every card with question and answer visible and an edit and delete button for each.

### Create a Card
At the top of the Deck page, the user clicks the “Add Card” button which opens the Create Card page. This page displays the card as fields you can edit (the question text field and the answer text field). Above the card it says what deck it is being added to (can’t edit). There is a save button under the card. Clicking save adds the card to the deck displayed (the deck id is passed to the API call along with the card info). Clicking save without a card id tells the API to create a new card.

### Edit a Card
On the Deck page, the user scrolls to the card they want and clicks the edit button. Clicking the edit button opens the Create Card page, but with the fields pre-populated with the current values. It also has the card id (hidden from the user). Clicking save with a card id tells the API to update a card.

### Delete an Existing Card
On the Deck page, the user scrolls to the card and clicks the delete button. Card is removed from the database. The card list is either updated or the page is reloaded. 

### Study a Deck
On the dashboard, the user clicks the study deck button. A request for all of the cards in the deck is sent as an array and the response is shuffled. Opens the study deck page which shows a card with only the question field visible and the answer field hidden with JS/CSS. A ‘reveal’ button under the card makes the answer field visible. Next card and back card buttons move to other cards by swapping out the values of the question and answer fields and hiding the answer again.

### Logout
Clicking the Logout button in the nav bar ends the session and redirects the user to the login screen.

## 8. Security & Session Management

*   **Session Management**: Use `express-session` with a secure, random secret to sign the session ID cookie.
*   **Password Hashing**: Use `bcrypt` to hash passwords. Compare hashes on login.
*   **SQL Injection Prevention**: Use parameterized queries with `pg-promise`.

## 9. Development Process & DevOps

*   **Git Workflow**: Use a feature-branching workflow. Each user story or feature must be developed in a separate branch. Merge changes to `main` via pull requests, which must be reviewed by at least one other team member.
*   **Project Management**: Track progress using a GitHub Project board with at least four columns (e.g., Backlog, In Progress, In Review, Done). Use epics to organize major features.
*   **Local Development**: Use Docker and `docker-compose` with `web` (Node.js) and `db` (PostgreSQL) services. Initialize local DB schema with `.sql` scripts in `/docker-entrypoint-initdb.d`.
*   **Production Deployment**: Deploy to Render with a managed PostgreSQL database and a Node.js web service.
*   **Production Database Initialization**: Manually initialize production schema by running `.sql` scripts via `psql`.

## 10. Testing

*   **Frameworks**: Mocha, Chai, and `chai-http` for server-side tests.
*   **Execution**: Run tests from `/test` with `npm test`.
*   **Requirements**: Test at least one core data-retrieval endpoint (e.g., fetching user decks).
*   **Authentication Testing**: Use `chai-http` agent to test authenticated routes by persisting session cookies.
*   **User Acceptance Testing**:  Define and execute user acceptance test cases to verify user flows (e.g., sign up, login, creating/deleting Decks, adding/editing/deleting Cards, studying) work as intended from an end-user perspective. A minimum of 4 use cases must be tested.

## 11. Stretch Goals

Features beyond the MVP scope.

*   Easy/Hard card tracking: In Study Mode, allow users to mark Cards 'Easy' or 'Hard', with 'Easy' Cards removed from the current study round and 'Hard' Cards reshuffled until all marked 'Easy'.
*   Persistent study progress: Save in-memory study session to a `jsonb` column in the `Decks` table, allowing users to resume or reset a Deck's study progress.
*   Card tagging cards and then filtering a Deck by tags in Study Mode.
*   Rich text, image, and LaTeX support in Cards.
*   Sharing Decks or Cards with other users.
*   User profiles.

## 12. Documentation & Deliverables

*   **README.md**: Must contain an application description, list of contributors, technology stack, prerequisites, setup instructions, test instructions, and a link to the deployed application.
*   **Final Project Report**: A PDF document that includes:
    *   A complete Use Case Diagram.
    *   Mockups for every application page.
    *   A section detailing each team member's contributions.
    *   Results and observations from User Acceptance Testing.
*   **Video Demo**: A video (5 minutes or less) demonstrating the final project.

## 13. Success Metrics

*   **Functionality:** All MVP features are implemented and working.
*   **Deployment:** Application is deployed to Render and accessible.
*   **Documentation:** All deliverables (README, Project Report, Video) are complete and meet requirements.
*   **Completion:** Successful delivery of final presentation and project report.
