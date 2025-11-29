/**
 * Scroll Animations Handler
 * Hardware Store Admin - DASHEL Enterprise
 * Detects when elements enter viewport and triggers animations
 */

class ScrollAnimationManager {
    constructor(options = {}) {
        this.options = {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || '0px 0px -100px 0px',
            animations: options.animations || [
                'fade-up',
                'fade-down',
                'fade-left',
                'fade-right',
                'fade-scale',
                'slide-left',
                'slide-right',
                'scale-in',
                'bounce-in',
                'flip-x',
                'rotate-in',
                'blur-in'
            ]
        };
        
        this.observer = null;
        this.animatedElements = new WeakMap();
        this.init();
    }

    /**
     * Initialize the Intersection Observer
     */
    init() {
        const observerOptions = {
            threshold: this.options.threshold,
            rootMargin: this.options.rootMargin
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements with scroll-animate class
        document.querySelectorAll('.scroll-animate').forEach(element => {
            this.observer.observe(element);
        });
    }

    /**
     * Animate element when it enters viewport
     */
    animateElement(element) {
        // Remove opacity: 0 to start animation
        element.style.opacity = '1';
        
        // Trigger reflow to start animation
        void element.offsetWidth;
        
        // Add active class if it exists
        element.classList.add('active');
    }

    /**
     * Observe new elements (for dynamic content)
     */
    observeNewElements() {
        document.querySelectorAll('.scroll-animate:not([data-observed])').forEach(element => {
            element.setAttribute('data-observed', 'true');
            this.observer.observe(element);
        });
    }

    /**
     * Destroy observer
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

/**
 * Parallax Scroll Handler
 * Creates parallax effect for images as page scrolls
 */
class ParallaxManager {
    constructor(imageSelector = '.parallax-image') {
        this.imageSelector = imageSelector;
        this.images = [];
        this.init();
    }

    /**
     * Initialize parallax
     */
    init() {
        this.images = document.querySelectorAll(this.imageSelector);
        
        if (this.images.length > 0) {
            window.addEventListener('scroll', () => this.handleScroll());
        }
    }

    /**
     * Handle scroll event
     */
    handleScroll() {
        const scrolled = window.pageYOffset;
        
        this.images.forEach(image => {
            // Calculate parallax speed
            const rect = image.getBoundingClientRect();
            const elementScroll = window.pageYOffset + rect.top;
            
            // Apply parallax effect
            const offset = (elementScroll - window.pageYOffset) * 0.5;
            image.style.transform = `translateY(${offset}px)`;
        });
    }

    /**
     * Destroy
     */
    destroy() {
        window.removeEventListener('scroll', () => this.handleScroll());
    }
}

/**
 * Staggered Animation Handler
 * Animates elements in sequence
 */
class StaggeredAnimationManager {
    constructor() {
        this.animations = [];
        this.init();
    }

    /**
     * Initialize staggered animations
     */
    init() {
        // Find all staggered animation groups
        document.querySelectorAll('[data-stagger]').forEach(group => {
            this.createStaggeredAnimation(group);
        });
    }

    /**
     * Create staggered animation for a group
     */
    createStaggeredAnimation(group) {
        const children = group.querySelectorAll('[data-stagger-item]');
        const delay = parseFloat(group.getAttribute('data-stagger-delay')) || 0.1;
        const animation = group.getAttribute('data-stagger-animation') || 'fade-up';

        children.forEach((child, index) => {
            child.classList.add('scroll-animate', animation);
            child.style.animationDelay = `${index * delay}s`;
        });
    }

    /**
     * Destroy
     */
    destroy() {
        // Cleanup if needed
    }
}

/**
 * Counter Animation Handler
 * Animates numbers from 0 to target value
 */
class CounterAnimationManager {
    constructor(counterSelector = '.counter') {
        this.counterSelector = counterSelector;
        this.counters = [];
        this.init();
    }

    /**
     * Initialize counters
     */
    init() {
        this.counters = document.querySelectorAll(this.counterSelector);
        
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        this.counters.forEach(counter => observer.observe(counter));
    }

    /**
     * Animate counter
     */
    animateCounter(counterElement) {
        const target = parseFloat(counterElement.getAttribute('data-target')) || 0;
        const duration = parseFloat(counterElement.getAttribute('data-duration')) || 2000;
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(target * progress);
            counterElement.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }
}

/**
 * Scroll Progress Indicator
 * Shows reading progress as user scrolls
 */
class ScrollProgressIndicator {
    constructor(elementSelector = '#scroll-progress') {
        this.progressElement = document.querySelector(elementSelector);
        this.init();
    }

    /**
     * Initialize
     */
    init() {
        if (this.progressElement) {
            window.addEventListener('scroll', () => this.updateProgress());
        }
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY;
        const scrollPercent = (scrolled / windowHeight) * 100;

        this.progressElement.style.width = scrollPercent + '%';
    }

    /**
     * Destroy
     */
    destroy() {
        window.removeEventListener('scroll', () => this.updateProgress());
    }
}

/**
 * Smooth Scroll to Anchor
 */
class SmoothScrollHandler {
    constructor(linkSelector = 'a[href^="#"]') {
        this.init(linkSelector);
    }

    /**
     * Initialize smooth scroll
     */
    init(linkSelector) {
        document.querySelectorAll(linkSelector).forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                if (href !== '#' && document.querySelector(href)) {
                    e.preventDefault();
                    document.querySelector(href).scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

/**
 * Fade In On Scroll Handler
 * Fades in elements based on scroll position
 */
class FadeInOnScrollHandler {
    constructor() {
        this.init();
    }

    /**
     * Initialize
     */
    init() {
        window.addEventListener('scroll', () => this.handleScroll());
    }

    /**
     * Handle scroll
     */
    handleScroll() {
        const fadeElements = document.querySelectorAll('[data-fade-on-scroll]');
        
        fadeElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top;
            const windowHeight = window.innerHeight;

            // Calculate fade percentage
            const fadeStart = windowHeight;
            const fadeEnd = 0;
            const fadeRange = fadeStart - fadeEnd;
            const position = Math.max(0, Math.min(fadeRange, fadeStart - elementTop));
            const opacity = position / fadeRange;

            element.style.opacity = opacity;
        });
    }
}

/**
 * Image Loading Animation
 * Animates images as they load
 */
class ImageLoadAnimationManager {
    constructor(imageSelector = 'img[data-animate-load]') {
        this.init(imageSelector);
    }

    /**
     * Initialize
     */
    init(imageSelector) {
        document.querySelectorAll(imageSelector).forEach(img => {
            img.addEventListener('load', (e) => {
                e.target.classList.add('image-loaded');
            });

            // If already loaded
            if (img.complete) {
                img.classList.add('image-loaded');
            }
        });
    }
}

/**
 * Lazy Image Manager
 * - Watches images with class `lazy-img` and attribute `data-src` and sets `src` when visible
 * - Adds `data-animate-load` so ImageLoadAnimationManager can pick them up
 */
class LazyImageManager {
    constructor(selector = 'img.lazy-img') {
        this.selector = selector;
        this.observer = null;
        this.init();
    }

    init() {
        const options = { root: null, threshold: 0.1, rootMargin: '0px 0px 200px 0px' };
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);

        document.querySelectorAll(this.selector).forEach(img => this.observer.observe(img));
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src) return;
        // set src to start loading
        img.setAttribute('src', src);
        // mark for image load animations
        img.setAttribute('data-animate-load', 'true');
    }

    observeNew() {
        document.querySelectorAll(this.selector+':not([data-lazy-observed])').forEach(img => {
            img.setAttribute('data-lazy-observed', 'true');
            this.observer.observe(img);
        });
    }

    destroy() {
        if (this.observer) this.observer.disconnect();
    }
}


/**
 * Lightbox Manager
 * - Opens a simple modal when an image with `data-lightbox="true"` is clicked.
 */
class LightboxManager {
    constructor() {
        this.overlay = null;
        this.init();
    }

