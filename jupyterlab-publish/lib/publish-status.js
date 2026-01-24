/**
 * Publish status dialog showing progress
 */
export class PublishStatus {
    constructor(stepLabels, publishUrl) {
        this.dialog = null;
        this.steps = [];
        this.steps = stepLabels.map(label => ({
            label,
            status: 'pending'
        }));
        this.publishUrl = publishUrl;
    }
    /**
     * Show the status dialog
     */
    show() {
        this.createDialog();
        this.dialog?.showModal();
    }
    createDialog() {
        this.dialog?.remove();
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'wiki3-dialog wiki3-publish-status';
        this.updateDialogContent();
        document.body.appendChild(this.dialog);
        // Prevent closing while in progress
        this.dialog.addEventListener('cancel', (e) => {
            const hasError = this.steps.some(s => s.status === 'error');
            const isComplete = this.steps.every(s => s.status === 'complete');
            if (!hasError && !isComplete) {
                e.preventDefault();
            }
        });
    }
    updateDialogContent() {
        if (!this.dialog)
            return;
        const hasError = this.steps.some(s => s.status === 'error');
        const isComplete = this.steps.every(s => s.status === 'complete');
        const currentStep = this.steps.findIndex(s => s.status === 'running' || s.status === 'pending');
        const stepsHtml = this.steps.map((step, _i) => `
      <div class="wiki3-step wiki3-step-${step.status}">
        <span class="wiki3-step-icon">
          ${step.status === 'complete' ? '✓' : ''}
          ${step.status === 'running' ? '⟳' : ''}
          ${step.status === 'error' ? '✗' : ''}
          ${step.status === 'pending' ? '○' : ''}
        </span>
        <span class="wiki3-step-label">${step.label}</span>
        ${step.error ? `<span class="wiki3-step-error">${step.error}</span>` : ''}
      </div>
    `).join('');
        let statusHtml = '';
        if (isComplete && !hasError) {
            statusHtml = `
        <div class="wiki3-success-box">
          <h3>✓ Notebook published successfully!</h3>
          <p>Your site will be ready in 1-2 minutes as GitHub Actions runs the publish workflow.</p>
          <a href="${this.publishUrl}" target="_blank" rel="noopener noreferrer" class="wiki3-publish-link">
            View published site →
          </a>
        </div>
      `;
        }
        else if (hasError) {
            const errorStep = this.steps.find(s => s.status === 'error');
            statusHtml = `
        <div class="wiki3-error-box">
          <h3>✗ Publication failed</h3>
          <p>${errorStep?.error || 'An error occurred during publishing.'}</p>
        </div>
      `;
        }
        else {
            statusHtml = `
        <p class="wiki3-status-message">
          Publishing... (step ${currentStep + 1} of ${this.steps.length})
        </p>
      `;
        }
        this.dialog.innerHTML = `
      <div class="wiki3-dialog-content">
        <h2 class="wiki3-dialog-title">Publishing Notebook</h2>
        
        <div class="wiki3-steps-container">
          ${stepsHtml}
        </div>

        ${statusHtml}

        <div class="wiki3-dialog-buttons">
          <button type="button" id="wiki3-status-close" class="wiki3-primary-button" 
                  ${!isComplete && !hasError ? 'disabled' : ''}>
            ${isComplete ? 'Done' : hasError ? 'Close' : 'Publishing...'}
          </button>
        </div>
      </div>
    `;
        // Add close handler
        const closeBtn = this.dialog.querySelector('#wiki3-status-close');
        closeBtn?.addEventListener('click', () => {
            this.close();
        });
    }
    /**
     * Mark a step as running
     */
    markStepRunning(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].status = 'running';
            this.updateDialogContent();
        }
    }
    /**
     * Mark a step as complete
     */
    markStepComplete(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].status = 'complete';
            this.updateDialogContent();
        }
    }
    /**
     * Mark a step as error
     */
    markStepError(index, error) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].status = 'error';
            this.steps[index].error = error;
            this.updateDialogContent();
        }
    }
    /**
     * Close the dialog
     */
    close() {
        this.dialog?.close();
        this.dialog?.remove();
        this.dialog = null;
    }
}
//# sourceMappingURL=publish-status.js.map