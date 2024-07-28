import { normalizePath } from 'obsidian';
import TagSuggestionPlugin from '../main';
import { formatTag } from './tagUtils';

/**
 * Suggests tags for the given content using OpenAI's chat completion API.
 * @param plugin The TagSuggestionPlugin instance
 * @param content The text content to generate tags for
 * @returns A promise that resolves to an array of suggested tags
 */
export async function suggestTags(plugin: TagSuggestionPlugin, content: string): Promise<string[]> {
    try {
        // Create a chat completion request to OpenAI
        const response = await plugin.openai.chat.completions.create({
            model: plugin.settings.model,
            messages: [
                { role: "system", content: "You are a helpful assistant that suggests relevant tags for a given text content." },
                { role: "user", content: `Suggest 15 relevant tags for the following content, return them as a JSON array of strings:\n\n${content}` }
            ],
            temperature: plugin.settings.temperature,
            max_tokens: plugin.settings.max_tokens,
        });

        // Extract and parse the suggested tags from the API response
        const suggestedTagsJson = response.choices[0]?.message?.content?.trim() || "[]";
        // console.log("suggestedTagsJson: " + suggestedTagsJson)

        const tags = JSON.parse(
            suggestedTagsJson.substring(
                suggestedTagsJson.indexOf('['),
                suggestedTagsJson.indexOf(']', suggestedTagsJson.indexOf('[')) + 1
            )
        );        // Add '.md' extension to each name and return them as an array
        // Format the tags and return them as an array
        return Array.isArray(tags) ? tags.map(formatTag) : [];
    } catch (error) {
        console.error("Error suggesting tags:", error);
        return [];
    }
}

/**
 * Suggests file names for the given content using OpenAI's chat completion API.
 * @param plugin The TagSuggestionPlugin instance
 * @param content The text content to generate file names for
 * @returns A promise that resolves to an array of suggested file names
 */
export async function suggestNames(plugin: TagSuggestionPlugin, content: string): Promise<string[]> {
    try {
        // Create a chat completion request to OpenAI
        const response = await plugin.openai.chat.completions.create({
            model: plugin.settings.model,
            messages: [
                { role: "system", content: "You are a helpful assistant that suggests relevant file names for obsidian note files, given text content. (feel free to use space in the naming)" },
                { role: "user", content: `Suggest 5 relevant file names for the following content, return them as a JSON array of strings:\n\n${content}` }
            ],
            temperature: plugin.settings.temperature,
            max_tokens: plugin.settings.max_tokens,
        });

        // Extract and parse the suggested names from the API response
        const suggestedNamesJson = response.choices[0]?.message?.content?.trim() || "[]";
        // console.log("suggestedNamesJson: " + suggestedNamesJson)
        const names = JSON.parse(
            suggestedNamesJson.substring(
                suggestedNamesJson.indexOf('['),
                suggestedNamesJson.indexOf(']', suggestedNamesJson.indexOf('[')) + 1
            )
        );        // Add '.md' extension to each name and return them as an array
        return Array.isArray(names) ? names.map(name => normalizePath(`${name}.md`)) : [];
    } catch (error) {
        console.error("Error suggesting names:", error);
        return [];
    }
}