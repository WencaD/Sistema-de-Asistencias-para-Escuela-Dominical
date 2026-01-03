// ===== MAIN.JS - EFECTOS Y FUNCIONALIDADES GENERALES =====

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== SMOOTH SCROLLING =====
    // Configurar smooth scrolling para todos los enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const offsetTop = target.offsetTop - 80; // Compensar navbar fijo
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== NAVBAR EFFECTS =====
    // Cambiar el navbar al hacer scroll
    const navbar = document.querySelector('.navbar');
    let scrolled = false;

    function updateNavbar() {
        const scrollTop = window.pageYOffset;
        
        if (scrollTop > 50 && !scrolled) {
            navbar.classList.add('scrolled');
            scrolled = true;
        } else if (scrollTop <= 50 && scrolled) {
            navbar.classList.remove('scrolled');
            scrolled = false;
        }
    }

    window.addEventListener('scroll', updateNavbar);

    // ===== SCROLL ANIMATIONS =====
    // Configurar IntersectionObserver para animaciones en scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Aplicar animación a elementos específicos
    const animatedElements = document.querySelectorAll('.card, .hero-content, .section-title');
    animatedElements.forEach(element => {
        // Solo si el elemento no está en el viewport inicialmente
        const rect = element.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.75) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        }
        observer.observe(element);
    });

    // ===== LOADING EFFECTS =====
    // Efecto de carga suave para imágenes
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        
        if (img.complete) {
            img.style.opacity = '1';
        } else {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
        }
    });

    // ===== CARD HOVER EFFECTS =====
    // Añadir efectos especiales a las cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // ===== PARALLAX EFFECT =====
    // Efecto parallax suave para la sección hero
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const speed = scrolled * 0.5;
            heroSection.style.transform = `translateY(${speed}px)`;
        });
    }

    // ===== TESTIMONIALS CAROUSEL =====
    // Auto-rotate para testimoniales si existen
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    if (testimonialCards.length > 0) {
        let currentTestimonial = 0;
        
        setInterval(() => {
            testimonialCards.forEach((card, index) => {
                card.style.opacity = index === currentTestimonial ? '1' : '0.7';
                card.style.transform = index === currentTestimonial ? 'scale(1)' : 'scale(0.95)';
            });
            
            currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
        }, 3000);
    }

    // ===== FORM ENHANCEMENTS =====
    // Mejoras para formularios
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });

    // ===== STATS COUNTER =====
    // Animación de contadores si existen
    const counters = document.querySelectorAll('.counter');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000; // 2 segundos
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });

    // ===== BUTTON EFFECTS =====
    // Efectos especiales para botones IEBM
    const iebmButtons = document.querySelectorAll('.btn-iebm');
    iebmButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Crear efecto ripple
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
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

    // ===== MOBILE MENU =====
    // Mejorar comportamiento del menú móvil
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navbarToggler.addEventListener('click', function() {
            setTimeout(() => {
                if (navbarCollapse.classList.contains('show')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }, 100);
        });

        // Cerrar menú al hacer clic en un enlace
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    navbarCollapse.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // ===== CONSOLE LOG =====
    console.log('🌟 IEBM Sistema cargado correctamente');
    console.log('🙏 "Y Jesús se acercó y les habló diciendo: Toda potestad me es dada en el cielo y en la tierra." - Mateo 28:18');
});

// ===== FUNCIÓN GLOBAL PARA LIMPIAR SESIÓN =====
function clearAuthSession() {
    console.log('Limpiando sesión antes de ir al login...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('maestroData');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('hasRememberedCredentials');
}

// ===== FUNCIÓN ESPECÍFICA PARA IR AL LOGIN =====
function irAlLogin(event) {
    event.preventDefault();
    console.log("Ejecutando irAlLogin - Limpiando sesión completa...");
    
    // Limpiar completamente localStorage
    localStorage.clear();
    
    // Limpiar también sessionStorage por si acaso
    sessionStorage.clear();
    
    // Marcar que venimos desde index
    sessionStorage.setItem('fromIndex', 'true');
    
    // Si hay cookies, limpiarlas también
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log("Sesión completamente limpia, redirigiendo a login...");
    
    // Redireccionar al login con un pequeño delay para asegurar que se limpie todo
    setTimeout(() => {
        window.location.href = "login.html";
    }, 100);
}

// Hacer las funciones accesibles globalmente
window.clearAuthSession = clearAuthSession;
window.irAlLogin = irAlLogin;

// ===== CSS DINÁMICO PARA RIPPLE EFFECT =====
const style = document.createElement('style');
style.textContent = `
    .btn-iebm {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.95) !important;
        box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    
    .focused {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(style);