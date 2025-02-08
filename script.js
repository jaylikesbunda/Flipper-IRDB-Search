let database = [];
let currentPage = 1;
let itemsPerPage = 20;
let debounceTimer;
let currentResults = [];
let flipperSerial = null;

// Add these constants at the top with manuallyFulfilledRequests
const teachingTerms = [
    'teach', 'teaching', 'teacher', 'school', 'classroom', 'education', 
    'university', 'college', 'professor', 'student', 'smartboard', 
    'whiteboard', 'lecture', 'campus', 'academic'
];

const dontKnowVariations = [
    'i dont know', 'idk', 'dont know', "don't know", 'unknown', 'not sure'
];

document.addEventListener('DOMContentLoaded', async function() {
    await loadDatabase(); // Wait for DB before any requests processing
    setupEventListeners();
    displayIRRequests(); // Initial load after DB ready
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

const manuallyFulfilledRequests = [
    { brand: 'Sony', model: 'MHC-GSX75', deviceType: 'Audio Mixer/Stereo' },
    // Add more manually fulfilled requests here
];
function isRequestFulfilled(request, database) {
    // Combine manual entries with database
    const fullDataset = [...database, ...manuallyFulfilledRequests];
    
    // Add debug logging
    console.log(`Checking request: ${request.brand} ${request.model}`);
    let checkedItems = 0;
    let matches = 0;
    let foundMatch = false;

    // Changed from some() to forEach to check ALL items
    fullDataset.forEach(item => {
        checkedItems++;
        const brandMatch = isSimilar(item.brand, request.brand);
        const modelMatch = isSimilar(item.model, request.model);
        
        if (brandMatch && modelMatch) {
            matches++;
            console.log(`Match found: ${item.brand} ${item.model}`);
            foundMatch = true; // Don't return, keep checking all
        }
    });

    console.log(`Checked ${checkedItems} items, found ${matches} matches`);
    return foundMatch;
}

const normalize = (str) => {
    // Aggressive normalization preserving numbers
    return String(str).toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Keep letters/numbers only
        .replace(/(brand|mark|model|type|series|version|bravia|oled|smart|class)/gi, '')
        .substring(0, 30); // Increased length for long model numbers
};

const isSimilar = (str1, str2) => {
    // Strict brand matching
    const brand1 = normalize(String(str1).split(/\s+/)[0]);
    const brand2 = normalize(String(str2).split(/\s+/)[0]);
    if (brand1 !== brand2) return false;

    // Model number validation
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
    
    // Require sequential number match
    const numbers1 = norm1.replace(/[^0-9]/g, '');
    const numbers2 = norm2.replace(/[^0-9]/g, '');
    if (numbers1 !== numbers2) return false;
    
    // Letter sequence check
    const letters1 = norm1.replace(/[0-9]/g, '');
    const letters2 = norm2.replace(/[0-9]/g, '');
    const lcs = longestCommonSubsequence(letters1, letters2);
    if (lcs < Math.min(3, letters1.length, letters2.length)) return false;

    // Allow small typos in full model
    return levenshtein(norm1, norm2) <= 2; // Max 2 character differences
};

// Add LCS check for sequential matches
function longestCommonSubsequence(a, b) {
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a.charAt(i - 1) === b.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }
    return matrix[a.length][b.length];
}

function showWebSerialPopup() {
    const popup = document.getElementById('serialPopup');
    const popupContent = popup.querySelector('.popup-content');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        popupContent.innerHTML = `
            <img src="/icon.png" alt="Flipper Zero" class="popup-icon">
            <h2>Mobile Device Detected</h2>
            <p>Web Serial is not supported on mobile devices. To connect to your Flipper Zero, please use a desktop browser:</p>
            <ul>
                <li><i class="fab fa-chrome"></i> Google Chrome</li>
                <li><i class="fab fa-edge"></i> Microsoft Edge</li>
                <li><i class="fab fa-opera"></i> Opera</li>
                <li><i class="fab fa-chrome"></i> Brave</li>
            </ul>
            <button class="btn close-popup">Got it!</button>
        `;
    } else {
        popupContent.innerHTML = `
            <img src="/icon.png" alt="Flipper Zero" class="popup-icon">
            <h2>Browser Not Compatible</h2>
            <p>Web Serial is not supported in this browser. To connect to your Flipper Zero, please use:</p>
            <ul>
                <li><i class="fab fa-chrome"></i> Google Chrome</li>
                <li><i class="fab fa-edge"></i> Microsoft Edge</li>
                <li><i class="fab fa-opera"></i> Opera</li>
                <li><i class="fab fa-chrome"></i> Brave</li>
            </ul>
            <button class="btn close-popup">Got it!</button>
        `;
    }
    
    popup.style.display = 'block';
    
    // Add click event to close button
    const closeBtn = popup.querySelector('.close-popup');
    closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
    });

    // Close on overlay click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.style.display = 'none';
        }
    });
}

