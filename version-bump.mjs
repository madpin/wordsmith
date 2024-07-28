import { readFileSync, writeFileSync } from 'fs';
import simpleGit from 'simple-git';
import readline from 'readline';

const git = simpleGit();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Prompts the user with a question and returns the answer.
 * @param {string} question - The question to ask.
 * @returns {Promise<string>} A promise that resolves with the user's answer.
 */
const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
};

/**
 * Reads a JSON file and returns its parsed content.
 * @param {string} filename - The name of the file to read.
 * @returns {Object} The parsed JSON content.
 */
const readJsonFile = (filename) => {
    try {
        return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        process.exit(1);
    }
};

/**
 * Writes data to a JSON file.
 * @param {string} filename - The name of the file to write.
 * @param {Object} data - The data to write.
 */
const writeJsonFile = (filename, data) => {
    try {
        writeFileSync(filename, JSON.stringify(data, null, '\t'));
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        process.exit(1);
    }
};

const targetVersion = process.env.npm_package_version;
const filesToUpdate = ['manifest.json', 'versions.json'];

/**
 * Updates the manifest and versions files with the new version.
 */
const updateVersionFiles = () => {
    // Update manifest.json
    const manifest = readJsonFile('manifest.json');
    const { minAppVersion } = manifest;
    manifest.version = targetVersion;
    writeJsonFile('manifest.json', manifest);

    // Update versions.json
    const versions = readJsonFile('versions.json');
    versions[targetVersion] = minAppVersion;
    writeJsonFile('versions.json', versions);
};

/**
 * Displays the changes to be committed.
 */
const showChanges = async () => {
    const status = await git.status();
    console.log('Changes to be committed:');
    console.log(status.files.map(file => `  ${file.path}`).join('\n'));
};

/**
 * Commits changes and creates a new tag.
 */
const commitAndTag = async () => {
    await showChanges();

    const commitConfirmation = await askQuestion('Do you want to commit these changes? (yes/no) ');
    if (commitConfirmation.toLowerCase() !== 'yes') {
        console.log('Aborting commit.');
        process.exit(0);
    }

    const commitMessage = `New version release ${targetVersion}`;

    try {
        await git.add(filesToUpdate);
        await git.commit(commitMessage);
        await git.push('origin', 'main');
        console.log('Successfully committed and pushed changes.');
    } catch (error) {
        console.error('Failed to execute git commit commands:', error);
        process.exit(1);
    }

    const tagConfirmation = await askQuestion('Do you want to tag this commit? (yes/no) ');
    if (tagConfirmation.toLowerCase() !== 'yes') {
        console.log('Aborting tag.');
        process.exit(0);
    }

    try {
        await git.addTag(targetVersion);
        await git.pushTags('origin');
        console.log(`Successfully tagged and pushed version ${targetVersion}`);
    } catch (error) {
        console.error('Failed to execute git tag commands:', error);
        process.exit(1);
    }
};

/**
 * Main function to run the script.
 */
const main = async () => {
    try {
        updateVersionFiles();
        await commitAndTag();
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
};

main();