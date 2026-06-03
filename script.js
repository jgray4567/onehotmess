/**
 * One Hot Mess — Site Controller
 * Canvas animation is fixed behind everything.
 * Scroll position across the FULL page drives the frame sequence.
 */

/* =============================================
   HERO ANIMATION CONFIG
   ============================================= */
const CONFIG = {
    framesFolder: './assets/animation',
    framePrefix: 'ezgif-frame-',
    frameSuffix: '.jpg',
    totalFrames: 51,
    padZeroes: 3,
    bgColor: '#0a0a0a',
    fitMode: 'cover'
};

/* =============================================
   DOM REFERENCES
   ============================================= */
const dom = {
    canvas: document.getElementById('hero-canvas'),
    ctx: null,
    loader: document.getElementById('loader'),
    progress: document.getElementById('progress'),
    nav: document.getElementById('main-nav'),
    hamburger: document.getElementById('hamburger'),
    mobileMenu: document.getElementById('mobile-menu'),
    heroSection: document.getElementById('hero'),
    sections: document.querySelectorAll('.section'),
    navLinks: document.querySelectorAll('.nav-link'),
    mobileLinks: document.querySelectorAll('.mobile-link')
};

if (dom.canvas) {
    dom.ctx = dom.canvas.getContext('2d');
}

/* =============================================
   HERO FRAME ANIMATION
   ============================================= */
let images = [];
let loadedCount = 0;
let currentFrame = -1;
let isReady = false;

const getFramePath = (index) => {
    const num = index.toString().padStart(CONFIG.padZeroes, '0');
    return `${CONFIG.framesFolder}/${CONFIG.framePrefix}${num}${CONFIG.frameSuffix}`;
};

const preloadAllFrames = () => {
    for (let i = 1; i <= CONFIG.totalFrames; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => handleFrameLoaded();
        img.onerror = () => {
            console.warn(`Failed to load frame: ${getFramePath(i)}`);
            handleFrameLoaded();
        };
        images.push(img);
    }
};

const handleFrameLoaded = () => {
    loadedCount++;
    const pct = (loadedCount / CONFIG.totalFrames) * 100;
    if (dom.progress) dom.progress.style.width = `${pct}%`;

    if (loadedCount === CONFIG.totalFrames) {
        initHero();
    }
};

/* Display dimensions (CSS pixels) stored on resize */
let displayW = window.innerWidth;
let displayH = window.innerHeight;

const drawFrame = (img) => {
    if (!img || !img.complete || img.naturalWidth === 0 || !dom.ctx) return;

    const pr = window.devicePixelRatio || 1;

    /* Clear entire canvas */
    dom.ctx.setTransform(1, 0, 0, 1, 0, 0);
    dom.ctx.fillStyle = CONFIG.bgColor;
    dom.ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

    /* Work in CSS-pixel space */
    dom.ctx.setTransform(pr, 0, 0, pr, 0, 0);

    const cW = displayW;
    const cH = displayH;
    const cR = cW / cH;
    const iR = img.naturalWidth / img.naturalHeight;
    let dW, dH;

    /* Always "cover" — fill viewport, crop overflow */
    if (cR > iR) { dW = cW; dH = dW / iR; }
    else          { dH = cH; dW = dH * iR; }

    const oX = (cW - dW) / 2;
    const oY = (cH - dH) / 2;
    dom.ctx.drawImage(img, oX, oY, dW, dH);
};

let resizeTimeout = null;
const resizeCanvas = () => {
    if (!dom.canvas || !dom.ctx) return;
    const pr = window.devicePixelRatio || 1;

    /* Use clientWidth/Height of the <html> element — reliable on every
       browser including mobile Safari with collapsing URL bar */
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;

    displayW = w;
    displayH = h;

    dom.canvas.width  = w * pr;
    dom.canvas.height = h * pr;

    /* Let CSS handle sizing — remove explicit pixel styles */
    dom.canvas.style.width  = '';
    dom.canvas.style.height = '';

    if (isReady && currentFrame >= 0 && images[currentFrame]) {
        drawFrame(images[currentFrame]);
    }
};

/* =============================================
   SCROLL → FRAME MAPPING
   Maps full-page scroll to frame index so the
   animation plays behind all content as you scroll
   ============================================= */
const updateFrame = () => {
    if (!isReady) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const frac = Math.max(0, Math.min(1, scrollTop / maxScroll));
    const idx = Math.min(Math.floor(frac * CONFIG.totalFrames), CONFIG.totalFrames - 1);

    if (idx !== currentFrame) {
        currentFrame = idx;
        requestAnimationFrame(() => drawFrame(images[idx]));
    }
};

