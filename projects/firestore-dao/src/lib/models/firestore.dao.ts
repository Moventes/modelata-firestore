import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  DocumentSnapshot,
  Query,
} from '@angular/fire/firestore';
import { firestore } from 'firebase/app';
import { Observable, Subject, Subscription, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Cacheable } from '../decorators/cacheable.decorator';
import { ModelHelper } from '../helpers/model.helper';
import { ObjectHelper } from '../helpers/object.helper';
import { Offset, OrderBy, Where } from '../types/get-list-types.interface';
import { AbstractDao } from './abstract.dao';
import { AbstractModel } from './abstract.model';



/**
 * Abstract DAO class
 */
export abstract class AbstractFirestoreDao<M extends AbstractModel> extends AbstractDao<M> {


  ////////////////////////////////////////////////
  ////////////////////////////////////////////////
  ////////////////// Attributes //////////////////
  ////////////////////////////////////////////////
  ////////////////////////////////////////////////


  public static clearAllCacheAndSubscription = new Subject();
  public cacheable: boolean;





  /////////////////////////////////////////////////
  /////////////////////////////////////////////////
  ////////////////// Constructor //////////////////
  /////////////////////////////////////////////////
  /////////////////////////////////////////////////


  constructor(private db: AngularFirestore, cacheable = true) {
    super();
    this.cacheable = cacheable;
    AbstractFirestoreDao.clearAllCacheAndSubscription.subscribe(() => {
      this.clearCache();
    });
  }





  /////////////////////////////////////////////
  /////////////////////////////////////////////
  ////////////////// Helpers //////////////////
  /////////////////////////////////////////////
  /////////////////////////////////////////////


  clearCache() {
    if (this['cachedSubscription']) {
      Object.values(this['cachedSubscription']).forEach((subscr: Subscription) => subscr.unsubscribe());
      this['cachedSubscription'] = {};
      this['cachedSubject'] = {};
    }
  }

  public isCompatible(doc: M | DocumentReference): boolean {
    return ModelHelper.isCompatiblePath(this.collectionPath, doc['path'] || doc['_collectionPath']);
  }

  getByPathToStringForCacheable(docPath: string) { return docPath; }

  getIdFromPath(path: string): string {
    const splittedPath = path.split('/');
    if (splittedPath.length % 2 === (path.startsWith('/') ? 1 : 0)) {
      return splittedPath[splittedPath.length - 1];
    } else {
      return null;
    }
  }

  getListToStringForCacheable(
    pathIds?: Array<string>,
    whereArray?: Array<Where>,
    orderBy?: OrderBy,
    limit?: number
  ) {
    const whereArrayStr = whereArray && whereArray.length ? '[' + whereArray.map(function (wherep: Where) {
      const where = wherep || { field: 'null', operator: '', value: '' };
      return `${where.field}${where.operator}${where.value && where.value.path ? where.value.path : where.value}`;
    }).join(',') + ']' : 'undefined';
    const orderByStr = orderBy ? `${orderBy.field}${orderBy.operator}` : '';
    return `${pathIds && pathIds.length ? pathIds.join('/X/') : 'undefined'},${whereArrayStr},${orderByStr},${limit}`;
  }

  voidFn(...args) { return args; }





