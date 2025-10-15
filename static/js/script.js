// Enhanced JavaScript with animations
let selectedFiles = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    createParticles();
    initializeCursor();
});

function initializeApp() {
    // Load documents count on search page
    if (document.getElementById('documentsCount')) {
        loadDocumentsCount();
    }
    
    // Load documents list on upload page
    if (document.getElementById('documentsList')) {
        loadDocumentsList();
    }
    
    // Initialize mobile menu
    initializeMobileMenu();
}

function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (window.innerWidth <= 768) {
        mobileMenuBtn.style.display = 'block';
        sidebar.classList.remove('mobile-open');
    }
    
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });
    
    // Close sidebar when clicking on a link (mobile)
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });
    
    // Update on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            mobileMenuBtn.style.display = 'none';
            sidebar.classList.add('mobile-open');
        } else {
            mobileMenuBtn.style.display = 'block';
            sidebar.classList.remove('mobile-open');
        }
    });
}


function setupEventListeners() {
    // Search form submission
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    // File input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Drag and drop for upload area
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('click', () => fileInput.click());
    }

    // Add input animation
    const searchInput = document.getElementById('queryInput');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('focused');
        });
        searchInput.addEventListener('blur', () => {
            searchInput.parentElement.classList.remove('focused');
        });
    }
}

// Enhanced Search functionality
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('queryInput').value.trim();
    if (!query) {
        animateShake(document.getElementById('searchForm'));
        return;
    }

    const searchButton = document.getElementById('searchButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');
    const errorMessage = document.getElementById('errorMessage');

    // Show loading, hide previous results and errors
    searchButton.disabled = true;
    loadingSpinner.style.display = 'block';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';

    // Add loading animation
    animateButtonLoading(searchButton, true);

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();

        if (response.ok) {
            // Add success animation
            animateButtonSuccess(searchButton);
            setTimeout(() => {
                displayResults(data);
                animateButtonLoading(searchButton, false);
            }, 1000);
        } else {
            animateButtonError(searchButton);
            showError(data.error || 'Search failed');
        }
    } catch (error) {
        animateButtonError(searchButton);
        showError('Network error: ' + error.message);
    } finally {
        setTimeout(() => {
            searchButton.disabled = false;
            loadingSpinner.style.display = 'none';
            animateButtonLoading(searchButton, false);
        }, 1000);
    }
}

function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    const queryDisplay = document.getElementById('queryDisplay');
    const answerContent = document.getElementById('answerContent');
    const sourcesGrid = document.getElementById('sourcesGrid');

    // Update query display with animation
    queryDisplay.textContent = `"${data.query}"`;
    animateText(queryDisplay);

    // Update answer with typewriter effect
    answerContent.innerHTML = '';
    typeWriter(answerContent, formatAnswer(data.answer), 0);

    // Update sources with staggered animation
    sourcesGrid.innerHTML = '';
    if (data.sources && data.sources.length > 0) {
        data.sources.forEach((source, index) => {
            setTimeout(() => {
                const sourceCard = document.createElement('div');
                sourceCard.className = 'source-card';
                sourceCard.style.opacity = '0';
                sourceCard.style.transform = 'translateY(20px)';
                sourceCard.innerHTML = `
                    <div class="source-header">
                        <span class="source-badge">Source ${index + 1}</span>
                        <span class="source-filename">${source.source}</span>
                    </div>
                    <div class="source-content">${source.content}</div>
                `;
                sourcesGrid.appendChild(sourceCard);
                
                // Animate in
                setTimeout(() => {
                    sourceCard.style.opacity = '1';
                    sourceCard.style.transform = 'translateY(0)';
                    sourceCard.style.transition = 'all 0.5s ease';
                }, 100);
            }, index * 200);
        });
    } else {
        sourcesGrid.innerHTML = '<p>No sources found</p>';
    }

    // Show results section with animation
    resultsSection.style.display = 'block';
    resultsSection.style.opacity = '0';
    resultsSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        resultsSection.style.opacity = '1';
        resultsSection.style.transform = 'translateY(0)';
        resultsSection.style.transition = 'all 0.6s ease';
    }, 300);
}

// Typewriter effect for answer
function typeWriter(element, text, speed = 10) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

function formatAnswer(answer) {
    return answer.split('\n\n').map(paragraph => 
        `<p>${paragraph}</p>`
    ).join('');
}

// Enhanced File upload functionality
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToList(files);
    animateSuccess(document.getElementById('uploadArea'));
}

function handleDragOver(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('drag-over');
    animatePulse(uploadArea);
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToList(files);
    animateSuccess(uploadArea);
}

function addFilesToList(files) {
    const validFiles = files.filter(file => 
        file.type === 'application/pdf' || 
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.txt')
    );

    selectedFiles = [...selectedFiles, ...validFiles];
    updateFileList();
    
    if (validFiles.length > 0) {
        animateSuccess(document.getElementById('fileList'));
    }
}

function updateFileList() {
    const filesContainer = document.getElementById('filesContainer');
    
    if (selectedFiles.length === 0) {
        filesContainer.innerHTML = '<p class="no-files">No files selected</p>';
        return;
    }

    filesContainer.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item" style="opacity: 0; transform: translateX(-20px);">
            <div class="file-info">
                <i class="fas ${file.name.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-alt'}"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
            <button type="button" class="remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    // Animate file items in
    setTimeout(() => {
        document.querySelectorAll('.file-item').forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
                item.style.transition = 'all 0.5s ease';
            }, index * 100);
        });
    }, 100);
}

