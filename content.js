chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractText") {
        const paragraphs = Array.from(document.querySelectorAll('p'))
            .map(p => p.innerText)
            .filter(t => t.length > 20);
        sendResponse({ text: paragraphs.join('\n\n') });
    }
    return true; 
});