async function sendToFlipper(url, filename) {
    const statusDiv = document.getElementById('downloadStatus');
    
    try {
        // Initialize FlipperSerial if not already done
        if (!flipperSerial) {
            flipperSerial = new FlipperSerial();
        }

        // Check Web Serial availability before attempting to connect
        if (!flipperSerial.isWebSerialAvailable()) {
            showWebSerialPopup();
            return;
        }

        // Connect to Flipper if not connected
        if (!flipperSerial.isConnected) {
            statusDiv.textContent = 'Connecting to Flipper...';
            await flipperSerial.connect();
        }

        // Fetch the IR file
        statusDiv.textContent = 'Downloading IR file...';
        const response = await fetch(url);
        const text = await response.text();

        // Create the directory if it doesn't exist
        statusDiv.textContent = 'Creating directory...';
        await flipperSerial.writeCommand('storage mkdir /ext/infrared');

        // Write the file to Flipper
        statusDiv.textContent = 'Sending to Flipper...';
        await flipperSerial.writeFile(`/ext/infrared/${filename}`, text);

        statusDiv.textContent = 'Successfully sent to Flipper!';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);

    } catch (error) {
        console.error('Error sending to Flipper:', error);
        statusDiv.textContent = `Error: ${error.message}. Please try again.`;
        // Reset FlipperSerial instance on error
        flipperSerial = null;
    }
}

async function displayIRRequests() {
    const requestsList = document.getElementById('requestsList');
    requestsList.innerHTML = '<p>Loading requests...</p>';
    
    // Ensure database is fully loaded
    if (database.length === 0) await loadDatabase();

    // Increased limit from 25 to 100
    db.collection("irRequests").orderBy("timestamp", "desc").limit(100).get()
        .then((querySnapshot) => {
            console.log("Received query snapshot:", querySnapshot.size);
            requestsList.innerHTML = '';
            
            const requests = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                requests.push(data);
            });

            // Add requests to the DOM
            requests.forEach((data, index) => {
                const requestItem = document.createElement('div');
                requestItem.className = `request-item ${index >= 10 ? 'hidden' : ''}`; // Show first 10
                
                // Check if request contains teaching-related terms
                const isTeachingRelated = teachingTerms.some(term => {
                    const termLower = term.toLowerCase();
                    return [data.brand, data.model, data.deviceType].some(field => 
                        String(field).toLowerCase().includes(termLower)
                    );
                });

                // Check for "i dont know" variations
                const hasDontKnow = dontKnowVariations.some(term => {
                    return [data.brand, data.model].some(field => 
                        String(field).toLowerCase().includes(term)
                    );
                });

                // Check if brand and model are exactly the same
                const isSameBrandModel = data.brand?.toLowerCase().trim() === data.model?.toLowerCase().trim();

                let invalidReason = '';
                if (isTeachingRelated) {
                    invalidReason = 'Tampering with school equipment you do not own is illegal.';
                } else if (hasDontKnow) {
                    invalidReason = 'Please provide actual brand/model information instead of "I don\'t know"';
                } else if (isSameBrandModel) {
                    invalidReason = 'Brand and model cannot be the same';
                }

                // Recalculate the status every time so that matching is performed and logs are printed.
                data.status = isRequestFulfilled(data, database) ? 'Added to database' : 'Pending';

                // Format the timestamp
                const timestamp = data.timestamp.toDate();
                const formattedDate = timestamp.toLocaleDateString();
                const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                requestItem.innerHTML = `
                    <p><span class="label">Brand</span><span class="content">${data.brand}</span></p>
                    <p><span class="label">Model</span><span class="content">${data.model}</span></p>
                    <p><span class="label">Type</span><span class="content">${data.deviceType}</span></p>
                    <p><span class="label">Date</span><span class="content">${formattedDate} ${formattedTime}</span></p>
                    <p><span class="label">Status</span><span class="content ${data.status === 'Invalid Request' ? 'invalid-status' : (data.status === 'Added to database' ? 'fulfilled-status' : '')}">${data.status}</span></p>
                    ${data.warning ? `<p class="warning-text">${data.warning}</p>` : ''}
                `;
                requestsList.appendChild(requestItem);
            });

            // Updated load more logic
            if (requests.length > 10) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'load-more-btn';
                
                loadMoreBtn.addEventListener('click', () => {
                    // Get current hidden requests each click
                    const currentHidden = document.querySelectorAll('.request-item.hidden');
                    const showCount = Math.min(10, currentHidden.length);
                    
                    // Show next batch
                    Array.from(currentHidden).slice(0, showCount).forEach(request => {
                        request.classList.remove('hidden');
                    });

                    // Update button text or remove
                    const remaining = currentHidden.length - showCount;
                    loadMoreBtn.textContent = remaining > 0 
                        ? `Load More (${remaining} remaining)` 
                        : 'Show Less';

                    if (remaining <= 0) {
                        loadMoreBtn.remove();
                    }
                });

                // Initial button text
                const initialHidden = document.querySelectorAll('.request-item.hidden');
                loadMoreBtn.textContent = `Load More (${initialHidden.length} remaining)`;
                
                requestsList.appendChild(loadMoreBtn);
            }

            if (querySnapshot.empty) {
                console.log("No requests found");
                requestsList.innerHTML = '<p>No requests found.</p>';
            }
        })
        .catch((error) => {
            console.error("Error fetching requests: ", error);
            requestsList.innerHTML = '<p>Error loading requests. Please try again later.</p>';
        });
}