    init() {
        // create overlay DOM
        this.overlay = document.createElement('div');
        this.overlay.className = 'lightbox-overlay';
        this.overlay.innerHTML = `
            <button class="lightbox-close" aria-label="Close">&times;</button>
            <div class="lightbox-content">
                <img src="" alt="" />
                <div class="lightbox-caption"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // close handlers
        this.overlay.querySelector('.lightbox-close').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // bind click on images with data-lightbox
        this.bindImages();
    }

    bindImages() {
        document.querySelectorAll('img[data-lightbox="true"]').forEach(img => {
            if (img.__lightboxBound) return;
            img.addEventListener('click', (e) => this.open(e.currentTarget));
            img.style.cursor = 'pointer';
            img.__lightboxBound = true;
        });
    }

    open(img) {
        const largeSrc = img.getAttribute('data-src') || img.getAttribute('src');
        const caption = img.getAttribute('data-caption') || img.getAttribute('alt') || '';

        const lightboxImg = this.overlay.querySelector('.lightbox-content img');
        const captionEl = this.overlay.querySelector('.lightbox-caption');

        lightboxImg.setAttribute('src', largeSrc);
        lightboxImg.setAttribute('alt', img.getAttribute('alt') || '');
        captionEl.textContent = caption;

        this.overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    observeNew() {
        this.bindImages();
    }
}

/**
 * Initialize all animations when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    const scrollAnimationManager = new ScrollAnimationManager();
    const parallaxManager = new ParallaxManager('.parallax-image');
    const staggeredAnimationManager = new StaggeredAnimationManager();
    const counterAnimationManager = new CounterAnimationManager('.counter');
    const scrollProgressIndicator = new ScrollProgressIndicator('#scroll-progress');
    const smoothScrollHandler = new SmoothScrollHandler('a[href^="#"]');
    const fadeInOnScrollHandler = new FadeInOnScrollHandler();
    const imageLoadAnimationManager = new ImageLoadAnimationManager('img[data-animate-load]');
    const lazyImageManager = new LazyImageManager('img.lazy-img');
    const lightboxManager = new LightboxManager();

    // Observe new elements dynamically (for AJAX content)
    window.observeNewScrollAnimations = () => {
        scrollAnimationManager.observeNewElements();
        // for images added dynamically
        lazyImageManager.observeNew();
        lightboxManager.observeNew();
    };

    // Re-initialize counters for dynamic content
    window.reinitializeCounters = () => {
        counterAnimationManager.init();
    };

    // Cleanup on page unload (optional)
    window.addEventListener('beforeunload', () => {
        scrollAnimationManager.destroy();
        parallaxManager.destroy();
        scrollProgressIndicator.destroy();
    });

    // Example: Update animations when new content is loaded
    window.addEventListener('contentLoaded', () => {
        scrollAnimationManager.observeNewElements();
    });

    // Log initialization
    console.log('✓ Scroll Animation Managers initialized');
});

/**
 * Utility function to manually trigger animation on element
 */
window.animateElement = (selector, animation = 'fade-up', delay = 0) => {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add('scroll-animate', animation);
        element.style.animationDelay = `${delay}s`;
    }
};

/**
 * Utility function to animate elements in sequence
 */
window.animateSequence = (selector, animation = 'fade-up', delayBetween = 0.1) => {
    document.querySelectorAll(selector).forEach((element, index) => {
        element.classList.add('scroll-animate', animation);
        element.style.animationDelay = `${index * delayBetween}s`;
    });
};
