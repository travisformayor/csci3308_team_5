document.addEventListener('DOMContentLoaded', () => {
    const questionDisplay = document.getElementById('question-display');
    const answerContainer = document.getElementById('answer-container');
    const answerDisplay = document.getElementById('answer-display');
    const prevCardButton = document.getElementById('prev-card');
    const nextCardButton = document.getElementById('next-card');

    let currentCardIndex = 0;

    function displayCard() {
        // `cards` var is passed from the server and rendered in the view's script tag
        if (cards.length === 0) {
            questionDisplay.textContent = 'No cards in this deck.';
            prevCardButton.disabled = true;
            nextCardButton.disabled = true;
            return;
        }

        const card = cards[currentCardIndex];
        questionDisplay.textContent = card.question;
        answerDisplay.textContent = card.answer;
        answerContainer.classList.add('answer-hidden'); // Hide answer by default

        prevCardButton.disabled = currentCardIndex === 0;
        nextCardButton.disabled = currentCardIndex === cards.length - 1;
    }

    function showNextCard() {
        if (currentCardIndex < cards.length - 1) {
            currentCardIndex++;
            displayCard();
        }
    }

    function showPrevCard() {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            displayCard();
        }
    }

    function toggleAnswer() {
        answerContainer.classList.toggle('answer-hidden');
    }

    // Event Listeners
    nextCardButton.addEventListener('click', showNextCard);
    prevCardButton.addEventListener('click', showPrevCard);
    answerContainer.addEventListener('click', toggleAnswer);

    // Initial display
    displayCard();
}); 