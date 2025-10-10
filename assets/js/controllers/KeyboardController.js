export class KeyboardController {
    constructor(navigationController, quizController) {
        this.nav = navigationController;
        this.quiz = quizController;
        this.setupListeners();
    }
    
    setupListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    handleKeyPress(event) {
        // Ignore if typing in form
        if (this.isFormInput(event.target)) return;
        
        const keyMap = {
            ' ': () => this.nav.flipCard(),
            'Enter': () => this.nav.flipCard(),
            'ArrowLeft': () => this.nav.previousCard(),
            'ArrowRight': () => this.nav.nextCard(),
            '1': () => this.quiz.selectOption(0),
            '2': () => this.quiz.selectOption(1),
            '3': () => this.quiz.selectOption(2),
            '4': () => this.quiz.selectOption(3),
            'k': () => this.quiz.toggleKana()
        };
        
        const handler = keyMap[event.key];
        if (handler) {
            event.preventDefault();
            handler();
        }
    }
    
    isFormInput(element) {
        return ['TEXTAREA', 'INPUT'].includes(element.tagName) ||
               element.contentEditable === 'true';
    }
}