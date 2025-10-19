// Emergency Form Fallback - No AJAX, just works
document.addEventListener('DOMContentLoaded', function() {
  
  // Add visual feedback to all form submissions
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      
      if (submitBtn) {
        const originalText = submitBtn.textContent || submitBtn.value;
        
        // Show loading state
        if (submitBtn.textContent) {
          submitBtn.textContent = 'Sending...';
        } else {
          submitBtn.value = 'Sending...';
        }
        
        submitBtn.disabled = true;
        
        // Add spinner
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
      }
      
      // Let the form submit normally - no preventDefault
      // This ensures forms work even if JavaScript has issues
    });
  });
  
  // Show success message if form was submitted successfully
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('submitted') === 'true') {
    showSimpleMessage('✅ Form submitted successfully!', 'success');
  }
  
  function showSimpleMessage(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
      <div class="d-flex align-items-center">
        <span>${message}</span>
        <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 5000);
  }
});