type AdjList = Record<string, Array<string>>;
export type NodeVisitor = (node: string) => void;

export const getDagWalker = (dag: AdjList) => (visitor: NodeVisitor) =>
  recursiveDriver(dag, visitor);

/**
 * Executes visitor on each node in the DAG in dependency order using an async recursive function
 */
const recursiveDriver = (dag: AdjList, visitor: NodeVisitor) => {
  const invertedDag = invertDag(dag);
  const { roots, inDegMap } = preProcessDag(invertedDag);
  const visit = (node: string) => {
    visitor(node);
    const dependents = invertedDag[node];
    Promise.all(
      dependents.map((dep) => {
        inDegMap[dep]--;
        if (inDegMap[dep] === 0) {
          // all of the dependencies for dep have been visited so we can visit it
          visit(dep);
        }
      })
    );
  };
  roots.map((root) => visit(root));
};

/**
 * Processes a DAG represented as an adjacency list into the roots and the in-degrees of all nodes
 */
const preProcessDag = (
  dag: AdjList
): { roots: string[]; inDegMap: Record<string, number> } => {
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