const initHero = () => {
    isReady = true;

    // Hide loader
    if (dom.loader) {
        dom.loader.style.opacity = '0';
        setTimeout(() => { dom.loader.style.visibility = 'hidden'; }, 800);
    }

    resizeCanvas();
    currentFrame = 0;
    drawFrame(images[0]);

    // Debounced resize for performance, plus orientationchange for mobile
    const debouncedResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    };
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 200);
    });
};

/* =============================================
   HAMBURGER MENU
   ============================================= */
const toggleMobileMenu = () => {
    const isOpen = dom.mobileMenu.classList.toggle('open');
    dom.hamburger.classList.toggle('active', isOpen);
    dom.hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
};

const closeMobileMenu = () => {
    dom.mobileMenu.classList.remove('open');
    dom.hamburger.classList.remove('active');
    dom.hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
};

if (dom.hamburger) {
    dom.hamburger.addEventListener('click', toggleMobileMenu);
}

dom.mobileLinks.forEach(link => {
    link.addEventListener('click', () => closeMobileMenu());
});

/* =============================================
   VIDEO GALLERY — EPK-style featured + grid + lightbox
   ============================================= */
(function() {
    const featured    = document.getElementById('main-vid-featured');
    const featuredThumb = document.getElementById('main-vid-featured-thumb');
    const thumbs      = document.querySelectorAll('#main-vid-grid .epk-vid-thumb');
    const lightbox    = document.getElementById('main-lightbox');
    const lbIframe    = document.getElementById('main-lb-iframe');
    const lbClose     = document.getElementById('main-lb-close');
    if (!featured || !lightbox) return;

    let currentVideo  = featured.dataset.video;

    // Thumbnail click → update featured
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            currentVideo = thumb.dataset.video;
            featuredThumb.src = `https://img.youtube.com/vi/${currentVideo}/hqdefault.jpg`;
            featured.dataset.video = currentVideo;
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
        thumb.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); thumb.click(); }
        });
    });

    // Featured click → open lightbox
    const openLB = () => {
        lbIframe.src = `https://www.youtube.com/embed/${currentVideo}?autoplay=1&rel=0`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    const closeLB = () => {
        lightbox.classList.remove('active');
        lbIframe.src = 'about:blank';
        document.body.style.overflow = '';
    };

    featured.addEventListener('click', openLB);
    featured.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(); }});
    lbClose.addEventListener('click', closeLB);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLB(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLB();
    });
})();


/* =============================================
   GALLERY WALL — Smooth gliding auto-scroll + touch with momentum
   ============================================= */
const galleryWrap = document.getElementById('gallery-wall-wrap');
const galleryWall = document.getElementById('gallery-wall');
let galleryOffset = 0;
let galleryAnimId = null;
let gallerySpeed = 0;
let galleryTargetSpeed = 0;
const GALLERY_EASE = 0.04;          // gentle ramp — feels weightless
const GALLERY_MAX_SPEED = 14;       // faster top-end glide
const GALLERY_FRICTION = 0.985;     // very low drag — coasts a long way
const GALLERY_IDLE_SPEED = 0.35;    // slow auto-drift when no interaction
let galleryIdleDir = 1;             // 1 = right, -1 = left
let galleryIsHovered = false;
let galleryIsTouching = false;

const getGalleryMaxOffset = () => {
    if (!galleryWall || !galleryWrap) return 0;
    return Math.max(0, galleryWall.scrollWidth - galleryWrap.offsetWidth);
};

const applyGalleryOffset = () => {
    galleryWall.style.transform = `translateX(${-galleryOffset}px)`;
};

const galleryLoop = () => {
    const maxOffset = getGalleryMaxOffset();

    // Idle drift when no one is interacting
    if (!galleryIsHovered && !galleryIsTouching && galleryTargetSpeed === 0 && Math.abs(gallerySpeed) < 0.1) {
        gallerySpeed = GALLERY_IDLE_SPEED * galleryIdleDir;
        // Reverse at edges
        if (galleryOffset >= maxOffset - 1) galleryIdleDir = -1;
        if (galleryOffset <= 1) galleryIdleDir = 1;
    }

    // Ease current speed toward target
    gallerySpeed += (galleryTargetSpeed - gallerySpeed) * GALLERY_EASE;

    // Apply friction when coasting (no target)
    if (galleryTargetSpeed === 0 && (galleryIsHovered || galleryIsTouching || Math.abs(gallerySpeed) > GALLERY_IDLE_SPEED + 0.1)) {
        gallerySpeed *= GALLERY_FRICTION;
    }

    galleryOffset = Math.max(0, Math.min(maxOffset, galleryOffset + gallerySpeed));
    applyGalleryOffset();
    galleryAnimId = requestAnimationFrame(galleryLoop);
};

