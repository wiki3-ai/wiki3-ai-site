from importlib.metadata import version
from pathlib import Path
import html
import os
from urllib.parse import quote
from collections import defaultdict

from jinja2 import Environment, FileSystemLoader
import nbformat
from nbconvert import HTMLExporter
from jupyterlite_core.addons.base import BaseAddon

# Get version from package metadata - bump in pyproject.toml to force
# regeneration of all wiki pages when templates or conversion logic changes
__version__ = version("wiki3-ai-site")

class WikiPageAddon(BaseAddon):
    """Generate wiki pages from notebooks"""
    
    __all__ = ["build", "post_build"]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._template_dir = Path(__file__).parent / "templates"
        self._index_template = self._template_dir / "wiki_index.html.j2"
    
    def build(self, manager):
        """Copy static assets to output directory"""
        src = self._template_dir / "wiki_behavior.js"
        dest = manager.output_dir / "static" / "wiki_behavior.js"
        
        yield self.task(
            name="copy:wiki_behavior.js",
            doc="copy wiki behavior script to static",
            file_dep=[src],
            targets=[dest],
            actions=[
                (self.copy_one, [src, dest]),
            ],
        )
    
    def post_build(self, manager):
        """Generate wiki pages after build"""
        output_dir = Path(manager.output_dir)
        files_dir = output_dir / "files"
        wiki_dir = output_dir / "wiki"
        
        if not files_dir.exists():
            return
        
        notebooks = list(files_dir.rglob("*.ipynb"))
        if not notebooks:
            return
        
        wiki_dir.mkdir(exist_ok=True)
        
        # Check if addon version changed - if so, clear old outputs to force rebuild
        version_file = wiki_dir / ".wiki_addon_version"
        old_version = version_file.read_text().strip() if version_file.exists() else None
        
        if old_version != __version__:
            print(f"[WikiPageAddon] Version changed ({old_version} -> {__version__}), regenerating all pages")
            for html_file in wiki_dir.glob("**/*.html"):
                html_file.unlink()
            version_file.write_text(__version__)
        
        # Yield a task for each notebook
        all_output_files = []
        for notebook_path in notebooks:
            rel_path = notebook_path.relative_to(files_dir)
            output_file = wiki_dir / rel_path.with_suffix('.html')
            all_output_files.append(output_file)
            
            yield self.task(
                name=f"convert:{rel_path.as_posix()}",
                doc=f"convert {rel_path} to HTML",
                file_dep=[notebook_path],
                targets=[output_file],
                actions=[
                    (self._convert_notebook, [notebook_path, output_file, files_dir, output_dir]),
                ],
            )
        
        # Collect all directories that contain notebooks (directly or nested)
        dirs_with_content = set()
        for notebook_path in notebooks:
            rel_path = notebook_path.relative_to(files_dir)
            # Add all parent directories
            for parent in rel_path.parents:
                if parent != Path('.'):
                    dirs_with_content.add(parent)
        
        # Yield task for root index page
        index_file = wiki_dir / "index.html"
        yield self.task(
            name="generate:index",
            doc="generate wiki index page",
            file_dep=[self._index_template] + all_output_files,
            targets=[index_file],
            actions=[
                (self._generate_index_page, [wiki_dir, files_dir, output_dir, Path('.')]),
            ],
        )
        
        # Yield tasks for nested directory index pages
        for subdir in sorted(dirs_with_content):
            subdir_index = wiki_dir / subdir / "index.html"
            yield self.task(
                name=f"generate:index:{subdir.as_posix()}",
                doc=f"generate index page for {subdir}",
                file_dep=[self._index_template] + all_output_files,
                targets=[subdir_index],
                actions=[
                    (self._generate_index_page, [wiki_dir, files_dir, output_dir, subdir]),
                ],
            )
    
    def _convert_notebook(self, notebook_path, output_file, files_dir, output_dir):
        """Convert a single notebook to HTML"""
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(notebook_path, 'r', encoding='utf-8') as f:
            nb = nbformat.read(f, as_version=4)
        
        notebook_title = self._extract_notebook_title(nb, notebook_path)
        rel_path = notebook_path.relative_to(files_dir)
        static_output = output_file.relative_to(output_dir)
        rel_path_url = quote(rel_path.as_posix(), safe='/')
        
        # Build breadcrumbs for nested notebooks
        breadcrumbs = []
        parent_parts = list(rel_path.parent.parts)
        if parent_parts and parent_parts != ['.']:
            for i, part in enumerate(parent_parts):
                # Calculate relative path from output_file location to this breadcrumb's index
                # We need to go up one level for the file itself, then navigate
                levels_up = len(parent_parts) - i
                rel_href = '../' * levels_up + 'index.html' if i < len(parent_parts) - 1 else 'index.html'
                breadcrumbs.append({
                    'name': part,
                    'href': rel_href,
                })
        
        html_exporter = HTMLExporter(
            template_name='wiki',
            extra_template_basedirs=[str(self._template_dir)],
        )
        
        resources = {
            "metadata": {"name": notebook_path.stem},
            "wiki_toolbar": {
                "title": notebook_title,
                "home_href": "/",
                "breadcrumbs": breadcrumbs,
                "actions": [
                    {
                        "kind": "link",
                        "label": "edit",
                        "href": f"/notebooks/index.html?path={rel_path_url}",
                        "new_tab": True,
                        "download": False,
                    },
                    {
                        "kind": "link",
                        "label": "lab",
                        "href": f"/lab/index.html?path={rel_path_url}",
                        "new_tab": True,
                        "download": False,
                    },
                    {
                        "kind": "link",
                        "label": "down",
                        "href": f"/files/{rel_path_url}",
                        "new_tab": False,
                        "download": True,
                    },
                    {
                        "kind": "button",
                        "label": "share",
                        "share_href": '/' + quote(static_output.as_posix(), safe='/'),
                        "aria_label": "Copy share link",
                    },
                ],
            },
            "wiki_behavior_script_url": "/static/wiki_behavior.js",
        }

        body, _ = html_exporter.from_notebook_node(nb, resources=resources)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(body)
        
        print(f"[WikiPageAddon] Generated: {output_file}")
    
    def _generate_index_page(self, wiki_dir, files_dir, output_dir, current_dir):
        """Generate an index page listing notebooks and subdirectories for a specific directory"""
        # Calculate paths relative to the index being generated
        index_location = wiki_dir / current_dir
        relative_root = Path(os.path.relpath(output_dir, index_location))
        theme_base = relative_root / "build" / "themes" / "@jupyterlab"
        light_css = (theme_base / "theme-light-extension" / "index.css").as_posix()
        dark_css = (theme_base / "theme-dark-extension" / "index.css").as_posix()
        
        # Calculate wiki root relative path for home link
        wiki_root = Path(os.path.relpath(wiki_dir, index_location)).as_posix()
        if wiki_root == '.':
            wiki_root = ''
        
        # Build breadcrumbs for nested directories
        breadcrumbs = []
        if current_dir != Path('.'):
            # Add wiki root
            parts = list(current_dir.parts)
            for i in range(len(parts)):
                part_path = Path(*parts[:i+1]) if i > 0 else Path(parts[0])
                # Calculate relative path from current index to this breadcrumb
                rel_to_crumb = Path(os.path.relpath(wiki_dir / part_path, index_location))
                breadcrumbs.append({
                    'name': parts[i],
                    'href': (rel_to_crumb / 'index.html').as_posix(),
                })

        # Scan for HTML files in the current directory only (not nested)
        current_wiki_dir = wiki_dir / current_dir
        html_files = [f for f in current_wiki_dir.glob("*.html") if f.name != "index.html"]
        
        # Find immediate subdirectories that have content
        subdirs = []
        for subdir in sorted(current_wiki_dir.iterdir()):
            if subdir.is_dir():
                # Check if this subdir has any HTML files (recursively)
                has_content = any(subdir.rglob("*.html"))
                if has_content:
                    subdir_name = subdir.name
                    subdirs.append({
                        'name': subdir_name,
                        'href': quote(subdir_name, safe='') + '/index.html',
                    })
        
        # Build entries from the HTML files in current directory
        template_entries = []
        for html_file in sorted(html_files, key=lambda f: f.name):
            html_rel_path = html_file.relative_to(wiki_dir)
            # Corresponding notebook path
            nb_rel_path = html_rel_path.with_suffix('.ipynb')
            notebook_path = files_dir / nb_rel_path
            
            # Extract title from notebook if it exists
            title = nb_rel_path.stem.replace('-', ' ').replace('_', ' ').title()
            if notebook_path.exists():
                try:
                    with open(notebook_path, 'r', encoding='utf-8') as f:
                        nb = nbformat.read(f, as_version=4)
                    title = self._extract_notebook_title(nb, notebook_path)
                except Exception:
                    pass
            
            # For display, just show the filename (not full path)
            rel_display = html.escape(html_file.stem)
            html_href = quote(html_file.name, safe='')
            rel_path_url = quote(nb_rel_path.as_posix(), safe='/')
            static_output = html_file.relative_to(output_dir)
            static_href = '/' + quote(static_output.as_posix(), safe='/')
            title_attr = html.escape(title)

            template_entries.append({
                'html_href': html_href,
                'edit_href': f"/notebooks/index.html?path={rel_path_url}",
                'lab_href': f"/lab/index.html?path={rel_path_url}",
                'download_href': f"/files/{rel_path_url}",
                'static_href': static_href,
                'title_attr': title_attr,
                'rel_display': rel_display,
            })

        # Load and render Jinja2 template
        env = Environment(
            loader=FileSystemLoader(str(self._template_dir)),
            autoescape=True,
        )
        template = env.get_template("wiki_index.html.j2")
        
        # Generate title based on current directory
        if current_dir == Path('.'):
            toolbar_title = "Wiki3.ai index"
            page_title = "Wiki Index"
        else:
            toolbar_title = current_dir.name
            page_title = f"Wiki Index - {current_dir.name}"

        index_html = template.render(
            title=page_title,
            toolbar_title=toolbar_title,
            light_css=light_css,
            dark_css=dark_css,
            entries=template_entries,
            subdirs=subdirs,
            breadcrumbs=breadcrumbs,
            wiki_root=wiki_root,
            behavior_script_url="/static/wiki_behavior.js",
        )

        index_file = index_location / "index.html"
        index_file.parent.mkdir(parents=True, exist_ok=True)
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(index_html)
        
        print(f"[WikiPageAddon] Generated index page: {index_file}")

    def _extract_notebook_title(self, nb, notebook_path):
        """Best effort to pull a title from the notebook."""
        try:
            for cell in nb.cells:
                if cell.get('cell_type') != 'markdown':
                    continue
                source = cell.get('source') or ''
                lines = [line.strip() for line in source.splitlines() if line.strip()]
                for line in lines:
                    if line.startswith('#'):
                        return line.lstrip('#').strip()
            return notebook_path.stem.replace('-', ' ').replace('_', ' ').title()
        except Exception:
            return notebook_path.stem
