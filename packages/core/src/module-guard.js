import React from 'react';

// Error boundary for nice presentation of errors
export default class ModuleGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, errorInfo: ''};
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return {hasError: true};
  }

  componentDidCatch(error, errorInfo) {
    console.log(`Whoops! There was an uncaught exception in module ${this.props.name}`);
    console.error(error, errorInfo);
    console.log('MagicMirror will not quit, but it might be a good idea to check why this happened.');
    console.log(`If you think this really is an issue, please open an issue on ${this.props.name}'s GitHub page.`);
    this.setState({errorInfo});
  }

  render() {
    if (this.state.hasError) {
      if (process.env.NODE_ENV !== 'production') {
        return (
          <div>
            <h4>{`Something went wrong in module ${this.props.name}.`}</h4>
            {this.state.errorInfo && <pre>{this.state.errorInfo}</pre>}
          </div>
        );
      } else {
        return null; // don't display error'ed module in production
      }
    } else {
      return <>{this.props.children}</>;
    }
  }
}