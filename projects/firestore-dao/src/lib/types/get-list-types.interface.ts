import * as firebase from 'firebase';

export interface Where {
  field: string;
  operator: firebase.firestore.WhereFilterOp;
  value: any;
}

export interface OrderBy {
  field: string;
  operator: firebase.firestore.OrderByDirection;
}
