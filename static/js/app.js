// State Management
let allReleaseItems = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let activeTweetItem = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner-icon');
const cacheIndicator = document.getElementById('cache-indicator');
const lastUpdatedTime = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterChips = document.querySelectorAll('.chip');
const mainLoading = document.getElementById('main-loading');
const emptyState = document.getElementById('empty-state');
const releaseFeed = document.getElementById('release-feed');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const closeModalBtn = document.getElementById('close-modal');
const cancelTweetBtn = document.getElementById('cancel-tweet');
const postTweetBtn = document.getElementById('post-tweet-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
        renderFeed();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
    });

    // Filter Chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-type');
            renderFeed();
        });
    });

    // Modal Close events
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Tweet input limit and counter
    tweetTextarea.addEventListener('input', updateCharCount);

    // Click "Post to X"
    postTweetBtn.addEventListener('click', handlePostTweet);
}

// Fetch Releases from Flask API
async function fetchReleases(force = false) {
    showLoading(true);
    
    try {
        const url = `/api/releases${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update status panel
        updateStatusPanel(data);
        
        // Process & flatten release items
        processReleases(data.releases);
        
        // Render feed
        renderFeed();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showErrorState(error.message);
    } finally {
        showLoading(false);
    }
}

// Update Header Status UI
function updateStatusPanel(data) {
    if (data.cached) {
        cacheIndicator.classList.remove('live');
        cacheIndicator.textContent = 'Cached';
    } else {
        cacheIndicator.classList.add('live');
        cacheIndicator.textContent = 'Live';
    }
    
    lastUpdatedTime.textContent = `Last updated: ${data.last_updated || 'Just now'}`;
}

// Process XML Atom entries into discrete items
function processReleases(releases) {
    allReleaseItems = [];
    
    releases.forEach(release => {
        const parsedItems = parseEntryContent(release);
        allReleaseItems.push(...parsedItems);
    });
}

// Parse entry HTML and split by H3 headings
function parseEntryContent(entry) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    const children = Array.from(doc.body.children);
    
    const items = [];
    let currentType = 'Other';
    let itemIndex = 0;
    
    if (children.length === 0) {
        items.push({
            id: `${entry.id}-0`,
            date: entry.title,
            type: 'Other',
            html: entry.content || '<p>No details provided.</p>',
            link: entry.link
        });
        return items;
    }
    
    // Check if entry has H3 headings (which represent categories)
    const hasH3 = children.some(el => el.tagName === 'H3');
    
    if (!hasH3) {
        items.push({
            id: `${entry.id}-0`,
            date: entry.title,
            type: 'Other',
            html: entry.content,
            link: entry.link
        });
        return items;
    }
    
    let tempContainer = document.createElement('div');
    
    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (el.tagName === 'H3') {
            // Save current gathered elements
            if (tempContainer.children.length > 0) {
                items.push({
                    id: `${entry.id}-${itemIndex++}`,
                    date: entry.title,
                    type: currentType,
                    html: tempContainer.innerHTML,
                    link: entry.link
                });
                tempContainer = document.createElement('div');
            }
            currentType = el.textContent.trim();
        } else {
            tempContainer.appendChild(el.cloneNode(true));
        }
    }
    
    // Add the final item
    if (tempContainer.children.length > 0) {
        items.push({
            id: `${entry.id}-${itemIndex++}`,
            date: entry.title,
            type: currentType,
            html: tempContainer.innerHTML,
            link: entry.link
        });
    }
    
    return items;
}

// Filter and render release feed
function renderFeed() {
    // Apply filters
    let filtered = allReleaseItems;
    
    // 1. Filter by category type
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => item.type.toLowerCase() === currentFilter);
    }
    
    // 2. Filter by search query
    if (currentSearchQuery) {
        filtered = filtered.filter(item => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.html;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            return item.date.toLowerCase().includes(currentSearchQuery) ||
                   item.type.toLowerCase().includes(currentSearchQuery) ||
                   plainText.toLowerCase().includes(currentSearchQuery);
        });
    }
    
    // Update UI states
    if (filtered.length === 0) {
        releaseFeed.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    releaseFeed.style.display = 'flex';
    
    // Render cards
    releaseFeed.innerHTML = filtered.map(item => createCardHtml(item)).join('');
}

// Generate Card HTML
function createCardHtml(item) {
    const typeClass = item.type.toLowerCase();
    
    return `
        <article class="release-card card" id="card-${item.id}">
            <div class="release-meta">
                <div class="release-meta-left">
                    <span class="release-badge ${typeClass}">${escapeHtml(item.type)}</span>
                    <span class="release-date">${escapeHtml(item.date)}</span>
                </div>
                <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="release-original-link">
                    <span>Source</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
            </div>
            <div class="release-body">
                ${item.html}
            </div>
            <div class="release-actions">
                <button class="action-btn tweet-btn" onclick="openTweetComposer('${item.id}')">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    <span>Draft Tweet</span>
                </button>
            </div>
        </article>
    `;
}

// Manage Loading States
function showLoading(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spinning');
        mainLoading.style.display = 'flex';
        releaseFeed.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        mainLoading.style.display = 'none';
    }
}

// Error state display
function showErrorState(message) {
    emptyState.style.display = 'flex';
    emptyState.querySelector('h3').textContent = 'Error Loading Feeds';
    emptyState.querySelector('p').textContent = message || 'Failed to retrieve release notes. Please check connection.';
}

// Open Tweet Composer Modal
function openTweetComposer(itemId) {
    const item = allReleaseItems.find(i => i.id === itemId);
    if (!item) return;
    
    activeTweetItem = item;
    
    // Extract plain text from HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.html;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up text whitespace
    plainText = plainText.replace(/\s+/g, ' ').trim();
    
    // Emoji selector based on category type
    let emoji = '📢';
    if (item.type.toLowerCase() === 'feature') emoji = '🚀';
    if (item.type.toLowerCase() === 'change') emoji = '⚙️';
    if (item.type.toLowerCase() === 'deprecation') emoji = '⚠️';
    
    // Standard template
    const headerText = `${emoji} New BigQuery ${item.type} (${item.date}):\n\n`;
    const footerText = `\n\nRead more:\n🔗 ${item.link}`;
    
    const availableLength = 280 - headerText.length - footerText.length;
    
    let bodyText = plainText;
    if (bodyText.length > availableLength) {
        bodyText = bodyText.substring(0, availableLength - 3) + '...';
    }
    
    tweetTextarea.value = `${headerText}${bodyText}${footerText}`;
    updateCharCount();
    
    tweetModal.classList.add('active');
}

// Hide Modal
function hideTweetModal() {
    tweetModal.classList.remove('active');
    activeTweetItem = null;
}

// Handle Posting Tweet
function handlePostTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        alert('Tweet is too long! Please keep it under 280 characters.');
        return;
    }
    
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    hideTweetModal();
}

// Update Character count indicator
function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    charCounter.classList.remove('warning', 'danger');
    if (len > 250 && len <= 280) {
        charCounter.classList.add('warning');
    } else if (len > 280) {
        charCounter.classList.add('danger');
    }
}

// Helper Utilities
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
