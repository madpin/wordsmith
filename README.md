---
created:
  - 2024-07-15 12:24
tags:
  - "#LLMHelperPlugin"
  - MOC
type: Professional
template-version: "1.0"
url:
---
# LLM Helper Plugin for Obsidian

LLM Helper is a powerful plugin for Obsidian that leverages AI to enhance your note-taking experience. It provides intelligent tag and name suggestions, audio transcription capabilities, and seamless integration with OpenAI and Oracle Cloud Infrastructure (OCI).

## Features
- AI-powered tag suggestions for your notes
- Intelligent file name recommendations
- Audio transcription using Deepgram API
- Integration with OpenAI for content analysis
- Secure file storage using Oracle Cloud Infrastructure (OCI)
- Customizable settings for API keys and model parameters

## Installation
1. Download the latest release from the GitHub repository.
2. Extract the downloaded zip file into your Obsidian vault's plugins folder: `<vault>/.obsidian/plugins/`
3. Restart Obsidian and enable the LLM Helper plugin in the settings.

## Setup
1. Open the plugin settings in Obsidian.
2. Enter your OpenAI API key.
3. (Optional) Configure the OpenAI base URL if you're using a custom endpoint.
4. Choose the OpenAI model or enter a custom model name.
5. Adjust the temperature and max tokens settings as desired.
6. Enter your Deepgram API key for audio transcription.
7. Specify the transcription folder where transcribed files will be saved.
8. Enter your OCI bucket name and region.
9. Specify the path to your OCI config file (default is `~/.oci/config`).

## Usage
- Click the ribbon icon or use the command "Suggest Tags and Names" to open the suggestion sidebar.
- Drag and drop audio files into the transcription section to automatically transcribe and save them.
- Click on suggested tags to add or remove them from your current note.
- Click on suggested names to rename your current file.
- Use the refresh button to update suggestions for the current note.

## OCI Setup Instructions
To use the OCI features, you need to install the OCI CLI and set up the `~/.oci/config` file:

1. Install OCI CLI:
   - For macOS (using Homebrew): `brew update && brew install oci-cli`
   - For other systems: `bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"`
2. Verify the installation: `oci --version`

3. Set up the OCI CLI configuration:
   - Run: `oci setup config`
   - Follow the prompts to enter your user OCID, tenancy OCID, region, and generate or use an existing API key pair.
   - Verify the config file: `cat ~/.oci/config`

For more detailed instructions on OCI setup, please refer to the Oracle Cloud documentation.

## Development
To set up the development environment:
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Use `npm run dev` to start the compilation in watch mode.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License.# wordsmith
