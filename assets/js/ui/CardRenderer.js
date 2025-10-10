export class CardRenderer {
    render(card, isFlipped = false, spacedRepetition = null) {
        const elements = {
            japanese: document.getElementById('japaneseWord'),
            reading: document.getElementById('reading'),
            meaning: document.getElementById('meaning'),
            flashcard: document.getElementById('flashcard')
        };
        
        elements.japanese.textContent = card.japanese;
        elements.reading.textContent = card.reading;
        elements.meaning.textContent = card.meaning;
        
        elements.meaning.style.display = isFlipped ? 'block' : 'none';
        elements.flashcard.classList.toggle('flipped', isFlipped);
        
        // Pass spacedRepetition to the indicator updater
        this.updateStateIndicator(card, spacedRepetition);
    }
    
    updateStateIndicator(card, spacedRepetition) {
        const indicator = document.getElementById('stateIndicator');
        const flashcard = document.getElementById('flashcard');
        
        // Guard clause - if no spaced repetition system, bail
        if (!indicator || !flashcard || !spacedRepetition?.getWordStateConfig) {
            console.warn('⚠️ Cannot update state indicator - missing elements or SR system');
            return;
        }
        
        // Get the learning state configuration
        const config = spacedRepetition.getWordStateConfig(card.japanese);
        
        // Update flashcard border color (state-new, state-learning, etc.)
        flashcard.className = `flashcard state-${config.name.toLowerCase()}`;
        
        // Update indicator badge (N, L, R, M)
        indicator.className = `learning-state-indicator state-${config.name.toLowerCase()}`;
        indicator.textContent = config.indicator;
        
        console.log(`🎨 State indicator updated: ${config.name} (${config.indicator}) for ${card.japanese}`);
    }
}