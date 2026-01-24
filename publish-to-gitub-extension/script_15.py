
# .gitignore
gitignore = """# Node modules
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
lib/
dist/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
build/
dist/

# JupyterLab
.jupyterlab
_build/
"""

with open('jupyterlab-wiki3-publish/.gitignore', 'w') as f:
    f.write(gitignore)

print("✓ Created .gitignore")
