
# 7. ui/publish-status.tsx
publish_status_tsx = r"""import React, { useState } from 'react';
import { Dialog } from '@jupyterlab/apputils';
import '../styles.css';

interface PublishStatusProps {
  steps: string[];
  publishUrl: string | null;
  onClose: () => void;
}

/**
 * Modal showing publish progress
 */
export const PublishStatus = ({ steps, publishUrl, onClose }: PublishStatusProps) => {
  const [stepStates, setStepStates] = useState<('pending' | 'running' | 'complete' | 'error')[]>(
    steps.map(() => 'pending')
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const markStepComplete = (stepIndex: number) => {
    setStepStates(prev => {
      const next = [...prev];
      next[stepIndex] = 'complete';
      return next;
    });
    if (stepIndex + 1 >= steps.length) {
      setIsComplete(true);
    }
  };

  const markStepError = (stepIndex: number, error: string) => {
    setStepStates(prev => {
      const next = [...prev];
      next[stepIndex] = 'error';
      return next;
    });
  };

  const hasError = stepStates.includes('error');

  return (
    <Dialog
      title="Publishing Notebook"
      onCloseRequest={isComplete || hasError ? onClose : () => {}}
      buttons={[]}
    >
      <div className="wiki3-publish-status">
        <div className="steps-container">
          {steps.map((step, i) => (
            <div key={i} className={`step step-${stepStates[i]}`}>
              <span className="step-icon">
                {stepStates[i] === 'complete' && '✓'}
                {stepStates[i] === 'running' && '⟳'}
                {stepStates[i] === 'error' && '✗'}
                {stepStates[i] === 'pending' && '○'}
              </span>
              <span className="step-label">{step}</span>
            </div>
          ))}
        </div>

        {isComplete && !hasError && publishUrl && (
          <div className="success-box">
            <h3>✓ Notebook published successfully!</h3>
            <p>
              Your site will be ready in 1-2 minutes as GitHub Actions runs the publish workflow.
            </p>
            <a
              href={publishUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="publish-link"
            >
              View published site →
            </a>
          </div>
        )}

        {hasError && (
          <div className="error-box">
            <h3>✗ Publication failed</h3>
            <p>Check your GitHub repository Actions tab for details.</p>
            {publishUrl && (
              <a
                href={`${publishUrl}../actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="publish-link"
              >
                View workflow logs →
              </a>
            )}
          </div>
        )}

        {!isComplete && !hasError && (
          <p className="status-message">
            Publishing... (step {currentStep + 1} of {steps.length})
          </p>
        )}

        <div className="dialog-buttons">
          <button
            className="primary-button"
            onClick={onClose}
            disabled={!isComplete && !hasError}
          >
            {isComplete ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

/**
 * Wrapper class for Dialog integration
 */
export class PublishStatus extends Dialog<void> {
  private stepStates: ('pending' | 'running' | 'complete' | 'error')[] = [];
  private currentStepLabel = '';

  constructor(props: PublishStatusProps) {
    const body = document.createElement('div');
    body.className = 'wiki3-publish-status-body';

    super({
      title: 'Publishing Notebook',
      body: new Private.PublishStatusBody(body, props)
    });

    this.stepStates = props.steps.map(() => 'pending');
  }

  launch(): Promise<void> {
    return super.launch().then(() => {
      this.update();
    });
  }

  markStepComplete(stepIndex: number): void {
    this.stepStates[stepIndex] = 'complete';
    this.updateStepUI(stepIndex, 'complete');
  }

  markStepError(stepIndex: number, error: string): void {
    this.stepStates[stepIndex] = 'error';
    this.updateStepUI(stepIndex, 'error', error);
  }

  setComplete(publishUrl: string): void {
    const successBox = this.node.querySelector('.success-box') as HTMLElement;
    if (successBox) {
      successBox.innerHTML = `
        <h3>✓ Notebook published successfully!</h3>
        <p>Your site will be ready in 1-2 minutes as GitHub Actions runs.</p>
        <a href="${publishUrl}" target="_blank" rel="noopener noreferrer" class="publish-link">
          View published site →
        </a>
      `;
      successBox.style.display = 'block';
    }
  }

  getCurrentStep(): string {
    return this.currentStepLabel;
  }

  private updateStepUI(stepIndex: number, status: 'complete' | 'error', error?: string): void {
    const stepElements = this.node.querySelectorAll('.step');
    if (stepElements[stepIndex]) {
      const stepEl = stepElements[stepIndex] as HTMLElement;
      stepEl.className = `step step-${status}`;

      const iconEl = stepEl.querySelector('.step-icon') as HTMLElement;
      if (status === 'complete') {
        iconEl.textContent = '✓';
      } else if (status === 'error') {
        iconEl.textContent = '✗';
      }
    }
  }
}

namespace Private {
  export class PublishStatusBody extends Dialog.Body {
    constructor(host: HTMLElement, props: PublishStatusProps) {
      super(host);

      const stepsHtml = props.steps.map((step, i) => `
        <div class="step step-pending" data-step="${i}">
          <span class="step-icon">○</span>
          <span class="step-label">${step}</span>
        </div>
      `).join('');

      host.innerHTML = `
        <div style="padding: 20px; min-width: 400px;">
          <div class="steps-container">
            ${stepsHtml}
          </div>
          <div id="wiki3-success-box" style="margin-top: 20px; padding: 15px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; color: #0369a1; display: none;">
            <h3 style="margin: 0 0 10px 0;">✓ Published successfully!</h3>
            <p style="margin: 0 0 10px 0;">Your site will be ready in 1-2 minutes.</p>
            <a href="#" target="_blank" rel="noopener noreferrer" style="color: #0369a1;">View published site →</a>
          </div>
          <div id="wiki3-error-box" style="margin-top: 20px; padding: 15px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 4px; color: #991b1b; display: none;">
            <h3 style="margin: 0 0 10px 0;">✗ Publication failed</h3>
            <p style="margin: 0;">Check your GitHub Actions tab for details.</p>
          </div>
          <p id="wiki3-status-msg" style="margin-top: 15px; color: #666; font-size: 12px;">Publishing...</p>
        </div>
      `;
    }
  }
}
"""

with open('jupyterlab-wiki3-publish/src/ui/publish-status.tsx', 'w') as f:
    f.write(publish_status_tsx)

print("✓ Created publish-status.tsx")
