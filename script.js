let database = [];
let currentPage = 1;
const itemsPerPage = 20;

window.onload = function() {
    loadDatabase();
    document.getElementById('searchButton').addEventListener('click', searchDatabase);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchDatabase();
        }
    });
};

function loadDatabase() {
    document.getElementById('loading').style.display = 'block';
    fetch('flipper_irdb_database.json')
        .then(response => response.json())
        .then(data => {
            database = data;
            document.getElementById('loading').style.display = 'none';
            console.log('Database loaded successfully');
            populateFilters();
            searchDatabase();
        })
        .catch(error => {
            console.error('Error loading database:', error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('results').innerHTML = '<p>Error loading database. Please try again later.</p>';
        });
}

function populateFilters() {
    const deviceTypes = new Set(database.map(item => item.device_type));
    const brands = new Set(database.map(item => item.brand));

    const deviceTypeFilter = document.getElementById('deviceTypeFilter');
    const brandFilter = document.getElementById('brandFilter');

    populateSelect(deviceTypeFilter, deviceTypes);
    populateSelect(brandFilter, brands);
}

function populateSelect(select, options) {
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const deviceType = document.getElementById('deviceTypeFilter').value;
    const brand = document.getElementById('brandFilter').value;

    const results = database.filter(item => 
        (searchTerm === '' || item.brand.toLowerCase().includes(searchTerm) ||
         item.model.toLowerCase().includes(searchTerm) ||
         item.device_type.toLowerCase().includes(searchTerm) ||
         (item.additional_info && item.additional_info.toLowerCase().includes(searchTerm))) &&
        (deviceType === '' || item.device_type === deviceType) &&
        (brand === '' || item.brand === brand)
    );

    currentPage = 1;
    displayResults(results);
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const paginationDiv = document.getElementById('pagination');
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
        resultItem.innerHTML = `
            <h3>${item.brand} ${item.model}</h3>
            <p><strong>Device Type:</strong> ${item.device_type}</p>
            <p><strong>Series:</strong> ${item.series || 'N/A'}</p>
            <p><strong>Filename:</strong> ${item.filename}</p>
            ${item.additional_info ? `<p><strong>Additional Info:</strong> ${item.additional_info}</p>` : ''}
            <a href="https://raw.githubusercontent.com/logickworkshop/Flipper-IRDB/main/${encodeURIComponent(item.path)}" class="download-link" target="_blank">Download IR File</a>
        `;
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