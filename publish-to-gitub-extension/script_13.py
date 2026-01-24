
# pyproject.toml
pyproject_toml = """[build-system]
requires = ["hatchling>=1.6.0", "jupyterlab>=4.0.0,<5"]
build-backend = "hatchling.build"

[project]
name = "jupyterlab-wiki3-publish"
version = "0.1.0"
description = "Publish JupyterLite notebooks directly to GitHub"
readme = "README.md"
requires-python = ">=3.7"
license = {text = "AGPL-3.0-only"}
authors = [
  {name = "Wiki3.ai", email = "contact@wiki3.ai"}
]
keywords = ["jupyter", "jupyterlab", "jupyterlite", "github", "publish"]
classifiers = [
  "Framework :: Jupyter",
  "Framework :: Jupyter :: JupyterLab :: 4",
  "License :: OSI Approved :: GNU Affero General Public License v3",
  "Programming Language :: Python :: 3",
  "Programming Language :: Python :: 3.7",
  "Programming Language :: Python :: 3.8",
  "Programming Language :: Python :: 3.9",
  "Programming Language :: Python :: 3.10",
  "Programming Language :: Python :: 3.11"
]

[project.urls]
Homepage = "https://github.com/wiki3-ai/jupyterlab-publish"
Repository = "https://github.com/wiki3-ai/jupyterlab-publish.git"
Issues = "https://github.com/wiki3-ai/jupyterlab-publish/issues"

[tool.hatch.build.targets.wheel]
packages = ["jupyterlab_wiki3_publish"]
"""

with open('jupyterlab-wiki3-publish/pyproject.toml', 'w') as f:
    f.write(pyproject_toml)

print("✓ Created pyproject.toml")
