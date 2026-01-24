# Wiki3.ai Publish Extension

Publish JupyterLite notebooks directly to GitHub with one click.

## Features

- 🚀 **One-click publishing** - Publish notebooks to GitHub repositories
- 🔐 **Client-side authentication** - Your token stays in your browser
- 🤖 **Automatic GitHub Actions** - Uses `repo2jupyterlite-action` for deployment
- 📄 **GitHub Pages ready** - Notebooks published to `username.github.io/repo-name/`
- ✨ **Zero configuration** - Works out of the box

## Installation

### For Wiki3.ai users

Add to `jupyter_lite_config.json`:

```json
{
  "extensions": [
    "jupyterlab-wiki3-publish"
  ]
}
```

Then rebuild:

```bash
jupyter lite build --contents files/
```

### From PyPI

```bash
pip install jupyterlab-wiki3-publish
```

## Usage

1. **Open a notebook** in Wiki3.ai JupyterLite
2. **Click "Publish"** button in the toolbar
3. **Paste your GitHub token** (first time only)
   - Get token from `gh auth token` (GitHub CLI)
   - Or create Personal Access Token at https://github.com/settings/tokens
   - Needs: `repo`, `workflow` scopes
4. **Select or create** a GitHub repository
5. **Watch progress** as notebook uploads and workflow triggers
6. **View your site** at `https://username.github.io/repo-name/`

## How It Works

1. **Uploads notebook** to your repository
2. **Creates `.github/workflows/publish.yml`** with `repo2jupyterlite-action`
3. **Enables GitHub Pages** pointing to `gh-pages` branch
4. **GitHub Actions automatically:**
   - Builds JupyterLite site from your notebook
   - Publishes to GitHub Pages
   - Site ready in 1-2 minutes

## Security

- ✅ Token stored only in **browser session memory**
- ✅ No backend server needed
- ✅ No token transmission (direct browser → GitHub API)
- ✅ Cleared on page refresh
- ✅ Use fine-grained tokens for minimal permissions

## Token Requirements

Your GitHub token needs these scopes:

- `repo` - Read/write access to repositories
- `workflow` - Enable GitHub Actions

**Minimal fine-grained token:**
- Select repositories you want to publish to
- Permissions: Contents (R+W), Workflows (R+W)

## Development

### Setup

```bash
git clone https://github.com/wiki3-ai/jupyterlab-publish.git
cd jupyterlab-publish

npm install
npm run build
```

### Watch mode

```bash
npm run watch
```

### Build JupyterLite with extension

```bash
jupyter lite build
cd _build/html
python -m http.server
```

## Publishing

```bash
# Build distribution
npm run build
python -m build

# Upload to PyPI
twine upload dist/*
```

## License

AGPL-3.0-only - See LICENSE file

## Contributing

Contributions welcome! Please open issues and pull requests.

## Credits

Built for **Wiki3.ai** - The Web3 knowledge platform.

Uses [repo2jupyterlite-action](https://github.com/yuvipanda/repo2jupyterlite-action) for deployment.
