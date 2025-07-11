# Team Check-In for Sunday, July 6th

## Project Overview
Team 5 is building a flashcard web app for the CSCI 3308 final project

## Product Requirements Document
[View the PRD](planning/PRD.md)

## Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        int id PK
        varchar(100) email
        text password_hash
    }

    decks {
        int id PK
        int user_id FK
        varchar(50) title
    }

    flashcards {
        int id PK
        int deck_id FK
        text question
        text answer
    }

    users ||--o{ decks : "has"
    decks ||--o{ flashcards : "contains"
```

## Figma Mockups
<table style="width:100%">
  <tr>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/home.png" alt="Home" style="width:100%;"/>
    </td>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/signin.png" alt="Sign In" style="width:100%;"/>
    </td>
  </tr>
  <tr>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/register.png" alt="Register" style="width:100%;"/>
    </td>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/dashboard.png" alt="Dashboard" style="width:100%;"/>
    </td>
  </tr>
  <tr>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/dashboard-add-deck.png" alt="Dashboard Add Deck" style="width:100%;"/>
    </td>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/edit-card.png" alt="Edit Deck" style="width:100%;"/>
    </td>
  </tr>
  <tr>
    <td style="padding:10px; width: 50%;">
      <img src="mockup/study-mode.png" alt="Study Mode" style="width:100%;"/>
    </td>
    <td style="padding:10px; width: 50%;">
    </td>
  </tr>
</table>
