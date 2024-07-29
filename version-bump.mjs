import { readFileSync, writeFileSync } from 'fs';
import simpleGit from 'simple-git';
import readline from 'readline';
import fetch from 'node-fetch';

const git = simpleGit();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const handleInterrupt = async () => {
    console.log('\nOperation cancelled by user.');
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
        rl.close();
        process.exit(0);
    }
};

process.on('SIGINT', handleInterrupt);

const askQuestion = (question, defaultAnswer = 'yes') => {
    return new Promise((resolve, reject) => {
        rl.question(`${question} [${defaultAnswer}]: `, (answer) => {
            if (answer.trim().toLowerCase() === '') {
                resolve(defaultAnswer);
            } else if (answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'no') {
                resolve(answer.trim().toLowerCase());
            } else {
                reject(new Error('Aborted by user'));
            }
        });
    });
};

const readJsonFile = (filename) => {
    try {
        return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        handleInterrupt();
    }
};

const writeJsonFile = (filename, data) => {
    try {
        writeFileSync(filename, JSON.stringify(data, null, '\t'));
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        handleInterrupt();
    }
};

const targetVersion = process.env.npm_package_version;
const filesToUpdate = ['manifest.json', 'versions.json'];

const updateVersionFiles = () => {
    const manifest = readJsonFile('manifest.json');
    const { minAppVersion } = manifest;
    manifest.version = targetVersion;
    writeJsonFile('manifest.json', manifest);

    const versions = readJsonFile('versions.json');
    versions[targetVersion] = minAppVersion;
    writeJsonFile('versions.json', versions);
};

const showChanges = async () => {
    const status = await git.status();
    console.log('Changes to be committed:');
    console.log(status.files.map(file => `  ${file.path}`).join('\n'));
};

const commitChanges = async () => {
    await showChanges();

    try {
        const commitConfirmation = await askQuestion('Do you want to commit these changes?');
        if (commitConfirmation !== 'yes') {
            console.log('Aborting commit.');
            handleInterrupt();
        }

        const commitMessage = `Update version files to ${targetVersion}`;

        await git.add(filesToUpdate);
        await git.commit(commitMessage);
        console.log('Successfully committed changes.');
    } catch (error) {
        if (error.message === 'Aborted by user') {
            console.log('Aborting script.');
            handleInterrupt();
        }
        console.error('Failed to execute git commit commands:', error);
        handleInterrupt();
    }
};

const createGitHubRelease = async () => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        console.error('GITHUB_TOKEN environment variable is not set. Skipping GitHub release creation.');
        return;
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
    } catch (error) {
        console.error('Failed to create GitHub release:', error);
        handleInterrupt();
    }
};

const main = async () => {
    try {
        updateVersionFiles();
        await commitChanges();
        await createGitHubRelease();
    } catch (error) {
        console.error('An error occurred:', error);
        handleInterrupt();
    } finally {
        rl.close();
    }
};

main();