import { Validator, ValidatorFn } from '@angular/forms';

export function ToFormControl(value: Array<Validator | ValidatorFn> = []) {
  return function(target: any, propertyKey: string) {
    if (typeof target['_controls'] !== 'object') {
      target['_controls'] = {};
    }
    target['_controls'][propertyKey] = value;
  };
}
