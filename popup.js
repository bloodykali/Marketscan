// Constants
const SEARCH_DELAY = 1000;
const SEARCH_TIMEOUT = 10000;

// DOM Elements
const elements = {
    searchButton: document.getElementById('searchButton'),
    clearButton: document.getElementById('clearButton'),
    keyword: document.getElementById('keyword'),
    category: document.getElementById('category'),
    subcategory: document.getElementById('subcategory'),
    results: document.getElementById('results'),
    loading: document.getElementById('loading')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeExtension);
elements.searchButton.addEventListener('click', handleSearch);
elements.clearButton.addEventListener('click', resetForm);
elements.category.addEventListener('change', updateSubcategories);
elements.subcategory.addEventListener('change', updateKeywords);

// Initialize Extension
function initializeExtension() {
    loadSavedSettings();
    updateSubcategories();
    updateKeywords();
}

// Search Handling
async function handleSearch() {
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value;
    const keyword = elements.keyword.value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    
    if (!category || !subcategory) {
        showError('Please select both Category and Subcategory');
        return;
    }

    if (minPrice && maxPrice && parseInt(maxPrice) <= parseInt(minPrice)) {
        showError('Maximum price must be greater than minimum price');
        return;
    }

    let searchTerm;
    if (keyword) {
        searchTerm = keyword;
    } else {
        const subcategoryOption = elements.subcategory.options[elements.subcategory.selectedIndex];
        searchTerm = subcategoryOption.text;
    }
    
    showLoading();
    
    try {
        // Save settings before search
        if (chrome.storage?.local) {
            chrome.storage.local.set({
                lastCategory: category,
                lastSubcategory: subcategory,
                lastKeyword: keyword,
                lastMaxPrice: maxPrice
            });
        }

        // Construct URL with price parameters
        let searchUrl = `https://www.facebook.com/marketplace/Bangladesh/search?query=${encodeURIComponent(searchTerm)}`;
        
        // Add price filters if specified
        if (minPrice) searchUrl += `&minPrice=${minPrice}`;
        if (maxPrice) searchUrl += `&maxPrice=${maxPrice}`;

        const tab = await chrome.tabs.create({ url: searchUrl });
        
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                executeFilter(tab.id, searchTerm, maxPrice);
                hideLoading();
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to perform search');
        hideLoading();
    }
}

// Filter Results
function executeFilter(tabId, keyword, maxPrice) {
    chrome.scripting.executeScript({
        target: { tabId },
        function: filterMarketplaceResults,
        args: [keyword, maxPrice]
    });
}

// Content Script Function
function filterMarketplaceResults(keyword, maxPrice) {
    const minPrice = document.getElementById('minPrice').value;
    const excludedCategories = [
        'phone', 'adult toy', 'medicine', 'bluetooth headphone',
        'vehicle', 'car', 'cycle', 'toy', 'book', 'clothing',
        'musical', 'instrument'
    ];

    const fixableKeywords = [
        'broken screen', 'battery replacement', 'loose charging port',
        'broken buttons', 'keyboard keys', 'loose hinges', 'replace ram',
        'clean fans', 'broken charger cable', 'loose tv stand'
        // ... rest of your fixable keywords
    ];

    const interval = setInterval(() => {
        const items = document.querySelectorAll('[data-testid="marketplace_feed_item"]');
        
        items.forEach(item => {
            const titleElement = item.querySelector('[aria-label]');
            const priceElement = item.querySelector('[aria-label*="Price"]');
            
            if (!titleElement) return;

            const title = titleElement.innerText.toLowerCase();
            let price = 0;

            if (priceElement) {
                // Extract price and convert to number, handling different formats
                const priceText = priceElement.innerText;
                price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            }

            const shouldHide = 
                (minPrice && !isNaN(price) && price < parseFloat(minPrice)) ||
                (maxPrice && !isNaN(price) && price > parseFloat(maxPrice)) ||
                isExcludedItem(title, keyword);

            if (shouldHide) {
                item.style.display = 'none';
            }
        });
    }, SEARCH_DELAY);

    setTimeout(() => clearInterval(interval), SEARCH_TIMEOUT);
}

function isExcludedItem(title, keyword) {
    const excludedCategories = [
        'phone', 'adult toy', 'medicine', 'bluetooth headphone',
        'vehicle', 'car', 'cycle', 'toy', 'book', 'clothing',
        'musical', 'instrument'
    ];

    return excludedCategories.some(cat => title.includes(cat));
}

// UI Helpers
function showLoading() {
    elements.loading.style.display = 'block';
    elements.searchButton.disabled = true;
}

