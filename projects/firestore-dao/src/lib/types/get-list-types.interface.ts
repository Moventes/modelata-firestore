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
  startAt?: DocumentSnapshot<M>;
  startAfter?: DocumentSnapshot<M>;
  endAt?: DocumentSnapshot<M>;
  endBefore?: DocumentSnapshot<M>;
}
