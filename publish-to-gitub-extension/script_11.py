
# 8. styles.css
styles_css = """/* Wiki3.ai Publish Extension Styles */

.wiki3-token-dialog {
  padding: 20px;
  max-width: 500px;
}

.dialog-subtitle {
  margin: 0 0 15px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #666;
}

.token-options {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin: 15px 0;
}

.token-label {
  margin: 0 0 8px 0;
  font-size: 13px;
}

.token-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.token-list li {
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.inline-code {
  background: #e8e8e8;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.token-input {
  width: 100%;
  padding: 10px;
  margin: 15px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  box-sizing: border-box;
}

.token-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.token-input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
}

.token-note {
  margin: 15px 0 0 0;
  font-size: 12px;
  color: #999;
}

.error-message {
  color: #ef4444;
  background: #fef2f2;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 13px;
}

.dialog-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.primary-button {
  flex: 1;
  padding: 10px 16px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.primary-button:hover:not(:disabled) {
  background: #0284c7;
}

.primary-button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.secondary-button {
  flex: 1;
  padding: 10px 16px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.secondary-button:hover:not(:disabled) {
  background: #e2e8f0;
}

.secondary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Repository Selector */

.wiki3-repo-selector {
  padding: 20px;
  min-width: 450px;
}

.repo-mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
}

.mode-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab:hover {
  color: #334155;
}

.mode-tab.active {
  color: #0ea5e9;
  border-bottom-color: #0ea5e9;
}

.mode-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.repo-select-mode,
.repo-create-mode {
  margin-top: 20px;
}

.mode-label {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.loading-message {
  color: #666;
  font-size: 13px;
  padding: 10px 0;
}

.no-repos-message {
  color: #999;
  font-size: 13px;
  padding: 10px 0;
  font-style: italic;
}

.repo-select {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.repo-select:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.repo-name-input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.repo-name-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.repo-name-input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
}

.repo-name-note {
  font-size: 12px;
  color: #999;
  margin: 8px 0 15px 0;
}

/* Publish Status */

.wiki3-publish-status {
  padding: 20px;
  min-width: 450px;
}

.steps-container {
  margin: 20px 0;
}

.step {
  display: flex;
  align-items: center;
  padding: 10px 0;
  font-size: 14px;
  transition: all 0.2s;
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  font-weight: bold;
  border-radius: 50%;
  flex-shrink: 0;
}

.step-pending .step-icon {
  color: #cbd5e1;
  border: 2px solid #cbd5e1;
}

.step-running .step-icon {
  color: #0ea5e9;
  border: 2px solid #0ea5e9;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-complete .step-icon {
  color: white;
  background: #10b981;
  border: 2px solid #10b981;
}

.step-error .step-icon {
  color: white;
  background: #ef4444;
  border: 2px solid #ef4444;
}

.step-label {
  flex: 1;
}

.step-pending .step-label {
  color: #cbd5e1;
}

.step-running .step-label {
  color: #0ea5e9;
  font-weight: 500;
}

.step-complete .step-label {
  color: #10b981;
}

.step-error .step-label {
  color: #ef4444;
}

.success-box {
  margin-top: 20px;
  padding: 15px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 4px;
  color: #166534;
}

.success-box h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.success-box p {
  margin: 0 0 10px 0;
  font-size: 13px;
  line-height: 1.4;
}

.error-box {
  margin-top: 20px;
  padding: 15px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #991b1b;
}

.error-box h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.error-box p {
  margin: 0 0 10px 0;
  font-size: 13px;
  line-height: 1.4;
}

.publish-link {
  color: #0ea5e9;
  text-decoration: none;
  font-weight: 500;
}

.publish-link:hover {
  text-decoration: underline;
}

.status-message {
  margin-top: 15px;
  color: #666;
  font-size: 12px;
  text-align: center;
}
"""

with open('jupyterlab-wiki3-publish/src/styles.css', 'w') as f:
    f.write(styles_css)

print("✓ Created styles.css")
