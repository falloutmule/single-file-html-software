import { evaluateDoorwayFormations } from './doorwayFormation.js';

export function evaluateFormations(state) {
  return Object.freeze([...evaluateDoorwayFormations(state)]);
}

