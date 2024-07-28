export interface PluginSettings {
  apiKey: string;
  baseURL: string;
  model: string;
  customModel: string;
  temperature: number;
  max_tokens: number;
  deepgramApiKey: string;
  transcriptionFolder: string;
  ociBucketName: string;
  ociRegion: string;
  ociConfigFilePath: string; // New setting for custom config file path
  // speakerRegex: string; // Regex to identify speaker lines
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  customModel: '',
  temperature: 0.7,
  max_tokens: 50,
  deepgramApiKey: '',
  transcriptionFolder: 'Transcriptions',
  ociBucketName: '',
  ociRegion: '',
  ociConfigFilePath: '~/.oci/config', // Default path
  // speakerRegex: '^Speaker \\d+: ' // Example regex
};
