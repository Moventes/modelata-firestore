import { Observable } from 'rxjs';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';
import { AbstractModel } from './abstract.model';

/**
 * Common/super Abstract DAO class
 */
export abstract class AbstractDao<M extends AbstractModel /*, I extends ParentIdentifiers*/> {
  protected collectionPaths: Array<string> | string;

  constructor(collectionPath: Array<string> | string) {
    this.collectionPaths = collectionPath;
  }

  // ____________________________to be implemented by AbstractDao________________________________

  /**
   * returns an instance of a view object from a database object
   * @param editable true if the returned object should be editable, false otherwise
   * @param dbObj the database object
   * @param collectionPath the full path to the object in a collection
   */
  protected abstract getNewModelFromDb(dbObj: Object): M;

  /**
   * pushes the data with the appropriate action
   * @param modelObj the data to save
   * @param overwrite true to overwrite data, false otherwise
   * @param id the identifier to use for insert (optionnal)
   */
  protected abstract push(modelObj: M, ids?: Array<string> | string, overwrite?: boolean): Promise<M>;

  /**
   * pushes the dbObj with the appropriate action
   * @param dbObj the data to save
   * @param overwrite true to overwrite data, false otherwise
   * @param documentId the identifier to use for insert
   * @param collectionPath the full path to the object in a collection
   */
  protected abstract pushData(dbObj: Object, ids?: Array<string> | string, overwrite?: boolean): Promise<Object>;

  // ______________________________to be implemented by ModelDao_________________________________

  /**
   * returns an empty instance of a model or FormGroup
   * @param collectionPath the full path to the object in a collection
   * @param editable true to have a FormGroup, false otherwise
   */
  protected abstract getModel(dbObj?: Object, ids?: Array<string> | string): M;

  // ______________________________public methods_________________________________

  /**
   * returns the document with the given identifier formatted as :
   * - a Model object if editable is set to false
   * - a FormGroup otherwise
   * @param id the identifier to look for
   * @param collectionPath the path of the collection hosting the document
   * @param editable true to have a FromGroup, false to have a Model object
   */
  public abstract getById(ids: Array<string> | string): Observable<M>;

  public abstract getList(
    queryFieldName?: string,
    ids?: Array<string> | string,
    equal?: string,
    sort?: 'desc' | 'asc',
    startWith?: string,
    limit?: number,
    fullInstantaneousSnap?: boolean
  ): Observable<Array<M>>;

  /**
   * returns an instance of the model managed by the DAO class,
   * or a FormGroup depending whether editable is truthy or not
   * @param dbObj the data to set in the model instance
   * @param id the identifier to set on the model instance
   * @param collectionPath the full path to the object in a collection
   * @param editable true if the returned model should be editable, false otherwise
   */
  public create(dbObj: Object, ids: Array<string> | string): M {
    return this.getModel(dbObj, ids);
  }

  /**
   * saves the given data in database
   * @param modelObj the data to save
   * @param overwrite true to overwrite data
   * @param id the identifier to use for insert (optionnal)
   * @param collectionPath the path of the collection hosting the document
   * @param force force save even when the given data is a pristine FormGroup
   */
  public save(modelObj: M, ids?: Array<string> | string, overwrite = false): Promise<M> {
    // let objToSave;
    // if (AbstractFormGroupFactory.isFormGroup(modelObj)) {
    //   if ((<FormGroup>modelObj).pristine && !force) {
    //     // no change, dont need to save
    //     return Promise.resolve((<FormGroup>modelObj).value);
    //   } else if (!(<FormGroup>modelObj).valid) {
    //     // form is invalid, reject with errors
    //     return Promise.reject((<FormGroup>modelObj).errors);
    //   } else {
    //     // ok, lets save
    //     objToSave = (<FormGroup>modelObj).value;
    //   }
    // } else {
    //   objToSave = modelObj;
    // }
    if (this.collectionPaths && !modelObj._collectionPath) {
      ObjectHelper.createHiddenProperty(modelObj, 'collectionPath', ModelHelper.getPath(this.collectionPaths, ids));
    }
    console.log('======================== super-dao ===========================');
    console.log(`= will save document at "${modelObj._collectionPath}" =`);
    console.log('==============================================================');
    console.log('objToSave : ', modelObj);
    console.log('==============================================================');
    return this.push(modelObj, ids, overwrite);
  }

  /**
   * saves the given data in database
   * @param modelObj the data to save
   * @param overwrite true to overwrite data
   * @param id the identifier to use for insert (optionnal)
   */
  public update(dbObj: Object, ids: Array<string> | string): Promise<Object> {
    console.log('======================== super- dao ===========================');
    console.log(`= will update partially document at "${ModelHelper.getPath(this.collectionPaths, ids, true)}" =`);
    console.log('==============================================================');
    console.log('data : ', dbObj);
    console.log('==============================================================');
    if (!dbObj || !ids || !this.collectionPaths) {
      return Promise.reject('required attrs');
    } else {
      return this.pushData(dbObj, ids).then(docId => {
        ObjectHelper.createHiddenProperty(dbObj, 'id', docId);
        return dbObj;
      });
    }
  }

  // /**
  //  * returns the list of documents in the collection
  //  * The list may be:
  //  * - filtered: add an object of the searched type with the values to filter on
  //  * - sorted: give the name of the field to sort on, and a boolean to tell whether it should be descendant or not
  //  * - paginated: give the pagination details to have a subset of the list as desired
  //  * @param collectionPath the path of the collection hosting the document
  //  * @param editable true to have a FromGroup, false to have a Model object
  //  * @param filter the filter to apply to search
  //  * @param orderBy the orderBy to apply to search
  //  * @param pagination the pagination to apply to search
  //  */

  // public abstract getList(
  //   collectionPath: string,
  //   editable: boolean,
  //   filter: M,
  //   orderBy: OrderBy,
  //   pagination: Pagination
  // ): Observable<Array<M | FormGroup>>;

  /**
   * removes the given object from database
   * @param modelObj the object to remove
   */
  public abstract delete(modelObj: M): Promise<any>;

  // TODO Later: implement dynamic search
  // getDynamicList(filter: BehaviorSubject<M>,  pagination,  orderBy): Observable<M[]>
  // 1) let dynamicFilter = new  BehaviorSubject();
  // 2)  getDynamicList(...)
  // 3) dynamicFilter .next(data);
  // https://github.com/angular/angularfire2/blob/master/docs/firestore/querying-collections.md#dynamic-querying
}
