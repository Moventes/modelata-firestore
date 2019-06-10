import { BehaviorSubject } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

export function CacheableObsWithoutParams(
    target: Object,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor): PropertyDescriptor {

    const method = propertyDesciptor.value;

    propertyDesciptor.value = function (...args: any[]) {
        if (!target['cachedSubject']) {
            target['cachedSubject'] = {};
        }
        if (!target['cachedSubscription']) {
            target['cachedSubscription'] = {};
        }
        if (!target['cachedSubject'][propertyName]) {
            target['cachedSubject'][propertyName] = new BehaviorSubject('BehaviorSubjectInit');
        }
        return target['cachedSubject'][propertyName].pipe(
            tap(() => {
                if (!target['cachedSubscription'][propertyName]) {
                    const obs = method.apply(this, args);
                    target['cachedSubscription'][propertyName] =
                        obs.subscribe(doc => target['cachedSubject'][propertyName].next(doc));
                }
            }),
            filter(v => v !== 'BehaviorSubjectInit')
        );
    };
    return propertyDesciptor;
}
