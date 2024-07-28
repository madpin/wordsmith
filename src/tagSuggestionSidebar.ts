import { App, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import TagSuggestionPlugin from '../main';
import { TagSuggestionView, VIEW_TYPE_TAG_SUGGESTION } from './tagSuggestionView';
import { getExistingTags } from './tagUtils';
import { suggestTags, suggestNames } from './aiSuggestions';
import { addTagToCurrentFile, removeTagFromCurrentFile, renameCurrentFile } from './fileOperations';
import { SpeakerIdentifier } from './speaker';

/**
 * Class responsible for managing the tag suggestion sidebar
 */
export class TagSuggestionSidebar {
    private plugin: TagSuggestionPlugin;
    private app: App;
    private leaf: WorkspaceLeaf | null = null;

    /**
     * Constructor for TagSuggestionSidebar
     * @param app - The Obsidian App instance
     * @param plugin - The TagSuggestionPlugin instance
     */
    constructor(app: App, plugin: TagSuggestionPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    initializeView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TAG_SUGGESTION);
        if (leaves.length > 0) {
            this.leaf = leaves[0];
            if (this.leaf.view instanceof TagSuggestionView) {
                this.leaf.view.onload();
                this.refreshSuggestions();
            }
        }
    }

    /**
     * Suggest tags and names for a given file
     * @param file - The TFile to suggest tags and names for
     */
    async suggestForFile(file: TFile) {
        // Read the content of the file
        const content = await this.app.vault.read(file);
        // Get existing tags for the file
        const existingTags = getExistingTags(this.app, file);

        // Suggest new tags and names based on the content in parallel
        const [suggestedTags, suggestedNames] = await Promise.all([
            suggestTags(this.plugin, content),
            suggestNames(this.plugin, content)
        ]);
        // Update the view with the new suggestions
        this.updateView(suggestedTags, new Set(existingTags), suggestedNames);

        // Speaker Identification
        const speakerIdentifier = new SpeakerIdentifier(this.app, this.plugin.settings);
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            await speakerIdentifier.analyzeAndRename();
        }
    }

    /**
     * Update the view with new tags and names
     * @param tags - Array of suggested tags
     * @param existingTags - Set of existing tags
     * @param names - Array of suggested names
     */
    private async updateView(tags: string[], existingTags: Set<string>, names: string[]) {
        if (this.leaf && this.leaf.view instanceof TagSuggestionView) {
            this.leaf.view.updateTags(tags, existingTags);
            this.leaf.view.updateNames(names);

            // Force a re-render of the view
            await this.leaf.view.renderView();
        }
    }

    /**
     * Toggle the visibility of the sidebar
     */
    toggleSidebar() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TAG_SUGGESTION);
        if (leaves.length > 0) {
            // If the sidebar is open, close it
            leaves.forEach(leaf => this.app.workspace.detachLeavesOfType(VIEW_TYPE_TAG_SUGGESTION));
            this.leaf = null;
        } else {
            // If the sidebar is closed, open it
            this.leaf = this.app.workspace.getRightLeaf(false);
            if (this.leaf) {
                this.leaf.setViewState({
                    type: VIEW_TYPE_TAG_SUGGESTION,
                    active: true,
                    state: { app: this.app }
                });

                this.app.workspace.revealLeaf(this.leaf);
                // Suggest tags and names for the active file
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile instanceof TFile) {
                    this.suggestForFile(activeFile);
                }
            }
        }
    }

    /**
     * Add a tag to the current file
     * @param tag - The tag to add
     */
    async addTagToCurrentFile(tag: string) {
        await addTagToCurrentFile(this.app, tag);
    }

    /**
     * Remove a tag from the current file
     * @param tag - The tag to remove
     */
    async removeTagFromCurrentFile(tag: string) {
        await removeTagFromCurrentFile(this.app, tag);
    }

    /**
     * Rename the current file
     * @param newName - The new name for the file
     */
    async renameCurrentFile(newName: string) {
        await renameCurrentFile(this.app, newName);
    }

    /**
     * Refresh suggestions for the current file
     */
    async refreshSuggestions() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile instanceof TFile) {
            await this.suggestForFile(activeFile);
        }
    }

}