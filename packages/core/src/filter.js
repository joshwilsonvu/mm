import React from "react";
import pick from "object.pick";

export function filterModuleForState(mod) {
  return pick(mod, ["hidden", "identifier", "Component", "path", "name", "position", "classes", "header", "config", "file"]);
}

export function filterStateForCompat(state) {
  let obj = pick(state, ["hidden, identifier", "config"]);
  obj.data = pick(state, ["classes", "file", "path", "header", "position"]);
  return obj;
}

export function bakeMM2Component(state, Component) {
  const identifier = state["identifier"];
  const { file, path, position } = state.data;
  return React.memo(props => (
    <Component identifier={identifier} data={{...props.data, file, path, position}} />
  ));
}