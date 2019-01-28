import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Enumerable } from '../decorators/enumerable.decorator';
import { MissingFieldNotifier } from '../helpers/missing-field-notifier';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';

/**
 * Abstract Model class
 */
export abstract class AbstractModel {
  @Enumerable(false)
  public _id: string;

  @Enumerable(false)
  public _collectionPath: string;

  @Enumerable(false)
  protected _controls: Object;

  /**
   * initializes the instance of the object with the given data and identifier
   * @param modelObj the instance to initialize
   * @param dbObj the data to inject in the instance
   * @param id the identifier to set
   * @param collectionPath the path of the collection hosting the document
   */
  public initialize(
    modelObj: any,
    dbObj?: Object,
    collectionPaths?: Array<string> | string,
    ids?: Array<string> | string
  ) {
    if (dbObj) {
      for (const key in dbObj) {
        if (!key.startsWith('_') && !key.startsWith('$') && typeof dbObj[key] !== 'function') {
          if (modelObj.hasOwnProperty(key)) {
            if (dbObj[key] && typeof dbObj[key].toDate === 'function') {
              modelObj[key] = dbObj[key].toDate();
            } else {
              modelObj[key] = dbObj[key];
            }
          } else {
            MissingFieldNotifier.notifyMissingField(modelObj.constructor.name, key);
          }
        }
      }
    }
    if (ids) {
      if (typeof ids === 'string') {
        ObjectHelper.createHiddenProperty(modelObj, 'id', ids);
      } else if (ids.length && ids.length > 0) {
        ObjectHelper.createHiddenProperty(modelObj, 'id', ids[ids.length - 1]);
      }
    } else if (dbObj && dbObj['_id']) {
      ObjectHelper.createHiddenProperty(modelObj, 'id', dbObj['_id']);
    }

    if (collectionPaths) {
      if (typeof collectionPaths === 'string') {
        ObjectHelper.createHiddenProperty(modelObj, 'collectionPath', collectionPaths);
      } else if (collectionPaths.length && collectionPaths.length > 0) {
        ObjectHelper.createHiddenProperty(modelObj, 'collectionPath', ModelHelper.getPath(collectionPaths, ids));
      }
    } else if (dbObj && dbObj['_collectionPath']) {
      ObjectHelper.createHiddenProperty(modelObj, 'collectionPath', dbObj['_collectionPath']);
    }
  }

  toFormGroup(requiredFields: Array<string> = []): FormGroup {
    const formControls = {};
    Object.keys(this._controls).forEach(controlName => {
      const validators = this._controls[controlName];
      if (requiredFields.includes(controlName)) {
        validators.push(Validators.required);
      }
      formControls[controlName] = new FormControl(this[controlName] ? this[controlName] : null, validators);
    });
    return new FormGroup(formControls);
  }

  toString(): string {
    return `${this._collectionPath}/${this._id}`;
  }
}
