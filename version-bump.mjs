import { readFileSync, writeFileSync } from "fs";
import simpleGit from 'simple-git';
import readline from 'readline';

const git = simpleGit();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
};

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

const filesToUpdate = ['manifest.json', 'versions.json'];

const showChanges = async () => {
    const status = await git.status();
    console.log('Changes to be committed:');
    console.log(status.files.map(file => `  ${file.path}`).join('\n'));
};

const commitAndTag = async () => {
    await showChanges();

    const commitConfirmation = await askQuestion('Do you want to commit these changes? (yes/no) ');
    if (commitConfirmation.toLowerCase() !== 'yes') {
        console.log('Aborting commit.');
        process.exit(1);
    }

    const commitMessage = `New version release ${targetVersion}`;

    try {
        await git.add(filesToUpdate);
        await git.commit(commitMessage);
        await git.push('origin', 'master');
    } catch (err) {
        console.error('Failed to execute git commit commands', err);
        process.exit(1);
    }

    const tagConfirmation = await askQuestion('Do you want to tag this commit? (yes/no) ');
    if (tagConfirmation.toLowerCase() !== 'yes') {
        console.log('Aborting tag.');
        process.exit(1);
    }

    try {
        await git.tag(['-a', targetVersion, '-m', targetVersion]);
        await git.pushTags('origin');
        console.log(`Successfully tagged and pushed version ${targetVersion}`);
    } catch (err) {
        console.error('Failed to execute git tag commands', err);
        process.exit(1);
    }
}

commitAndTag().then(() => {
    rl.close();
}).catch((err) => {
    console.error('An error occurred:', err);
    rl.close();
    process.exit(1);
});
