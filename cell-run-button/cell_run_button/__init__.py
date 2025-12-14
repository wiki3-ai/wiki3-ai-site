# cell-run-button - JupyterLab extension that adds run buttons next to cell input prompts
# This is a JupyterLab extension with no Python code.
# The extension is distributed via shared-data in the wheel.

try:
    from importlib.metadata import version as _get_version
    __version__ = _get_version("cell-run-button")
except Exception:
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
    return [{
        "src": "cell_run_button/labextension",
        "dest": "@wiki3-ai/cell-run-button"
    }]
