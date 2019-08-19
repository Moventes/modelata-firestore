import { BehaviorSubject } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

function defaultParamsToString(...args): string {
  return '';
}

export function Cacheable(getFctIdFromParamsName: string) {
  return (
    target: Object,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor): PropertyDescriptor => {

    const method = propertyDesciptor.value;

    propertyDesciptor.value = function (...args: any[]) {
      const createCache = args.pop();
      const getFctIdFromParams = getFctIdFromParamsName ?
        target[getFctIdFromParamsName] || defaultParamsToString :
        defaultParamsToString;
      const methodId = `dao(${this.collectionPath}).${propertyName}(${getFctIdFromParams(...args)})`;
      if (createCache || (target['cachedSubject'] && target['cachedSubject'][methodId])) {
        if (!target['cachedSubject']) {
          target['cachedSubject'] = {};
        }
        if (!target['cachedSubscription']) {
          target['cachedSubscription'] = {};
        }
        if (!target['cachedSubject'][methodId]) {
          target['cachedSubject'][methodId] = new BehaviorSubject('BehaviorSubjectInit');
        }
        return target['cachedSubject'][methodId].pipe(
          tap(() => {
            if (!target['cachedSubscription'][methodId]) {
              // console.log('@Cacheable subscribe to ', methodId);
              const obs = method.apply(this, args);
              target['cachedSubscription'][methodId] =
                obs.subscribe(doc => target['cachedSubject'][methodId].next(doc));
            }
          }),
          filter(v => v !== 'BehaviorSubjectInit')
        );
      } else {
        return method.apply(this, [...args, createCache]);
      }
    };
    return propertyDesciptor;
  };
}
