export class ModelHelper {
  static getPath(collectionPath: string, pathIds: Array<string> = [], docId?: string): string {
    if (pathIds === null) {
      pathIds = [];
    }

    if (collectionPath.length <= 0) {
      throw new Error('collectionPath must be defined');
    }

    const collectionPathSplitted = collectionPath.split('?');
    if (pathIds.length < collectionPathSplitted.length - 1) {
      throw new Error('some collectionIds missing !!!!');
    }

    let path: string;
    if (collectionPathSplitted.length > 1) {
      path = '';
      collectionPathSplitted.forEach((subPath: string, index: number) => {
        path += subPath;
        if (index < collectionPathSplitted.length - 1) {
          path += pathIds[index];
        }
      });
    } else {
      path = collectionPath;
    }

    if (docId) {
      path += '/' + docId;
    }

    return path;
  }
}