function hideLoading() {
    elements.loading.style.display = 'none';
    elements.searchButton.disabled = false;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    elements.results.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Update reset form to properly clear all fields
function resetForm() {
    elements.category.selectedIndex = 0;
    elements.subcategory.innerHTML = '<option value="">Select Subcategory</option>';
    elements.keyword.innerHTML = '<option value="">Any Keyword</option>';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    updateSubcategories();
    elements.results.innerHTML = '';
}

// Settings Management
function loadSavedSettings() {
    if (chrome.storage?.local) {
        chrome.storage.local.get(['keyword', 'category'], data => {
            if (data.keyword) elements.keyword.value = data.keyword;
            if (data.category) elements.category.value = data.category;
            updateSubcategories();
        });
    }
}

// ... rest of your existing updateSubcategories and updateKeywords functions ...

const subcategories = {
    "apparel": [
        { value: "mens clothing", text: "Men's Clothing" },
        { value: "womens clothing", text: "Women's Clothing" },
        { value: "kids clothing", text: "Kid's Clothing" },
        { value: "shoes", text: "Shoes" },
        { value: "accessories", text: "Accessories" }
    ],
    "electronics": [
        { value: "smartphones tablets", text: "Smartphones & Tablets" },
        { value: "laptops", text: "Laptops" },
        { value: "tvs", text: "TVs" },
        { value: "audio equipment", text: "Audio Equipment" },
        { value: "cameras accessories", text: "Cameras & Accessories" }
    ],
    "family": [
        { value: "baby clothing", text: "Baby Clothing" },
        { value: "baby gear", text: "Baby Gear" },
        { value: "maternity wear", text: "Maternity Wear" },
        { value: "toys", text: "Toys" }
    ],
    "free stuff": [
        { value: "furniture", text: "Furniture" },
        { value: "electronics", text: "Electronics" },
        { value: "household items", text: "Household Items" },
        { value: "clothing", text: "Clothing" }
    ],
    "gaming accessories": [
        { value: "audio", text: "Audio" },
        { value: "input devices", text: "Input Devices" },
        { value: "virtual reality", text: "Virtual Reality" }
    ],
    "garden outdoor": [
        { value: "plants gardening supplies", text: "Plants & Gardening Supplies" },
        { value: "patio furniture", text: "Patio Furniture" },
        { value: "outdoor equipment", text: "Outdoor Equipment" }
    ],
    "hobbies": [
        { value: "collectibles", text: "Collectibles" },
        { value: "craft supplies", text: "Craft Supplies" },
        { value: "musical instruments", text: "Musical Instruments" }
    ],
    "home goods": [
        { value: "furniture", text: "Furniture" },
        { value: "decor items", text: "Decor Items" },
        { value: "kitchenware", text: "Kitchenware" }
    ],
    "home improvement supplies": [
        { value: "tools", text: "Tools" },
        { value: "building materials", text: "Building Materials" },
        { value: "plumbing fixtures", text: "Plumbing Fixtures" }
    ],
    "miscellaneous": [
        { value: "unique items", text: "Unique Items" },
        { value: "free stuff", text: "Free Stuff" },
        { value: "repairable items", text: "Repairable Items" }
    ],
    "musical instruments": [
        { value: "guitars", text: "Guitars" },
        { value: "keyboards pianos", text: "Keyboards & Pianos" },
        { value: "drums percussion", text: "Drums & Percussion" }
    ],
    "office supplies": [
        { value: "furniture", text: "Furniture" },
        { value: "electronics", text: "Electronics" },
        { value: "stationery", text: "Stationery" }
    ],
    "pet supplies": [
        { value: "food", text: "Food" },
        { value: "accessories", text: "Accessories" },
        { value: "health", text: "Health" }
    ],
    "photography video accessories": [
        { value: "stabilization", text: "Stabilization" },
        { value: "lighting", text: "Lighting" },
        { value: "optics", text: "Optics" }
    ],
    "property rentals": [
        { value: "apartments for rent", text: "Apartments for Rent" },
        { value: "houses for rent", text: "Houses for Rent" },
        { value: "roommates shared living", text: "Roommates & Shared Living" },
        { value: "commercial spaces for rent", text: "Commercial Spaces for Rent" },
        { value: "vacation rentals", text: "Vacation Rentals" }
    ],
    "smart home accessories": [
        { value: "lighting", text: "Lighting" },
        { value: "security", text: "Security" },
        { value: "power", text: "Power" }
    ],
    "sporting goods": [
        { value: "fitness equipment", text: "Fitness Equipment" },
        { value: "outdoor sports gear", text: "Outdoor Sports Gear" },
        { value: "cycling", text: "Cycling" }
    ],
    "toys games": [
        { value: "action figures", text: "Action Figures" },
        { value: "board games", text: "Board Games" },
        { value: "remote control toys", text: "Remote Control Toys" }
    ],
    "vehicles": [
        { value: "cars", text: "Cars" },
        { value: "motorcycles", text: "Motorcycles" },
        { value: "trucks", text: "Trucks" },
        { value: "boats", text: "Boats" },
        { value: "recreational vehicles", text: "Recreational Vehicles (RVs)" },
        { value: "spare parts accessories", text: "Spare Parts & Accessories" },
        { value: "bicycles", text: "Bicycles" }
    ],
    "computers": [
        { value: "desktop computers", text: "Desktop Computers" },
        { value: "all in one pc", text: "All-in-One PCs" },
        { value: "gaming computers", text: "Gaming PCs" },
        { value: "pc parts", text: "PC Parts" },
        { value: "monitors", text: "Monitors" }
    ],
    "mobile phones": [
        { value: "smartphones", text: "Smartphones" },
        { value: "basic phones", text: "Basic Phones" },
        { value: "phone accessories", text: "Phone Accessories" },
        { value: "phone parts", text: "Phone Parts" }
    ],
    "watches": [
        { value: "smart watches", text: "Smart Watches" },
        { value: "analog watches", text: "Analog Watches" },
        { value: "digital watches", text: "Digital Watches" },
        { value: "luxury watches", text: "Luxury Watches" },
        { value: "watch accessories", text: "Watch Accessories" }
    ],
    "beauty": [
        { value: "makeup", text: "Makeup" },
        { value: "skincare", text: "Skincare" },
        { value: "haircare", text: "Haircare" },
        { value: "fragrances", text: "Fragrances" },
        { value: "beauty tools", text: "Beauty Tools" }
    ],
    "audio equipment": [
        { value: "amplifiers", text: "Amplifiers" },
        { value: "speakers", text: "Speakers" },
        { value: "headphones", text: "Headphones" },
        { value: "audio accessories", text: "Audio Accessories" }
    ]
};

const keywords = {
    "action figures": [
        { value: "superhero action figures", text: "superhero action figures" },
        { value: "movie action figures", text: "movie action figures" },
        { value: "anime action figures", text: "anime action figures" },
        { value: "video game action figures", text: "video game action figures" }
    ],
    "apartments for rent": [
        { value: "apartments for rent", text: "apartments for rent" },
        { value: "2-bedroom apartments", text: "2-bedroom apartments" },
        { value: "affordable studio apartments", text: "affordable studio apartments" },
        { value: "luxury flats for rent", text: "luxury flats for rent" },
        { value: "family apartments", text: "family apartments" }
    ],
    "audio equipment": [
        { value: "Bluetooth speakers", text: "Bluetooth speakers" },
        { value: "home theater systems", text: "home theater systems" },
        { value: "headphones under BDT 5k", text: "headphones under BDT 5k" },
        { value: "soundbars for sale", text: "soundbars for sale" },
        { value: "studio microphones", text: "studio microphones" }
    ],
    "baby clothing": [
        { value: "affordable baby clothes", text: "affordable baby clothes" },
        { value: "newborn outfits", text: "newborn outfits" },
        { value: "winter wear for babies", text: "winter wear for babies" },
        { value: "baby rompers", text: "baby rompers" },
        { value: "kids’ accessories", text: "kids’ accessories" }
    ],
    "baby gear": [
        { value: "strollers for sale", text: "strollers for sale" },
        { value: "baby carriers", text: "baby carriers" },
        { value: "affordable car seats", text: "affordable car seats" },
        { value: "baby walkers", text: "baby walkers" },
        { value: "high chairs", text: "high chairs" }
    ],
    "bicycles": [
        { value: "buy bicycles", text: "buy bicycles" },
        { value: "mountain bikes under BDT 50k", text: "mountain bikes under BDT 50k" },
        { value: "electric bicycles", text: "electric bicycles" },
        { value: "used road bikes", text: "used road bikes" },
        { value: "affordable cycling gear", text: "affordable cycling gear" }
    ],
    "boats": [
        { value: "boats for sale", text: "boats for sale" },
        { value: "used fishing boats", text: "used fishing boats" },
        { value: "affordable speedboats", text: "affordable speedboats" },
        { value: "sailboats near rivers", text: "sailboats near rivers" },
        { value: "houseboats for sale", text: "houseboats for sale" }
    ],
    "board games": [
        { value: "strategy board games", text: "strategy board games" },
        { value: "family board games", text: "family board games" },
        { value: "party board games", text: "party board games" },
        { value: "educational board games", text: "educational board games" }
    ],
    "cars": [
        { value: "used cars", text: "used cars" },
        { value: "cheap sedans for sale", text: "cheap sedans for sale" },
        { value: "Toyota cars", text: "Toyota cars" },
        { value: "hybrid cars under BDT 20 lakhs", text: "hybrid cars under BDT 20 lakhs" },
        { value: "affordable cars for sale", text: "affordable cars for sale" },
        { value: "accident damaged car", text: "Accident Damaged Car" },
        { value: "repairable vehicle cheap", text: "Repairable Vehicle" },
        { value: "non running car sale", text: "Non-running Car" },
        { value: "engine problem car", text: "Engine Problem Car" },
        { value: "salvage title vehicle", text: "Salvage Title Vehicle" }
    ],
    "cameras accessories": [
        { value: "DSLR cameras for sale", text: "DSLR cameras for sale" },
        { value: "camera lenses", text: "camera lenses" },
        { value: "GoPro cameras", text: "GoPro cameras" },
        { value: "tripods for sale", text: "tripods for sale" },
        { value: "camera accessories", text: "camera accessories" },
        { value: "broken dslr camera cheap", text: "Broken DSLR Camera" },
        { value: "damaged camera lens", text: "Damaged Camera Lens" },
        { value: "faulty digital camera", text: "Faulty Digital Camera" },
        { value: "camera parts repair", text: "Camera Parts Repair" }
    ],
    "clothing": [
        { value: "free clothes", text: "free clothes" },
        { value: "used clothing giveaway", text: "used clothing giveaway" },
        { value: "free shoes", text: "free shoes" },
        { value: "free accessories", text: "free accessories" },
        { value: "free winter wear", text: "free winter wear" }
    ],
    "collectibles": [
        { value: "vintage items", text: "vintage items" },
        { value: "antique furniture", text: "antique furniture" },
        { value: "rare coins", text: "rare coins" },
        { value: "collectible toys", text: "collectible toys" },
        { value: "artwork", text: "artwork" }
    ],
    "commercial spaces for rent": [
        { value: "office spaces", text: "office spaces" },
        { value: "commercial properties", text: "commercial properties" },
        { value: "shops for rent", text: "shops for rent" },
        { value: "coworking spaces", text: "coworking spaces" },
        { value: "warehouse rentals", text: "warehouse rentals" }
    ],
    "craft supplies": [
        { value: "sewing machines", text: "sewing machines" },
        { value: "fabric", text: "fabric" },
        { value: "knitting supplies", text: "knitting supplies" },
        { value: "painting supplies", text: "painting supplies" },
        { value: "craft kits", text: "craft kits" }
    ],
    "cycling": [
        { value: "mountain bikes", text: "mountain bikes" },
        { value: "road bikes", text: "road bikes" },
        { value: "bike helmets", text: "bike helmets" },
        { value: "bike accessories", text: "bike accessories" },
        { value: "bike repair kits", text: "bike repair kits" }
    ],
    "decor items": [
        { value: "wall art", text: "wall art" },
        { value: "vases", text: "vases" },
        { value: "decorative pillows", text: "decorative pillows" },
        { value: "candles", text: "candles" },
        { value: "mirrors", text: "mirrors" }
    ],
    "drums percussion": [
        { value: "drum sets", text: "drum sets" },
        { value: "cymbals", text: "cymbals" },
        { value: "drumsticks", text: "drumsticks" },
        { value: "percussion instruments", text: "percussion instruments" },
        { value: "drum accessories", text: "drum accessories" }
    ],
    "electronics": [
        { value: "free laptops", text: "free laptops" },
        { value: "free smartphones", text: "free smartphones" },
        { value: "used TVs giveaway", text: "used TVs giveaway" },
        { value: "free electronic gadgets", text: "free electronic gadgets" }
    ],
    "fitness equipment": [
        { value: "treadmills", text: "treadmills" },
        { value: "exercise bikes", text: "exercise bikes" },
        { value: "dumbbells", text: "dumbbells" },
        { value: "yoga mats", text: "yoga mats" },
        { value: "resistance bands", text: "resistance bands" }
    ],
    "food": [
        { value: "dog food", text: "dog food" },
        { value: "cat food", text: "cat food" },
        { value: "bird food", text: "bird food" },
        { value: "fish food", text: "fish food" },
        { value: "small pet food", text: "small pet food" }
    ],
    "furniture": [
        { value: "sofas", text: "sofas" },
        { value: "dining tables", text: "dining tables" },
        { value: "beds", text: "beds" },
        { value: "wardrobes", text: "wardrobes" },
        { value: "coffee tables", text: "coffee tables" }
    ],
    "gaming accessories": [
        { value: "audio", text: "Audio" },
        { value: "input devices", text: "Input Devices" },
        { value: "virtual reality", text: "Virtual Reality" }
    ],
    "garden outdoor": [
        { value: "plants gardening supplies", text: "Plants & Gardening Supplies" },
        { value: "patio furniture", text: "Patio Furniture" },
        { value: "outdoor equipment", text: "Outdoor Equipment" }
    ],
    "guitars": [
        { value: "acoustic guitars", text: "acoustic guitars" },
        { value: "electric guitars", text: "electric guitars" },
        { value: "bass guitars", text: "bass guitars" },
        { value: "guitar amplifiers", text: "guitar amplifiers" },
        { value: "guitar accessories", text: "guitar accessories" }
    ],
    "health": [
        { value: "pet vitamins", text: "pet vitamins" },
        { value: "pet grooming supplies", text: "pet grooming supplies" },
        { value: "pet medications", text: "pet medications" },
        { value: "pet dental care", text: "pet dental care" },
        { value: "pet first aid kits", text: "pet first aid kits" }
    ],
    "houses for rent": [
        { value: "houses for rent", text: "houses for rent" },
        { value: "affordable houses", text: "affordable houses" },
        { value: "family houses for rent", text: "family houses for rent" },
        { value: "bungalows for rent", text: "bungalows for rent" },
        { value: "pet-friendly houses", text: "pet-friendly houses" }
    ],
    "household items": [
        { value: "free kitchenware", text: "free kitchenware" },
        { value: "free home decor", text: "free home decor" },
        { value: "used appliances giveaway", text: "used appliances giveaway" },
        { value: "free cleaning supplies", text: "free cleaning supplies" },
        { value: "free storage solutions", text: "free storage solutions" }
    ],
    "input devices": [
        { value: "gaming keyboards", text: "gaming keyboards" },
        { value: "gaming mice", text: "gaming mice" }
    ],
    "keyboards pianos": [
        { value: "digital pianos", text: "digital pianos" },
        { value: "keyboard stands", text: "keyboard stands" },
        { value: "keyboard accessories", text: "keyboard accessories" },
        { value: "synthesizers", text: "synthesizers" },
        { value: "midi controllers", text: "midi controllers" }
    ],
    "kitchenware": [
        { value: "cookware", text: "cookware" },
        { value: "dinnerware", text: "dinnerware" },
        { value: "kitchen appliances", text: "kitchen appliances" },
        { value: "utensils", text: "utensils" },
        { value: "storage containers", text: "storage containers" }
    ],
    "laptops": [
        { value: "used laptops", text: "used laptops" },
        { value: "gaming laptops under BDT 1 lakh", text: "gaming laptops under BDT 1 lakh" },
        { value: "MacBooks for sale", text: "MacBooks for sale" },
        { value: "student laptops", text: "student laptops" },
        { value: "affordable laptops", text: "affordable laptops" },
        { value: "broken laptop for parts", text: "Broken Laptop for Parts" },
        { value: "damaged macbook repair", text: "Damaged MacBook" },
        { value: "faulty gaming laptop", text: "Faulty Gaming Laptop" },
        { value: "laptop screen repair needed", text: "Screen Repair Needed" },
        { value: "non working laptop cheap", text: "Non-working Laptop" },
        { value: "broken keyboard laptop", text: "Broken Keyboard Laptop" },
        { value: "macbook apple", text: "MacBook/Apple" },
        { value: "dell laptop", text: "Dell" },
        { value: "hp laptop", text: "HP" },
        { value: "lenovo laptop", text: "Lenovo" },
        { value: "asus laptop", text: "Asus" },
        { value: "acer laptop", text: "Acer" },
        { value: "msi laptop", text: "MSI" },
        { value: "razer laptop", text: "Razer" },
        { value: "samsung laptop", text: "Samsung" },
        { value: "microsoft surface", text: "Microsoft Surface" },
        { value: "huawei laptop", text: "Huawei" },
        { value: "lg laptop", text: "LG" },
        { value: "gigabyte laptop", text: "Gigabyte" },
        { value: "toshiba laptop", text: "Toshiba" },
        { value: "xiaomi laptop", text: "Xiaomi" },
        { value: "realme laptop", text: "Realme" },
        { value: "walton laptop", text: "Walton" },
        { value: "gaming laptop", text: "Gaming Laptop" },
        { value: "business laptop", text: "Business Laptop" },
        { value: "student laptop", text: "Student Laptop" },
        { value: "ultrabook", text: "Ultrabook" },
        { value: "workstation laptop", text: "Workstation Laptop" },
        { value: "broken laptop", text: "Broken Laptop" },
        { value: "damaged laptop", text: "Damaged Laptop" },
        { value: "laptop for parts", text: "Laptop for Parts" },
        { value: "laptop screen repair", text: "Screen Repair Needed" },
        { value: "laptop keyboard repair", text: "Keyboard Repair" }
    ],
    "lighting": [
        { value: "camera flashes", text: "camera flashes" },
        { value: "smart bulbs", text: "smart bulbs" }
    ],
    "mens clothing": [
        { value: "affordable men’s shirts", text: "affordable men’s shirts" },
        { value: "traditional panjabis", text: "traditional panjabis" },
        { value: "men’s suits for sale", text: "men’s suits for sale" },
        { value: "branded jeans", text: "branded jeans" },
        { value: "men’s winter jackets", text: "men’s winter jackets" }
    ],
    "maternity wear": [
        { value: "maternity dresses", text: "maternity dresses" },
        { value: "affordable maternity clothes", text: "affordable maternity clothes" },
        { value: "nursing tops", text: "nursing tops" },
        { value: "pregnancy wear", text: "pregnancy wear" },
        { value: "branded maternity dresses", text: "branded maternity dresses" }
    ],
    "motorcycles": [
        { value: "motorcycles for sale", text: "motorcycles for sale" },
        { value: "used bikes", text: "used bikes" },
        { value: "sports bikes under BDT 3 lakhs", text: "sports bikes under BDT 3 lakhs" },
        { value: "electric scooters", text: "electric scooters" },
        { value: "motorcycle helmets", text: "motorcycle helmets" },
        { value: "broken motorcycle parts", text: "Broken Motorcycle Parts" },
        { value: "damaged bike repair", text: "Damaged Bike" },
        { value: "non starting motorcycle", text: "Non-starting Motorcycle" },
        { value: "bike engine problems", text: "Bike Engine Problems" }
    ],
    "office supplies": [
        { value: "office chairs", text: "office chairs" },
        { value: "desks", text: "desks" },
        { value: "file cabinets", text: "file cabinets" },
        { value: "bookcases", text: "bookcases" },
        { value: "conference tables", text: "conference tables" },
        { value: "printers", text: "printers" },
        { value: "scanners", text: "scanners" },
        { value: "projectors", text: "projectors" },
        { value: "monitors", text: "monitors" },
        { value: "office phones", text: "office phones" },
        { value: "notebooks", text: "notebooks" },
        { value: "pens", text: "pens" },
        { value: "paper", text: "paper" },
        { value: "folders", text: "folders" },
        { value: "office supplies", text: "office supplies" }
    ],
    "outdoor equipment": [
        { value: "lawn mowers", text: "lawn mowers" },
        { value: "garden hoses", text: "garden hoses" },
        { value: "outdoor grills", text: "outdoor grills" },
        { value: "garden sheds", text: "garden sheds" },
        { value: "outdoor lighting", text: "outdoor lighting" }
    ],
    "outdoor sports gear": [
        { value: "camping tents", text: "camping tents" },
        { value: "hiking boots", text: "hiking boots" },
        { value: "fishing rods", text: "fishing rods" },
        { value: "kayaks", text: "kayaks" },
        { value: "outdoor backpacks", text: "outdoor backpacks" }
    ],
    "patio furniture": [
        { value: "outdoor chairs", text: "outdoor chairs" },
        { value: "patio tables", text: "patio tables" },
        { value: "garden benches", text: "garden benches" },
        { value: "outdoor sofas", text: "outdoor sofas" },
        { value: "patio umbrellas", text: "patio umbrellas" }
    ],
    "pet supplies": [
        { value: "dog food", text: "dog food" },
        { value: "cat food", text: "cat food" },
        { value: "bird food", text: "bird food" },
        { value: "fish food", text: "fish food" },
        { value: "small pet food", text: "small pet food" },
        { value: "pet beds", text: "pet beds" },
        { value: "pet toys", text: "pet toys" },
        { value: "pet collars", text: "pet collars" },
        { value: "pet leashes", text: "pet leashes" },
        { value: "pet carriers", text: "pet carriers" },
        { value: "pet vitamins", text: "pet vitamins" },
        { value: "pet grooming supplies", text: "pet grooming supplies" },
        { value: "pet medications", text: "pet medications" },
        { value: "pet dental care", text: "pet dental care" },
        { value: "pet first aid kits", text: "pet first aid kits" }
    ],
    "photography video accessories": [
        { value: "camera flashes", text: "camera flashes" },
        { value: "camera lenses", text: "camera lenses" },
        { value: "tripods", text: "tripods" },
        { value: "camera gimbals", text: "camera gimbals" }
    ],
    "plumbing fixtures": [
        { value: "faucets", text: "faucets" },
        { value: "sinks", text: "sinks" },
        { value: "toilets", text: "toilets" },
        { value: "showerheads", text: "showerheads" },
        { value: "pipes", text: "pipes" }
    ],
    "power": [
        { value: "smart plugs", text: "smart plugs" }
    ],
    "repairable items": [
        { value: "broken electronics", text: "broken electronics" },
        { value: "damaged furniture", text: "damaged furniture" },
        { value: "non-working appliances", text: "non-working appliances" },
        { value: "scratched phones", text: "scratched phones" },
        { value: "faulty gadgets", text: "faulty gadgets" }
    ],
    "recreational vehicles": [
        { value: "campervans for rent", text: "campervans for rent" },
        { value: "motorhomes", text: "motorhomes" },
        { value: "affordable RVs", text: "affordable RVs" },
        { value: "travel trailers for sale", text: "travel trailers for sale" },
        { value: "RV parks near", text: "RV parks near" }
    ],
    "roommates shared living": [
        { value: "shared rooms", text: "shared rooms" },
        { value: "roommates wanted", text: "roommates wanted" },
        { value: "shared apartments for rent", text: "shared apartments for rent" },
        { value: "hostel rooms", text: "hostel rooms" },
        { value: "co-living spaces", text: "co-living spaces" }
    ],
    "security": [
        { value: "home security cameras", text: "home security cameras" },
        { value: "smart door locks", text: "smart door locks" }
    ],
    "shoes": [
        { value: "men’s leather shoes", text: "men’s leather shoes" },
        { value: "branded sneakers", text: "branded sneakers" },
        { value: "women’s sandals for sale", text: "women’s sandals for sale" },
        { value: "kids’ shoes", text: "kids’ shoes" },
        { value: "sports shoes", text: "sports shoes" }
    ],
    "smartphones tablets": [
        { value: "used smartphones", text: "used smartphones" },
        { value: "iPhones for sale", text: "iPhones for sale" },
        { value: "cheap tablets", text: "cheap tablets" },
        { value: "Samsung Galaxy phones", text: "Samsung Galaxy phones" },
        { value: "refurbished phones", text: "refurbished phones" },
        { value: "broken iphone for sale", text: "Broken iPhone" },
        { value: "used samsung galaxy phone", text: "Used Samsung Galaxy" },
        { value: "broken screen phone cheap", text: "Broken Screen Phone" },
        { value: "repairable smartphone", text: "Repairable Smartphone" },
        { value: "damaged ipad for sale", text: "Damaged iPad" },
        { value: "used tablet bargain", text: "Used Tablet Bargain" },
        { value: "broken android phone", text: "Broken Android Phone" },
        { value: "faulty mobile phones", text: "Faulty Mobile Phones" }
    ],
    "spare parts accessories": [
        { value: "car parts", text: "car parts" },
        { value: "cheap bike accessories", text: "cheap bike accessories" },
        { value: "truck spare parts", text: "truck spare parts" },
        { value: "motorcycle batteries", text: "motorcycle batteries" },
        { value: "boat engines for sale", text: "boat engines for sale" },
        { value: "used car parts cheap", text: "Used Car Parts" },
        { value: "salvage auto parts", text: "Salvage Auto Parts" },
        { value: "broken vehicle parts", text: "Broken Vehicle Parts" },
        { value: "motorcycle spare parts", text: "Motorcycle Spare Parts" }
    ],
    "sporting goods": [
        { value: "treadmills", text: "treadmills" },
        { value: "exercise bikes", text: "exercise bikes" },
        { value: "dumbbells", text: "dumbbells" },
        { value: "yoga mats", text: "yoga mats" },
        { value: "resistance bands", text: "resistance bands" },
        { value: "camping tents", text: "camping tents" },
        { value: "hiking boots", text: "hiking boots" },
        { value: "fishing rods", text: "fishing rods" },
        { value: "kayaks", text: "kayaks" },
        { value: "outdoor backpacks", text: "outdoor backpacks" },
        { value: "mountain bikes", text: "mountain bikes" },
        { value: "road bikes", text: "road bikes" },
        { value: "bike helmets", text: "bike helmets" },
        { value: "bike accessories", text: "bike accessories" },
        { value: "bike repair kits", text: "bike repair kits" }
    ],
    "stabilization": [
        { value: "tripods", text: "tripods" },
        { value: "camera gimbals", text: "camera gimbals" }
    ],
    "stationery": [
        { value: "notebooks", text: "notebooks" },
        { value: "pens", text: "pens" },
        { value: "paper", text: "paper" },
        { value: "folders", text: "folders" },
        { value: "office supplies", text: "office supplies" }
    ],
    "toilets": [
        { value: "toilets", text: "toilets" }
    ],
    "toys": [
        { value: "kids’ toys", text: "kids’ toys" },
        { value: "affordable action figures", text: "affordable action figures" },
        { value: "educational toys for toddlers", text: "educational toys for toddlers" },
        { value: "remote-controlled cars", text: "remote-controlled cars" },
        { value: "board games for kids", text: "board games for kids" }
    ],
    "toys games": [
        { value: "action figures", text: "action figures" },
        { value: "board games", text: "board games" },
        { value: "remote control toys", text: "remote control toys" }
    ],
    "trucks": [
        { value: "used trucks for sale", text: "used trucks for sale" },
        { value: "commercial trucks", text: "commercial trucks" },
        { value: "pickup trucks under BDT 10 lakhs", text: "pickup trucks under BDT 10 lakhs" },
        { value: "truck spare parts", text: "truck spare parts" },
        { value: "diesel trucks for sale", text: "diesel trucks for sale" }
    ],
    "unique items": [
        { value: "vintage items", text: "vintage items" },
        { value: "antique furniture", text: "antique furniture" },
        { value: "rare coins", text: "rare coins" },
        { value: "collectible toys", text: "collectible toys" },
        { value: "artwork", text: "artwork" }
    ],
    "vacation rentals": [
        { value: "holiday homes", text: "holiday homes" },
        { value: "vacation rentals near", text: "vacation rentals near" },
        { value: "riverside bungalows", text: "riverside bungalows" },
        { value: "affordable resorts", text: "affordable resorts" },
        { value: "weekend getaways", text: "weekend getaways" }
    ],
    "virtual reality": [
        { value: "vr headsets", text: "vr headsets" }
    ],
    "womens clothing": [
        { value: "sarees for sale", text: "sarees for sale" },
        { value: "affordable salwar kameez", text: "affordable salwar kameez" },
        { value: "branded women’s tops", text: "branded women’s tops" },
        { value: "luxury lehengas", text: "luxury lehengas" },
        { value: "casual wear for women", text: "casual wear for women" }
    ],
    "desktop computers": [
        { value: "used desktop computer", text: "Used Desktop Computer" },
        { value: "gaming pc cheap", text: "Gaming PC Cheap" },
        { value: "broken desktop for parts", text: "Broken Desktop For Parts" },
        { value: "custom built pc", text: "Custom Built PC" },
        { value: "office computer", text: "Office Computer" },
        { value: "damaged desktop cheap", text: "Damaged Desktop" },
        { value: "pc not working", text: "PC Not Working" }
    ],
    "pc parts": [
        { value: "graphics card", text: "Graphics Card" },
        { value: "motherboard", text: "Motherboard" },
        { value: "processor cpu", text: "Processor/CPU" },
        { value: "ram memory", text: "RAM Memory" },
        { value: "power supply", text: "Power Supply" },
        { value: "computer case", text: "Computer Case" },
        { value: "broken gpu", text: "Broken GPU" },
        { value: "faulty motherboard", text: "Faulty Motherboard" }
    ],
    "smartphones": [
        // Popular Brands
        { value: "iphone", text: "iPhone" },
        { value: "samsung galaxy", text: "Samsung Galaxy" },
        { value: "xiaomi", text: "Xiaomi" },
        { value: "oneplus", text: "OnePlus" },
        { value: "oppo", text: "OPPO" },
        { value: "vivo", text: "Vivo" },
        { value: "realme", text: "Realme" },
        { value: "huawei", text: "Huawei" },
        { value: "nokia", text: "Nokia" },
        { value: "motorola", text: "Motorola" },
        { value: "google pixel", text: "Google Pixel" },
        { value: "asus", text: "Asus" },
        { value: "infinix", text: "Infinix" },
        { value: "tecno", text: "Tecno" },
        { value: "symphony", text: "Symphony" },
        { value: "walton", text: "Walton" },
        
        // Condition-based keywords
        { value: "broken iphone", text: "Broken iPhone" },
        { value: "damaged samsung", text: "Damaged Samsung" },
        { value: "broken screen phone", text: "Broken Screen Phone" },
        { value: "water damaged phone", text: "Water Damaged Phone" },
        { value: "faulty mobile", text: "Faulty Mobile" },
        
        // Price-based keywords
        { value: "cheap smartphones", text: "Cheap Smartphones" },
        { value: "budget phones", text: "Budget Phones" },
        { value: "used phones", text: "Used Phones" },
        { value: "second hand phones", text: "Second Hand Phones" }
    ],
    "phone accessories": [
        // Common accessories
        { value: "phone cases covers", text: "Phone Cases & Covers" },
        { value: "screen protectors", text: "Screen Protectors" },
        { value: "chargers cables", text: "Chargers & Cables" },
        { value: "power banks", text: "Power Banks" },
        { value: "phone holders", text: "Phone Holders" },
        { value: "bluetooth headphones", text: "Bluetooth Headphones" },
        { value: "phone camera lens", text: "Phone Camera Lens" },
        { value: "phone stands", text: "Phone Stands" },
        { value: "phone grips", text: "Phone Grips" },
        { value: "wireless chargers", text: "Wireless Chargers" }
    ],
    "phone parts": [
        // Repair parts
        { value: "phone screens", text: "Phone Screens" },
        { value: "phone batteries", text: "Phone Batteries" },
        { value: "charging ports", text: "Charging Ports" },
        { value: "phone cameras", text: "Phone Cameras" },
        { value: "phone speakers", text: "Phone Speakers" },
        { value: "phone buttons", text: "Phone Buttons" },
        { value: "phone motherboards", text: "Phone Motherboards" },
        { value: "phone repair tools", text: "Phone Repair Tools" }
    ],
    "smartphones tablets": [
        { value: "used smartphones", text: "used smartphones" },
        { value: "iPhones for sale", text: "iPhones for sale" },
        { value: "cheap tablets", text: "cheap tablets" },
        { value: "Samsung Galaxy phones", text: "Samsung Galaxy phones" },
        { value: "refurbished phones", text: "refurbished phones" },
        { value: "broken iphone for sale", text: "Broken iPhone" },
        { value: "used samsung galaxy phone", text: "Used Samsung Galaxy" },
        { value: "broken screen phone cheap", text: "Broken Screen Phone" },
        { value: "repairable smartphone", text: "Repairable Smartphone" },
        { value: "damaged ipad for sale", text: "Damaged iPad" },
        { value: "used tablet bargain", text: "Used Tablet Bargain" },
        { value: "broken android phone", text: "Broken Android Phone" },
        { value: "faulty mobile phones", text: "Faulty Mobile Phones" }
    ],
    "amplifiers": [
        // Home Audio Amplifiers
        { value: "stereo amplifier", text: "Stereo Amplifier" },
        { value: "home theater amp", text: "Home Theater Amp" },
        { value: "integrated amplifier", text: "Integrated Amplifier" },
        { value: "power amplifier", text: "Power Amplifier" },
        { value: "pre amplifier", text: "Pre-Amplifier" },
        
        // Guitar/Musical Amplifiers
        { value: "guitar amp", text: "Guitar Amp" },
        { value: "bass amp", text: "Bass Amp" },
        { value: "tube amplifier", text: "Tube Amplifier" },
        { value: "keyboard amp", text: "Keyboard Amp" },
        
        // Condition-based
        { value: "broken amplifier", text: "Broken Amplifier" },
        { value: "damaged amp", text: "Damaged Amp" },
        { value: "amp repair needed", text: "Repair Needed" },
        { value: "faulty amplifier", text: "Faulty Amplifier" }
    ],
    "speakers": [
        // Speaker Types
        { value: "bluetooth speaker", text: "Bluetooth Speaker" },
        { value: "home theater speakers", text: "Home Theater Speakers" },
        { value: "bookshelf speakers", text: "Bookshelf Speakers" },
        { value: "floor standing speakers", text: "Floor Standing Speakers" },
        { value: "portable speaker", text: "Portable Speaker" },
        { value: "soundbar", text: "Soundbar" },
        { value: "subwoofer", text: "Subwoofer" },
        
        // Popular Brands
        { value: "jbl speaker", text: "JBL" },
        { value: "bose speaker", text: "Bose" },
        { value: "sony speaker", text: "Sony" },
        { value: "samsung speaker", text: "Samsung" },
        { value: "harman kardon", text: "Harman Kardon" },
        { value: "marshall speaker", text: "Marshall" },
        { value: "yamaha speaker", text: "Yamaha" },
        
        // Condition-based
        { value: "broken speaker", text: "Broken Speaker" },
        { value: "damaged speaker", text: "Damaged Speaker" },
        { value: "speaker repair", text: "Speaker Repair" },
        { value: "faulty speaker", text: "Faulty Speaker" }
    ],
    // ...rest of existing keywords...
};

// Update keyword dropdown to include "Any" option
function updateKeywords() {
    const subcategory = document.getElementById('subcategory').value;
    const keywordSelect = document.getElementById('keyword');
    keywordSelect.innerHTML = '<option value="">Any Keyword</option>';

    if (keywords[subcategory]) {
        keywords[subcategory].forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword.value;
            option.text = keyword.text;
            keywordSelect.appendChild(option);
        });
    }
}

