# cell-run-button - JupyterLab extension that adds run buttons next to cell input prompts
# This is a JupyterLab extension with no Python code.
# The extension is distributed via shared-data in the wheel.

try:
    from importlib.metadata import version as _get_version, PackageNotFoundError
    __version__ = _get_version("cell-run-button")
except (PackageNotFoundError, ImportError):
    # Fallback for development or if package is not installed
    import tomllib
    from pathlib import Path
    
    _project_root = Path(__file__).parent.parent
    _pyproject_path = _project_root / "pyproject.toml"
    
    if _pyproject_path.exists():
        with open(_pyproject_path, "rb") as f:
            _pyproject = tomllib.load(f)
            __version__ = _pyproject["project"]["version"]
    else:
        __version__ = "unknown"


def _jupyter_labextension_paths():
    """Return metadata about the JupyterLab extension."""
    # Extension is installed via shared-data in pyproject.toml
    # to share/jupyter/labextensions/@wiki3-ai/cell-run-button
    return []
