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
   SHARED — directional sweep-in reveal
   Any element with [data-sweep] slides in from its
   assigned edge the first time it enters the viewport.
   ============================================= */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sweepIn = (elements) => {
    const items = [...elements];
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-in'));
        return;
    }

    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('is-in');
            obs.unobserve(el);
            // Drop the stagger delay once revealed, so later state changes
            // (dimming, hover) respond instantly.
            const delay = parseInt(el.style.getPropertyValue('--reveal-delay')) || 0;
            setTimeout(() => el.style.setProperty('--reveal-delay', '0ms'), delay + 1000);
        });
    }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(el => io.observe(el));
};


/* =============================================
   VIDEOS — Mosaic wall + max-size lightbox
   ============================================= */
(function () {
    const mosaic = document.getElementById('vid-mosaic');
    const lb     = document.getElementById('vlb');
    if (!mosaic || !lb) return;

    const cards   = [...mosaic.querySelectorAll('.vid-card')];
    const iframe  = document.getElementById('vlb-iframe');
    const elClose = document.getElementById('vlb-close');
    const elPrev  = document.getElementById('vlb-prev');
    const elNext  = document.getElementById('vlb-next');
    const elTitle = document.getElementById('vlb-title');
    const elCount = document.getElementById('vlb-count');

    /* ---- Thumbnails: maxres, stepping down when it doesn't exist ---- */
    const downgrade = (img) => {
        const id = img.dataset.id;
        if (!id || img.dataset.fallback) return;
        img.dataset.fallback = '1';
        img.closest('.vid-card').classList.add('is-boxed');   // crops hqdefault's letterbox bars
        img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    };

    mosaic.querySelectorAll('.vid-card-media img').forEach(img => {
        img.addEventListener('error', () => downgrade(img));
        // maxresdefault sometimes resolves to YouTube's 120px grey placeholder
        img.addEventListener('load', () => {
            if (img.naturalWidth > 0 && img.naturalWidth <= 120) downgrade(img);
        });
        if (img.complete && img.naturalWidth === 0) downgrade(img);
    });

    /* ---- Lightbox ---- */
    let index = 0;
    let lastFocused = null;
    let scrollLock = 0;

    const render = () => {
        const card = cards[index];
        iframe.src = 'https://www.youtube.com/embed/' + card.dataset.video +
                     '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        elTitle.textContent = card.dataset.title || 'One Hot Mess';
        elCount.textContent = (index + 1) + ' / ' + cards.length;
    };

    const open = (i) => {
        index = i;
        lastFocused = document.activeElement;
        scrollLock = window.scrollY;
        render();
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
        elClose.focus({ preventScroll: true });
        if (typeof gtag === 'function') {
            gtag('event', 'video_open', { video_id: cards[index].dataset.video });
        }
    };

    const close = () => {
        lb.classList.remove('open');
        iframe.src = 'about:blank';
        document.body.style.overflow = '';
        window.scrollTo({ top: scrollLock });
        if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
    };

    const step = (delta) => {
        index = (index + delta + cards.length) % cards.length;
        render();
    };

    cards.forEach((card, i) => card.addEventListener('click', () => open(i)));

    elClose.addEventListener('click', close);
    elPrev.addEventListener('click', () => step(-1));
    elNext.addEventListener('click', () => step(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

    document.addEventListener('keydown', (e) => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape')     { close(); }
        if (e.key === 'ArrowLeft')  { step(-1); }
        if (e.key === 'ArrowRight') { step(1); }
        if (e.key === 'Tab') {
            // keep focus inside the dialog
            const focusables = [elClose, elPrev, elNext];
            const i = focusables.indexOf(document.activeElement);
            e.preventDefault();
            const next = e.shiftKey ? (i - 1 + focusables.length) % focusables.length
                                    : (i + 1) % focusables.length;
            focusables[next].focus();
        }
    });

    // Swipe across the backdrop / caption bar to change videos on touch devices
    let touchX = null;
    lb.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    sweepIn(cards);
})();


/* =============================================
   THE MESS — Roster wall with expanding bio panel
   ============================================= */
(function () {
    const grid = document.getElementById('roster-grid');
    if (!grid) return;

    const tiles = [...grid.querySelectorAll('.member')];
    const bios  = {};
    document.querySelectorAll('.member-bio-src').forEach(node => {
        bios[node.dataset.member] = node;
    });

    // Shared panel, moved through the grid so it always opens under the right row
    const panel = document.createElement('div');
    panel.className = 'member-panel';
    panel.id = 'member-panel';
    panel.setAttribute('role', 'region');
    grid.appendChild(panel);

    let openTile = null;

    const rowSiblings = (tile) => {
        const top = tile.offsetTop;
        return tiles.filter(t => Math.abs(t.offsetTop - top) < 6);
    };

    const collapse = (instant) => {
        if (!openTile) return;
        const tile = openTile;
        openTile = null;
        tile.classList.remove('is-open');
        tile.setAttribute('aria-expanded', 'false');
        tile.removeAttribute('aria-controls');
        grid.classList.remove('has-open');
        panel.classList.remove('is-open');
        panel.style.height = panel.scrollHeight + 'px';
        void panel.offsetHeight;
        panel.style.height = instant ? '0px' : '0px';
    };

    const expand = (tile) => {
        const key  = tile.dataset.member;
        const src  = bios[key];
        if (!src) return;

        // Move the panel to the end of the clicked tile's row before measuring
        const row  = rowSiblings(tile);
        const last = row[row.length - 1];
        if (last.nextSibling !== panel) {
            panel.style.height = '0px';
            grid.insertBefore(panel, last.nextSibling);
        }

        const img = tile.querySelector('img');
        panel.innerHTML =
            '<div class="member-panel-inner">' +
                '<div class="member-panel-photo">' +
                    '<img src="' + img.getAttribute('src') + '" alt="' + img.getAttribute('alt') + '" ' +
                         'width="800" height="1000" loading="lazy" decoding="async">' +
                '</div>' +
                '<div class="member-panel-body">' +
                    '<h4 class="member-panel-name">' + src.dataset.fullname + '</h4>' +
                    '<p class="member-panel-role">' + src.dataset.role + '</p>' +
                    src.innerHTML +
                    '<button class="member-panel-close" type="button">Close</button>' +
                '</div>' +
            '</div>';

        panel.querySelector('.member-panel-close').addEventListener('click', () => {
            collapse();
            tile.focus({ preventScroll: true });
        });

        tile.classList.add('is-open');
        tile.setAttribute('aria-expanded', 'true');
        tile.setAttribute('aria-controls', 'member-panel');
        grid.classList.add('has-open');
        panel.classList.add('is-open');

        // Animate to the measured height, then release to auto
        const target = panel.firstElementChild.offsetHeight;
        panel.style.height = target + 'px';
        openTile = tile;

        window.setTimeout(() => {
            if (openTile === tile) panel.style.height = 'auto';
        }, 520);
    };

    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const wasOpen = tile === openTile;
            collapse();
            if (wasOpen) return;
            expand(tile);
            window.setTimeout(() => {
                const navH = parseInt(getComputedStyle(document.documentElement)
                                .getPropertyValue('--nav-height')) || 60;
                const rect = tile.getBoundingClientRect();
                if (rect.top < navH + 12) {
                    window.scrollTo({ top: window.scrollY + rect.top - navH - 20, behavior: 'smooth' });
                }
            }, 60);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openTile) {
            const t = openTile;
            collapse();
            t.focus({ preventScroll: true });
        }
    });

    // Column count changes on resize — reflow the open panel to the correct row
    let resizeTimer;
    window.addEventListener('resize', () => {
        if (!openTile) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const t = openTile;
            collapse();
            expand(t);
        }, 180);
    });

    sweepIn(tiles);
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
    document.querySelectorAll('.section-title, .mess-text, .mess-image, .show-card, .gallery-item').forEach(el => {
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