const ensureGalleryLoop = () => {
    if (!galleryAnimId) {
        galleryAnimId = requestAnimationFrame(galleryLoop);
    }
};

// Start idle drift on load
if (galleryWrap && galleryWall) {
    ensureGalleryLoop();
}

// Mouse-edge auto-scroll with smooth ramp
if (galleryWrap) {
    galleryWrap.addEventListener('mousemove', (e) => {
        galleryIsHovered = true;
        const rect = galleryWrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        const deadZone = 0.15;        // narrow dead zone — responsive edges
        const fraction = x / w;

        if (fraction < (0.5 - deadZone / 2)) {
            const intensity = 1 - (fraction / (0.5 - deadZone / 2));
            galleryTargetSpeed = -intensity * GALLERY_MAX_SPEED;
        } else if (fraction > (0.5 + deadZone / 2)) {
            const intensity = (fraction - (0.5 + deadZone / 2)) / (0.5 - deadZone / 2);
            galleryTargetSpeed = intensity * GALLERY_MAX_SPEED;
        } else {
            galleryTargetSpeed = 0;
        }

        ensureGalleryLoop();
    });

    galleryWrap.addEventListener('mouseleave', () => {
        galleryIsHovered = false;
        galleryTargetSpeed = 0;
        ensureGalleryLoop();
    });
}

// Touch drag with momentum flick
let galTouchStartX = 0;
let galTouchStartOffset = 0;
let galTouchLastX = 0;
let galTouchLastTime = 0;
let galTouchVelocity = 0;

if (galleryWrap) {
    galleryWrap.addEventListener('touchstart', (e) => {
        galleryIsTouching = true;
        galTouchStartX = e.touches[0].clientX;
        galTouchLastX = galTouchStartX;
        galTouchLastTime = Date.now();
        galTouchStartOffset = galleryOffset;
        galTouchVelocity = 0;
        galleryTargetSpeed = 0;
        gallerySpeed = 0;
    }, { passive: true });

    galleryWrap.addEventListener('touchmove', (e) => {
        const nowX = e.touches[0].clientX;
        const now = Date.now();
        const dt = now - galTouchLastTime;
        if (dt > 0) {
            galTouchVelocity = (galTouchLastX - nowX) / dt * 16;
        }
        galTouchLastX = nowX;
        galTouchLastTime = now;

        const dx = galTouchStartX - nowX;
        const maxOffset = getGalleryMaxOffset();
        galleryOffset = Math.max(0, Math.min(maxOffset, galTouchStartOffset + dx));
        applyGalleryOffset();
    }, { passive: true });

    galleryWrap.addEventListener('touchend', () => {
        galleryIsTouching = false;
        // Flick momentum — amplified for effortless feel
        gallerySpeed = galTouchVelocity * 1.2;
        galleryTargetSpeed = 0;
        ensureGalleryLoop();
    }, { passive: true });
}

/* =============================================
   GALLERY LIGHTBOX
   ============================================= */
const galleryLb = document.getElementById('gallery-lightbox');
const galleryLbImg = document.getElementById('gallery-lb-img');
const galleryLbCounter = document.getElementById('gallery-lb-counter');
const galleryLbClose = document.getElementById('gallery-lb-close');
const galleryLbPrev = document.getElementById('gallery-lb-prev');
const galleryLbNext = document.getElementById('gallery-lb-next');
const galleryItems = document.querySelectorAll('#gallery-wall .gallery-item img');
const gallerySrcs = Array.from(galleryItems).map(img => img.src);
let currentGalleryIdx = 0;

const openGalleryLb = (index) => {
    currentGalleryIdx = index;
    galleryLbImg.src = gallerySrcs[currentGalleryIdx];
    galleryLbCounter.textContent = `${currentGalleryIdx + 1} / ${gallerySrcs.length}`;
    galleryLb.classList.add('open');
    document.body.style.overflow = 'hidden';
};

const closeGalleryLb = () => {
    galleryLb.classList.remove('open');
    galleryLbImg.src = '';
    document.body.style.overflow = '';
};

