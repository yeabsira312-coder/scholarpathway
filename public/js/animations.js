// Professional Animations and Interactions for ScholarPathway

document.addEventListener('DOMContentLoaded', function() {
  
  // ========== SCROLL ANIMATIONS ========== //
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all elements that should animate on scroll
    const elementsToAnimate = document.querySelectorAll([
      '.card',
      '.country-item',
      'section',
      '.stats-item',
      '.feature-item'
    ].join(','));

    elementsToAnimate.forEach(el => {
      el.classList.add('fade-in-on-scroll');
      observer.observe(el);
    });
  }

  // ========== NAVBAR SCROLL EFFECT ========== //
  function initNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.backdropFilter = 'blur(20px)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
      } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
      }
    });
  }

  // ========== SEARCH BAR ENHANCEMENTS ========== //
  function initSearchEnhancements() {
    const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
    
    searchInputs.forEach(input => {
      // Add floating label effect
      const label = input.previousElementSibling;
      if (label && label.tagName === 'LABEL') {
        label.style.transition = 'all 0.3s ease';
        
        input.addEventListener('focus', () => {
          label.style.transform = 'translateY(-25px) scale(0.9)';
          label.style.color = 'var(--primary-color)';
        });
        
        input.addEventListener('blur', () => {
          if (!input.value) {
            label.style.transform = 'translateY(0) scale(1)';
            label.style.color = 'var(--text-muted)';
          }
        });
      }

      // Add search suggestions (mock data)
      input.addEventListener('input', debounce(function() {
        if (this.value.length > 2) {
          showSearchSuggestions(this, this.value);
        } else {
          hideSearchSuggestions(this);
        }
      }, 300));
    });
  }

  // ========== CARD HOVER EFFECTS ========== //
  function initCardEffects() {
    const cards = document.querySelectorAll('.card, .scholarship-card, .country-item');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        // Add subtle glow effect
        this.style.boxShadow = '0 20px 60px rgba(0, 85, 255, 0.15)';
        
        // Animate internal elements
        const badge = this.querySelector('.badge-featured');
        if (badge) {
          badge.style.animation = 'pulse 1s infinite';
        }
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.boxShadow = '';
        
        const badge = this.querySelector('.badge-featured');
        if (badge) {
          badge.style.animation = 'pulse 2s infinite';
        }
      });
    });
  }

  // ========== ANIMATED COUNTERS ========== //
  function initAnimatedCounters() {
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.7 });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current).toLocaleString();
      }
    }, 16);
  }

  // ========== FORM ENHANCEMENTS ========== //
  function initFormEnhancements() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        // Add focus/blur animations
        input.addEventListener('focus', function() {
          this.parentNode.classList.add('focused');
          this.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
          this.parentNode.classList.remove('focused');
          this.style.transform = 'scale(1)';
        });

        // Real-time validation feedback
        input.addEventListener('input', function() {
          validateField(this);
        });
      });

      // Enhanced form submission
      form.addEventListener('submit', function(e) {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.classList.add('loading');
          
          // Re-enable after a delay (handled by existing form logic)
          setTimeout(() => {
            submitBtn.classList.remove('loading');
          }, 3000);
        }
      });
    });
  }

  // ========== BUTTON RIPPLE EFFECT ========== //
  function initButtonRipples() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // ========== SEARCH SUGGESTIONS ========== //
  function showSearchSuggestions(input, query) {
    const suggestions = [
      'Computer Science Scholarships',
      'Engineering Graduate Programs',
      'Medical School Funding',
      'Business Administration MBA',
      'International Student Aid',
      'STEM Research Fellowships',
      'Arts and Humanities Grants',
      'PhD Funding Opportunities',
      'Undergraduate Merit Awards',
      'Study Abroad Scholarships'
    ];

    const filtered = suggestions.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (filtered.length === 0) return;

    let dropdown = document.getElementById('search-suggestions');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'search-suggestions';
      dropdown.className = 'search-suggestions';
      input.parentNode.appendChild(dropdown);
    }

    dropdown.innerHTML = filtered.map(suggestion => 
      `<div class="suggestion-item" data-value="${suggestion}">${suggestion}</div>`
    ).join('');

    dropdown.style.display = 'block';
    
    // Add click handlers
    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.value;
        hideSearchSuggestions(input);
        input.closest('form').submit();
      });
    });
  }

  function hideSearchSuggestions(input) {
    const dropdown = document.getElementById('search-suggestions');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  // ========== FIELD VALIDATION ========== //
  function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let message = '';

    switch (type) {
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        message = isValid ? 'Valid email address' : 'Please enter a valid email';
        break;
      case 'text':
        if (field.name === 'name') {
          isValid = value.length >= 2;
          message = isValid ? 'Good!' : 'Name must be at least 2 characters';
        }
        break;
      case 'textarea':
        isValid = value.length >= 10;
        message = isValid ? `${value.length} characters` : 'Message too short';
        break;
    }

    // Update field appearance
    field.classList.remove('is-valid', 'is-invalid');
    if (value) {
      field.classList.add(isValid ? 'is-valid' : 'is-invalid');
    }

    // Show/hide feedback
    let feedback = field.parentNode.querySelector('.form-feedback');
    if (!feedback && message) {
      feedback = document.createElement('div');
      feedback.className = 'form-feedback';
      field.parentNode.appendChild(feedback);
    }
    
    if (feedback) {
      feedback.textContent = message;
      feedback.className = `form-feedback ${isValid ? 'valid-feedback' : 'invalid-feedback'}`;
    }
  }

  // ========== SMOOTH SCROLLING ========== //
  function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ========== LAZY LOADING IMAGES ========== //
  function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // ========== UTILITY FUNCTIONS ========== //
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ========== PERFORMANCE MONITORING ========== //
  function initPerformanceMonitoring() {
    // Monitor page load time
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log(`ScholarPathway loaded in ${loadTime}ms`);
      
      // Show performance badge (only in development)
      if (loadTime > 3000 && window.location.hostname === 'localhost') {
        console.warn('Page load time is slow. Consider optimizing images and scripts.');
      }
    });

    // Monitor form submission times
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', function() {
        this.dataset.submitTime = Date.now();
      });
    });
  }

  // ========== INITIALIZE ALL FEATURES ========== //
  try {
    initScrollAnimations();
    initNavbarScrollEffect();
    initSearchEnhancements();
    initCardEffects();
    initAnimatedCounters();
    initFormEnhancements();
    initButtonRipples();
    initSmoothScrolling();
    initLazyLoading();
    initPerformanceMonitoring();
    
    console.log('ScholarPathway animations initialized successfully! 🎉');
  } catch (error) {
    console.error('Error initializing animations:', error);
  }
});

// ========== CSS FOR DYNAMIC ELEMENTS ========== //
const dynamicStyles = `
<style>
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-top: none;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: all 0.2s ease;
}

.suggestion-item:hover {
  background: #f8f9fa;
  color: var(--primary-color);
  padding-left: 20px;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.form-feedback {
  font-size: 0.875rem;
  margin-top: 0.25rem;
  transition: all 0.3s ease;
}

.valid-feedback {
  color: #28a745;
}

.invalid-feedback {
  color: #dc3545;
}

.focused {
  transform: scale(1.01);
}

img.lazy {
  opacity: 0;
  transition: opacity 0.3s;
}

img.lazy.loaded {
  opacity: 1;
}
</style>
`;

// Inject dynamic styles
document.head.insertAdjacentHTML('beforeend', dynamicStyles);