/**
 * projects-loader.js
 * Fetches projects.json and renders project cards dynamically.
 * Used by both index.html (limit:4) and projects.html (all + filters).
 */

const PROJECTS_JSON_URL = './projects.json';

/**
 * Render a single project card (same structure as the hand-coded cards)
 */
function renderCard(project, isProjectsPage = false) {
    const cardClass = isProjectsPage ? 'pg-card' : 'project-card';
    const mediaClass = isProjectsPage ? 'pg-media' : 'project-media';
    const badgeClass = isProjectsPage ? 'pg-badge' : 'media-badge';
    const infoClass = isProjectsPage ? 'pg-info' : 'project-info';
    const infoTopClass = isProjectsPage ? 'pg-info-top' : 'project-info-top';
    const typeClass = isProjectsPage ? 'pg-type' : 'project-type';
    const platformClass = isProjectsPage ? 'pg-platform' : 'project-platform';
    const storeClass = isProjectsPage ? 'pg-store-btns' : 'project-store-btns';
    const storeBtnBase = isProjectsPage ? 'pg-store-btn' : 'store-btn';
    const tagsClass = isProjectsPage ? 'pg-tags' : 'project-tags';
    const footerClass = isProjectsPage ? 'pg-info-footer' : 'project-info-footer';

    // Determine play/app store button state
    const playClass = project.playStoreUrl ? `${storeBtnBase} active` : `${storeBtnBase} disabled`;
    const appClass = project.appStoreUrl ? `${storeBtnBase} active` : `${storeBtnBase} disabled`;
    const playHref = project.playStoreUrl || '#';
    const appHref = project.appStoreUrl || '#';
    const playTarget = project.playStoreUrl ? 'target="_blank"' : '';
    const appTarget = project.appStoreUrl ? 'target="_blank"' : '';

    // Status badge
    const statusClass = project.status === 'published' ? 'status-published' : 'status-development';
    const statusLabel = project.status === 'published' ? 'Published' : 'In Development';

    // Tags
    const tagsHTML = (project.tags || []).map(t => `<span>${t}</span>`).join('');

    // categories for filter (projects page)
    const categoriesAttr = isProjectsPage
        ? `data-categories="${(project.categories || []).join(' ')}"`
        : '';

    // Image & Video — strip leading "./" if present
    const imgSrc = project.image ? project.image : '';
    const vidSrc = project.video ? project.video : '';

    return `
    <div class="${cardClass}" ${categoriesAttr}>
        <div class="${mediaClass}">
            ${imgSrc ? `<img src="${imgSrc}" alt="${project.title}" loading="lazy">` : ''}
            ${vidSrc ? `<video autoplay muted loop playsinline onerror="this.style.display='none'">
                <source src="${vidSrc}" type="video/mp4">
            </video>` : ''}
            <div class="${badgeClass}"><i class="fas fa-mobile-alt"></i> Mobile</div>
        </div>
        <div class="${infoClass}">
            <div class="${infoTopClass}">
                <${isProjectsPage ? 'span' : 'div'} class="${isProjectsPage ? typeClass : 'project-meta'}">
                    ${isProjectsPage ? project.type : `<span class="${typeClass}">${project.type}</span>`}
                </${isProjectsPage ? 'span' : 'div'}>
                <h3>${project.title}</h3>
                <div class="${platformClass}">
                    <span><i class="fas fa-mobile-alt"></i> ${project.platform || 'Android'}</span>
                    <span><i class="fab fa-unity"></i> ${project.engine || 'Unity'}</span>
                    <span class="${statusClass}"><i class="fas fa-circle" style="font-size:0.45rem"></i> ${statusLabel}</span>
                </div>
            </div>
            <p>${project.description}</p>
            <div class="${footerClass}">
                <div class="${tagsClass}">${tagsHTML}</div>
                <div class="${storeClass}">
                    <a href="${playHref}" class="${playClass}" ${playTarget}><i class="fab fa-google-play"></i> Play Store</a>
                    <a href="${appHref}"  class="${appClass}"  ${appTarget}><i class="fab fa-apple"></i> App Store</a>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * Load projects and render into the given container element.
 * @param {object} opts
 *   containerId  - ID of the container element
 *   limit        - max projects to show (0 = all)
 *   isProjectsPage - true → use pg-* classes + filter support
 *   filterBtns   - selector of filter buttons (projects.html only)
 *   noResultsId  - ID of "no results" message element
 */
async function loadProjects(opts = {}) {
    const {
        containerId = 'projectsContainer',
        limit = 0,
        isProjectsPage = false,
        filterBtns = '.filter-btn',
        noResultsId = 'noResults'
    } = opts;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Loading placeholder
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:rgba(255,255,255,0.4);">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;display:block;margin-bottom:1rem;"></i>
        Loading projects…
    </div>`;

    let data;
    try {
        const res = await fetch(`${PROJECTS_JSON_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to fetch projects.json');
        data = await res.json();
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:rgba(255,100,100,0.7);">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:1rem;"></i>
            Could not load projects. Please check projects.json.
        </div>`;
        console.error('projects-loader:', err);
        return;
    }

    let projects = data.projects || [];
    if (limit > 0) projects = projects.slice(0, limit);

    container.innerHTML = projects.map(p => renderCard(p, isProjectsPage)).join('');

    // Set up filters on the projects page
    if (isProjectsPage) {
        setupFilters(container, filterBtns, noResultsId);
    }
}

/**
 * Wire up the filter buttons on projects.html
 */
function setupFilters(container, filterBtnsSel, noResultsId) {
    const btns = document.querySelectorAll(filterBtnsSel);
    const noResults = document.getElementById(noResultsId);

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter || 'all';
            const cards = container.querySelectorAll('[data-categories]');
            let visible = 0;

            cards.forEach(card => {
                const cats = card.dataset.categories || '';
                const show = filter === 'all' || cats.split(' ').includes(filter);
                card.classList.toggle('hidden', !show);
                if (show) visible++;
            });

            if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
        });
    });
}
