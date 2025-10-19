// Real-time Search Suggestions
class SearchSuggestions {
  constructor(inputSelector, suggestionsSelector) {
    this.input = document.querySelector(inputSelector);
    this.suggestionsContainer = document.querySelector(suggestionsSelector);
    this.currentFocus = -1;
    
    // Sample search keywords and universities (in a real app, this would come from the server)
    this.keywords = [
      // Universities
      'Harvard University', 'Stanford University', 'MIT', 'Oxford University', 'Cambridge University',
      'Yale University', 'Princeton University', 'Columbia University', 'University of Chicago',
      'Harvard', 'Stanford', 'MIT', 'Oxford', 'Cambridge', 'Yale', 'Princeton',
      
      // Countries
      'United States', 'United Kingdom', 'Germany', 'Canada', 'Australia', 'France',
      'Japan', 'Singapore', 'South Korea', 'China', 'Netherlands', 'Switzerland',
      'Sweden', 'Norway', 'Denmark', 'Finland', 'Belgium', 'Austria',
      
      // Subjects and Fields
      'Engineering', 'Medicine', 'Business', 'Computer Science', 'Biology', 'Chemistry',
      'Physics', 'Mathematics', 'Economics', 'Psychology', 'International Relations',
      'Environmental Science', 'Data Science', 'Artificial Intelligence', 'Biotechnology',
      
      // Degree Levels
      'Undergraduate', 'Masters', 'PhD', 'Doctoral', 'Graduate', 'Bachelor',
      
      // Common Search Terms
      'full scholarship', 'merit scholarship', 'need-based', 'government scholarship',
      'research scholarship', 'study abroad', 'international students', 'STEM',
      'women in STEM', 'developing countries', 'excellence scholarship'
    ];
    
    this.init();
  }
  
  init() {
    if (!this.input) return;
    
    // Create suggestions container if it doesn't exist
    if (!this.suggestionsContainer) {
      this.suggestionsContainer = document.createElement('div');
      this.suggestionsContainer.className = 'search-suggestions';
      this.input.parentNode.appendChild(this.suggestionsContainer);
    }
    
    // Add event listeners
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.addEventListener('click', (e) => this.handleClickOutside(e));
  }
  
  handleInput(e) {
    const value = e.target.value.trim();
    
    if (value.length < 2) {
      this.hideSuggestions();
      return;
    }
    
    const matches = this.getMatches(value);
    this.showSuggestions(matches, value);
  }
  
  getMatches(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.keywords
      .filter(keyword => keyword.toLowerCase().includes(lowercaseQuery))
      .slice(0, 8) // Limit to 8 suggestions
      .sort((a, b) => {
        // Prioritize matches that start with the query
        const aStarts = a.toLowerCase().startsWith(lowercaseQuery);
        const bStarts = b.toLowerCase().startsWith(lowercaseQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length; // Then by length
      });
  }
  
  showSuggestions(matches, query) {
    if (matches.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    const html = matches.map((match, index) => {
      const highlightedMatch = this.highlightMatch(match, query);
      return `<div class="suggestion-item" data-value="${match}" data-index="${index}">${highlightedMatch}</div>`;
    }).join('');
    
    this.suggestionsContainer.innerHTML = html;
    this.suggestionsContainer.style.display = 'block';
    this.currentFocus = -1;
    
    // Add click listeners to suggestion items
    this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => this.selectSuggestion(item.dataset.value));
    });
  }
  
  highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }
  
  hideSuggestions() {
    this.suggestionsContainer.style.display = 'none';
    this.currentFocus = -1;
  }
  
  selectSuggestion(value) {
    // Fill input and submit search by redirecting to scholarships page
    this.input.value = value;
    this.hideSuggestions();
    // If the input is inside a form, submit it; otherwise, redirect
    const form = this.input.closest('form');
    if (form) {
      // Append q param and submit
      const url = new URL(form.action || '/scholarships', window.location.origin);
      url.searchParams.set('q', value);
      window.location.href = url.toString();
    } else {
      window.location.href = `/scholarships?q=${encodeURIComponent(value)}`;
    }
  }
  
  handleKeydown(e) {
    const suggestions = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    
    if (suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.currentFocus = Math.min(this.currentFocus + 1, suggestions.length - 1);
        this.updateFocus(suggestions);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.currentFocus = Math.max(this.currentFocus - 1, -1);
        this.updateFocus(suggestions);
        break;
        
      case 'Enter':
        if (this.currentFocus >= 0 && suggestions[this.currentFocus]) {
          e.preventDefault();
          this.selectSuggestion(suggestions[this.currentFocus].dataset.value);
        }
        break;
        
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }
  
  updateFocus(suggestions) {
    suggestions.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentFocus);
    });
  }
  
  handleClickOutside(e) {
    if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
      this.hideSuggestions();
    }
  }
}

// Initialize search suggestions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize for home page search
  if (document.querySelector('input[name="q"]')) {
    new SearchSuggestions('input[name="q"]', '.search-suggestions');
  }
  
  // Initialize for scholarships page search
  if (document.querySelector('#search-query')) {
    new SearchSuggestions('#search-query', '.search-suggestions');
  }
});

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchSuggestions;
}