function submitIRRequest(e) {
    e.preventDefault();

    const brand = document.getElementById('brandInput').value;
    const model = document.getElementById('modelInput').value;
    const deviceType = document.getElementById('deviceTypeInput').value;
    const requestStatus = document.getElementById('requestStatus');
    
    // Clear previous status classes
    requestStatus.className = '';

    // Check for "i dont know" or similar variations
    const hasDontKnow = dontKnowVariations.some(term => {
        return [brand.toLowerCase(), model.toLowerCase()].some(field => field.includes(term));
    });

    // Check if brand and model are exactly the same
    const isSameBrandModel = brand.toLowerCase().trim() === model.toLowerCase().trim();

    if (hasDontKnow || isSameBrandModel) {
        requestStatus.textContent = hasDontKnow ? 
            "Invalid request: Please provide actual brand/model information instead of 'I don't know'" :
            "Invalid request: Brand and model cannot be the same";
        requestStatus.className = 'error';
        return;
    }

    // Check for teaching/school-related terms
    const isTeachingRelated = teachingTerms.some(term => {
        return [brand, model, deviceType].some(field => {
            const fieldLower = String(field).toLowerCase();
            const termLower = term.toLowerCase();
            return fieldLower.includes(termLower);
        });
    });

    // Add the request to Firestore with status if teaching-related
    const requestData = {
        brand: brand,
        model: model,
        deviceType: deviceType,
        timestamp: new Date(),
        status: isTeachingRelated ? 'Invalid Request' : 'Pending',
        warning: isTeachingRelated ? 'Tampering with school equipment you do not own is illegal.' : ''
    };

    db.collection("irRequests").add(requestData)
    .then((docRef) => {
        if (isTeachingRelated) {
            requestStatus.innerHTML = `Request marked as invalid - teaching/school-related requests are not accepted.<br><span style="color: #ff4444; font-size: 0.9em;">Warning: Tampering with school equipment you do not own is illegal.</span>`;
            requestStatus.className = 'error';
        } else {
            requestStatus.textContent = "Request submitted successfully!";
            requestStatus.className = 'success';
            document.getElementById('requestForm').reset();
        }
        // Refresh the requests list
        displayIRRequests();
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        requestStatus.textContent = "Error submitting request. Please try again.";
        requestStatus.className = 'error';
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
            const lastModified = new Date(response.headers.get('last-modified'));
            document.querySelector('.last-updated').innerHTML = `
                <span class="update-badge">
                    <i class="fas fa-sync-alt"></i>
                    Last updated: ${lastModified.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </span>
            `;
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
    
    // Clean up and normalize brand names
    const brands = new Set(database.map(item => {
        // Skip empty, undefined, or obviously invalid brands
        if (!item.brand || 
            item.brand.trim() === '' || 
            item.brand.toLowerCase() === 'unknown' ||
            item.brand.toLowerCase() === 'n/a' ||
            item.brand.toLowerCase() === 'none' ||
            item.brand.includes('/') || // Likely a path
            item.brand.includes('\\') || // Likely a path
            item.brand.length < 2 || // Too short to be valid
            /^[0-9.]+$/.test(item.brand) || // Just numbers
            item.brand.includes('.ir')) { // File extension
            return null;
        }
        
        // Normalize brand name
        let brand = item.brand.trim();
        // Convert to Title Case
        brand = brand.replace(/\w\S*/g, txt => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        // Remove common junk text
        brand = brand.replace(/\.(txt|ir|json)$/i, '')
                    .replace(/[_-]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
        
        return brand;
    }).filter(brand => brand !== null));

    populateSelect('deviceTypeFilter', deviceTypes);
    populateSelect('brandFilter', Array.from(brands).sort((a, b) => 
        a.localeCompare(b, undefined, {sensitivity: 'base'})
    ));
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;

    const defaultText = id === 'deviceTypeFilter' ? 'All Types' : 'All Brands';
    select.innerHTML = `<option value="">${defaultText}</option>`;  // Reset and add 'All' option

    Array.from(options).forEach(option => {
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
                    <p><strong>Info</strong> 
                        <span class="info-text">${item.additional_info.substring(0, 50)}
                            <span class="more-text" style="display:none">${item.additional_info.substring(50)}</span>
                        </span>
                        <button class="read-more">Read More</button>
                    </span></p>`;
            } else {
                additionalInfoHtml = `<p><strong>Info</strong> ${item.additional_info}</p>`;
            }
        }

        resultItem.innerHTML = `
            <h3>${item.brand} ${item.model}</h3>
            <div class="content-wrapper">
                <p><strong>Type</strong> ${item.device_type}</p>
                <p><strong>File</strong> ${item.filename}</p>
                ${additionalInfoHtml}
            </div>
            <div class="button-group">
                <button class="download-button">Download IR File</button>
                <button class="send-to-flipper-button">Send to Flipper</button>
            </div>
            <div class="send-status" style="display: none;"></div>
        `;

        const downloadButton = resultItem.querySelector('.download-button');
        downloadButton.addEventListener('click', () => downloadFile(downloadUrl, item.filename));

        const sendButton = resultItem.querySelector('.send-to-flipper-button');
        const sendStatus = resultItem.querySelector('.send-status');
        
        sendButton.addEventListener('click', async () => {
            try {
                // Check Web Serial availability first
                if (!flipperSerial) {
                    flipperSerial = new FlipperSerial();
                }
                
                if (!flipperSerial.isWebSerialAvailable()) {
                    showWebSerialPopup();
                    return;
                }

                sendButton.disabled = true;
                sendButton.classList.add('sending');
                sendStatus.style.display = 'block';

                // Connect to Flipper if not connected
                if (!flipperSerial.isConnected) {
                    sendStatus.textContent = 'Connecting to Flipper...';
                    await flipperSerial.connect();
                }

                // Fetch the IR file
                sendStatus.textContent = 'Downloading IR file...';
                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error('Failed to download file');
                const text = await response.text();

                // Create directory and write file
                sendStatus.textContent = 'Creating directory...';
                await flipperSerial.writeCommand('storage mkdir /ext/infrared');

                sendStatus.textContent = 'Sending to Flipper...';
                await flipperSerial.writeFile(`/ext/infrared/${item.filename}`, text);

                // Success
                sendStatus.textContent = 'Successfully sent to Flipper!';
                sendStatus.classList.add('success');
                sendStatus.classList.remove('error');

                // Reset after 3 seconds
                setTimeout(() => {
                    sendStatus.style.display = 'none';
                    sendStatus.classList.remove('success');
                    sendButton.classList.remove('sending');
                    sendButton.disabled = false;
                }, 3000);

            } catch (error) {
                console.error('Error sending to Flipper:', error);
                sendStatus.textContent = `Error: ${error.message}. Please try again.`;
                sendStatus.classList.add('error');
                sendStatus.classList.remove('success');
                flipperSerial = null; // Reset FlipperSerial instance on error
                sendButton.classList.remove('sending');
                sendButton.disabled = false;
            }
        });

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

    // Get last commit date from GitHub API
    fetch('https://api.github.com/repos/jaylikesbunda/Flipper-IRDB-Search/commits?path=flipper_irdb_database.json')
    .then(response => response.json())
    .then(commits => {
        const lastCommit = commits[0].commit.committer.date;
        const lastUpdated = new Date(lastCommit);
        document.querySelector('.last-updated').innerHTML = `
            <span class="update-badge">
                <i class="fas fa-sync-alt"></i>
                Last updated: ${lastUpdated.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </span>
        `;
    })
    .catch(error => {
        console.error('FUCKING GITHUB API ERROR:', error);
        document.querySelector('.last-updated').innerHTML = `
            <span class="update-badge error">
                <i class="fas fa-skull-crossbones"></i>
                Failed to load update time
            </span>
        `;
    });
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

document.addEventListener('DOMContentLoaded', (event) => {
    const requestRemoteBtn = document.getElementById('requestRemoteBtn');
    
    requestRemoteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const irRequestForm = document.getElementById('irRequestForm');
        irRequestForm.scrollIntoView({ behavior: 'smooth' });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    displayIRRequests();
});

// Levenshtein distance implementation
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b.charAt(i-1) === a.charAt(j-1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i-1][j] + 1,
                matrix[i][j-1] + 1,
                matrix[i-1][j-1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}
