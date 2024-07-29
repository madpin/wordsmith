import { readFileSync, writeFileSync } from 'fs';
import simpleGit from 'simple-git';
import readline from 'readline';
import fetch from 'node-fetch';

const git = simpleGit();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const handleInterrupt = () => {
    console.log('\nOperation cancelled by user.');
    rl.close();
    process.exit(0);
};

process.on('SIGINT', handleInterrupt);

// Adding a custom method to ask questions and handle SIGINT properly
const askQuestion = (question, defaultAnswer = 'yes') => {
    return new Promise((resolve, reject) => {

        rl.question(`${question} [${defaultAnswer}]: `, (answer) => {
            const normalizedAnswer = answer.trim().toLowerCase();
            if (normalizedAnswer === '' || normalizedAnswer === 'yes' || normalizedAnswer === 'no') {
                resolve(normalizedAnswer === '' ? defaultAnswer : normalizedAnswer);
            } else {
                resolve('no');
            }
        });

        process.once('SIGINT', () => {
            rl.close();
            reject(new Error('User interruption'));
        });
    });
};

const readJsonFile = (filename) => {
    try {
        return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return null;
    }
};

const writeJsonFile = (filename, data) => {
    try {
        writeFileSync(filename, JSON.stringify(data, null, '\t'));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
};

const updateVersionFiles = (targetVersion) => {
    const manifest = readJsonFile('manifest.json');
    if (!manifest) return false;

    const { minAppVersion } = manifest;
    manifest.version = targetVersion;
    if (!writeJsonFile('manifest.json', manifest)) return false;

    const versions = readJsonFile('versions.json');
    if (!versions) return false;

    versions[targetVersion] = minAppVersion;
    return writeJsonFile('versions.json', versions);
};

const showChanges = async () => {
    const status = await git.status();
    console.log('Changes to be committed:');
    console.log(status.files.map(file => `  ${file.path}`).join('\n'));
};

const commitChanges = async (targetVersion, filesToUpdate) => {
    await showChanges();

    try {
        const commitConfirmation = await askQuestion('Do you want to commit these changes?');
        if (commitConfirmation !== 'yes') {
            console.log('Aborting commit.');
            return false;
        }
    } catch (error) {
        console.log('Aborting due to interrupt');
        return false;
    }

    const commitMessage = `Update version files to ${targetVersion}`;

    try {
        await git.add(filesToUpdate);
        await git.commit(commitMessage);
        console.log('Successfully committed changes.');
        return true;
    } catch (error) {
        console.error('Failed to execute git commit commands:', error);
        return false;
    }
};

const createGitHubRelease = async (targetVersion) => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        console.error('GITHUB_TOKEN environment variable is not set. Skipping GitHub release creation.');
        return false;
    }

    const repoUrl = await git.remote(['get-url', 'origin']);
    const [, owner, repo] = repoUrl.match(/github\.com[:/](.+)\/(.+)\.git$/);

    const releaseData = {
        tag_name: targetVersion,
        name: `Release ${targetVersion}`,
        body: `Release of version ${targetVersion}`,
        draft: false,
        prerelease: false
    };

    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(releaseData)
        });

        if (!response.ok) {
            throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
        }

        console.log(`Successfully created GitHub release for ${targetVersion}`);
        return true;
    } catch (error) {
        console.error('Failed to create GitHub release:', error);
        return false;
    }
};

const cleanup = async () => {
    try {
        const status = await git.status();
        if (status.files.length > 0) {
            console.log('Reverting changes...');
            await git.reset(['--hard']);
            console.log('Changes reverted successfully.');
        }
    } catch (error) {
        console.error('Failed to revert changes:', error);
    } finally {
        if (rl.listenerCount('line') > 0) {
            rl.close();
        }
    }
};

const main = async () => {
    const targetVersion = process.env.npm_package_version;
    const filesToUpdate = ['manifest.json', 'versions.json'];

    try {
        if (!updateVersionFiles(targetVersion)) {
            throw new Error('Failed to update version files');
        }

        if (!await commitChanges(targetVersion, filesToUpdate)) {
            throw new Error('Failed to commit changes');
        }

        if (!await createGitHubRelease(targetVersion)) {
            throw new Error('Failed to create GitHub release');
        }

        console.log('Script completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
        await cleanup();
    } finally {
        rl.close();
    }
};

main().catch(async (error) => {
    console.error('Unhandled error:', error);
    await cleanup();
    process.exit(1);
});
