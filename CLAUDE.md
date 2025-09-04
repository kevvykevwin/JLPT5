# CLAUDE.md

## Project Overview
This project is a [brief description, e.g., React web app, Node.js API, Python library].

## Build and Test Commands
- To build the project, run: `npm run build`
- To run tests, use: `npm test`
- To check code formatting, run: `npm run lint`

## Coding Style Guidelines
- Use 2-space indentation throughout
- Follow ES6+ JavaScript syntax (use `import/export` modules)
- Prefer single quotes for strings except in JSX (use double quotes)
- Use camelCase for variables and functions
- Write clear, concise comments explaining non-obvious logic

## Branching and Workflow
- Use feature branches off `main` for new features or bug fixes
- Create pull requests for code review before merging
- Run tests and lint checks before merging to `main`

## Common Libraries/Frameworks
- React 18 with hooks
- Express 4 for backend APIs
- Jest for testing

## Useful Commands for Claude
- "Add a new React component"
- "Fix the bug in userAuthentication.js"
- "Write a unit test for the new function"
- "Refactor the API route handler"

## Environment and Setup
- Node.js v18+
- Use `.env` for environment variables (do not commit this file)

## Notes
- Keep functions pure where possible
- Prioritize code clarity over cleverness
- Optimize for readability and maintainability

# JLPT N5 Flashcard App - Development Documentation

## Project Overview
A modular Japanese language learning application built with spaced repetition, adaptive quizzes, and audio pronunciation. Designed specifically for JLPT N5 level vocabulary with 230+ essential words.

## Architecture Decision

The application was refactored from a monolithic structure to a modular architecture to address several critical issues:
- Debugging complexity in 1000+ line single files
- Advanced features failing due to interdependencies  
- Difficulty maintaining and extending functionality
- Poor separation of concerns

## Module Structure

### Core Modules (`/assets/js/core/`)

#### `vocabulary.js`
- **Purpose**: Centralized vocabulary data management
- **Features**: 230+ JLPT N5 words with type classification
- **Exports**: `allFlashcards`, `getWordCounts()`, `getFlashcardsByType()`, `findFlashcard()`

#### `storage.js` 
- **Purpose**: Robust localStorage management with error handling
- **Features**: 
  - Safe storage operations with fallbacks
  - Auto-save functionality to prevent data loss
  - Separate managers for different data types (WordProgressManager, SettingsManager, SessionStatsManager)
- **Key Classes**: `StorageManager`, `WordProgressManager`, `SettingsManager`

#### `spacedRepetition.js`
- **Purpose**: Complete spaced repetition system implementation
- **Features**:
  - Scientific learning intervals (10min → 1hr → 1day → 3days → 1week → 30days)
  - Priority-based card selection algorithm
  - Ease factor management for long-term retention
  - Type-aware interleaved shuffling
- **Key Class**: `SpacedRepetitionManager`

### Feature Modules (`/assets/js/features/`)

#### `audioSystem.js`
- **Purpose**: Professional text-to-speech integration
- **Features**:
  - IndexedDB caching with 30-day expiration
  - Rate limiting and retry logic
  - Comprehensive error handling
  - Google Cloud TTS integration via Netlify functions
- **Key Classes**: `AudioSystemManager`, `AudioCacheManager`, `AudioPlaybackManager`

### Application Coordinator (`/assets/js/`)

#### `app.js`
- **Purpose**: Main application coordinator
- **Features**: 
  - Module initialization and coordination
  - UI state management
  - Event handling and keyboard controls
  - Tab system (Study/Quiz modes)
- **Key Class**: `JLPTFlashcardApp`

## CSS Architecture (`/assets/css/`)

### `base.css`
- Core layout, typography, and foundational styles
- CSS reset and box model normalization
- Japanese text styling with proper font stacks
- Accessibility features (focus rings, high contrast support)

### `components.css` 
- Interactive UI components (flashcards, buttons, hamburger menu)
- Learning state indicators with color coding
- Toggle switches and dropdown menus
- Statistics display components

### `quiz.css`
- Quiz-specific styling and animations
- Multiple quiz modes (Multiple Choice, Mixed Challenge, Kanji Only)
- Interactive feedback states (correct/incorrect)
- Speed challenge timer styling

