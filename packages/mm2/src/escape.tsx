import { createElement, useRef, useLayoutEffect } from "react";

// An escape hatch from React. Pass the dom prop to imperatively add HTMLElements.
export default function Escape({ dom, children: _, ...rest }: { dom: HTMLElement | Falsy, [k: string]: any }) {
  const divRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const div = divRef.current;
    if (div && dom) {
      div.appendChild(dom);
      return () => {
        div.removeChild(dom);
      }
    }
  }, [dom]);
  return createElement("div", { ...rest, ref: divRef });
}


type Falsy = undefined | null | false;
