export function CollectionPath(path: string): any {
  return (target: Object) => {
    target['collectionPath'] = path;
  };
}
