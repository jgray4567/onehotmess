/**
 * OHM Hero — Logo Pop-Up Reveal
 * Logo scales up from center with a punchy pop, then floats gently.
 */

(function () {
    'use strict';

    const heroLogoImg = document.getElementById('hero-logo-img');
    if (!heroLogoImg) return;

    // Remove the particle canvas — we don't need it
    const canvas = document.getElementById('hero-particle-canvas');
    if (canvas) canvas.style.display = 'none';

    // Trigger the pop after a brief delay for page load
    setTimeout(() => {
        heroLogoImg.classList.add('revealed');
    }, 200);

})();
