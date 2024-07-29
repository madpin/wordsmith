#!/bin/sh

# Check if the last command (version-bump.mjs) exited successfully
if [ $? -eq 0 ]; then
    echo "Version bump successful. Pushing changes..."
    git push && git push --tags
else
    echo "Version bump was cancelled or failed. Not pushing changes."
    # Revert the version change in package.json
    git checkout -- package.json
    # Remove the git tag created by npm version
    git tag -d $(git describe --tags --abbrev=0)
fi
