import { ItemView, WorkspaceLeaf, App, TFile, Setting, setIcon, MarkdownView, Notice } from 'obsidian';
import { TagSuggestionSidebar } from './tagSuggestionSidebar';
import TagSuggestionPlugin from '../main';
import { getExistingTags } from './tagUtils';
import { transcribeAudio, saveTranscriptionWithUniqueFilename } from './transcriptionService';
import { SpeakerIdentifier } from './speaker';

export const VIEW_TYPE_TAG_SUGGESTION = 'tag-suggestion-view';

export class TagSuggestionView extends ItemView {
    // render() {
    //     throw new Error('Method not implemented.');
    // }
    private sidebar: TagSuggestionSidebar;
    private plugin: TagSuggestionPlugin;
    private allTags: string[] = [];
    private allNames: string[] = [];
    private existingTags: Set<string> = new Set();
    private audioFileName: string | null = null;
    private currentFileName: string | null = null;

    constructor(leaf: WorkspaceLeaf, sidebar: TagSuggestionSidebar, app: App, plugin: TagSuggestionPlugin) {
        super(leaf);
        this.sidebar = sidebar;
        this.app = app;
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_TAG_SUGGESTION;
    }

    getDisplayText(): string {
        return "Tag and Name Suggestions";
    }

    getIcon(): string {
        return "glasses";
    }

    async onOpen() {
        this.renderView();
    }

    renderView() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('tag-suggestion-view');

        this.renderCurrentFileName(container);
        this.renderRefreshButton(container);
        this.addSeparator(container);

        this.renderTagsAndNames(container);
        this.addSeparator(container);

