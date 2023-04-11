/**
 * This module is dead code. It was used to execute the transform operations in a topological order, but this is actually not necessary
 * becuase each stage of the transformation process is independent and CDK will handle catching circular dependencies for us.
 *
 * Catching circular dependencies at this level is actually incorrect because there can be a "circular dependency" at the level of amplfiy project config
 * that does not actually translate to a circular dependency in the underlying resources.
 *
 * For example, a storage resource that triggers a function on updates and that function writes back to the storage resource.
 * At the "amplify" level, this looks like a circular dependency, but actually we can set up an SQS queue under the hood for change events that the lambda can poll
 * This "breaks" the circular dependency at the resource level
 */

type AdjList = Record<string, Array<string>>;
export type NodeVisitor = (node: string) => void;

export const getDagWalker = (dag: AdjList) => (visitor: NodeVisitor) => recursiveDriver(dag, visitor);

/**
 * Executes visitor on each node in the DAG in dependency order using a recursive function
 */
const recursiveDriver = (dag: AdjList, visitor: NodeVisitor) => {
  const invertedDag = invertDag(dag);
  const { roots, inDegMap } = preProcessDag(invertedDag);
  const visit = (node: string) => {
    visitor(node);
    const dependents = invertedDag[node];
    dependents.map((dep) => {
      inDegMap[dep]--;
      if (inDegMap[dep] === 0) {
        // all of the dependencies for dep have been visited so we can now visit it
        visit(dep);
      }
    });
  };
  roots.map((root) => visit(root));
};

/**
 * Processes a DAG represented as an adjacency list into the roots and the in-degrees of all nodes
 */
const preProcessDag = (dag: AdjList): { roots: string[]; inDegMap: Record<string, number> } => {
  const rootCandidates = new Set(Object.keys(dag));
  const inDegMap: Record<string, number> = {};
  Object.keys(dag).forEach((key) => (inDegMap[key] = 0));

  Object.values(dag)
    .flat()
    .map((node) => {
      rootCandidates.delete(node);
      inDegMap[node]++;
    });
  return {
    roots: Array.from(rootCandidates),
    inDegMap,
  };
};

/**
 * Inverting the DAG is necessary because the build order of a dependency graph is the reverse of the dependency pointers
 */
const invertDag = (dag: AdjList): AdjList => {
  const { roots } = preProcessDag(dag);
  const queue: string[] = [];
  queue.push(...roots);
  const inverted: AdjList = {};
  const seen: Set<string> = new Set();
  roots.forEach((root) => seen.add(root));
  Object.keys(dag).forEach((key) => (inverted[key] = []));
  while (queue.length > 0) {
    const node = queue.shift()!;
    dag[node].forEach((child) => {
      inverted[child].push(node);
      if (!seen.has(child)) {
        queue.push(child);
        seen.add(child);
      }
    });
  }
  return inverted;
};
// copying this for posterity but not needed anymore

// constructs a function that can take in a visitor function and execute that visitor on all nodes in the DAG in depenency order
// this.dagWalker = getDagWalker(generateResourceDAG(this.componentMap));

// const generateResourceDAG = (resourceDefiniton: ResourceRecord): ResourceDAG => {
//   const resourceSet = new Set<string>(Object.keys(resourceDefiniton));
//   const resourceDag: Record<string, string[]> = {};
//   resourceSet.forEach((resourceName) => (resourceDag[resourceName] = []));

//   Object.entries(resourceDefiniton).forEach(([resourceName, resourceDefiniton]) => {
//     if (resourceDefiniton.runtimeAccess) {
//       Object.values(resourceDefiniton.runtimeAccess).forEach((runtimeResourceAccess) => {
//         Object.keys(runtimeResourceAccess).forEach((resourceToken) => {
//           if (resourceToken === '$external') {
//             return;
//           }
//           if (!resourceSet.has(resourceToken)) {
//             throw new Error(`${resourceName} declares a dependency on ${resourceToken} but ${resourceToken} is not defined in the project config`);
//           }
//           resourceDag[resourceName]!.push(resourceToken);
//         });
//       });
//     }
//   });
//   return resourceDag;
// };
