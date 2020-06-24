import React from "react";
import { ModulePosition, modulePositions } from "../types";

export function ModuleLayout({ children }: React.PropsWithChildren<{}>) {
  // take an array of JSX
  //   <MMLayout><Child1 position="top_bar"/><Child2 position="bottom_left"/></MMLayout>
  // and slice it based on position
  const regions = React.useMemo(() => {
    const regions = makeRegions<React.ReactNode>();
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const position = (child.props.position ||
          "none") as keyof typeof regions;
        if (regions.hasOwnProperty(position)) {
          regions[position].push(child);
        } else {
          throw new Error(
            `React element ${child} has an incorrect "position" prop ${position}.`
          );
        }
      }
    });
    return regions;
  }, [children]);
  const {
    none,
    fullscreen_below,
    top_bar,
    top_left,
    top_center,
    top_right,
    upper_third,
    middle_center,
    lower_third,
    bottom_bar,
    bottom_left,
    bottom_center,
    bottom_right,
    fullscreen_above,
  } = regions;

  return (
    <>
      <div style={{ display: "none" }}>{none}</div>
      <div className="region fullscreen below">{fullscreen_below}</div>
      <div className="region top bar">
        {top_bar}
        <div className="region top left">{top_left}</div>
        <div className="region top center">{top_center}</div>
        <div className="region top right">{top_right}</div>
      </div>
      <div className="region upper third">{upper_third}</div>
      <div className="region middle center">{middle_center}</div>
      <div className="region lower third">
        <br />
        {lower_third}
      </div>
      <div className="region bottom bar">
        {bottom_bar}
        <div className="region bottom left">{bottom_left}</div>
        <div className="region bottom center">{bottom_center}</div>
        <div className="region bottom right">{bottom_right}</div>
      </div>
      <div className="region fullscreen above">{fullscreen_above}</div>
    </>
  );
}

function makeRegions<T>() {
  // Create a new object with keys from modulePositions and empty arrays as values
  let regionsPartial: Partial<Record<ModulePosition, T[]>> = {};
  let regions: Record<ModulePosition, T[]> = modulePositions.reduce(
    (obj, region) => {
      obj[region] = [];
      return obj;
    },
    regionsPartial
  ) as Record<ModulePosition, T[]>;
  return regions;
}
