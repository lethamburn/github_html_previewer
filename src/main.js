import './style.css';

const HISTORY_KEY = 'github-html-preview-history';
const MAX_HISTORY = 5;

const githubUrlInput = document.getElementById('github-url');
const previewButton = document.getElementById('preview-button');
const historyList = document.getElementById('history-list');
const clearHistoryButton = document.getElementById('clear-history-button');

const loadHistory = () => {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    historyList.innerHTML = '';
    history.forEach(url => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = url;
        link.onclick = (e) => {
            e.preventDefault();
            githubUrlInput.value = url;
        };
        listItem.appendChild(link);
        historyList.appendChild(listItem);
    });
};

const saveToHistory = (url) => {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const newHistory = history.filter(item => item !== url);
    newHistory.unshift(url);
    if (newHistory.length > MAX_HISTORY) {
        newHistory.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    loadHistory();
};

const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    loadHistory();
};

const previewHtml = async () => {
    const githubUrl = githubUrlInput.value;

    if (!githubUrl) {
        alert("Please enter a GitHub link.");
        return;
    }

    try {
        const rawUrl = githubUrl.replace('/blob/', '/').replace('https://github.com/', 'https://raw.githubusercontent.com/');
        const baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1);

        const fetchContent = async (url) => (await fetch(url)).text();
        const htmlContent = await fetchContent(rawUrl);
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const fetchAllContent = async (selector, attribute) => {
            const elements = [...doc.querySelectorAll(selector)];
            const promises = elements.map(el => fetchContent(new URL(el.getAttribute(attribute), baseUrl).href));
            elements.forEach(el => el.remove());
            return Promise.all(promises);
        };

        const [cssContents, jsContents] = await Promise.all([
            fetchAllContent('link[rel="stylesheet"]', 'href'),
            fetchAllContent('script[src]', 'src')
        ]);
        
        const styleTags = cssContents.map(css => `<style>${css}</style>`).join('\n');
        const scriptTags = jsContents.map(js => `<script>${js}</script>`).join('\n');

        const finalHtml = `
            <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <base href="${baseUrl}">
            ${styleTags}
        </head>
        <body>
            ${new XMLSerializer().serializeToString(doc)}
            ${scriptTags}
        </body>
    </html>
        `;

        const blobUrl = URL.createObjectURL(new Blob([finalHtml], { type: 'text/html' }));
        window.open(blobUrl, '_blank');
        
        saveToHistory(githubUrl);
        githubUrlInput.value = '';

    } catch (error) {
        alert("Error previewing. Make sure the link is correct and the files are in the same repository.");
        console.error("Error in preview:", error);
    }
};

previewButton.addEventListener('click', previewHtml);
clearHistoryButton.addEventListener('click', clearHistory);
document.addEventListener('DOMContentLoaded', loadHistory);
