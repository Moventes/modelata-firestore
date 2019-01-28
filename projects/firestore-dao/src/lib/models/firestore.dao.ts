import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentChangeAction,
  QueryDocumentSnapshot,
  QuerySnapshot
} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';
import { AbstractDao } from './abstract.dao';
import { AbstractModel } from './abstract.model';

/**
 * Abstract DAO class
 */
export abstract class AbstractFirestoreDao<M extends AbstractModel> extends AbstractDao<M> {
  constructor(private db: AngularFirestore, collectionPaths: Array<string> | string) {
    super(collectionPaths);
  }

  /**
   * @inheritDoc
   */
  protected getNewModelFromDb(dbObj: firebase.firestore.DocumentSnapshot): M {
    if (dbObj.exists) {
      let ids = [];
      const pathSplitted = dbObj.ref.path.split('/');
      if (pathSplitted.length > 2) {
        for (let i = 1; i < pathSplitted.length; i += 2) {
          // take every second element
          ids.push(pathSplitted[i]);
        }
      } else {
        ids = [dbObj.id];
      }
      return this.castToModel(dbObj.data(), ids);
    } else {
      console.error(
        '[firestoreDao] - getNewModelFromDb return null because dbObj.exists is null or false. dbObj :',
        dbObj
      );
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  protected push(modelObj: M, idsp?: Array<string> | string, overwrite = false): Promise<M> {
    // if an optionnal identifier is given, we use it to save the document
    // otherwise we will use the model identifier if it exists
    // if none are set, we let firestore create an identifier and set it on the model
    const ids = typeof idsp === 'string' ? [idsp] : idsp;
    const documentIds = ids || modelObj._id ? [modelObj._id] : null;
    const data = this.getDbObjFromModelObj(modelObj);

    return this.pushData(data, documentIds, overwrite).then(doc => {
      if (!modelObj['_id']) {
        ObjectHelper.createHiddenProperty(modelObj, 'id', doc['_id'] || documentIds[documentIds.length - 1]);
      }
      return modelObj;
    });
  }
  /**
   * WILL UPDATE PARTIAL DATA
   * @inheritDoc
   */
  protected pushData(dbObj: Object, ids?: Array<string> | string, overwrite = false): Promise<Object> {
    const emptyModel = this.getModel();
    for (const key in dbObj) {
      if (!emptyModel.hasOwnProperty(key)) {
        return Promise.reject('try to update an attribute that is not defined in the model');
      }
    }

    if (typeof ids === 'string' || (ids && ids.length > 0)) {
      const collectionName = ModelHelper.getPath(this.collectionPaths, ids, true);
      return this.db
        .doc(collectionName)
        .set(dbObj, { merge: !overwrite })
        .then(() => dbObj);
    } else {
      return this.db
        .collection(ModelHelper.getPath(this.collectionPaths))
        .add(dbObj)
        .then(ref => {
          ObjectHelper.createHiddenProperty(dbObj, 'id', ref.id);
          return dbObj;
        });
    }
  }

  /**
   * method used to prepare the data for save
   * @param modelObj the data to save
   */
  protected getDbObjFromModelObj(modelObj: M): Object {
    // // create a model instance with the given data to gain access to the reference path getter methods
    const dbObj: any = {};

    Object.keys(modelObj).forEach(key => {
      if (key.startsWith('$')) {
        if (modelObj[key] && key !== '_id' && key !== '_collectionPath') {
          dbObj[key] = modelObj[key];
        } else {
          if (key === '_id') {
            console.log('we getDbObjFromModelObj of ', modelObj._id);
          } else {
            console.log('getDbObjFromModelObj ignore ', key);
          }
        }
      } else if (!key.startsWith('_') && typeof modelObj[key] !== 'undefined') {
        if (modelObj[key] && modelObj[key].constructor.name === 'Object') {
          dbObj[key] = this.getDbObjFromModelObj(modelObj[key]);
        } else {
          dbObj[key] = modelObj[key];
        }
      }
    });

    return dbObj;
  }

  public getByReference(dbRef: firebase.firestore.DocumentReference): Observable<M> {
    if (dbRef && dbRef.parent) {
      return this.db
        .doc<M>(dbRef)
        .snapshotChanges()
        .pipe(map(doc => this.getNewModelFromDb(doc.payload)));
    } else {
      throw new Error('getByReference missing parameter : dbRef.');
    }
  }

  /**
   * @inheritDoc
   */
  public getById(ids: Array<string> | string): Observable<M> {
    return this.db
      .doc<M>(ModelHelper.getPath(this.collectionPaths, ids, true))
      .snapshotChanges()
      .pipe(map(doc => this.getNewModelFromDb(doc.payload)));
  }

  protected get af(): AngularFirestore {
    return this.db;
  }

  /**
   * @inheritDoc
   */
  public getList(
    ids?: Array<string> | string,
    queryFieldName: string = null,
    equal: string | boolean = null,
    sort: 'desc' | 'asc' = null,
    startWith: string = null,
    limit = -1,
    fullInstantaneousSnap = false
    /*,
    pagination: Pagination<M> = null*/
  ): Observable<Array<M>> {
    let queryResult: AngularFirestoreCollection<M>;

    if (queryFieldName && (startWith || sort || (equal !== null && equal !== undefined)) /*|| pagination*/) {
      const specialQuery = ref => {
        let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
        if (startWith) {
          query = query.where(queryFieldName, '>=', startWith).where(queryFieldName, '<=', startWith + '\uffff');
        }
        if (equal !== null && equal !== undefined) {
          query = query.where(queryFieldName, '==', equal);
        }
        if (sort) {
          query = query.orderBy(queryFieldName, sort);
        }
        if (limit > -1) {
          query = query.limit(limit);
        }
        // if (pagination) {
        //   for (let key in pagination) {
        //     if (pagination.hasOwnProperty(key)) {
        //       query = query.where(key, '==', pagination[key]);
        //     }
        //   }
        // }
        return query;
      };

      queryResult = this.db.collection<M>(ModelHelper.getPath(this.collectionPaths, ids), specialQuery);
    } else {
      queryResult = this.db.collection<M>(ModelHelper.getPath(this.collectionPaths, ids));
    }

    if (fullInstantaneousSnap) {
      return queryResult.get().pipe(
        map((snapshot: QuerySnapshot<M>) => {
          return snapshot.docs.map((doc: QueryDocumentSnapshot<M>) => {
            return this.getNewModelFromDb(doc);
          });
        })
      );
    } else {
      return queryResult.snapshotChanges().pipe(
        map((actions: DocumentChangeAction<M>[]) => {
          return actions.map((doc: DocumentChangeAction<M>) => {
            return this.getNewModelFromDb(doc.payload.doc);
          });
        })
      );
    }
  }

  /**
   * @inheritDoc
   */
  public delete(modelObj: M): Promise<any> {
    return this.db.doc<M>(`${modelObj._collectionPath}/${modelObj._id}`).delete();
  }

  /**
   * Returns the reference of the document located in the collectionPath with the id.
   *
   * @param id - doc id
   * @param collectionPath - coll path
   */
  public getReference(ids?: Array<string> | string): firebase.firestore.DocumentReference {
    return this.db.doc(ModelHelper.getPath(this.collectionPaths, ids, true)).ref;
  }
}
