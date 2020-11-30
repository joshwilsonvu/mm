/**
 * This file implements a subset of a real MagicMirror implementation for testing purposes.
 */

import React from "react";
import {
  ClientModuleConfig,
  ModuleGuard,
  Config,
  useInitializeConfig,
  initializeConfigClient,
  useCurrentConfig,
  ModuleLayout,
} from "..";

function MagicMirrorModule({ _component, ...props }: ClientModuleConfig) {
  const Component = _component;
  return props.disabled ? null : (
    <ModuleGuard name={Component.name}>
      <div
        className={["module", Component.name, ...(props.classes || [])].join(
          " "
        )}
        id={props.identifier}
      >
        {props.header && (
          <header className="module-header">{props.header}</header>
        )}
        <div className="module-content">
          <Component {...props} />
        </div>
      </div>
    </ModuleGuard>
  );
}

function MagicMirrorFixture({ initialConfig }: { initialConfig: Config }) {
  // initialConfig is only initial arg, the component will copy it and manage the copy
  useInitializeConfig(() => initializeConfigClient(initialConfig));
  const config = useCurrentConfig();

  return (
    <React.StrictMode>
      <ModuleLayout>
        {config.modules.map((m) => (
          <MagicMirrorModule {...m} key={m.identifier} />
        ))}
      </ModuleLayout>
    </React.StrictMode>
  );
}

export default MagicMirrorFixture;
