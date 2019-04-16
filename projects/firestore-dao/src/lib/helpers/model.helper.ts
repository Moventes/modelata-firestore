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

  static isCompatiblePath(collectionPath: string, docPath: string): boolean {
    if (collectionPath) {
      const docPathSplitted = docPath.split('/');
      const collectionPathSplitted = collectionPath.split('/');
      if (docPathSplitted[0] === '') {
        docPathSplitted.shift();
      }
      if (docPathSplitted[docPathSplitted.length - 1] === '') {
        docPathSplitted.pop();
      }
      if (collectionPathSplitted[0] === '') {
        collectionPathSplitted.shift();
      }
      if (collectionPathSplitted[collectionPathSplitted.length - 1] === '') {
        collectionPathSplitted.pop();
      }
      if (collectionPathSplitted.length < docPathSplitted.length - 1 || collectionPathSplitted.length > docPathSplitted.length) {
        return false;
      }
      return collectionPathSplitted.every((path, index) => {
        return docPathSplitted[index] && (path === '?' || docPathSplitted[index] === path);
      });
    } else {
      return false;
    }
  }
}
