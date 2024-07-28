import { App, Editor, Notice, TFile } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export class SpeakerPopup extends Modal {
    private speaker: string;
    private messages: string[];
    private resolve: (value: string | null) => void;
    private newName: string;

    constructor(app: App, speaker: string, messages: string[], resolve: (value: string | null) => void) {
        super(app);
        this.speaker = speaker;
        this.messages = messages;
        this.resolve = resolve;
        this.newName = speaker;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: `Rename Speaker: ${this.speaker}` });

        const messagePreview = contentEl.createEl('div');
        const firstMessages = this.messages.filter(msg => msg.length > 10).slice(0, 3);
        const lastMessages = this.messages.filter(msg => msg.length > 10).slice(-3);

        firstMessages.forEach((msg) => {
            const p = messagePreview.createEl('p');
            p.textContent = msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
        });

        if (firstMessages.length > 0 && lastMessages.length > 0) {
            messagePreview.createEl('hr');
        }

        lastMessages.forEach((msg) => {
            const p = messagePreview.createEl('p');
            p.textContent = msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
        });

        new Setting(contentEl)
            .setName('New Name')
            .addText((text) =>
                text
                    .setValue(this.speaker)
                    .onChange((value) => {
                        this.newName = value;
                    })
                    .inputEl.addEventListener('keypress', (event) => {
                        if (event.key === 'Enter') {
                            this.resolve(this.newName);
                            this.close();
                        }
                    })
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.resolve(null);
                        this.close();
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Next')
                    .onClick(() => {
                        this.resolve(this.newName);
                        this.close();
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class SpeakerIdentifier {
    private app: App;
    private settings;

    constructor(app: App, settings: any) {
        this.app = app;
        this.settings = settings;
    }

    async analyzeAndRename() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile instanceof TFile) {
            let content = await this.app.vault.read(activeFile);

            const speakerLines = this.extractSpeakerLines(content);
            const speakers = this.identifySpeakers(speakerLines);

            if (Object.keys(speakers).length === 0) {
                new Notice('No speakers found in the document.');
                return;
            }

            for (const speaker in speakers) {
                const newSpeakerName = await this.getRenamedSpeaker(speaker, speakers[speaker]);
                if (newSpeakerName === null) {
                    // Cancel the entire operation if the user presses "Cancel"
                    return;
                }
                if (newSpeakerName !== speaker) {
                    content = this.renameSpeakerInContent(content, speaker, newSpeakerName);
                }
            }

            await this.app.vault.modify(activeFile, content);
        }
    }

    private extractSpeakerLines(content: string): string[] {
        const lines = content.split('\n');
        return lines.filter((line) => /^Speaker \d+:/.test(line));
    }

    private identifySpeakers(speakerLines: string[]): { [speaker: string]: string[] } {
        const speakers: { [speaker: string]: string[] } = {};
        speakerLines.forEach((line) => {
            const match = line.match(/^(Speaker \d+):/);
            if (match) {
                const speaker = match[1];
                const text = line.replace(/^Speaker \d+:\s*/, '').trim();
                if (!speakers[speaker]) {
                    speakers[speaker] = [];
                }
                speakers[speaker].push(text);
            }
        });
        return speakers;
    }

    private async getRenamedSpeaker(speaker: string, messages: string[]): Promise<string | null> {
        return new Promise((resolve) => {
            new SpeakerPopup(this.app, speaker, messages, resolve).open();
        });
    }

    private renameSpeakerInContent(content: string, oldSpeaker: string, newSpeaker: string): string {
        const escapedOldSpeaker = oldSpeaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedOldSpeaker}:`, 'gm');
        return content.replace(regex, `${newSpeaker}:`);
    }
}