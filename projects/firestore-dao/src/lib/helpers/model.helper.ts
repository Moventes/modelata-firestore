export class ModelHelper {
  /**
   * creates an hidden property in the given object
   * @param obj the object to create the attribute on
   * @param propName the name of the property
   * @param propVal the value of the property
   */
  static getPath(pathsp: Array<string> | string, idsp: Array<string> | string = [], withId: boolean = false): string {
    let paths;
    if (typeof pathsp === 'string') {
      paths = [pathsp];
    } else {
      paths = pathsp;
    }
    let ids;
    if (typeof idsp === 'string') {
      ids = [idsp];
    } else {
      ids = idsp;
    }
    if (paths.length <= 0) {
      throw new Error('paths must be defined');
    }
    if (paths.length > (withId ? ids.length : ids.length + 1)) {
      throw new Error('some ids missing !!!!');
    }

    return (
      '/' +
      paths
        .reduce((res, path, index) => {
          res.push(path);
          if (ids && index + 1 <= ids.length && (withId || (!withId && index + 1 < paths.length))) {
            res.push(ids[index]);
          }

          return res;
        }, [])
        .join('/')
    );
  }
}
