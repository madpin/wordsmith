import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import simpleGit from 'simple-git';
import readline from 'readline';
import fetch from 'node-fetch';

const git = simpleGit();
let rl;

function createReadlineInterface() {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function closeReadlineInterface() {
    if (rl) {
        rl.close();
        rl = null;
    }
}

process.on('SIGINT', () => {
    console.log('\nOperation cancelled by user.');
    closeReadlineInterface();
    process.exit(1);
});

const askQuestion = (question, defaultAnswer = '') => {
    return new Promise((resolve) => {
        createReadlineInterface();
        rl.question(`${question}${defaultAnswer ? ` [${defaultAnswer}]` : ''}: `, (answer) => {
            closeReadlineInterface();
            resolve(answer.trim() || defaultAnswer);
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
        writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
};

const updateVersionFiles = (newVersion) => {
    const manifest = readJsonFile('manifest.json');
    if (!manifest) return false;

    const { minAppVersion } = manifest;
    manifest.version = newVersion;
    if (!writeJsonFile('manifest.json', manifest)) return false;

    const versions = readJsonFile('versions.json');
    if (!versions) return false;

    versions[newVersion] = minAppVersion;
    return writeJsonFile('versions.json', versions);
};

const showChanges = async () => {
    const status = await git.status();
    console.log('Changes to be committed:');
    console.log(status.files.map(file => `  ${file.path}`).join('\n'));
};

const commitChanges = async (newVersion, filesToUpdate) => {
    await showChanges();

    const commitConfirmation = await askQuestion('Do you want to commit these changes?', 'yes');
    if (commitConfirmation.toLowerCase() !== 'yes') {
        console.log('Aborting commit.');
        return false;
    }

    const commitMessage = `Update version to ${newVersion}`;

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

const createGitHubRelease = async (newVersion) => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        console.error('GITHUB_TOKEN environment variable is not set. Skipping GitHub release creation.');
        return false;
    }

    const repoUrl = await git.remote(['get-url', 'origin']);
    const [, owner, repo] = repoUrl.match(/github\.com[:/](.+)\/(.+)\.git$/);

    const releaseData = {
        tag_name: newVersion,
        name: `Release ${newVersion}`,
        body: `Release of version ${newVersion}`,
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

        console.log(`Successfully created GitHub release for ${newVersion}`);
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
        closeReadlineInterface();
    }
};

const main = async () => {
    try {
        const packageJson = readJsonFile('package.json');
        if (!packageJson) throw new Error('Failed to read package.json');

        const currentVersion = packageJson.version;
        console.log(`Current version: ${currentVersion}`);

        const versionIncrement = await askQuestion('Enter version increment (patch/minor/major)', 'patch');

        execSync(`npm version ${versionIncrement} --no-git-tag-version`);

        const updatedPackageJson = readJsonFile('package.json');
        if (!updatedPackageJson) throw new Error('Failed to read updated package.json');

        const newVersion = updatedPackageJson.version;
        console.log(`New version: ${newVersion}`);

        if (!updateVersionFiles(newVersion)) {
            throw new Error('Failed to update version files');
        }

        const filesToUpdate = ['package.json', 'manifest.json', 'versions.json'];
        if (!await commitChanges(newVersion, filesToUpdate)) {
            throw new Error('Failed to commit changes');
        }

        await git.addTag(newVersion);

        const pushConfirmation = await askQuestion('Do you want to push changes and tags?', 'yes');
        if (pushConfirmation.toLowerCase() === 'yes') {
            console.log('Pushing changes and tags...');
            await git.push();
            await git.pushTags();
            console.log('Successfully pushed changes and tags.');

            if (!await createGitHubRelease(newVersion)) {
                throw new Error('Failed to create GitHub release');
            }
        } else {
            console.log('Changes and tags were not pushed.');
        }

        console.log('Version bump process completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
        await cleanup();
        process.exit(1);
    } finally {
        closeReadlineInterface();
    }
};

main().catch(async (error) => {
    console.error('Unhandled error:', error);
    await cleanup();
    process.exit(1);
});
