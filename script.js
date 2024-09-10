let database = [];
let currentPage = 1;
const itemsPerPage = 20;
let debounceTimer;

document.addEventListener('DOMContentLoaded', function() {
    loadDatabase();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const deviceTypeFilter = document.getElementById('deviceTypeFilter');
    const brandFilter = document.getElementById('brandFilter');

    if (searchInput) searchInput.addEventListener('input', debounceSearch);
    if (deviceTypeFilter) deviceTypeFilter.addEventListener('change', instantSearch);
    if (brandFilter) brandFilter.addEventListener('change', instantSearch);

    window.addEventListener('resize', debounce(updateLayout, 250));
}

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(instantSearch, 100);  // Reduced debounce time for more responsiveness
}

function instantSearch() {
    searchDatabase();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function loadDatabase() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'block';

    fetch('flipper_irdb_database.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            database = data;
            if (loadingElement) loadingElement.style.display = 'none';
            console.log('Database loaded successfully');
            populateFilters();
            searchDatabase();
        })
        .catch(error => {
            console.error('Error loading database:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            const resultsElement = document.getElementById('results');
            if (resultsElement) resultsElement.innerHTML = '<p>Error loading database. Please try again later.</p>';
        });
}


function downloadFile(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        })
        .catch(error => console.error('Download failed:', error));
}


function populateFilters() {
    const deviceTypes = new Set(database.map(item => item.device_type));
    const brands = new Set(database.map(item => item.brand));

    populateSelect('deviceTypeFilter', deviceTypes);
    populateSelect('brandFilter', brands);
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;

    options.forEach(option => {
        if (option) {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        }
    });
}

function searchDatabase() {
    const searchInput = document.getElementById('searchInput');
    const deviceTypeFilter = document.getElementById('deviceTypeFilter');
    const brandFilter = document.getElementById('brandFilter');

    if (!searchInput || !deviceTypeFilter || !brandFilter) return;

    const searchTerm = searchInput.value.toLowerCase();
    const deviceType = deviceTypeFilter.value;
    const brand = brandFilter.value;

    const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

    const results = database.filter(item => {
        const itemString = `${item.brand} ${item.model} ${item.device_type} ${item.additional_info || ''}`.toLowerCase();
        const matchesSearch = searchTerms.every(term => itemString.includes(term));
        const matchesDeviceType = deviceType === '' || item.device_type === deviceType;
        const matchesBrand = brand === '' || item.brand === brand;

        return matchesSearch && matchesDeviceType && matchesBrand;
    });

    currentPage = 1;
    displayResults(results);
    updateStats(results.length);
    updateSuggestions(searchTerm);
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const paginationDiv = document.getElementById('pagination');
    if (!resultsDiv || !paginationDiv) return;

    resultsDiv.innerHTML = '';
    paginationDiv.innerHTML = '';

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = results.slice(startIndex, endIndex);

    pageResults.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const downloadUrl = `https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/${item.path.replace(/\\/g, '/')}`;

        resultItem.innerHTML = `
            <h3>${item.brand} ${item.model}</h3>
            <p><strong>Device Type:</strong> ${item.device_type}</p>
            <p><strong>Series:</strong> ${item.series || 'N/A'}</p>
            <p><strong>Filename:</strong> ${item.filename}</p>
            ${item.additional_info ? `<p><strong>Additional Info:</strong> ${item.additional_info}</p>` : ''}
            <button class="download-button">Download IR File</button>
        `;

        const downloadButton = resultItem.querySelector('.download-button');
        downloadButton.addEventListener('click', () => downloadFile(downloadUrl, item.filename));

        resultsDiv.appendChild(resultItem);
    });

    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                displayResults(results);
            });
            if (i === currentPage) {
                pageButton.disabled = true;
            }
            paginationDiv.appendChild(pageButton);
        }
    }
}

function updateStats(resultCount) {
    const statsDiv = document.getElementById('stats');
    if (statsDiv) statsDiv.textContent = `Found ${resultCount} result${resultCount !== 1 ? 's' : ''}`;
}

function updateSuggestions(searchTerm) {
    const suggestionsDiv = document.getElementById('suggestions');
    if (!suggestionsDiv) return;

    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';

    if (searchTerm.length < 2) return;

    const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

    const suggestions = database
        .filter(item => {
            const itemString = `${item.brand} ${item.model} ${item.device_type}`.toLowerCase();
            return searchTerms.every(term => itemString.includes(term));
        })
        .slice(0, 5);

    if (suggestions.length > 0) {
        suggestions.forEach(item => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = `${item.brand} ${item.model} (${item.device_type})`;
            suggestionItem.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = `${item.brand} ${item.model}`;
                    suggestionsDiv.style.display = 'none';
                    searchDatabase();
                }
            });
            suggestionsDiv.appendChild(suggestionItem);
        });
        suggestionsDiv.style.display = 'block';
    }
}

function updateLayout() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    const windowWidth = window.innerWidth;
    
    if (windowWidth < 768) {
        resultsDiv.style.gridTemplateColumns = '1fr';
    } else {
        resultsDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    }
}