import { DocumentSnapshot } from '@angular/fire/firestore';

export interface Where {
  field: string;
  operator: firebase.firestore.WhereFilterOp;
  value: any;
}

export interface OrderBy {
  field: string;
  operator: firebase.firestore.OrderByDirection;
}

export interface Offset<M> {
  endBefore?: DocumentSnapshot<M>;
  startAfter?: DocumentSnapshot<M>;
}