const showGalleryPhoto = (index) => {
    currentGalleryIdx = ((index % gallerySrcs.length) + gallerySrcs.length) % gallerySrcs.length;
    galleryLbImg.src = gallerySrcs[currentGalleryIdx];
    galleryLbCounter.textContent = `${currentGalleryIdx + 1} / ${gallerySrcs.length}`;
};

galleryItems.forEach((img, i) => {
    img.closest('.gallery-item').addEventListener('click', () => openGalleryLb(i));
    img.closest('.gallery-item').style.cursor = 'pointer';
});

if (galleryLbClose) galleryLbClose.addEventListener('click', closeGalleryLb);
if (galleryLbPrev) galleryLbPrev.addEventListener('click', () => showGalleryPhoto(currentGalleryIdx - 1));
if (galleryLbNext) galleryLbNext.addEventListener('click', () => showGalleryPhoto(currentGalleryIdx + 1));

if (galleryLb) {
    galleryLb.addEventListener('click', (e) => {
        if (e.target === galleryLb) closeGalleryLb();
    });
}

// Keyboard for gallery lightbox
document.addEventListener('keydown', (e) => {
    if (!galleryLb.classList.contains('open')) return;
    if (e.key === 'Escape') closeGalleryLb();
    if (e.key === 'ArrowLeft') showGalleryPhoto(currentGalleryIdx - 1);
    if (e.key === 'ArrowRight') showGalleryPhoto(currentGalleryIdx + 1);
});

// Swipe for gallery lightbox
let galSwipeStartX = 0;
if (galleryLb) {
    galleryLb.addEventListener('touchstart', (e) => {
        galSwipeStartX = e.touches[0].clientX;
    }, { passive: true });

    galleryLb.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - galSwipeStartX;
        if (Math.abs(dx) > 50) {
            if (dx < 0) showGalleryPhoto(currentGalleryIdx + 1);
            else showGalleryPhoto(currentGalleryIdx - 1);
        }
    }, { passive: true });
}

/* =============================================
   NAV — Hide on scroll down, show on scroll up
   ============================================= */
let lastScrollY = 0;
let ticking = false;

const handleNavVisibility = () => {
    const scrollY = window.scrollY;
    const heroH = dom.heroSection ? dom.heroSection.offsetHeight : 0;
    const isMobile = window.innerWidth < 768;

    if (scrollY < heroH * 0.5) {
        dom.nav.classList.remove('nav--hidden');
        dom.nav.classList.remove('nav--solid');
    } else {
        dom.nav.classList.add('nav--solid');
        // Only hide on scroll down for mobile — desktop nav stays visible
        if (isMobile && scrollY > lastScrollY && scrollY > 100) {
            dom.nav.classList.add('nav--hidden');
        } else {
            dom.nav.classList.remove('nav--hidden');
        }
    }

    lastScrollY = scrollY;
};

/* =============================================
   ACTIVE NAV LINK
   ============================================= */
const updateActiveNav = () => {
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let current = '';

    dom.sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
            current = section.id;
        }
    });

    dom.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === current);
    });
};

/* =============================================
   SCROLL REVEAL
   ============================================= */
const setupReveal = () => {
    document.querySelectorAll('.section-title, .mess-text, .mess-image, .video-card, .show-card, .gallery-item').forEach(el => {
        el.classList.add('reveal');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
    });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
};

/* =============================================
   SMOOTH SCROLL
   ============================================= */
const setupSmoothScroll = () => {
    const allLinks = [...dom.navLinks, ...dom.mobileLinks];
    allLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 60;
                const y = target.getBoundingClientRect().top + window.scrollY - navH;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    });
};

/* =============================================
   MASTER SCROLL HANDLER
   ============================================= */
const onScroll = () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            handleNavVisibility();
            updateActiveNav();
            updateFrame();
            ticking = false;
        });
        ticking = true;
    }
};

/* =============================================
   BAND PHOTO SLIDESHOW
   ============================================= */
const bandSlides = document.querySelectorAll('.band-slide');
let bandCurrent = 0;

if (bandSlides.length > 1) {
    setInterval(() => {
        bandSlides[bandCurrent].classList.remove('active');
        bandCurrent = (bandCurrent + 1) % bandSlides.length;
        bandSlides[bandCurrent].classList.add('active');
    }, 4000);
}

/* =============================================
   INIT
   ============================================= */
window.addEventListener('scroll', onScroll, { passive: true });
setupReveal();
setupSmoothScroll();
preloadAllFrames();