function updateSubcategories() {
    const category = document.getElementById('category').value;
    const subcategorySelect = document.getElementById('subcategory');
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';

    if (subcategories[category]) {
        subcategories[category].forEach(subcategory => {
            const option = document.createElement('option');
            option.value = subcategory.value;
            option.text = subcategory.text;
            subcategorySelect.appendChild(option);
        });
    }

    updateKeywords();
}

// Add new helper function for keyword optimization
function optimizeSearchKeyword(keyword) {
    // Only add repair-related terms for specific categories
    const repairableCategories = ['electronics', 'vehicles', 'smartphones tablets', 'laptops'];
    const category = document.getElementById('category').value.toLowerCase();
    
    if (repairableCategories.includes(category)) {
        const commonPhrases = ['broken', 'damaged', 'faulty', 'repair'];
        // Only add repair terms if they're not already present
        if (!commonPhrases.some(phrase => keyword.toLowerCase().includes(phrase))) {
            return `broken ${keyword}`;
        }
    }
    
    return keyword;
}

// Initialize subcategories and keywords on page load
document.addEventListener('DOMContentLoaded', () => {
    updateSubcategories();
    document.getElementById('category').addEventListener('change', updateSubcategories);
    document.getElementById('subcategory').addEventListener('change', updateKeywords);
    // Initialize keywords based on the default subcategory
    updateKeywords();
    const categorySelect = document.getElementById('category');
    const newCategories = [
        { value: "computers", text: "Computers & PCs" },
        { value: "mobile phones", text: "Mobile Phones" },
        { value: "watches", text: "Watches" },
        { value: "beauty", text: "Beauty & Cosmetics" }
    ];

    newCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.text = cat.text;
        categorySelect.appendChild(option);
    });
});
