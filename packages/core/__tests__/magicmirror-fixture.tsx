/**
 * This file implements a subset of a real MagicMirror implementation for testing purposes.
 */

import React from "react";
import * as Core from "../src";

function MagicMirrorModule({
  _component,
  ...props
}: Core.InternalModuleConfig) {
  const Component = _component;
  return props.disabled ? null : (
    <Core.ModuleGuard name={Component.name}>
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
    </Core.ModuleGuard>
  );
}

function MagicMirrorFixture({ initialConfig }: { initialConfig: Core.Config }) {
  // initialConfig is only initial arg, the component will copy it and manage the copy
  Core.useInitializeConfig(() => Core.initializeConfigClient(initialConfig));
  const config = Core.useCurrentConfig();

  return (
    <React.StrictMode>
      <Core.ModuleLayout>
        {config.modules.map((m) => (
          <MagicMirrorModule {...m} key={m.identifier} />
        ))}
      </Core.ModuleLayout>
    </React.StrictMode>
  );
}

export default MagicMirrorFixture;
