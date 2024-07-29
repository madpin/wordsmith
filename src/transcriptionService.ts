import { App, TFile, Vault } from 'obsidian';
import { ObjectStorageClient, requests } from 'oci-objectstorage';
import * as common from 'oci-common';
import { Buffer } from 'buffer';
import TagSuggestionPlugin from '../main';

interface PutObjectRequest {
    namespaceName: string;
    bucketName: string;
    objectName: string;
    putObjectBody: Buffer;
}

interface TranscriptionResponse {
    results: {
        channels: Array<{
            alternatives: Array<{
                transcript?: string;
                paragraphs?: {
                    transcript: string;
                };
            }>;
        }>;
    };
}
/**
* Transcribes an audio file using Oracle Cloud Infrastructure and Deepgram API.
* @param plugin The TagSuggestionPlugin instance
* @param file The audio file to transcribe
* @param statusCallback A function to report the status of the transcription process
* @returns A promise that resolves to the transcription text
*/
export async function transcribeAudio(plugin: TagSuggestionPlugin, file: File, statusCallback: (status: string) => void): Promise<string> {
    try {
        const provider = new common.ConfigFileAuthenticationDetailsProvider(plugin.settings.ociConfigFilePath);
        const objectStorageClient = new ObjectStorageClient({ authenticationDetailsProvider: provider });
        const bucketName = plugin.settings.ociBucketName;
        const objectName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
        const namespace = await getNamespace(objectStorageClient);
        const ociRegion = provider.getRegion();

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const putObjectRequest: PutObjectRequest = {
            namespaceName: namespace,
            bucketName: bucketName,
            objectName: objectName,
            putObjectBody: buffer
        };

        statusCallback("Uploading audio file to OCI");
        await objectStorageClient.putObject(putObjectRequest);

        statusCallback("Audio file uploaded, preparing for transcription");
        const audioUrl = `https://objectstorage.${ociRegion.regionId}.oraclecloud.com/n/${encodeURIComponent(namespace)}/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`;

        statusCallback("Sending request to Deepgram API");

        const transcription = await transcribeWithDeepgram(audioUrl, plugin.settings.deepgramApiKey, statusCallback);
        statusCallback("Transcription completed");

        return transcription;
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}

/**
 * Transcribes audio using the Deepgram API.
 * @param audioUrl The URL of the audio file to transcribe
 * @param apiKey The Deepgram API key
 * @returns A promise that resolves to the transcription text
 */
async function transcribeWithDeepgram(audioUrl: string, apiKey: string, statusCallback: (status: string) => void): Promise<string> {
    statusCallback("Deepgram API processing audio");

    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&paragraphs=true&diarize=true&language=en&model=nova-2', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: audioUrl })
    });
    statusCallback("Deepgram API response received");

    if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
    }

    const data: TranscriptionResponse = await response.json();
    try {
        // Check for the Python-style structure first
        if (data.results?.channels[0]?.alternatives[0]?.paragraphs?.transcript) {
            return String(data.results.channels[0].alternatives[0].paragraphs.transcript);
        }
        if (data.results?.channels[0]?.alternatives[0]?.transcript) {
            return String(data.results.channels[0].alternatives[0].transcript);
        }
        
        statusCallback("No transcript found in the response");
        return "";
    } catch (error) {
        statusCallback("Error accessing transcription data:" + String(error));
        return "";
    }
}

/**
 * Saves the transcription to a markdown file in the specified folder.
 * @param app The Obsidian App instance
 * @param fileName The name of the file (without extension)
 * @param content The transcription content
 * @param folder The folder to save the file in
 * @returns A promise that resolves to the created TFile
 */
export async function saveTranscription(app: App, fileName: string, content: string, folder: string): Promise<TFile> {
    const vault = app.vault;
    await vault.adapter.mkdir(folder);
    const path = `${folder}/${fileName}.md`;
    return await vault.create(path, content);
}

/**
 * Retrieves the namespace from the ObjectStorageClient.
 * @param client The ObjectStorageClient instance
 * @returns A promise that resolves to the namespace string
 */
async function getNamespace(client: ObjectStorageClient): Promise<string> {
    const request: requests.GetNamespaceRequest = {};
    const response = await client.getNamespace(request);
    return response.value;
}

export async function saveTranscriptionWithUniqueFilename(app: App, baseName: string, transcription: string, folder: string): Promise<TFile> {
    let fileName = baseName;
    let counter = 1;
    let newFile: TFile | null = null;

    while (!newFile) {
        try {
            newFile = await saveTranscription(
                app,
                fileName,
                transcription,
                folder
            );
        } catch (error) {
            if (error instanceof Error && error.message === 'File already exists.') {
                fileName = `${baseName}_${counter}`;
                counter++;
            } else {
                throw error; // If it's a different error, rethrow it
            }
        }
    }

    return newFile;
}