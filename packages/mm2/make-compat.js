import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import useConstant from "./node_modules/use-constant";
import { useMM2, ModuleGuard } from "./node_modules/@mm/core";
import semver from "semver";
import { useSubscribe } from "./node_modules/@mm/core/use-subscribe";

const makeCompat = (MM2, name, globalConfig) => {
  // access an instance of the MM2 class
  const useMM2Instance = ({ hidden, identifier, classes, header, position, config, path, file }, MM) => {
    // runs only once
    return useConstant(() => {
      const mm2 = new MM2();
      // Set the module data and combine config with the module defaults.
      Object.assign(mm2, {
        hidden,
        identifier: identifier || '',
        name: name || '',
        config: { ...mm2.defaults, ...config },
        data: { classes, file, path, header, position },
        MM
      });
      console.log(mm2.data);
      if (mm2.requiresVersion && globalConfig.version && !semver.gt(mm2.requiresVersion, globalConfig.version)) {
        throw new Error(
          `Module ${name} requires MM version ${mm2.requiresVersion}, running ${globalConfig.version}`
        );
      }
      return mm2;
    });
  };

  // Create a React component wrapping the given subclass
  function Compat(props) {
    const { identifier, hidden, classes, header } = props;

    const MM = useMM2(identifier);
    const mm2 = useMM2Instance(props, MM);

    const [dom, setDom] = useState(null);
    const updateDom = useCallback(async () => {
      const d = await mm2.getDom();
      if (d && !isElement(d)) {
        throw new Error(`Return value of getDom() is not an HTML element: ${d}`);
      }
      setDom(d);
    }, [mm2]);

    // Set data, initialize, and start on mount
    useEffect(() => {
      mm2.loaded && mm2.loaded(() => null); // no longer required to call callback
      mm2.init();
      updateDom();
    }, [mm2, updateDom]);
    useSubscribe("ALL_MODULES_LOADED", () => mm2.start());
    useSubscribe("UPDATE_DOM", () => updateDom, identifier);
    useEffect(() => {
      mm2.hidden = hidden;
    });

    return (
      <div
        id={identifier}
        className={classes}
      >
        {typeof header !== "undefined" && header !== "" && (
          <header className="module-header" dangerouslySetInnerHTML={header} />
        )}
        <ModuleGuard name={name}>
          <Escape
            className="module-content"
            dom={dom}
          />
        </ModuleGuard>
      </div>
    );
  }

  // Assign correct .name property to make development easier
  Object.defineProperty(Compat, "name", {
    value: name,
    configurable: true
  });

  return Compat;
};


const useLayoutPrevious = value => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

// An escape hatch from React. Pass the dom prop to imperatively add HTMLElements.
function Escape({ dom, children }) {
  const div = useRef(null);
  const oldDom = useLayoutPrevious(dom);
  // add/replace/remove dom content
  useLayoutEffect(() => replace(div.current, oldDom, dom), [dom, oldDom]);
  // cleanup on unmount
  useLayoutEffect(() => () => replace(div.current, div.current.firstChild, null), []);
  return (<div ref={div} />);
}

function replace(parent, oldDom, newDom) {
  if (oldDom && newDom) {
    parent.replaceChild(newDom, oldDom);
  } else if (newDom && !oldDom) {
    parent.appendChild(newDom);
  } else if (!newDom && oldDom) {
    parent.removeChild(oldDom);
  } // else do nothing
}

// Returns true if it is a DOM element
function isElement(o) {
  return (
    typeof HTMLElement === "object"
      ? o instanceof HTMLElement
      : o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string"
  );
}

export default makeCompat;
