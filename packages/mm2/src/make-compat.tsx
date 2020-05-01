import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactChildren } from "react";
import useConstant from "use-constant";
import { Module, MMGlobal } from "./module";
import { useNotification } from "@mm/utils";

function makeCompat(MM2: typeof Module, name: string, globalConfig: object) {
  // access an instance of the MM2 class
  function useMM2Instance({ hidden, identifier, classes, header, position, config, path, file }: (ModuleProps & ConstructorParameters<typeof Module>[0]), MM: MMGlobal) {
    // runs only once
    return useConstant(() => {
      const mm2 = new MM2({ name, identifier, classes, header, position, config, path, file, translator: (template: string) => "", MM })
      // Set the module data and combine config with the module defaults.
      console.log(mm2.data);
      return mm2;
    });
  };

  // Create a React component wrapping the given subclass
  function Compat(props: ModuleProps) {
    const { identifier, hidden, classes, header, MM } = props;

    const mm2 = useMM2Instance(props, MM);

    const [dom, setDom] = useState<HTMLElement | null | undefined>(null);
    const updateDom = useCallback(async () => {
      const d = await mm2.getDom();
      if (d && !isElement(d)) {
        throw new Error(`Return value of getDom() is not an HTML element: ${d}`);
      } else {
        setDom(d);
      }
    }, [mm2]);

    // Set data, initialize, and start on mount
    useEffect(() => {
      //mm2.loaded && mm2.loaded(() => null); // no longer required to call callback
      mm2.init();
      updateDom();
    }, [mm2, updateDom]);
    useNotification("ALL_MODULES_LOADED", () => mm2.start());
    useNotification("UPDATE_DOM", () => updateDom, identifier);
    useEffect(() => {
      mm2.hidden = hidden;
    });

    return (
      <div id={identifier} className={classes.join(" ")}>
        {typeof header !== "undefined" && header !== "" && (
          <header className="module-header" dangerouslySetInnerHTML={{ __html: header}} />
        )}
        <Escape className="module-content" dom={dom} />
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


function useLayoutPrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

// An escape hatch from React. Pass the dom prop to imperatively add HTMLElements.
function Escape({ dom, children: _, ...rest }: { dom: HTMLElement | Falsy, [k: string]: any }) {
  const div = useRef<HTMLDivElement>(null);
  const oldDom = useLayoutPrevious(dom);
  // add/replace/remove dom content
  useLayoutEffect(() => replace(div.current, oldDom, dom), [dom, oldDom]);
  // cleanup on unmount
  useLayoutEffect(() => () => void (div.current && replace(div.current, div.current.firstChild as HTMLElement, null)), []);
  return (<div {...rest} ref={div} />);
}

function replace(parent: HTMLElement | null, oldDom: HTMLElement | Falsy, newDom: HTMLElement | Falsy) {
  if (parent) {
    if (oldDom && newDom) {
      parent.replaceChild(newDom, oldDom);
    } else if (newDom && !oldDom) {
      parent.appendChild(newDom);
    } else if (!newDom && oldDom) {
      parent.removeChild(oldDom);
    } // else do nothing
  }
}

// Returns true if it is a DOM element
function isElement(o: any): o is HTMLElement {
  return (
    typeof HTMLElement === "object"
      ? o instanceof HTMLElement
      : o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string"
  );
}

export default makeCompat;


interface ModuleProps {
  name: string,
  hidden: boolean,
  identifier: string,
  config: object,
  classes: string[],
  file: string,
  path: string,
  header: string,
  position: string,
  translator: {
    (template: string, variables?: object): string;
  },
  MM: MMGlobal,
}

type Falsy = undefined | null | false | "" | 0;
