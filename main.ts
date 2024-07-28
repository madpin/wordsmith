import { Plugin, App } from 'obsidian';
import OpenAI from "openai";
import { PluginSettings, DEFAULT_SETTINGS } from './src/settings';
import { TagSuggestionView, VIEW_TYPE_TAG_SUGGESTION } from 'src/tagSuggestionView';
import { SettingsTab } from 'src/settingsTab';
import { TagSuggestionSidebar } from 'src/tagSuggestionSidebar';

export default class TagSuggestionPlugin extends Plugin {
    settings: PluginSettings;
    openai: OpenAI;
    sidebar: TagSuggestionSidebar;

    async onload() {
        await this.loadSettings();

        this.openai = this.createOpenAIInstance();
        this.sidebar = new TagSuggestionSidebar(this.app, this);

        // Register the custom view
        this.registerView(
            VIEW_TYPE_TAG_SUGGESTION,
            (leaf) => new TagSuggestionView(leaf, this.sidebar, this.app, this)
        );

        this.sidebar.initializeView();

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Add ribbon icon
        this.addRibbonIcon('glasses', 'Suggest Tags and Names', () => {
            this.sidebar.toggleSidebar();
        });

        // Add command
        this.addCommand({
            id: 'suggest-tags-and-names',
            name: 'Suggest Tags and Names for Current Note',
            callback: () => {
                this.sidebar.toggleSidebar();
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.openai = this.createOpenAIInstance();
    }

    createOpenAIInstance(): OpenAI {
        return new OpenAI({
            apiKey: this.settings.apiKey,
            baseURL: this.settings.baseURL || undefined,
            dangerouslyAllowBrowser: true,
        });
    }
}