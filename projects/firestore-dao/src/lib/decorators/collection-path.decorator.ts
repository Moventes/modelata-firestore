export function CollectionPath(path: string): any {
  return (target: any) => {
    target.prototype['collectionPath'] = path;
  };
}
