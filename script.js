let database = [];
let currentPage = 1;
const itemsPerPage = 20;
let debounceTimer;
let currentResults = [];

document.addEventListener('DOMContentLoaded', function() {
    loadDatabase();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const deviceTypeFilter = document.getElementById('deviceTypeFilter');
    const brandFilter = document.getElementById('brandFilter');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', submitIRRequest);
    }
    if (searchInput) searchInput.addEventListener('input', debounceSearch);
    if (searchButton) searchButton.addEventListener('click', instantSearch);
    if (deviceTypeFilter) deviceTypeFilter.addEventListener('change', instantSearch);
    if (brandFilter) brandFilter.addEventListener('change', instantSearch);
    if (itemsPerPageSelect) itemsPerPageSelect.addEventListener('change', changeItemsPerPage);

    window.addEventListener('resize', debounce(updateLayout, 250));
};

function submitIRRequest(e) {
    e.preventDefault();

    const brand = document.getElementById('brandInput').value;
    const model = document.getElementById('modelInput').value;
    const deviceType = document.getElementById('deviceTypeInput').value;
    const requestStatus = document.getElementById('requestStatus');

    // Add the request to Firestore
    db.collection("irRequests").add({
        brand: brand,
        model: model,
        deviceType: deviceType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
        requestStatus.textContent = "Request submitted successfully!";
        requestForm.reset();
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        requestStatus.textContent = "Error submitting request. Please try again.";
    });
}

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(instantSearch, 300);  // Increased debounce time for better performance
}

function instantSearch() {
    searchDatabase();
    window.scrollTo(0, 0);  // Scroll to top after search
}

function changeItemsPerPage() {
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPage = parseInt(itemsPerPageSelect.value);
        currentPage = 1;  // Reset to first page
        displayResults();
    }
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
    const downloadStatus = document.getElementById('downloadStatus');
    if (downloadStatus) downloadStatus.textContent = 'Preparing file...';

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
        })
        .then(blob => {
            if (isIOS) {
                handleIOSDownload(blob, filename, downloadStatus);
            } else {
                handleRegularDownload(blob, filename, downloadStatus);
            }
        })
        .catch(error => {
            console.error('Download failed:', error);
            if (downloadStatus) downloadStatus.textContent = 'Download failed. Please try again.';
        });
}

function handleIOSDownload(blob, filename, downloadStatus) {
    // Attempt to use Web Share API if available
    if (navigator.share) {
        const file = new File([blob], filename, { type: blob.type });
        navigator.share({
            files: [file],
            title: filename,
        }).then(() => {
            downloadStatus.textContent = 'File shared successfully!';
        }).catch(error => {
            console.error('Sharing failed', error);
            fallbackIOSDownload(blob, filename, downloadStatus);
        });
    } else {
        fallbackIOSDownload(blob, filename, downloadStatus);
    }
}

function fallbackIOSDownload(blob, filename, downloadStatus) {
    // For small files, use data URI
    if (blob.size < 5 * 1024 * 1024) { // 5MB limit
        const reader = new FileReader();
        reader.onload = function(e) {
            const a = document.createElement('a');
            a.href = e.target.result;
            a.download = filename;
            a.click();
            downloadStatus.textContent = 'File ready. If download doesn\'t start, tap and hold the link to save.';
        };
        reader.readAsDataURL(blob);
    } else {
        // For larger files, open in new tab with instructions
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        downloadStatus.textContent = 'File opened in new tab. Use browser menu to save.';
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); // Clean up after 1 minute
    }

    // For text-based files, offer copy to clipboard
    if (blob.type.startsWith('text/')) {
        blob.text().then(text => {
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy to Clipboard';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(text).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => copyButton.textContent = 'Copy to Clipboard', 2000);
                });
            };
            downloadStatus.appendChild(copyButton);
        });
    }
}

function handleRegularDownload(blob, filename, downloadStatus) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    }, 100);
    if (downloadStatus) downloadStatus.textContent = 'Download complete!';
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

    select.innerHTML = '<option value="">All</option>';  // Reset and add 'All' option

    Array.from(options).sort().forEach(option => {
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

    currentResults = database.filter(item => {
        const itemString = `${item.brand} ${item.model} ${item.device_type} ${item.additional_info || ''}`.toLowerCase();
        const matchesSearch = searchTerms.every(term => itemString.includes(term));
        const matchesDeviceType = deviceType === '' || item.device_type === deviceType;
        const matchesBrand = brand === '' || item.brand === brand;

        return matchesSearch && matchesDeviceType && matchesBrand;
    });

    currentPage = 1;
    displayResults();
    updateStats(currentResults.length);
    updateSuggestions(searchTerm);
}

function displayResults() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';

    if (currentResults.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        updatePagination(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = currentResults.slice(startIndex, endIndex);

    pageResults.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const downloadUrl = `https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/${item.path.replace(/\\/g, '/')}`;

        let additionalInfoHtml = '';
        if (item.additional_info) {
            if (item.additional_info.length > 50) {
                additionalInfoHtml = `
                    <p><strong>Additional Info:</strong> 
                        <span class="info-text">${item.additional_info.substring(0, 50)}
                            <span class="more-text" style="display:none">${item.additional_info.substring(50)}</span>
                        </span>
                        <button class="read-more">Read More</button>
                    </p>`;
            } else {
                additionalInfoHtml = `<p><strong>Additional Info:</strong> ${item.additional_info}</p>`;
            }
        }

        resultItem.innerHTML = `
            <h3>${item.brand} ${item.model}</h3>
            <p><strong>Type:</strong> ${item.device_type}</p>
            <p><strong>File:</strong> ${item.filename}</p>
            ${additionalInfoHtml}
            <button class="download-button">Download IR File</button>
        `;

        const downloadButton = resultItem.querySelector('.download-button');
        downloadButton.addEventListener('click', () => downloadFile(downloadUrl, item.filename));

        const readMoreButton = resultItem.querySelector('.read-more');
        if (readMoreButton) {
            readMoreButton.addEventListener('click', function() {
                const infoText = this.parentNode.querySelector('.info-text');
                const moreText = this.parentNode.querySelector('.more-text');
                if (moreText.style.display === 'none') {
                    moreText.style.display = 'inline';
                    this.textContent = 'Read Less';
                } else {
                    moreText.style.display = 'none';
                    this.textContent = 'Read More';
                }
            });
        }

        resultsDiv.appendChild(resultItem);
    });

    updatePagination(currentResults.length);
}

function updatePagination(totalResults) {
    const paginationDiv = document.getElementById('pagination');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');

    if (!paginationDiv || !prevButton || !nextButton || !currentPageSpan) return;

    const totalPages = Math.ceil(totalResults / itemsPerPage);

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

    currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;

    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayResults();
            window.scrollTo(0, 0);  // Scroll to top when changing page
        }
    };

    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayResults();
            window.scrollTo(0, 0);  // Scroll to top when changing page
        }
    };

    paginationDiv.style.display = totalPages > 1 ? 'flex' : 'none';
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