function removeFile(index) {
    const fileItem = document.querySelectorAll('.file-item')[index];
    animateRemove(fileItem);
    
    setTimeout(() => {
        selectedFiles.splice(index, 1);
        updateFileList();
    }, 500);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function uploadFiles() {
    if (selectedFiles.length === 0) {
        animateShake(document.getElementById('uploadArea'));
        showStatus('No files selected', 'Please select files to upload.', 'error');
        return;
    }

    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const processButton = document.getElementById('processButton');

    uploadProgress.style.display = 'block';
    processButton.disabled = true;
    animateButtonLoading(processButton, true);

    let uploadedCount = 0;

    for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                uploadedCount++;
            } else {
                const error = await response.json();
                console.error('Upload failed:', error);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }

        // Update progress with animation
        const progress = (uploadedCount / selectedFiles.length) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }

    // Reset and show status
    selectedFiles = [];
    updateFileList();
    processButton.disabled = false;
    uploadProgress.style.display = 'none';
    animateButtonLoading(processButton, false);

    if (uploadedCount > 0) {
        animateButtonSuccess(processButton);
        showStatus('Success', `Successfully uploaded ${uploadedCount} file(s). Documents are being processed.`, 'success');
        loadDocumentsList();
        if (document.getElementById('documentsCount')) {
            loadDocumentsCount();
        }
    } else {
        animateButtonError(processButton);
        showStatus('Error', 'No files were uploaded successfully.', 'error');
    }
}

async function reprocessDocuments() {
    const button = document.querySelector('.reprocess-button');
    animateButtonLoading(button, true);
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (response.ok) {
            animateButtonSuccess(button);
            showStatus('Success', data.message, 'success');
        } else {
            animateButtonError(button);
            showStatus('Error', data.message || 'Reprocessing failed', 'error');
        }
    } catch (error) {
        animateButtonError(button);
        showStatus('Error', 'Network error: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            animateButtonLoading(button, false);
        }, 1000);
    }
}

// Document management
async function loadDocumentsCount() {
    try {
        const response = await fetch('/api/documents');
        const data = await response.json();
        
        if (response.ok) {
            const count = data.documents.length;
            const element = document.getElementById('documentsCount');
            element.textContent = `${count} document${count !== 1 ? 's' : ''} loaded`;
            animateText(element);
        }
    } catch (error) {
        document.getElementById('documentsCount').textContent = 'Error loading documents';
    }
}

async function loadDocumentsList() {
    try {
        const response = await fetch('/api/documents');
        const data = await response.json();
        const documentsList = document.getElementById('documentsList');
        
        if (response.ok && data.documents.length > 0) {
            documentsList.innerHTML = data.documents.map(doc => `
                <div class="document-item" style="opacity: 0; transform: translateY(20px);">
                    <i class="fas ${doc.type === 'PDF' ? 'fa-file-pdf' : 'fa-file-alt'}"></i>
                    <div class="document-details">
                        <span class="document-name">${doc.name}</span>
                        <span class="document-meta">${doc.type} • ${formatFileSize(doc.size)}</span>
                    </div>
                </div>
            `).join('');
            
            // Animate documents in
            setTimeout(() => {
                document.querySelectorAll('.document-item').forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                        item.style.transition = 'all 0.5s ease';
                    }, index * 100);
                });
            }, 100);
        } else {
            documentsList.innerHTML = '<p class="no-documents">No documents uploaded yet</p>';
        }
    } catch (error) {
        documentsList.innerHTML = '<p class="error">Error loading documents</p>';
    }
}

// Animation functions
function animateShake(element) {
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

function animatePulse(element) {
    element.style.animation = 'pulse 0.5s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

function animateSuccess(element) {
    element.style.animation = 'bounceIn 0.6s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 600);
}

function animateRemove(element) {
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';
    element.style.transition = 'all 0.5s ease';
}

function animateText(element) {
    element.style.animation = 'fadeInUp 0.6s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 600);
}

function animateButtonLoading(button, isLoading) {
    if (isLoading) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.style.background = 'var(--dark-gradient)';
    } else {
        const originalText = button.getAttribute('data-original-text') || 'Process Documents';
        button.innerHTML = '<i class="fas fa-bolt"></i> ' + originalText;
        button.style.background = 'var(--primary-gradient)';
    }
}

function animateButtonSuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Success!';
    button.style.background = 'var(--success)';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = 'var(--primary-gradient)';
    }, 2000);
}

function animateButtonError(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
    button.style.background = 'var(--error)';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = 'var(--primary-gradient)';
    }, 2000);
}

// Utility functions
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    animateShake(errorMessage);
}

function showStatus(title, text, type) {
    const statusMessage = document.getElementById('statusMessage');
    const statusTitle = document.getElementById('statusTitle');
    const statusText = document.getElementById('statusText');
    const statusIcon = statusMessage.querySelector('.status-icon i');
    
    statusTitle.textContent = title;
    statusText.textContent = text;
    
    // Update icon based on type
    statusIcon.className = type === 'success' ? 
        'fas fa-check-circle' : 'fas fa-exclamation-triangle';
    
    statusMessage.style.display = 'flex';
    animateSuccess(statusMessage);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);