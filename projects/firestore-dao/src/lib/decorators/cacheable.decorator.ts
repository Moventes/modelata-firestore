import { BehaviorSubject } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

function defaultParamsToString(...args): string {
    return '';
}

export function Cacheable(getFctIdFromParams = defaultParamsToString) {
    return (
        target: Object,
        propertyName: string,
        propertyDesciptor: PropertyDescriptor): PropertyDescriptor => {

        const method = propertyDesciptor.value;

        propertyDesciptor.value = function (...args: any[]) {
            const methodId = `${propertyName}(${getFctIdFromParams(...args)})`;
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
                        const obs = method.apply(this, args);
                        target['cachedSubscription'][methodId] =
                            obs.subscribe(doc => target['cachedSubject'][methodId].next(doc));
                    }
                }),
                filter(v => v !== 'BehaviorSubjectInit')
            );
        };
        return propertyDesciptor;
    };
}
