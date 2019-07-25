import { DocumentSnapshot } from '@angular/fire/firestore';
import { FormGroup } from '@angular/forms';
import 'reflect-metadata';
import { Observable } from 'rxjs';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';
import { OrderBy, Where, Offset } from './../types/get-list-types.interface';
import { AbstractModel } from './abstract.model';

/**
 * Common/super Abstract DAO class
 */
export abstract class AbstractDao<M extends AbstractModel> {
  protected collectionPath: string = Reflect.getMetadata('collectionPath', this.constructor);

  constructor() { }

  // ____________________________to be implemented by FirestoreAbstractDao________________________________

  /**
   * returns an instance of a view object from a database object
   * @param editable true if the returned object should be editable, false otherwise
   * @param dbObj the database object
   * @param collectionPath the full path to the object in a collection
   */
  protected abstract getModelFromSnapshot(documentSnapshot: DocumentSnapshot<M>): M;

  /**
   * pushes the data with the appropriate action
   * @param modelObj the data to save
   * @param overwrite true to overwrite data, false otherwise
   * @param id the identifier to use for insert (optionnal)
   */
  protected abstract push(modelObj: M, docId?: string, pathIds?: Array<string>, overwrite?: boolean): Promise<M>;

  /**
   * pushes the dbObj with the appropriate action
   * @param dbObj the data to save
   * @param overwrite true to overwrite data, false otherwise
   * @param documentId the identifier to use for insert
   * @param collectionPath the full path to the object in a collection
   */
  protected abstract pushData(
    dbObj: Object,
    docId?: string,
    pathIds?: Array<string>,
    overwrite?: boolean
  ): Promise<Object>;

  // ______________________________to be implemented by ModelDao_________________________________

  /**
   * returns an empty instance of a model or FormGroup
   * @param collectionPath the full path to the object in a collection
   * @param editable true to have a FormGroup, false otherwise
   */
  public abstract getModel(dbObj?: Object, docId?: string, pathIds?: Array<string>): M;

  // ______________________________public methods_________________________________

  /**
   * returns the document with the given identifier formatted as :
   * - a Model object if editable is set to false
   * - a FormGroup otherwise
   * @param id the identifier to look for
   * @param collectionPath the path of the collection hosting the document
   * @param editable true to have a FromGroup, false to have a Model object
   */
  public abstract getById(docId: string, pathIds?: Array<string>): Observable<M>;

  /**
   * Return an observable of an array of models from database using the specified filters
   * @param pathIds array of ids used in path (in right order)
   * @param whereArray array of where conditions ({field, operator, value})
   * @param orderBy orderBy object ({field, operator})
   * @param limit number of results returned
   * @param cacheable use cache
   * @param offset last model of previous page for pagination or first model of next page ({startAfter?, endBefore?})
   */
  public abstract getList(
    pathIds?: Array<string>,
    whereArray?: Array<Where>,
    orderBy?: OrderBy,
    limit?: number,
    cacheable?: boolean,
    offset?: Offset<M>,
  ): Observable<Array<M>>;

  /**
   * saves the given data in database
   * @param modelObj the data to save
   * @param overwrite true to overwrite data
   * @param id the identifier to use for insert (optionnal)
   * @param collectionPath the path of the collection hosting the document
   * @param force force save even when the given data is a pristine FormGroup
   */
  public save(
    modelObjP: M | FormGroup,
    docId?: string,
    pathIds?: Array<string>,
    overwrite = false,
    force: boolean = false
  ): Promise<M> {
    let objToSave;
    if (modelObjP instanceof FormGroup || modelObjP.constructor.name === 'FormGroup') {
      if ((<FormGroup>modelObjP).pristine && !force) {
        // no change, dont need to save
        return Promise.resolve(this.getModel((<FormGroup>modelObjP).value, docId, pathIds));
      } else if ((<FormGroup>modelObjP).invalid) {
        // form is invalid, reject with errors
        return Promise.reject((<FormGroup>modelObjP).errors || 'invalid form');
      } else {
        // ok, lets save
        objToSave = this.getModel((<FormGroup>modelObjP).value, docId, pathIds);
      }
    } else {
      objToSave = modelObjP;
    }

    if (this.collectionPath && !objToSave._collectionPath) {
      ObjectHelper.createHiddenProperty(objToSave, 'collectionPath', ModelHelper.getPath(this.collectionPath, pathIds));
    }

    const objReadyToSave = this.beforeSave(objToSave);

    console.log(
      `super-dao ========== will save document document "${docId || objReadyToSave._id || 'new'}" at ${
      objReadyToSave._collectionPath
      }`
    );
    return this.push(objReadyToSave, docId, pathIds, overwrite);
  }

  /**
   * saves the given data in database
   * @param partialDbObj onlythe data to save
   * @param id the identifier to use for insert (optionnal)
   */
  public update(partialDbObj: Object, docId?: string, pathIds?: Array<string>): Promise<Object> {
    console.log(
      `super- dao ==== will update partially document at "${ModelHelper.getPath(
        this.collectionPath,
        pathIds,
        docId
      )}" =`
    );

    if (!partialDbObj || !docId || !this.collectionPath) {
      return Promise.reject('required attrs');
    } else {
      return this.pushData(partialDbObj, docId, pathIds);
    }
  }

  /**
   * removes the given object from database
   * @param modelObj the object to remove
   */
  public abstract delete(modelObj: M): Promise<void>;

  /**
   * removes the given object from database
   * @param modelObj the object to remove
   */
  public abstract deleteById(docId: string, pathIds?: Array<string>): Promise<void>;

  // TODO Later: implement dynamic search
  // getDynamicList(filter: BehaviorSubject<M>,  pagination,  orderBy): Observable<M[]>
  // 1) let dynamicFilter = new  BehaviorSubject();
  // 2)  getDynamicList(...)
  // 3) dynamicFilter .next(data);
  // https://github.com/angular/angularfire2/blob/master/docs/firestore/querying-collections.md#dynamic-querying

  // ______________________________optionnal protected methods_________________________________

  protected beforeSave(obj: M): M {
    return obj;
  }

}
