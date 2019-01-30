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

  @Enumerable(false)
  protected _fromCache: boolean;

  /**
   * initializes the instance of the object with the given data and identifier
   * @param dbObj the data to inject in the instance
   * @param id the identifier to set
   * @param collectionPath the path of the collection hosting the document
   */
  protected initialize(dbObj?: Object, docId?: string, path?: string, pathIds?: Array<string>) {
    if (dbObj) {
      for (const key in dbObj) {
        if (!key.startsWith('_') && !key.startsWith('$') && typeof dbObj[key] !== 'function') {
          if (this.hasOwnProperty(key)) {
            if (dbObj[key] && typeof dbObj[key].toDate === 'function') {
              this[key] = dbObj[key].toDate();
            } else {
              this[key] = dbObj[key];
            }
          } else {
            MissingFieldNotifier.notifyMissingField(this.constructor.name, key);
          }
        }
      }
    }
    if (docId) {
      ObjectHelper.createHiddenProperty(this, 'id', docId);
    } else if (dbObj && dbObj['_id']) {
      ObjectHelper.createHiddenProperty(this, 'id', dbObj['_id']);
    }

    if (path) {
      ObjectHelper.createHiddenProperty(this, 'collectionPath', ModelHelper.getPath(path, pathIds));
    } else if (dbObj && dbObj['_collectionPath']) {
      ObjectHelper.createHiddenProperty(this, 'collectionPath', dbObj['_collectionPath']);
    }

    if (dbObj && dbObj['_fromCache']) {
      ObjectHelper.createHiddenProperty(this, 'fromCache', dbObj['_fromCache']);
    }
  }

  toFormGroup(requiredFields: Array<string> = []): FormGroup {
    const formControls = {};
    Object.keys(this._controls).forEach(controlName => {
      const validators = this._controls[controlName];
      if (requiredFields.includes(controlName)) {
        validators.push(Validators.required);
      }
      formControls[controlName] = new FormControl(
        this[controlName] !== undefined ? this[controlName] : null,
        validators
      );
    });
    return new FormGroup(formControls);
  }

  toString(): string {
    return `${this._collectionPath}/${this._id}`;
  }
}
