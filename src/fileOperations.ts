import { App, TFile } from 'obsidian';
import { formatTag, updateFrontMatter } from './tagUtils';

// Function to add a tag to the current file
export async function addTagToCurrentFile(app: App, tag: string) {
    // console.log("addTagToCurrentFile tag: " + tag)
    const activeFile = app.workspace.getActiveFile();

    app.fileManager.processFrontMatter(activeFile as TFile, (frontmatter: any) => {
        if (!frontmatter.tags) frontmatter.tags = [tag];
        else frontmatter.tags = [...new Set([...frontmatter.tags, tag])];
    });
}

// Function to remove a tag from the current file
export async function removeTagFromCurrentFile(app: App, tag: string) {
    // console.log("removeTagFromCurrentFile tag: " + tag)
    const activeFile = app.workspace.getActiveFile();

    app.fileManager.processFrontMatter(activeFile as TFile, (frontmatter: any) => {
        if (frontmatter.tags) {
            // Convert tags to a Set, remove the specified tag, then convert back to an array
            frontmatter.tags = Array.from(new Set(frontmatter.tags.filter((t: string) => t !== tag)));
            // If tags array is empty after removal, you can optionally delete the tags property
            if (frontmatter.tags.length === 0) {
                delete frontmatter.tags;
            }
        }
    });

}

// Function to rename the current file
export async function renameCurrentFile(app: App, newName: string) {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile instanceof TFile) {
        // Create the new path by replacing the old filename with the new one
        const newPath = activeFile.path.replace(activeFile.name, newName);
        // Ensure the new name has a file extension
        const newNameWithExtension = newName.includes('.') ? newName : `${newName}.md`;
        // Rename the file using the file manager
        await app.fileManager.renameFile(activeFile, newPath.replace(newName, newNameWithExtension));
    }
}