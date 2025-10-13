// Loader Functionality
window.addEventListener('load', function() {
    // Hide loader after page is fully loaded
    setTimeout(function() {
        const loader = document.querySelector('.loader-container');
        loader.classList.add('hidden');
        
        // Enable scrolling on body
        document.body.style.overflow = 'auto';
        
        // Initialize animations after loader is hidden
        initAnimations();
    }, 2000); // 2 seconds for loader animation
});

// Prevent scrolling during loading
document.body.style.overflow = 'hidden';

// GSAP Animations
function initAnimations() {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero section animations
    gsap.from('.hero-content h2', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
    });
    
    gsap.from('.hero-content h1', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
    });
    
    gsap.from('.hero-content p', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.4,
        ease: 'power3.out'
    });
    
    gsap.from('.cta-buttons', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.6,
        ease: 'power3.out'
    });
    
    gsap.from('.hero-image', {
        opacity: 0,
        x: 50,
        duration: 1,
        delay: 0.4,
        ease: 'power3.out'
    });
    
    // Services section animations
    gsap.from('.service-card', {
        scrollTrigger: {
            trigger: '.services',
            start: 'top 80%'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
    
    // About section animations
    gsap.from('.about-text', {
        scrollTrigger: {
            trigger: '.about',
            start: 'top 80%'
        },
        opacity: 0,
        x: -50,
        duration: 0.8,
        ease: 'power3.out'
    });
    
    gsap.from('.about-image', {
        scrollTrigger: {
            trigger: '.about',
            start: 'top 80%'
        },
        opacity: 0,
        x: 50,
        duration: 0.8,
        ease: 'power3.out'
    });
    
    // Testimonial animations
    gsap.from('.testimonial-quote', {
        scrollTrigger: {
            trigger: '.testimonials',
            start: 'top 80%'
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
    });
    
    gsap.from('.testimonial-card', {
        scrollTrigger: {
            trigger: '.testimonials',
            start: 'top 70%'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
    
    // Team section animations
    gsap.from('.team-member', {
        scrollTrigger: {
            trigger: '.team',
            start: 'top 80%'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
    
    // Contact section animations
    gsap.from('.contact-info', {
        scrollTrigger: {
            trigger: '.contact',
            start: 'top 80%'
        },
        opacity: 0,
        x: -50,
        duration: 0.8,
        ease: 'power3.out'
    });
    
    gsap.from('.contact-form', {
        scrollTrigger: {
            trigger: '.contact',
            start: 'top 80%'
        },
        opacity: 0,
        x: 50,
        duration: 0.8,
        ease: 'power3.out'
    });
}

// Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    const overlay = document.querySelector('.overlay');
    const navLinks = document.querySelectorAll('.nav-links li a');
    
    // Toggle mobile menu
    function toggleMenu() {
        nav.classList.toggle('active');
        hamburger.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : 'auto';
    }
    
    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);
    
    // Close menu when clicking on a nav link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
    
    // Close menu on window resize if above mobile breakpoint
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add active class to nav items on scroll
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        document.querySelectorAll('section').forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('nav ul li a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
});