// ===== Dashboard JavaScript =====

// Loading Screen Handler
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 400);
        });
        
        // Fallback - hide after 3 seconds max
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 3000);
    }
});

// Toast Notification System
const Toast = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'success', duration = 3000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success(message) {
        this.show(message, 'success');
    },
    
    error(message) {
        this.show(message, 'error');
    }
};

// Guide System
const Guide = {
    steps: [],
    currentStep: 0,
    overlay: null,
    tooltip: null,
    isActive: false,
    
    init(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.createOverlay();
        this.createTooltip();
    },
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'guide-overlay';
        this.overlay.innerHTML = `
            <div class="guide-modal">
                <div class="guide-modal-icon">
                    <i class="fas fa-rocket"></i>
                </div>
                <h2>Welcome to Your Dashboard!</h2>
                <p>Let's take a quick tour to help you get started with managing your Discord server.</p>
                <div class="guide-features">
                    <div class="guide-feature">
                        <i class="fas fa-sliders-h"></i>
                        <span>Configure Modules</span>
                    </div>
                    <div class="guide-feature">
                        <i class="fas fa-shield-alt"></i>
                        <span>Moderation Tools</span>
                    </div>
                    <div class="guide-feature">
                        <i class="fas fa-chart-bar"></i>
                        <span>View Analytics</span>
                    </div>
                    <div class="guide-feature">
                        <i class="fas fa-cog"></i>
                        <span>Server Settings</span>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="Guide.skip()">Skip Tour</button>
                    <button class="btn btn-primary" onclick="Guide.startTour()">
                        <i class="fas fa-play"></i> Start Tour
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    },
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'guide-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
    },
    
    show() {
        if (localStorage.getItem('dashboardTourCompleted')) return;
        this.overlay.classList.add('active');
    },
    
    skip() {
        this.overlay.classList.remove('active');
        localStorage.setItem('dashboardTourCompleted', 'true');
    },
    
    startTour() {
        this.overlay.classList.remove('active');
        this.isActive = true;
        this.showStep(0);
    },
    
    showStep(index) {
        if (index >= this.steps.length) {
            this.complete();
            return;
        }
        
        this.currentStep = index;
        const step = this.steps[index];
        const target = document.querySelector(step.target);
        
        if (!target) {
            this.showStep(index + 1);
            return;
        }
        
        // Highlight target
        target.style.position = 'relative';
        target.style.zIndex = '1000';
        target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)';
        target.style.borderRadius = '12px';
        
        // Position tooltip
        const rect = target.getBoundingClientRect();
        this.tooltip.innerHTML = `
            <div class="guide-title">
                <i class="fas fa-lightbulb"></i>
                ${step.title}
            </div>
            <div class="guide-text">${step.text}</div>
            <div class="guide-actions">
                <span class="guide-progress">${index + 1} of ${this.steps.length}</span>
                <div>
                    ${index > 0 ? '<button class="btn btn-secondary btn-sm guide-btn" onclick="Guide.prev()">Back</button>' : ''}
                    <button class="btn btn-primary btn-sm guide-btn" onclick="Guide.next()">
                        ${index === this.steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        `;
        
        this.tooltip.style.display = 'block';
        this.tooltip.className = `guide-tooltip ${step.position || 'bottom'}`;
        
        // Calculate position
        const tooltipRect = this.tooltip.getBoundingClientRect();
        let top, left;
        
        if (step.position === 'top') {
            top = rect.top - tooltipRect.height - 15;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        } else {
            top = rect.bottom + 15;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        }
        
        // Keep within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        
        this.tooltip.style.top = `${top + window.scrollY}px`;
        this.tooltip.style.left = `${left}px`;
        
        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    
    next() {
        this.clearHighlight();
        this.showStep(this.currentStep + 1);
    },
    
    prev() {
        this.clearHighlight();
        this.showStep(this.currentStep - 1);
    },
    
    clearHighlight() {
        const step = this.steps[this.currentStep];
        if (step) {
            const target = document.querySelector(step.target);
            if (target) {
                target.style.position = '';
                target.style.zIndex = '';
                target.style.boxShadow = '';
            }
        }
    },
    
    complete() {
        this.clearHighlight();
        this.tooltip.style.display = 'none';
        this.isActive = false;
        localStorage.setItem('dashboardTourCompleted', 'true');
        Toast.success('Tour completed! You\'re all set to manage your server.');
    },
    
    reset() {
        localStorage.removeItem('dashboardTourCompleted');
    }
};

// Module Toggle Handler
function initModuleToggles(guildId) {
    document.querySelectorAll('.module-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const module = e.target.dataset.module;
            const enabled = e.target.checked;
            const card = e.target.closest('.module-card');
            
            // Optimistic UI update
            if (enabled) {
                card.classList.add('enabled');
            } else {
                card.classList.remove('enabled');
            }
            
            try {
                const response = await fetch(`/api/guild/${guildId}/modules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module, enabled })
                });
                
                if (response.ok) {
                    Toast.success(`${module.charAt(0).toUpperCase() + module.slice(1)} module ${enabled ? 'enabled' : 'disabled'}`);
                } else {
                    throw new Error('Failed to update');
                }
            } catch (error) {
                console.error('Error:', error);
                // Revert on error
                e.target.checked = !enabled;
                if (!enabled) {
                    card.classList.add('enabled');
                } else {
                    card.classList.remove('enabled');
                }
                Toast.error('Failed to update module. Please try again.');
            }
        });
    });
}

// Smooth Page Transitions
function initPageTransitions() {
    document.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !link.hasAttribute('data-no-transition')) {
                e.preventDefault();
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.2s ease';
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            }
        });
    });
}

// Animate Numbers
function animateNumber(element, target, duration = 1500) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = formatNumber(target);
            clearInterval(timer);
        } else {
            element.textContent = formatNumber(Math.floor(current));
        }
    }, 16);
}

// Format Numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
    
    // Animate stat numbers
    document.querySelectorAll('[data-animate-number]').forEach(el => {
        const target = parseInt(el.dataset.animateNumber);
        if (!isNaN(target)) {
            animateNumber(el, target);
        }
    });
});

// Export for use in other scripts
window.Toast = Toast;
window.Guide = Guide;
window.initModuleToggles = initModuleToggles;
window.formatNumber = formatNumber;
window.animateNumber = animateNumber;
