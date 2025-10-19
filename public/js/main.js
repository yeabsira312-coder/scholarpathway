// ScholarPathway Client-side JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips if Bootstrap is available
  if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  // Newsletter subscription handling
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmission);
  }

  // Contact form handling
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmission);
  }

  // Search form enhancements
  const searchForm = document.querySelector('.search-bar form');
  if (searchForm) {
    const searchInput = searchForm.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.addEventListener('keyup', debounce(handleSearchSuggestions, 300));
    }
  }

  // Smooth scroll for anchor links
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

  // Admin form enhancements
  if (document.body.classList.contains('admin-page')) {
    initializeAdminFeatures();
  }
});

// Newsletter subscription handler
async function handleNewsletterSubmission(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Get form data as URL-encoded string
  const formData = new FormData(form);
  const data = new URLSearchParams(formData);
  
  // Add CSRF token if available
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                   document.querySelector('input[name="_csrf"]')?.value;
  if (csrfToken) {
    data.append('_csrf', csrfToken);
  }
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';
    
    const response = await fetch('/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: data
    });
    
    let result;
    try {
      result = await response.json();
    } catch {
      result = { error: 'Invalid server response' };
    }
    
    if (response.ok) {
      showMessage('success', result.success || 'Successfully subscribed to newsletter! 🎉');
      form.reset();
    } else {
      showMessage('error', result.error || 'Subscription failed. Please try again.');
    }
  } catch (error) {
    console.error('Newsletter submission error:', error);
    showMessage('error', 'Connection failed. Please check your internet and try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Contact form handler
async function handleContactSubmission(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Get form data as URL-encoded string
  const formData = new FormData(form);
  const data = new URLSearchParams(formData);
  
  // Add CSRF token if available
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                   document.querySelector('input[name="_csrf"]')?.value;
  if (csrfToken) {
    data.append('_csrf', csrfToken);
  }
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    const response = await fetch('/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: data
    });
    
    let result;
    try {
      result = await response.json();
    } catch {
      result = { error: 'Invalid server response' };
    }
    
    if (response.ok) {
      showMessage('success', result.success || 'Message sent successfully! We\'ll get back to you within 24-48 hours. 🚀');
      form.reset();
    } else {
      showMessage('error', result.error || 'Failed to send message. Please try again.');
    }
  } catch (error) {
    console.error('Contact form submission error:', error);
    showMessage('error', 'Connection failed. Please check your internet and try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Search suggestions (placeholder for future enhancement)
function handleSearchSuggestions(e) {
  const query = e.target.value.trim();
  
  if (query.length < 3) {
    return;
  }
  
  // Future: Implement search suggestions via API
  console.log('Search query:', query);
}

// Admin-specific features
function initializeAdminFeatures() {
  // Auto-generate slug from title
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  
  if (titleInput && slugInput) {
    titleInput.addEventListener('input', function() {
      if (!slugInput.dataset.modified) {
        slugInput.value = generateSlug(this.value);
      }
    });
    
    slugInput.addEventListener('input', function() {
      this.dataset.modified = 'true';
    });
  }

  // Tag input enhancement
  const tagInputs = document.querySelectorAll('input[name="tags"]');
  tagInputs.forEach(initializeTagInput);

  // Deadline date validation
  const deadlineInput = document.getElementById('deadline');
  if (deadlineInput) {
    deadlineInput.addEventListener('change', function() {
      const selectedDate = new Date(this.value);
      const today = new Date();
      
      if (selectedDate < today) {
        showMessage('warning', 'The deadline date is in the past. Are you sure this is correct?');
      }
    });
  }

  // Confirm delete actions
  document.querySelectorAll('form[action*="/delete"]').forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });
}

// Utility functions
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

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function initializeTagInput(input) {
  // Convert comma-separated input to tag-like display
  input.addEventListener('blur', function() {
    const tags = this.value.split(',').map(tag => tag.trim()).filter(Boolean);
    this.value = tags.join(', ');
  });
}

function showMessage(type, message) {
  // Create and show a toast-like message
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; max-width: 400px;';
  
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Export for potential use in other scripts
window.ScholarPathway = {
  showMessage,
  generateSlug,
  debounce
};