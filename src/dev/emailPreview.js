function humanize(camelCase) {
    return camelCase
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

async function fetchTemplateList() {
    const response = await fetch('/api/email-preview');
    return response.json();
}

async function fetchRenderedEmail(templateName) {
    const response = await fetch(`/api/email-preview?template=${templateName}`);
    return response.text();
}

function renderSidebar(templates, onSelect) {
    const list = document.getElementById('template-list');
    templates.forEach(name => {
        const button = document.createElement('button');
        button.className = 'template-link';
        button.textContent = humanize(name);
        button.dataset.template = name;
        button.addEventListener('click', () => onSelect(name));
        list.appendChild(button);
    });
}

function setActive(templateName) {
    document.querySelectorAll('.template-link').forEach(el => {
        el.classList.toggle('active', el.dataset.template === templateName);
    });
}

async function loadPreview(templateName) {
    setActive(templateName);
    const html = await fetchRenderedEmail(templateName);
    document.getElementById('preview-frame').srcdoc = html;
}

export async function main() {
    const templates = await fetchTemplateList();
    renderSidebar(templates, loadPreview);
    if (templates.length > 0) {
        await loadPreview(templates[0]);
    }
}