  //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////
  ////////////////// Model conversion //////////////////
  //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////


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
      const model = this.getModel(
        { ...documentSnapshot.data(), _fromCache: documentSnapshot.metadata.fromCache },
        documentSnapshot.id,
        pathIds
      );
      return model;
    } else {
      console.error(
        '[firestoreDao] - getNewModelFromDb return null because dbObj.exists is null or false. dbObj :',
        documentSnapshot
      );
      return null;
    }
  }

  protected getModelFromDbDoc(doc: M, path: string, docId?: string): M {
    if (!doc) {
      console.log('dbDoc', doc, 'path', path, 'docId', docId);
      return null;
    } else {
      if (!doc._id) {
        doc._id = docId ? docId : this.getIdFromPath(path);
      }
      const pathIds = [];
      const pathSplitted = path.split('/');
      // console.log('>> doc path', path);
      // console.log('>> service collectionPath', this.collectionPath);


      if (pathSplitted.length > 1) {
        const collectionPathSplitted = this.collectionPath.split('/');
        collectionPathSplitted.forEach(((portion, index) => {
          // console.log('>>>> portion: ', portion);
          if (portion === '?') {
            pathIds.push(pathSplitted[index]);
          }
        }));
      }
      // console.log('>> pathIds', pathIds);
      const model = this.getModel(
        doc,
        doc._id,
        pathIds
      );
      // console.log('model from dbDoc = ', model);
      return model;
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
      if (!key.startsWith('$') && !key.startsWith('_') && typeof modelObj[key] !== 'undefined') {
        if (modelObj[key] && modelObj[key].constructor.name === 'Object') {
          dbObj[key] = this.getDbObjFromModelObj(modelObj[key]);
        } else {
          dbObj[key] = modelObj[key];
        }
      } else {
        console.log('getDbObjFromModelObj ignore ', key);
      }
    });

    return dbObj;
  }

  /**
 * Returns the reference of the document located in the collectionPath with the id.
 *
 * @param modelObj - model M
 */
  public getReferenceFromModel(modelObj: M): DocumentReference {
    return this.db.collection(modelObj._collectionPath).doc(modelObj._id).ref;
  }





  //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////
  ////////////////// Database methods //////////////////
  //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////


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
    const emptyModel = this.getModel({}, '?', pathIds);
    for (const key in dbObj) {
      if (!emptyModel.hasOwnProperty(key)) {
        return Promise.reject(`try to update/add an attribute that is not defined in the model = ${key}`);
      }
    }

    dbObj['_updateDate'] = firestore.FieldValue.serverTimestamp();

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
        }).catch(error => {
          console.error(error);
          console.log('error for ', dbObj);
          return Promise.reject(error);
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

  public getByReference(docRef: DocumentReference, cacheable = this.cacheable): Observable<M> {
    // console.log('getByReference of ', docRef.path, docRef.id);

    if (this.isCompatible(docRef)) {
      if (docRef && docRef.parent) {
        return this.getByPath(docRef.path, false, cacheable);
      } else {
        throw new Error('getByReference missing parameter : dbRef.');
      }
    } else {
      throw new Error('docRef is not compatible with this dao!');
    }
  }

  /**
   * @inheritDoc
   */
  public getById(docId: string, pathIds?: Array<string>, cacheable = this.cacheable, completeOnFirst = false): Observable<M> {
    // console.log('getById of ', docId, pathIds);
    // const path = ModelHelper.getPath(this.collectionPath, pathIds, docId);
    // console.log(`getById ModelHelper.getPath return ${path} for ${this.collectionPath},${pathIds},${docId}`);
    return this.getByPath(ModelHelper.getPath(this.collectionPath, pathIds, docId), completeOnFirst, cacheable);
  }

  @Cacheable('getByPathToStringForCacheable')
  protected getByPath(docPath: string, completeOnFirst = false, cacheable = this.cacheable): Observable<M> {
    this.voidFn(cacheable);
    // console.log('getByPath of ', docPath);
    const docId = this.getIdFromPath(docPath);
    return completeOnFirst ?
      this.db
        .doc<M>(docPath)
        .get()
        .pipe(
          catchError((err) => {
            console.error(`an error occurred in getByPath with params: ${docPath}`);
            throw new Error(err);
          }),
          map((docSnap: DocumentSnapshot<M>) => {
            if (!docSnap.exists) {
              return null;
            } else {
              return this.getModelFromSnapshot(docSnap);
            }
          })
        ) :
      this.db
        .doc<M>(docPath)
        .valueChanges()
        .pipe(
          catchError((err) => {
            console.error(`an error occurred in getByPath with params: ${docPath}`);
            throw new Error(err);
          }),
          map((doc: M) => {
            if (!doc) {
              return null;
            } else {
              return this.getModelFromDbDoc(doc, docPath, docId);
            }
          })
        );
  }

  /**
    * @inheritDoc
    */
  public getList(
    pathIds?: Array<string>,
    whereArray?: Array<Where>,
    orderBy?: OrderBy,
    limit?: number,
    cacheable = this.cacheable,
    offset?: Offset,
    completeOnFirst = false,
  ): Observable<Array<M>> {
    return this.getListCacheable(pathIds,
      whereArray,
      orderBy,
      limit,
      offset,
      completeOnFirst,
      cacheable);
  }
  /**
   * @inheritDoc
   */
  @Cacheable('getListToStringForCacheable')
  protected getListCacheable(
    pathIds?: Array<string>,
    whereArray?: Array<Where>,
    orderBy?: OrderBy,
    limit?: number,
    offset?: Offset,
    completeOnFirst?: boolean,
    cacheable = this.cacheable,
  ): Observable<Array<M>> {
    // console.log(whereArray, orderBy, limit, offset);
    this.voidFn(cacheable);

    const queryObs = offset && (offset.endBefore || offset.startAfter || offset.endAt || offset.startAt) ?
      this.getSnapshot(offset.endBefore || offset.startAfter || offset.endAt || offset.startAt) :
      of(null);

    return queryObs.pipe(
      map((offsetSnap) => {
        let queryResult: AngularFirestoreCollection<M>;
        if (
          (whereArray && whereArray.length > 0) ||
          orderBy ||
          (limit !== null && limit !== undefined) ||
          (offset && (offset.endBefore || offset.startAfter || offset.endAt || offset.startAt))
        ) {
          const specialQuery = (ref) => {
            let query: Query = ref;
            if (whereArray && whereArray.length > 0) {
              whereArray.forEach((where) => {
                if (where) {
                  query = query.where(where.field, where.operator, where.value);
                }
              });
            }
            if (orderBy) {
              query = query.orderBy(orderBy.field, orderBy.operator);
            }
            if (offset && offset.startAt) {
              query = query.startAt(offsetSnap);
            } else if (offset && offset.startAfter) {
              query = query.startAfter(offsetSnap);
            } else if (offset && offset.endAt) {
              query = query.endAt(offsetSnap);
            } else if (offset && offset.endBefore) {
              query = query.endBefore(offsetSnap);
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
        return queryResult;
      }),
      switchMap((queryResult) => {
        return completeOnFirst ?
          queryResult
            .get()
            .pipe(
              catchError((err) => {
                // tslint:disable-next-line:max-line-length
                console.error(`an error occurred in getListCacheable with params: ${this.collectionPath} ${pathIds ? pathIds : ''} ${whereArray ? whereArray : ''} ${orderBy ? orderBy : ''} ${limit ? limit : ''}`);
                return throwError(err);
              }),
              map((snap) => {
                if (snap.size === 0) {
                  return [];
                } else {
                  return snap.docs.filter(doc => doc.exists).map((docSnap: DocumentSnapshot<M>) => {
                    return this.getModelFromSnapshot(docSnap);
                  });
                }
              })
            ) :
          queryResult
            .valueChanges({ idField: '_id' })
            .pipe(
              catchError((err) => {
                // tslint:disable-next-line:max-line-length
                console.error(`an error occurred in getListCacheable with params: ${this.collectionPath} ${pathIds ? pathIds : ''} ${whereArray ? whereArray : ''} ${orderBy ? orderBy : ''} ${limit ? limit : ''}`);
                return throwError(err);
              }),
              map((snap) => {
                if (snap.length === 0) {
                  return [];
                } else {
                  return snap.filter(doc => !!doc).map((doc: M) => {
                    return this.getModelFromDbDoc(doc, ModelHelper.getPath(this.collectionPath, pathIds));
                  });
                }
              })
            );
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

  public getSnapshot(id: string): Observable<DocumentSnapshot<M>> {
    return this.db.collection(this.collectionPath).doc<M>(id).get().pipe(map((doc: DocumentSnapshot<M>) => doc));
  }
}