### `responsive.css`
- Mobile-first responsive design
- Progressive enhancement from 320px to 1200px+
- Landscape orientation optimizations
- High-DPI display support

## Key Features Implemented

### Spaced Repetition System
- **Learning States**: new → learning_1 → learning_2 → review_1 → review_2 → review_3 → mastered
- **Adaptive Intervals**: Based on performance with ease factor adjustments
- **Priority Algorithm**: Considers overdue time, accuracy rate, and learning state

### Audio System
- **TTS Integration**: Google Cloud Text-to-Speech via Netlify functions
- **Smart Caching**: IndexedDB storage with automatic cleanup
- **Error Recovery**: Retry logic with exponential backoff
- **Rate Limiting**: Prevents API abuse

### Quiz Modes
- **Multiple Choice**: Standard 4-option quizzes
- **Mixed Challenge**: Random JP→EN or EN→JP questions  
- **Kanji Only**: Focus on character recognition
- **Reading Toggle**: Hide/show pronunciation hints

### Learning Analytics
- **State Tracking**: Visual indicators for learning progress (N/L/R/M)
- **Statistics Dashboard**: Detailed progress by word type
- **Session Tracking**: Cards studied, accuracy rates, time spent

## Technical Decisions

### Storage Strategy
- **localStorage**: Primary storage with JSON serialization
- **IndexedDB**: Audio cache for larger binary data
- **Error Handling**: Graceful degradation when storage unavailable
- **Auto-save**: Debounced saves every 5 seconds

### Performance Optimizations
- **Lazy Loading**: Modules loaded on-demand
- **Efficient Algorithms**: O(n log n) shuffling, priority queues for due cards
- **DOM Caching**: Minimize repeated queries
- **Animation Optimization**: CSS transforms over position changes

### Accessibility Features
- **Keyboard Navigation**: Full app usable without mouse
- **High Contrast Support**: Automatic detection and styling
- **Reduced Motion**: Respects prefers-reduced-motion
- **Screen Reader Support**: Semantic HTML and ARIA labels

## Development Workflow

### Module Testing Strategy
1. Test individual modules in isolation
2. Verify integration between related modules
3. Test complete user flows (study session, quiz completion)
4. Validate on multiple devices and screen sizes

### Debugging Approach
- **Console Logging**: Each module logs initialization and key operations
- **Error Boundaries**: Modules fail gracefully without crashing entire app
- **State Inspection**: Global `window.jlptApp` for debugging
- **Storage Inspection**: Built-in storage statistics and cleanup tools

### File Dependencies
```
app.js
├── core/vocabulary.js
├── core/storage.js  
├── core/spacedRepetition.js (depends on vocabulary.js, storage.js)
└── features/audioSystem.js (depends on storage.js)
```

## Browser Support
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+
- **Progressive Enhancement**: Core functionality works without advanced features
- **Fallbacks**: localStorage → memory storage, IndexedDB → localStorage

## Deployment Notes
- **Netlify Functions**: TTS API requires Google Cloud credentials in environment
- **Static Assets**: All files served via CDN
- **PWA Support**: Manifest included for offline capability
- **Caching Strategy**: CSS/JS cached, vocabulary data refreshed weekly

## Future Enhancements
- **JLPT N4 Expansion**: Additional vocabulary sets
- **Social Features**: Progress sharing, leaderboards
- **Advanced Analytics**: Learning curve analysis, optimal review timing
- **Audio Improvements**: Multiple voice options, speed control
- **Offline Mode**: Full functionality without internet connection

## Troubleshooting Common Issues

### Audio Not Working
1. Check browser console for TTS API errors
2. Verify Netlify function deployment
3. Test with simple text string
4. Clear IndexedDB cache

### Progress Not Saving  
1. Check localStorage availability in browser console
2. Verify auto-save functionality
3. Test manual save operations
4. Check for storage quota exceeded

### Performance Issues
1. Clear audio cache if using excessive storage
2. Check for memory leaks in console
3. Reduce deck size for slower devices
4. Disable animations on low-end devices

## Contributing Guidelines
- Follow existing code style and patterns
- Test new features in isolation before integration
- Update this documentation for architectural changes
- Maintain backward compatibility with saved progress data
