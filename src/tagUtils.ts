import { App, stringifyYaml, TFile } from 'obsidian';

// Formats a tag by capitalizing the first letter of each word and removing spaces
export function formatTag(tag: string): string {
    return tag.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

// Retrieves existing tags from a file's metadata cache
export function getExistingTags(app: App, file: TFile): string[] {
    const fileCache = app.metadataCache.getFileCache(file);
    return fileCache?.frontmatter?.tags || [];
}

// Updates the front matter of a file's content
export function updateFrontMatter(content: string, frontmatter: any): string {
    // Create YAML front matter string
    const yamlFrontMatter = `---\n${stringifyYaml(frontmatter)}---\n`;


    // Check if content already has front matter
    if (content.startsWith('---')) {
        const endOfFrontMatter = content.indexOf('---', 3);
        if (endOfFrontMatter !== -1) {
            // Replace existing front matter
            return yamlFrontMatter + content.slice(endOfFrontMatter + 4);
        }
    }

    // Add new front matter to content
    return yamlFrontMatter + content;
}