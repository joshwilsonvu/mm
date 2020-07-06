import React from "react";

type State = { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo };
type Props = React.PropsWithChildren<{ name: string }>;

// Error boundary for nice presentation of errors
export class ModuleGuard extends React.Component<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`
    Whoops! There was an uncaught exception in module ${this.props.name}:

    ${error}

    MagicMirror will not quit, but it might be a good idea to check why this happened.
    If you think this really is an issue, please open an issue on ${this.props.name}'s GitHub page.`);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (process.env.NODE_ENV !== "production") {
        return (
          <div>
            <h4>{`Something went wrong in module ${this.props.name}.`}</h4>
            {this.state.error && <pre>{this.state.error.toString()}</pre>}
            {this.state.errorInfo && <pre>{this.state.errorInfo}</pre>}
          </div>
        );
      } else {
        return null; // don't display error'ed module in production
      }
    } else {
      return (
        // Suspense lets each module load independently, so one module with
        // many dependencies doesn't affect another module's loading time
        <React.Suspense fallback={<div>...</div>}>
          {this.props.children}
        </React.Suspense>
      );
    }
  }
}
