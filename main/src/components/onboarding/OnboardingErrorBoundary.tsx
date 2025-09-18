// src/components/onboarding/OnboardingErrorBoundary.tsx
"use client";

import React, { Component, ReactNode } from "react";
import { ErrorManager } from "@/lib/onboarding/errorManager";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary for catching unexpected JavaScript errors in onboarding flow
 */
export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Onboarding Error Boundary caught an error:', error, errorInfo);
    
    // Show our custom error modal instead of the default error boundary UI
    const errorManager = ErrorManager.getInstance();
    errorManager.handleUnexpectedError(error);
    
    // Reset the error state so the modal can be shown
    this.setState({ hasError: false });
  }

  render() {
    // Don't render fallback UI since we're showing a modal instead
    return this.props.children;
  }
}

export default OnboardingErrorBoundary;
