import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentChangeAction,
  DocumentReference,
  DocumentSnapshot,
  Query
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';
import { OrderBy, Where } from '../types/get-list-types.interface';
import { AbstractDao } from './abstract.dao';
import { AbstractModel } from './abstract.model';

/**
 * Abstract DAO class
 */
export abstract class AbstractFirestoreDao<M extends AbstractModel> extends AbstractDao<M> {
  constructor(private db: AngularFirestore) {
    super();
  }

  /**
   * @inheritDoc
   */
  protected getModelFromSnapshot(documentSnapshot: DocumentSnapshot<M>): M {
    if (documentSnapshot.exists) {
      const pathIds = [];
      const pathSplitted = documentSnapshot.ref.path.split('/');
      if (pathSplitted.length > 2) {
        for (let i = 1; i < pathSplitted.length; i += 2) {
          // take every second element
          pathIds.push(pathSplitted[i]);
        }
      }
      return this.getModel(documentSnapshot.data(), documentSnapshot.id, pathIds);
    } else {
      console.error(
        '[firestoreDao] - getNewModelFromDb return null because dbObj.exists is null or false. dbObj :',
        documentSnapshot
      );
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  protected push(modelObj: M, docId?: string, pathIds?: Array<string>, overwrite = false): Promise<M> {
    // if an optionnal identifier is given, we use it to save the document
    // otherwise we will use the model identifier if it exists
    // if none are set, we let firestore create an identifier and set it on the model
    const documentId = docId || modelObj._id;
    const data = this.getDbObjFromModelObj(modelObj);
    return this.pushData(data, documentId, pathIds, overwrite).then(doc =>
      this.getModel(doc, doc['_id'] || docId, pathIds)
    );
  }
  /**
   * WILL UPDATE PARTIAL DATA
   * @inheritDoc
   */
  protected pushData(dbObj: Object, docId?: string, pathIds?: Array<string>, overwrite = false): Promise<Object> {
    const emptyModel = this.getModel();
    for (const key in dbObj) {
      if (!emptyModel.hasOwnProperty(key)) {
        return Promise.reject(`try to update/add an attribute that is not defined in the model = ${key}`);
      }
    }

    if (docId) {
      const collectionName = ModelHelper.getPath(this.collectionPath, pathIds, docId);
      return this.db
        .doc(collectionName)
        .set(dbObj, { merge: !overwrite })
        .then(() => {
          if (!dbObj['_id']) {
            ObjectHelper.createHiddenProperty(dbObj, 'id', docId);
          }
          return dbObj;
        });
    } else {
      return this.db
        .collection(ModelHelper.getPath(this.collectionPath, pathIds))
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
    const dbObj: Object = {};

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

  public getByReference(docRef: DocumentReference): Observable<M> {
    if (docRef && docRef.parent) {
      return this.db
        .doc<M>(docRef)
        .snapshotChanges()
        .pipe(map(doc => this.getModelFromSnapshot(doc.payload)));
    } else {
      throw new Error('getByReference missing parameter : dbRef.');
    }
  }

  /**
   * @inheritDoc
   */
  public getById(docId: string, pathIds?: Array<string>): Observable<M> {
    return this.db
      .doc<M>(ModelHelper.getPath(this.collectionPath, pathIds, docId))
      .snapshotChanges()
      .pipe(map(doc => this.getModelFromSnapshot(doc.payload)));
  }

  /**
   * @inheritDoc
   */
  public getList(
    pathIds?: Array<string>,
    whereArray?: Array<Where>,
    orderBy?: OrderBy,
    limit?: number
  ): Observable<Array<M>> {
    let queryResult: AngularFirestoreCollection<M>;

    if ((whereArray && whereArray.length > 0) || orderBy || (limit !== null && limit !== undefined)) {
      const specialQuery = ref => {
        let query: Query = ref;
        if (whereArray && whereArray.length > 0) {
          whereArray.forEach(where => {
            query = query.where(where.field, where.operator, where.value);
          });
        }
        if (orderBy) {
          query = query.orderBy(orderBy.field, orderBy.operator);
        }
        if (limit !== null && limit !== undefined && limit > -1) {
          query = query.limit(limit);
        }
        return query;
      };

      queryResult = this.db.collection<M>(ModelHelper.getPath(this.collectionPath, pathIds), specialQuery);
    } else {
      queryResult = this.db.collection<M>(ModelHelper.getPath(this.collectionPath, pathIds));
    }

    return queryResult.snapshotChanges().pipe(
      map((changeActionsList: DocumentChangeAction<M>[]) => {
        return changeActionsList.map((changeAction: DocumentChangeAction<M>) => {
          return this.getModelFromSnapshot(<DocumentSnapshot<M>>changeAction.payload.doc);
        });
      })
    );
  }

  /**
   * @inheritDoc
   */
  public delete(modelObj: M): Promise<void> {
    return this.db.doc<M>(`${modelObj._collectionPath}/${modelObj._id}`).delete();
  }

  /**
   * @inheritDoc
   */
  public deleteById(docId: string, pathIds?: Array<string>): Promise<void> {
    return this.db.doc<M>(ModelHelper.getPath(this.collectionPath, pathIds, docId)).delete();
  }
  /**
   * Returns the reference of the document located in the collectionPath with the id.
   *
   * @param id - doc id
   * @param collectionPath - coll path
   */
  public getReference(docId: string, pathIds?: Array<string>): DocumentReference {
    return this.db.doc(ModelHelper.getPath(this.collectionPath, pathIds, docId)).ref;
  }
}
