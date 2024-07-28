import { App, PluginSettingTab, Setting, TFolder, Vault } from 'obsidian';
import TagSuggestionPlugin from '../main';
import { PluginSettings } from './settings';

export class SettingsTab extends PluginSettingTab {
    plugin: TagSuggestionPlugin;

    constructor(app: App, plugin: TagSuggestionPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.createOpenAISection(containerEl);
        this.createModelSection(containerEl);
        this.showCustomModelSetting(containerEl);
        this.createGenerationSection(containerEl);
        // this.createDeepgramSection(containerEl);
        this.createTranscriptionSection(containerEl);
        this.createOCISection(containerEl);
        // this.createSpeakerSection(containerEl);
    }

    createOpenAISection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('OpenAI').setHeading();

        new Setting(containerEl)
            .setName("OpenAI API key")
            .setDesc("Enter your OpenAI API key")
            .addText(text => text
                .setPlaceholder("Enter your API key")
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("OpenAI base URL")
            .setDesc("Enter the base URL for the OpenAI API (optional)")
            .addText(text => text
                .setPlaceholder("Enter the base URL")
                .setValue(this.plugin.settings.baseURL)
                .onChange(async (value) => {
                    this.plugin.settings.baseURL = value;
                    await this.plugin.saveSettings();
                }));
    }

    createModelSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Model').setHeading();

        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the OpenAI model to use or enter a custom model name")
            .addDropdown(dropdown => {
                dropdown.addOption("gpt-4o-mini", "GPT-4o Mini")
                    .addOption("gpt-4o", "GPT-4o")
                    .addOption("custom", "Custom");
                
                if (this.plugin.settings.customModel) {
                    dropdown.addOption(this.plugin.settings.customModel, this.plugin.settings.customModel);
                }
                
                dropdown.setValue(this.plugin.settings.model)
                    .onChange(async (value) => {
                        if (value !== "custom") {
                        //     this.showCustomModelSetting(containerEl);
                        // } else {
                            this.plugin.settings.model = value;
                            await this.plugin.saveSettings();
                        }
                    });
                return dropdown;
            });

        // this.showCustomModelSetting(containerEl);
    }

    showCustomModelSetting(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Custom model")
            .setDesc("Enter the name of the custom OpenAI model")
            .addText(text => text
                .setPlaceholder("Enter custom model name")
                .setValue(this.plugin.settings.customModel || "")
                .onChange(async (customValue) => {
                    this.plugin.settings.customModel = customValue;
                    this.plugin.settings.model = customValue;
                    await this.plugin.saveSettings();
                }));
    }

    createGenerationSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Generation').setHeading();

        new Setting(containerEl)
            .setName("Temperature")
            .setDesc("Set the temperature for tag generation (0.0 - 1.0)")
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.temperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.temperature = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Max tokens")
            .setDesc("Set the maximum number of tokens for tag generation")
            .addText(text => text
                .setPlaceholder("Enter max tokens")
                .setValue(String(this.plugin.settings.max_tokens))
                .onChange(async (value) => {
                    const maxTokens = parseInt(value, 10);
                    if (!isNaN(maxTokens)) {
                        this.plugin.settings.max_tokens = maxTokens;
                        await this.plugin.saveSettings();
                    }
                }));
    }

    createTranscriptionSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Transcription').setHeading();

        new Setting(containerEl)
            .setName('Transcription folder')
            .setDesc('Specify the folder for transcriptions. Auto-complete enabled.')
            .addText(text => {
                const folderOptions = this.getFolderOptions();
                text.inputEl.setAttribute('list', 'folder-options');
                const datalist = document.createElement('datalist');
                datalist.id = 'folder-options';
                folderOptions.forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder;
                    datalist.appendChild(option);
                });
                text.inputEl.appendChild(datalist);
                text.setValue(this.plugin.settings.transcriptionFolder);
                text.onChange(async (value) => {
                    this.plugin.settings.transcriptionFolder = value;
                    await this.plugin.saveSettings();
                });
            });

        // new Setting(containerEl).setName('Deepgram').setHeading();

        new Setting(containerEl)
            .setName("Deepgram API key")
            .setDesc("Enter your Deepgram API key")
            .addText(text => text
                .setPlaceholder("Enter your Deepgram API key")
                .setValue(this.plugin.settings.deepgramApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.deepgramApiKey = value;
                    await this.plugin.saveSettings();
                }));
    }

    createOCISection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('OCI').setHeading();

        new Setting(containerEl)
            .setName("OCI bucket name")
            .setDesc("Enter the OCI bucket name")
            .addText(text => text
                .setPlaceholder("Enter OCI bucket name")
                .setValue(this.plugin.settings.ociBucketName)
                .onChange(async (value) => {
                    this.plugin.settings.ociBucketName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("OCI config file path")
            .setDesc("Enter the path to your OCI config file")
            .addText(text => text
                .setPlaceholder("Enter OCI config file path")
                .setValue(this.plugin.settings.ociConfigFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.ociConfigFilePath = value;
                    await this.plugin.saveSettings();
                }));
    }

    // createSpeakerSection(containerEl: HTMLElement): void {
    //     new Setting(containerEl).setName('Speaker Identification').setHeading();

    //     new Setting(containerEl)
    //         .setName("Speaker Regex")
    //         .setDesc("Regular expression to identify speaker lines (e.g., '^Speaker \\d+: ')")
    //         .addText(text => text
    //             .setValue(this.plugin.settings.speakerRegex)
    //             .onChange(async (value) => {
    //                 this.plugin.settings.speakerRegex = value;
    //                 await this.plugin.saveSettings();
    //             }));
    // }

    getFolderOptions(): string[] {
        const folders: string[] = [];
        Vault.recurseChildren(this.app.vault.getRoot(), (file) => {
            if (file instanceof TFolder) {
                folders.push(file.path);
            }
        });
        return folders;
    }
}