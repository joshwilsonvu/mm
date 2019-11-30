import {CSSTransition} from "react-transition-group";
import React, {useMemo} from "react";
import "./fade.css";

const getDefaultRegions = () => ({
  "top_bar": [],
  "top_left": [],
  "top_center": [],
  "top_right": [],
  "upper_third": [],
  "middle_center": [],
  "lower_third": [],
  "bottom_left": [],
  "bottom_center": [],
  "bottom_right": [],
  "bottom_bar": [],
  "fullscreen_above": [],
  "fullscreen_below": []
});

const useRegions = modules => {
  // Divide modules into the various regions by their .position property
  return useMemo(() => modules.reduce((regions, M) => {
    const { component: Component, speed, ...rest } = M;
    let timeout = typeof speed === "number" ? speed : 1000;
    // add CSSTransition here to apply key and make it a direct child of TransitionGroup
    regions[rest.position].push(
      <CSSTransition key={rest.identifier} in={!rest.hidden} classNames="fade" timeout={timeout} unmountOnExit>
        <Component {...rest} duration={timeout}/>
      </CSSTransition>
    );
    return regions;
  }, getDefaultRegions()), [modules]);
};

export default useRegions;