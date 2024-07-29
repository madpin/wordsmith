import { readFileSync, writeFileSync } from 'fs';
import simpleGit from 'simple-git';
import readline from 'readline';
import fetch from 'node-fetch';

const git = simpleGit();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question, defaultAnswer = 'yes') => {
    return new Promise((resolve) => {
        rl.question(`${question} [${defaultAnswer}]: `, (answer) => {
            resolve(answer.trim().toLowerCase() || defaultAnswer);
        });
    });
};

const readJsonFile = (filename) => {
    try {
        return JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        process.exit(1);
    }
};

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

    const commitConfirmation = await askQuestion('Do you want to commit these changes?');
    if (commitConfirmation !== 'yes') {
        console.log('Aborting commit.');
        process.exit(0);
    }

    const commitMessage = `Update version files to ${targetVersion}`;

    try {
        await git.add(filesToUpdate);
        await git.commit(commitMessage);
        console.log('Successfully committed changes.');
    } catch (error) {
        console.error('Failed to execute git commit commands:', error);
        process.exit(1);
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
    }
};

const main = async () => {
    try {
        updateVersionFiles();
        await commitChanges();
        await createGitHubRelease();
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
};

main();