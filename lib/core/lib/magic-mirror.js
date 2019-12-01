/**
 * This component implements the MagicMirror
 */

import React, {useReducer} from 'react';
import nanoid from 'nanoid';
import {TransitionGroup} from 'react-transition-group';
import {MMProvider} from './useMM';
import useRegions from './useRegions';

const MMReducer = (modules = [], {type, ...payload}) => {
  switch (type) {
    // TODO
    default:
      return modules;
  }
};

const MMInit = () => {
  return config.modules.map(({module, position, classes, header, disabled, config}, i) => {
    if (imports[module]) {
      if (!disabled) {
        return {
          hidden: false,
          speed: 1000,
          identifier: `MM${nanoid(10)}`, // unique identifier for each module
          component: imports[module],
          name: module,
          position,
          classes,
          header,
          config
        };
      }
    } else {
      throw new Error(`Module ${module} does not seem to be installed.`);
    }
  });
};

const MagicMirror = ({m, children, ...config}) => {
  // config is only initial arg, changing props doesn't do anything
  const [modules, dispatch] = useReducer(MMReducer, config, MMInit);
  return (
    <MMProvider dispatch={dispatch}>
      <MMLayout modules={modules}/>
    </MMProvider>
  );
};


const MMLayout = ({modules}) => {
  const {
    fullscreen_below, top_bar, top_left, top_center, top_right, upper_third, middle_center,
    lower_third, bottom_bar, bottom_left, bottom_center, bottom_right, fullscreen_above
  } = useRegions(modules);

  return (
    <>
      <div className="region fullscreen below">
        <TransitionGroup className="container">{fullscreen_below}</TransitionGroup>
      </div>
      <div className="region top bar">
        <TransitionGroup className="container">{top_bar}</TransitionGroup>
        <div className="region top left">
          <TransitionGroup className="container">{top_left}</TransitionGroup>
        </div>
        <div className="region top center">
          <TransitionGroup className="container">{top_center}</TransitionGroup>
        </div>
        <div className="region top right">
          <TransitionGroup className="container">{top_right}</TransitionGroup>
        </div>
      </div>
      <div className="region upper third">
        <TransitionGroup className="container">{upper_third}</TransitionGroup>
      </div>
      <div className="region middle center">
        <TransitionGroup className="container">{middle_center}</TransitionGroup>
      </div>
      <div className="region lower third">
        <TransitionGroup className="container"><br/>{lower_third}</TransitionGroup>
      </div>
      <div className="region bottom bar">
        <TransitionGroup className="container">{bottom_bar}</TransitionGroup>
        <div className="region bottom left">
          <TransitionGroup className="container">{bottom_left}</TransitionGroup>
        </div>
        <div className="region bottom center">
          <TransitionGroup className="container">{bottom_center}</TransitionGroup>
        </div>
        <div className="region bottom right">
          <TransitionGroup className="container">{bottom_right}</TransitionGroup>
        </div>
      </div>
      <div className="region fullscreen above">
        <TransitionGroup className="container">{fullscreen_above}</TransitionGroup>
      </div>
    </>
  );
};

export default MagicMirror;