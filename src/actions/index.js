// @flow @format
import actions from './actionTypes';
import { toInt } from '../styleHelpers';

import type { CRDP$NodeId } from 'devtools-typed/domain/DOM';
import type {
  ComputeDependenciesAction,
  SetInspectionRootAction,
  ToggleSelectNodeAction,
  PruneNodeAction,
  HighlightNodeAction,
  ClearHighlightAction,
  RequestStyleForNodeAction,
  ToggleCSSPropertyAction,
} from './types';

export function setInspectionRoot(
  nodeId: CRDP$NodeId,
): SetInspectionRootAction {
  return {
    type: actions.SET_INSPECTION_ROOT,
    data: { nodeId: toInt(nodeId) },
  };
}

export function toggleSelectNode(nodeId: CRDP$NodeId): ToggleSelectNodeAction {
  return {
    type: actions.TOGGLE_SELECT_NODE,
    data: { nodeId: toInt(nodeId) },
  };
}

export function pruneNode(nodeId: CRDP$NodeId): PruneNodeAction {
  return {
    type: actions.PRUNE_NODE,
    data: { nodeId: toInt(nodeId) },
  };
}

export function highlightNode(
  nodeId: CRDP$NodeId,
  selectorList?: string,
): HighlightNodeAction {
  return {
    type: actions.HIGHLIGHT_NODE,
    data: { nodeId: toInt(nodeId), selectorList },
  };
}

export function clearHighlight(): ClearHighlightAction {
  return {
    type: actions.CLEAR_HIGHLIGHT,
  };
}

export function requestStyleForNode(
  nodeId: CRDP$NodeId,
): RequestStyleForNodeAction {
  return {
    type: actions.REQUEST_STYLE_FOR_NODE,
    data: { nodeId: toInt(nodeId) },
  };
}

export function toggleCSSProperty(
  nodeId: CRDP$NodeId,
  ruleIndex: number,
  propertyIndex: number,
): ToggleCSSPropertyAction {
  return {
    type: actions.TOGGLE_CSS_PROPERTY,
    data: {
      nodeId: toInt(nodeId),
      ruleIndex,
      propertyIndex,
    },
  };
}

export function computeDependencies(
  nodeId: CRDP$NodeId,
  ruleIndex: number,
  propertyIndex: number,
): ComputeDependenciesAction {
  return {
    type: actions.COMPUTE_DEPENDENCIES,
    data: {
      nodeId: toInt(nodeId),
      ruleIndex,
      propertyIndex,
    },
  };
}
