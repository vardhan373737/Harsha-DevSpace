// ===== DARK MODE TOGGLE =====
const htmlElement = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Initialize theme from localStorage or system preference
function initializeTheme(){
    const savedTheme = localStorage.getItem('theme-preference');
    if(savedTheme){
        applyTheme(savedTheme);
    } else if(prefersDark.matches){
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

function applyTheme(theme){
    if(theme === 'dark'){
        htmlElement.classList.add('dark-mode');
        htmlElement.setAttribute('data-theme','dark');
        if(themeToggle){
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        localStorage.setItem('theme-preference','dark');
    } else {
        htmlElement.classList.remove('dark-mode');
        htmlElement.setAttribute('data-theme','light');
        if(themeToggle){
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('theme-preference','light');
    }
}

if(themeToggle){
    themeToggle.addEventListener('click',()=>{
        const isDarkMode = htmlElement.classList.contains('dark-mode');
        applyTheme(isDarkMode ? 'light' : 'dark');
    });
}

// Respect system theme changes
prefersDark.addEventListener('change',(e)=>{
    if(!localStorage.getItem('theme-preference')){
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

// ===== SCROLL-TRIGGERED ANIMATIONS =====
const observerOptions = {
    threshold:0.1,
    rootMargin:'0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
        if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
},observerOptions);

// ===== SMOOTH PAGE TRANSITIONS =====
function setupPageTransitions(){
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click',(e)=>{
            const href = link.getAttribute('href');
            if(!href.startsWith('#') && !href.includes(window.location.pathname)){
                e.preventDefault();
                document.body.style.animation = 'pageExit 0.35s ease-in forwards';
                setTimeout(()=>{
                    window.location.href = href;
                },350);
            }
        });
    });
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded',()=>{
    initializeTheme();
    setupPageTransitions();
    document.body.style.animation = 'pageEnter 0.6s ease-out';
    
    // Set up scroll reveal elements
    const revealElements = document.querySelectorAll('[class*="scroll-reveal"]');
    revealElements.forEach((el,index)=>{
        setTimeout(()=>{
            observer.observe(el);
        },index * 50);
    });
});