        if (this.plugin.settings.deepgramApiKey) {
            this.renderTranscriptionFeatures(container);
        }
    }

    private renderCurrentFileName(container: HTMLElement) {
        if (this.currentFileName) {
            const fileNameEl = container.createEl('div', { cls: 'current-file-name', text: `Generation file: ${this.currentFileName}` });
            fileNameEl.style.fontWeight = 'bold';
            fileNameEl.style.marginBottom = '10px';
        }
    }

    private addSeparator(container: HTMLElement) {
        container.createEl('div', { cls: 'separator' });
    }

    private renderRefreshButton(container: HTMLElement) {
        const refreshButton = container.createEl('button', { text: 'Refresh', cls: 'refresh-button' });
        refreshButton.addEventListener('click', () => this.sidebar.refreshSuggestions());
    }

    private renderTranscriptionFeatures(container: HTMLElement) {
        this.renderTranscriptionSection(container);
        this.renderAudioFileStatus(container);
    }

    private renderTranscriptionSection(container: HTMLElement) {
        const transcriptionSection = container.createEl('div', { cls: 'transcription-section' });
        new Setting(transcriptionSection).setName('Transcription').setHeading();

        this.createDropZone(transcriptionSection);
        const buttonContainer = transcriptionSection.createEl('div', { cls: 'button-container' });
        this.createFileInput(buttonContainer);
        this.createIdentifySpeakersButton(buttonContainer);
    }

    private createDropZone(container: HTMLElement) {
        const dropZone = container.createEl('div', { cls: 'drop-zone', text: 'Drop audio file here' });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.addClass('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.removeClass('dragover'));

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.removeClass('dragover');
            const files = e.dataTransfer?.files;
            if (files?.length) await this.handleAudioFile(files[0], container);
        });
    }

    private createFileInput(container: HTMLElement) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files?.length) await this.handleAudioFile(files[0], container);
        });

        const uploadButton = container.createEl('button', { text: 'Upload Audio File', cls: 'upload-button' });
        uploadButton.addEventListener('click', () => fileInput.click());
    }

    private createIdentifySpeakersButton(container: HTMLElement) {
        const identifySpeakersButton = container.createEl('button', {
            text: 'Identify Speakers',
            cls: 'identify-speakers-button'
        });
        identifySpeakersButton.style.fontSize = '0.8em';

        identifySpeakersButton.addEventListener('click', async () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice("Please open a Markdown file to identify speakers");
                return;
            }

            const speakerIdentifier = new SpeakerIdentifier(this.app, this.plugin.settings);
            try {
                await speakerIdentifier.analyzeAndRename();
            } catch (error) {
                console.error("Error during speaker identification:", error);
                new Notice("An error occurred during speaker identification. Please check the console for details.");
            }
        });
    }

    private async handleAudioFile(audioFile: File, transcriptionSection: HTMLElement) {
        if (!audioFile.type.startsWith('audio/')) {
            return this.showErrorMessage(transcriptionSection, 'Please drop an audio file.');
        }

        this.updateAudioFileStatus(audioFile.name);

        try {
            const transcription = await transcribeAudio(this.plugin, audioFile, (status) => {
                this.updateAudioFileStatus(status);
            });
            const baseName = audioFile.name.replace(/\.[^/.]+$/, "");
            const newFile = await saveTranscriptionWithUniqueFilename(this.app, baseName, transcription, this.plugin.settings.transcriptionFolder);
            this.updateAudioFileStatus("Transcription saved:");
            this.createClickableLink(newFile.path);
        } catch (error) {
            console.error('Transcription error:', error);
            this.handleTranscriptionError(error);
            this.updateAudioFileStatus('Error during transcription');
        }
    }

    private createClickableLink(filePath: string) {
        const linkContainer = this.containerEl.children[1].createEl('div', { cls: 'transcription-link' });
        const link = linkContainer.createEl('a', {
            text: filePath,
            href: filePath,
            cls: 'internal-link'
        });
        link.addEventListener('click', (event) => {
            event.preventDefault();
            this.app.workspace.openLinkText(filePath, '', true);
        });
    }

    private handleTranscriptionError(error: any) {
        const errorDetails = error.response
            ? { status: error.response.status, data: error.response.data }
            : error.request
                ? { message: 'No response received' }
                : { message: error.message };

        console.error('Transcription Error:', errorDetails);
    }

    private showErrorMessage(container: HTMLElement, message: string) {
        const errorMsg = container.createEl('p', { cls: 'error-message', text: message });
        setTimeout(() => errorMsg.remove(), 3000);
    }

    private renderAudioFileStatus(container: HTMLElement) {
        const audioStatusSection = container.createEl('div', { cls: 'audio-status-section' });
        // new Setting(audioStatusSection).setName('Audio File Status').setHeading();
        audioStatusSection.createEl('p', { text: this.audioFileName ? `Status: ${this.audioFileName}` : 'No audio file dropped' });
    }

    private renderTagsAndNames(container: HTMLElement) {
        this.renderTagSection(container);
        this.renderNameSection(container);
    }

    private renderTagSection(container: HTMLElement) {
        const tagSection = container.createEl('div', { cls: 'suggestion-section' });
        new Setting(tagSection).setName('Suggested Tags').setHeading();
        this.renderTags(tagSection);
    }

    private renderNameSection(container: HTMLElement) {
        const nameSection = container.createEl('div', { cls: 'suggestion-section' });
        new Setting(nameSection).setName('Suggested Names').setHeading();
        this.renderNames(nameSection);
    }

    private renderTags(container: HTMLElement) {
        const tagsContainer = container.createEl('div', { cls: 'tags-container' });
        tagsContainer.empty();
        this.updateExistingTags();
        this.allTags.forEach(tag => this.renderTagItem(tagsContainer, tag));
    }

    private updateExistingTags() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile instanceof TFile) {
            this.existingTags = new Set(getExistingTags(this.app, activeFile));
            this.currentFileName = activeFile.name;
        }
    }

    private renderTagItem(container: HTMLElement, tag: string) {
        const tagEl = container.createEl('div', { cls: 'tag-item' });
        const tagLink = tagEl.createEl('a', { text: tag, cls: 'tag-link' });
        const tickMark = tagEl.createEl('span', { cls: 'tick-mark', text: '✓' });
        tickMark.style.display = this.existingTags.has(tag) ? 'inline' : 'none';

        tagEl.addEventListener('click', (e) => this.handleTagClick(e, tag, tickMark));
    }

    private async handleTagClick(e: MouseEvent, tag: string, tickMark: HTMLElement) {
        e.preventDefault();
        const isSelected = this.existingTags.has(tag);
        if (isSelected) {
            await this.sidebar.removeTagFromCurrentFile(tag);
            this.existingTags.delete(tag);
            tickMark.style.display = 'none';
        } else {
            await this.sidebar.addTagToCurrentFile(tag);
            this.existingTags.add(tag);
            tickMark.style.display = 'inline';
        }
    }

    private renderNames(container: HTMLElement) {
        const namesContainer = container.createEl('div', { cls: 'names-container' });
        this.allNames.forEach(name => this.renderNameItem(namesContainer, name));
    }

    private renderNameItem(container: HTMLElement, name: string) {
        const nameEl = container.createEl('div', { cls: 'name-item' });
        nameEl.createEl('span', { text: name });
        nameEl.addEventListener('click', () => this.sidebar.renameCurrentFile(name));
    }

    updateTags(tags: string[], existingTags: Set<string>) {
        this.allTags = tags;
        this.existingTags = existingTags;
        this.renderView();
    }

    updateNames(names: string[]) {
        this.allNames = names;
        this.renderView();
    }

    updateAudioFileStatus(fileName: string) {
        this.audioFileName = fileName;
        this.renderView();
    }
}